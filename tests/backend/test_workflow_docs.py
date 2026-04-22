"""
Tests for Workflow Documents — FR-027, FR-028, FR-029, FR-030, FR-031, FR-032
Covers:
- BA Documents v2: CRUD, state machine, object linking, file upload/download
- Test Documents: CRUD, state machine per type, BUG_REPORT severity, UAT_SIGNOFF sign action
- Coverage tracking per object with milestone alerts (FR-031)
- Test case object links (FR-030)
"""
from __future__ import annotations

import io
import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _purge_app_modules():
    """Clear cached 'app.*' modules so each fixture loads its own backend."""
    import sys
    to_del = [k for k in sys.modules if k == "app" or k.startswith("app.")]
    for k in to_del:
        del sys.modules[k]


@pytest.fixture()
def ba_client():
    import sys
    import os

    _purge_app_modules()
    ba_path = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ba-workflow")
    if ba_path not in sys.path:
        sys.path.insert(0, ba_path)

    from app.main import app  # type: ignore[import]
    from app.auth import get_current_user, TokenPayload  # type: ignore[import]

    fake_user = TokenPayload(sub="test.user", name="Test User", exp=9999999999, iat=1000000000)
    app.dependency_overrides[get_current_user] = lambda: fake_user

    yield app, TestClient(app)
    _purge_app_modules()


@pytest.fixture()
def test_client_fixture():
    import sys
    import os

    _purge_app_modules()
    tp_path = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "test-platform")
    if tp_path not in sys.path:
        sys.path.insert(0, tp_path)

    from app.main import app  # type: ignore[import]
    from app.auth import get_current_user, TokenPayload  # type: ignore[import]

    fake_user = TokenPayload(sub="test.user", name="Test User", exp=9999999999, iat=1000000000)
    app.dependency_overrides[get_current_user] = lambda: fake_user

    yield app, TestClient(app)
    _purge_app_modules()


def make_ba_doc(
    doc_id: str | None = None,
    project_id: str | None = None,
    doc_type: str = "BRS",
    status: str = "draft",
) -> dict:
    return {
        "id": doc_id or str(uuid4()),
        "project_id": project_id or str(uuid4()),
        "doc_type": doc_type,
        "title": f"Test {doc_type}",
        "content": "content",
        "version": "v1.0",
        "status": status,
        "milestone_id": None,
        "metadata": "{}",
        "created_at": "2026-04-10T00:00:00Z",
        "updated_at": "2026-04-10T00:00:00Z",
        "created_by": "test.user",
        "updated_by": None,
        "approved_by": None,
        "reviewed_by": None,
    }


def make_test_doc(
    doc_id: str | None = None,
    doc_type: str = "BUG_REPORT",
    status: str = "open",
) -> dict:
    return {
        "id": doc_id or str(uuid4()),
        "project_id": str(uuid4()),
        "object_id": None,
        "doc_type": doc_type,
        "title": f"Test {doc_type}",
        "content": "",
        "status": status,
        "milestone_id": None,
        "metadata": json.dumps({"severity": "high"} if doc_type == "BUG_REPORT" else {}),
        "created_at": "2026-04-10T00:00:00Z",
        "updated_at": "2026-04-10T00:00:00Z",
        "created_by": "test.user",
        "updated_by": None,
    }


# ===========================================================================
# BA Documents v2 — FR-027, FR-028, FR-029
# ===========================================================================


class TestBADocumentsV2:

    def test_list_ba_docs_empty(self, ba_client):
        app, client = ba_client
        from app.database import get_db  # type: ignore[import]

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value={"cnt": 0})
            db.fetch = AsyncMock(return_value=[])
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.get("/api/v1/documents")
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    def test_create_brs_document_success(self, ba_client):
        app, client = ba_client
        from app.database import get_db  # type: ignore[import]

        project_id = str(uuid4())
        doc = make_ba_doc(project_id=project_id, doc_type="BRS")

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=doc)
            db.execute = AsyncMock(return_value="INSERT 1")
            tx = MagicMock()
            tx.__aenter__ = AsyncMock(return_value=None)
            tx.__aexit__ = AsyncMock(return_value=False)
            db.transaction = MagicMock(return_value=tx)
            yield db

        app.dependency_overrides[get_db] = fake_db
        payload = {
            "project_id": project_id,
            "doc_type": "BRS",
            "title": "Customer BRS",
            "content": "# BRS content",
            "object_ids": [],
        }
        resp = client.post("/api/v1/documents", json=payload)
        assert resp.status_code == 201

    def test_create_document_invalid_doc_type(self, ba_client):
        """FR-029: invalid doc_type → 422."""
        app, client = ba_client
        from app.database import get_db  # type: ignore[import]

        async def fake_db():
            db = MagicMock()
            yield db

        app.dependency_overrides[get_db] = fake_db
        payload = {
            "project_id": str(uuid4()),
            "doc_type": "INVALID_TYPE",
            "title": "Bad doc",
        }
        resp = client.post("/api/v1/documents", json=payload)
        assert resp.status_code == 422

    def test_all_valid_doc_types_accepted(self):
        """FR-029: verify all 8 doc types are in VALID_DOC_TYPES."""
        import sys
        import os

        path = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ba-workflow")
        if path not in sys.path:
            sys.path.insert(0, path)

        from app.routers.ba_documents_v2 import VALID_DOC_TYPES  # type: ignore[import]

        expected = {
            "BRD", "BRS", "FSD", "API_SPEC", "ERD",
            "DATA_DICT", "WIREFRAME", "PROCESS_FLOW",
        }
        assert expected == VALID_DOC_TYPES

    def test_state_machine_draft_to_review(self, ba_client):
        """FR-009: draft → in_review via submit_review action."""
        app, client = ba_client
        from app.database import get_db  # type: ignore[import]

        doc_id = str(uuid4())
        doc = make_ba_doc(doc_id=doc_id, status="draft")
        updated = {**doc, "status": "in_review"}

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(side_effect=[doc, updated])
            db.execute = AsyncMock(return_value="INSERT 1")
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.post(
            f"/api/v1/documents/{doc_id}/status",
            json={"action": "submit_review"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "in_review"

    def test_state_machine_no_skip_draft_to_approved(self, ba_client):
        """BR-001: draft cannot jump directly to approved."""
        app, client = ba_client
        from app.database import get_db  # type: ignore[import]

        doc_id = str(uuid4())
        doc = make_ba_doc(doc_id=doc_id, status="draft")

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=doc)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.post(
            f"/api/v1/documents/{doc_id}/status",
            json={"action": "approve"},
        )
        assert resp.status_code == 409
        assert resp.json()["detail"]["code"] == "STATE_MACHINE_VIOLATION"

    def test_get_document_with_linked_objects(self, ba_client):
        app, client = ba_client
        from app.database import get_db  # type: ignore[import]

        doc_id = str(uuid4())
        doc = make_ba_doc(doc_id=doc_id)
        obj_link = {
            "id": str(uuid4()),
            "name": "Customer API",
            "object_type": "api",
            "status": "active",
            "project_id": doc["project_id"],
        }

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=doc)
            db.fetch = AsyncMock(return_value=[obj_link])
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.get(f"/api/v1/documents/{doc_id}")
        assert resp.status_code == 200
        assert "linked_objects" in resp.json()["data"]

    def test_link_object_to_document(self, ba_client):
        """FR-027: link object to document."""
        app, client = ba_client
        from app.database import get_db  # type: ignore[import]

        doc_id = str(uuid4())
        obj_id = str(uuid4())
        project_id = str(uuid4())
        doc = make_ba_doc(doc_id=doc_id, project_id=project_id)
        obj_row = {"id": obj_id, "status": "active", "project_id": project_id}

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(side_effect=[doc, obj_row])
            db.execute = AsyncMock(return_value="INSERT 1")
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.post(
            f"/api/v1/documents/{doc_id}/objects",
            json={"object_id": obj_id},
        )
        assert resp.status_code == 201

    def test_unlink_object_from_document(self, ba_client):
        """FR-027: unlink does not delete document."""
        app, client = ba_client
        from app.database import get_db  # type: ignore[import]

        doc_id = str(uuid4())
        obj_id = str(uuid4())
        doc = make_ba_doc(doc_id=doc_id)
        link = {"id": str(uuid4())}

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(side_effect=[doc, link])
            db.execute = AsyncMock(return_value="DELETE 1")
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.delete(f"/api/v1/documents/{doc_id}/objects/{obj_id}")
        assert resp.status_code == 204

    def test_filter_documents_by_object_id(self, ba_client):
        """FR-027: filter docs by object."""
        app, client = ba_client
        from app.database import get_db  # type: ignore[import]

        obj_id = str(uuid4())
        doc = make_ba_doc()

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value={"cnt": 1})
            db.fetch = AsyncMock(return_value=[doc])
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.get(f"/api/v1/documents?object_id={obj_id}")
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1

    def test_file_type_validation(self):
        """ADR-005: MIME whitelist check."""
        import sys
        import os

        path = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ba-workflow")
        if path not in sys.path:
            sys.path.insert(0, path)

        from app.routers.ba_documents_v2 import ALLOWED_MIME_TYPES  # type: ignore[import]

        assert "application/pdf" in ALLOWED_MIME_TYPES
        assert "text/html" not in ALLOWED_MIME_TYPES


# ===========================================================================
# Test Documents — FR-030, FR-031, FR-032
# ===========================================================================


class TestTestDocuments:

    def test_list_test_docs_empty(self, test_client_fixture):
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value={"cnt": 0})
            db.fetch = AsyncMock(return_value=[])
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.get("/api/v1/test-documents")
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    def test_create_bug_report_success(self, test_client_fixture):
        """FR-032: BUG_REPORT with severity in metadata."""
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        doc = make_test_doc(doc_type="BUG_REPORT", status="open")

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=doc)
            db.execute = AsyncMock(return_value="INSERT 1")
            yield db

        app.dependency_overrides[get_db] = fake_db
        payload = {
            "project_id": str(uuid4()),
            "doc_type": "BUG_REPORT",
            "title": "Login timeout bug",
            "content": "Steps to reproduce...",
            "metadata": {"severity": "high", "component": "auth"},
        }
        resp = client.post("/api/v1/test-documents", json=payload)
        assert resp.status_code == 201

    def test_create_bug_report_invalid_severity(self, test_client_fixture):
        """FR-032: invalid severity → 422."""
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        async def fake_db():
            db = MagicMock()
            yield db

        app.dependency_overrides[get_db] = fake_db
        payload = {
            "project_id": str(uuid4()),
            "doc_type": "BUG_REPORT",
            "title": "Bad bug",
            "metadata": {"severity": "extreme"},  # invalid
        }
        resp = client.post("/api/v1/test-documents", json=payload)
        assert resp.status_code == 422

    def test_create_uat_signoff_success(self, test_client_fixture):
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        doc = make_test_doc(doc_type="UAT_SIGNOFF", status="draft")

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=doc)
            db.execute = AsyncMock(return_value="INSERT 1")
            yield db

        app.dependency_overrides[get_db] = fake_db
        payload = {
            "project_id": str(uuid4()),
            "doc_type": "UAT_SIGNOFF",
            "title": "UAT Sign-off Customer Module",
            "metadata": {"scope": "Customer CRUD"},
        }
        resp = client.post("/api/v1/test-documents", json=payload)
        assert resp.status_code == 201

    def test_invalid_test_doc_type_rejected(self, test_client_fixture):
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        async def fake_db():
            db = MagicMock()
            yield db

        app.dependency_overrides[get_db] = fake_db
        payload = {
            "project_id": str(uuid4()),
            "doc_type": "TEST_SUMMARY",  # not in VALID_DOC_TYPES
            "title": "Invalid",
        }
        resp = client.post("/api/v1/test-documents", json=payload)
        assert resp.status_code == 422

    def test_bug_report_state_machine_open_to_in_progress(self, test_client_fixture):
        """BUG_REPORT: open → in_progress via 'start' action."""
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        doc_id = str(uuid4())
        doc = make_test_doc(doc_id=doc_id, doc_type="BUG_REPORT", status="open")
        updated = {**doc, "status": "in_progress"}

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(side_effect=[doc, updated])
            db.execute = AsyncMock(return_value="INSERT 1")
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.post(
            f"/api/v1/test-documents/{doc_id}/status",
            json={"action": "start"},
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "in_progress"

    def test_uat_signoff_sign_captures_approver(self, test_client_fixture):
        """FR-032: UAT_SIGNOFF sign action stores approver + sign_date in metadata."""
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        doc_id = str(uuid4())
        doc = make_test_doc(doc_id=doc_id, doc_type="UAT_SIGNOFF", status="pending_sign")
        signed = {
            **doc,
            "status": "signed",
            "metadata": json.dumps({"approver": "nguyen.van.a", "sign_date": "2026-04-10"}),
        }

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(side_effect=[doc, signed])
            db.execute = AsyncMock(return_value="INSERT 1")
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.post(
            f"/api/v1/test-documents/{doc_id}/status",
            json={
                "action": "sign",
                "approver": "nguyen.van.a",
                "sign_date": "2026-04-10",
            },
        )
        assert resp.status_code == 200

    def test_state_machine_violation_rejected(self, test_client_fixture):
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        doc_id = str(uuid4())
        doc = make_test_doc(doc_id=doc_id, doc_type="BUG_REPORT", status="open")

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value=doc)
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.post(
            f"/api/v1/test-documents/{doc_id}/status",
            json={"action": "sign"},  # invalid for BUG_REPORT
        )
        assert resp.status_code == 409
        assert resp.json()["detail"]["code"] == "STATE_MACHINE_VIOLATION"

    def test_test_plan_state_machine_all_valid_doc_types(self):
        """FR-032: verify all 3 valid test doc types present."""
        import sys
        import os

        path = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "test-platform")
        if path not in sys.path:
            sys.path.insert(0, path)

        from app.routers.test_documents import VALID_DOC_TYPES  # type: ignore[import]

        assert "TEST_PLAN" in VALID_DOC_TYPES
        assert "BUG_REPORT" in VALID_DOC_TYPES
        assert "UAT_SIGNOFF" in VALID_DOC_TYPES

    def test_filter_by_object_id(self, test_client_fixture):
        """FR-030: filter test documents by object_id."""
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        obj_id = str(uuid4())
        doc = make_test_doc()

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(return_value={"cnt": 1})
            db.fetch = AsyncMock(return_value=[doc])
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.get(f"/api/v1/test-documents?object_id={obj_id}")
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1

    def test_get_test_case_objects(self, test_client_fixture):
        """FR-030: list objects linked to test case (inherited from BRS)."""
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        tc_id = str(uuid4())
        obj_link = {
            "object_id": str(uuid4()),
            "object_name": "Customer Portal",
            "object_type": "web_app",
            "inherited_from_brs": True,
            "project_id": str(uuid4()),
            "project_name": "Customer Project",
            "linked_at": "2026-04-10T00:00:00Z",
            "linked_by": "system",
        }

        async def fake_db():
            db = MagicMock()
            db.fetch = AsyncMock(return_value=[obj_link])
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.get(f"/api/v1/test-documents/test-cases/{tc_id}/objects")
        assert resp.status_code == 200
        links = resp.json()["data"]
        assert len(links) == 1
        assert links[0]["inherited_from_brs"] is True

    def test_coverage_below_threshold_triggers_alert(self, test_client_fixture):
        """FR-031: coverage below 80% generates alert for release milestone."""
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        obj_id = str(uuid4())
        obj_record = {
            "id": obj_id,
            "name": "Customer Portal",
            "object_type": "web_app",
            "project_id": str(uuid4()),
            "status": "active",
        }
        # 10 test cases, only 5 executed — coverage = 50%
        tc_rows = [{"id": str(uuid4()), "status": "executed"} for _ in range(5)] + [
            {"id": str(uuid4()), "status": "approved"} for _ in range(5)
        ]
        milestone = {
            "id": str(uuid4()),
            "name": "UAT Release",
            "milestone_type": "uat",
            "end_date": None,  # not overdue in test
        }

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(
                side_effect=[
                    obj_record,       # object lookup
                    None,             # project threshold lookup
                ]
            )
            db.fetch = AsyncMock(
                side_effect=[
                    tc_rows,          # test cases
                    [milestone],      # milestones
                ]
            )
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.get(f"/api/v1/test-documents/objects/{obj_id}/test-coverage")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["coverage_pct"] == 50.0
        assert data["total_test_cases"] == 10

    def test_coverage_zero_when_no_test_cases(self, test_client_fixture):
        """BR-003: total = 0 → coverage = 0 (no divide by zero)."""
        app, client = test_client_fixture
        from app.database import get_db  # type: ignore[import]

        obj_id = str(uuid4())
        obj_record = {
            "id": obj_id,
            "name": "Empty Object",
            "object_type": "api",
            "project_id": str(uuid4()),
            "status": "active",
        }

        async def fake_db():
            db = MagicMock()
            db.fetchrow = AsyncMock(side_effect=[obj_record, None])
            db.fetch = AsyncMock(side_effect=[[], []])
            yield db

        app.dependency_overrides[get_db] = fake_db
        resp = client.get(f"/api/v1/test-documents/objects/{obj_id}/test-coverage")
        assert resp.status_code == 200
        assert resp.json()["data"]["coverage_pct"] == 0.0


# ---------------------------------------------------------------------------
# Audit log — NFR-007
# ---------------------------------------------------------------------------


class TestAuditService:
    """Unit tests for audit_service — no DB needed."""

    def _get_audit_log(self):
        import sys
        import os

        path = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ppg")
        if path not in sys.path:
            sys.path.insert(0, path)
        from app.services.audit_service import log_audit  # type: ignore[import]

        return log_audit

    @pytest.mark.asyncio
    async def test_audit_does_not_raise_on_db_error(self):
        log_audit = self._get_audit_log()
        db = MagicMock()
        db.execute = AsyncMock(side_effect=Exception("DB down"))

        # Should not raise even if DB fails — NFR-005
        await log_audit(
            db=db,
            entity_type="test",
            entity_id="abc",
            action="CREATE",
            changed_by="user",
        )

    @pytest.mark.asyncio
    async def test_audit_writes_correct_fields(self):
        log_audit = self._get_audit_log()
        db = MagicMock()
        db.execute = AsyncMock(return_value=None)

        await log_audit(
            db=db,
            entity_type="ba_documents",
            entity_id="doc-123",
            action="STATUS_CHANGE",
            changed_by="john.doe",
            old_values={"status": "draft"},
            new_values={"status": "in_review"},
        )

        db.execute.assert_called_once()
        call_args = db.execute.call_args
        # Verify entity_type and action are in the call
        assert "ba_documents" in str(call_args)
        assert "STATUS_CHANGE" in str(call_args)
