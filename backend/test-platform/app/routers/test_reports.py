"""
Test Reports Router — test_reports table (reference schema)
Create, list, approve reports. Approved → push metrics to PPG.
"""
import asyncio, os, logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from uuid import uuid4
import asyncpg, httpx

from app.auth import CurrentUser
from app.database import get_db, get_pool

PPG_URL = os.getenv("PPG_SERVICE_URL", "http://127.0.0.1:8001")
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/test-reports", tags=["test-reports"])


class TestReportCreate(BaseModel):
    project_id: str
    total: int = 0
    passed: int = 0
    logs: Optional[str] = None


@router.get("")
async def list_reports(
    project_id: Optional[str] = None,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    if project_id:
        rows = await db.fetch(
            "SELECT * FROM test_reports WHERE project_id=$1 ORDER BY executed_at DESC",
            project_id
        )
    else:
        rows = await db.fetch("SELECT * FROM test_reports ORDER BY executed_at DESC")
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_report(
    body: TestReportCreate,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    failed = body.total - body.passed
    coverage = round((body.passed / body.total * 100) if body.total > 0 else 0, 2)
    row = await db.fetchrow("""
        INSERT INTO test_reports (id, project_id, total, passed, failed, coverage, logs, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'generated') RETURNING *
    """, str(uuid4()), body.project_id, body.total, body.passed, failed, coverage, body.logs)
    return dict(row)


@router.post("/{report_id}/approve")
async def approve_report(
    report_id: str,
    background: BackgroundTasks,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    report = await db.fetchrow("SELECT * FROM test_reports WHERE id=$1", report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    if report["status"] == "approved":
        raise HTTPException(400, "Report already approved")

    await db.execute(
        "UPDATE test_reports SET status='approved', approved_at=NOW() WHERE id=$1",
        report_id
    )
    background.add_task(_push_to_ppg, dict(report))
    return {"status": "approved", "report_id": report_id}


async def _push_to_ppg(report: dict) -> None:
    async with get_pool().acquire() as db:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                payload = {
                    "report_id": str(report["id"]),
                    "project_id": str(report["project_id"] or ""),
                    "total": report["total"],
                    "passed": report["passed"],
                    "failed": report["failed"],
                    "coverage": float(report["coverage"] or 0),
                    "executed_at": report["executed_at"].isoformat() if report.get("executed_at") else None
                }
                resp = await client.post(f"{PPG_URL}/sync-test", json=payload)
                await db.execute(
                    "UPDATE test_reports SET pushed_at=NOW() WHERE id=$1", str(report["id"])
                )
                logger.info(f"[Test] Pushed report to PPG: {resp.status_code}")
            except Exception as e:
                logger.error(f"[Test] PPG push failed: {e}")
