"""
Tests for Projects Router — projects.py
Covers:
- GET /projects (list, year filter, all_years)
- POST /projects (create success with/without dates, duplicate code → 409)
- GET /projects/{id} (found, not found)
- PUT /projects/{id} (update)
- DELETE /projects/{id} (archive, not found)
- GET /projects/{id}/dashboard
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


def make_project_record(
    project_id: str | None = None,
    code: str = "PRJ_001",
    name: str = "Customer Portal",
    status: str = "active",
    start_date: str | None = "2026-01-01",
    end_date: str | None = "2026-12-31",
) -> dict:
    return {
        "id": project_id or str(uuid4()),
        "code": code,
        "name": name,
        "description": "Test project",
        "status": status,
        "owner": "PM Nguyen",
        "start_date": start_date,
        "end_date": end_date,
        "plan_id": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


# ---------------------------------------------------------------------------
# GET /projects
# ---------------------------------------------------------------------------

def test_list_projects_empty(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/projects")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_projects_with_year_filter(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    proj = make_project_record()

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=[proj])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/projects?year=2026")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["code"] == "PRJ_001"


def test_list_projects_all_years(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    projects = [make_project_record(code=f"PRJ_00{i}") for i in range(3)]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=projects)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/projects?all_years=true")
    assert resp.status_code == 200
    assert len(resp.json()) == 3


def test_list_projects_with_status_filter(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    archived = make_project_record(status="archived")

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=[archived])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/projects?status=archived")
    assert resp.status_code == 200
    assert resp.json()[0]["status"] == "archived"


# ---------------------------------------------------------------------------
# POST /projects
# ---------------------------------------------------------------------------

def test_create_project_success_with_dates(ppg_client):
    """Bug fix: start_date/end_date as ISO strings must be parsed to date objects — no 500."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    project_id = str(uuid4())
    proj = make_project_record(project_id=project_id)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=proj)
        db.execute = AsyncMock(return_value="INSERT 1")
        db.fetch = AsyncMock(return_value=[])
        tx = MagicMock()
        tx.__aenter__ = AsyncMock(return_value=None)
        tx.__aexit__ = AsyncMock(return_value=False)
        db.transaction = MagicMock(return_value=tx)
        yield db

    app.dependency_overrides[get_db] = fake_db

    resp = client.post("/projects", json={
        "code": "PRJ_001",
        "name": "Customer Portal",
        "start_date": "2026-01-01",
        "end_date": "2026-12-31",
    })
    assert resp.status_code == 201
    assert resp.json()["code"] == "PRJ_001"


def test_create_project_without_dates(ppg_client):
    """Project without dates: auto_milestones skipped, project still created."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    proj = make_project_record(start_date=None, end_date=None)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=proj)
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db

    resp = client.post("/projects", json={
        "code": "PRJ_002",
        "name": "No Date Project",
    })
    assert resp.status_code == 201


def test_create_project_duplicate_code_returns_409(ppg_client):
    """Duplicate project code must return 409, not 500."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]
    import asyncpg  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(
            side_effect=asyncpg.UniqueViolationError(
                "duplicate key value violates unique constraint"
            )
        )
        yield db

    app.dependency_overrides[get_db] = fake_db

    resp = client.post("/projects", json={
        "code": "EXISTING_CODE",
        "name": "Duplicate Project",
    })
    assert resp.status_code == 409
    assert "already exists" in resp.json()["detail"]


def test_create_project_missing_required_fields_returns_422(ppg_client):
    """Pydantic validation: code and name are required."""
    app, client = ppg_client
    resp = client.post("/projects", json={"description": "no code or name"})
    assert resp.status_code == 422


def test_create_project_code_too_long_returns_422(ppg_client):
    """code max_length=50."""
    app, client = ppg_client
    resp = client.post("/projects", json={
        "code": "A" * 51,
        "name": "Valid Name",
    })
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /projects/{project_id}
# ---------------------------------------------------------------------------

def test_get_project_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    proj = make_project_record(project_id=pid)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=proj)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == pid


def test_get_project_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{uuid4()}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /projects/{project_id}
# ---------------------------------------------------------------------------

def test_update_project_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    updated = make_project_record(project_id=pid, name="Updated Name", status="archived")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=updated)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/projects/{pid}", json={"name": "Updated Name", "status": "archived"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"


def test_update_project_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/projects/{uuid4()}", json={"name": "Ghost"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /projects/{project_id}
# ---------------------------------------------------------------------------

def test_archive_project_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.execute = AsyncMock(return_value="UPDATE 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/projects/{uuid4()}")
    assert resp.status_code == 204


def test_archive_project_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.execute = AsyncMock(return_value="UPDATE 0")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/projects/{uuid4()}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /projects/{project_id}/dashboard
# ---------------------------------------------------------------------------

def test_get_dashboard_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    proj = make_project_record(project_id=pid)
    docs = [
        {"doc_type": "BRD"},
        {"doc_type": "BRD"},
        {"doc_type": "BRS"},
    ]
    tests = [
        {"total_cases": 100, "passed": 85},
        {"total_cases": 50, "passed": 40},
    ]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=proj)
        db.fetch = AsyncMock(side_effect=[docs, tests])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/dashboard")
    assert resp.status_code == 200
    body = resp.json()
    assert body["doc_count"] == 3
    assert body["docs_by_type"]["BRD"] == 2
    assert body["total_test_cases"] == 150
    assert body["passed_tests"] == 125
    assert body["test_coverage"] == pytest.approx(83.3, abs=0.1)


def test_get_dashboard_project_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{uuid4()}/dashboard")
    assert resp.status_code == 404


def test_get_dashboard_zero_test_cases(ppg_client):
    """Coverage should be 0 when no test cases, not ZeroDivisionError."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=make_project_record(project_id=pid))
        db.fetch = AsyncMock(side_effect=[[], []])  # no docs, no tests
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/dashboard")
    assert resp.status_code == 200
    assert resp.json()["test_coverage"] == 0
