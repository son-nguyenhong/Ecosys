"""
Test Documents Router — FR-030, FR-031, FR-032
Tables: test_documents, test_document_files, test_case_object_links

Supported doc types: TEST_PLAN, BUG_REPORT, UAT_SIGNOFF
State machines:
  TEST_PLAN:   draft → in_review → approved → archived
  BUG_REPORT:  open → in_progress → resolved → closed
  UAT_SIGNOFF: draft → pending_sign → signed → archived
"""
from __future__ import annotations

import hashlib
import io
import json
import os
from typing import Optional
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.auth import CurrentUser
from app.database import get_db
from app.services.audit_service import log_audit

router = APIRouter(prefix="/api/v1/test-documents", tags=["test-documents"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_DOC_TYPES = frozenset({"TEST_PLAN", "BUG_REPORT", "UAT_SIGNOFF"})

# State machines per doc type
STATE_MACHINES: dict[str, dict[str, dict[str, str]]] = {
    "TEST_PLAN": {
        "draft": {"submit_review": "in_review"},
        "in_review": {"approve": "approved", "reject": "draft"},
        "approved": {"archive": "archived"},
    },
    "BUG_REPORT": {
        "open": {"start": "in_progress"},
        "in_progress": {"resolve": "resolved"},
        "resolved": {"close": "closed", "reopen": "open"},
    },
    "UAT_SIGNOFF": {
        "draft": {"submit": "pending_sign"},
        "pending_sign": {"sign": "signed", "reject": "draft"},
        "signed": {"archive": "archived"},
    },
}

INITIAL_STATUS: dict[str, str] = {
    "TEST_PLAN": "draft",
    "BUG_REPORT": "open",
    "UAT_SIGNOFF": "draft",
}

VALID_SEVERITY = frozenset({"critical", "high", "medium", "low"})
DEFAULT_COVERAGE_THRESHOLD = 80.0

# ADR-005 file controls
ALLOWED_MIME_TYPES = frozenset(
    {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
    "image/png": 5 * 1024 * 1024,
    "image/jpeg": 5 * 1024 * 1024,
    "image/gif": 5 * 1024 * 1024,
    "text/plain": 2 * 1024 * 1024,
    "text/markdown": 2 * 1024 * 1024,
}
DEFAULT_MAX_SIZE = 20 * 1024 * 1024
STORAGE_BASE = os.getenv("TEST_DOC_STORAGE_BASE", "/data/vib-docstore/test")

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class TestDocumentCreate(BaseModel):
    project_id: str
    doc_type: str = Field(..., description="TEST_PLAN | BUG_REPORT | UAT_SIGNOFF")
    title: str = Field(..., max_length=300)
    content: str = ""
    object_id: Optional[str] = None
    milestone_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class TestDocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    content: Optional[str] = None
    metadata: Optional[dict] = None
    change_note: Optional[str] = None


class TestDocStatusAction(BaseModel):
    action: str
    notes: Optional[str] = None
    # UAT_SIGNOFF specific
    approver: Optional[str] = None
    sign_date: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_doc(row: asyncpg.Record) -> dict:
    d = dict(row)
    if isinstance(d.get("metadata"), str):
        d["metadata"] = json.loads(d["metadata"])
    return d


async def _get_doc_or_404(db: asyncpg.Connection, doc_id: str) -> asyncpg.Record:
    row = await db.fetchrow("SELECT * FROM test_documents WHERE id = $1", doc_id)
    if not row:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Test document not found"})
    return row


def _compute_sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


async def _save_file_to_storage(
    content: bytes,
    document_id: str,
    version: int,
    filename: str,
) -> str:
    rel_path = os.path.join(document_id, str(version), filename)
    abs_path = os.path.join(STORAGE_BASE, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, "wb") as f:
        f.write(content)
    return rel_path


# ---------------------------------------------------------------------------
# Test case object links and coverage (FR-030, FR-031)
# Declared BEFORE /{doc_id} catch-all to avoid FastAPI route shadowing.
# ---------------------------------------------------------------------------


@router.get("/test-cases/{test_case_id}/objects")
async def get_test_case_objects(
    test_case_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """FR-030: list objects linked to a test case (inherited from BRS)."""
    rows = await db.fetch(
        """
        SELECT tcl.*, po.name as object_name, po.object_type,
               p.id as project_id, p.name as project_name
        FROM test_case_object_links tcl
        JOIN ppg_project_objects po ON po.id = tcl.object_id
        JOIN projects p ON p.id = po.project_id
        WHERE tcl.test_case_id = $1
        ORDER BY tcl.linked_at
        """,
        test_case_id,
    )
    return {
        "data": [
            {
                "object_id": str(r["object_id"]),
                "name": r["object_name"],
                "object_type": r["object_type"],
                "inherited_from_brs": r["inherited_from_brs"],
                "project": {"id": str(r["project_id"]), "name": r["project_name"]},
            }
            for r in rows
        ]
    }


@router.get("/objects/{object_id}/test-cases")
async def get_object_test_cases(
    object_id: str,
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """FR-030: all test cases linked to an object."""
    conditions = ["tcl.object_id = $1"]
    params: list = [object_id]
    idx = 2

    if status:
        conditions.append(f"tc.status = ${idx}")
        params.append(status)
        idx += 1

    where = " AND ".join(conditions)
    total_row = await db.fetchrow(
        f"SELECT COUNT(*) as cnt FROM test_case_object_links tcl "
        f"JOIN test_cases tc ON tc.id = tcl.test_case_id WHERE {where}",
        *params,
    )
    total = total_row["cnt"] if total_row else 0

    offset = (page - 1) * size
    rows = await db.fetch(
        f"SELECT tc.*, tcl.inherited_from_brs FROM test_cases tc "
        f"JOIN test_case_object_links tcl ON tcl.test_case_id = tc.id "
        f"WHERE {where} ORDER BY tc.created_at DESC LIMIT ${idx} OFFSET ${idx+1}",
        *params, size, offset,
    )
    return {
        "data": [dict(r) for r in rows],
        "meta": {"total": total, "page": page, "size": size},
    }


@router.get("/objects/{object_id}/test-coverage")
async def get_object_test_coverage(
    object_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """FR-031: Coverage summary per object with milestone alerts."""
    # Verify object exists
    obj = await db.fetchrow("SELECT * FROM ppg_project_objects WHERE id = $1", object_id)
    if not obj:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Object not found"})

    # All test cases linked to this object
    tc_rows = await db.fetch(
        """
        SELECT tc.id, tc.status
        FROM test_cases tc
        JOIN test_case_object_links tcl ON tcl.test_case_id = tc.id
        WHERE tcl.object_id = $1
        """,
        object_id,
    )

    total = len(tc_rows)
    executed = sum(1 for r in tc_rows if r["status"] == "executed")
    passed = executed
    failed = 0
    coverage_pct = round(passed / total * 100, 1) if total > 0 else 0.0

    # Milestone coverage alerts (FR-031)
    project_id = str(obj["project_id"])
    milestones = await db.fetch(
        "SELECT id, name, milestone_type, end_date FROM project_milestones WHERE project_id = $1 ORDER BY sort_order",
        project_id,
    )

    # Per-project coverage threshold (configurable, default 80%)
    threshold_row = await db.fetchrow(
        "SELECT coverage_threshold FROM projects WHERE id = $1", project_id
    )
    threshold = float(threshold_row["coverage_threshold"]) if (
        threshold_row and threshold_row.get("coverage_threshold")
    ) else DEFAULT_COVERAGE_THRESHOLD

    from datetime import datetime, timezone

    milestone_coverage: list[dict] = []
    for ms in milestones:
        is_release_ms = ms["milestone_type"] in ("uat", "release", "go_live")
        end_date = ms.get("end_date")
        overdue = False
        if end_date:
            if hasattr(end_date, "date"):
                overdue = end_date.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
            else:
                overdue = end_date < datetime.now(timezone.utc).date()

        is_below = coverage_pct < threshold
        alert: Optional[str] = None
        if is_release_ms and is_below and overdue:
            alert = (
                f"Coverage {coverage_pct}% is below threshold {threshold}% "
                f"for milestone '{ms['name']}'"
            )
        milestone_coverage.append(
            {
                "milestone_id": str(ms["id"]),
                "milestone_name": ms["name"],
                "coverage_pct": coverage_pct,
                "threshold_pct": threshold,
                "is_below_threshold": is_below,
                "alert": alert,
            }
        )

    return {
        "data": {
            "object_id": object_id,
            "object_name": obj["name"],
            "total_test_cases": total,
            "executed": executed,
            "passed": passed,
            "failed": failed,
            "coverage_pct": coverage_pct,
            "milestone_coverage": milestone_coverage,
        }
    }


# ---------------------------------------------------------------------------
# CRUD — Test Documents
# ---------------------------------------------------------------------------


@router.get("")
async def list_test_documents(
    project_id: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    object_id: Optional[str] = Query(None, description="Filter by object (FR-030)"),
    milestone_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None, description="BUG_REPORT only: critical|high|medium|low"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    conditions: list[str] = []
    params: list = []
    idx = 1

    if project_id:
        conditions.append(f"project_id = ${idx}")
        params.append(project_id)
        idx += 1
    if doc_type:
        conditions.append(f"doc_type = ${idx}")
        params.append(doc_type)
        idx += 1
    if status:
        conditions.append(f"status = ${idx}")
        params.append(status)
        idx += 1
    if object_id:
        conditions.append(f"object_id = ${idx}")
        params.append(object_id)
        idx += 1
    if milestone_id:
        conditions.append(f"milestone_id = ${idx}")
        params.append(milestone_id)
        idx += 1
    if severity:
        # JSONB field filter
        conditions.append(f"metadata->>'severity' = ${idx}")
        params.append(severity)
        idx += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    total_row = await db.fetchrow(
        f"SELECT COUNT(*) as cnt FROM test_documents {where}", *params
    )
    total = total_row["cnt"] if total_row else 0

    offset = (page - 1) * size
    rows = await db.fetch(
        f"SELECT * FROM test_documents {where} ORDER BY updated_at DESC "
        f"LIMIT ${idx} OFFSET ${idx+1}",
        *params, size, offset,
    )
    return {
        "data": [_parse_doc(r) for r in rows],
        "meta": {"total": total, "page": page, "size": size},
    }


@router.post("", status_code=201)
async def create_test_document(
    body: TestDocumentCreate,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    if body.doc_type not in VALID_DOC_TYPES:
        raise HTTPException(
            422,
            detail={
                "code": "VALIDATION_ERROR",
                "message": f"doc_type must be one of {sorted(VALID_DOC_TYPES)}",
            },
        )

    # Validate BUG_REPORT severity if provided
    if body.doc_type == "BUG_REPORT":
        sev = body.metadata.get("severity")
        if sev and sev not in VALID_SEVERITY:
            raise HTTPException(
                422,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": f"Bug report severity must be one of {sorted(VALID_SEVERITY)}",
                },
            )

    doc_id = str(uuid4())
    initial_status = INITIAL_STATUS[body.doc_type]

    row = await db.fetchrow(
        """
        INSERT INTO test_documents
            (id, project_id, object_id, doc_type, title, content, status,
             milestone_id, metadata, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
        """,
        doc_id,
        body.project_id,
        body.object_id,
        body.doc_type,
        body.title,
        body.content,
        initial_status,
        body.milestone_id,
        json.dumps(body.metadata),
        user.sub,
    )
    await log_audit(
        db=db,
        entity_type="test_documents",
        entity_id=doc_id,
        action="CREATE",
        changed_by=user.sub,
        new_values=body.model_dump(exclude={"content"}),
    )
    return {"data": _parse_doc(row)}


@router.get("/{doc_id}")
async def get_test_document(
    doc_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    row = await _get_doc_or_404(db, doc_id)
    return {"data": _parse_doc(row)}


@router.put("/{doc_id}")
async def update_test_document(
    doc_id: str,
    body: TestDocumentUpdate,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    existing = await _get_doc_or_404(db, doc_id)

    updates: dict = {}
    if body.title is not None:
        updates["title"] = body.title
    if body.content is not None:
        updates["content"] = body.content
    if body.metadata is not None:
        updates["metadata"] = json.dumps(body.metadata)

    if not updates:
        raise HTTPException(400, detail={"code": "VALIDATION_ERROR", "message": "No fields to update"})

    old_values = _parse_doc(existing)
    set_parts = [f"{k} = ${i + 2}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE test_documents SET {', '.join(set_parts)}, updated_at = NOW(), updated_by = $1 "
        f"WHERE id = ${len(updates) + 2} RETURNING *",
        user.sub, *updates.values(), doc_id,
    )
    await log_audit(
        db=db,
        entity_type="test_documents",
        entity_id=doc_id,
        action="UPDATE",
        changed_by=user.sub,
        old_values={k: old_values.get(k) for k in ["title", "status"]},
        new_values=body.model_dump(exclude_none=True, exclude={"content", "change_note"}),
    )
    return {"data": _parse_doc(row)}


@router.post("/{doc_id}/status")
async def change_test_document_status(
    doc_id: str,
    body: TestDocStatusAction,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """Change status per type-specific state machine (FR-032)."""
    doc = await _get_doc_or_404(db, doc_id)
    doc_type = doc["doc_type"]
    sm = STATE_MACHINES.get(doc_type, {})
    allowed = sm.get(doc["status"], {})

    if body.action not in allowed:
        raise HTTPException(
            409,
            detail={
                "code": "STATE_MACHINE_VIOLATION",
                "message": f"Action '{body.action}' not allowed in status '{doc['status']}' "
                           f"for {doc_type}. Allowed: {list(allowed.keys())}",
            },
        )

    new_status = allowed[body.action]
    old_status = doc["status"]

    extra_updates: dict = {"status": new_status}

    # UAT_SIGNOFF: capture approver and sign_date on 'sign' action
    if doc_type == "UAT_SIGNOFF" and body.action == "sign":
        existing_meta = _parse_doc(doc).get("metadata", {}) or {}
        existing_meta["approver"] = body.approver or user.sub
        existing_meta["sign_date"] = body.sign_date
        extra_updates["metadata"] = json.dumps(existing_meta)

    set_parts = [f"{k} = ${i + 2}" for i, k in enumerate(extra_updates.keys())]
    row = await db.fetchrow(
        f"UPDATE test_documents SET {', '.join(set_parts)}, updated_at = NOW(), updated_by = $1 "
        f"WHERE id = ${len(extra_updates) + 2} RETURNING *",
        user.sub, *extra_updates.values(), doc_id,
    )
    await log_audit(
        db=db,
        entity_type="test_documents",
        entity_id=doc_id,
        action="STATUS_CHANGE",
        changed_by=user.sub,
        old_values={"status": old_status},
        new_values={"status": new_status},
        notes=body.notes,
    )
    return {"data": {"status": new_status, "doc_id": doc_id}}


@router.delete("/{doc_id}", status_code=204, response_class=Response)
async def delete_test_document(
    doc_id: str,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> Response:
    """Soft delete via status change to archived or closed."""
    existing = await _get_doc_or_404(db, doc_id)
    # Mark as archived/closed
    terminal_status = "closed" if existing["doc_type"] == "BUG_REPORT" else "archived"
    await db.execute(
        "UPDATE test_documents SET status = $2, updated_at = NOW(), updated_by = $3 WHERE id = $1",
        doc_id, terminal_status, user.sub,
    )
    await log_audit(
        db=db,
        entity_type="test_documents",
        entity_id=doc_id,
        action="DELETE",
        changed_by=user.sub,
    )
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# File Attachments (ADR-005)
# ---------------------------------------------------------------------------


@router.post("/{doc_id}/files", status_code=201)
async def upload_test_doc_file(
    doc_id: str,
    file: UploadFile = File(...),
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    await _get_doc_or_404(db, doc_id)

    mime = file.content_type or "application/octet-stream"
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            415,
            detail={"code": "FILE_TYPE_NOT_ALLOWED", "message": f"MIME type '{mime}' not allowed"},
        )

    content = await file.read()
    max_size = MAX_FILE_SIZE.get(mime, DEFAULT_MAX_SIZE)
    if len(content) > max_size:
        raise HTTPException(
            413,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"File exceeds limit {max_size} bytes for {mime}",
            },
        )

    latest_version = await db.fetchval(
        "SELECT COALESCE(MAX(version), 0) FROM test_document_files WHERE document_id = $1", doc_id
    )
    version = (latest_version or 0) + 1
    checksum = _compute_sha256(content)
    filename = file.filename or "upload"

    try:
        file_path = await _save_file_to_storage(content, doc_id, version, filename)
    except OSError:
        file_path = os.path.join(doc_id, str(version), filename)

    await db.execute(
        "UPDATE test_document_files SET is_current = FALSE WHERE document_id = $1", doc_id
    )
    file_id = str(uuid4())
    row = await db.fetchrow(
        """
        INSERT INTO test_document_files
            (id, document_id, file_name, file_path, mime_type, file_size_bytes,
             checksum_sha256, version, is_current, source, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,'upload',$9)
        RETURNING *
        """,
        file_id, doc_id, filename, file_path, mime, len(content),
        checksum, version, user.sub if user else "system",
    )
    await log_audit(
        db=db,
        entity_type="test_document_files",
        entity_id=file_id,
        action="UPLOAD",
        changed_by=user.sub if user else "system",
        new_values={"file_name": filename, "mime_type": mime, "version": version},
    )
    return {"data": dict(row)}


@router.get("/{doc_id}/files/{file_id}/download")
async def download_test_doc_file(
    doc_id: str,
    file_id: str,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> StreamingResponse:
    await _get_doc_or_404(db, doc_id)
    file_row = await db.fetchrow(
        "SELECT * FROM test_document_files WHERE id = $1 AND document_id = $2 AND deleted_at IS NULL",
        file_id, doc_id,
    )
    if not file_row:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "File not found"})

    abs_path = os.path.join(STORAGE_BASE, file_row["file_path"])
    if not os.path.exists(abs_path):
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "File not on storage"})

    with open(abs_path, "rb") as f:
        content = f.read()

    checksum = _compute_sha256(content)
    if checksum != file_row["checksum_sha256"]:
        raise HTTPException(500, detail={"code": "INTERNAL_ERROR", "message": "Checksum mismatch"})

    await log_audit(
        db=db,
        entity_type="test_document_files",
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
