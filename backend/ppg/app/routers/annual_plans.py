"""
Annual Plans Router — annual_plans + plan_items tables
CRUD annual plan entries with Q1-Q4 items
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from uuid import uuid4
import asyncpg

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/annual-plans", tags=["annual-plans"])


class AnnualPlanCreate(BaseModel):
    year: int
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    status: str = "active"


class AnnualPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class PlanItemCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    priority: int = 0
    target_q: Optional[str] = None
    done_criteria: Optional[str] = None
    status: str = "planned"


class PlanItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    target_q: Optional[str] = None
    done_criteria: Optional[str] = None
    status: Optional[str] = None


# ── Annual Plans ─────────────────────────────────────────────────

@router.get("")
async def list_plans(
    user: CurrentUser,
    year: Optional[int] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
):
    if year:
        rows = await db.fetch(
            "SELECT * FROM annual_plans WHERE year=$1 ORDER BY year DESC, created_at DESC", year
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM annual_plans ORDER BY year DESC, created_at DESC"
        )
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_plan(
    user: CurrentUser,
    body: AnnualPlanCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        INSERT INTO annual_plans (id, year, code, name, description, status, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    """, str(uuid4()), body.year, body.code, body.name,
        body.description, body.status,
        user.sub if user else "system")
    return dict(row)


@router.get("/{plan_id}")
async def get_plan(
    user: CurrentUser,
    plan_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("SELECT * FROM annual_plans WHERE id=$1", plan_id)
    if not row:
        raise HTTPException(404, "Plan not found")
    return dict(row)


@router.put("/{plan_id}")
async def update_plan(
    user: CurrentUser,
    plan_id: str,
    body: AnnualPlanUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        UPDATE annual_plans SET
            name=COALESCE($2, name),
            description=COALESCE($3, description),
            status=COALESCE($4, status),
            updated_at=NOW()
        WHERE id=$1 RETURNING *
    """, plan_id, body.name, body.description, body.status)
    if not row:
        raise HTTPException(404, "Plan not found")
    return dict(row)


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(
    user: CurrentUser,
    plan_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute("DELETE FROM annual_plans WHERE id=$1", plan_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Plan not found")


# ── Plan Items ───────────────────────────────────────────────────

@router.get("/{plan_id}/items")
async def list_items(
    user: CurrentUser,
    plan_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    rows = await db.fetch(
        "SELECT * FROM plan_items WHERE plan_id=$1 ORDER BY priority DESC, created_at",
        plan_id
    )
    return [dict(r) for r in rows]


@router.post("/{plan_id}/items", status_code=201)
async def create_item(
    user: CurrentUser,
    plan_id: str,
    body: PlanItemCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        INSERT INTO plan_items (id, plan_id, title, description, priority, target_q, done_criteria, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    """, str(uuid4()), plan_id, body.title, body.description,
        body.priority, body.target_q, body.done_criteria, body.status)
    return dict(row)


@router.put("/{plan_id}/items/{item_id}")
async def update_item(
    user: CurrentUser,
    plan_id: str,
    item_id: str,
    body: PlanItemUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    set_parts = [f"{k}=${i+3}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE plan_items SET {', '.join(set_parts)}, updated_at=NOW() "
        f"WHERE id=$1 AND plan_id=$2 RETURNING *",
        item_id, plan_id, *updates.values()
    )
    if not row:
        raise HTTPException(404, "Item not found")
    return dict(row)


@router.delete("/{plan_id}/items/{item_id}", status_code=204)
async def delete_item(
    user: CurrentUser,
    plan_id: str,
    item_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await db.execute(
        "DELETE FROM plan_items WHERE id=$1 AND plan_id=$2", item_id, plan_id
    )
