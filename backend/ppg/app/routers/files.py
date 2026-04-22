"""
Files Router — project_files + file_versions tables
File records + versioning per project
"""
import os
import re
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from uuid import uuid4
import asyncpg

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/projects", tags=["files"])


class FileCreate(BaseModel):
    name: str = Field(..., max_length=255)
    file_type: Optional[str] = Field("uploaded", max_length=100)
    doc_category: Optional[str] = Field(None, max_length=100)
    milestone_id: Optional[str] = None
    storage_path: Optional[str] = None
    external_url: Optional[str] = None
    file_size: Optional[int] = None


class FileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    doc_category: Optional[str] = None
    status: Optional[str] = None
    external_url: Optional[str] = None


class VersionUpload(BaseModel):
    version: Optional[str] = None
    storage_path: Optional[str] = None
    external_url: Optional[str] = None
    change_note: Optional[str] = None
    file_size: Optional[int] = None


@router.get("/{project_id}/files")
async def list_files(
    user: CurrentUser,
    project_id: str,
    milestone_id: Optional[str] = None,
    db: asyncpg.Connection = Depends(get_db),
):
    if milestone_id:
        rows = await db.fetch(
            "SELECT * FROM project_files WHERE project_id=$1 AND milestone_id=$2 ORDER BY name",
            project_id, milestone_id,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM project_files WHERE project_id=$1 ORDER BY name",
            project_id,
        )
    return [dict(r) for r in rows]


@router.post("/{project_id}/files", status_code=201)
async def create_file(
    user: CurrentUser,
    project_id: str,
    body: FileCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    file_id = str(uuid4())
    version = "v1.0"
    async with db.transaction():
        file_row = await db.fetchrow("""
            INSERT INTO project_files
                (id, project_id, milestone_id, name, file_type, doc_category,
                 current_version, storage_path, external_url, status, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10) RETURNING *""",
            file_id, project_id, body.milestone_id, body.name,
            body.file_type, body.doc_category, version,
            body.storage_path, body.external_url,
            user.sub if user else "system",
        )
        await db.execute("""
            INSERT INTO file_versions
                (id, file_id, version, storage_path, external_url, file_size, uploaded_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7)""",
            str(uuid4()), file_id, version,
            body.storage_path, body.external_url,
            body.file_size, user.sub if user else "system",
        )
    return dict(file_row)


@router.put("/{project_id}/files/{fid}")
async def update_file(
    user: CurrentUser,
    project_id: str,
    fid: str,
    body: FileUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    set_parts = [f"{k}=${i+3}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE project_files SET {', '.join(set_parts)}, updated_at=NOW() "
        f"WHERE id=$1 AND project_id=$2 RETURNING *",
        fid, project_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "File not found")
    return dict(row)


@router.delete("/{project_id}/files/{fid}", status_code=204)
async def delete_file(
    user: CurrentUser,
    project_id: str,
    fid: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_files WHERE id=$1 AND project_id=$2",
        fid, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "File not found")


@router.get("/{project_id}/files/{fid}/versions")
async def list_versions(
    user: CurrentUser,
    project_id: str,
    fid: str,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT id FROM project_files WHERE id=$1 AND project_id=$2", fid, project_id
    )
    if not row:
        raise HTTPException(404, "File not found")
    rows = await db.fetch(
        "SELECT * FROM file_versions WHERE file_id=$1 ORDER BY uploaded_at DESC", fid
    )
    return [dict(r) for r in rows]


@router.post("/{project_id}/files/{fid}/versions", status_code=201)
async def upload_new_version(
    user: CurrentUser,
    project_id: str,
    fid: str,
    body: VersionUpload,
    db: asyncpg.Connection = Depends(get_db),
):
    file_row = await db.fetchrow(
        "SELECT * FROM project_files WHERE id=$1 AND project_id=$2", fid, project_id
    )
    if not file_row:
        raise HTTPException(404, "File not found")

    # Auto-bump version if not provided
    if body.version:
        new_version = body.version
    else:
        cur = file_row["current_version"] or "v0.0"
        try:
            parts = cur.lstrip("v").split(".")
            parts[-1] = str(int(parts[-1]) + 1)
            new_version = "v" + ".".join(parts)
        except Exception:
            new_version = cur + ".1"

    async with db.transaction():
        ver_row = await db.fetchrow("""
            INSERT INTO file_versions
                (id, file_id, version, storage_path, external_url, change_note, file_size, uploaded_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *""",
            str(uuid4()), fid, new_version,
            body.storage_path, body.external_url,
            body.change_note, body.file_size,
            user.sub if user else "system",
        )
        await db.execute(
            "UPDATE project_files SET current_version=$1, updated_at=NOW() WHERE id=$2",
            new_version, fid,
        )
    return dict(ver_row)


# ── GNM Export ────────────────────────────────────────────────────────────────

@router.get("/{project_id}/files/{file_id}/export/gnm")
async def export_file_gnm(
    user: CurrentUser,
    project_id: str,
    file_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    """Export a .md project file to GNM Excel format."""
    row = await db.fetchrow(
        "SELECT * FROM project_files WHERE id=$1 AND project_id=$2", file_id, project_id
    )
    if not row:
        raise HTTPException(404, "File not found")

    storage_path: str | None = row["storage_path"]
    if not storage_path:
        raise HTTPException(400, "File has no local storage path — only local .md files can be exported to GNM")

    if not storage_path.lower().endswith(".md"):
        raise HTTPException(400, f"GNM export requires a Markdown (.md) file. Got: {os.path.basename(storage_path)}")

    if not os.path.isfile(storage_path):
        raise HTTPException(404, f"File content not found on disk: {storage_path}")

    with open(storage_path, "r", encoding="utf-8") as fh:
        content = fh.read()

    from app.services.gnm_export_service import parse_markdown_to_gnm, build_gnm_excel, GNM_TEMPLATE_PATH

    if not os.path.isfile(GNM_TEMPLATE_PATH):
        raise HTTPException(
            500,
            f"GNM template not found at '{GNM_TEMPLATE_PATH}'. "
            "Set GNM_TEMPLATE_PATH env var to the correct path of GNM.xlsx."
        )

    gnm_data   = parse_markdown_to_gnm(content, filename=row["name"])
    excel_bytes = build_gnm_excel(gnm_data, template_path=GNM_TEMPLATE_PATH)

    safe_name  = re.sub(r"[^\w\-]", "_", os.path.splitext(row["name"])[0])
    filename   = f"GNM_{safe_name}_{date.today().strftime('%Y%m%d')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
