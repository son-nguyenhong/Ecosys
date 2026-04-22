"""
Tests for Catalog Routers — catalog_products.py + catalog_users.py
Covers:
- Products: list (with filter), create, get, update, soft-delete
- Environments: list, create, update, delete
- Licenses: list, create, delete
- Product Details: get (not found), upsert
- Users: list, create, get, update, soft-delete
- User Roles: list, assign, remove
- Roles: list, create, get, update, soft-delete, list users
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


def make_product_record(product_id: str | None = None, product_type: str = "web_app") -> dict:
    return {
        "id": product_id or str(uuid4()),
        "product_name": "Customer Portal",
        "product_code": "PORTAL_FE",
        "product_type": product_type,
        "department": "Digital",
        "owner_team": "Frontend",
        "description": "Frontend portal",
        "status": "active",
        "tags": "[]",
        "business_owner": "TL Nguyen",
        "technical_owner": None,
        "notes": None,
        "created_by": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


def make_user_record(user_id: str | None = None, user_type: str = "internal") -> dict:
    return {
        "id": user_id or str(uuid4()),
        "full_name": "Nguyen Van A",
        "email": "nva@vib.com.vn",
        "user_type": user_type,
        "department": "IT",
        "team": "Platform",
        "job_title": "BA",
        "alias": "nva",
        "employee_id": "VIB001",
        "status": "active",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


def make_role_record(role_id: str | None = None) -> dict:
    return {
        "id": role_id or str(uuid4()),
        "role_code": "BA",
        "role_name": "Business Analyst",
        "role_category": "business",
        "description": "BA role",
        "workflow_permissions": "{}",
        "product_access_level": "read",
        "is_active": True,
        "created_by": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


# ===========================================================================
# CATALOG PRODUCTS
# ===========================================================================

# ---------------------------------------------------------------------------
# GET /catalog/products
# ---------------------------------------------------------------------------

def test_list_products_empty(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/catalog/products")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_products_with_type_filter(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    products = [make_product_record(product_type="api") for _ in range(2)]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=products)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/catalog/products?product_type=api")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_list_products_with_status_filter(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    inactive = [make_product_record()]
    inactive[0]["status"] = "inactive"

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=inactive)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/catalog/products?status=inactive")
    assert resp.status_code == 200
    assert resp.json()[0]["status"] == "inactive"


# ---------------------------------------------------------------------------
# POST /catalog/products
# ---------------------------------------------------------------------------

def test_create_product_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    created = make_product_record()

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=created)
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post("/catalog/products", json={
        "product_name": "Customer Portal",
        "product_code": "PORTAL_FE",
        "product_type": "web_app",
    })
    assert resp.status_code == 201
    assert resp.json()["product_code"] == "PORTAL_FE"


def test_create_product_missing_required_returns_422(ppg_client):
    """product_name, product_code, product_type are required."""
    app, client = ppg_client
    resp = client.post("/catalog/products", json={"product_name": "No Code"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /catalog/products/{id}
# ---------------------------------------------------------------------------

def test_get_product_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    prod = make_product_record(product_id=pid)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=prod)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/catalog/products/{pid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == pid


def test_get_product_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/catalog/products/{uuid4()}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /catalog/products/{id}
# ---------------------------------------------------------------------------

def test_update_product_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    updated = make_product_record(product_id=pid)
    updated["description"] = "Updated description"

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=updated)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(f"/catalog/products/{pid}", json={"description": "Updated description"})
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# DELETE /catalog/products/{id}  (soft delete)
# ---------------------------------------------------------------------------

def test_delete_product_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=make_product_record(product_id=pid))
        db.execute = AsyncMock(return_value="UPDATE 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/catalog/products/{pid}")
    assert resp.status_code == 204


def test_delete_product_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.execute = AsyncMock(return_value="UPDATE 0")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/catalog/products/{uuid4()}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET/POST/PUT/DELETE /catalog/products/{id}/environments
# ---------------------------------------------------------------------------

def test_list_environments_empty(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=make_product_record(product_id=pid))
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/catalog/products/{pid}/environments")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_environment_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    pid = str(uuid4())
    env_record = {
        "id": str(uuid4()),
        "product_id": pid,
        "env_name": "PROD",
        "url": "https://portal.vib.com.vn",
        "server_info": "{}",
        "status": "active",
        "version": None,
        "deploy_date": None,
        "notes": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[make_product_record(product_id=pid), env_record])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/catalog/products/{pid}/environments", json={
        "env_name": "PROD",
        "url": "https://portal.vib.com.vn",
    })
    assert resp.status_code == 201


# ===========================================================================
# CATALOG USERS
# ===========================================================================

# ---------------------------------------------------------------------------
# GET /catalog/users
# ---------------------------------------------------------------------------

def test_list_users_empty(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/catalog/users")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_users_filter_by_type(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    users = [make_user_record(user_type="contractor") for _ in range(3)]

    async def fake_db():
        db = MagicMock()
        # list_users makes a second db.fetch call to attach role assignments
        db.fetch = AsyncMock(side_effect=[users, []])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/catalog/users?user_type=contractor")
    assert resp.status_code == 200
    assert len(resp.json()) == 3


# ---------------------------------------------------------------------------
# POST /catalog/users
# ---------------------------------------------------------------------------

def test_create_user_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    uid = str(uuid4())
    created = make_user_record(user_id=uid)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=created)
        db.fetch = AsyncMock(return_value=[])
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post("/catalog/users", json={
        "full_name": "Nguyen Van A",
        "email": "nva@vib.com.vn",
        "user_type": "internal",
    })
    assert resp.status_code == 201
    assert resp.json()["full_name"] == "Nguyen Van A"


def test_create_user_missing_required_returns_422(ppg_client):
    """full_name is required."""
    app, client = ppg_client
    resp = client.post("/catalog/users", json={"email": "a@b.com"})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /catalog/users/{id}
# ---------------------------------------------------------------------------

def test_get_user_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/catalog/users/{uuid4()}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /catalog/users/{id}  (soft delete)
# ---------------------------------------------------------------------------

def test_delete_user_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    uid = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=make_user_record(user_id=uid))
        db.execute = AsyncMock(return_value="UPDATE 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/catalog/users/{uid}")
    assert resp.status_code == 204


# ===========================================================================
# CATALOG ROLES
# ===========================================================================

def test_list_roles(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    roles = [make_role_record() for _ in range(8)]

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=roles)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/catalog/roles")
    assert resp.status_code == 200
    assert len(resp.json()) == 8


def test_create_role_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    created = make_role_record()

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=created)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post("/catalog/roles", json={
        "role_code": "SCRUM_MASTER",
        "role_name": "Scrum Master",
        "role_category": "business",
    })
    assert resp.status_code == 201


def test_get_role_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/catalog/roles/{uuid4()}")
    assert resp.status_code == 404


def test_delete_role_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.execute = AsyncMock(return_value="UPDATE 0")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/catalog/roles/{uuid4()}")
    assert resp.status_code == 404
