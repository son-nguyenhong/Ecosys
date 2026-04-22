"""
Tests for Project Management Router — project_management.py
Covers:
- Stage Gates: list, create (project not found → 404), update, delete
- Health Scores: list, latest, create (invalid RAG → 422), project not found → 404
- Stakeholders: list, create, update, delete
- Priority: get (none, existing), upsert (insert path, update path), WSJF validation
- Portfolio Summary: empty, with projects + health + priority
"""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def ppg_client():
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ppg"))

    from app.main import app  # type: ignore[import]
    from app.auth import get_current_user, TokenPayload  # type: ignore[import]

    fake_user = TokenPayload(sub="test.user", name="Test User", exp=9999999999, iat=1000000000)
    app.dependency_overrides[get_current_user] = lambda: fake_user
    return app, TestClient(app)


def make_project_stub(project_id: str) -> dict:
    """Minimal project record for _assert_project."""
    return {"id": project_id}


def make_stage_gate_record(gate_id: str | None = None, project_id: str | None = None) -> dict:
    return {
        "id": gate_id or str(uuid4()),
        "project_id": project_id or str(uuid4()),
        "stage_name": "Gate 1 — Requirements",
        "stage_order": 1,
        "status": "pending",
        "gate_criteria": json.dumps([{"criterion": "BRD approved", "is_met": False}]),
        "sign_off_by": None,
        "gate_date": None,
        "notes": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


def make_health_record(project_id: str, rag: str = "green") -> dict:
    return {
        "id": str(uuid4()),
        "project_id": project_id,
        "assessed_date": "2026-04-01",
        "overall_rag": rag,
        "schedule_rag": rag,
        "budget_rag": rag,
        "scope_rag": rag,
        "team_rag": rag,
        "risk_rag": rag,
        "health_notes": "{}",
        "assessed_by": "PM Nguyen",
        "created_at": "2026-01-01T00:00:00Z",
    }


def make_stakeholder_record(project_id: str) -> dict:
    return {
        "id": str(uuid4()),
        "project_id": project_id,
        "name": "Nguyen Van Director",
        "role": "Sponsor",
        "organization": "VIB HQ",
        "interest_level": "high",
        "influence_level": "high",
        "engagement_strategy": "Inform weekly",
        "contact_info": "{}",
        "notes": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


def make_priority_record(project_id: str) -> dict:
    return {
        "id": str(uuid4()),
        "project_id": project_id,
        "business_value": 8.0,
        "time_criticality": 7.0,
        "risk_reduction": 5.0,
        "job_size": 3.0,
        "roi_score": 6.0,
        "risk_score": 4.0,
        "wsjf_score": 6.67,
        "priority_rank": 1,
        "notes": None,
        "assessed_at": "2026-04-01",
        "assessed_by": "PM Nguyen",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


# ===========================================================================
# STAGE GATES
# ===========================================================================

def test_list_stage_gates_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    gates = [make_stage_gate_record(project_id=pid) for _ in range(3)]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=make_project_stub(pid))
        db.fetch = AsyncMock(return_value=gates)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/stage-gates")
    assert resp.status_code == 200
    assert len(resp.json()) == 3


def test_list_stage_gates_project_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{uuid4()}/stage-gates")
    assert resp.status_code == 404


def test_create_stage_gate_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    gate = make_stage_gate_record(project_id=pid)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[make_project_stub(pid), gate])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/projects/{pid}/stage-gates", json={
        "stage_name": "Gate 1 — Requirements",
        "stage_order": 1,
        "gate_criteria": [{"criterion": "BRD approved", "is_met": False}],
    })
    assert resp.status_code == 201
    assert resp.json()["stage_name"] == "Gate 1 — Requirements"


def test_update_stage_gate_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/projects/{pid}/stage-gates/{uuid4()}", json={"status": "passed"})
    assert resp.status_code == 404


def test_delete_stage_gate_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.execute = AsyncMock(return_value="DELETE 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/projects/{uuid4()}/stage-gates/{uuid4()}")
    assert resp.status_code == 204


def test_delete_stage_gate_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.execute = AsyncMock(return_value="DELETE 0")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/projects/{uuid4()}/stage-gates/{uuid4()}")
    assert resp.status_code == 404


# ===========================================================================
# HEALTH SCORES
# ===========================================================================

def test_list_health_scores_empty(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=make_project_stub(pid))
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/health")
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_latest_health_none(ppg_client):
    """Returns None (null JSON) when no health score exists yet."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[make_project_stub(pid), None])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/health/latest")
    assert resp.status_code == 200
    assert resp.json() is None


def test_get_latest_health_returns_most_recent(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    health = make_health_record(pid, rag="amber")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[make_project_stub(pid), health])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/health/latest")
    assert resp.status_code == 200
    assert resp.json()["overall_rag"] == "amber"


def test_create_health_score_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    health = make_health_record(pid, rag="red")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[make_project_stub(pid), health])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/projects/{pid}/health", json={
        "overall_rag": "red",
        "schedule_rag": "red",
        "budget_rag": "amber",
        "assessed_by": "PM Nguyen",
    })
    assert resp.status_code == 201
    assert resp.json()["overall_rag"] == "red"


def test_create_health_score_invalid_rag_returns_422(ppg_client):
    """overall_rag must be 'red', 'amber', or 'green'."""
    app, client = ppg_client
    resp = client.post(f"/projects/{uuid4()}/health", json={"overall_rag": "purple"})
    assert resp.status_code == 422


def test_create_health_score_project_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/projects/{uuid4()}/health", json={"overall_rag": "green"})
    assert resp.status_code == 404


# ===========================================================================
# STAKEHOLDERS
# ===========================================================================

def test_list_stakeholders_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    stakeholders = [make_stakeholder_record(pid) for _ in range(2)]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=make_project_stub(pid))
        db.fetch = AsyncMock(return_value=stakeholders)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/stakeholders")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_create_stakeholder_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    stakeholder = make_stakeholder_record(pid)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[make_project_stub(pid), stakeholder])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/projects/{pid}/stakeholders", json={
        "name": "Nguyen Van Director",
        "role": "Sponsor",
        "interest_level": "high",
        "influence_level": "high",
    })
    assert resp.status_code == 201
    assert resp.json()["name"] == "Nguyen Van Director"


def test_create_stakeholder_missing_name_returns_422(ppg_client):
    """name is required."""
    app, client = ppg_client
    resp = client.post(f"/projects/{uuid4()}/stakeholders", json={"role": "Sponsor"})
    assert resp.status_code == 422


def test_update_stakeholder_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(
        f"/projects/{uuid4()}/stakeholders/{uuid4()}",
        json={"influence_level": "low"},
    )
    assert resp.status_code == 404


def test_delete_stakeholder_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.execute = AsyncMock(return_value="DELETE 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/projects/{uuid4()}/stakeholders/{uuid4()}")
    assert resp.status_code == 204


# ===========================================================================
# PRIORITY MODEL
# ===========================================================================

def test_get_priority_returns_none_when_missing(ppg_client):
    """No priority set yet → returns null."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[make_project_stub(pid), None])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/priority")
    assert resp.status_code == 200
    assert resp.json() is None


def test_upsert_priority_insert_path(ppg_client):
    """No existing priority → INSERT new record."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    priority = make_priority_record(pid)

    async def fake_db():
        db = MagicMock()
        # _assert_project → None (no existing priority) → INSERT returns priority
        db.fetchrow = AsyncMock(side_effect=[make_project_stub(pid), None, priority])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/projects/{pid}/priority", json={
        "business_value": 8.0,
        "time_criticality": 7.0,
        "risk_reduction": 5.0,
        "job_size": 3.0,
        "roi_score": 6.0,
        "risk_score": 4.0,
    })
    assert resp.status_code == 200


def test_upsert_priority_update_path(ppg_client):
    """Existing priority → UPDATE record."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    existing_id = {"id": str(uuid4())}
    updated_priority = make_priority_record(pid)
    updated_priority["business_value"] = 9.0

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[make_project_stub(pid), existing_id, updated_priority])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/projects/{pid}/priority", json={
        "business_value": 9.0,
        "time_criticality": 7.0,
        "risk_reduction": 5.0,
        "job_size": 3.0,
    })
    assert resp.status_code == 200


def test_upsert_priority_job_size_zero_returns_422(ppg_client):
    """job_size must be > 0 (denominator in WSJF)."""
    app, client = ppg_client
    resp = client.put(f"/projects/{uuid4()}/priority", json={
        "business_value": 8.0,
        "time_criticality": 7.0,
        "risk_reduction": 5.0,
        "job_size": 0,  # invalid: gt=0
    })
    assert resp.status_code == 422


def test_upsert_priority_value_out_of_range_returns_422(ppg_client):
    """All score fields must be between 0 and 10."""
    app, client = ppg_client
    resp = client.put(f"/projects/{uuid4()}/priority", json={
        "business_value": 11.0,  # > 10 — invalid
        "time_criticality": 7.0,
        "risk_reduction": 5.0,
        "job_size": 3.0,
    })
    assert resp.status_code == 422


# ===========================================================================
# PORTFOLIO SUMMARY
# ===========================================================================

def test_portfolio_summary_empty(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/projects/portfolio/summary")
    assert resp.status_code == 200
    assert resp.json() == []


def test_portfolio_summary_with_projects(ppg_client):
    """Returns projects enriched with health RAG and WSJF score."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid1 = str(uuid4())
    pid2 = str(uuid4())
    projects = [
        {"id": pid1, "name": "Portal A", "code": "PORTAL_A", "status": "active",
         "start_date": "2026-01-01", "end_date": "2026-12-31"},
        {"id": pid2, "name": "Portal B", "code": "PORTAL_B", "status": "active",
         "start_date": "2026-01-01", "end_date": "2026-12-31"},
    ]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=projects)
        # fetchrow called per project: health + priority (2 projects × 2 calls)
        db.fetchrow = AsyncMock(side_effect=[
            {"overall_rag": "green", "assessed_date": "2026-04-01"},
            {"wsjf_score": 7.5, "priority_rank": 1},
            {"overall_rag": "amber", "assessed_date": "2026-04-01"},
            {"wsjf_score": 4.2, "priority_rank": 2},
        ])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/projects/portfolio/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["latest_health_rag"] == "green"
    assert data[0]["wsjf_score"] == pytest.approx(7.5)
    assert data[1]["latest_health_rag"] == "amber"


def test_portfolio_summary_with_year_filter(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/projects/portfolio/summary?year=2026")
    assert resp.status_code == 200
    assert resp.json() == []
