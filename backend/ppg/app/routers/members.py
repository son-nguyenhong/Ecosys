"""
Members Router — project_members table
CRUD members per project
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import asyncpg

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/projects", tags=["members"])

VALID_ROLES = {"PM", "BA", "Dev", "QA", "PO", "Stakeholder", "DevOps", "Architect", "Tech Lead"}


class MemberCreate(BaseModel):
    full_name: str = Field(..., max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=100)
    alias: Optional[str] = Field(None, max_length=100)


class MemberUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=100)
    alias: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


@router.get("/{project_id}/members")
async def list_members(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    rows = await db.fetch(
        "SELECT * FROM project_members WHERE project_id=$1 ORDER BY full_name",
        project_id,
    )
    return [dict(r) for r in rows]


@router.post("/{project_id}/members", status_code=201)
async def create_member(
    user: CurrentUser,
    project_id: str,
    body: MemberCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        INSERT INTO project_members (project_id, full_name, email, role, alias)
        VALUES ($1, $2, $3, $4, $5) RETURNING *""",
        project_id, body.full_name, body.email, body.role, body.alias,
    )
    return dict(row)


@router.put("/{project_id}/members/{mid}")
async def update_member(
    user: CurrentUser,
    project_id: str,
    mid: str,
    body: MemberUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    set_parts = [f"{k}=${i+3}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE project_members SET {', '.join(set_parts)} "
        f"WHERE id=$1 AND project_id=$2 RETURNING *",
        mid, project_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Member not found")
    return dict(row)


@router.delete("/{project_id}/members/{mid}", status_code=204)
async def delete_member(
    user: CurrentUser,
    project_id: str,
    mid: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_members WHERE id=$1 AND project_id=$2",
        mid, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Member not found")
