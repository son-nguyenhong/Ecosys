"""
Documents Router — documents + document_history tables (reference schema)
State machine: draft → review → approved → archived
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from uuid import uuid4
import asyncpg, json

from app.auth import CurrentUser
from app.database import get_db
from app.services.sync_service import push_doc_to_ppg, push_brs_to_test_platform

router = APIRouter(prefix="/documents", tags=["documents"])

TRANSITIONS = {
    "draft":    {"submit_review": "review"},
    "review":   {"approve": "approved", "reject": "draft"},
    "approved": {"archive": "archived"},
}


class DocumentCreate(BaseModel):
    req_id: Optional[str] = None
    project_id: str
    doc_type: str = Field(..., pattern=r'^(BRD|BRS|ERD|API)$')
    title: str = Field(..., max_length=300)
    content: Optional[dict] = None
    version: str = "v1.0"


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    content: Optional[dict] = None
    changed_by: Optional[str] = None
    change_note: Optional[str] = None


class DocumentAction(BaseModel):
    action: str
    actor: Optional[str] = None


@router.get("")
async def list_documents(
    project_id: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    conditions, params, idx = [], [], 1
    if project_id:
        conditions.append(f"project_id=${idx}"); params.append(project_id); idx += 1
    if doc_type:
        conditions.append(f"doc_type=${idx}"); params.append(doc_type); idx += 1
    if status:
        conditions.append(f"status=${idx}"); params.append(status); idx += 1
    q = "SELECT * FROM documents"
    if conditions:
        q += " WHERE " + " AND ".join(conditions)
    q += " ORDER BY updated_at DESC"
    rows = await db.fetch(q, *params)
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_document(
    body: DocumentCreate,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        INSERT INTO documents (id, req_id, project_id, doc_type, version, title, content, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'draft') RETURNING *
    """, str(uuid4()), body.req_id, body.project_id,
        body.doc_type, body.version, body.title,
        json.dumps(body.content) if body.content is not None else None)
    return dict(row)


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("SELECT * FROM documents WHERE id=$1", doc_id)
    if not row:
        raise HTTPException(404, "Document not found")
    return dict(row)


@router.put("/{doc_id}")
async def update_document(
    doc_id: str,
    body: DocumentUpdate,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    existing = await db.fetchrow("SELECT * FROM documents WHERE id=$1", doc_id)
    if not existing:
        raise HTTPException(404, "Document not found")
    if existing["status"] == "approved":
        raise HTTPException(400, "Cannot edit an approved document")

    # Bump version string
    cur_ver = existing["version"] or "v1.0"
    try:
        parts = cur_ver.lstrip("v").split(".")
        parts[-1] = str(int(parts[-1]) + 1)
        new_version = "v" + ".".join(parts)
    except Exception:
        new_version = cur_ver + ".1"

    # Save snapshot to history
    await db.execute("""
        INSERT INTO document_history (id, doc_id, version, changed_by, change_note, snapshot)
        VALUES ($1,$2,$3,$4,$5,$6)
    """, str(uuid4()), doc_id, existing["version"],
        body.changed_by or (user.sub if user else "system"),
        body.change_note or "",
        json.dumps(dict(existing)))

    row = await db.fetchrow("""
        UPDATE documents SET
            title=COALESCE($2, title),
            content=COALESCE($3::jsonb, content),
            version=$4,
            updated_at=NOW()
        WHERE id=$1 RETURNING *
    """, doc_id, body.title,
        json.dumps(body.content) if body.content is not None else None,
        new_version)
    return dict(row)


@router.post("/{doc_id}/action")
async def document_action(
    doc_id: str,
    body: DocumentAction,
    background: BackgroundTasks,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    doc = await db.fetchrow("SELECT * FROM documents WHERE id=$1", doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    allowed = TRANSITIONS.get(doc["status"], {})
    if body.action not in allowed:
        raise HTTPException(400, f"Action '{body.action}' not allowed in status '{doc['status']}'. Allowed: {list(allowed.keys())}")

    new_status = allowed[body.action]
    update_fields: dict = {"status": new_status}
    actor = body.actor or (user.sub if user else "system")
    if body.action == "approve":
        update_fields["approved_by"] = actor
    if body.action == "submit_review":
        update_fields["reviewed_by"] = actor

    set_clause = ", ".join(f"{k}=${i+2}" for i, k in enumerate(update_fields))
    vals = list(update_fields.values())
    await db.execute(
        f"UPDATE documents SET {set_clause}, updated_at=NOW() WHERE id=$1",
        doc_id, *vals
    )
    if new_status == "approved":
        doc_dict = dict(await db.fetchrow("SELECT * FROM documents WHERE id=$1", doc_id) or {})
        doc_dict["id"] = doc_id
        background.add_task(push_doc_to_ppg, doc_dict)
        background.add_task(push_brs_to_test_platform, doc_dict)

    return {"status": new_status, "doc_id": doc_id}


@router.get("/{doc_id}/history")
async def get_document_history(
    doc_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    rows = await db.fetch(
        "SELECT * FROM document_history WHERE doc_id=$1 ORDER BY changed_at DESC", doc_id
    )
    return [dict(r) for r in rows]
