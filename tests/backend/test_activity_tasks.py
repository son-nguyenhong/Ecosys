"""
Tests for Activity Tasks Router — activity_tasks.py
Covers:
- GET  /projects/{id}/activity-tasks           (all, domain filter, invalid domain → 400)
- POST /projects/{id}/activity-tasks           (success, project not found → 404, invalid domain → 400, validation → 422)
- PATCH /projects/{id}/activity-tasks/{task_id} (success, not found → 404, no fields → 400, invalid due_date → 400)
- DELETE /projects/{id}/activity-tasks/{task_id} (success, not found → 404)
"""
from __future__ import annotations

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


def make_task_record(
    task_id: str | None = None,
    project_id: str | None = None,
    domain: str = "business_requirements",
    title: str = "Draft BRD",
    status: str = "pending",
) -> dict:
    return {
        "id": task_id or str(uuid4()),
        "project_id": project_id or str(uuid4()),
        "activity_domain": domain,
        "title": title,
        "status": status,
        "assignee": None,
        "notes": None,
        "due_date": None,
        "sort_order": 1,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


# ===========================================================================
# GET /projects/{project_id}/activity-tasks
# ===========================================================================

class TestListActivityTasks:

    def test_list_all_returns_empty(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        async def fake_db():
            db = MagicMock()
            db.fetch = AsyncMock(return_value=[])
            yield db

        app.dependency_overrides[get_db] = fake_db
        pid = str(uuid4())
        resp = client.get(f"/projects/{pid}/activity-tasks")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_all_returns_tasks(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        pid = str(uuid4())
        tasks = [make_task_record(project_id=pid, domain=d) for d in [
            "business_requirements", "architecture_code", "infrastructure",
        ]]

        async def fake_db():
            db = MagicMock()
            db.fetch = AsyncMock(return_value=tasks)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.get(f"/projects/{pid}/activity-tasks")
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    def test_list_with_valid_domain_filter(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        pid = str(uuid4())
        tasks = [make_task_record(project_id=pid, domain="security_iam")]

        async def fake_db():
            db = MagicMock()
            db.fetch = AsyncMock(return_value=tasks)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.get(f"/projects/{pid}/activity-tasks?domain=security_iam")
        assert resp.status_code == 200
        assert resp.json()[0]["activity_domain"] == "security_iam"

    def test_list_with_invalid_domain_returns_400(self, ppg_client):
        app, client = ppg_client
        pid = str(uuid4())
        resp = client.get(f"/projects/{pid}/activity-tasks?domain=nonexistent_domain")
        assert resp.status_code == 400
        assert "Invalid domain" in resp.json()["detail"]

    def test_list_all_five_valid_domains_accepted(self, ppg_client):
        """All 5 valid domain values must be accepted without 400."""
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        valid_domains = [
            "business_requirements", "architecture_code",
            "infrastructure", "security_iam", "compliance_governance",
        ]
        pid = str(uuid4())

        for domain in valid_domains:
            async def fake_db():
                db = MagicMock()
                db.fetch = AsyncMock(return_value=[])
                yield db

            app.dependency_overrides[get_db] = fake_db
            resp = client.get(f"/projects/{pid}/activity-tasks?domain={domain}")
            assert resp.status_code == 200, f"Expected 200 for domain={domain}"


# ===========================================================================
# POST /projects/{project_id}/activity-tasks
# ===========================================================================

class TestCreateActivityTask:

    def test_create_success(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        pid = str(uuid4())
        created = make_task_record(project_id=pid, domain="infrastructure", title="Provision RDS")

        async def fake_db():
            db = MagicMock()
            db.fetchval = AsyncMock(return_value=pid)   # project exists
            db.fetchrow = AsyncMock(return_value=created)
            db.fetch = AsyncMock(return_value=[])
            # max sort_order query
            db.fetchval = AsyncMock(side_effect=[pid, 5])
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.post(f"/projects/{pid}/activity-tasks", json={
            "activity_domain": "infrastructure",
            "title": "Provision RDS",
        })
        assert resp.status_code == 201

    def test_create_project_not_found_returns_404(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        async def fake_db():
            db = MagicMock()
            db.fetchval = AsyncMock(return_value=None)   # project not found
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.post(f"/projects/{uuid4()}/activity-tasks", json={
            "activity_domain": "infrastructure",
            "title": "Some task",
        })
        assert resp.status_code == 404
        assert "Project not found" in resp.json()["detail"]

    def test_create_invalid_domain_returns_400(self, ppg_client):
        app, client = ppg_client
        resp = client.post(f"/projects/{uuid4()}/activity-tasks", json={
            "activity_domain": "not_a_real_domain",
            "title": "Irrelevant",
        })
        assert resp.status_code == 400
        assert "Invalid domain" in resp.json()["detail"]

    def test_create_missing_title_returns_422(self, ppg_client):
        """title is required (min_length=1)."""
        app, client = ppg_client
        resp = client.post(f"/projects/{uuid4()}/activity-tasks", json={
            "activity_domain": "infrastructure",
        })
        assert resp.status_code == 422

    def test_create_empty_title_returns_422(self, ppg_client):
        """title min_length=1 — empty string rejected."""
        app, client = ppg_client
        resp = client.post(f"/projects/{uuid4()}/activity-tasks", json={
            "activity_domain": "infrastructure",
            "title": "",
        })
        assert resp.status_code == 422

    def test_create_missing_activity_domain_returns_422(self, ppg_client):
        """activity_domain is required."""
        app, client = ppg_client
        resp = client.post(f"/projects/{uuid4()}/activity-tasks", json={
            "title": "Some task",
        })
        assert resp.status_code == 422

    def test_create_with_due_date(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        pid = str(uuid4())
        created = make_task_record(project_id=pid)

        async def fake_db():
            db = MagicMock()
            db.fetchval = AsyncMock(side_effect=[pid, 0])  # project exists, max_order=0
            db.fetchrow = AsyncMock(return_value=created)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.post(f"/projects/{pid}/activity-tasks", json={
            "activity_domain": "business_requirements",
            "title": "UAT sign-off",
            "due_date": "2026-06-30",
        })
        assert resp.status_code == 201

    def test_create_assignee_too_long_returns_422(self, ppg_client):
        """assignee max_length=100."""
        app, client = ppg_client
        resp = client.post(f"/projects/{uuid4()}/activity-tasks", json={
            "activity_domain": "infrastructure",
            "title": "Task",
            "assignee": "A" * 101,
        })
        assert resp.status_code == 422


# ===========================================================================
# PATCH /projects/{project_id}/activity-tasks/{task_id}
# ===========================================================================

class TestPatchActivityTask:

    def test_patch_status_success(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        pid = str(uuid4())
        tid = str(uuid4())
        updated = make_task_record(task_id=tid, project_id=pid, status="done")

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=updated)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.patch(f"/projects/{pid}/activity-tasks/{tid}", json={"status": "done"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "done"

    def test_patch_assignee_success(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        pid = str(uuid4())
        tid = str(uuid4())
        updated = make_task_record(task_id=tid, project_id=pid)
        updated["assignee"] = "Nguyen Van A"

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=updated)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.patch(f"/projects/{pid}/activity-tasks/{tid}", json={"assignee": "Nguyen Van A"})
        assert resp.status_code == 200

    def test_patch_with_due_date_success(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        pid = str(uuid4())
        tid = str(uuid4())
        updated = make_task_record(task_id=tid, project_id=pid)

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=updated)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.patch(
            f"/projects/{pid}/activity-tasks/{tid}",
            json={"due_date": "2026-09-30"},
        )
        assert resp.status_code == 200

    def test_patch_invalid_due_date_returns_400(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        pid = str(uuid4())
        tid = str(uuid4())

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=None)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.patch(
            f"/projects/{pid}/activity-tasks/{tid}",
            json={"due_date": "not-a-date"},
        )
        assert resp.status_code == 400
        assert "ISO format" in resp.json()["detail"]

    def test_patch_no_fields_returns_400(self, ppg_client):
        """PATCH with empty body (all None) → 400 No fields to update."""
        app, client = ppg_client
        resp = client.patch(f"/projects/{uuid4()}/activity-tasks/{uuid4()}", json={})
        assert resp.status_code == 400
        assert "No fields to update" in resp.json()["detail"]

    def test_patch_task_not_found_returns_404(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=None)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.patch(
            f"/projects/{uuid4()}/activity-tasks/{uuid4()}",
            json={"status": "done"},
        )
        assert resp.status_code == 404

    def test_patch_invalid_status_returns_422(self, ppg_client):
        """status field has Pydantic pattern — invalid value → 422."""
        app, client = ppg_client
        resp = client.patch(
            f"/projects/{uuid4()}/activity-tasks/{uuid4()}",
            json={"status": "completed"},   # not in allowed set
        )
        assert resp.status_code == 422

    def test_patch_all_valid_statuses(self, ppg_client):
        """All 5 valid status values pass Pydantic validation."""
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        valid_statuses = ["pending", "in_progress", "done", "skipped", "na"]
        pid = str(uuid4())
        tid = str(uuid4())

        for status in valid_statuses:
            updated = make_task_record(task_id=tid, project_id=pid, status=status)

            async def fake_db():
                db = MagicMock()
                db.fetchrow = AsyncMock(return_value=updated)
                yield db

            app.dependency_overrides[get_db] = fake_db
            resp = client.patch(
                f"/projects/{pid}/activity-tasks/{tid}",
                json={"status": status},
            )
            assert resp.status_code == 200, f"Expected 200 for status={status}"

    def test_patch_notes_success(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        pid = str(uuid4())
        tid = str(uuid4())
        updated = make_task_record(task_id=tid, project_id=pid)
        updated["notes"] = "Follow up with DevOps team"

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=updated)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.patch(
            f"/projects/{pid}/activity-tasks/{tid}",
            json={"notes": "Follow up with DevOps team"},
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "Follow up with DevOps team"


# ===========================================================================
# DELETE /projects/{project_id}/activity-tasks/{task_id}
# ===========================================================================

class TestDeleteActivityTask:

    def test_delete_success_returns_204(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        async def fake_db():
            db = MagicMock()
            db.execute = AsyncMock(return_value="DELETE 1")
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.delete(f"/projects/{uuid4()}/activity-tasks/{uuid4()}")
        assert resp.status_code == 204

    def test_delete_not_found_returns_404(self, ppg_client):
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        async def fake_db():
            db = MagicMock()
            db.execute = AsyncMock(return_value="DELETE 0")
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.delete(f"/projects/{uuid4()}/activity-tasks/{uuid4()}")
        assert resp.status_code == 404
        assert "Task not found" in resp.json()["detail"]

    def test_delete_uses_both_project_id_and_task_id(self, ppg_client):
        """DELETE must scope to both project_id AND task_id (not just task_id)."""
        app, client = ppg_client
        from app.database import get_db  # type: ignore[import]

        execute_calls: list[tuple] = []

        async def fake_db():
            db = MagicMock()

            async def capture_execute(query, *args):
                execute_calls.append(args)
                return "DELETE 1"

            db.execute = capture_execute
            yield db

        app.dependency_overrides[get_db] = fake_db
        pid = str(uuid4())
        tid = str(uuid4())
        client.delete(f"/projects/{pid}/activity-tasks/{tid}")

        assert len(execute_calls) == 1
        args = execute_calls[0]
        # Both pid and tid must be passed as params
        assert tid in args
        assert pid in args
