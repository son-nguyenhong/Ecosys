"""
Tests for Annual Plans v2 — FR-019, FR-020, FR-021, FR-022
Covers:
- CRUD endpoints
- State machine transitions (draft → active → closed)
- BR-009: only active plans accept new project links
- BR-010: cannot close plan with active projects
- DoD item CRUD and completion % calculation
- Project link/unlink with audit log
"""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# App under test
# ---------------------------------------------------------------------------


@pytest.fixture()
def ppg_client():
    """TestClient for PPG service with DB and auth overridden."""
    import sys
    import os

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ppg"))

    from app.main import app  # type: ignore[import]
    from app.auth import get_current_user, TokenPayload  # type: ignore[import]
    from app.database import get_db  # type: ignore[import]

    fake_user = TokenPayload(sub="test.user", name="Test User", exp=9999999999, iat=1000000000)
    app.dependency_overrides[get_current_user] = lambda: fake_user

    return app, TestClient(app)


def make_plan_record(
    plan_id: str | None = None,
    status: str = "draft",
    name: str = "Kế hoạch IT 2026",
    year: int = 2026,
) -> dict:
    pid = plan_id or str(uuid4())
    return {
        "id": pid,
        "name": name,
        "year": year,
        "description": "Test plan",
        "status": status,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
        "created_by": "test.user",
        "updated_by": None,
    }


def make_dod_item(plan_id: str, achieved: bool = False, weight: float = 50.0) -> dict:
    return {
        "id": str(uuid4()),
        "plan_id": plan_id,
        "criterion": "Đạt coverage ≥ 80%",
        "weight": weight,
        "is_achieved": achieved,
        "achieved_at": None,
        "achieved_by": None,
        "notes": None,
        "sort_order": 0,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
        "created_by": "test.user",
        "updated_by": None,
    }


# ---------------------------------------------------------------------------
# GET /annual-plans
# ---------------------------------------------------------------------------


def test_list_annual_plans_empty(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value={"cnt": 0})
        db.fetch = AsyncMock(return_value=[])
        db.fetchval = AsyncMock(return_value=0)
        yield db

    app.dependency_overrides[get_db] = fake_db

    resp = client.get("/annual-plans")
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"] == []
    assert body["meta"]["total"] == 0


def test_list_annual_plans_with_year_filter(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan = make_plan_record(status="active")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value={"cnt": 1})
        db.fetch = AsyncMock(side_effect=[[plan], []])
        db.fetchval = AsyncMock(return_value=0)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get("/annual-plans?year=2026")
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /annual-plans
# ---------------------------------------------------------------------------


def test_create_annual_plan_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan_id = str(uuid4())
    created_plan = make_plan_record(plan_id=plan_id)

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=created_plan)
        db.execute = AsyncMock(return_value="INSERT 1")
        db.fetch = AsyncMock(return_value=[])
        tx = MagicMock()
        tx.__aenter__ = AsyncMock(return_value=None)
        tx.__aexit__ = AsyncMock(return_value=False)
        db.transaction = MagicMock(return_value=tx)
        yield db

    app.dependency_overrides[get_db] = fake_db

    payload = {
        "name": "Kế hoạch IT 2026",
        "year": 2026,
        "description": "Test",
        "objectives": [{"title": "Triển khai 5 ứng dụng", "sort_order": 1}],
        "dod_items": [{"criterion": "Coverage ≥ 80%", "weight": 100.0}],
    }
    resp = client.post("/annual-plans", json=payload)
    assert resp.status_code == 201


def test_create_annual_plan_requires_objective(ppg_client):
    """FR-019: at least 1 objective required."""
    app, client = ppg_client

    payload = {
        "name": "Plan without objectives",
        "year": 2026,
        "objectives": [],  # empty — should fail validation
    }
    resp = client.post("/annual-plans", json=payload)
    assert resp.status_code == 422


def test_create_annual_plan_year_out_of_range(ppg_client):
    app, client = ppg_client

    payload = {
        "name": "Bad year plan",
        "year": 1990,  # < 2020 — should fail
        "objectives": [{"title": "obj", "sort_order": 0}],
    }
    resp = client.post("/annual-plans", json=payload)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /annual-plans/{plan_id}
# ---------------------------------------------------------------------------


def test_get_plan_not_found(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=None)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/annual-plans/{uuid4()}")
    assert resp.status_code == 404


def test_get_plan_with_details(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan_id = str(uuid4())
    plan = make_plan_record(plan_id=plan_id)
    dod = make_dod_item(plan_id, achieved=True, weight=100.0)

    fetch_calls: list = [[], [dod], []]  # objectives, dod_items, projects

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=plan)
        call_count = [0]

        async def _fetch(*args, **kwargs):
            idx = call_count[0]
            call_count[0] += 1
            if idx < len(fetch_calls):
                return fetch_calls[idx]
            return []

        db.fetch = AsyncMock(side_effect=_fetch)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/annual-plans/{plan_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert "dod_completion_pct" in body["data"]


# ---------------------------------------------------------------------------
# DELETE /annual-plans/{plan_id} — soft delete, draft only
# ---------------------------------------------------------------------------


def test_delete_active_plan_rejected(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan = make_plan_record(status="active")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=plan)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/annual-plans/{plan['id']}")
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "CONFLICT"


def test_delete_draft_plan_success(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan = make_plan_record(status="draft")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=plan)
        db.execute = AsyncMock(return_value="DELETE 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/annual-plans/{plan['id']}")
    assert resp.status_code == 204


# ---------------------------------------------------------------------------
# POST /annual-plans/{plan_id}/status
# ---------------------------------------------------------------------------


def test_activate_draft_plan(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan = make_plan_record(status="draft")
    activated = {**plan, "status": "active"}

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[plan, activated])
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/annual-plans/{plan['id']}/status", json={"action": "activate"})
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "active"


def test_close_active_plan_with_active_projects_rejected(ppg_client):
    """BR-010: cannot close plan when active projects exist."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan = make_plan_record(status="active")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=plan)
        db.fetchval = AsyncMock(return_value=3)  # 3 active projects
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/annual-plans/{plan['id']}/status", json={"action": "close"})
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "ACTIVE_PROJECTS_EXIST"


def test_close_active_plan_no_active_projects(ppg_client):
    """BR-010: can close plan when no active projects."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan = make_plan_record(status="active")
    closed_plan = {**plan, "status": "closed"}

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[plan, closed_plan])
        db.fetchval = AsyncMock(return_value=0)  # 0 active projects
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/annual-plans/{plan['id']}/status", json={"action": "close"})
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "closed"


def test_invalid_state_transition_rejected(ppg_client):
    """State machine violation — draft cannot be closed directly."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan = make_plan_record(status="draft")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=plan)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(f"/annual-plans/{plan['id']}/status", json={"action": "close"})
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "STATE_MACHINE_VIOLATION"


# ---------------------------------------------------------------------------
# DoD items — FR-020
# ---------------------------------------------------------------------------


def test_update_dod_item_achieved(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan_id = str(uuid4())
    item_id = str(uuid4())
    plan = make_plan_record(plan_id=plan_id)
    item = make_dod_item(plan_id, achieved=False)
    item["id"] = item_id
    updated_item = {**item, "is_achieved": True}

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[plan, item, updated_item])
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.put(
        f"/annual-plans/{plan_id}/dod-items/{item_id}",
        json={"is_achieved": True, "notes": "Achieved at Sprint 5"},
    )
    assert resp.status_code == 200


def test_dod_completion_pct_calculation():
    """Unit test: DoD completion percentage formula (FR-020)."""
    import sys
    import os

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ppg"))
    from app.routers.annual_plans_v2 import _calc_dod_pct  # type: ignore[import]

    # 2 items, 1 achieved, equal weight
    items = [
        {"weight": 50.0, "is_achieved": True},
        {"weight": 50.0, "is_achieved": False},
    ]
    assert _calc_dod_pct(items) == 50.0

    # All achieved
    items2 = [
        {"weight": 30.0, "is_achieved": True},
        {"weight": 70.0, "is_achieved": True},
    ]
    assert _calc_dod_pct(items2) == 100.0

    # Empty list
    assert _calc_dod_pct([]) == 0.0


# ---------------------------------------------------------------------------
# Project Links — FR-021
# ---------------------------------------------------------------------------


def test_link_project_to_active_plan(ppg_client):
    """FR-021 + BR-009: can link project to active plan."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan_id = str(uuid4())
    project_id = str(uuid4())
    plan = make_plan_record(plan_id=plan_id, status="active")
    link_record = {
        "id": str(uuid4()),
        "plan_id": plan_id,
        "project_id": project_id,
        "linked_at": "2026-04-10T00:00:00Z",
        "linked_by": "test.user",
        "unlinked_at": None,
        "unlinked_by": None,
    }

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(
            side_effect=[
                plan,
                {"id": project_id, "name": "Project A"},
                None,  # no existing link
                link_record,
            ]
        )
        db.execute = AsyncMock(return_value="INSERT 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(
        f"/annual-plans/{plan_id}/projects",
        json={"project_id": project_id},
    )
    assert resp.status_code == 201


def test_link_project_to_draft_plan_rejected(ppg_client):
    """BR-009: cannot link to draft plan."""
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan_id = str(uuid4())
    plan = make_plan_record(plan_id=plan_id, status="draft")

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=plan)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.post(
        f"/annual-plans/{plan_id}/projects",
        json={"project_id": str(uuid4())},
    )
    assert resp.status_code == 409
    assert resp.json()["detail"]["code"] == "PLAN_NOT_ACTIVE"


def test_unlink_project(ppg_client):
    app, client = ppg_client
    from app.database import get_db  # type: ignore[import]

    plan_id = str(uuid4())
    project_id = str(uuid4())
    plan = make_plan_record(plan_id=plan_id, status="active")
    link = {"id": str(uuid4())}

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(side_effect=[plan, link])
        db.execute = AsyncMock(return_value="UPDATE 1")
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.delete(f"/annual-plans/{plan_id}/projects/{project_id}")
    assert resp.status_code == 204


# ---------------------------------------------------------------------------
# Hoi quy: cot NUMERIC phai ra JSON number, khong duoc ra string
#
# Bug that: asyncpg tra NUMERIC ve Decimal, Pydantic v2 serialize Decimal thanh
# chuoi ("40.00"). Frontend khai bao number va cong don:
#     0 + "40.00" + "30.00" -> "040.0030.00" -> Number(...) = NaN -> UI hien "NaN%"
# ---------------------------------------------------------------------------


def test_row_to_dict_doi_decimal_thanh_float():
    """row_to_dict phai doi Decimal -> float, ke ca long trong dict/list."""
    import os
    import sys
    from decimal import Decimal

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ppg"))
    from app.utils import row_to_dict, to_jsonable  # type: ignore[import]

    out = row_to_dict({"weight": Decimal("40.00"), "criterion": "x", "is_achieved": True})
    assert out["weight"] == 40.0
    assert isinstance(out["weight"], float)
    assert out["criterion"] == "x" and out["is_achieved"] is True

    nested = to_jsonable({"rows": [{"amount": Decimal("1000.50")}], "pct": Decimal("12.5")})
    assert nested == {"rows": [{"amount": 1000.5}], "pct": 12.5}
    assert isinstance(nested["rows"][0]["amount"], float)

    # gia tri khong phai Decimal thi giu nguyen kieu
    assert to_jsonable(None) is None
    assert to_jsonable(7) == 7 and isinstance(to_jsonable(7), int)


def test_dod_items_tra_weight_dang_so(ppg_client):
    """GET /dod-items: weight phai la number trong JSON (khong phai "40.00")."""
    from decimal import Decimal

    from app.database import get_db  # type: ignore[import]

    app, client = ppg_client
    plan_id = str(uuid4())
    plan = make_plan_record(plan_id=plan_id, status="active")
    rows = [
        {**make_dod_item(plan_id, achieved=False), "weight": Decimal("40.00")},
        {**make_dod_item(plan_id, achieved=True), "weight": Decimal("10.00")},
    ]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value=plan)
        db.fetch = AsyncMock(return_value=rows)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/annual-plans/{plan_id}/dod-items")
    assert resp.status_code == 200
    body = resp.json()

    for item in body["data"]:
        assert isinstance(item["weight"], (int, float)), (
            "weight ra kieu %s — frontend cong don se noi chuoi thanh NaN" % type(item["weight"])
        )
    # cong don dung phai ra 50, chuoi se ra "040.0010.00"
    assert sum(i["weight"] for i in body["data"]) == 50.0
    assert body["dod_completion_pct"] == 20.0


def test_budget_tra_so_tien_dang_so(ppg_client):
    """GET /budget: amount_planned/amount_actual phai la number."""
    from decimal import Decimal

    from app.database import get_db  # type: ignore[import]

    app, client = ppg_client
    plan_id = str(uuid4())
    rows = [
        {
            "id": str(uuid4()), "plan_id": plan_id, "label": "Ha tang",
            "budget_type": "capex", "quarter": "Q1",
            "amount_planned": Decimal("1000000.00"), "amount_actual": Decimal("250000.00"),
            "currency": "VND", "notes": None,
            "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
        },
        {
            "id": str(uuid4()), "plan_id": plan_id, "label": "Licence",
            "budget_type": "opex", "quarter": "Q2",
            "amount_planned": Decimal("500000.00"), "amount_actual": Decimal("0.00"),
            "currency": "VND", "notes": None,
            "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
        },
    ]

    async def fake_db():
        db = MagicMock()
        db.fetchrow = AsyncMock(return_value={"id": plan_id})
        db.fetch = AsyncMock(return_value=rows)
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/annual-plans/{plan_id}/budget")
    assert resp.status_code == 200
    items = resp.json()

    for it in items:
        assert isinstance(it["amount_planned"], (int, float))
        assert isinstance(it["amount_actual"], (int, float))
    assert sum(i["amount_planned"] for i in items) == 1500000.0


def test_route_bao_cao_ke_hoach_nam_nam_duoi_api_v1(ppg_client):
    """Router reports co prefix /api/v1 — frontend tung goi thieu nen 404."""
    app, _ = ppg_client
    paths = {getattr(r, "path", "") for r in app.routes}
    assert "/api/v1/reports/annual-plan-summary/{plan_id}" in paths
    assert "/reports/annual-plan-summary/{plan_id}" not in paths


def test_summary_tra_coverage_0_khi_chua_co_bao_cao_test(ppg_client):
    """FR-022: du an chua co test report -> test_coverage_pct = 0.0, khong duoc None.

    Tra None lam UI goi null.toFixed() -> tab Dashboard vo trang.
    """
    from app.database import get_db  # type: ignore[import]

    app, client = ppg_client
    plan_id = str(uuid4())
    project_id = str(uuid4())
    plan = make_plan_record(plan_id=plan_id, status="active")
    projects = [{"id": project_id, "name": "eHR 2.0", "status": "active", "code": "EHR-2026"}]

    async def fake_db():
        db = MagicMock()
        # thu tu goi: fetchrow(plan) -> fetch(dod) -> fetch(projects) -> fetchval x3 -> fetchrow(test_row)
        db.fetchrow = AsyncMock(side_effect=[plan, None])
        db.fetch = AsyncMock(side_effect=[[], projects])
        db.fetchval = AsyncMock(side_effect=[3, 1, 2])
        yield db

    app.dependency_overrides[get_db] = fake_db
    resp = client.get(f"/api/v1/reports/annual-plan-summary/{plan_id}")
    assert resp.status_code == 200
    proj = resp.json()["data"]["projects"][0]

    assert proj["test_coverage_pct"] == 0.0
    assert proj["test_coverage_pct"] is not None, "None se lam UI vo trang o tab Dashboard"
    assert isinstance(proj["test_coverage_pct"], (int, float))
    assert proj["milestone_progress"] == "1/3"
    assert proj["ba_docs_approved"] == 2
