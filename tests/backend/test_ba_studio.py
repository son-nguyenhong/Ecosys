"""
Tests cho BA Studio — Master Doc có version + Change Request cấp tài liệu.

Phủ:
- section_ops engine: apply_ops (add/modify/remove), validate_ops, sinh key/label
- PARITY fixture: cùng bộ dữ liệu với frontend/src/lib/ba-studio/__tests__/diff.test.ts
  → bản preview BA thấy trước khi duyệt phải trùng kết quả merge thật của backend
- Router: CRUD Master Doc, tạo CR, luồng stage, merge sinh phiên bản, từ chối,
  và các guard bảo vệ lịch sử phiên bản (merge 2 lần, sửa/xoá CR đã xử lý…)
"""
from __future__ import annotations

import json
import os
import sys
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

BA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "ba-workflow")


def _purge_app_modules():
    to_del = [k for k in sys.modules if k == "app" or k.startswith("app.")]
    for k in to_del:
        del sys.modules[k]


@pytest.fixture()
def ba_client():
    _purge_app_modules()
    if BA_PATH not in sys.path:
        sys.path.insert(0, BA_PATH)

    from app.main import app  # type: ignore[import]
    from app.auth import get_current_user, TokenPayload  # type: ignore[import]

    fake_user = TokenPayload(sub="test.user", name="Test User", exp=9999999999, iat=1000000000)
    app.dependency_overrides[get_current_user] = lambda: fake_user
    yield app, TestClient(app)
    app.dependency_overrides.clear()
    _purge_app_modules()


@pytest.fixture()
def ops_module():
    """section_ops dùng được độc lập, không cần FastAPI app."""
    if BA_PATH not in sys.path:
        sys.path.insert(0, BA_PATH)
    from app.services import section_ops  # type: ignore[import]

    return section_ops


# ---------------------------------------------------------------------------
# FakeDB — asyncpg giả, phân phối kết quả theo chuỗi con trong câu SQL
# ---------------------------------------------------------------------------


class FakeDB:
    def __init__(self, rows=None, vals=None, fetches=None):
        self._rows = list(rows or [])
        self._vals = list(vals or [])
        self._fetches = list(fetches or [])
        self.executed: list[tuple[str, tuple]] = []

    @staticmethod
    def _match(pairs, sql, default=None):
        for needle, value in pairs:
            if needle in sql:
                return value
        return default

    async def fetchrow(self, sql, *args):
        return self._match(self._rows, sql)

    async def fetchval(self, sql, *args):
        return self._match(self._vals, sql, default=0)

    async def fetch(self, sql, *args):
        return self._match(self._fetches, sql, default=[])

    async def execute(self, sql, *args):
        self.executed.append((sql, args))
        return "OK"

    def transaction(self):
        tx = MagicMock()
        tx.__aenter__ = AsyncMock(return_value=None)
        tx.__aexit__ = AsyncMock(return_value=False)
        return tx

    def executed_sql(self) -> str:
        return "\n".join(sql for sql, _ in self.executed)


def override_db(app, db: FakeDB):
    from app.database import get_db  # type: ignore[import]

    async def _fake():
        yield db

    app.dependency_overrides[get_db] = _fake


# ---------------------------------------------------------------------------
# Fixture dữ liệu
# ---------------------------------------------------------------------------

DOC_ID = str(uuid4())
PROJECT_ID = str(uuid4())
CR_ID = str(uuid4())

BASE_SECTIONS = [
    {"section_key": "s1", "heading": "Mục tiêu & phạm vi", "body": "Phạm vi gồm A và B.", "sort_order": 1},
    {"section_key": "s2", "heading": "Yêu cầu tích hợp", "body": "Tích hợp với hệ X.", "sort_order": 2},
    {"section_key": "s3", "heading": "Tiêu chí nghiệm thu", "body": "Chạy được trên UAT.", "sort_order": 3},
]

# ── PARITY FIXTURE — phải giống hệt trong diff.test.ts ở frontend ──────────
PARITY_SECTIONS = [
    {"section_key": "s1", "heading": "Mục tiêu", "heading_level": 2, "body": "Phạm vi gồm A và B."},
    {"section_key": "s2", "heading": "Tích hợp", "heading_level": 2, "body": "Tích hợp hệ X."},
    {"section_key": "s3", "heading": "Nghiệm thu", "heading_level": 2, "body": "Chạy trên UAT."},
]
PARITY_OPS = [
    {"op": "modify", "section_key": "s1", "heading": "Mục tiêu", "body": "Phạm vi gồm A, B và C."},
    {"op": "add", "section_key": "s4", "after_section_key": "s1", "heading": "Rủi ro", "body": "Rủi ro tích hợp."},
    {"op": "remove", "section_key": "s3"},
]
PARITY_EXPECTED = [
    {"section_key": "s1", "heading": "Mục tiêu", "heading_level": 2, "body": "Phạm vi gồm A, B và C."},
    {"section_key": "s4", "heading": "Rủi ro", "heading_level": 2, "body": "Rủi ro tích hợp."},
    {"section_key": "s2", "heading": "Tích hợp", "heading_level": 2, "body": "Tích hợp hệ X."},
]


def make_doc_row(**over) -> dict:
    row = {
        "id": DOC_ID,
        "doc_code": "doc-test-brs",
        "project_id": PROJECT_ID,
        "project_code": "EMS2-UPG-2026",
        "project_name": "EMS 2.0 Upgrading",
        "doc_type": "BRS",
        "title": "BRS — Tài liệu test",
        "abbr": "Business Requirements Specification",
        "owner": "Hoàng Thị Hòa",
        "base_version": "v1.0",
        "base_date": "2026-05-20",
        "base_note": "Bản gốc",
        "current_version": "v1.0",
        "status": "active",
        "ba_document_id": None,
        "created_at": "2026-05-20T00:00:00+07:00",
        "updated_at": "2026-05-20T00:00:00+07:00",
        "created_by": "test.user",
        "updated_by": "test.user",
    }
    row.update(over)
    return row


def make_cr_row(**over) -> dict:
    row = {
        "id": CR_ID,
        "request_code": "PCR-2026-001",
        "project_id": PROJECT_ID,
        "project_code": "EMS2-UPG-2026",
        "project_name": "EMS 2.0 Upgrading",
        "target_doc_id": DOC_ID,
        "doc_code": "doc-test-brs",
        "doc_title": "BRS — Tài liệu test",
        "doc_type": "BRS",
        "doc_current_version": "v1.0",
        "title": "Mở rộng phạm vi",
        "description": "Thêm C vào phạm vi",
        "change_type": "scope",
        "priority": "high",
        "status": "approved",
        "merge_state": "pending",
        "merged_version": None,
        "merged_at": None,
        "impact_scope": "Ảnh hưởng phạm vi",
        "impact_effort": None,
        "requested_by": "Hoàng Thị Hòa",
        "reviewer": "Ngô Thị Thúy Nga",
        "assigned_to": None,
        "approved_by": None,
        "approved_at": None,
        "reviewed_at": None,
        "target_date": None,
        "notes": "",
        "acceptance": json.dumps(["Phạm vi có C"], ensure_ascii=False),
        "dependencies": ["PCR-EMS2-01"],
        "created_at": "2026-07-02T09:00:00+07:00",
        "updated_at": "2026-07-02T09:00:00+07:00",
    }
    row.update(over)
    return row


OPS_ROWS = [
    {"id": str(uuid4()), "op": "modify", "section_key": "s1", "after_section_key": None,
     "heading": "Mục tiêu & phạm vi", "body": "Phạm vi gồm A, B và C.", "sort_order": 1},
    {"id": str(uuid4()), "op": "add", "section_key": "s4", "after_section_key": "s1",
     "heading": "Rủi ro", "body": "Rủi ro tích hợp.", "sort_order": 2},
]


# ===========================================================================
# 1. section_ops engine
# ===========================================================================


class TestSectionOps:

    def test_modify_replaces_heading_and_body(self, ops_module):
        out = ops_module.apply_ops(
            PARITY_SECTIONS,
            [{"op": "modify", "section_key": "s2", "heading": "Tích hợp mới", "body": "Nội dung mới."}],
        )
        assert out[1] == {
            "section_key": "s2", "heading": "Tích hợp mới", "heading_level": 2, "body": "Nội dung mới.",
        }
        # không mutate input
        assert PARITY_SECTIONS[1]["heading"] == "Tích hợp"

    def test_remove_drops_section(self, ops_module):
        out = ops_module.apply_ops(PARITY_SECTIONS, [{"op": "remove", "section_key": "s2"}])
        assert [s["section_key"] for s in out] == ["s1", "s3"]

    def test_add_inserts_right_after_anchor(self, ops_module):
        out = ops_module.apply_ops(
            PARITY_SECTIONS,
            [{"op": "add", "section_key": "s9", "after_section_key": "s1",
              "heading": "Mục mới", "body": "Nội dung."}],
        )
        assert [s["section_key"] for s in out] == ["s1", "s9", "s2", "s3"]

    def test_add_without_anchor_appends_to_end(self, ops_module):
        out = ops_module.apply_ops(
            PARITY_SECTIONS,
            [{"op": "add", "section_key": "s9", "heading": "Cuối", "body": "x"}],
        )
        assert out[-1]["section_key"] == "s9"

    def test_add_with_unknown_anchor_appends_to_end(self, ops_module):
        out = ops_module.apply_ops(
            PARITY_SECTIONS,
            [{"op": "add", "section_key": "s9", "after_section_key": "sZZ",
              "heading": "Cuối", "body": "x"}],
        )
        assert out[-1]["section_key"] == "s9"

    def test_modify_unknown_section_is_ignored(self, ops_module):
        out = ops_module.apply_ops(
            PARITY_SECTIONS, [{"op": "modify", "section_key": "s99", "heading": "H", "body": "B"}]
        )
        assert len(out) == 3

    def test_ops_applied_in_order(self, ops_module):
        """add s4 rồi remove s4 → mất hẳn; đảo thứ tự thì còn."""
        add_then_remove = ops_module.apply_ops(PARITY_SECTIONS, [
            {"op": "add", "section_key": "s4", "after_section_key": "s1", "heading": "A", "body": "b"},
            {"op": "remove", "section_key": "s4"},
        ])
        assert all(s["section_key"] != "s4" for s in add_then_remove)

    def test_parity_fixture_matches_frontend(self, ops_module):
        """Cùng fixture với frontend diff.test.ts — hai bên phải cho kết quả y hệt."""
        assert ops_module.apply_ops(PARITY_SECTIONS, PARITY_OPS) == PARITY_EXPECTED

    def test_ops_delta_counts(self, ops_module):
        assert ops_module.ops_delta(PARITY_OPS) == {"add": 1, "modify": 1, "remove": 1, "move": 0}

    def test_next_section_key(self, ops_module):
        assert ops_module.next_section_key([]) == "s1"
        assert ops_module.next_section_key(PARITY_SECTIONS) == "s4"
        assert ops_module.next_section_key([{"section_key": "intro"}]) == "s1"

    def test_next_version_label(self, ops_module):
        assert ops_module.next_version_label(1) == "v1.0"
        assert ops_module.next_version_label(3) == "v3.0"

    def test_validate_ops_ok(self, ops_module):
        assert ops_module.validate_ops(PARITY_OPS, PARITY_SECTIONS) == []

    def test_validate_modify_missing_section(self, ops_module):
        errs = ops_module.validate_ops(
            [{"op": "modify", "section_key": "s99", "heading": "H", "body": "B"}], PARITY_SECTIONS
        )
        assert len(errs) == 1 and "không tồn tại" in errs[0]

    def test_validate_add_duplicate_key(self, ops_module):
        errs = ops_module.validate_ops(
            [{"op": "add", "section_key": "s1", "heading": "H", "body": "B"}], PARITY_SECTIONS
        )
        assert len(errs) == 1 and "đã tồn tại" in errs[0]

    def test_validate_add_unknown_anchor(self, ops_module):
        errs = ops_module.validate_ops(
            [{"op": "add", "section_key": "s9", "after_section_key": "sZZ",
              "heading": "H", "body": "B"}], PARITY_SECTIONS
        )
        assert len(errs) == 1 and "after_section_key" in errs[0]

    def test_validate_add_requires_heading(self, ops_module):
        errs = ops_module.validate_ops(
            [{"op": "add", "section_key": "s9", "heading": "  ", "body": "B"}], PARITY_SECTIONS
        )
        assert len(errs) == 1 and "tiêu đề" in errs[0]

    def test_validate_remove_twice(self, ops_module):
        errs = ops_module.validate_ops([
            {"op": "remove", "section_key": "s3"},
            {"op": "remove", "section_key": "s3"},
        ], PARITY_SECTIONS)
        assert len(errs) == 1

    def test_validate_add_then_modify_same_key_is_ok(self, ops_module):
        errs = ops_module.validate_ops([
            {"op": "add", "section_key": "s4", "after_section_key": "s1", "heading": "H", "body": "B"},
            {"op": "modify", "section_key": "s4", "heading": "H2", "body": "B2"},
        ], PARITY_SECTIONS)
        assert errs == []

    def test_validate_unknown_op(self, ops_module):
        errs = ops_module.validate_ops([{"op": "replace", "section_key": "s1"}], PARITY_SECTIONS)
        assert len(errs) == 1 and "op không hợp lệ" in errs[0]


# ===========================================================================
# 2. Master Docs router
# ===========================================================================


class TestMasterDocs:

    def test_list_docs(self, ba_client):
        app, client = ba_client
        db = FakeDB(fetches=[("FROM ba_master_docs d", [
            make_doc_row(section_count=8, version_count=2, cr_pending=1, cr_merged=1,
                         cr_rejected=0, last_released_on="2026-06-18"),
        ])])
        override_db(app, db)
        resp = client.get("/api/v1/ba-studio/docs")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1 and data[0]["doc_code"] == "doc-test-brs"

    def test_create_doc_rejects_bad_doc_type(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB())
        resp = client.post("/api/v1/ba-studio/docs", json={
            "project_id": PROJECT_ID, "doc_type": "SLIDE", "title": "X",
            "sections": [{"heading": "H", "body": "B"}],
        })
        assert resp.status_code == 400
        assert "doc_type" in resp.json()["detail"]

    def test_create_doc_requires_sections(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB())
        resp = client.post("/api/v1/ba-studio/docs", json={
            "project_id": PROJECT_ID, "doc_type": "BRS", "title": "X", "sections": [],
        })
        assert resp.status_code == 400
        assert "content_md" in resp.json()["detail"]

    def test_create_doc_unknown_project(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[("FROM projects WHERE id", None)]))
        resp = client.post("/api/v1/ba-studio/docs", json={
            "project_id": PROJECT_ID, "title": "X",
            "sections": [{"heading": "H", "body": "B"}],
        })
        assert resp.status_code == 404

    def test_create_doc_success_writes_base_version(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM projects WHERE id", {"id": PROJECT_ID, "code": "EMS2-UPG-2026"}),
                  ("INSERT INTO ba_master_docs", make_doc_row())],
            vals=[("SELECT 1 FROM ba_master_docs WHERE doc_code", None)],
        )
        override_db(app, db)
        resp = client.post("/api/v1/ba-studio/docs", json={
            "project_id": PROJECT_ID, "doc_type": "BRS", "title": "BRS — Tài liệu test",
            "owner": "Hoàng Thị Hòa",
            "sections": [{"heading": "Mục tiêu", "body": "A"}, {"heading": "Phạm vi", "body": "B"}],
        })
        assert resp.status_code == 201
        sql = db.executed_sql()
        assert "INSERT INTO ba_doc_sections" in sql
        assert "INSERT INTO ba_doc_versions" in sql  # snapshot bản gốc

    def test_create_doc_duplicate_code(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM projects WHERE id", {"id": PROJECT_ID, "code": "EMS2-UPG-2026"})],
            vals=[("SELECT 1 FROM ba_master_docs WHERE doc_code", 1)],
        )
        override_db(app, db)
        resp = client.post("/api/v1/ba-studio/docs", json={
            "project_id": PROJECT_ID, "doc_code": "doc-test-brs", "title": "X",
            "sections": [{"heading": "H", "body": "B"}],
        })
        assert resp.status_code == 409

    def test_get_doc_detail(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row())],
            fetches=[
                ("FROM ba_doc_sections", BASE_SECTIONS),
                ("FROM ba_doc_versions v", [{
                    "id": str(uuid4()), "version_label": "v1.0", "seq": 1, "kind": "base",
                    "note": "Bản gốc", "released_on": "2026-05-20", "released_by": "Hoàng Thị Hòa",
                    "sections": json.dumps(BASE_SECTIONS, ensure_ascii=False),
                    "source_cr_id": None, "source_cr_code": None, "source_cr_title": None,
                }]),
                ("FROM project_change_requests c", []),
            ],
        )
        override_db(app, db)
        resp = client.get(f"/api/v1/ba-studio/docs/{DOC_ID}")
        assert resp.status_code == 200
        d = resp.json()["data"]
        assert [s["section_key"] for s in d["sections"]] == ["s1", "s2", "s3"]
        assert d["next_section_key"] == "s4"
        assert d["next_version_label"] == "v2.0"
        assert d["editable_sections"] is True   # 1 version, 0 CR
        assert isinstance(d["versions"][0]["sections"], list)  # JSONB đã decode

    def test_get_doc_404(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[("FROM ba_master_docs d", None)]))
        resp = client.get(f"/api/v1/ba-studio/docs/{DOC_ID}")
        assert resp.status_code == 404

    def test_replace_sections_blocked_after_release(self, ba_client):
        """Tài liệu đã phát hành > 1 bản → phải đi qua CR, không sửa trực tiếp."""
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row(current_version="v2.0"))],
            vals=[("count(*) FROM ba_doc_versions", 2),
                  ("count(*) FROM project_change_requests", 1)],
        )
        override_db(app, db)
        resp = client.put(f"/api/v1/ba-studio/docs/{DOC_ID}/sections", json={
            "sections": [{"section_key": "s1", "heading": "H", "body": "B"}]})
        assert resp.status_code == 409
        assert "Change Request" in resp.json()["detail"]

    def test_replace_sections_ok_before_release(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row())],
            vals=[("count(*) FROM ba_doc_versions", 1),
                  ("count(*) FROM project_change_requests", 0)],
            fetches=[("FROM ba_doc_sections", BASE_SECTIONS)],
        )
        override_db(app, db)
        resp = client.put(f"/api/v1/ba-studio/docs/{DOC_ID}/sections", json={
            "sections": [{"section_key": "s1", "heading": "Mục tiêu", "body": "Nội dung mới"}]})
        assert resp.status_code == 200
        sql = db.executed_sql()
        assert "DELETE FROM ba_doc_sections" in sql
        assert "UPDATE ba_doc_versions SET sections" in sql  # snapshot bản gốc đồng bộ

    def test_delete_doc_blocked_when_has_cr(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row())],
            vals=[("count(*) FROM project_change_requests", 2),
                  ("count(*) FROM ba_doc_versions", 1)],
        )
        override_db(app, db)
        resp = client.delete(f"/api/v1/ba-studio/docs/{DOC_ID}")
        assert resp.status_code == 409

    def test_update_doc_rejects_bad_status(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[("FROM ba_master_docs d", make_doc_row())]))
        resp = client.put(f"/api/v1/ba-studio/docs/{DOC_ID}", json={"status": "deleted"})
        assert resp.status_code == 400


# ===========================================================================
# 3. Change Requests cấp tài liệu
# ===========================================================================


class TestDocChangeRequests:

    def test_list_doc_crs_only_document_crs(self, ba_client):
        app, client = ba_client
        db = FakeDB(fetches=[
            ("FROM project_change_requests c", [make_cr_row(ops_count=2)]),
            ("FROM ba_doc_cr_ops", OPS_ROWS),
        ])
        override_db(app, db)
        resp = client.get("/api/v1/ba-studio/doc-crs")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data[0]["stage"] == "approved"          # status của PCR = stage
        assert data[0]["merge_state"] == "pending"
        assert data[0]["delta"] == {"add": 1, "modify": 1, "remove": 0, "move": 0}
        assert data[0]["acceptance"] == ["Phạm vi có C"]   # JSONB decode
        assert data[0]["dependencies"] == ["PCR-EMS2-01"]

    def test_create_cr_requires_ops(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[("FROM ba_master_docs d", make_doc_row())]))
        resp = client.post("/api/v1/ba-studio/doc-crs", json={
            "target_doc_id": DOC_ID, "title": "CR rỗng", "requested_by": "A", "ops": [],
        })
        assert resp.status_code == 400

    def test_create_cr_rejects_invalid_ops(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row())],
            fetches=[("FROM ba_doc_sections", BASE_SECTIONS)],
        )
        override_db(app, db)
        resp = client.post("/api/v1/ba-studio/doc-crs", json={
            "target_doc_id": DOC_ID, "title": "CR sai", "requested_by": "A",
            "ops": [{"op": "modify", "section_key": "s99", "heading": "H", "body": "B"}],
        })
        assert resp.status_code == 422
        assert "không tồn tại" in resp.json()["detail"]

    def test_create_cr_rejects_archived_doc(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[("FROM ba_master_docs d", make_doc_row(status="archived"))]))
        resp = client.post("/api/v1/ba-studio/doc-crs", json={
            "target_doc_id": DOC_ID, "title": "CR", "requested_by": "A",
            "ops": [{"op": "modify", "section_key": "s1", "heading": "H", "body": "B"}],
        })
        assert resp.status_code == 409

    def test_create_cr_success(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row()),
                  ("INSERT INTO project_change_requests", make_cr_row(status="submitted"))],
            vals=[("nextval('pcr_seq')", 7)],
            fetches=[("FROM ba_doc_sections", BASE_SECTIONS)],
        )
        override_db(app, db)
        resp = client.post("/api/v1/ba-studio/doc-crs", json={
            "target_doc_id": DOC_ID, "title": "Mở rộng phạm vi", "requested_by": "Hoàng Thị Hòa",
            "change_type": "scope", "priority": "high",
            "acceptance": ["Phạm vi có C"], "dependencies": ["PCR-EMS2-01"],
            "ops": [
                {"op": "modify", "section_key": "s1", "heading": "Mục tiêu & phạm vi",
                 "body": "Phạm vi gồm A, B và C."},
                {"op": "add", "section_key": "s4", "after_section_key": "s1",
                 "heading": "Rủi ro", "body": "Rủi ro tích hợp."},
            ],
        })
        assert resp.status_code == 201
        sql = db.executed_sql()
        assert "INSERT INTO ba_doc_cr_ops" in sql
        assert "INSERT INTO request_history" in sql   # nhật ký dùng chung với module Requests

    def test_create_cr_invalid_change_type(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB())
        resp = client.post("/api/v1/ba-studio/doc-crs", json={
            "target_doc_id": DOC_ID, "title": "CR", "requested_by": "A",
            "change_type": "khac", "ops": [],
        })
        assert resp.status_code == 400

    def test_get_cr_detail_computes_after_sections(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM project_change_requests c", make_cr_row())],
            fetches=[("FROM ba_doc_cr_ops", OPS_ROWS),
                     ("FROM ba_doc_sections", BASE_SECTIONS)],
            vals=[("count(*) FROM ba_doc_versions", 1)],
        )
        override_db(app, db)
        resp = client.get(f"/api/v1/ba-studio/doc-crs/{CR_ID}")
        assert resp.status_code == 200
        d = resp.json()["data"]
        assert [s["section_key"] for s in d["before_sections"]] == ["s1", "s2", "s3"]
        assert [s["section_key"] for s in d["after_sections"]] == ["s1", "s4", "s2", "s3"]
        assert d["next_version_label"] == "v2.0"
        assert d["can_merge"] is True

    def test_project_level_cr_is_rejected(self, ba_client):
        """CR không gắn tài liệu thuộc module Requests, không phải BA Studio."""
        app, client = ba_client
        override_db(app, FakeDB(rows=[
            ("FROM project_change_requests c", make_cr_row(target_doc_id=None, merge_state=None))
        ]))
        resp = client.get(f"/api/v1/ba-studio/doc-crs/{CR_ID}")
        assert resp.status_code == 400
        assert "cấp dự án" in resp.json()["detail"]

    def test_stage_cannot_skip_steps(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[
            ("FROM project_change_requests c", make_cr_row(status="submitted"))
        ]))
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/stage", json={"stage": "approved"})
        assert resp.status_code == 409

    def test_stage_forward_ok_and_sets_approver(self, ba_client):
        app, client = ba_client
        db = FakeDB(rows=[("FROM project_change_requests c", make_cr_row(status="reviewing"))])
        override_db(app, db)
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/stage",
                           json={"stage": "approved", "comment": "Đồng ý"})
        assert resp.status_code == 200
        sql = db.executed_sql()
        assert "approved_by" in sql and "INSERT INTO request_history" in sql

    def test_stage_blocked_when_already_processed(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[
            ("FROM project_change_requests c", make_cr_row(merge_state="merged", status="implemented"))
        ]))
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/stage", json={"stage": "reviewing"})
        assert resp.status_code == 409

    def test_merge_requires_approved_stage(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[
            ("FROM project_change_requests c", make_cr_row(status="reviewing"))
        ]))
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/merge", json={})
        assert resp.status_code == 409
        assert "force_approve" in resp.json()["detail"]

    def test_merge_creates_new_version_snapshot(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM project_change_requests c", make_cr_row())],
            fetches=[("FROM ba_doc_cr_ops", OPS_ROWS),
                     ("FROM ba_doc_sections", BASE_SECTIONS)],
            vals=[("COALESCE(max(seq), 0)", 1)],
        )
        override_db(app, db)
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/merge", json={"comment": "OK"})
        assert resp.status_code == 200
        d = resp.json()["data"]
        assert d["version_label"] == "v2.0"
        assert d["section_count"] == 4          # 3 mục + 1 add
        assert d["delta"] == {"add": 1, "modify": 1, "remove": 0, "move": 0}

        sql = db.executed_sql()
        assert "INSERT INTO ba_doc_versions" in sql          # snapshot bất biến
        assert "DELETE FROM ba_doc_sections" in sql          # working copy được ghi lại
        assert "merge_state = 'merged'" in sql
        assert "status = 'implemented'" in sql
        assert "UPDATE ba_master_docs SET current_version" in sql

    def test_merge_force_approve_logs_both_steps(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM project_change_requests c", make_cr_row(status="submitted"))],
            fetches=[("FROM ba_doc_cr_ops", OPS_ROWS),
                     ("FROM ba_doc_sections", BASE_SECTIONS)],
            vals=[("COALESCE(max(seq), 0)", 1)],
        )
        override_db(app, db)
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/merge", json={"force_approve": True})
        assert resp.status_code == 200
        history_writes = [sql for sql, _ in db.executed if "INSERT INTO request_history" in sql]
        assert len(history_writes) == 2     # approved + implemented

    def test_merge_blocked_when_already_merged(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[
            ("FROM project_change_requests c",
             make_cr_row(merge_state="merged", merged_version="v2.0", status="implemented"))
        ]))
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/merge", json={})
        assert resp.status_code == 409
        assert "v2.0" in resp.json()["detail"]

    def test_merge_blocked_when_doc_drifted(self, ba_client):
        """Tài liệu đã đổi (mục đích của op không còn) → chặn, yêu cầu cập nhật CR."""
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM project_change_requests c", make_cr_row())],
            fetches=[("FROM ba_doc_cr_ops", OPS_ROWS),
                     # s1 đã bị xoá khỏi tài liệu → op modify s1 không áp được
                     ("FROM ba_doc_sections", [BASE_SECTIONS[1], BASE_SECTIONS[2]])],
            vals=[("COALESCE(max(seq), 0)", 1)],
        )
        override_db(app, db)
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/merge", json={})
        assert resp.status_code == 409
        assert "đã đổi" in resp.json()["detail"]

    def test_reject_sets_state_and_reason(self, ba_client):
        app, client = ba_client
        db = FakeDB(rows=[("FROM project_change_requests c", make_cr_row())])
        override_db(app, db)
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/reject",
                           json={"reason": "Ngoài phạm vi năm nay"})
        assert resp.status_code == 200
        assert resp.json()["data"]["merge_state"] == "rejected"
        assert "merge_state = 'rejected'" in db.executed_sql()

    def test_reject_requires_reason(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[("FROM project_change_requests c", make_cr_row())]))
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/reject", json={"reason": ""})
        assert resp.status_code == 422

    def test_reject_blocked_when_processed(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[
            ("FROM project_change_requests c", make_cr_row(merge_state="rejected", status="rejected"))
        ]))
        resp = client.post(f"/api/v1/ba-studio/doc-crs/{CR_ID}/reject", json={"reason": "x"})
        assert resp.status_code == 409

    def test_update_cr_blocked_when_merged(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[
            ("FROM project_change_requests c",
             make_cr_row(merge_state="merged", merged_version="v2.0"))
        ]))
        resp = client.put(f"/api/v1/ba-studio/doc-crs/{CR_ID}", json={"title": "Đổi tên"})
        assert resp.status_code == 409

    def test_update_cr_replaces_ops(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM project_change_requests c", make_cr_row())],
            fetches=[("FROM ba_doc_sections", BASE_SECTIONS),
                     ("FROM ba_doc_cr_ops", OPS_ROWS)],
        )
        override_db(app, db)
        resp = client.put(f"/api/v1/ba-studio/doc-crs/{CR_ID}", json={
            "priority": "critical",
            "ops": [{"op": "remove", "section_key": "s3"}],
        })
        assert resp.status_code == 200
        sql = db.executed_sql()
        assert "DELETE FROM ba_doc_cr_ops" in sql and "INSERT INTO ba_doc_cr_ops" in sql

    def test_delete_cr_blocked_when_processed(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB(rows=[
            ("FROM project_change_requests c", make_cr_row(merge_state="merged"))
        ]))
        resp = client.delete(f"/api/v1/ba-studio/doc-crs/{CR_ID}")
        assert resp.status_code == 409

    def test_delete_pending_cr_ok(self, ba_client):
        app, client = ba_client
        db = FakeDB(rows=[("FROM project_change_requests c", make_cr_row())])
        override_db(app, db)
        resp = client.delete(f"/api/v1/ba-studio/doc-crs/{CR_ID}")
        assert resp.status_code == 204
        assert "DELETE FROM project_change_requests" in db.executed_sql()

    def test_cr_history(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM project_change_requests c", make_cr_row())],
            fetches=[("FROM request_history", [
                {"id": str(uuid4()), "action": "created", "actor": "Hoàng Thị Hòa",
                 "from_status": None, "to_status": "submitted", "comment": "Tạo CR",
                 "created_at": "2026-07-02T09:00:00+07:00"},
            ])],
        )
        override_db(app, db)
        resp = client.get(f"/api/v1/ba-studio/doc-crs/{CR_ID}/history")
        assert resp.status_code == 200
        assert resp.json()["data"][0]["action"] == "created"


# ===========================================================================
# Markdown 1 file (V051) — engine + parity với frontend markdown.test.ts
# ===========================================================================

@pytest.fixture()
def md_module():
    """markdown_doc dùng được độc lập, không cần FastAPI app."""
    if BA_PATH not in sys.path:
        sys.path.insert(0, BA_PATH)
    from app.services import markdown_doc  # type: ignore[import]

    return markdown_doc


# ── PARITY FIXTURE — phải giống hệt PARITY_MD trong markdown.test.ts ───────
PARITY_MD = "\n".join([
    "Tài liệu nội bộ VIB.",
    "",
    "# BRS — EMS 2.0",
    "",
    "Tổng quan.",
    "",
    "## Mục tiêu",
    "",
    "Tự động hoá chi tiêu.",
    "",
    "- Điểm 1",
    "- Điểm 2",
    "",
    "### Ngoài phạm vi",
    "",
    "Không gồm kế toán.",
    "",
    "## Yêu cầu",
    "",
    "| Mã | Tên |",
    "| --- | --- |",
    "| FR-1 | Tạo đề nghị |",
    "",
    "```sql",
    "-- # không phải heading",
    "SELECT 1;",
    "```",
])

BASE_MD = "\n".join([
    "## A", "", "noi dung A", "", "## B", "", "noi dung B", "", "## C", "", "noi dung C",
])

# (tên tình huống, markdown mới) — giống hệt SCENARIOS ở markdown.test.ts
MD_SCENARIOS = [
    ("sua noi dung", "## A\n\nnoi dung A da sua\n\n## B\n\nnoi dung B\n\n## C\n\nnoi dung C"),
    ("doi ten heading", "## A moi\n\nnoi dung A\n\n## B\n\nnoi dung B\n\n## C\n\nnoi dung C"),
    ("xoa muc giua", "## A\n\nnoi dung A\n\n## C\n\nnoi dung C"),
    ("them muc cuoi", BASE_MD + "\n\n## D\n\nnoi dung D"),
    ("them muc dau", "## Z\n\nnoi dung Z\n\n" + BASE_MD),
    ("them muc giua", "## A\n\nnoi dung A\n\n## Z\n\nnoi dung Z\n\n## B\n\nnoi dung B\n\n## C\n\nnoi dung C"),
    ("dao thu tu", "## C\n\nnoi dung C\n\n## B\n\nnoi dung B\n\n## A\n\nnoi dung A"),
    ("doi cap heading", "# A\n\nnoi dung A\n\n## B\n\nnoi dung B\n\n## C\n\nnoi dung C"),
    ("them phan mo dau", "Mo dau moi\n\n" + BASE_MD),
    ("viet lai toan bo", "## X\n\nhoan toan khac\n\n## Y\n\ncung khac luon"),
    ("giu nguyen", BASE_MD),
]


def _md_of(sections) -> str:
    """Ghép BASE_SECTIONS thành Markdown như backend sẽ trả về."""
    return "\n\n".join(
        "## {}\n\n{}".format(s["heading"], s["body"]) for s in sections
    )


class TestMarkdownSplit:

    def test_parity_fixture_sections(self, md_module):
        secs = md_module.split_markdown(PARITY_MD)
        assert [(s["heading_level"], s["heading"]) for s in secs] == [
            (0, ""),
            (1, "BRS — EMS 2.0"),
            (2, "Mục tiêu"),
            (3, "Ngoài phạm vi"),
            (2, "Yêu cầu"),
        ]
        assert secs[0]["body"] == "Tài liệu nội bộ VIB."

    def test_heading_inside_code_fence_not_split(self, md_module):
        secs = md_module.split_markdown(PARITY_MD)
        assert secs[-1]["heading"] == "Yêu cầu"
        assert "-- # không phải heading" in secs[-1]["body"]
        assert "SELECT 1;" in secs[-1]["body"]

    def test_table_and_list_preserved(self, md_module):
        secs = md_module.split_markdown(PARITY_MD)
        assert "- Điểm 1" in secs[2]["body"]
        assert "| FR-1 | Tạo đề nghị |" in secs[4]["body"]

    def test_empty_input(self, md_module):
        assert md_module.split_markdown("") == []
        assert md_module.split_markdown("   \n\n  ") == []

    def test_no_heading_gives_single_preamble(self, md_module):
        secs = md_module.split_markdown("Chỉ là đoạn văn.\n\nĐoạn hai.")
        assert len(secs) == 1
        assert secs[0]["heading_level"] == 0
        assert secs[0]["body"] == "Chỉ là đoạn văn.\n\nĐoạn hai."

    def test_bare_hashes_not_heading(self, md_module):
        secs = md_module.split_markdown("## A\n\n###\n\nvăn bản")
        assert len(secs) == 1
        assert "###" in secs[0]["body"]

    def test_heading_without_space_not_heading(self, md_module):
        secs = md_module.split_markdown("##KhongCoSpace\n\nnội dung")
        assert len(secs) == 1 and secs[0]["heading_level"] == 0


class TestMarkdownNormalize:

    def test_setext_to_atx(self, md_module):
        assert md_module.normalize_markdown("Tiêu đề\n===") == "# Tiêu đề"
        assert md_module.normalize_markdown("Tiêu đề\n---") == "## Tiêu đề"

    def test_thematic_break_kept(self, md_module):
        assert md_module.normalize_markdown("văn bản\n\n---\n\nvăn bản") == "văn bản\n\n---\n\nvăn bản"

    def test_list_then_dashes_kept(self, md_module):
        assert md_module.normalize_markdown("- item\n---") == "- item\n---"

    def test_strip_indent_and_closing_hashes(self, md_module):
        assert md_module.normalize_markdown("   ## Tiêu đề ##") == "## Tiêu đề"

    def test_crlf(self, md_module):
        assert md_module.normalize_markdown("a\r\nb\rc") == "a\nb\nc"

    def test_idempotent(self, md_module):
        once = md_module.normalize_markdown(PARITY_MD)
        assert md_module.normalize_markdown(once) == once


class TestMarkdownJoin:

    def test_split_join_split_invariant(self, md_module):
        secs = md_module.split_markdown(PARITY_MD)
        assert md_module.split_markdown(md_module.join_markdown(secs)) == secs

    def test_join_is_canonical(self, md_module):
        once = md_module.join_markdown(md_module.split_markdown(PARITY_MD))
        assert md_module.join_markdown(md_module.split_markdown(once)) == once

    def test_preamble_has_no_heading_line(self, md_module):
        md = md_module.join_markdown([
            {"section_key": "s1", "heading": "", "heading_level": 0, "body": "Mở đầu"},
        ])
        assert md == "Mở đầu"

    def test_section_without_body(self, md_module):
        md = md_module.join_markdown([
            {"section_key": "s1", "heading": "Trống", "heading_level": 2, "body": ""},
        ])
        assert md == "## Trống"

    def test_legacy_snapshot_defaults_to_h2(self, md_module):
        md = md_module.join_markdown([{"section_key": "s1", "heading": "Cũ", "body": "x"}])
        assert md == "## Cũ\n\nx"


class TestAlignSections:

    def test_new_doc_keys(self, md_module):
        secs = md_module.sections_from_markdown(BASE_MD)
        assert [s["section_key"] for s in secs] == ["s1", "s2", "s3"]

    def test_rename_heading_keeps_key(self, md_module):
        old = md_module.sections_from_markdown(BASE_MD)
        new = md_module.sections_from_markdown(BASE_MD.replace("## A", "## A da doi ten"), old)
        assert new[0]["section_key"] == "s1"

    def test_rewrite_body_keeps_key(self, md_module):
        old = md_module.sections_from_markdown(BASE_MD)
        new = md_module.sections_from_markdown(BASE_MD.replace("noi dung A", "hoan toan khac roi"), old)
        assert new[0]["section_key"] == "s1"

    def test_brand_new_section_gets_new_key(self, md_module):
        old = md_module.sections_from_markdown(BASE_MD)
        new = md_module.sections_from_markdown(
            "## A\n\nnoi dung A\n\n## Z\n\nnoi dung Z hoan toan moi", old,
        )
        assert [s["section_key"] for s in new] == ["s1", "s4"]

    def test_heading_level_change_keeps_key(self, md_module):
        old = md_module.sections_from_markdown(BASE_MD)
        new = md_module.sections_from_markdown(BASE_MD.replace("## A", "# A"), old)
        assert new[0]["section_key"] == "s1" and new[0]["heading_level"] == 1

    def test_similarity(self, md_module):
        assert md_module.similarity("a b c", "a b c") == 1.0
        assert md_module.similarity("alpha beta", "gamma delta") == 0.0
        assert md_module.similarity("", "") == 1.0
        assert md_module.similarity("x", "") == 0.0
        assert md_module.similarity("Mục tiêu, phạm vi!", "mục tiêu phạm vi") == 1.0

    def test_duplicate_headings_keep_order(self, md_module):
        md = "## Giống nhau\n\nmột\n\n## Giống nhau\n\nhai"
        old = md_module.sections_from_markdown(md)
        assert [s["section_key"] for s in old] == ["s1", "s2"]
        again = md_module.align_sections(old, md_module.split_markdown(md))
        assert [s["section_key"] for s in again] == ["s1", "s2"]


class TestDeriveOps:

    @pytest.mark.parametrize("name,md", MD_SCENARIOS, ids=[n for n, _ in MD_SCENARIOS])
    def test_ops_reproduce_target(self, md_module, ops_module, name, md):
        old = md_module.sections_from_markdown(BASE_MD)
        ops, target = md_module.ops_from_markdown(old, md)
        assert ops_module.validate_ops(ops, old) == []
        assert ops_module.apply_ops(old, ops) == target

    def test_no_change_no_ops(self, md_module):
        old = md_module.sections_from_markdown(BASE_MD)
        ops, _ = md_module.ops_from_markdown(old, BASE_MD)
        assert ops == []

    def test_insert_at_top_is_add_plus_move(self, md_module):
        old = md_module.sections_from_markdown(BASE_MD)
        ops, _ = md_module.ops_from_markdown(old, "## Z\n\nnoi dung Z\n\n" + BASE_MD)
        assert [o["op"] for o in ops] == ["add", "move"]
        assert ops[1].get("after_section_key") is None

    def test_reorder_only_moves(self, md_module):
        old = md_module.sections_from_markdown(BASE_MD)
        ops, _ = md_module.ops_from_markdown(
            old, "## C\n\nnoi dung C\n\n## B\n\nnoi dung B\n\n## A\n\nnoi dung A",
        )
        assert all(o["op"] == "move" for o in ops)

    def test_delete_one_section(self, md_module):
        old = md_module.sections_from_markdown(BASE_MD)
        ops, _ = md_module.ops_from_markdown(old, "## A\n\nnoi dung A\n\n## C\n\nnoi dung C")
        assert ops == [{"op": "remove", "section_key": "s2"}]

    def test_from_empty_all_add(self, md_module, ops_module):
        target = md_module.sections_from_markdown(BASE_MD)
        ops = md_module.derive_ops([], target)
        assert all(o["op"] == "add" for o in ops)
        assert ops_module.apply_ops([], ops) == target

    def test_to_empty_all_remove(self, md_module, ops_module):
        old = md_module.sections_from_markdown(BASE_MD)
        ops = md_module.derive_ops(old, [])
        assert all(o["op"] == "remove" for o in ops)
        assert ops_module.apply_ops(old, ops) == []

    def test_large_doc(self, md_module, ops_module):
        big = "\n\n".join(
            "## Mục {}\n\nNội dung {}".format(i, i) for i in range(1, 61)
        )
        base = md_module.sections_from_markdown(big)
        edited = big.replace("Nội dung 30", "Nội dung 30 đã cập nhật")
        ops, target = md_module.ops_from_markdown(base, edited)
        assert len(ops) == 1 and ops[0]["op"] == "modify"
        assert ops_module.apply_ops(base, ops) == target


class TestMoveOp:

    def test_move_to_front(self, ops_module):
        out = ops_module.apply_ops(PARITY_SECTIONS, [{"op": "move", "section_key": "s3"}])
        assert [s["section_key"] for s in out] == ["s3", "s1", "s2"]

    def test_move_after_anchor(self, ops_module):
        out = ops_module.apply_ops(
            PARITY_SECTIONS, [{"op": "move", "section_key": "s1", "after_section_key": "s2"}],
        )
        assert [s["section_key"] for s in out] == ["s2", "s1", "s3"]

    def test_move_missing_section_ignored(self, ops_module):
        out = ops_module.apply_ops(PARITY_SECTIONS, [{"op": "move", "section_key": "sZZ"}])
        assert [s["section_key"] for s in out] == ["s1", "s2", "s3"]

    def test_move_missing_anchor_goes_last(self, ops_module):
        out = ops_module.apply_ops(
            PARITY_SECTIONS, [{"op": "move", "section_key": "s1", "after_section_key": "sZZ"}],
        )
        assert [s["section_key"] for s in out] == ["s2", "s3", "s1"]

    def test_move_keeps_content(self, ops_module):
        out = ops_module.apply_ops(PARITY_SECTIONS, [{"op": "move", "section_key": "s3"}])
        assert out[0] == {
            "section_key": "s3", "heading": "Nghiệm thu", "heading_level": 2,
            "body": "Chạy trên UAT.",
        }

    def test_validate_move_errors(self, ops_module):
        assert "không tồn tại" in ops_module.validate_ops(
            [{"op": "move", "section_key": "sZZ"}], PARITY_SECTIONS)[0]
        assert "after_section_key" in ops_module.validate_ops(
            [{"op": "move", "section_key": "s1", "after_section_key": "sZZ"}], PARITY_SECTIONS)[0]
        assert "sau chính nó" in ops_module.validate_ops(
            [{"op": "move", "section_key": "s1", "after_section_key": "s1"}], PARITY_SECTIONS)[0]

    def test_modify_changes_heading_level(self, ops_module):
        out = ops_module.apply_ops(PARITY_SECTIONS, [
            {"op": "modify", "section_key": "s1", "heading": "Mục tiêu",
             "heading_level": 1, "body": "x"},
        ])
        assert out[0]["heading_level"] == 1

    def test_preamble_add_allowed_without_heading(self, ops_module):
        assert ops_module.validate_ops([
            {"op": "add", "section_key": "s0", "heading": "", "heading_level": 0, "body": "Mở đầu"},
        ], PARITY_SECTIONS) == []

    def test_empty_heading_at_level_2_rejected(self, ops_module):
        errs = ops_module.validate_ops([
            {"op": "add", "section_key": "s9", "heading": "", "heading_level": 2, "body": "x"},
        ], PARITY_SECTIONS)
        assert "tiêu đề" in errs[0]

    def test_heading_level_out_of_range(self, ops_module):
        errs = ops_module.validate_ops([
            {"op": "modify", "section_key": "s1", "heading": "H", "heading_level": 9, "body": "x"},
        ], PARITY_SECTIONS)
        assert "0..6" in errs[0]


class TestMarkdownEndpoints:

    def test_create_doc_from_content_md(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM projects WHERE id", {"id": PROJECT_ID, "code": "EMS2-UPG-2026"}),
                  ("INSERT INTO ba_master_docs", make_doc_row())],
            vals=[("SELECT 1 FROM ba_master_docs WHERE doc_code", None)],
        )
        override_db(app, db)
        resp = client.post("/api/v1/ba-studio/docs", json={
            "project_id": PROJECT_ID, "doc_type": "BRS", "title": "BRS — từ file .md",
            "content_md": "# Tiêu đề\n\nMở đầu.\n\n## Mục tiêu\n\nNội dung mục tiêu.",
        })
        assert resp.status_code == 201
        sql = db.executed_sql()
        assert "INSERT INTO ba_doc_sections" in sql
        assert "INSERT INTO ba_doc_versions" in sql

    def test_create_doc_rejects_blank_content_md(self, ba_client):
        app, client = ba_client
        override_db(app, FakeDB())
        resp = client.post("/api/v1/ba-studio/docs", json={
            "project_id": PROJECT_ID, "doc_type": "BRS", "title": "X", "content_md": "   ",
        })
        assert resp.status_code == 400

    def test_get_doc_returns_content_md(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row())],
            fetches=[
                ("FROM ba_doc_sections", BASE_SECTIONS),
                ("FROM ba_doc_versions v", [{
                    "id": str(uuid4()), "version_label": "v1.0", "seq": 1, "kind": "base",
                    "note": "Bản gốc", "released_on": "2026-05-20", "released_by": "Hoàng Thị Hòa",
                    "sections": json.dumps(BASE_SECTIONS, ensure_ascii=False),
                    "source_cr_id": None, "source_cr_code": None, "source_cr_title": None,
                }]),
                ("FROM project_change_requests c", []),
            ],
        )
        override_db(app, db)
        resp = client.get("/api/v1/ba-studio/docs/{}".format(DOC_ID))
        d = resp.json()["data"]
        assert d["content_md"].startswith("## ")
        assert BASE_SECTIONS[0]["heading"] in d["content_md"]
        assert d["versions"][0]["content_md"].startswith("## ")

    def test_replace_content_md_before_release(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row())],
            vals=[("count(*) FROM ba_doc_versions", 1),
                  ("count(*) FROM project_change_requests", 0)],
            fetches=[("FROM ba_doc_sections", BASE_SECTIONS)],
        )
        override_db(app, db)
        resp = client.put("/api/v1/ba-studio/docs/{}/sections".format(DOC_ID), json={
            "content_md": "## Mục tiêu & phạm vi\n\nĐã viết lại.\n\n## Mục mới\n\nNội dung mới.",
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "content_md" in data
        # giữ key s1 (tiêu đề không đổi) + mục mới nhận s4, không tái dùng s2/s3 đã xoá
        assert [s["section_key"] for s in data["sections"]] == ["s1", "s4"]

    def test_replace_content_md_new_key_when_section_unrecognisable(self, ba_client):
        """Đổi cả tiêu đề lẫn nội dung quá nhiều → coi là mục khác, nhận key mới.

        Có chủ ý: nếu ép khớp thì diff sẽ báo "sửa mục" cho hai mục không liên quan,
        người review sẽ hiểu sai lịch sử tài liệu.
        """
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row())],
            vals=[("count(*) FROM ba_doc_versions", 1),
                  ("count(*) FROM project_change_requests", 0)],
            fetches=[("FROM ba_doc_sections", BASE_SECTIONS)],
        )
        override_db(app, db)
        resp = client.put("/api/v1/ba-studio/docs/{}/sections".format(DOC_ID), json={
            "content_md": "## Chủ đề hoàn toàn khác\n\nKhông liên quan gì tới bản cũ.",
        })
        assert resp.status_code == 200
        assert [s["section_key"] for s in resp.json()["data"]["sections"]] == ["s4"]

    def test_create_cr_from_content_md_derives_ops(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row()),
                  ("INSERT INTO project_change_requests", make_cr_row())],
            fetches=[("FROM ba_doc_sections", BASE_SECTIONS)],
            vals=[("nextval('pcr_seq')", 7)],
        )
        override_db(app, db)
        new_md = _md_of(BASE_SECTIONS).replace(
            BASE_SECTIONS[0]["body"], "Nội dung mới hoàn toàn khác.",
        )
        resp = client.post("/api/v1/ba-studio/doc-crs", json={
            "target_doc_id": DOC_ID,
            "title": "Sửa mục tiêu bằng cách sửa file .md",
            "change_type": "scope", "priority": "high", "requested_by": "Nguyễn Văn A",
            "acceptance": [], "dependencies": [], "content_md": new_md,
        })
        assert resp.status_code == 201
        assert "INSERT INTO ba_doc_cr_ops" in db.executed_sql()
        assert resp.json()["data"]["delta"]["modify"] == 1

    def test_create_cr_rejects_unchanged_content(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM ba_master_docs d", make_doc_row())],
            fetches=[("FROM ba_doc_sections", BASE_SECTIONS)],
        )
        override_db(app, db)
        resp = client.post("/api/v1/ba-studio/doc-crs", json={
            "target_doc_id": DOC_ID, "title": "Không đổi gì",
            "change_type": "scope", "priority": "low", "requested_by": "Nguyễn Văn A",
            "acceptance": [], "dependencies": [], "content_md": _md_of(BASE_SECTIONS),
        })
        assert resp.status_code == 400
        assert "không khác bản hiện hành" in resp.json()["detail"]

    def test_cr_detail_returns_before_after_markdown_and_drift(self, ba_client):
        app, client = ba_client
        ops = [{"id": str(uuid4()), "op": "modify", "section_key": "s1",
                "after_section_key": None, "heading": "Mục tiêu mới", "heading_level": 2,
                "body": "Nội dung mới.", "sort_order": 1}]
        db = FakeDB(
            rows=[("FROM project_change_requests c", make_cr_row(merge_state="pending"))],
            fetches=[("FROM ba_doc_cr_ops", ops), ("FROM ba_doc_sections", BASE_SECTIONS)],
            vals=[("count(*) FROM ba_doc_versions", 2)],
        )
        override_db(app, db)
        resp = client.get("/api/v1/ba-studio/doc-crs/{}".format(CR_ID))
        assert resp.status_code == 200
        d = resp.json()["data"]
        assert d["before_content_md"].startswith("## ")
        assert "Nội dung mới." in d["after_content_md"]
        assert d["drift"] == []

    def test_cr_detail_flags_drift_when_section_gone(self, ba_client):
        app, client = ba_client
        ops = [{"id": str(uuid4()), "op": "modify", "section_key": "s404",
                "after_section_key": None, "heading": "Mục đã mất", "heading_level": 2,
                "body": "x", "sort_order": 1}]
        db = FakeDB(
            rows=[("FROM project_change_requests c", make_cr_row(merge_state="pending"))],
            fetches=[("FROM ba_doc_cr_ops", ops), ("FROM ba_doc_sections", BASE_SECTIONS)],
            vals=[("count(*) FROM ba_doc_versions", 2)],
        )
        override_db(app, db)
        d = client.get("/api/v1/ba-studio/doc-crs/{}".format(CR_ID)).json()["data"]
        assert len(d["drift"]) == 1
        assert "không tồn tại" in d["drift"][0]

    def test_update_cr_with_content_md(self, ba_client):
        app, client = ba_client
        db = FakeDB(
            rows=[("FROM project_change_requests c", make_cr_row(merge_state="pending"))],
            fetches=[("FROM ba_doc_sections", BASE_SECTIONS), ("FROM ba_doc_cr_ops", [])],
        )
        override_db(app, db)
        resp = client.put("/api/v1/ba-studio/doc-crs/{}".format(CR_ID), json={
            "content_md": _md_of(BASE_SECTIONS) + "\n\n## Mục bổ sung\n\nNội dung bổ sung.",
        })
        assert resp.status_code == 200
        sql = db.executed_sql()
        assert "DELETE FROM ba_doc_cr_ops" in sql
        assert "INSERT INTO ba_doc_cr_ops" in sql
