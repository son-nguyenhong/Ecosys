"""
Test Tasks Router — test_tasks table (reference schema)
Columns: assigned_to, task_type, preconditions, completed_at, status: pending/in_progress/done/blocked
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from uuid import uuid4
from datetime import datetime, timezone
import asyncpg, json

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/test-tasks", tags=["test-tasks"])

VALID_STATUSES = {"pending", "in_progress", "done", "blocked"}


class TestTaskCreate(BaseModel):
    project_id: str
    milestone_id: Optional[str] = None
    task_type: Optional[str] = "test_plan"
    title: str = Field(..., max_length=300)
    description: Optional[str] = None
    assigned_to: Optional[str] = Field(None, max_length=255)
    due_date: Optional[str] = None
    preconditions: Optional[list] = None


class TestTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = Field(None, max_length=255)
    due_date: Optional[str] = None
    milestone_id: Optional[str] = None
    task_type: Optional[str] = None


@router.get("")
async def list_test_tasks(
    project_id: Optional[str] = Query(None),
    milestone_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    conditions, params, idx = [], [], 1
    if project_id:
        conditions.append(f"project_id=${idx}"); params.append(project_id); idx += 1
    if milestone_id:
        conditions.append(f"milestone_id=${idx}"); params.append(milestone_id); idx += 1
    if status:
        conditions.append(f"status=${idx}"); params.append(status); idx += 1
    q = "SELECT * FROM test_tasks"
    if conditions:
        q += " WHERE " + " AND ".join(conditions)
    q += " ORDER BY due_date NULLS LAST, created_at"
    rows = await db.fetch(q, *params)
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_test_task(
    body: TestTaskCreate,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        INSERT INTO test_tasks
            (id, project_id, milestone_id, task_type, title, description,
             preconditions, status, assigned_to, due_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9) RETURNING *
    """, str(uuid4()), body.project_id, body.milestone_id,
        body.task_type or "test_plan", body.title, body.description,
        json.dumps(body.preconditions or []),
        body.assigned_to, body.due_date)
    return dict(row)


@router.put("/{task_id}")
async def update_test_task(
    task_id: str,
    body: TestTaskUpdate,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    existing = await db.fetchrow("SELECT id, status FROM test_tasks WHERE id=$1", task_id)
    if not existing:
        raise HTTPException(404, "Task not found")

    if body.status and body.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")

    completed_at = None
    if body.status == "done" and existing["status"] != "done":
        completed_at = datetime.now(timezone.utc)

    row = await db.fetchrow("""
        UPDATE test_tasks SET
            title=COALESCE($2, title),
            description=COALESCE($3, description),
            status=COALESCE($4, status),
            assigned_to=COALESCE($5, assigned_to),
            due_date=COALESCE($6, due_date),
            completed_at=COALESCE($7, completed_at),
            updated_at=NOW()
        WHERE id=$1 RETURNING *
    """, task_id, body.title, body.description,
        body.status, body.assigned_to, body.due_date, completed_at)
    return dict(row)


@router.delete("/{task_id}", status_code=204)
async def delete_test_task(
    task_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute("DELETE FROM test_tasks WHERE id=$1", task_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Task not found")
