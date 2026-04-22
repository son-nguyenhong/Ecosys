"""
Project Management Router — General Management Info
Covers: Stage Gate Control, Health Scoring (RAG), Stakeholder Mapping, Priority Model
Prefix: /projects/{project_id}/management
"""
from typing import Optional, List
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import asyncpg

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/projects", tags=["project-management"])


# ── Pydantic Models ───────────────────────────────────────────────────────────

class GateCriterion(BaseModel):
    criterion: str
    is_met: bool = False
    notes: Optional[str] = None


class StageGateCreate(BaseModel):
    stage_name: str = Field(..., max_length=100)
    stage_order: int = 0
    status: str = "pending"
    gate_criteria: List[GateCriterion] = []
    sign_off_by: Optional[str] = None
    gate_date: Optional[str] = None
    notes: Optional[str] = None


class StageGateUpdate(BaseModel):
    stage_name: Optional[str] = None
    stage_order: Optional[int] = None
    status: Optional[str] = None
    gate_criteria: Optional[List[GateCriterion]] = None
    sign_off_by: Optional[str] = None
    gate_date: Optional[str] = None
    notes: Optional[str] = None


class HealthScoreCreate(BaseModel):
    assessed_date: Optional[str] = None
    overall_rag: str = Field("green", pattern=r'^(red|amber|green)$')
    schedule_rag: Optional[str] = Field(None, pattern=r'^(red|amber|green)$')
    budget_rag: Optional[str] = Field(None, pattern=r'^(red|amber|green)$')
    scope_rag: Optional[str] = Field(None, pattern=r'^(red|amber|green)$')
    team_rag: Optional[str] = Field(None, pattern=r'^(red|amber|green)$')
    risk_rag: Optional[str] = Field(None, pattern=r'^(red|amber|green)$')
    health_notes: dict = {}
    assessed_by: Optional[str] = None


class StakeholderCreate(BaseModel):
    name: str = Field(..., max_length=255)
    role: Optional[str] = None
    organization: Optional[str] = None
    interest_level: str = "medium"
    influence_level: str = "medium"
    engagement_strategy: Optional[str] = None
    contact_info: dict = {}
    notes: Optional[str] = None


class StakeholderUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    interest_level: Optional[str] = None
    influence_level: Optional[str] = None
    engagement_strategy: Optional[str] = None
    contact_info: Optional[dict] = None
    notes: Optional[str] = None


class PriorityUpsert(BaseModel):
    business_value: float = Field(0, ge=0, le=10)
    time_criticality: float = Field(0, ge=0, le=10)
    risk_reduction: float = Field(0, ge=0, le=10)
    job_size: float = Field(1, gt=0, le=10)
    roi_score: float = Field(0, ge=0, le=10)
    risk_score: float = Field(0, ge=0, le=10)
    priority_rank: Optional[int] = None
    notes: Optional[str] = None
    assessed_at: Optional[str] = None
    assessed_by: Optional[str] = None


# ── Stage Gate Endpoints ──────────────────────────────────────────────────────

@router.get("/{project_id}/stage-gates")
async def list_stage_gates(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    rows = await db.fetch(
        "SELECT * FROM project_stage_gates WHERE project_id=$1 ORDER BY stage_order, created_at",
        project_id,
    )
    return [dict(r) for r in rows]


@router.post("/{project_id}/stage-gates", status_code=201)
async def create_stage_gate(
    user: CurrentUser,
    project_id: str,
    body: StageGateCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    import json
    criteria_json = json.dumps([c.model_dump() for c in body.gate_criteria])
    row = await db.fetchrow("""
        INSERT INTO project_stage_gates
            (id, project_id, stage_name, stage_order, status, gate_criteria,
             sign_off_by, gate_date, notes)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9) RETURNING *
    """, str(uuid4()), project_id, body.stage_name, body.stage_order,
        body.status, criteria_json, body.sign_off_by,
        body.gate_date, body.notes)
    return dict(row)


@router.put("/{project_id}/stage-gates/{gate_id}")
async def update_stage_gate(
    user: CurrentUser,
    project_id: str,
    gate_id: str,
    body: StageGateUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    import json
    criteria_json = json.dumps([c.model_dump() for c in body.gate_criteria]) if body.gate_criteria is not None else None
    row = await db.fetchrow("""
        UPDATE project_stage_gates SET
            stage_name   = COALESCE($3, stage_name),
            stage_order  = COALESCE($4, stage_order),
            status       = COALESCE($5, status),
            gate_criteria= COALESCE($6::jsonb, gate_criteria),
            sign_off_by  = COALESCE($7, sign_off_by),
            gate_date    = COALESCE($8::date, gate_date),
            notes        = COALESCE($9, notes),
            updated_at   = NOW()
        WHERE id=$1 AND project_id=$2 RETURNING *
    """, gate_id, project_id, body.stage_name, body.stage_order,
        body.status, criteria_json, body.sign_off_by,
        body.gate_date, body.notes)
    if not row:
        raise HTTPException(404, "Stage gate not found")
    return dict(row)


@router.delete("/{project_id}/stage-gates/{gate_id}", status_code=204)
async def delete_stage_gate(
    user: CurrentUser,
    project_id: str,
    gate_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_stage_gates WHERE id=$1 AND project_id=$2",
        gate_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Stage gate not found")


# ── Health Score Endpoints ────────────────────────────────────────────────────

@router.get("/{project_id}/health")
async def get_health_scores(
    user: CurrentUser,
    project_id: str,
    limit: int = 10,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    rows = await db.fetch("""
        SELECT * FROM project_health_scores
        WHERE project_id=$1
        ORDER BY assessed_date DESC, created_at DESC
        LIMIT $2
    """, project_id, limit)
    return [dict(r) for r in rows]


@router.get("/{project_id}/health/latest")
async def get_latest_health(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    row = await db.fetchrow("""
        SELECT * FROM project_health_scores
        WHERE project_id=$1
        ORDER BY assessed_date DESC, created_at DESC
        LIMIT 1
    """, project_id)
    return dict(row) if row else None


@router.post("/{project_id}/health", status_code=201)
async def create_health_score(
    user: CurrentUser,
    project_id: str,
    body: HealthScoreCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    import json
    from datetime import date
    assessed_date = body.assessed_date or str(date.today())
    row = await db.fetchrow("""
        INSERT INTO project_health_scores
            (id, project_id, assessed_date, overall_rag, schedule_rag, budget_rag,
             scope_rag, team_rag, risk_rag, health_notes, assessed_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) RETURNING *
    """, str(uuid4()), project_id, assessed_date, body.overall_rag,
        body.schedule_rag, body.budget_rag, body.scope_rag,
        body.team_rag, body.risk_rag, json.dumps(body.health_notes),
        body.assessed_by)
    return dict(row)


# ── Stakeholder Endpoints ─────────────────────────────────────────────────────

@router.get("/{project_id}/stakeholders")
async def list_stakeholders(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    rows = await db.fetch(
        "SELECT * FROM project_stakeholders WHERE project_id=$1 ORDER BY influence_level DESC, name",
        project_id,
    )
    return [dict(r) for r in rows]


@router.post("/{project_id}/stakeholders", status_code=201)
async def create_stakeholder(
    user: CurrentUser,
    project_id: str,
    body: StakeholderCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    import json
    row = await db.fetchrow("""
        INSERT INTO project_stakeholders
            (id, project_id, name, role, organization,
             interest_level, influence_level, engagement_strategy, contact_info, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) RETURNING *
    """, str(uuid4()), project_id, body.name, body.role, body.organization,
        body.interest_level, body.influence_level, body.engagement_strategy,
        json.dumps(body.contact_info), body.notes)
    return dict(row)


@router.put("/{project_id}/stakeholders/{stakeholder_id}")
async def update_stakeholder(
    user: CurrentUser,
    project_id: str,
    stakeholder_id: str,
    body: StakeholderUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    import json
    contact_json = json.dumps(body.contact_info) if body.contact_info is not None else None
    row = await db.fetchrow("""
        UPDATE project_stakeholders SET
            name                = COALESCE($3, name),
            role                = COALESCE($4, role),
            organization        = COALESCE($5, organization),
            interest_level      = COALESCE($6, interest_level),
            influence_level     = COALESCE($7, influence_level),
            engagement_strategy = COALESCE($8, engagement_strategy),
            contact_info        = COALESCE($9::jsonb, contact_info),
            notes               = COALESCE($10, notes),
            updated_at          = NOW()
        WHERE id=$1 AND project_id=$2 RETURNING *
    """, stakeholder_id, project_id, body.name, body.role, body.organization,
        body.interest_level, body.influence_level, body.engagement_strategy,
        contact_json, body.notes)
    if not row:
        raise HTTPException(404, "Stakeholder not found")
    return dict(row)


@router.delete("/{project_id}/stakeholders/{stakeholder_id}", status_code=204)
async def delete_stakeholder(
    user: CurrentUser,
    project_id: str,
    stakeholder_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_stakeholders WHERE id=$1 AND project_id=$2",
        stakeholder_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Stakeholder not found")


# ── Priority Model Endpoints ──────────────────────────────────────────────────

@router.get("/{project_id}/priority")
async def get_priority(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    row = await db.fetchrow(
        "SELECT * FROM project_priorities WHERE project_id=$1", project_id
    )
    return dict(row) if row else None


@router.put("/{project_id}/priority")
async def upsert_priority(
    user: CurrentUser,
    project_id: str,
    body: PriorityUpsert,
    db: asyncpg.Connection = Depends(get_db),
):
    await _assert_project(project_id, db)
    existing = await db.fetchrow(
        "SELECT id FROM project_priorities WHERE project_id=$1", project_id
    )
    if existing:
        row = await db.fetchrow("""
            UPDATE project_priorities SET
                business_value   = $2,
                time_criticality = $3,
                risk_reduction   = $4,
                job_size         = $5,
                roi_score        = $6,
                risk_score       = $7,
                priority_rank    = COALESCE($8, priority_rank),
                notes            = COALESCE($9, notes),
                assessed_at      = COALESCE($10::date, assessed_at),
                assessed_by      = COALESCE($11, assessed_by),
                updated_at       = NOW()
            WHERE project_id=$1 RETURNING *
        """, project_id, body.business_value, body.time_criticality,
            body.risk_reduction, body.job_size, body.roi_score,
            body.risk_score, body.priority_rank, body.notes,
            body.assessed_at, body.assessed_by)
    else:
        row = await db.fetchrow("""
            INSERT INTO project_priorities
                (id, project_id, business_value, time_criticality, risk_reduction,
                 job_size, roi_score, risk_score, priority_rank, notes,
                 assessed_at, assessed_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12) RETURNING *
        """, str(uuid4()), project_id, body.business_value, body.time_criticality,
            body.risk_reduction, body.job_size, body.roi_score,
            body.risk_score, body.priority_rank, body.notes,
            body.assessed_at, body.assessed_by)
    return dict(row)


# ── Portfolio Summary (all projects health + priority) ────────────────────────

@router.get("/portfolio/summary")
async def portfolio_summary(
    user: CurrentUser,
    year: Optional[int] = None,
    db: asyncpg.Connection = Depends(get_db),
):
    """Portfolio heatmap data: all projects with latest health + priority score."""
    if year:
        projects = await db.fetch("""
            SELECT * FROM projects
            WHERE EXTRACT(YEAR FROM COALESCE(start_date, created_at::date)) = $1
            ORDER BY name
        """, year)
    else:
        projects = await db.fetch(
            "SELECT * FROM projects WHERE status != 'archived' ORDER BY name"
        )

    result = []
    for p in projects:
        pid = str(p["id"])
        health = await db.fetchrow("""
            SELECT overall_rag, assessed_date FROM project_health_scores
            WHERE project_id=$1 ORDER BY assessed_date DESC LIMIT 1
        """, pid)
        priority = await db.fetchrow(
            "SELECT wsjf_score, priority_rank FROM project_priorities WHERE project_id=$1",
            pid,
        )
        result.append({
            **dict(p),
            "latest_health_rag": health["overall_rag"] if health else None,
            "health_assessed_date": str(health["assessed_date"]) if health else None,
            "wsjf_score": float(priority["wsjf_score"]) if priority and priority["wsjf_score"] else None,
            "priority_rank": priority["priority_rank"] if priority else None,
        })
    return result


# ── Project Folders ───────────────────────────────────────────────────────────

@router.get("/{project_id}/folders")
async def list_folders(
    user: CurrentUser,
    project_id: str,
    track: Optional[str] = None,
    db: asyncpg.Connection = Depends(get_db),
):
    """Return project folder metadata, optionally filtered by track."""
    await _assert_project(project_id, db)
    if track:
        rows = await db.fetch("""
            SELECT * FROM project_folders WHERE project_id=$1 AND track=$2
            ORDER BY track, sort_order
        """, project_id, track)
    else:
        rows = await db.fetch("""
            SELECT * FROM project_folders WHERE project_id=$1
            ORDER BY track, sort_order
        """, project_id)
    return [dict(r) for r in rows]


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _assert_project(project_id: str, db: asyncpg.Connection) -> None:
    row = await db.fetchrow("SELECT id FROM projects WHERE id=$1", project_id)
    if not row:
        raise HTTPException(404, "Project not found")
