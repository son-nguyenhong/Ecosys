"""
Test Discussions Router — stakeholder_discussions WHERE workflow_type='test'
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from uuid import uuid4
import asyncpg

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/discussions", tags=["discussions"])


class DiscussionCreate(BaseModel):
    project_id: Optional[str] = None
    doc_id: Optional[str] = None
    title: Optional[str] = "Discussion"
    content: str = Field(..., min_length=1)
    raised_by: Optional[str] = None


class DiscussionUpdate(BaseModel):
    status: Optional[str] = None
    resolution: Optional[str] = None
    resolved_by: Optional[str] = None


@router.get("")
async def list_discussions(
    project_id: Optional[str] = Query(None),
    doc_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    conditions = ["workflow_type='test'"]
    params, idx = [], 1
    if project_id:
        conditions.append(f"project_id=${idx}"); params.append(project_id); idx += 1
    if doc_id:
        conditions.append(f"doc_id=${idx}"); params.append(doc_id); idx += 1
    if status:
        conditions.append(f"status=${idx}"); params.append(status); idx += 1
    q = "SELECT * FROM stakeholder_discussions WHERE " + " AND ".join(conditions)
    q += " ORDER BY created_at DESC"
    rows = await db.fetch(q, *params)
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_discussion(
    body: DiscussionCreate,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        INSERT INTO stakeholder_discussions
            (id, project_id, doc_id, workflow_type, title, content, raised_by, status)
        VALUES ($1,$2,$3,'test',$4,$5,$6,'open') RETURNING *
    """, str(uuid4()), body.project_id, body.doc_id,
        body.title or "Discussion", body.content,
        body.raised_by or (user.sub if user else None))
    return dict(row)


@router.put("/{disc_id}")
async def update_discussion(
    disc_id: str,
    body: DiscussionUpdate,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        UPDATE stakeholder_discussions SET
            status=COALESCE($2, status),
            resolution=COALESCE($3, resolution),
            resolved_by=COALESCE($4, resolved_by),
            updated_at=NOW()
        WHERE id=$1 AND workflow_type='test' RETURNING *
    """, disc_id, body.status, body.resolution, body.resolved_by)
    if not row:
        raise HTTPException(404, "Discussion not found")
    return dict(row)


@router.delete("/{disc_id}", status_code=204)
async def delete_discussion(
    disc_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    await db.execute(
        "DELETE FROM stakeholder_discussions WHERE id=$1 AND workflow_type='test'", disc_id
    )
