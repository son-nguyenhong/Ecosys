"""
BRS Sync Router — brs_sync table (reference schema)
Receive BRS from BA Workflow, trigger test case generation
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from uuid import uuid4
import asyncpg, json, logging

from app.auth import CurrentUser
from app.database import get_db, get_pool
from app.services.test_generator import generate_test_cases_from_brs

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/brs", tags=["brs"])


class BRSReceive(BaseModel):
    brs_id: str
    version: str = "v1.0"
    project_id: Optional[str] = None
    content: Optional[dict] = None


@router.get("")
async def list_brs(
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    rows = await db.fetch("SELECT * FROM brs_sync ORDER BY synced_at DESC")
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def receive_brs(
    data: BRSReceive,
    background: BackgroundTasks,
    db: asyncpg.Connection = Depends(get_db),
):
    """Receive approved BRS from BA Workflow"""
    existing = await db.fetchrow(
        "SELECT id FROM brs_sync WHERE brs_id=$1 AND version=$2",
        data.brs_id, data.version
    )
    if existing:
        return {"message": "BRS version already synced", "brs_id": data.brs_id}

    row = await db.fetchrow("""
        INSERT INTO brs_sync (id, brs_id, version, project_id, payload)
        VALUES ($1,$2,$3,$4,$5) RETURNING id
    """, str(uuid4()), data.brs_id, data.version,
        data.project_id, json.dumps(data.content or {}))

    sync_id = str(row["id"])
    background.add_task(_generate_cases_bg, sync_id, data)
    return {"message": "BRS received, generating test cases", "brs_sync_id": sync_id}


@router.post("/{brs_id}/rediff")
async def rediff_brs(
    brs_id: str,
    background: BackgroundTasks,
    db: asyncpg.Connection = Depends(get_db),
):
    """Re-generate test cases from latest BRS version"""
    row = await db.fetchrow(
        "SELECT * FROM brs_sync WHERE brs_id=$1 ORDER BY synced_at DESC LIMIT 1", brs_id
    )
    if not row:
        raise HTTPException(404, "BRS not found")
    payload = row["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    data = BRSReceive(
        brs_id=brs_id, version=row["version"],
        project_id=str(row["project_id"]) if row["project_id"] else None,
        content=payload
    )
    background.add_task(_generate_cases_bg, str(row["id"]), data)
    return {"message": "Regenerating test cases"}


async def _generate_cases_bg(sync_id: str, brs: BRSReceive) -> None:
    cases = generate_test_cases_from_brs(brs.content or {}, brs.brs_id)
    async with get_pool().acquire() as db:
        for case in cases:
            await db.execute("""
                INSERT INTO test_cases
                    (id, brs_id, brs_sync_id, title, module, steps, expected_result, playwright_script)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            """, str(uuid4()), brs.brs_id, sync_id,
                case["title"], case.get("module"),
                json.dumps(case.get("steps", [])),
                case.get("expected_result"),
                case.get("playwright_script"))
    logger.info(f"[Test] Generated {len(cases)} test cases from BRS {brs.brs_id}")
