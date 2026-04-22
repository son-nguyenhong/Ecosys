"""
Publish Router — MkDocs stakeholder documentation portal
Endpoints:
  POST   /projects/{id}/publish         → trigger build (async background)
  GET    /projects/{id}/publish/status  → latest job status
  DELETE /projects/{id}/publish         → unpublish + delete site
"""
import shutil
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
import asyncpg

from app.auth import CurrentUser
from app.database import get_db, get_pool
from app.services.mkdocs_builder import SITES_DIR, build_mkdocs_site

router = APIRouter(prefix="/projects", tags=["publish"])


# ── Background build task ──────────────────────────────────────────────────

async def _run_build(job_id: str, project_id: str, project: dict) -> None:
    """Fetch project data, build MkDocs site, update job record."""
    pool = get_pool()
    async with pool.acquire() as conn:
        try:
            files = await conn.fetch(
                """SELECT * FROM project_files
                   WHERE project_id=$1 AND status='final'
                   ORDER BY doc_category, name""",
                project_id,
            )
            members = await conn.fetch(
                """SELECT * FROM project_members
                   WHERE project_id=$1 AND is_active=true
                   ORDER BY full_name""",
                project_id,
            )
            milestones = await conn.fetch(
                """SELECT * FROM project_milestones
                   WHERE project_id=$1
                   ORDER BY sort_order""",
                project_id,
            )

            site_url, doc_count = await build_mkdocs_site(
                project=project,
                files=[dict(f) for f in files],
                members=[dict(m) for m in members],
                milestones=[dict(ms) for ms in milestones],
            )

            await conn.execute(
                """UPDATE publish_jobs
                   SET status='success', site_url=$1, doc_count=$2, completed_at=NOW()
                   WHERE id=$3""",
                site_url, doc_count, job_id,
            )

        except Exception as exc:
            await conn.execute(
                """UPDATE publish_jobs
                   SET status='failed', error_msg=$1, completed_at=NOW()
                   WHERE id=$2""",
                str(exc)[:500], job_id,
            )


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/{project_id}/publish", status_code=202)
async def trigger_publish(
    user: CurrentUser,
    project_id: str,
    background_tasks: BackgroundTasks,
    db: asyncpg.Connection = Depends(get_db),
):
    """Kick off an async MkDocs build for this project's final documents."""
    project = await db.fetchrow("SELECT * FROM projects WHERE id=$1", project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    # Cancel any stuck 'building' jobs older than 5 min (safety)
    await db.execute(
        """UPDATE publish_jobs SET status='failed', error_msg='Superseded by new build'
           WHERE project_id=$1 AND status='building'
             AND triggered_at < NOW() - INTERVAL '5 minutes'""",
        project_id,
    )

    job_id = str(uuid4())
    await db.execute(
        """INSERT INTO publish_jobs (id, project_id, status, triggered_by)
           VALUES ($1, $2, 'building', $3)""",
        job_id, project_id, user.sub if user else "system",
    )

    background_tasks.add_task(_run_build, job_id, project_id, dict(project))
    return {"job_id": job_id, "status": "building"}


@router.get("/{project_id}/publish/status")
async def get_publish_status(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    """Return the latest publish job for this project."""
    row = await db.fetchrow(
        """SELECT * FROM publish_jobs
           WHERE project_id=$1
           ORDER BY triggered_at DESC LIMIT 1""",
        project_id,
    )
    if not row:
        return {"status": "never_published"}
    return dict(row)


@router.delete("/{project_id}/publish", status_code=204)
async def unpublish(
    user: CurrentUser,
    project_id: str,
    db: asyncpg.Connection = Depends(get_db),
):
    """Delete the static site and all job records for this project."""
    project = await db.fetchrow(
        "SELECT code FROM projects WHERE id=$1", project_id
    )
    if not project:
        raise HTTPException(404, "Project not found")

    from app.services.mkdocs_builder import _slug
    site_path = SITES_DIR / _slug(project["code"])
    if site_path.exists():
        shutil.rmtree(site_path)

    await db.execute(
        "DELETE FROM publish_jobs WHERE project_id=$1", project_id
    )
