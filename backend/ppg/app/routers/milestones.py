"""
Milestones Router — project_milestones table
GET/PUT milestones, regenerate milestones for all tracks (project / ba / test)
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import asyncpg, json, os, logging

from app.auth import CurrentUser
from app.database import get_db
from app.services.milestone_generator import (
    generate_milestones, generate_ba_milestones, generate_test_milestones,
    MILESTONE_TEMPLATES, BA_MILESTONE_TEMPLATES, TEST_MILESTONE_TEMPLATES,
)

router = APIRouter(prefix="/projects", tags=["milestones"])
logger = logging.getLogger(__name__)

UPLOAD_BASE = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))


class MilestoneUpdate(BaseModel):
    name:          Optional[str] = None
    status:        Optional[str] = None
    start_date:    Optional[str] = None
    end_date:      Optional[str] = None
    description:   Optional[str] = None
    done_criteria: Optional[str] = None


@router.get("/{project_id}/milestones")
async def list_milestones(
    user: CurrentUser,
    project_id: str,
    track: Optional[str] = Query(None, description="Filter by track: project | ba | test"),
    db: asyncpg.Connection = Depends(get_db),
):
    if track:
        rows = await db.fetch(
            "SELECT * FROM project_milestones WHERE project_id=$1 AND track=$2 ORDER BY sort_order",
            project_id, track,
        )
    else:
        rows = await db.fetch(
            "SELECT * FROM project_milestones WHERE project_id=$1 ORDER BY track, sort_order",
            project_id,
        )
    return [dict(r) for r in rows]


@router.get("/{project_id}/milestones/{mid}")
async def get_milestone(
    user: CurrentUser,
    project_id: str,
    mid: str,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT * FROM project_milestones WHERE id=$1 AND project_id=$2",
        mid, project_id,
    )
    if not row:
        raise HTTPException(404, "Milestone not found")
    return dict(row)


@router.put("/{project_id}/milestones/{mid}")
async def update_milestone(
    user: CurrentUser,
    project_id: str,
    mid: str,
    body: MilestoneUpdate,
    db: asyncpg.Connection = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No fields to update")
    set_parts = [f"{k}=${i+3}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE project_milestones SET {', '.join(set_parts)}, updated_at=NOW() "
        f"WHERE id=$1 AND project_id=$2 RETURNING *",
        mid, project_id, *updates.values(),
    )
    if not row:
        raise HTTPException(404, "Milestone not found")
    return dict(row)


@router.post("/{project_id}/milestones/generate", status_code=201)
async def regenerate_milestones(
    user: CurrentUser,
    project_id: str,
    track: Optional[str] = Query(None, description="Regenerate specific track: project | ba | test. Omit for all."),
    db: asyncpg.Connection = Depends(get_db),
):
    from uuid import uuid4
    from app.services.project_template import write_template_file

    proj = await db.fetchrow(
        "SELECT code, name, start_date, end_date FROM projects WHERE id=$1", project_id
    )
    if not proj:
        raise HTTPException(404, "Project not found")
    if not proj["start_date"] or not proj["end_date"]:
        raise HTTPException(400, "Project must have start_date and end_date")

    tracks_to_regen = [track] if track else ["project", "ba", "test"]

    file_template_map = {
        **{k: (v, "project") for k, v in MILESTONE_TEMPLATES.items()},
        **{k: (v, "ba")      for k, v in BA_MILESTONE_TEMPLATES.items()},
        **{k: (v, "test")    for k, v in TEST_MILESTONE_TEMPLATES.items()},
    }

    async with db.transaction():
        for t in tracks_to_regen:
            await db.execute(
                "DELETE FROM project_milestones WHERE project_id=$1 AND track=$2",
                project_id, t,
            )

            if t == "project":
                milestones = generate_milestones(project_id, proj["start_date"], proj["end_date"])
            elif t == "ba":
                milestones = generate_ba_milestones(project_id, proj["start_date"], proj["end_date"])
            else:
                milestones = generate_test_milestones(project_id, proj["start_date"], proj["end_date"])

            for ms in milestones:
                ba_tasks   = ms.pop("_ba_tasks", [])
                test_tasks = ms.pop("_test_tasks", [])
                ms_id = str(uuid4())
                await db.execute("""
                    INSERT INTO project_milestones
                        (id, project_id, name, milestone_type, description,
                         start_date, end_date, status, sort_order, preconditions, done_criteria, track)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                """, ms_id, project_id, ms["name"], ms["milestone_type"], ms.get("description"),
                    ms["start_date"], ms["end_date"], ms["status"],
                    ms["sort_order"], json.dumps(ms["preconditions"]), ms["done_criteria"], t)

                for title, task_type in ba_tasks:
                    await db.execute("""
                        INSERT INTO ba_tasks
                            (id, project_id, milestone_id, task_type, title, preconditions, status, due_date)
                        VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)
                    """, str(uuid4()), project_id, ms_id, task_type, title,
                        json.dumps(ms["preconditions"]), ms["end_date"])

                for title, task_type in test_tasks:
                    await db.execute("""
                        INSERT INTO test_tasks
                            (id, project_id, milestone_id, task_type, title, preconditions, status, due_date)
                        VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)
                    """, str(uuid4()), project_id, ms_id, task_type, title,
                        json.dumps(ms["preconditions"]), ms["end_date"])

                ms_type = ms["milestone_type"]
                templates_for_type, file_track = file_template_map.get(ms_type, ([], t))
                for fname, category in templates_for_type:
                    file_id = str(uuid4())
                    try:
                        storage_path = write_template_file(
                            project_id=project_id, project_code=proj["code"],
                            project_name=proj["name"], milestone_type=ms_type,
                            file_name=fname, upload_base=UPLOAD_BASE,
                            track=file_track,
                        )
                    except Exception as ex:
                        logger.warning(f"Template write warning: {ex}")
                        storage_path = None
                    await db.execute("""
                        INSERT INTO project_files
                            (id, project_id, milestone_id, name, file_type, doc_category,
                             current_version, storage_path, status)
                        VALUES ($1,$2,$3,$4,'template',$5,'v0.1',$6,'draft')
                    """, file_id, project_id, ms_id, fname, category, storage_path)

    rows = await db.fetch(
        "SELECT * FROM project_milestones WHERE project_id=$1 ORDER BY track, sort_order",
        project_id,
    )
    return [dict(r) for r in rows]
