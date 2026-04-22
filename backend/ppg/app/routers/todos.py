"""
Project To-do List Router (FR-T01 – FR-T10)
Prefix: /api/v1/todos

GET    /api/v1/todos                          → list (filters: project_id, assignee_id, status, priority, task_type, overdue, due_from, due_to, parent_id)
POST   /api/v1/todos                          → create
GET    /api/v1/todos/stats                    → workload summary
POST   /api/v1/todos/bulk                     → bulk create (auto-generate)
GET    /api/v1/todos/{id}                     → get one + subtasks + watchers + recent activity
PUT    /api/v1/todos/{id}                     → update
DELETE /api/v1/todos/{id}                     → delete
POST   /api/v1/todos/{id}/status              → transition status
GET    /api/v1/todos/{id}/comments            → list comments
POST   /api/v1/todos/{id}/comments            → add comment
DELETE /api/v1/todos/{id}/comments/{cid}      → delete comment
POST   /api/v1/todos/{id}/watchers            → add watcher
DELETE /api/v1/todos/{id}/watchers/{user_id}  → remove watcher
"""
from __future__ import annotations

import json
from datetime import datetime, date
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/api/v1/todos", tags=["todos"])

# ── Status transitions ────────────────────────────────────────────────────────
_TRANSITIONS: dict[str, list[str]] = {
    "todo":        ["in_progress", "cancelled"],
    "in_progress": ["pending", "done", "cancelled"],
    "pending":     ["in_progress", "done", "cancelled"],
    "done":        ["in_progress"],      # allow reopen
    "cancelled":   ["todo"],             # allow reopen
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _ser(v):
    if isinstance(v, (datetime,)):
        return v.isoformat()
    if isinstance(v, date):
        return v.isoformat()
    return v


def _row(row: asyncpg.Record) -> dict:
    d = dict(row)
    for k in ("created_at", "updated_at", "completed_at", "added_at"):
        if isinstance(d.get(k), datetime):
            d[k] = d[k].isoformat()
    if isinstance(d.get("due_date"), date):
        d["due_date"] = d["due_date"].isoformat()
    if isinstance(d.get("recurrence"), str):
        try:
            d["recurrence"] = json.loads(d["recurrence"])
        except Exception:
            pass
    if isinstance(d.get("tags"), list):
        pass  # asyncpg returns list already for TEXT[]
    return d


async def _get_or_404(db: asyncpg.Connection, todo_id: str) -> asyncpg.Record:
    row = await db.fetchrow("SELECT * FROM project_todos WHERE id=$1::uuid", todo_id)
    if not row:
        raise HTTPException(404, "Task không tồn tại")
    return row


async def _log_activity(
    db: asyncpg.Connection,
    todo_id: str,
    actor: str,
    action: str,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
) -> None:
    await db.execute(
        """
        INSERT INTO project_todo_activity (todo_id, actor, action, old_value, new_value)
        VALUES ($1::uuid, $2, $3, $4, $5)
        """,
        todo_id, actor, action, old_value, new_value,
    )


# ── Schemas ───────────────────────────────────────────────────────────────────

class TodoCreate(BaseModel):
    title:        str  = Field(..., min_length=1, max_length=500)
    description:  Optional[str] = None
    project_id:   Optional[str] = None
    task_type:    str  = Field("other", pattern="^(feature|bug|review|meeting|documentation|deployment|other)$")
    priority:     str  = Field("medium", pattern="^(critical|high|medium|low)$")
    assignee_id:  Optional[str] = None
    due_date:     Optional[str] = None   # ISO date string YYYY-MM-DD
    milestone_id: Optional[str] = None
    parent_id:    Optional[str] = None
    ref_type:     Optional[str] = None
    ref_id:       Optional[str] = None
    tags:         list[str]     = Field(default_factory=list)
    sort_order:   int           = 0
    recurrence:   Optional[dict] = None


class TodoUpdate(BaseModel):
    title:        Optional[str]  = Field(None, min_length=1, max_length=500)
    description:  Optional[str]  = None
    task_type:    Optional[str]  = None
    priority:     Optional[str]  = None
    assignee_id:  Optional[str]  = None
    due_date:     Optional[str]  = None
    milestone_id: Optional[str]  = None
    ref_type:     Optional[str]  = None
    ref_id:       Optional[str]  = None
    tags:         Optional[list[str]] = None
    sort_order:   Optional[int]  = None
    recurrence:   Optional[dict] = None


class TodoStatusRequest(BaseModel):
    status: str = Field(..., min_length=1)
    notes:  Optional[str] = None


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)


class WatcherAdd(BaseModel):
    user_id: str = Field(..., min_length=1)


class BulkTodoCreate(BaseModel):
    todos: list[TodoCreate]


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("")
async def list_todos(
    user: CurrentUser,
    project_id:   Optional[str] = Query(None),
    assignee_id:  Optional[str] = Query(None),
    status:       Optional[str] = Query(None),
    priority:     Optional[str] = Query(None),
    task_type:    Optional[str] = Query(None),
    milestone_id: Optional[str] = Query(None),
    parent_id:    Optional[str] = Query(None, description="Pass 'root' to get only top-level tasks"),
    overdue:      Optional[bool] = Query(None),
    due_from:     Optional[str] = Query(None),
    due_to:       Optional[str] = Query(None),
    search:       Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=500),
    db: asyncpg.Connection = Depends(get_db),
):
    clauses: list[str] = []
    params:  list      = []
    i = 1

    if project_id:
        clauses.append(f"t.project_id = ${i}::uuid"); params.append(project_id); i += 1
    if assignee_id:
        clauses.append(f"t.assignee_id = ${i}"); params.append(assignee_id); i += 1
    if status:
        if "," in status:
            vals = [s.strip() for s in status.split(",")]
            placeholders = ",".join(f"${i+j}" for j in range(len(vals)))
            clauses.append(f"t.status IN ({placeholders})")
            params.extend(vals); i += len(vals)
        else:
            clauses.append(f"t.status = ${i}"); params.append(status); i += 1
    if priority:
        clauses.append(f"t.priority = ${i}"); params.append(priority); i += 1
    if task_type:
        clauses.append(f"t.task_type = ${i}"); params.append(task_type); i += 1
    if milestone_id:
        clauses.append(f"t.milestone_id = ${i}::uuid"); params.append(milestone_id); i += 1
    if parent_id == "root":
        clauses.append("t.parent_id IS NULL")
    elif parent_id:
        clauses.append(f"t.parent_id = ${i}::uuid"); params.append(parent_id); i += 1
    if overdue is True:
        clauses.append(f"t.due_date < CURRENT_DATE AND t.status NOT IN ('done','cancelled')")
    if due_from:
        clauses.append(f"t.due_date >= ${i}::date"); params.append(due_from); i += 1
    if due_to:
        clauses.append(f"t.due_date <= ${i}::date"); params.append(due_to); i += 1
    if search:
        clauses.append(f"(t.title ILIKE ${i} OR t.description ILIKE ${i})")
        params.append(f"%{search}%"); i += 1

    where  = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    offset = (page - 1) * size

    total = await db.fetchval(f"SELECT COUNT(*) FROM project_todos t {where}", *params)
    rows = await db.fetch(
        f"""
        SELECT t.*,
               p.name AS project_name,
               (SELECT COUNT(*) FROM project_todos sub WHERE sub.parent_id = t.id) AS subtask_count,
               (SELECT COUNT(*) FROM project_todo_comments c WHERE c.todo_id = t.id) AS comment_count
        FROM project_todos t
        LEFT JOIN projects p ON p.id = t.project_id
        {where}
        ORDER BY
            CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
            t.due_date ASC NULLS LAST,
            t.sort_order ASC,
            t.created_at DESC
        LIMIT ${i} OFFSET ${i+1}
        """,
        *params, size, offset,
    )
    return {
        "data": [_row(r) for r in rows],
        "meta": {"total": total, "page": page, "size": size},
    }


# ── Stats (must be before /{id}) ──────────────────────────────────────────────

@router.get("/stats")
async def get_todo_stats(
    user: CurrentUser,
    project_id:  Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
):
    clauses: list[str] = []
    params:  list      = []
    i = 1
    if project_id:
        clauses.append(f"project_id = ${i}::uuid"); params.append(project_id); i += 1
    if assignee_id:
        clauses.append(f"assignee_id = ${i}"); params.append(assignee_id); i += 1
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    counts = await db.fetch(
        f"SELECT status, COUNT(*) AS cnt FROM project_todos {where} GROUP BY status", *params
    )
    by_status = {r["status"]: r["cnt"] for r in counts}

    priorities = await db.fetch(
        f"SELECT priority, COUNT(*) AS cnt FROM project_todos {where} AND status NOT IN ('done','cancelled') GROUP BY priority"
        if clauses else
        f"SELECT priority, COUNT(*) AS cnt FROM project_todos WHERE status NOT IN ('done','cancelled') GROUP BY priority",
        *params,
    )
    by_priority = {r["priority"]: r["cnt"] for r in priorities}

    overdue_count = await db.fetchval(
        f"SELECT COUNT(*) FROM project_todos {where} {'AND' if clauses else 'WHERE'} due_date < CURRENT_DATE AND status NOT IN ('done','cancelled')",
        *params,
    )

    due_today = await db.fetchval(
        f"SELECT COUNT(*) FROM project_todos {where} {'AND' if clauses else 'WHERE'} due_date = CURRENT_DATE AND status NOT IN ('done','cancelled')",
        *params,
    )

    # Workload per assignee
    workload = await db.fetch(
        f"""
        SELECT assignee_id,
               COUNT(*) FILTER (WHERE status NOT IN ('done','cancelled')) AS open_count,
               COUNT(*) FILTER (WHERE status = 'done') AS done_count,
               COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('done','cancelled')) AS overdue_count
        FROM project_todos {where}
        WHERE assignee_id IS NOT NULL
        GROUP BY assignee_id
        ORDER BY open_count DESC
        """.replace("WHERE assignee_id IS NOT NULL", ("AND" if clauses else "WHERE") + " assignee_id IS NOT NULL"),
        *params,
    )

    return {
        "data": {
            "by_status":      by_status,
            "by_priority":    by_priority,
            "overdue_count":  overdue_count,
            "due_today":      due_today,
            "total_open":     sum(v for k, v in by_status.items() if k not in ("done", "cancelled")),
            "workload":       [dict(r) for r in workload],
        }
    }


# ── Bulk create ───────────────────────────────────────────────────────────────

@router.post("/bulk", status_code=201)
async def bulk_create_todos(
    user: CurrentUser,
    body: BulkTodoCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    actor = user.username if hasattr(user, "username") else str(user.sub if hasattr(user, "sub") else "system")
    created = []
    for item in body.todos:
        row = await db.fetchrow(
            """
            INSERT INTO project_todos
              (project_id, title, description, task_type, priority, status,
               assignee_id, due_date, milestone_id, parent_id, ref_type, ref_id,
               tags, sort_order, recurrence, created_by)
            VALUES ($1::uuid,$2,$3,$4,$5,'todo',$6,$7::date,$8::uuid,$9::uuid,$10,$11::uuid,
                    $12,$13,$14::jsonb,$15)
            RETURNING *
            """,
            item.project_id or None,
            item.title, item.description,
            item.task_type, item.priority,
            item.assignee_id or None,
            item.due_date or None,
            item.milestone_id or None,
            item.parent_id or None,
            item.ref_type or None,
            item.ref_id or None,
            item.tags, item.sort_order,
            json.dumps(item.recurrence) if item.recurrence else None,
            actor,
        )
        await _log_activity(db, str(row["id"]), actor, "created", new_value=item.title)
        created.append(_row(row))
    return {"data": created, "created": len(created)}


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_todo(
    user: CurrentUser,
    body: TodoCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    actor = user.username if hasattr(user, "username") else str(user.sub if hasattr(user, "sub") else "system")
    row = await db.fetchrow(
        """
        INSERT INTO project_todos
          (project_id, title, description, task_type, priority, status,
           assignee_id, due_date, milestone_id, parent_id, ref_type, ref_id,
           tags, sort_order, recurrence, created_by)
        VALUES ($1::uuid,$2,$3,$4,$5,'todo',$6,$7::date,$8::uuid,$9::uuid,$10,$11::uuid,
                $12,$13,$14::jsonb,$15)
        RETURNING *
        """,
        body.project_id or None,
        body.title, body.description,
        body.task_type, body.priority,
        body.assignee_id or None,
        body.due_date or None,
        body.milestone_id or None,
        body.parent_id or None,
        body.ref_type or None,
        body.ref_id or None,
        body.tags, body.sort_order,
        json.dumps(body.recurrence) if body.recurrence else None,
        actor,
    )
    await _log_activity(db, str(row["id"]), actor, "created", new_value=body.title)
    return {"data": _row(row)}


# ── Get one ───────────────────────────────────────────────────────────────────

@router.get("/{todo_id}")
async def get_todo(
    user: CurrentUser,
    todo_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await _get_or_404(db, todo_id)
    result = _row(row)

    subtasks = await db.fetch(
        "SELECT * FROM project_todos WHERE parent_id=$1::uuid ORDER BY sort_order, created_at",
        todo_id,
    )
    result["subtasks"] = [_row(r) for r in subtasks]

    watchers = await db.fetch(
        "SELECT user_id, added_at FROM project_todo_watchers WHERE todo_id=$1::uuid",
        todo_id,
    )
    result["watchers"] = [_row(r) for r in watchers]

    activity = await db.fetch(
        "SELECT * FROM project_todo_activity WHERE todo_id=$1::uuid ORDER BY created_at DESC LIMIT 20",
        todo_id,
    )
    result["activity"] = [_row(r) for r in activity]

    return {"data": result}


# ── Update ────────────────────────────────────────────────────────────────────

@router.put("/{todo_id}")
async def update_todo(
    user: CurrentUser,
    todo_id: str,
    body: TodoUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _get_or_404(db, todo_id)
    actor = user.username if hasattr(user, "username") else str(user.sub if hasattr(user, "sub") else "system")

    sets:   list[str] = ["updated_at = NOW()"]
    params: list      = []
    i = 1

    field_map = {
        "title":        ("title = ${}",        None),
        "description":  ("description = ${}",  None),
        "task_type":    ("task_type = ${}",     None),
        "priority":     ("priority = ${}",      None),
        "assignee_id":  ("assignee_id = ${}",   None),
        "due_date":     ("due_date = ${}::date", None),
        "milestone_id": ("milestone_id = ${}::uuid", None),
        "ref_type":     ("ref_type = ${}",      None),
        "ref_id":       ("ref_id = ${}::uuid",  None),
        "sort_order":   ("sort_order = ${}",    None),
    }

    data = body.model_dump(exclude_none=True)
    for field, (tpl, _) in field_map.items():
        if field in data:
            sets.append(tpl.format(i)); params.append(data[field] or None); i += 1
    if "tags" in data:
        sets.append(f"tags = ${i}"); params.append(data["tags"]); i += 1
    if "recurrence" in data:
        sets.append(f"recurrence = ${i}::jsonb")
        params.append(json.dumps(data["recurrence"]) if data["recurrence"] else None); i += 1

    updated = await db.fetchrow(
        f"UPDATE project_todos SET {', '.join(sets)} WHERE id=${i}::uuid RETURNING *",
        *params, todo_id,
    )
    await _log_activity(db, todo_id, actor, "updated")
    return {"data": _row(updated)}


# ── Status transition ─────────────────────────────────────────────────────────

@router.post("/{todo_id}/status")
async def transition_todo_status(
    user: CurrentUser,
    todo_id: str,
    body: TodoStatusRequest,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await _get_or_404(db, todo_id)
    actor = user.username if hasattr(user, "username") else str(user.sub if hasattr(user, "sub") else "system")
    current = row["status"]
    allowed = _TRANSITIONS.get(current, [])

    if body.status not in allowed:
        raise HTTPException(
            400,
            f"Không thể chuyển từ '{current}' sang '{body.status}'. Cho phép: {allowed}",
        )

    completed_at_clause = ""
    if body.status == "done":
        completed_at_clause = ", completed_at = NOW()"
    elif body.status in ("todo", "in_progress"):
        completed_at_clause = ", completed_at = NULL"

    updated = await db.fetchrow(
        f"UPDATE project_todos SET status=$1, updated_at=NOW(){completed_at_clause} WHERE id=$2::uuid RETURNING *",
        body.status, todo_id,
    )
    await _log_activity(db, todo_id, actor, "status_changed", old_value=current, new_value=body.status)
    return {"data": _row(updated)}


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{todo_id}", status_code=204)
async def delete_todo(
    user: CurrentUser,
    todo_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute("DELETE FROM project_todos WHERE id=$1::uuid", todo_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Task không tồn tại")


# ── Comments ──────────────────────────────────────────────────────────────────

@router.get("/{todo_id}/comments")
async def list_comments(
    user: CurrentUser,
    todo_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await _get_or_404(db, todo_id)
    rows = await db.fetch(
        "SELECT * FROM project_todo_comments WHERE todo_id=$1::uuid ORDER BY created_at ASC",
        todo_id,
    )
    return {"data": [_row(r) for r in rows]}


@router.post("/{todo_id}/comments", status_code=201)
async def add_comment(
    user: CurrentUser,
    todo_id: str,
    body: CommentCreate,
    db: asyncpg.Connection = Depends(get_db),
):
    await _get_or_404(db, todo_id)
    actor = user.username if hasattr(user, "username") else str(user.sub if hasattr(user, "sub") else "system")
    row = await db.fetchrow(
        "INSERT INTO project_todo_comments (todo_id, author, content) VALUES ($1::uuid,$2,$3) RETURNING *",
        todo_id, actor, body.content,
    )
    await _log_activity(db, todo_id, actor, "commented", new_value=body.content[:100])
    return {"data": _row(row)}


@router.delete("/{todo_id}/comments/{comment_id}", status_code=204)
async def delete_comment(
    user: CurrentUser,
    todo_id: str,
    comment_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    result = await db.execute(
        "DELETE FROM project_todo_comments WHERE id=$1::uuid AND todo_id=$2::uuid",
        comment_id, todo_id,
    )
    if result == "DELETE 0":
        raise HTTPException(404, "Comment không tồn tại")


# ── Watchers ──────────────────────────────────────────────────────────────────

@router.post("/{todo_id}/watchers", status_code=201)
async def add_watcher(
    user: CurrentUser,
    todo_id: str,
    body: WatcherAdd,
    db: asyncpg.Connection = Depends(get_db),
):
    await _get_or_404(db, todo_id)
    await db.execute(
        "INSERT INTO project_todo_watchers (todo_id, user_id) VALUES ($1::uuid,$2) ON CONFLICT DO NOTHING",
        todo_id, body.user_id,
    )
    return {"data": {"todo_id": todo_id, "user_id": body.user_id}}


@router.delete("/{todo_id}/watchers/{watcher_user_id}", status_code=204)
async def remove_watcher(
    user: CurrentUser,
    todo_id: str,
    watcher_user_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    await db.execute(
        "DELETE FROM project_todo_watchers WHERE todo_id=$1::uuid AND user_id=$2",
        todo_id, watcher_user_id,
    )
