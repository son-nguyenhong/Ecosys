"""
Test Cases Router — test_cases table (reference schema)
State machine: generated → reviewed → approved → executed
With reject: reviewed → reject → generated
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from uuid import uuid4
import asyncpg, json

from app.auth import CurrentUser
from app.database import get_db

router = APIRouter(prefix="/test-cases", tags=["test-cases"])

# State machine with reject path
TRANSITIONS = {
    "generated": {"review": "reviewed"},
    "reviewed":  {"approve": "approved", "reject": "generated"},
    "approved":  {"execute": "executed"},
}


class TestCaseCreate(BaseModel):
    brs_id: Optional[str] = None
    brs_sync_id: Optional[str] = None
    title: str = Field(..., max_length=500)
    module: Optional[str] = Field(None, max_length=255)
    steps: Optional[list] = None
    expected_result: Optional[str] = None
    playwright_script: Optional[str] = None


class TestCaseAction(BaseModel):
    action: str  # review | approve | reject | execute


@router.get("")
async def list_test_cases(
    brs_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    conditions, params, idx = [], [], 1
    if brs_id:
        conditions.append(f"brs_id=${idx}"); params.append(brs_id); idx += 1
    if status:
        conditions.append(f"status=${idx}"); params.append(status); idx += 1
    q = "SELECT * FROM test_cases"
    if conditions:
        q += " WHERE " + " AND ".join(conditions)
    q += " ORDER BY created_at DESC"
    rows = await db.fetch(q, *params)
    return [dict(r) for r in rows]


@router.post("", status_code=201)
async def create_test_case(
    body: TestCaseCreate,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow("""
        INSERT INTO test_cases
            (id, brs_id, brs_sync_id, title, module, steps, expected_result, playwright_script, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'generated') RETURNING *
    """, str(uuid4()), body.brs_id, body.brs_sync_id,
        body.title, body.module,
        json.dumps(body.steps or []),
        body.expected_result, body.playwright_script)
    return dict(row)


@router.put("/{case_id}/action")
async def test_case_action(
    case_id: str,
    body: TestCaseAction,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    case = await db.fetchrow("SELECT * FROM test_cases WHERE id=$1", case_id)
    if not case:
        raise HTTPException(404, "Test case not found")

    allowed = TRANSITIONS.get(case["status"], {})
    if body.action not in allowed:
        raise HTTPException(
            400,
            f"Action '{body.action}' not allowed in status '{case['status']}'. "
            f"Allowed: {list(allowed.keys())}"
        )

    new_status = allowed[body.action]
    updated = await db.fetchrow(
        "UPDATE test_cases SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *",
        case_id, new_status,
    )
    return dict(updated)


@router.delete("/{case_id}", status_code=204)
async def delete_test_case(
    case_id: str,
    user: CurrentUser = None,
    db: asyncpg.Connection = Depends(get_db),
):
    await db.execute("DELETE FROM test_cases WHERE id=$1", case_id)
