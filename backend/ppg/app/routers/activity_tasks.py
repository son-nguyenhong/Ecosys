"""
Activity Tasks Router — 5-domain governance checklist per project.
GET  /projects/{id}/activity-tasks            — list all (optionally filter by domain)
PATCH /projects/{id}/activity-tasks/{task_id} — update status / assignee / notes / due_date
POST  /projects/{id}/activity-tasks           — add a custom task
DELETE /projects/{id}/activity-tasks/{task_id} — delete a custom task
"""
from datetime import date
from typing import Optional
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import asyncpg

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/projects", tags=["activity-tasks"])

VALID_DOMAINS = {
    "business_requirements", "architecture_code",
    "infrastructure", "security_iam", "compliance_governance",
}
VALID_STATUS = {"pending", "in_progress", "done", "skipped", "na"}


class ActivityTaskPatch(BaseModel):
    status:   Optional[str]  = Field(None, pattern="^(pending|in_progress|done|skipped|na)$")
    assignee: Optional[str]  = Field(None, max_length=100)
    notes:    Optional[str]  = None
    due_date: Optional[str]  = None  # ISO date string


class ActivityTaskCreate(BaseModel):
    activity_domain: str  = Field(..., max_length=50)
    title:           str  = Field(..., min_length=1)
    assignee:        Optional[str] = Field(None, max_length=100)
    notes:           Optional[str] = None
    due_date:        Optional[str] = None


@router.get("/{project_id}/activity-tasks")
async def list_activity_tasks(
    user: CurrentUser,
    project_id: str,
    domain: Optional[str] = Query(None, description="Filter by activity_domain"),
    db: asyncpg.Connection = Depends(get_db),
):
    if domain and domain not in VALID_DOMAINS:
        raise HTTPException(400, f"Invalid domain '{domain}'. Must be one of: {', '.join(sorted(VALID_DOMAINS))}")

    if domain:
        rows = await db.fetch(
            "SELECT * FROM project_activity_tasks "
            "WHERE project_id=$1 AND activity_domain=$2 "
            "ORDER BY sort_order",
            project_id, domain,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM project_activity_tasks "
            "WHERE project_id=$1 "
            "ORDER BY activity_domain, sort_order",
            project_id,
        )
    return [dict(r) for r in rows]


@router.post("/{project_id}/activity-tasks", status_code=201)
async def create_activity_task(
    user: CurrentUser,
    project_id: str,
    body: ActivityTaskCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    if body.activity_domain not in VALID_DOMAINS:
        raise HTTPException(400, f"Invalid domain '{body.activity_domain}'")

    exists = await db.fetchval("SELECT id FROM projects WHERE id=$1", project_id)
    if not exists:
        raise HTTPException(404, "Project not found")

    max_order = await db.fetchval(
        "SELECT COALESCE(MAX(sort_order), 0) FROM project_activity_tasks "
        "WHERE project_id=$1 AND activity_domain=$2",
        project_id, body.activity_domain,
    ) or 0

    due = date.fromisoformat(body.due_date) if body.due_date else None

    row = await db.fetchrow("""
        INSERT INTO project_activity_tasks
            (id, project_id, activity_domain, title, status, assignee, notes, due_date, sort_order)
        VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8) RETURNING *
    """, str(uuid4()), project_id, body.activity_domain,
        body.title, body.assignee, body.notes, due, max_order + 1)
    return dict(row)


@router.patch("/{project_id}/activity-tasks/{task_id}")
async def patch_activity_task(
    project_id: str,
    task_id:    str,
    body:       ActivityTaskPatch,
    user:       CurrentUser = None,
    db:         asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")

    if "due_date" in updates and updates["due_date"]:
        try:
            updates["due_date"] = date.fromisoformat(updates["due_date"])
        except ValueError:
            raise HTTPException(400, "due_date must be ISO format YYYY-MM-DD")

    set_parts = [f"{k}=${i + 3}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE project_activity_tasks "
        f"SET {', '.join(set_parts)}, updated_at=NOW() "
        f"WHERE id=$1 AND project_id=$2 RETURNING *",
        task_id, project_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Task not found")
    return dict(row)


@router.delete("/{project_id}/activity-tasks/{task_id}", status_code=204)
async def delete_activity_task(
    project_id: str,
    task_id:    str,
    user:       CurrentUser = None,
    db:         asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_activity_tasks WHERE id=$1 AND project_id=$2",
        task_id, project_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Task not found")
