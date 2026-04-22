"""
Annual Plan Extended Router — FR-019 extensions
Modules: Initiatives | Biz Objectives | Budget | Resource | KPI | Dependency | Risk
All endpoints scoped under /annual-plans/{plan_id}/...
"""
from __future__ import annotations

from typing import Optional
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/annual-plans", tags=["annual-plans-extended"])

# ── helpers ────────────────────────────────────────────────────────────────

async def _require_plan(db: asyncpg.Connection, plan_id: str):
    row = await db.fetchrow("SELECT id FROM ppg_annual_plans WHERE id=$1", plan_id)
    if not row:
        raise HTTPException(404, "Annual plan not found")


def _user(user: CurrentUser) -> str:
    return user.sub if user else "system"


# ══════════════════════════════════════════════════════════════════
# 1. PLANNING HIERARCHY — Initiatives
# ══════════════════════════════════════════════════════════════════

class InitiativeCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: Optional[str] = None
    quarter: Optional[str] = Field(None, pattern=r"^Q[1-4]$")
    priority: int = Field(3, ge=1, le=5)
    status: str = Field("planned")
    sort_order: int = 0


class InitiativeUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = None
    quarter: Optional[str] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[str] = None
    sort_order: Optional[int] = None


@router.get("/{plan_id}/initiatives")
async def list_initiatives(user: CurrentUser, plan_id: str, db: asyncpg.Connection = Depends(get_db)):
    await _require_plan(db, plan_id)
    rows = await db.fetch(
        "SELECT * FROM ppg_plan_initiatives WHERE plan_id=$1 ORDER BY sort_order, quarter NULLS LAST, created_at",
        plan_id,
    )
    return [dict(r) for r in rows]


@router.post("/{plan_id}/initiatives", status_code=201)
async def create_initiative(
    plan_id: str, body: InitiativeCreate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    await _require_plan(db, plan_id)
    row = await db.fetchrow("""
        INSERT INTO ppg_plan_initiatives
            (id, plan_id, title, description, quarter, priority, status, sort_order, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *""",
        str(uuid4()), plan_id, body.title, body.description,
        body.quarter, body.priority, body.status, body.sort_order, _user(user),
    )
    return dict(row)


@router.put("/{plan_id}/initiatives/{iid}")
async def update_initiative(
    plan_id: str, iid: str, body: InitiativeUpdate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    parts = [f"{k}=${i+3}" for i, k in enumerate(updates)]
    row = await db.fetchrow(
        f"UPDATE ppg_plan_initiatives SET {','.join(parts)},updated_at=NOW() WHERE id=$1 AND plan_id=$2 RETURNING *",
        iid, plan_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Initiative not found")
    return dict(row)


@router.delete("/{plan_id}/initiatives/{iid}", status_code=204)
async def delete_initiative(
    plan_id: str, iid: str,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    r = await db.execute("DELETE FROM ppg_plan_initiatives WHERE id=$1 AND plan_id=$2", iid, plan_id)
    if r == "DELETE 0":
        raise HTTPException(404, "Initiative not found")


# ══════════════════════════════════════════════════════════════════
# 2. BUSINESS OBJECTIVE MAPPING
# ══════════════════════════════════════════════════════════════════

class BizObjCreate(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    biz_owner: Optional[str] = None
    category: Optional[str] = None
    sort_order: int = 0


class BizObjUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    biz_owner: Optional[str] = None
    category: Optional[str] = None
    sort_order: Optional[int] = None


class BizObjMapCreate(BaseModel):
    initiative_id: str
    notes: Optional[str] = None


@router.get("/{plan_id}/biz-objectives")
async def list_biz_objectives(user: CurrentUser, plan_id: str, db: asyncpg.Connection = Depends(get_db)):
    await _require_plan(db, plan_id)
    rows = await db.fetch(
        "SELECT * FROM ppg_biz_objectives WHERE plan_id=$1 ORDER BY sort_order, created_at",
        plan_id,
    )
    result = []
    for r in rows:
        obj = dict(r)
        # include mapped initiative ids
        maps = await db.fetch(
            "SELECT initiative_id FROM ppg_biz_obj_initiative_map WHERE biz_obj_id=$1", r["id"]
        )
        obj["initiative_ids"] = [m["initiative_id"] for m in maps]
        result.append(obj)
    return result


@router.post("/{plan_id}/biz-objectives", status_code=201)
async def create_biz_objective(
    plan_id: str, body: BizObjCreate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    await _require_plan(db, plan_id)
    row = await db.fetchrow("""
        INSERT INTO ppg_biz_objectives
            (id, plan_id, title, description, biz_owner, category, sort_order, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *""",
        str(uuid4()), plan_id, body.title, body.description,
        body.biz_owner, body.category, body.sort_order, _user(user),
    )
    return {**dict(row), "initiative_ids": []}


@router.put("/{plan_id}/biz-objectives/{oid}")
async def update_biz_objective(
    plan_id: str, oid: str, body: BizObjUpdate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    parts = [f"{k}=${i+3}" for i, k in enumerate(updates)]
    row = await db.fetchrow(
        f"UPDATE ppg_biz_objectives SET {','.join(parts)},updated_at=NOW() WHERE id=$1 AND plan_id=$2 RETURNING *",
        oid, plan_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Business objective not found")
    return dict(row)


@router.delete("/{plan_id}/biz-objectives/{oid}", status_code=204)
async def delete_biz_objective(
    plan_id: str, oid: str,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    r = await db.execute("DELETE FROM ppg_biz_objectives WHERE id=$1 AND plan_id=$2", oid, plan_id)
    if r == "DELETE 0":
        raise HTTPException(404, "Business objective not found")


@router.post("/{plan_id}/biz-objectives/{oid}/map", status_code=201)
async def map_initiative(
    plan_id: str, oid: str, body: BizObjMapCreate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    """Link a business objective to an IT initiative."""
    await db.execute("""
        INSERT INTO ppg_biz_obj_initiative_map (biz_obj_id, initiative_id, notes)
        VALUES ($1,$2,$3) ON CONFLICT DO NOTHING""",
        oid, body.initiative_id, body.notes,
    )
    return {"biz_obj_id": oid, "initiative_id": body.initiative_id}


@router.delete("/{plan_id}/biz-objectives/{oid}/map/{initiative_id}", status_code=204)
async def unmap_initiative(
    plan_id: str, oid: str, initiative_id: str,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    await db.execute(
        "DELETE FROM ppg_biz_obj_initiative_map WHERE biz_obj_id=$1 AND initiative_id=$2",
        oid, initiative_id,
    )


# ══════════════════════════════════════════════════════════════════
# 3. BUDGET MANAGEMENT
# ══════════════════════════════════════════════════════════════════

class BudgetCreate(BaseModel):
    label: str = Field(..., max_length=300)
    budget_type: str = Field(..., pattern=r"^(capex|opex)$")
    quarter: Optional[str] = None
    initiative_id: Optional[str] = None
    project_id: Optional[str] = None
    amount_planned: float = 0
    amount_actual: float = 0
    currency: str = "VND"
    notes: Optional[str] = None


class BudgetUpdate(BaseModel):
    label: Optional[str] = Field(None, max_length=300)
    budget_type: Optional[str] = None
    quarter: Optional[str] = None
    initiative_id: Optional[str] = None
    amount_planned: Optional[float] = None
    amount_actual: Optional[float] = None
    notes: Optional[str] = None


@router.get("/{plan_id}/budget")
async def list_budget(user: CurrentUser, plan_id: str, db: asyncpg.Connection = Depends(get_db)):
    await _require_plan(db, plan_id)
    rows = await db.fetch(
        "SELECT * FROM ppg_plan_budget WHERE plan_id=$1 ORDER BY budget_type, quarter NULLS LAST, label",
        plan_id,
    )
    return [dict(r) for r in rows]


@router.post("/{plan_id}/budget", status_code=201)
async def create_budget(
    plan_id: str, body: BudgetCreate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    await _require_plan(db, plan_id)
    row = await db.fetchrow("""
        INSERT INTO ppg_plan_budget
            (id, plan_id, initiative_id, project_id, label, budget_type, quarter,
             amount_planned, amount_actual, currency, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *""",
        str(uuid4()), plan_id, body.initiative_id, body.project_id,
        body.label, body.budget_type, body.quarter,
        body.amount_planned, body.amount_actual, body.currency,
        body.notes, _user(user),
    )
    return dict(row)


@router.put("/{plan_id}/budget/{bid}")
async def update_budget(
    plan_id: str, bid: str, body: BudgetUpdate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    parts = [f"{k}=${i+3}" for i, k in enumerate(updates)]
    row = await db.fetchrow(
        f"UPDATE ppg_plan_budget SET {','.join(parts)},updated_at=NOW() WHERE id=$1 AND plan_id=$2 RETURNING *",
        bid, plan_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Budget entry not found")
    return dict(row)


@router.delete("/{plan_id}/budget/{bid}", status_code=204)
async def delete_budget(
    plan_id: str, bid: str,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    r = await db.execute("DELETE FROM ppg_plan_budget WHERE id=$1 AND plan_id=$2", bid, plan_id)
    if r == "DELETE 0":
        raise HTTPException(404, "Budget entry not found")


# ══════════════════════════════════════════════════════════════════
# 4. RESOURCE ALLOCATION
# ══════════════════════════════════════════════════════════════════

class ResourceCreate(BaseModel):
    member_name: str = Field(..., max_length=255)
    role: Optional[str] = None
    team: Optional[str] = None
    allocation_pct: float = Field(100, ge=0, le=100)
    quarter: Optional[str] = None
    initiative_id: Optional[str] = None
    project_id: Optional[str] = None
    notes: Optional[str] = None


class ResourceUpdate(BaseModel):
    member_name: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = None
    team: Optional[str] = None
    allocation_pct: Optional[float] = Field(None, ge=0, le=100)
    quarter: Optional[str] = None
    notes: Optional[str] = None


@router.get("/{plan_id}/resources")
async def list_resources(user: CurrentUser, plan_id: str, db: asyncpg.Connection = Depends(get_db)):
    await _require_plan(db, plan_id)
    rows = await db.fetch(
        "SELECT * FROM ppg_plan_resources WHERE plan_id=$1 ORDER BY team NULLS LAST, member_name",
        plan_id,
    )
    return [dict(r) for r in rows]


@router.post("/{plan_id}/resources", status_code=201)
async def create_resource(
    plan_id: str, body: ResourceCreate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    await _require_plan(db, plan_id)
    row = await db.fetchrow("""
        INSERT INTO ppg_plan_resources
            (id, plan_id, initiative_id, project_id, member_name, role, team,
             allocation_pct, quarter, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *""",
        str(uuid4()), plan_id, body.initiative_id, body.project_id,
        body.member_name, body.role, body.team,
        body.allocation_pct, body.quarter, body.notes, _user(user),
    )
    return dict(row)


@router.put("/{plan_id}/resources/{rid}")
async def update_resource(
    plan_id: str, rid: str, body: ResourceUpdate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    parts = [f"{k}=${i+3}" for i, k in enumerate(updates)]
    row = await db.fetchrow(
        f"UPDATE ppg_plan_resources SET {','.join(parts)},updated_at=NOW() WHERE id=$1 AND plan_id=$2 RETURNING *",
        rid, plan_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Resource not found")
    return dict(row)


@router.delete("/{plan_id}/resources/{rid}", status_code=204)
async def delete_resource(
    plan_id: str, rid: str,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    r = await db.execute("DELETE FROM ppg_plan_resources WHERE id=$1 AND plan_id=$2", rid, plan_id)
    if r == "DELETE 0":
        raise HTTPException(404, "Resource not found")


# ══════════════════════════════════════════════════════════════════
# 5. KPI / OKR TRACKING
# ══════════════════════════════════════════════════════════════════

class KpiCreate(BaseModel):
    metric_name: str = Field(..., max_length=300)
    unit: Optional[str] = None
    target_value: Optional[float] = None
    actual_value: Optional[float] = None
    quarter: Optional[str] = None
    initiative_id: Optional[str] = None
    biz_obj_id: Optional[str] = None
    status: str = "on_track"
    notes: Optional[str] = None


class KpiUpdate(BaseModel):
    metric_name: Optional[str] = Field(None, max_length=300)
    unit: Optional[str] = None
    target_value: Optional[float] = None
    actual_value: Optional[float] = None
    quarter: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


@router.get("/{plan_id}/kpis")
async def list_kpis(user: CurrentUser, plan_id: str, db: asyncpg.Connection = Depends(get_db)):
    await _require_plan(db, plan_id)
    rows = await db.fetch(
        "SELECT * FROM ppg_plan_kpis WHERE plan_id=$1 ORDER BY quarter NULLS LAST, metric_name",
        plan_id,
    )
    return [dict(r) for r in rows]


@router.post("/{plan_id}/kpis", status_code=201)
async def create_kpi(
    plan_id: str, body: KpiCreate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    await _require_plan(db, plan_id)
    row = await db.fetchrow("""
        INSERT INTO ppg_plan_kpis
            (id, plan_id, initiative_id, biz_obj_id, metric_name, unit,
             target_value, actual_value, quarter, status, notes, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *""",
        str(uuid4()), plan_id, body.initiative_id, body.biz_obj_id,
        body.metric_name, body.unit, body.target_value, body.actual_value,
        body.quarter, body.status, body.notes, _user(user),
    )
    return dict(row)


@router.put("/{plan_id}/kpis/{kid}")
async def update_kpi(
    plan_id: str, kid: str, body: KpiUpdate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    parts = [f"{k}=${i+3}" for i, k in enumerate(updates)]
    row = await db.fetchrow(
        f"UPDATE ppg_plan_kpis SET {','.join(parts)},updated_at=NOW() WHERE id=$1 AND plan_id=$2 RETURNING *",
        kid, plan_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "KPI not found")
    return dict(row)


@router.delete("/{plan_id}/kpis/{kid}", status_code=204)
async def delete_kpi(
    plan_id: str, kid: str,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    r = await db.execute("DELETE FROM ppg_plan_kpis WHERE id=$1 AND plan_id=$2", kid, plan_id)
    if r == "DELETE 0":
        raise HTTPException(404, "KPI not found")


# ══════════════════════════════════════════════════════════════════
# 6. PROJECT DEPENDENCIES
# ══════════════════════════════════════════════════════════════════

class DependencyCreate(BaseModel):
    from_label: str = Field(..., max_length=255)
    to_label: str = Field(..., max_length=255)
    from_project_id: Optional[str] = None
    to_project_id: Optional[str] = None
    dep_type: str = "finish_to_start"
    description: Optional[str] = None
    status: str = "active"


class DependencyUpdate(BaseModel):
    from_label: Optional[str] = None
    to_label: Optional[str] = None
    dep_type: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


@router.get("/{plan_id}/dependencies")
async def list_dependencies(user: CurrentUser, plan_id: str, db: asyncpg.Connection = Depends(get_db)):
    await _require_plan(db, plan_id)
    rows = await db.fetch(
        "SELECT * FROM ppg_plan_dependencies WHERE plan_id=$1 ORDER BY created_at",
        plan_id,
    )
    return [dict(r) for r in rows]


@router.post("/{plan_id}/dependencies", status_code=201)
async def create_dependency(
    plan_id: str, body: DependencyCreate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    await _require_plan(db, plan_id)
    row = await db.fetchrow("""
        INSERT INTO ppg_plan_dependencies
            (id, plan_id, from_project_id, to_project_id, from_label, to_label,
             dep_type, description, status, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *""",
        str(uuid4()), plan_id,
        body.from_project_id, body.to_project_id,
        body.from_label, body.to_label,
        body.dep_type, body.description, body.status, _user(user),
    )
    return dict(row)


@router.put("/{plan_id}/dependencies/{did}")
async def update_dependency(
    plan_id: str, did: str, body: DependencyUpdate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    parts = [f"{k}=${i+3}" for i, k in enumerate(updates)]
    row = await db.fetchrow(
        f"UPDATE ppg_plan_dependencies SET {','.join(parts)},updated_at=NOW() WHERE id=$1 AND plan_id=$2 RETURNING *",
        did, plan_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Dependency not found")
    return dict(row)


@router.delete("/{plan_id}/dependencies/{did}", status_code=204)
async def delete_dependency(
    plan_id: str, did: str,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    r = await db.execute("DELETE FROM ppg_plan_dependencies WHERE id=$1 AND plan_id=$2", did, plan_id)
    if r == "DELETE 0":
        raise HTTPException(404, "Dependency not found")


# ══════════════════════════════════════════════════════════════════
# 7. RISK REGISTER
# ══════════════════════════════════════════════════════════════════

class RiskCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: Optional[str] = None
    category: Optional[str] = None
    probability: int = Field(3, ge=1, le=5)
    impact: int = Field(3, ge=1, le=5)
    mitigation: Optional[str] = None
    contingency: Optional[str] = None
    owner: Optional[str] = None
    quarter: Optional[str] = None
    status: str = "open"


class RiskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = None
    category: Optional[str] = None
    probability: Optional[int] = Field(None, ge=1, le=5)
    impact: Optional[int] = Field(None, ge=1, le=5)
    mitigation: Optional[str] = None
    contingency: Optional[str] = None
    owner: Optional[str] = None
    quarter: Optional[str] = None
    status: Optional[str] = None


@router.get("/{plan_id}/risks")
async def list_risks(user: CurrentUser, plan_id: str, db: asyncpg.Connection = Depends(get_db)):
    await _require_plan(db, plan_id)
    rows = await db.fetch(
        "SELECT * FROM ppg_plan_risks WHERE plan_id=$1 ORDER BY risk_score DESC NULLS LAST, created_at",
        plan_id,
    )
    return [dict(r) for r in rows]


@router.post("/{plan_id}/risks", status_code=201)
async def create_risk(
    plan_id: str, body: RiskCreate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    await _require_plan(db, plan_id)
    row = await db.fetchrow("""
        INSERT INTO ppg_plan_risks
            (id, plan_id, title, description, category, probability, impact,
             mitigation, contingency, owner, quarter, status, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *""",
        str(uuid4()), plan_id, body.title, body.description, body.category,
        body.probability, body.impact,
        body.mitigation, body.contingency,
        body.owner, body.quarter, body.status, _user(user),
    )
    return dict(row)


@router.put("/{plan_id}/risks/{rid}")
async def update_risk(
    plan_id: str, rid: str, body: RiskUpdate,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    parts = [f"{k}=${i+3}" for i, k in enumerate(updates)]
    row = await db.fetchrow(
        f"UPDATE ppg_plan_risks SET {','.join(parts)},updated_at=NOW() WHERE id=$1 AND plan_id=$2 RETURNING *",
        rid, plan_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Risk not found")
    return dict(row)


@router.delete("/{plan_id}/risks/{rid}", status_code=204)
async def delete_risk(
    plan_id: str, rid: str,
    user: CurrentUser, db: asyncpg.Connection = Depends(get_db),
):
    r = await db.execute("DELETE FROM ppg_plan_risks WHERE id=$1 AND plan_id=$2", rid, plan_id)
    if r == "DELETE 0":
        raise HTTPException(404, "Risk not found")
