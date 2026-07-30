"""
Annual Plans Router v2 — FR-019, FR-020, FR-021, FR-022
Replaces legacy annual_plans.py scaffold.
Tables: ppg_annual_plans, ppg_annual_plan_objectives,
        ppg_annual_plan_dod_items, ppg_plan_project_links

State machine: draft → active → closed
BR-009: Only active plans accept new project links.
BR-010: Cannot close plan when active projects exist.
"""
from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field, field_validator

from app.auth import CurrentUser
from app.database import get_db
from app.utils import row_to_dict as _row
from app.services.audit_service import log_audit

router = APIRouter(prefix="/annual-plans", tags=["annual-plans-v2"])

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ObjectiveCreate(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    sort_order: int = 0


class DodItemCreate(BaseModel):
    criterion: str = Field(..., max_length=500)
    weight: float = Field(1.0, gt=0, le=100)


class AnnualPlanCreate(BaseModel):
    name: str = Field(..., max_length=300)
    year: int = Field(..., ge=2020, le=2050)
    description: Optional[str] = None
    domain: Optional[str] = Field(None, max_length=200)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    related_systems: list[str] = Field(default_factory=list)
    objectives: list[ObjectiveCreate] = Field(..., min_length=1)
    dod_items: list[DodItemCreate] = Field(default_factory=list)


class AnnualPlanUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=300)
    year: Optional[int] = Field(None, ge=2020, le=2050)
    description: Optional[str] = None
    domain: Optional[str] = Field(None, max_length=200)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    related_systems: Optional[list[str]] = None


class PlanStatusAction(BaseModel):
    action: str = Field(..., description="activate | close")


class DodItemUpdate(BaseModel):
    is_achieved: bool
    notes: Optional[str] = None


class ProjectLinkCreate(BaseModel):
    project_id: str


# ---------------------------------------------------------------------------
# State machine
# ---------------------------------------------------------------------------

PLAN_TRANSITIONS: dict[str, dict[str, str]] = {
    "draft": {"activate": "active"},
    "active": {"close": "closed"},
}


def _next_status(current: str, action: str) -> str:
    allowed = PLAN_TRANSITIONS.get(current, {})
    if action not in allowed:
        raise HTTPException(
            409,
            detail={
                "code": "STATE_MACHINE_VIOLATION",
                "message": f"Action '{action}' not allowed in status '{current}'. "
                           f"Allowed: {list(allowed.keys())}",
            },
        )
    return allowed[action]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_plan_or_404(db: asyncpg.Connection, plan_id: str) -> asyncpg.Record:
    row = await db.fetchrow("SELECT * FROM ppg_annual_plans WHERE id = $1", plan_id)
    if not row:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Annual plan not found"})
    return row


def _calc_dod_pct(dod_items: list[asyncpg.Record]) -> float:
    if not dod_items:
        return 0.0
    total_weight = sum(float(d["weight"]) for d in dod_items)
    if total_weight == 0:
        return 0.0
    achieved_weight = sum(float(d["weight"]) for d in dod_items if d["is_achieved"])
    return round(achieved_weight / total_weight * 100, 1)


# ---------------------------------------------------------------------------
# CRUD — Annual Plans
# ---------------------------------------------------------------------------

@router.get("")
async def list_annual_plans(
    user: CurrentUser,
    year: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    conditions: list[str] = []
    params: list = []
    idx = 1

    if year:
        conditions.append(f"ap.year = ${idx}")
        params.append(year)
        idx += 1
    if status:
        conditions.append(f"ap.status = ${idx}")
        params.append(status)
        idx += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    total_row = await db.fetchrow(
        f"SELECT COUNT(*) as cnt FROM ppg_annual_plans ap {where}", *params
    )
    total = total_row["cnt"] if total_row else 0

    offset = (page - 1) * size
    rows = await db.fetch(
        f"""
        SELECT ap.*,
            (SELECT COUNT(*) FROM ppg_annual_plan_objectives WHERE plan_id = ap.id) AS objectives_count,
            (SELECT COUNT(*) FROM ppg_plan_project_links WHERE plan_id = ap.id AND unlinked_at IS NULL) AS projects_count
        FROM ppg_annual_plans ap {where}
        ORDER BY ap.year DESC, ap.created_at DESC
        LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, offset,
    )

    result_data = []
    for r in rows:
        d = _row(r)
        # Compute DoD pct
        dod_items = await db.fetch(
            "SELECT weight, is_achieved FROM ppg_annual_plan_dod_items WHERE plan_id = $1", d["id"]
        )
        d["dod_completion_pct"] = _calc_dod_pct(dod_items)
        result_data.append(d)

    return {"data": result_data, "meta": {"total": total, "page": page, "size": size}}


@router.post("", status_code=201)
async def create_annual_plan(
    user: CurrentUser,
    body: AnnualPlanCreate,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    plan_id = str(uuid4())

    async with db.transaction():
        row = await db.fetchrow(
            """
            INSERT INTO ppg_annual_plans
                (id, name, year, description, domain, start_date, end_date, related_systems, status, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9)
            RETURNING *
            """,
            plan_id, body.name, body.year, body.description,
            body.domain,
            body.start_date, body.end_date,
            body.related_systems,
            user.sub,
        )

        for obj in body.objectives:
            await db.execute(
                """
                INSERT INTO ppg_annual_plan_objectives
                    (id, plan_id, title, description, sort_order, created_by)
                VALUES ($1,$2,$3,$4,$5,$6)
                """,
                str(uuid4()), plan_id, obj.title, obj.description, obj.sort_order, user.sub,
            )

        for item in body.dod_items:
            await db.execute(
                """
                INSERT INTO ppg_annual_plan_dod_items
                    (id, plan_id, criterion, weight)
                VALUES ($1,$2,$3,$4)
                """,
                str(uuid4()), plan_id, item.criterion, item.weight,
            )

    await log_audit(
        db=db,
        entity_type="ppg_annual_plans",
        entity_id=plan_id,
        action="CREATE",
        changed_by=user.sub,
        new_values=body.model_dump(),
    )

    return {"data": _row(row)}


@router.get("/{plan_id}")
async def get_annual_plan(
    user: CurrentUser,
    plan_id: str,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    plan = await _get_plan_or_404(db, plan_id)

    objectives = await db.fetch(
        "SELECT * FROM ppg_annual_plan_objectives WHERE plan_id = $1 ORDER BY sort_order, created_at",
        plan_id,
    )
    dod_items = await db.fetch(
        "SELECT * FROM ppg_annual_plan_dod_items WHERE plan_id = $1 ORDER BY created_at",
        plan_id,
    )
    projects = await db.fetch(
        """
        SELECT ppl.*, p.name as project_name, p.status as project_status
        FROM ppg_plan_project_links ppl
        JOIN projects p ON p.id = ppl.project_id
        WHERE ppl.plan_id = $1 AND ppl.unlinked_at IS NULL
        ORDER BY ppl.linked_at DESC
        """,
        plan_id,
    )

    d = _row(plan)
    d["objectives"] = [_row(o) for o in objectives]
    d["dod_items"] = [_row(i) for i in dod_items]
    d["projects"] = [
        {
            "project_id": str(r["project_id"]),
            "name": r["project_name"],
            "status": r["project_status"],
            "linked_at": r["linked_at"],
        }
        for r in projects
    ]
    d["dod_completion_pct"] = _calc_dod_pct(list(dod_items))
    d["objectives_count"] = len(d["objectives"])
    d["projects_count"] = len(d["projects"])

    return {"data": d}


@router.put("/{plan_id}")
async def update_annual_plan(
    user: CurrentUser,
    plan_id: str,
    body: AnnualPlanUpdate,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    plan = await _get_plan_or_404(db, plan_id)
    old_values = _row(plan)

    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.year is not None:
        updates["year"] = body.year
    if body.description is not None:
        updates["description"] = body.description
    if body.domain is not None:
        updates["domain"] = body.domain
    if body.start_date is not None:
        updates["start_date"] = body.start_date
    if body.end_date is not None:
        updates["end_date"] = body.end_date
    if body.related_systems is not None:
        updates["related_systems"] = body.related_systems
    if not updates:
        raise HTTPException(400, detail={"code": "VALIDATION_ERROR", "message": "No fields to update"})

    set_parts = [f"{k} = ${i + 2}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE ppg_annual_plans SET {', '.join(set_parts)}, updated_at = NOW(), updated_by = $1 "
        f"WHERE id = ${len(updates) + 2} RETURNING *",
        user.sub, *updates.values(), plan_id,
    )
    await log_audit(
        db=db,
        entity_type="ppg_annual_plans",
        entity_id=plan_id,
        action="UPDATE",
        changed_by=user.sub,
        old_values=old_values,
        new_values=body.model_dump(exclude_none=True),
    )
    return {"data": _row(row)}


@router.delete("/{plan_id}", status_code=204, response_class=Response)
async def delete_annual_plan(
    user: CurrentUser,
    plan_id: str,
    db: asyncpg.Connection = Depends(get_db),
) -> Response:
    """Soft delete — only draft plans can be deleted."""
    plan = await _get_plan_or_404(db, plan_id)
    if plan["status"] != "draft":
        raise HTTPException(
            409,
            detail={
                "code": "CONFLICT",
                "message": "Only draft plans can be deleted",
            },
        )
    await db.execute("DELETE FROM ppg_annual_plans WHERE id = $1", plan_id)
    await log_audit(
        db=db,
        entity_type="ppg_annual_plans",
        entity_id=plan_id,
        action="DELETE",
        changed_by=user.sub,
    )
    return Response(status_code=204)


@router.post("/{plan_id}/status")
async def change_plan_status(
    user: CurrentUser,
    plan_id: str,
    body: PlanStatusAction,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """Transition plan status: draft → active → closed."""
    plan = await _get_plan_or_404(db, plan_id)
    new_status = _next_status(plan["status"], body.action)

    # BR-010: cannot close when active projects exist
    if body.action == "close":
        active_count = await db.fetchval(
            """
            SELECT COUNT(*) FROM ppg_plan_project_links ppl
            JOIN projects p ON p.id = ppl.project_id
            WHERE ppl.plan_id = $1 AND ppl.unlinked_at IS NULL AND p.status = 'active'
            """,
            plan_id,
        )
        if active_count and active_count > 0:
            raise HTTPException(
                409,
                detail={
                    "code": "ACTIVE_PROJECTS_EXIST",
                    "message": "Cannot close plan: there are active projects linked to this plan",
                },
            )

    old_status = plan["status"]
    row = await db.fetchrow(
        "UPDATE ppg_annual_plans SET status = $2, updated_at = NOW(), updated_by = $3 "
        "WHERE id = $1 RETURNING *",
        plan_id, new_status, user.sub,
    )
    await log_audit(
        db=db,
        entity_type="ppg_annual_plans",
        entity_id=plan_id,
        action="STATUS_CHANGE",
        changed_by=user.sub,
        old_values={"status": old_status},
        new_values={"status": new_status},
    )
    return {"data": _row(row)}


# ---------------------------------------------------------------------------
# DoD Items
# ---------------------------------------------------------------------------

@router.get("/{plan_id}/dod-items")
async def list_dod_items(
    user: CurrentUser,
    plan_id: str,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    await _get_plan_or_404(db, plan_id)
    rows = await db.fetch(
        "SELECT * FROM ppg_annual_plan_dod_items WHERE plan_id = $1 ORDER BY created_at",
        plan_id,
    )
    items = [_row(r) for r in rows]
    return {
        "data": items,
        "dod_completion_pct": _calc_dod_pct(list(rows)),
    }


@router.post("/{plan_id}/dod-items", status_code=201)
async def add_dod_item(
    user: CurrentUser,
    plan_id: str,
    body: DodItemCreate,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    await _get_plan_or_404(db, plan_id)
    item_id = str(uuid4())
    row = await db.fetchrow(
        """
        INSERT INTO ppg_annual_plan_dod_items (id, plan_id, criterion, weight)
        VALUES ($1,$2,$3,$4) RETURNING *
        """,
        item_id, plan_id, body.criterion, body.weight,
    )
    return {"data": _row(row)}


@router.delete("/{plan_id}/dod-items/{item_id}", status_code=204, response_class=Response)
async def delete_dod_item(
    user: CurrentUser,
    plan_id: str,
    item_id: str,
    db: asyncpg.Connection = Depends(get_db),
) -> Response:
    await _get_plan_or_404(db, plan_id)
    deleted = await db.execute(
        "DELETE FROM ppg_annual_plan_dod_items WHERE id = $1 AND plan_id = $2",
        item_id, plan_id,
    )
    if deleted == "DELETE 0":
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "DoD item not found"})
    return Response(status_code=204)


@router.put("/{plan_id}/dod-items/{item_id}")
async def update_dod_item(
    user: CurrentUser,
    plan_id: str,
    item_id: str,
    body: DodItemUpdate,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    await _get_plan_or_404(db, plan_id)
    existing = await db.fetchrow(
        "SELECT * FROM ppg_annual_plan_dod_items WHERE id = $1 AND plan_id = $2",
        item_id, plan_id,
    )
    if not existing:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "DoD item not found"})

    old_values = _row(existing)

    if body.is_achieved and not existing["is_achieved"]:
        row = await db.fetchrow(
            """
            UPDATE ppg_annual_plan_dod_items
            SET is_achieved = $2, notes = $3, achieved_at = NOW(), achieved_by = $4,
                updated_at = NOW(), updated_by = $4
            WHERE id = $1 RETURNING *
            """,
            item_id, body.is_achieved, body.notes, user.sub,
        )
    else:
        row = await db.fetchrow(
            """
            UPDATE ppg_annual_plan_dod_items
            SET is_achieved = $2, notes = $3, updated_at = NOW(), updated_by = $4
            WHERE id = $1 RETURNING *
            """,
            item_id, body.is_achieved, body.notes, user.sub,
        )

    await log_audit(
        db=db,
        entity_type="ppg_annual_plan_dod_items",
        entity_id=item_id,
        action="UPDATE",
        changed_by=user.sub,
        old_values=old_values,
        new_values=body.model_dump(),
    )
    return {"data": _row(row)}


# ---------------------------------------------------------------------------
# Project Links
# ---------------------------------------------------------------------------

@router.get("/{plan_id}/projects")
async def list_plan_projects(
    user: CurrentUser,
    plan_id: str,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    await _get_plan_or_404(db, plan_id)
    rows = await db.fetch(
        """
        SELECT ppl.*, p.name as project_name, p.status as project_status, p.code as project_code
        FROM ppg_plan_project_links ppl
        JOIN projects p ON p.id = ppl.project_id
        WHERE ppl.plan_id = $1 AND ppl.unlinked_at IS NULL
        ORDER BY ppl.linked_at DESC
        """,
        plan_id,
    )
    return {"data": [_row(r) for r in rows]}


@router.post("/{plan_id}/projects", status_code=201)
async def link_project(
    user: CurrentUser,
    plan_id: str,
    body: ProjectLinkCreate,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """Link a project to an annual plan — BR-009: plan must be active."""
    plan = await _get_plan_or_404(db, plan_id)

    if plan["status"] != "active":
        raise HTTPException(
            409,
            detail={
                "code": "PLAN_NOT_ACTIVE",
                "message": "Project can only be linked to an active plan (BR-009)",
            },
        )

    # Validate project exists
    project = await db.fetchrow("SELECT id, name FROM projects WHERE id = $1", body.project_id)
    if not project:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Project not found"})

    # Check if already linked (and not unlinked)
    existing_link = await db.fetchrow(
        "SELECT id FROM ppg_plan_project_links WHERE plan_id = $1 AND project_id = $2 AND unlinked_at IS NULL",
        plan_id, body.project_id,
    )
    if existing_link:
        raise HTTPException(
            409,
            detail={"code": "CONFLICT", "message": "Project is already linked to this plan"},
        )

    link_id = str(uuid4())
    row = await db.fetchrow(
        """
        INSERT INTO ppg_plan_project_links (id, plan_id, project_id, linked_by)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (plan_id, project_id) DO UPDATE
            SET unlinked_at = NULL, unlinked_by = NULL, linked_at = NOW(), linked_by = $4
        RETURNING *
        """,
        link_id, plan_id, body.project_id, user.sub,
    )
    await log_audit(
        db=db,
        entity_type="ppg_plan_project_links",
        entity_id=str(row["id"]),
        action="LINK",
        changed_by=user.sub,
        new_values={"plan_id": plan_id, "project_id": body.project_id},
    )
    return {"data": _row(row)}


@router.delete("/{plan_id}/projects/{project_id}", status_code=204, response_class=Response)
async def unlink_project(
    user: CurrentUser,
    plan_id: str,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
) -> Response:
    """Soft unlink — sets unlinked_at. Does not delete the project."""
    await _get_plan_or_404(db, plan_id)
    link = await db.fetchrow(
        "SELECT id FROM ppg_plan_project_links WHERE plan_id = $1 AND project_id = $2 AND unlinked_at IS NULL",
        plan_id, project_id,
    )
    if not link:
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": "Link not found"})

    await db.execute(
        "UPDATE ppg_plan_project_links SET unlinked_at = NOW(), unlinked_by = $3 "
        "WHERE plan_id = $1 AND project_id = $2",
        plan_id, project_id, user.sub,
    )
    await log_audit(
        db=db,
        entity_type="ppg_plan_project_links",
        entity_id=str(link["id"]),
        action="UNLINK",
        changed_by=user.sub,
        new_values={"plan_id": plan_id, "project_id": project_id},
    )
    return Response(status_code=204)
