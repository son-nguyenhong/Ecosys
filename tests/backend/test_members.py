"""
Tests for Members Router — members.py
Covers:
- GET /projects/{id}/members
- POST /projects/{id}/members (success, validation)
- PUT /projects/{id}/members/{mid} (success, no fields → 400, not found → 404)
- DELETE /projects/{id}/members/{mid} (success, not found → 404)
"""
from __future__ import annotations

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


def make_member_record(
    member_id: str | None = None,
    project_id: str | None = None,
    full_name: str = "Nguyen Van A",
    role: str = "BA",
    is_active: bool = True,
) -> dict:
    return {
        "id": member_id or str(uuid4()),
        "project_id": project_id or str(uuid4()),
        "full_name": full_name,
        "alias": "nva",
        "email": "nva@vib.com.vn",
        "role": role,
        "is_active": is_active,
        "created_at": "2026-01-01T00:00:00Z",
    }


# ---------------------------------------------------------------------------
# GET /projects/{id}/members
# ---------------------------------------------------------------------------

def test_list_members_empty(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{uuid4()}/members")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_members_returns_all(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    members = [
        make_member_record(project_id=pid, full_name="Nguyen Van A", role="BA"),
        make_member_record(project_id=pid, full_name="Tran Thi B", role="QA"),
        make_member_record(project_id=pid, full_name="Le Van C", role="Dev"),
    ]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=members)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{pid}/members")
    assert resp.status_code == 200
    assert len(resp.json()) == 3
    assert resp.json()[0]["full_name"] == "Nguyen Van A"


# ---------------------------------------------------------------------------
# POST /projects/{id}/members
# ---------------------------------------------------------------------------

def test_create_member_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    created = make_member_record(project_id=pid)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=created)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/projects/{pid}/members", json={
        "full_name": "Nguyen Van A",
        "email": "nva@vib.com.vn",
        "role": "BA",
        "alias": "nva",
    })
    assert resp.status_code == 201
    assert resp.json()["full_name"] == "Nguyen Van A"


def test_create_member_minimal_fields(ppg_client):
    """Only full_name is required; others are optional."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    created = make_member_record(project_id=pid)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=created)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/projects/{pid}/members", json={"full_name": "Nguyen Van A"})
    assert resp.status_code == 201


def test_create_member_missing_full_name_returns_422(ppg_client):
    """full_name is required — missing → 422."""
    app, client = ppg_client
    resp = client.post(f"/projects/{uuid4()}/members", json={"email": "a@b.com", "role": "BA"})
    assert resp.status_code == 422


def test_create_member_name_too_long_returns_422(ppg_client):
    """full_name max_length=255."""
    app, client = ppg_client
    resp = client.post(f"/projects/{uuid4()}/members", json={"full_name": "A" * 256})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# PUT /projects/{id}/members/{mid}
# ---------------------------------------------------------------------------

def test_update_member_role(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    mid = str(uuid4())
    updated = make_member_record(member_id=mid, project_id=pid, role="PM")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=updated)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/projects/{pid}/members/{mid}", json={"role": "PM"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "PM"


def test_update_member_deactivate(ppg_client):
    """Set is_active=false to deactivate member."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    mid = str(uuid4())
    updated = make_member_record(member_id=mid, project_id=pid, is_active=False)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=updated)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/projects/{pid}/members/{mid}", json={"is_active": False})
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


def test_update_member_no_fields_returns_400(ppg_client):
    """Empty body must return 400."""
    app, client = ppg_client
    resp = client.put(f"/projects/{uuid4()}/members/{uuid4()}", json={})
    assert resp.status_code == 400


def test_update_member_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/projects/{uuid4()}/members/{uuid4()}", json={"role": "Dev"})
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /projects/{id}/members/{mid}
# ---------------------------------------------------------------------------

def test_delete_member_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.execute = AsyncMock(return_value="DELETE 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/projects/{uuid4()}/members/{uuid4()}")
    assert resp.status_code == 204


def test_delete_member_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.execute = AsyncMock(return_value="DELETE 0")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/projects/{uuid4()}/members/{uuid4()}")
    assert resp.status_code == 404
