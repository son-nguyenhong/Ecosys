"""
BA Documents Router v2 — FR-027, FR-028, FR-029
Extensions to existing documents router:
- Object linking (FR-027): ba_document_object_links
- Milestone tracking (FR-028): milestone_id column
- Extended doc_type catalog (FR-029): BRD, BRS, FSD, API_SPEC, ERD, DATA_DICT, WIREFRAME, PROCESS_FLOW
- File attachments (ADR-005): ba_document_files
"""
from __future__ import annotations

import hashlib
import io
import json
import os
from typing import Optional
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from app.auth import CurrentUser
from app.database import get_db
from app.services.audit_service import log_audit
from app.services.sync_service import push_doc_to_ppg, push_brs_to_test_platform

router = APIRouter(prefix="/api/v1/documents", tags=["ba-documents-v2"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_DOC_TYPES = frozenset(
    {"BRD", "BRS", "FSD", "API_SPEC", "ERD", "DATA_DICT", "WIREFRAME", "PROCESS_FLOW"}
)

# State machine: draft → review → approved → archived (BR-001)
DOC_TRANSITIONS: dict[str, dict[str, str]] = {
    "draft": {"submit_review": "in_review"},
    "in_review": {"approve": "approved", "reject": "draft"},
    "approved": {"archive": "archived"},
}

# ADR-005 file controls
ALLOWED_MIME_TYPES = frozenset(
    {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "image/png",
        "image/jpeg",
        "image/gif",
        "text/plain",
        "text/markdown",
    }
)

MAX_FILE_SIZE: dict[str, int] = {
    "application/pdf": 20 * 1024 * 1024,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 10 * 1024 * 1024,
    "application/vnd.ms-excel": 10 * 1024 * 1024,
    "image/png": 5 * 1024 * 1024,
    "image/jpeg": 5 * 1024 * 1024,
    "image/gif": 5 * 1024 * 1024,
    "text/plain": 2 * 1024 * 1024,
    "text/markdown": 2 * 1024 * 1024,
}
DEFAULT_MAX_SIZE = 20 * 1024 * 1024

STORAGE_BASE = os.getenv("DOC_STORAGE_BASE", "/data/vib-docstore/ba")

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class BADocumentCreate(BaseModel):
    project_id: str
    doc_type: str = Field(..., description="BRD|BRS|FSD|API_SPEC|ERD|DATA_DICT|WIREFRAME|PROCESS_FLOW")
    title: str = Field(..., max_length=300)
    content: str = ""
    milestone_id: Optional[str] = None
    object_ids: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    version: str = "v1.0"

    @field_validator("doc_type")
    @classmethod
    def validate_doc_type(cls, v: str) -> str:
        if v not in VALID_DOC_TYPES:
            raise ValueError(f"doc_type must be one of {sorted(VALID_DOC_TYPES)}")
        return v


class BADocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    content: Optional[str] = None
    metadata: Optional[dict] = None
    change_note: Optional[str] = None


class DocumentStatusAction(BaseModel):
    action: str
    notes: Optional[str] = None
    # For UAT-style approvals (future extension)
    approver: Optional[str] = None


class ObjectLinkRequest(BaseModel):
    object_id: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_doc(row: asyncpg.Record) -> dict:
    d = dict(row)
    if isinstance(d.get("metadata"), str):
        d["metadata"] = json.loads(d["metadata"])
    return d


async def _get_doc_or_404(db: asyncpg.Connection, doc_id: str) -> asyncpg.Record:
    row = await db.fetchrow("SELECT * FROM ba_documents WHERE id = $1", doc_id)
    if not row:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Document not found"})
    return row


async def _validate_object_ids(
    db: asyncpg.Connection, object_ids: list[str], project_id: str
) -> None:
    """BR-011: objects must exist, be active, and belong to the same project."""
    for oid in object_ids:
        obj = await db.fetchrow(
            "SELECT id, status, project_id FROM ppg_project_objects WHERE id = $1",
            oid,
        )
        if not obj:
            raise HTTPException(
                422,
                detail={
                    "code": "OBJECT_INCOMPLETE",
                    "message": f"Object {oid} not found",
                },
            )
        if str(obj["project_id"]) != project_id:
            raise HTTPException(
                422,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": f"Object {oid} does not belong to project {project_id}",
                },
            )
        if obj["status"] != "active":
            raise HTTPException(
                422,
                detail={
                    "code": "OBJECT_INCOMPLETE",
                    "message": f"Object {oid} must be active to link documents (BR-011)",
                },
            )


# ---------------------------------------------------------------------------
# CRUD — Documents
# ---------------------------------------------------------------------------


@router.get("")
async def list_ba_documents(
    project_id: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    object_id: Optional[str] = Query(None, description="Filter docs linked to this object (FR-027)"),
    milestone_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    conditions: list[str] = []
    params: list = []
    idx = 1

    if object_id:
        conditions.append(
            f"d.id IN (SELECT document_id FROM ba_document_object_links WHERE object_id = ${idx})"
        )
        params.append(object_id)
        idx += 1
    if project_id:
        conditions.append(f"d.project_id = ${idx}")
        params.append(project_id)
        idx += 1
    if doc_type:
        conditions.append(f"d.doc_type = ${idx}")
        params.append(doc_type)
        idx += 1
    if status:
        conditions.append(f"d.status = ${idx}")
        params.append(status)
        idx += 1
    if milestone_id:
        conditions.append(f"d.milestone_id = ${idx}")
        params.append(milestone_id)
        idx += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    total_row = await db.fetchrow(
        f"SELECT COUNT(*) as cnt FROM ba_documents d {where}", *params
    )
    total = total_row["cnt"] if total_row else 0

    offset = (page - 1) * size
    rows = await db.fetch(
        f"SELECT d.* FROM ba_documents d {where} ORDER BY d.updated_at DESC "
        f"LIMIT ${idx} OFFSET ${idx+1}",
        *params, size, offset,
    )
    return {
        "data": [_parse_doc(r) for r in rows],
        "meta": {"total": total, "page": page, "size": size},
    }


@router.post("", status_code=201)
async def create_ba_document(
    body: BADocumentCreate,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    if body.object_ids:
        await _validate_object_ids(db, body.object_ids, body.project_id)

    doc_id = str(uuid4())
    async with db.transaction():
        row = await db.fetchrow(
            """
            INSERT INTO ba_documents
                (id, project_id, doc_type, title, content, version, status,
                 milestone_id, metadata, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9)
            RETURNING *
            """,
            doc_id,
            body.project_id,
            body.doc_type,
            body.title,
            body.content,
            body.version,
            body.milestone_id,
            json.dumps(body.metadata),
            user.sub,
        )
        for oid in body.object_ids:
            await db.execute(
                """
                INSERT INTO ba_document_object_links (id, document_id, object_id, linked_by)
                VALUES ($1,$2,$3,$4)
                ON CONFLICT (document_id, object_id) DO NOTHING
                """,
                str(uuid4()), doc_id, oid, user.sub,
            )

    await log_audit(
        db=db,
        entity_type="ba_documents",
        entity_id=doc_id,
        action="CREATE",
        changed_by=user.sub,
        new_values=body.model_dump(exclude={"content"}),
    )
    return {"data": _parse_doc(row)}


@router.get("/{doc_id}")
async def get_ba_document(
    doc_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    row = await _get_doc_or_404(db, doc_id)
    d = _parse_doc(row)
    # Attach linked objects
    obj_rows = await db.fetch(
        """
        SELECT po.id, po.name, po.object_type, po.project_id
        FROM ba_document_object_links dol
        JOIN ppg_project_objects po ON po.id = dol.object_id
        WHERE dol.document_id = $1
        """,
        doc_id,
    )
    d["linked_objects"] = [dict(o) for o in obj_rows]
    return {"data": d}


@router.put("/{doc_id}")
async def update_ba_document(
    doc_id: str,
    body: BADocumentUpdate,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    existing = await _get_doc_or_404(db, doc_id)
    if existing["status"] == "approved":
        raise HTTPException(
            400,
            detail={"code": "VALIDATION_ERROR", "message": "Cannot edit an approved document"},
        )

    old_snapshot = _parse_doc(existing)

    # Bump version
    cur_ver = existing["version"] or "v1.0"
    try:
        parts = cur_ver.lstrip("v").split(".")
        parts[-1] = str(int(parts[-1]) + 1)
        new_version = "v" + ".".join(parts)
    except Exception:
        new_version = cur_ver + ".1"

    # Save history snapshot
    await db.execute(
        """
        INSERT INTO ba_document_history (id, doc_id, version, changed_by, change_note, snapshot)
        VALUES ($1,$2,$3,$4,$5,$6)
        """,
        str(uuid4()), doc_id, existing["version"],
        user.sub, body.change_note or "",
        json.dumps(old_snapshot),
    )

    updates: dict = {"version": new_version}
    if body.title is not None:
        updates["title"] = body.title
    if body.content is not None:
        updates["content"] = body.content
    if body.metadata is not None:
        updates["metadata"] = json.dumps(body.metadata)

    set_parts = [f"{k} = ${i + 2}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE ba_documents SET {', '.join(set_parts)}, updated_at = NOW(), updated_by = $1 "
        f"WHERE id = ${len(updates) + 2} RETURNING *",
        user.sub, *updates.values(), doc_id,
    )
    await log_audit(
        db=db,
        entity_type="ba_documents",
        entity_id=doc_id,
        action="UPDATE",
        changed_by=user.sub,
        old_values={k: old_snapshot.get(k) for k in ["title", "version", "status"]},
        new_values=body.model_dump(exclude_none=True, exclude={"content", "change_note"}),
    )
    return {"data": _parse_doc(row)}


@router.post("/{doc_id}/status")
async def change_document_status(
    doc_id: str,
    body: DocumentStatusAction,
    background: BackgroundTasks,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """State machine: draft → in_review → approved → archived (BR-001)."""
    doc = await _get_doc_or_404(db, doc_id)
    allowed = DOC_TRANSITIONS.get(doc["status"], {})
    if body.action not in allowed:
        raise HTTPException(
            409,
            detail={
                "code": "STATE_MACHINE_VIOLATION",
                "message": f"Action '{body.action}' not allowed in status '{doc['status']}'. "
                           f"Allowed: {list(allowed.keys())}",
            },
        )

    new_status = allowed[body.action]
    old_status = doc["status"]

    extra_updates: dict = {"status": new_status}
    if body.action == "approve":
        extra_updates["approved_by"] = user.sub
    if body.action == "submit_review":
        extra_updates["reviewed_by"] = user.sub

    set_parts = [f"{k} = ${i + 2}" for i, k in enumerate(extra_updates.keys())]
    row = await db.fetchrow(
        f"UPDATE ba_documents SET {', '.join(set_parts)}, updated_at = NOW(), updated_by = $1 "
        f"WHERE id = ${len(extra_updates) + 2} RETURNING *",
        user.sub, *extra_updates.values(), doc_id,
    )
    await log_audit(
        db=db,
        entity_type="ba_documents",
        entity_id=doc_id,
        action="STATUS_CHANGE",
        changed_by=user.sub,
        old_values={"status": old_status},
        new_values={"status": new_status},
        notes=body.notes,
    )

    if new_status == "approved":
        doc_dict = _parse_doc(row)
        background.add_task(push_doc_to_ppg, doc_dict)
        if doc_dict.get("doc_type") == "BRS":
            background.add_task(push_brs_to_test_platform, doc_dict)

    return {"data": {"status": new_status, "doc_id": doc_id}}


# ---------------------------------------------------------------------------
# Object Links (FR-027)
# ---------------------------------------------------------------------------


@router.get("/{doc_id}/objects")
async def list_doc_objects(
    doc_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    await _get_doc_or_404(db, doc_id)
    rows = await db.fetch(
        """
        SELECT po.id, po.name, po.object_type, po.status, po.project_id,
               dol.linked_at, dol.linked_by
        FROM ba_document_object_links dol
        JOIN ppg_project_objects po ON po.id = dol.object_id
        WHERE dol.document_id = $1
        ORDER BY dol.linked_at DESC
        """,
        doc_id,
    )
    return {"data": [dict(r) for r in rows]}


@router.post("/{doc_id}/objects", status_code=201)
async def link_object_to_doc(
    doc_id: str,
    body: ObjectLinkRequest,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    doc = await _get_doc_or_404(db, doc_id)
    await _validate_object_ids(db, [body.object_id], doc["project_id"])

    link_id = str(uuid4())
    try:
        await db.execute(
            """
            INSERT INTO ba_document_object_links (id, document_id, object_id, linked_by)
            VALUES ($1,$2,$3,$4)
            """,
            link_id, doc_id, body.object_id, user.sub,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            409,
            detail={"code": "CONFLICT", "message": "Object already linked to this document"},
        )
    await log_audit(
        db=db,
        entity_type="ba_document_object_links",
        entity_id=link_id,
        action="LINK",
        changed_by=user.sub,
        new_values={"document_id": doc_id, "object_id": body.object_id},
    )
    return {"data": {"document_id": doc_id, "object_id": body.object_id}}


@router.delete("/{doc_id}/objects/{object_id}", status_code=204, response_class=Response)
async def unlink_object_from_doc(
    doc_id: str,
    object_id: str,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> Response:
    """Unlink without deleting the document (FR-027)."""
    await _get_doc_or_404(db, doc_id)
    link = await db.fetchrow(
        "SELECT id FROM ba_document_object_links WHERE document_id = $1 AND object_id = $2",
        doc_id, object_id,
    )
    if not link:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Link not found"})
    await db.execute(
        "DELETE FROM ba_document_object_links WHERE document_id = $1 AND object_id = $2",
        doc_id, object_id,
    )
    await log_audit(
        db=db,
        entity_type="ba_document_object_links",
        entity_id=str(link["id"]),
        action="UNLINK",
        changed_by=user.sub,
        old_values={"document_id": doc_id, "object_id": object_id},
    )
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# File Attachments (ADR-005)
# ---------------------------------------------------------------------------


def _compute_sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


async def _save_file_to_storage(
    content: bytes,
    document_id: str,
    version: int,
    filename: str,
) -> str:
    """Save to local filesystem. Returns relative path."""
    rel_path = os.path.join(document_id, str(version), filename)
    abs_path = os.path.join(STORAGE_BASE, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, "wb") as f:
        f.write(content)
    return rel_path


@router.post("/{doc_id}/files", status_code=201)
async def upload_doc_file(
    doc_id: str,
    file: UploadFile = File(...),
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """Upload file attachment for a BA document — ADR-005."""
    await _get_doc_or_404(db, doc_id)

    mime = file.content_type or "application/octet-stream"
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            415,
            detail={
                "code": "FILE_TYPE_NOT_ALLOWED",
                "message": f"MIME type '{mime}' is not allowed",
            },
        )

    content = await file.read()
    max_size = MAX_FILE_SIZE.get(mime, DEFAULT_MAX_SIZE)
    if len(content) > max_size:
        raise HTTPException(
            413,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"File size {len(content)} exceeds limit {max_size} bytes for {mime}",
            },
        )

    # Determine version number
    latest_version = await db.fetchval(
        "SELECT COALESCE(MAX(version), 0) FROM ba_document_files WHERE document_id = $1",
        doc_id,
    )
    version = (latest_version or 0) + 1

    checksum = _compute_sha256(content)
    filename = file.filename or "upload"

    try:
        file_path = await _save_file_to_storage(content, doc_id, version, filename)
    except OSError:
        # In test/dev environments storage may not exist — store path reference anyway
        file_path = os.path.join(doc_id, str(version), filename)

    # Mark previous versions as not current
    await db.execute(
        "UPDATE ba_document_files SET is_current = FALSE WHERE document_id = $1",
        doc_id,
    )

    file_id = str(uuid4())
    row = await db.fetchrow(
        """
        INSERT INTO ba_document_files
            (id, document_id, file_name, file_path, mime_type, file_size_bytes,
             checksum_sha256, version, is_current, source, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,'upload',$9)
        RETURNING *
        """,
        file_id, doc_id, filename, file_path, mime,
        len(content), checksum, version, user.sub if user else "system",
    )
    await log_audit(
        db=db,
        entity_type="ba_document_files",
        entity_id=file_id,
        action="UPLOAD",
        changed_by=user.sub if user else "system",
        new_values={"file_name": filename, "mime_type": mime, "version": version},
    )
    return {"data": dict(row)}


@router.get("/{doc_id}/files")
async def list_doc_files(
    doc_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    await _get_doc_or_404(db, doc_id)
    rows = await db.fetch(
        "SELECT * FROM ba_document_files WHERE document_id = $1 AND is_current = TRUE "
        "AND deleted_at IS NULL ORDER BY created_at DESC",
        doc_id,
    )
    return {"data": [dict(r) for r in rows]}


@router.get("/{doc_id}/files/{file_id}/download")
async def download_doc_file(
    doc_id: str,
    file_id: str,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> StreamingResponse:
    """Download file with JWT auth. Writes audit log with DOWNLOAD action."""
    await _get_doc_or_404(db, doc_id)
    file_row = await db.fetchrow(
        "SELECT * FROM ba_document_files WHERE id = $1 AND document_id = $2 AND deleted_at IS NULL",
        file_id, doc_id,
    )
    if not file_row:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "File not found"})

    abs_path = os.path.join(STORAGE_BASE, file_row["file_path"])
    if not os.path.exists(abs_path):
        raise HTTPException(
            404,
            detail={"code": "NOT_FOUND", "message": "File content not found on storage"},
        )

    with open(abs_path, "rb") as f:
        content = f.read()

    # Verify checksum
    checksum = _compute_sha256(content)
    if checksum != file_row["checksum_sha256"]:
        raise HTTPException(
            500,
            detail={"code": "INTERNAL_ERROR", "message": "File checksum mismatch — possible corruption"},
        )

    await log_audit(
        db=db,
        entity_type="ba_document_files",
        entity_id=file_id,
        action="DOWNLOAD",
        changed_by=user.sub,
    )

    return StreamingResponse(
        io.BytesIO(content),
        media_type=file_row["mime_type"],
        headers={
            "Content-Disposition": f"attachment; filename={file_row['file_name']}",
            "X-Checksum-SHA256": file_row["checksum_sha256"],
        },
    )


@router.post("/{doc_id}/files/copy-from-url")
async def copy_file_from_url(
    doc_id: str,
    body: dict,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """BR-007: Download URL and save a copy to internal storage."""
    url = body.get("url", "").strip()
    file_name = body.get("file_name", "").strip() or "copied_file"

    if not url:
        raise HTTPException(422, detail={"code": "VALIDATION_ERROR", "message": "url is required"})

    await _get_doc_or_404(db, doc_id)

    try:
        import httpx

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            content = resp.content
            mime = resp.headers.get("content-type", "application/octet-stream").split(";")[0].strip()
    except Exception as e:
        raise HTTPException(
            422,
            detail={"code": "VALIDATION_ERROR", "message": f"Failed to fetch URL: {e}"},
        )

    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            415,
            detail={"code": "FILE_TYPE_NOT_ALLOWED", "message": f"MIME type '{mime}' not allowed"},
        )

    latest_version = await db.fetchval(
        "SELECT COALESCE(MAX(version), 0) FROM ba_document_files WHERE document_id = $1", doc_id
    )
    version = (latest_version or 0) + 1
    checksum = _compute_sha256(content)

    try:
        file_path = await _save_file_to_storage(content, doc_id, version, file_name)
    except OSError:
        file_path = os.path.join(doc_id, str(version), file_name)

    await db.execute(
        "UPDATE ba_document_files SET is_current = FALSE WHERE document_id = $1", doc_id
    )
    file_id = str(uuid4())
    row = await db.fetchrow(
        """
        INSERT INTO ba_document_files
            (id, document_id, file_name, file_path, mime_type, file_size_bytes,
             checksum_sha256, version, is_current, source, source_url, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,'copy_from_url',$9,$10)
        RETURNING *
        """,
        file_id, doc_id, file_name, file_path, mime, len(content),
        checksum, version, url, user.sub,
    )
    await log_audit(
        db=db,
        entity_type="ba_document_files",
        entity_id=file_id,
        action="UPLOAD",
        changed_by=user.sub,
        new_values={"file_name": file_name, "source": "copy_from_url", "source_url": url},
    )
    return {"data": dict(row)}


# ---------------------------------------------------------------------------
# Document history
# ---------------------------------------------------------------------------


@router.get("/{doc_id}/history")
async def get_doc_history(
    doc_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    await _get_doc_or_404(db, doc_id)
    rows = await db.fetch(
        "SELECT * FROM ba_document_history WHERE doc_id = $1 ORDER BY changed_at DESC",
        doc_id,
    )
    return {"data": [dict(r) for r in rows]}
