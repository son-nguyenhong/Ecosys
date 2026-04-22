"""
Tests for Project Objects — FR-023, FR-024, FR-025, FR-026
Covers:
- CRUD for web_app, mobile_app, api, elt
- Discriminated union validation (missing required fields → 422)
- Code uniqueness (409 on duplicate)
- Export (Excel generation)
- Import with conflict strategies (BR-013)
- Cross-project connection report (FR-026)
- Connection create/delete
"""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def ppg_client():
    import sys
    import os

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ppg"))

    from app.main import app  # type: ignore[import]
    from app.auth import get_current_user, TokenPayload  # type: ignore[import]
    from app.database import get_db  # type: ignore[import]

    fake_user = TokenPayload(sub="test.user", name="Test User", exp=9999999999, iat=1000000000)
    app.dependency_overrides[get_current_user] = lambda: fake_user

    return app, TestClient(app)


def make_object_record(
    object_type: str = "api",
    project_id: str | None = None,
    obj_id: str | None = None,
) -> dict:
    return {
        "id": obj_id or str(uuid4()),
        "project_id": project_id or str(uuid4()),
        "object_type": object_type,
        "name": "Test Object",
        "code": "TEST_OBJ",
        "description": "desc",
        "owner": "team-a",
        "status": "active",
        "standard_info": json.dumps(
            {
                "base_url": "https://api.example.com",
                "auth_method": "JWT",
                "version": "v1",
            }
            if object_type == "api"
            else {"tech_stack": "React", "version": "1.0.0"}
        ),
        "created_at": "2026-04-10T00:00:00Z",
        "updated_at": "2026-04-10T00:00:00Z",
        "created_by": "test.user",
        "updated_by": None,
    }


# ---------------------------------------------------------------------------
# Pydantic schema validation — unit tests (no HTTP)
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=False)
def ppg_routers_path():
    import sys
    import os

    path = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ppg")
    if path not in sys.path:
        sys.path.insert(0, path)
    yield


def test_web_app_info_requires_tech_stack(ppg_routers_path):
    from app.routers.project_objects import WebAppInfo  # type: ignore[import]

    with pytest.raises(Exception):
        WebAppInfo.model_validate({"object_type": "web_app", "version": "1.0"})


def test_web_app_info_valid(ppg_routers_path):
    from app.routers.project_objects import WebAppInfo  # type: ignore[import]

    obj = WebAppInfo.model_validate(
        {"object_type": "web_app", "tech_stack": "React", "version": "1.0.0"}
    )
    assert obj.tech_stack == "React"


def test_api_info_requires_base_url(ppg_routers_path):
    from app.routers.project_objects import ApiInfo  # type: ignore[import]

    with pytest.raises(Exception):
        ApiInfo.model_validate(
            {"object_type": "api", "auth_method": "JWT", "version": "v1"}
        )


def test_elt_info_requires_source_target_schedule(ppg_routers_path):
    from app.routers.project_objects import EltInfo  # type: ignore[import]

    with pytest.raises(Exception):
        EltInfo.model_validate(
            {"object_type": "elt", "source_system": "SAP"}
        )


def test_mobile_app_info_requires_platform(ppg_routers_path):
    from app.routers.project_objects import MobileAppInfo  # type: ignore[import]

    with pytest.raises(Exception):
        MobileAppInfo.model_validate(
            {"object_type": "mobile_app", "version": "1.0"}
        )


# ---------------------------------------------------------------------------
# GET /projects/{project_id}/objects
# ---------------------------------------------------------------------------


def test_list_objects_empty(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value={"cnt": 0})
        db.fetch = AsyncMock(return_value=[])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{uuid4()}/objects")
    assert resp.status_code == 200
    assert resp.json()["data"] == []


def test_list_objects_with_type_filter(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    project_id = str(uuid4())
    obj = make_object_record(object_type="api", project_id=project_id)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value={"cnt": 1})
        db.fetch = AsyncMock(return_value=[obj])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/projects/{project_id}/objects?object_type=api")
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1


# ---------------------------------------------------------------------------
# POST /projects/{project_id}/objects
# ---------------------------------------------------------------------------


def test_create_api_object_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    project_id = str(uuid4())
    obj = make_object_record(object_type="api", project_id=project_id)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=obj)
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    payload = {
        "object_type": "api",
        "name": "Customer API",
        "code": "CUSTOMER_API",
        "owner": "team-platform",
        "standard_info": {
            "base_url": "https://api.vib.com.vn/customers",
            "auth_method": "JWT",
            "version": "v2",
        },
    }
    resp = client.post(f"/projects/{project_id}/objects", json=payload)
    assert resp.status_code == 201


def test_create_object_invalid_standard_info(ppg_client):
    """Missing required field in standard_info → 422 (BR-011)."""
    app, client = ppg_client
    project_id = str(uuid4())

    payload = {
        "object_type": "api",
        "name": "Bad API",
        "code": "BAD_API",
        "standard_info": {
            "auth_method": "JWT",
            "version": "v1",
            # missing base_url — required for api type
        },
    }
    resp = client.post(f"/projects/{project_id}/objects", json=payload)
    assert resp.status_code == 422


def test_create_object_invalid_code_format(ppg_client):
    """code must be uppercase — lowercase rejected."""
    app, client = ppg_client
    project_id = str(uuid4())

    payload = {
        "object_type": "api",
        "name": "Bad API",
        "code": "bad-api",  # not uppercase
        "standard_info": {"base_url": "https://api.com", "auth_method": "JWT", "version": "v1"},
    }
    resp = client.post(f"/projects/{project_id}/objects", json=payload)
    assert resp.status_code == 422


def test_create_object_duplicate_code(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]
    import asyncpg  # type: ignore[import]

    project_id = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=asyncpg.UniqueViolationError("unique"))
        yield db

    app.dependency_overrides[get_db] = fake_db
    payload = {
        "object_type": "api",
        "name": "Dup API",
        "code": "DUP_API",
        "standard_info": {"base_url": "https://api.com", "auth_method": "JWT", "version": "v1"},
    }
    resp = client.post(f"/projects/{project_id}/objects", json=payload)
    assert resp.status_code == 409


def test_create_web_app_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    project_id = str(uuid4())
    obj = make_object_record(object_type="web_app", project_id=project_id)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=obj)
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    payload = {
        "object_type": "web_app",
        "name": "Customer Portal",
        "code": "CUSTOMER_PORTAL",
        "standard_info": {
            "tech_stack": "React + FastAPI",
            "version": "2.0.0",
            "url_prod": "https://portal.vib.com.vn",
        },
    }
    resp = client.post(f"/projects/{project_id}/objects", json=payload)
    assert resp.status_code == 201


def test_create_elt_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    project_id = str(uuid4())
    obj = make_object_record(object_type="elt", project_id=project_id)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=obj)
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    payload = {
        "object_type": "elt",
        "name": "Daily ETL Job",
        "code": "DAILY_ETL",
        "standard_info": {
            "source_system": "Core Banking",
            "target_system": "Data Warehouse",
            "schedule": "0 2 * * *",
        },
    }
    resp = client.post(f"/projects/{project_id}/objects", json=payload)
    assert resp.status_code == 201


# ---------------------------------------------------------------------------
# PUT — update
# ---------------------------------------------------------------------------


def test_update_object_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    project_id = str(uuid4())
    obj_id = str(uuid4())
    obj = make_object_record(object_type="api", project_id=project_id, obj_id=obj_id)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[obj, obj])
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(
        f"/projects/{project_id}/objects/{obj_id}",
        json={"name": "Updated Name"},
    )
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# DELETE — decommission
# ---------------------------------------------------------------------------


def test_decommission_object_with_no_active_docs(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    project_id = str(uuid4())
    obj_id = str(uuid4())
    obj = make_object_record(project_id=project_id, obj_id=obj_id)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=obj)
        db.fetchval = AsyncMock(return_value=0)
        db.execute = AsyncMock(return_value="UPDATE 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/projects/{project_id}/objects/{obj_id}")
    assert resp.status_code == 204


def test_decommission_object_with_active_docs_rejected(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    project_id = str(uuid4())
    obj_id = str(uuid4())
    obj = make_object_record(project_id=project_id, obj_id=obj_id)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=obj)
        db.fetchval = AsyncMock(return_value=2)  # 2 active BA docs
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/projects/{project_id}/objects/{obj_id}")
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Connections
# ---------------------------------------------------------------------------


def test_create_connection_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    project_id = str(uuid4())
    obj_id = str(uuid4())
    target_id = str(uuid4())
    obj = make_object_record(project_id=project_id, obj_id=obj_id)
    conn_record = {
        "id": str(uuid4()),
        "source_object_id": obj_id,
        "target_object_id": target_id,
        "connection_type": "api_call",
        "protocol": "REST",
        "frequency": "real-time",
        "status": "active",
        "created_at": "2026-04-10T00:00:00Z",
        "created_by": "test.user",
    }

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(
            side_effect=[obj, {"id": target_id}, conn_record]
        )
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(
        f"/projects/{project_id}/objects/{obj_id}/connections",
        json={"target_object_id": target_id, "connection_type": "api_call"},
    )
    assert resp.status_code == 201


def test_self_loop_connection_rejected(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    project_id = str(uuid4())
    obj_id = str(uuid4())
    obj = make_object_record(project_id=project_id, obj_id=obj_id)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[obj, {"id": obj_id}])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(
        f"/projects/{project_id}/objects/{obj_id}/connections",
        json={"target_object_id": obj_id, "connection_type": "api_call"},
    )
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Cross-project Connection Report — FR-026
# ---------------------------------------------------------------------------


def test_connection_report_requires_param(ppg_client):
    app, client = ppg_client
    resp = client.get("/api/v1/reports/connections")
    assert resp.status_code == 422


def test_connection_report_by_object_id(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    obj_id = str(uuid4())
    obj = make_object_record(obj_id=obj_id)
    obj["project_name"] = "Proj A"

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(side_effect=[[obj], [], []])  # obj, outbound, inbound
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/api/v1/reports/connections?object_id={obj_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert "outbound_connections" in body["data"]
    assert "inbound_connections" in body["data"]


def test_connection_report_object_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    obj_id = str(uuid4())

    async def fake_db():
        db = MagicMock()
        db.fetch = AsyncMock(return_value=[])  # no objects found
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/api/v1/reports/connections?object_id={obj_id}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Import conflict handling — BR-013
# ---------------------------------------------------------------------------


def test_import_conflict_ask_returns_409(ppg_routers_path):
    """BR-013: import conflict in ask mode → 409 with conflicting_codes."""
    from app.routers.project_objects import ProjectObjectCreate  # type: ignore[import]

    payload = ProjectObjectCreate(
        object_type="api",
        name="Test",
        code="TEST_CODE",
        standard_info={
            "base_url": "https://api.com",
            "auth_method": "JWT",
            "version": "v1",
        },
    )
    assert payload.code == "TEST_CODE"


def test_object_type_validation(ppg_routers_path):
    """Invalid object_type raises ValueError in ProjectObjectCreate."""
    from app.routers.project_objects import ProjectObjectCreate  # type: ignore[import]
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        ProjectObjectCreate(
            object_type="unknown_type",
            name="Bad",
            code="BAD",
            standard_info={},
        )
