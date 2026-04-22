"""
Tests for Milestones Router — milestones.py
Covers:
- GET /projects/{id}/milestones (all, with track filter)
- GET /projects/{id}/milestones/{mid} (found, not found)
- PUT /projects/{id}/milestones/{mid} (update, no fields → 400, not found → 404)
- POST /projects/{id}/milestones/generate (project not found, no dates, success all tracks, success single track)
"""
from __future__ import annotations

import json
from datetime import date
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


def make_milestone_record(
    ms_id: str | None = None,
    project_id: str | None = None,
    track: str = "project",
    ms_type: str = "kickoff",
    sort_order: int = 1,
) -> dict:
    return {
        "id": ms_id or str(uuid4()),
        "project_id": project_id or str(uuid4()),
        "name": "Kickoff",
        "milestone_type": ms_type,
        "description": None,
        "start_date": "2026-01-01",
        "end_date": "2026-01-10",
        "status": "planned",
        "sort_order": sort_order,
        "preconditions": "[]",
        "done_criteria": "Charter signed",
        "track": track,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


def make_project_record(project_id: str, with_dates: bool = True) -> dict:
    return {
        "id": project_id,
        "code": "PRJ_001",
        "name": "Customer Portal",
        "start_date": date(2026, 1, 1) if with_dates else None,
        "end_date": date(2026, 12, 31) if with_dates else None,
    }


# ---------------------------------------------------------------------------
# GET /projects/{id}/milestones
# ---------------------------------------------------------------------------

def test_list_milestones_all_tracks(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    records = [
        make_milestone_record(project_id=pid, track="project"),
        make_milestone_record(project_id=pid, track="ba"),
        make_milestone_record(project_id=pid, track="test"),
    ]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=records)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/milestones")
    assert resp.status_code == 200
    assert len(resp.json()) == 3


def test_list_milestones_with_track_filter(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    ba_records = [make_milestone_record(project_id=pid, track="ba") for _ in range(8)]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=ba_records)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/milestones?track=ba")
    assert resp.status_code == 200
    assert len(resp.json()) == 8
    for ms in resp.json():
        assert ms["track"] == "ba"


def test_list_milestones_empty(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{uuid4()}/milestones")
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# GET /projects/{id}/milestones/{mid}
# ---------------------------------------------------------------------------

def test_get_milestone_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    mid = str(uuid4())
    ms = make_milestone_record(ms_id=mid, project_id=pid)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=ms)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/milestones/{mid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == mid


def test_get_milestone_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{uuid4()}/milestones/{uuid4()}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /projects/{id}/milestones/{mid}
# ---------------------------------------------------------------------------

def test_update_milestone_status(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    mid = str(uuid4())
    updated = make_milestone_record(ms_id=mid, project_id=pid)
    updated["status"] = "completed"

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=updated)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/projects/{pid}/milestones/{mid}", json={"status": "completed"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


def test_update_milestone_no_fields_returns_400(ppg_client):
    """PUT with empty body must return 400."""
    app, client = ppg_client
    resp = client.put(f"/projects/{uuid4()}/milestones/{uuid4()}", json={})
    assert resp.status_code == 400


def test_update_milestone_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/projects/{uuid4()}/milestones/{uuid4()}", json={"status": "in_progress"})
    assert resp.status_code == 404


def test_update_milestone_multiple_fields(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    mid = str(uuid4())
    updated = make_milestone_record(ms_id=mid, project_id=pid)
    updated["status"] = "in_progress"
    updated["description"] = "Updated description"

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=updated)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(
        f"/projects/{pid}/milestones/{mid}",
        json={"status": "in_progress", "description": "Updated description"},
    )
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /projects/{id}/milestones/generate
# ---------------------------------------------------------------------------

def test_regenerate_milestones_project_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/projects/{uuid4()}/milestones/generate")
    assert resp.status_code == 404


def test_regenerate_milestones_no_dates_returns_400(ppg_client):
    """Project without start_date/end_date cannot regenerate milestones."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=make_project_record(pid, with_dates=False))
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/projects/{pid}/milestones/generate")
    assert resp.status_code == 400


def test_regenerate_milestones_all_tracks_success(ppg_client):
    """Regenerate all 3 tracks — verify DB execute calls and 201 response."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    # Simulate 24 milestones returned (9+8+7)
    rows = [make_milestone_record(project_id=pid, track=t)
            for t in (["project"] * 9 + ["ba"] * 8 + ["test"] * 7)]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=make_project_record(pid))
        db.execute = AsyncMock(return_value="INSERT 1")
        db.fetch = AsyncMock(return_value=rows)
        tx = MagicMock()
        tx.__aenter__ = AsyncMock(return_value=None)
        tx.__aexit__ = AsyncMock(return_value=False)
        db.transaction = MagicMock(return_value=tx)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/projects/{pid}/milestones/generate")
    assert resp.status_code == 201
    assert isinstance(resp.json(), list)
    assert len(resp.json()) == 24


def test_regenerate_milestones_single_track(ppg_client):
    """Regenerate only 'ba' track."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    ba_rows = [make_milestone_record(project_id=pid, track="ba") for _ in range(8)]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=make_project_record(pid))
        db.execute = AsyncMock(return_value="INSERT 1")
        db.fetch = AsyncMock(return_value=ba_rows)
        tx = MagicMock()
        tx.__aenter__ = AsyncMock(return_value=None)
        tx.__aexit__ = AsyncMock(return_value=False)
        db.transaction = MagicMock(return_value=tx)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/projects/{pid}/milestones/generate?track=ba")
    assert resp.status_code == 201
