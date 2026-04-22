"""
Tests for Auth Router — auth.py
Covers:
- POST /auth/login: success, wrong password, user not found, inactive user
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

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
    return app, TestClient(app)


def _hashed_password(plain: str) -> str:
    """Helper: hash a password the same way the app does."""
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ppg"))
    from app.auth import hash_password  # type: ignore[import]
    return hash_password(plain)


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

def test_login_success(ppg_client):
    """Valid credentials return access_token."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plain_pw = "securepassword123"
    hashed = _hashed_password(plain_pw)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value={
            "username": "john.doe",
            "full_name": "John Doe",
            "password_hash": hashed,
            "is_active": True,
        })
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post("/auth/login", json={"username": "john.doe", "password": plain_pw})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["access_token"] != ""


def test_login_wrong_password_returns_401(ppg_client):
    """Wrong password → 401 Unauthorized."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    hashed = _hashed_password("correctpassword")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value={
            "username": "john.doe",
            "full_name": "John Doe",
            "password_hash": hashed,
            "is_active": True,
        })
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post("/auth/login", json={"username": "john.doe", "password": "wrongpassword"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


def test_login_user_not_found_returns_401(ppg_client):
    """Non-existent user → 401 (not 404, to prevent user enumeration)."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post("/auth/login", json={"username": "ghost", "password": "any"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


def test_login_inactive_user_returns_401(ppg_client):
    """Inactive account must not be allowed to login."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    hashed = _hashed_password("password123")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value={
            "username": "inactive.user",
            "full_name": "Inactive User",
            "password_hash": hashed,
            "is_active": False,
        })
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post("/auth/login", json={"username": "inactive.user", "password": "password123"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials"


def test_login_missing_fields_returns_422(ppg_client):
    """Missing username/password → 422 Pydantic validation error."""
    _, client = ppg_client
    resp = client.post("/auth/login", json={"username": "only.username"})
    assert resp.status_code == 422


def test_login_empty_body_returns_422(ppg_client):
    """Empty body → 422."""
    _, client = ppg_client
    resp = client.post("/auth/login", json={})
    assert resp.status_code == 422
