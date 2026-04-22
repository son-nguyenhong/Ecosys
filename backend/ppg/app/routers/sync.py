"""
Sync endpoints — receive data from BA Workflow and Test Platform
Internal endpoints — no user auth required
"""
from fastapi import APIRouter, Depends
import asyncpg
import json
import logging

from app.database import get_db

router = APIRouter(tags=["sync"])
logger = logging.getLogger(__name__)


@router.post("/sync-doc", status_code=200)
async def sync_doc(payload: dict, db: asyncpg.Connection = Depends(get_db)):
    """Receive approved document from BA Workflow"""
    try:
        # Try to sync to project_documents table
        doc_id = payload.get("doc_id") or payload.get("id")
        project_id = payload.get("project_id")
        if doc_id and project_id:
            await db.execute("""
                INSERT INTO project_documents (project_id, doc_ref_id, doc_type, version, title, status)
                VALUES ($1,$2,$3,$4,$5,$6)
                ON CONFLICT (doc_ref_id) DO UPDATE SET
                    status=EXCLUDED.status, version=EXCLUDED.version
            """, project_id, str(doc_id),
                payload.get("doc_type"), payload.get("version"),
                payload.get("title"), payload.get("status", "approved"))
    except Exception as e:
        logger.warning(f"sync-doc insert warning: {e}")
    return {"status": "received"}


@router.post("/sync-test", status_code=200)
async def sync_test(payload: dict, db: asyncpg.Connection = Depends(get_db)):
    """Receive test metrics from Test Platform"""
    try:
        project_id = payload.get("project_id")
        if project_id:
            await db.execute("""
                INSERT INTO test_results
                    (project_id, report_ref, total_cases, passed, failed, coverage, executed_at)
                VALUES ($1,$2,$3,$4,$5,$6,NOW())
            """, project_id,
                str(payload.get("report_id", "")),
                payload.get("total", 0), payload.get("passed", 0),
                payload.get("failed", 0), payload.get("coverage", 0))
    except Exception as e:
        logger.warning(f"sync-test insert warning: {e}")
    return {"status": "received"}
