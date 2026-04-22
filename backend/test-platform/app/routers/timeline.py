"""
Test Timeline Router — test_tasks grouped by project_milestones
Returns [{milestone: {...}, test_tasks: [...]}] array format
"""
from fastapi import APIRouter, Depends
import asyncpg

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("/{project_id}")
async def get_timeline(
    project_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    milestones = await db.fetch(
        "SELECT * FROM project_milestones WHERE project_id=$1 ORDER BY sort_order",
        project_id,
    )
    tasks = await db.fetch(
        "SELECT * FROM test_tasks WHERE project_id=$1", project_id
    )

    task_map: dict = {}
    for t in tasks:
        mid = str(t["milestone_id"]) if t["milestone_id"] else "unassigned"
        task_map.setdefault(mid, []).append(dict(t))

    result = []
    for ms in milestones:
        ms_id = str(ms["id"])
        result.append({
            "milestone": dict(ms),
            "test_tasks": task_map.get(ms_id, []),
        })
    if task_map.get("unassigned"):
        result.append({"milestone": None, "test_tasks": task_map["unassigned"]})

    return result
