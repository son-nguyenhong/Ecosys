"""
Requirements Router — requirements table
CRUD for raw requirements before documents
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from uuid import uuid4
import asyncpg

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/requirements", tags=["requirements"])


class RequirementCreate(BaseModel):
    project_id: str
    title: str = Field(..., max_length=255)
    raw_text: Optional[str] = None
    created_by: Optional[str] = None


class RequirementUpdate(BaseModel):
    title: Optional[str] = None
    raw_text: Optional[str] = None
    status: Optional[str] = None


@router.get("")
async def list_requirements(
    project_id: Optional[str] = Query(None),
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    if project_id:
        rows = await db.fetch(
            "SELECT * FROM requirements WHERE project_id=$1 ORDER BY created_at DESC",
            project_id
        )
    else:
        rows = await db.fetch("SELECT * FROM requirements ORDER BY created_at DESC")
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_requirement(
    body: RequirementCreate,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        INSERT INTO requirements (id, project_id, title, raw_text, status, created_by)
        VALUES ($1,$2,$3,$4,'draft',$5) RETURNING *
    """, str(uuid4()), body.project_id, body.title, body.raw_text,
        body.created_by or (user.sub if user else "system"))
    return dict(row)


@router.get("/{req_id}")
async def get_requirement(
    req_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("SELECT * FROM requirements WHERE id=$1", req_id)
    if not row:
        raise HTTPException(404, "Requirement not found")
    return dict(row)


@router.put("/{req_id}")
async def update_requirement(
    req_id: str,
    body: RequirementUpdate,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    set_parts = [f"{k}=${i+2}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE requirements SET {', '.join(set_parts)}, updated_at=NOW() "
        f"WHERE id=$1 RETURNING *",
        req_id, *updates.values()
    )
    if not row:
        raise HTTPException(404, "Requirement not found")
    return dict(row)


@router.delete("/{req_id}", status_code=204)
async def delete_requirement(
    req_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    await db.execute("DELETE FROM requirements WHERE id=$1", req_id)
