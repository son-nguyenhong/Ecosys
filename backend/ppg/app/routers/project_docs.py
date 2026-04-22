"""
Project Docs Router
GET  /projects/{id}/docs/tree                          → 3-track folder tree
GET  /projects/docs/templates/download                 → stream template file
POST /projects/{id}/docs/upload                        → upload file to track/folder
GET  /projects/{id}/docs/{track}/{folder}/files        → list files + version history
GET  /projects/{id}/docs/file/{file_id}/download       → download specific version
"""
import os
import re
import uuid as _uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/projects", tags=["project-docs"])

# ── Config ────────────────────────────────────────────────────────
_default_uploads = Path(__file__).resolve().parent.parent.parent.parent / "uploads"
UPLOADS_DIR  = Path(os.getenv("UPLOADS_DIR", str(_default_uploads))).resolve()
TEMPLATE_DIR = UPLOADS_DIR / "00Project"
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

# ── Track definitions (order matters — displayed in UI) ───────────
TRACKS = [
    {
        "track": "project",
        "label": "Project Management",
        "icon":  "📁",
        "folders": [
            {"name": "kickoff",      "label": "Kickoff",      "icon": "🚀"},
            {"name": "requirements", "label": "Requirements",  "icon": "📋"},
            {"name": "design",       "label": "Design",        "icon": "🏗️"},
            {"name": "development",  "label": "Development",   "icon": "💻"},
            {"name": "sit",          "label": "SIT",           "icon": "🔬"},
            {"name": "uat",          "label": "UAT",           "icon": "✅"},
            {"name": "golive",       "label": "Go-Live",       "icon": "🚀"},
            {"name": "hypercare",    "label": "Hypercare",     "icon": "🛡️"},
            {"name": "closure",      "label": "Closure",       "icon": "📦"},
        ],
    },
    {
        "track": "ba",
        "label": "BA",
        "icon":  "📝",
        "folders": [
            {"name": "ba_kickoff",     "label": "Kickoff",     "icon": "🚀"},
            {"name": "ba_elicitation", "label": "Elicitation", "icon": "🔍"},
            {"name": "ba_analysis",    "label": "Analysis",    "icon": "📊"},
            {"name": "ba_brd",         "label": "BRD",         "icon": "📄"},
            {"name": "ba_frs",         "label": "FRS",         "icon": "📐"},
            {"name": "ba_dev_support", "label": "Dev Support", "icon": "🔧"},
            {"name": "ba_uat_support", "label": "UAT Support", "icon": "🤝"},
            {"name": "ba_closure",     "label": "Closure",     "icon": "📦"},
        ],
    },
    {
        "track": "test",
        "label": "Test",
        "icon":  "🧪",
        "folders": [
            {"name": "test_planning",  "label": "Planning",      "icon": "📋"},
            {"name": "test_design",    "label": "Test Design",   "icon": "✏️"},
            {"name": "test_env_setup", "label": "Env Setup",     "icon": "⚙️"},
            {"name": "test_sit_exec",  "label": "SIT Execution", "icon": "🔬"},
            {"name": "test_uat_exec",  "label": "UAT Execution", "icon": "✅"},
            {"name": "test_golive",    "label": "Go-Live",       "icon": "🚀"},
            {"name": "test_closure",   "label": "Closure",       "icon": "📦"},
        ],
    },
]

_VALID_FOLDERS: dict[str, set[str]] = {
    t["track"]: {f["name"] for f in t["folders"]} for t in TRACKS
}


def _validate_track_folder(track: str, folder: str) -> None:
    if track not in _VALID_FOLDERS:
        raise HTTPException(400, f"Invalid track: {track}")
    if folder not in _VALID_FOLDERS[track]:
        raise HTTPException(400, f"Invalid folder: {folder}")


def _templates_in(track: str, folder: str) -> list[dict]:
    folder_path = TEMPLATE_DIR / track / folder
    if not folder_path.exists():
        return []
    files = []
    for f in sorted(folder_path.iterdir()):
        if f.is_file() and not f.name.startswith("."):
            rel = f"{track}/{folder}/{f.name}"
            files.append({
                "name":         f.name,
                "display_name": f.stem.replace("_", " "),
                "rel_path":     rel,
                "size_bytes":   f.stat().st_size,
            })
    return files


async def _all_folder_files(db, project_id: str) -> dict[str, list[dict]]:
    """Fetch latest-file info per doc_category for all project user-uploaded files."""
    rows = await db.fetch(
        """
        SELECT
            pf.id::text         AS id,
            pf.name,
            pf.doc_category,
            pf.current_version,
            pf.status,
            fv.file_size,
            fv.uploaded_by,
            fv.uploaded_at
        FROM project_files pf
        LEFT JOIN LATERAL (
            SELECT file_size, uploaded_by, uploaded_at
            FROM file_versions
            WHERE file_id = pf.id
            ORDER BY uploaded_at DESC
            LIMIT 1
        ) fv ON true
        WHERE pf.project_id = $1 AND pf.file_type = 'user_upload'
        ORDER BY pf.doc_category, pf.updated_at DESC
        """,
        project_id,
    )
    result: dict[str, list[dict]] = {}
    for r in rows:
        cat = r["doc_category"] or ""
        entry = {
            "id":              r["id"],
            "name":            r["name"],
            "current_version": r["current_version"],
            "status":          r["status"],
            "file_size":       r["file_size"],
            "uploaded_by":     r["uploaded_by"],
            "uploaded_at":     r["uploaded_at"].isoformat() if r["uploaded_at"] else None,
        }
        result.setdefault(cat, []).append(entry)
    return result


# ── GET /projects/{project_id}/docs/tree ─────────────────────────
@router.get("/{project_id}/docs/tree")
async def get_docs_tree(
    user: CurrentUser,
    project_id: str,
    db=Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT code, name, domain_code FROM projects WHERE id = $1",
        project_id,
    )
    if not row:
        raise HTTPException(404, "Project not found")

    domain_code  = row["domain_code"] or ""
    project_code = row["code"] or ""
    project_dir  = UPLOADS_DIR / domain_code / project_code

    all_files = await _all_folder_files(db, project_id)

    result_tracks = []
    for track_def in TRACKS:
        t = track_def["track"]
        folders_out = []
        for fd in track_def["folders"]:
            fname     = fd["name"]
            templates = _templates_in(t, fname)
            cat       = f"{t}/{fname}"
            db_files  = all_files.get(cat, [])
            folders_out.append({
                "name":           fname,
                "label":          fd["label"],
                "icon":           fd["icon"],
                "template_count": len(templates),
                "uploaded_count": len(db_files),
                "templates":      templates,
                "uploaded_files": [f["name"] for f in db_files],
                "latest_file":    db_files[0] if db_files else None,
                "file_count":     len(db_files),
            })
        result_tracks.append({
            "track":   t,
            "label":   track_def["label"],
            "icon":    track_def["icon"],
            "folders": folders_out,
        })

    return {
        "project_id":   project_id,
        "project_code": project_code,
        "project_name": row["name"],
        "domain_code":  domain_code,
        "project_dir":  str(project_dir),
        "tracks":       result_tracks,
    }


# ── GET /projects/docs/templates/download ────────────────────────
@router.get("/docs/templates/download")
async def download_template(
    user: CurrentUser,
    path: str = Query(...),
):
    if not re.match(r'^[\w\-./]+$', path) or ".." in path:
        raise HTTPException(400, "Invalid path")

    file_path = TEMPLATE_DIR / path
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(404, "Template not found")

    try:
        file_path.resolve().relative_to(TEMPLATE_DIR.resolve())
    except ValueError:
        raise HTTPException(403, "Access denied")

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream",
    )


# ── POST /projects/{project_id}/docs/upload ──────────────────────
@router.post("/{project_id}/docs/upload")
async def upload_doc_file(
    user: CurrentUser,
    project_id: str,
    track:  str = Form(...),
    folder: str = Form(...),
    change_note: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db=Depends(get_db),
):
    _validate_track_folder(track, folder)

    row = await db.fetchrow(
        "SELECT code, domain_code FROM projects WHERE id = $1", project_id
    )
    if not row:
        raise HTTPException(404, "Project not found")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large (max 50 MB)")

    domain_code  = row["domain_code"] or ""
    project_code = row["code"] or ""
    doc_category = f"{track}/{folder}"
    original_name = file.filename or "unnamed"

    # Upsert project_files record (keyed by project + category + filename)
    existing = await db.fetchrow(
        """
        SELECT id, current_version FROM project_files
        WHERE project_id = $1 AND doc_category = $2 AND name = $3 AND file_type = 'user_upload'
        """,
        project_id, doc_category, original_name,
    )

    if existing:
        file_id  = existing["id"]
        ver_num  = int((existing["current_version"] or "v0").lstrip("v") or "0") + 1
        new_ver  = f"v{ver_num}"
    else:
        file_id = _uuid.uuid4()
        new_ver = "v1"
        await db.execute(
            """
            INSERT INTO project_files
                (id, project_id, doc_category, name, file_type, current_version, status, created_by)
            VALUES ($1, $2, $3, $4, 'user_upload', $5, 'draft', $6)
            """,
            file_id, project_id, doc_category, original_name, new_ver, user.username,
        )

    # Write file to disk
    dest_dir = UPLOADS_DIR / domain_code / project_code / track / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    short_id    = str(file_id)[:8]
    stored_name = f"{short_id}_{new_ver}_{original_name}"
    dest_path   = dest_dir / stored_name
    dest_path.write_bytes(content)
    rel_path = str(dest_path.relative_to(UPLOADS_DIR))

    # Insert version record
    ver_id = _uuid.uuid4()
    await db.execute(
        """
        INSERT INTO file_versions
            (id, file_id, version, storage_path, change_note, uploaded_by, file_size)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """,
        ver_id, file_id, new_ver, rel_path, change_note, user.username, len(content),
    )

    # Update project_files latest pointer
    await db.execute(
        "UPDATE project_files SET current_version=$1, storage_path=$2, updated_at=NOW() WHERE id=$3",
        new_ver, rel_path, file_id,
    )

    return {
        "file_id": str(file_id),
        "version": new_ver,
        "name":    original_name,
        "size":    len(content),
    }


# ── GET /projects/{project_id}/docs/{track}/{folder}/files ────────
@router.get("/{project_id}/docs/{track}/{folder}/files")
async def get_folder_files(
    user: CurrentUser,
    project_id: str,
    track:  str,
    folder: str,
    db=Depends(get_db),
):
    _validate_track_folder(track, folder)
    doc_category = f"{track}/{folder}"

    rows = await db.fetch(
        """
        SELECT
            pf.id::text        AS id,
            pf.name,
            pf.current_version,
            pf.status,
            pf.created_at,
            pf.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id',           fv.id::text,
                        'version',      fv.version,
                        'storage_path', fv.storage_path,
                        'uploaded_by',  fv.uploaded_by,
                        'file_size',    fv.file_size,
                        'uploaded_at',  fv.uploaded_at,
                        'change_note',  fv.change_note
                    ) ORDER BY fv.uploaded_at DESC
                ) FILTER (WHERE fv.id IS NOT NULL),
                '[]'
            ) AS versions
        FROM project_files pf
        LEFT JOIN file_versions fv ON fv.file_id = pf.id
        WHERE pf.project_id = $1
          AND pf.doc_category = $2
          AND pf.file_type = 'user_upload'
        GROUP BY pf.id
        ORDER BY pf.updated_at DESC
        """,
        project_id, doc_category,
    )

    result = []
    for r in rows:
        versions = r["versions"]
        if isinstance(versions, str):
            import json
            versions = json.loads(versions)
        result.append({
            "id":              r["id"],
            "name":            r["name"],
            "current_version": r["current_version"],
            "status":          r["status"],
            "created_at":      r["created_at"].isoformat() if r["created_at"] else None,
            "updated_at":      r["updated_at"].isoformat() if r["updated_at"] else None,
            "versions":        versions,
        })
    return result


# ── GET /projects/{project_id}/docs/file/{file_id}/download ──────
@router.get("/{project_id}/docs/file/{file_id}/download")
async def download_doc_file(
    user: CurrentUser,
    project_id: str,
    file_id:    str,
    version:    Optional[str] = Query(None),
    db=Depends(get_db),
):
    if version:
        ver_row = await db.fetchrow(
            """
            SELECT fv.storage_path, pf.name FROM file_versions fv
            JOIN project_files pf ON pf.id = fv.file_id
            WHERE fv.file_id = $1 AND fv.version = $2 AND pf.project_id = $3
            """,
            file_id, version, project_id,
        )
    else:
        ver_row = await db.fetchrow(
            """
            SELECT fv.storage_path, pf.name FROM file_versions fv
            JOIN project_files pf ON pf.id = fv.file_id
            WHERE fv.file_id = $1 AND pf.project_id = $2
            ORDER BY fv.uploaded_at DESC LIMIT 1
            """,
            file_id, project_id,
        )

    if not ver_row:
        raise HTTPException(404, "File version not found")

    file_path = UPLOADS_DIR / ver_row["storage_path"]
    if not file_path.exists():
        raise HTTPException(404, "File not found on disk")

    # Security: must stay within UPLOADS_DIR
    try:
        file_path.resolve().relative_to(UPLOADS_DIR.resolve())
    except ValueError:
        raise HTTPException(403, "Access denied")

    return FileResponse(
        path=str(file_path),
        filename=ver_row["name"],
        media_type="application/octet-stream",
    )
