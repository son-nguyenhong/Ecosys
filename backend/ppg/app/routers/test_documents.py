"""
Test Documents Router (FR-030 – FR-032)
Prefix: /api/v1/test-documents

GET    /api/v1/test-documents              → list (filters: project_id, object_id, doc_type, status, milestone_id, severity)
POST   /api/v1/test-documents              → create
GET    /api/v1/test-documents/{id}         → get one
PUT    /api/v1/test-documents/{id}         → update
DELETE /api/v1/test-documents/{id}         → delete
POST   /api/v1/test-documents/{id}/status  → transition status
GET    /api/v1/test-documents/objects/{object_id}/test-coverage → coverage summary
"""
from datetime import datetime
from typing import Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import asyncpg

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/api/v1/test-documents", tags=["test-documents"])

# ── Status transition map ─────────────────────────────────────────────────────

_TRANSITIONS: dict[str, dict[str, str]] = {
    # TEST_PLAN
    "submit_review": {"draft": "review"},
    "approve":       {"review": "approved"},
    "archive":       {"approved": "archived", "signed": "archived"},
    # BUG_REPORT
    "start":         {"open": "in_progress"},
    "resolve":       {"in_progress": "resolved"},
    "close":         {"resolved": "closed"},
    # UAT_SIGNOFF
    "submit":        {"draft": "pending_sign"},
    "sign":          {"pending_sign": "signed"},
}

_DEFAULT_STATUS: dict[str, str] = {
    "TEST_PLAN":   "draft",
    "BUG_REPORT":  "open",
    "UAT_SIGNOFF": "draft",
}

# ── Schemas ───────────────────────────────────────────────────────────────────

class TestDocCreate(BaseModel):
    project_id:   str  = Field(..., min_length=1)
    doc_type:     str  = Field(..., pattern="^(TEST_PLAN|BUG_REPORT|UAT_SIGNOFF)$")
    title:        str  = Field(..., min_length=1, max_length=255)
    content:      Optional[str] = None
    object_id:    Optional[str] = None
    milestone_id: Optional[str] = None
    metadata:     Optional[dict] = None


class TestDocUpdate(BaseModel):
    title:        Optional[str]  = Field(None, min_length=1, max_length=255)
    content:      Optional[str]  = None
    milestone_id: Optional[str]  = None
    metadata:     Optional[dict] = None


class TestDocStatusRequest(BaseModel):
    action:    str = Field(..., min_length=1)
    notes:     Optional[str] = None
    approver:  Optional[str] = None
    sign_date: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _row_to_dict(row: asyncpg.Record) -> dict:
    d = dict(row)
    for k in ("created_at", "updated_at"):
        if isinstance(d.get(k), datetime):
            d[k] = d[k].isoformat()
    if isinstance(d.get("metadata"), str):
        try:
            d["metadata"] = json.loads(d["metadata"])
        except Exception:
            pass
    return d


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("")
async def list_test_documents(
    user: CurrentUser,
    project_id:   Optional[str] = Query(None),
    object_id:    Optional[str] = Query(None),
    doc_type:     Optional[str] = Query(None),
    status:       Optional[str] = Query(None),
    milestone_id: Optional[str] = Query(None),
    severity:     Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: asyncpg.Connection = Depends(get_db),
):
    clauses: list[str] = []
    params:  list      = []
    i = 1

    if project_id:
        clauses.append(f"td.project_id = ${i}::uuid"); params.append(project_id); i += 1
    if object_id:
        clauses.append(f"td.object_id = ${i}::uuid");  params.append(object_id);  i += 1
    if doc_type:
        clauses.append(f"td.doc_type = ${i}");          params.append(doc_type);   i += 1
    if status:
        clauses.append(f"td.status = ${i}");            params.append(status);     i += 1
    if milestone_id:
        clauses.append(f"td.milestone_id = ${i}::uuid"); params.append(milestone_id); i += 1
    if severity:
        clauses.append(f"td.metadata->>'severity' = ${i}"); params.append(severity); i += 1

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    offset = (page - 1) * size

    total = await db.fetchval(
        f"SELECT COUNT(*) FROM test_documents td {where}", *params
    )
    rows = await db.fetch(
        f"""
        SELECT td.*, p.name AS project_name, p.code AS project_code
        FROM test_documents td
        LEFT JOIN projects p ON p.id = td.project_id
        {where}
        ORDER BY td.created_at DESC
        LIMIT ${i} OFFSET ${i+1}
        """,
        *params, size, offset,
    )
    return {
        "data": [_row_to_dict(r) for r in rows],
        "meta": {"total": total, "page": page, "size": size},
    }


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_test_document(
    user: CurrentUser,
    body: TestDocCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    proj = await db.fetchval("SELECT id FROM projects WHERE id=$1::uuid", body.project_id)
    if not proj:
        raise HTTPException(404, f"Project '{body.project_id}' không tồn tại")

    status = _DEFAULT_STATUS.get(body.doc_type, "draft")
    meta_json = json.dumps(body.metadata) if body.metadata else None

    row = await db.fetchrow(
        """
        INSERT INTO test_documents
          (project_id, doc_type, title, content, status, object_id, milestone_id, metadata, created_by)
        VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7::uuid, $8::jsonb, $9)
        RETURNING *
        """,
        body.project_id, body.doc_type, body.title, body.content,
        status,
        body.object_id or None, body.milestone_id or None,
        meta_json, user.username if hasattr(user, "username") else None,
    )
    return {"data": _row_to_dict(row)}


# ── Get one ───────────────────────────────────────────────────────────────────

@router.get("/objects/{object_id}/test-coverage")
async def get_object_test_coverage(
    user: CurrentUser,
    object_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    # Object name
    obj_name = object_id

    rows = await db.fetch(
        "SELECT status FROM test_documents WHERE object_id=$1::uuid", object_id
    )
    total = len(rows)
    executed = sum(1 for r in rows if r["status"] in ("resolved", "closed", "approved", "signed"))
    passed   = sum(1 for r in rows if r["status"] in ("approved", "signed", "closed"))
    failed   = sum(1 for r in rows if r["status"] in ("resolved",))
    pct      = round(executed / total * 100, 1) if total > 0 else 0.0

    return {
        "data": {
            "object_id":       object_id,
            "object_name":     obj_name,
            "total_test_cases": total,
            "executed":        executed,
            "passed":          passed,
            "failed":          failed,
            "coverage_pct":    pct,
            "milestone_coverage": [],
        }
    }


@router.get("/{doc_id}")
async def get_test_document(
    user: CurrentUser,
    doc_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("SELECT * FROM test_documents WHERE id=$1::uuid", doc_id)
    if not row:
        raise HTTPException(404, "Tài liệu không tồn tại")
    return {"data": _row_to_dict(row)}


# ── Update ────────────────────────────────────────────────────────────────────

@router.put("/{doc_id}")
async def update_test_document(
    user: CurrentUser,
    doc_id: str,
    body: TestDocUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("SELECT * FROM test_documents WHERE id=$1::uuid", doc_id)
    if not row:
        raise HTTPException(404, "Tài liệu không tồn tại")

    sets:   list[str] = ["updated_at = NOW()"]
    params: list      = []
    i = 1

    if body.title is not None:
        sets.append(f"title = ${i}"); params.append(body.title); i += 1
    if body.content is not None:
        sets.append(f"content = ${i}"); params.append(body.content); i += 1
    if body.milestone_id is not None:
        sets.append(f"milestone_id = ${i}::uuid"); params.append(body.milestone_id or None); i += 1
    if body.metadata is not None:
        sets.append(f"metadata = ${i}::jsonb"); params.append(json.dumps(body.metadata)); i += 1

    updated = await db.fetchrow(
        f"UPDATE test_documents SET {', '.join(sets)} WHERE id=${i}::uuid RETURNING *",
        *params, doc_id,
    )
    return {"data": _row_to_dict(updated)}


# ── Status transition ─────────────────────────────────────────────────────────

@router.post("/{doc_id}/status")
async def transition_test_document_status(
    user: CurrentUser,
    doc_id: str,
    body: TestDocStatusRequest,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT id, status, doc_type FROM test_documents WHERE id=$1::uuid", doc_id
    )
    if not row:
        raise HTTPException(404, "Tài liệu không tồn tại")

    current = row["status"]
    allowed = _TRANSITIONS.get(body.action, {})
    new_status = allowed.get(current)
    if not new_status:
        raise HTTPException(400, f"Không thể thực hiện '{body.action}' từ trạng thái '{current}'")

    extra_sets: list[str] = []
    extra_params: list    = []
    idx = 3

    # Merge metadata updates (approver / sign_date for UAT_SIGNOFF)
    if body.approver or body.sign_date:
        extra_sets.append(
            f"metadata = COALESCE(metadata, '{{}}'::jsonb) || ${idx}::jsonb"
        )
        patch: dict = {}
        if body.approver:  patch["approver"]  = body.approver
        if body.sign_date: patch["sign_date"] = body.sign_date
        extra_params.append(json.dumps(patch)); idx += 1

    set_clause = ", ".join(["status = $1", "updated_at = NOW()"] + extra_sets)
    updated = await db.fetchrow(
        f"UPDATE test_documents SET {set_clause} WHERE id=$2::uuid RETURNING *",
        new_status, doc_id, *extra_params,
    )
    return {"data": _row_to_dict(updated)}


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{doc_id}", status_code=204)
async def delete_test_document(
    user: CurrentUser,
    doc_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM test_documents WHERE id=$1::uuid", doc_id
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Tài liệu không tồn tại")
