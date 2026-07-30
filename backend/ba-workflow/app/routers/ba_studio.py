"""
BA Studio Router — Master Doc có version + Change Request cấp tài liệu.

Mô hình:
    ba_master_docs   : header tài liệu (BRS/FSD…) thuộc 1 project
    ba_doc_sections  : mục nội dung của BẢN HIỆN HÀNH (working copy)
    ba_doc_versions  : bản đã phát hành — snapshot JSONB bất biến
    project_change_requests (+ target_doc_id/merge_state/…) : SỔ CR dùng chung với module Requests
    ba_doc_cr_ops    : section ops của CR

Vòng đời CR tài liệu:
    tạo → stage submitted → reviewing → approved → MERGE (sinh version mới) | TỪ CHỐI
    merge_state: pending → merged | rejected      (trục kết quả với tài liệu)
    status     : stage trong quy trình phê duyệt  (dùng enum sẵn có của PCR)

LƯU Ý asyncpg: pool của service này KHÔNG đăng ký jsonb codec (khác ppg),
nên phải json.dumps() khi ghi và json.loads() khi đọc JSONB — giống ba_documents_v2.py.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any, Optional
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.auth import CurrentUser
from app.database import get_db
from app.services.audit_service import log_audit
from app.services.markdown_doc import (
    join_markdown,
    ops_from_markdown,
    sections_from_markdown,
)
from app.services.section_ops import (
    apply_ops,
    next_section_key,
    next_version_label,
    ops_delta,
    section_level,
    validate_ops,
)

router = APIRouter(prefix="/api/v1/ba-studio", tags=["ba-studio"])

# ── Constants ────────────────────────────────────────────────────────────────

DOC_TYPES = {"BRS", "FSD", "BRD", "FRS", "SRS"}
DOC_STATUSES = {"active", "archived"}
CHANGE_TYPES = {"scope", "timeline", "resource", "budget", "technical", "process", "other"}
PRIORITIES = {"critical", "high", "medium", "low"}
# stage mà một CR đang chờ (merge_state='pending') được phép ở
OPEN_STAGES = {"submitted", "reviewing", "approved"}
STAGE_FLOW = {
    "submitted": {"reviewing"},
    "reviewing": {"approved", "submitted"},
    "approved": {"reviewing"},
}

# ── Schemas ──────────────────────────────────────────────────────────────────


class SectionIn(BaseModel):
    section_key: Optional[str] = Field(None, max_length=50)
    heading: str = Field("", max_length=500)
    heading_level: Optional[int] = Field(None, ge=0, le=6)
    body: str = ""


class MasterDocCreate(BaseModel):
    project_id: str = Field(..., min_length=1)
    doc_type: str = "BRS"
    title: str = Field(..., min_length=1, max_length=500)
    doc_code: Optional[str] = Field(None, max_length=100)
    abbr: Optional[str] = None
    owner: Optional[str] = None
    base_version: str = "v1.0"
    base_date: Optional[str] = None
    base_note: Optional[str] = None
    #: Cách dùng chính: cả tài liệu là MỘT chuỗi Markdown (V051).
    #: `sections` chỉ còn để tương thích với client cũ.
    content_md: Optional[str] = None
    sections: list[SectionIn] = Field(default_factory=list)


class MasterDocUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    abbr: Optional[str] = None
    owner: Optional[str] = None
    base_note: Optional[str] = None
    doc_type: Optional[str] = None
    status: Optional[str] = None


class SectionsReplace(BaseModel):
    content_md: Optional[str] = None
    sections: list[SectionIn] = Field(default_factory=list)


class OpIn(BaseModel):
    op: str
    section_key: str = Field(..., min_length=1, max_length=50)
    after_section_key: Optional[str] = Field(None, max_length=50)
    heading: Optional[str] = Field(None, max_length=500)
    heading_level: Optional[int] = Field(None, ge=0, le=6)
    body: Optional[str] = None


class DocCRCreate(BaseModel):
    target_doc_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    change_type: str = "other"
    priority: str = "medium"
    stage: str = "submitted"
    requested_by: str = Field(..., min_length=1)
    reviewer: Optional[str] = None
    impact_scope: Optional[str] = None
    notes: Optional[str] = None
    acceptance: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    #: Cách dùng chính: BA sửa cả file Markdown, backend tự suy ra section ops.
    content_md: Optional[str] = None
    ops: list[OpIn] = Field(default_factory=list)


class DocCRUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    change_type: Optional[str] = None
    priority: Optional[str] = None
    reviewer: Optional[str] = None
    impact_scope: Optional[str] = None
    notes: Optional[str] = None
    acceptance: Optional[list[str]] = None
    dependencies: Optional[list[str]] = None
    content_md: Optional[str] = None
    ops: Optional[list[OpIn]] = None


class StageChange(BaseModel):
    stage: str
    comment: Optional[str] = None


class MergeRequest(BaseModel):
    comment: Optional[str] = None
    # BA có quyền phê duyệt: cho phép "phê duyệt rồi merge" trong 1 hành động,
    # vẫn ghi đủ 2 bước vào request_history để truy vết.
    force_approve: bool = False


class RejectRequest(BaseModel):
    reason: str = Field(..., min_length=1)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _jsonb(value: Any) -> Any:
    """JSONB đọc từ pool không có codec → str. Trả về object Python."""
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def _parse_date(value: Optional[str], field: str) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        raise HTTPException(400, f"{field} không đúng định dạng YYYY-MM-DD: {value}")


def _slugify_doc_code(project_code: str, doc_type: str) -> str:
    base = f"doc-{project_code}-{doc_type}".lower()
    return "".join(ch if ch.isalnum() or ch == "-" else "-" for ch in base)


async def _get_doc_or_404(db: asyncpg.Connection, doc_id: str) -> asyncpg.Record:
    try:
        row = await db.fetchrow(
            """
            SELECT d.*, p.code AS project_code, p.name AS project_name
              FROM ba_master_docs d
              LEFT JOIN projects p ON p.id = d.project_id
             WHERE d.id = $1::uuid
            """,
            doc_id,
        )
    except asyncpg.DataError:
        raise HTTPException(400, f"doc_id không hợp lệ: {doc_id}")
    if not row:
        raise HTTPException(404, "Tài liệu không tồn tại")
    return row


async def _get_cr_or_404(db: asyncpg.Connection, pcr_id: str) -> asyncpg.Record:
    try:
        row = await db.fetchrow(
            """
            SELECT c.*, p.code AS project_code, p.name AS project_name,
                   d.doc_code, d.title AS doc_title, d.doc_type,
                   d.current_version AS doc_current_version
              FROM project_change_requests c
              LEFT JOIN projects p       ON p.id = c.project_id
              LEFT JOIN ba_master_docs d ON d.id = c.target_doc_id
             WHERE c.id = $1::uuid
            """,
            pcr_id,
        )
    except asyncpg.DataError:
        raise HTTPException(400, f"cr_id không hợp lệ: {pcr_id}")
    if not row:
        raise HTTPException(404, "Change Request không tồn tại")
    if not row["target_doc_id"]:
        raise HTTPException(
            400,
            f"{row['request_code']} là CR cấp dự án (không gắn tài liệu) — "
            "quản lý ở module Requests, không thuộc BA Studio",
        )
    return row


async def _sections(db: asyncpg.Connection, doc_id: str) -> list[dict]:
    rows = await db.fetch(
        """
        SELECT section_key, heading, heading_level, body, sort_order
          FROM ba_doc_sections WHERE doc_id = $1::uuid ORDER BY sort_order, section_key
        """,
        doc_id,
    )
    return [dict(r) for r in rows]


async def _ops(db: asyncpg.Connection, pcr_id: str) -> list[dict]:
    rows = await db.fetch(
        """
        SELECT id, op, section_key, after_section_key, heading, heading_level, body, sort_order
          FROM ba_doc_cr_ops WHERE pcr_id = $1::uuid ORDER BY sort_order, created_at
        """,
        pcr_id,
    )
    return [dict(r) for r in rows]


def _snapshot_json(sections: list[dict]) -> str:
    return json.dumps(
        [
            {
                "section_key": s["section_key"],
                "heading": s.get("heading") or "",
                "heading_level": section_level(s),
                "body": s.get("body") or "",
            }
            for s in sections
        ],
        ensure_ascii=False,
    )


async def _replace_sections(db: asyncpg.Connection, doc_id: str, sections: list[dict]) -> None:
    """Ghi lại toàn bộ working copy. Gọi trong transaction."""
    await db.execute("DELETE FROM ba_doc_sections WHERE doc_id = $1::uuid", doc_id)
    for idx, s in enumerate(sections, start=1):
        await db.execute(
            """
            INSERT INTO ba_doc_sections
                (id, doc_id, section_key, heading, heading_level, body, sort_order)
            VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
            """,
            str(uuid4()), doc_id, s["section_key"], s.get("heading") or "",
            section_level(s), s.get("body") or "", idx,
        )


async def _insert_ops(db: asyncpg.Connection, pcr_id: str, ops: list[dict]) -> None:
    """Ghi section ops của một CR. Gọi trong transaction."""
    for idx, o in enumerate(ops, start=1):
        await db.execute(
            """
            INSERT INTO ba_doc_cr_ops
                (id, pcr_id, op, section_key, after_section_key, heading, heading_level,
                 body, sort_order)
            VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9)
            """,
            str(uuid4()), pcr_id, o["op"], o["section_key"], o.get("after_section_key"),
            o.get("heading"), o.get("heading_level"), o.get("body"), idx,
        )


def _prepare_ops(
    ops_in: list[OpIn],
    content_md: Optional[str],
    current: list[dict],
) -> list[dict]:
    """
    Section ops của CR từ payload.

    Ưu tiên `content_md`: BA sửa cả file Markdown, backend tự so với bản hiện
    hành để suy ra ops (add/modify/remove/move). Nhờ đó CR vẫn là một *patch*
    cấp mục — hai CR sửa hai mục khác nhau vẫn merge độc lập được.
    """
    if content_md is not None and content_md.strip():
        ops, _target = ops_from_markdown(current, content_md)
        if not ops:
            raise HTTPException(
                400, "Nội dung không khác bản hiện hành — Change Request phải có thay đổi"
            )
        return ops
    if not ops_in:
        raise HTTPException(
            400,
            "Change Request phải có nội dung mới (content_md) hoặc ít nhất 1 thay đổi mục",
        )
    return [o.model_dump() for o in ops_in]


def _prepare_sections(
    sections: list[SectionIn],
    content_md: Optional[str],
    current: Optional[list[dict]] = None,
) -> list[dict]:
    """
    Chuẩn hoá nội dung tài liệu từ payload.

    Ưu tiên `content_md` (cách dùng chính từ V051: tài liệu là 1 file Markdown) —
    tách theo heading và giữ lại section_key của mục cũ tương ứng để CR/diff sau
    này vẫn nhận ra là "sửa mục" chứ không phải "xoá rồi thêm".
    """
    if content_md is not None and content_md.strip():
        prepared = sections_from_markdown(content_md, current or [])
        if not prepared:
            raise HTTPException(400, "Nội dung Markdown rỗng — tài liệu phải có nội dung")
        return prepared

    if not sections:
        raise HTTPException(400, "Tài liệu phải có nội dung (content_md) hoặc ít nhất 1 mục")

    prepared = []
    for s in sections:
        key = (s.section_key or "").strip() or next_section_key(prepared)
        if any(p["section_key"] == key for p in prepared):
            raise HTTPException(400, f"section_key trùng nhau: {key}")
        level = s.heading_level if s.heading_level is not None else (2 if s.heading.strip() else 0)
        if level > 0 and not s.heading.strip():
            raise HTTPException(400, f"Mục '{key}' phải có tiêu đề")
        prepared.append({
            "section_key": key,
            "heading": s.heading,
            "heading_level": level,
            "body": s.body,
        })
    return prepared


async def _log_request_history(
    db: asyncpg.Connection,
    pcr_id: str,
    action: str,
    actor: str,
    from_status: Optional[str] = None,
    to_status: Optional[str] = None,
    comment: Optional[str] = None,
) -> None:
    """Ghi vào request_history — cùng bảng module Requests dùng (V040)."""
    await db.execute(
        """
        INSERT INTO request_history (ref_type, ref_id, action, actor, from_status, to_status, comment)
        VALUES ('pcr', $1::uuid, $2, $3, $4, $5, $6)
        """,
        pcr_id, action, actor, from_status, to_status, comment,
    )


def _cr_dict(row: asyncpg.Record, delta: Optional[dict] = None) -> dict:
    d = dict(row)
    d["acceptance"] = _jsonb(d.get("acceptance")) or []
    d["dependencies"] = list(d.get("dependencies") or [])
    # 'status' của PCR chính là stage trong quy trình phê duyệt của BA Studio
    d["stage"] = d.get("status")
    if delta is not None:
        d["delta"] = delta
    return d


async def _next_pcr_code(db: asyncpg.Connection) -> str:
    seq = await db.fetchval("SELECT nextval('pcr_seq')")
    return f"PCR-{datetime.now().year}-{seq:03d}"


def _validate_cr_enums(change_type: Optional[str], priority: Optional[str], stage: Optional[str]) -> None:
    if change_type and change_type not in CHANGE_TYPES:
        raise HTTPException(400, f"change_type không hợp lệ: {change_type}")
    if priority and priority not in PRIORITIES:
        raise HTTPException(400, f"priority không hợp lệ: {priority}")
    if stage and stage not in OPEN_STAGES:
        raise HTTPException(
            400, f"stage không hợp lệ: {stage} (chỉ {sorted(OPEN_STAGES)})"
        )


# ═════════════════════════════════════════════════════════════════════════════
# MASTER DOCS
# ═════════════════════════════════════════════════════════════════════════════


@router.get("/docs")
async def list_master_docs(
    user: CurrentUser,
    project_id: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    clauses: list[str] = []
    params: list = []
    i = 1
    if project_id:
        clauses.append(f"d.project_id = ${i}::uuid"); params.append(project_id); i += 1
    if doc_type:
        clauses.append(f"d.doc_type = ${i}"); params.append(doc_type); i += 1
    if status:
        clauses.append(f"d.status = ${i}"); params.append(status); i += 1
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    rows = await db.fetch(
        f"""
        SELECT d.*, p.code AS project_code, p.name AS project_name,
               (SELECT count(*) FROM ba_doc_sections s WHERE s.doc_id = d.id)          AS section_count,
               (SELECT count(*) FROM ba_doc_versions v WHERE v.doc_id = d.id)          AS version_count,
               (SELECT max(v.released_on) FROM ba_doc_versions v WHERE v.doc_id = d.id) AS last_released_on,
               (SELECT count(*) FROM project_change_requests c
                 WHERE c.target_doc_id = d.id AND c.merge_state = 'pending')            AS cr_pending,
               (SELECT count(*) FROM project_change_requests c
                 WHERE c.target_doc_id = d.id AND c.merge_state = 'merged')             AS cr_merged,
               (SELECT count(*) FROM project_change_requests c
                 WHERE c.target_doc_id = d.id AND c.merge_state = 'rejected')           AS cr_rejected
          FROM ba_master_docs d
          LEFT JOIN projects p ON p.id = d.project_id
          {where}
         ORDER BY d.updated_at DESC
        """,
        *params,
    )
    return {"data": [dict(r) for r in rows]}


@router.post("/docs", status_code=201)
async def create_master_doc(
    body: MasterDocCreate,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    if body.doc_type not in DOC_TYPES:
        raise HTTPException(400, f"doc_type không hợp lệ: {body.doc_type} (chỉ {sorted(DOC_TYPES)})")
    prepared = _prepare_sections(body.sections, body.content_md)

    try:
        project = await db.fetchrow("SELECT id, code FROM projects WHERE id = $1::uuid", body.project_id)
    except asyncpg.DataError:
        raise HTTPException(400, f"project_id không hợp lệ: {body.project_id}")
    if not project:
        raise HTTPException(404, f"Dự án '{body.project_id}' không tồn tại")

    explicit_code = (body.doc_code or "").strip()
    if explicit_code:
        doc_code = explicit_code
        if await db.fetchval("SELECT 1 FROM ba_master_docs WHERE doc_code = $1", doc_code):
            raise HTTPException(409, f"Mã tài liệu '{doc_code}' đã tồn tại")
    else:
        # tự sinh: 1 dự án có thể có nhiều BRS → thêm hậu tố -2, -3… thay vì báo lỗi
        base = _slugify_doc_code(project["code"], body.doc_type)
        doc_code = base
        suffix = 1
        while await db.fetchval("SELECT 1 FROM ba_master_docs WHERE doc_code = $1", doc_code):
            suffix += 1
            doc_code = f"{base}-{suffix}"
            if suffix > 50:
                raise HTTPException(409, f"Không sinh được mã tài liệu duy nhất từ '{base}'")

    base_date = _parse_date(body.base_date, "base_date") or date.today()
    doc_id = str(uuid4())

    async with db.transaction():
        row = await db.fetchrow(
            """
            INSERT INTO ba_master_docs
                (id, doc_code, project_id, doc_type, title, abbr, owner,
                 base_version, base_date, base_note, current_version, created_by, updated_by)
            VALUES ($1::uuid,$2,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$8,$11,$11)
            RETURNING *
            """,
            doc_id, doc_code, body.project_id, body.doc_type, body.title, body.abbr,
            body.owner, body.base_version, base_date, body.base_note, user.sub,
        )
        await _replace_sections(db, doc_id, prepared)
        await db.execute(
            """
            INSERT INTO ba_doc_versions
                (id, doc_id, version_label, seq, kind, note, released_on, released_by, sections)
            VALUES ($1::uuid,$2::uuid,$3,1,'base',$4,$5,$6,$7::jsonb)
            """,
            str(uuid4()), doc_id, body.base_version, body.base_note, base_date,
            body.owner or user.sub, _snapshot_json(prepared),
        )

    await log_audit(
        db=db, entity_type="ba_master_docs", entity_id=doc_id, action="CREATE",
        changed_by=user.sub,
        new_values={"doc_code": doc_code, "title": body.title, "doc_type": body.doc_type,
                    "sections": len(prepared)},
    )
    return {"data": dict(row)}


@router.get("/docs/{doc_id}")
async def get_master_doc(
    doc_id: str,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    doc = await _get_doc_or_404(db, doc_id)
    sections = await _sections(db, doc_id)

    ver_rows = await db.fetch(
        """
        SELECT v.id, v.version_label, v.seq, v.kind, v.note, v.released_on, v.released_by,
               v.sections, v.source_cr_id, c.request_code AS source_cr_code, c.title AS source_cr_title
          FROM ba_doc_versions v
          LEFT JOIN project_change_requests c ON c.id = v.source_cr_id
         WHERE v.doc_id = $1::uuid
         ORDER BY v.seq
        """,
        doc_id,
    )
    versions = []
    for r in ver_rows:
        v = dict(r)
        v["sections"] = _jsonb(v.get("sections")) or []
        v["content_md"] = join_markdown(v["sections"])
        if v.get("source_cr_id"):
            v["delta"] = ops_delta(await _ops(db, str(v["source_cr_id"])))
        versions.append(v)

    cr_rows = await db.fetch(
        """
        SELECT c.*, p.code AS project_code, p.name AS project_name
          FROM project_change_requests c
          LEFT JOIN projects p ON p.id = c.project_id
         WHERE c.target_doc_id = $1::uuid
         ORDER BY c.created_at DESC
        """,
        doc_id,
    )
    crs = [_cr_dict(r, ops_delta(await _ops(db, str(r["id"])))) for r in cr_rows]

    data = dict(doc)
    data["sections"] = sections
    data["content_md"] = join_markdown(sections)
    data["versions"] = versions
    data["change_requests"] = crs
    data["next_section_key"] = next_section_key(sections)
    data["next_version_label"] = next_version_label(len(versions) + 1)
    data["editable_sections"] = len(versions) <= 1 and len(crs) == 0
    return {"data": data}


@router.put("/docs/{doc_id}")
async def update_master_doc(
    doc_id: str,
    body: MasterDocUpdate,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    existing = await _get_doc_or_404(db, doc_id)
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "Không có trường nào để cập nhật")
    if "doc_type" in updates and updates["doc_type"] not in DOC_TYPES:
        raise HTTPException(400, f"doc_type không hợp lệ: {updates['doc_type']}")
    if "status" in updates and updates["status"] not in DOC_STATUSES:
        raise HTTPException(400, f"status không hợp lệ: {updates['status']}")

    sets = [f"{k} = ${i + 2}" for i, k in enumerate(updates.keys())]
    row = await db.fetchrow(
        f"UPDATE ba_master_docs SET {', '.join(sets)}, updated_at = NOW(), updated_by = $1 "
        f"WHERE id = ${len(updates) + 2}::uuid RETURNING *",
        user.sub, *updates.values(), doc_id,
    )
    await log_audit(
        db=db, entity_type="ba_master_docs", entity_id=doc_id, action="UPDATE",
        changed_by=user.sub,
        old_values={k: existing[k] for k in updates.keys() if k in existing},
        new_values=updates,
    )
    return {"data": dict(row)}


@router.put("/docs/{doc_id}/sections")
async def replace_doc_sections(
    doc_id: str,
    body: SectionsReplace,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """
    Sửa trực tiếp nội dung tài liệu — CHỈ khi tài liệu chưa phát hành bản nào ngoài bản gốc
    và chưa có CR nào. Sau đó mọi thay đổi phải đi qua Change Request (giá trị cốt lõi:
    tài liệu đã lưu hành thì không sửa lén, phải có vết CR + diff được review).
    """
    doc = await _get_doc_or_404(db, doc_id)

    version_count = await db.fetchval(
        "SELECT count(*) FROM ba_doc_versions WHERE doc_id = $1::uuid", doc_id
    )
    cr_count = await db.fetchval(
        "SELECT count(*) FROM project_change_requests WHERE target_doc_id = $1::uuid", doc_id
    )
    if version_count > 1 or cr_count > 0:
        raise HTTPException(
            409,
            "Tài liệu đã phát hành phiên bản hoặc đã có Change Request — "
            "phải tạo Change Request để thay đổi nội dung, không sửa trực tiếp.",
        )

    existing = await _sections(db, doc_id)
    prepared = _prepare_sections(body.sections, body.content_md, existing)

    async with db.transaction():
        await _replace_sections(db, doc_id, prepared)
        # bản gốc chưa lưu hành → cập nhật luôn snapshot để không lệch
        await db.execute(
            "UPDATE ba_doc_versions SET sections = $1::jsonb WHERE doc_id = $2::uuid AND seq = 1",
            _snapshot_json(prepared), doc_id,
        )
        await db.execute(
            "UPDATE ba_master_docs SET updated_at = NOW(), updated_by = $1 WHERE id = $2::uuid",
            user.sub, doc_id,
        )

    await log_audit(
        db=db, entity_type="ba_master_docs", entity_id=doc_id, action="UPDATE",
        changed_by=user.sub,
        old_values={"section_count": len(existing)},
        new_values={"section_count": len(prepared)},
        notes=f"Cập nhật nội dung bản gốc {doc['base_version']}",
    )
    return {
        "data": {
            "doc_id": doc_id,
            "sections": prepared,
            "content_md": join_markdown(prepared),
        }
    }


@router.delete("/docs/{doc_id}", status_code=204, response_class=Response)
async def delete_master_doc(
    doc_id: str,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> Response:
    doc = await _get_doc_or_404(db, doc_id)
    cr_count = await db.fetchval(
        "SELECT count(*) FROM project_change_requests WHERE target_doc_id = $1::uuid", doc_id
    )
    version_count = await db.fetchval(
        "SELECT count(*) FROM ba_doc_versions WHERE doc_id = $1::uuid", doc_id
    )
    if cr_count > 0 or version_count > 1:
        raise HTTPException(
            409,
            "Không xoá được tài liệu đã có Change Request hoặc đã phát hành nhiều phiên bản. "
            "Dùng trạng thái 'archived' để lưu trữ.",
        )
    await db.execute("DELETE FROM ba_master_docs WHERE id = $1::uuid", doc_id)
    await log_audit(
        db=db, entity_type="ba_master_docs", entity_id=doc_id, action="DELETE",
        changed_by=user.sub, old_values={"doc_code": doc["doc_code"], "title": doc["title"]},
    )
    return Response(status_code=204)


@router.get("/docs/{doc_id}/versions")
async def list_doc_versions(
    doc_id: str,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    await _get_doc_or_404(db, doc_id)
    rows = await db.fetch(
        """
        SELECT v.id, v.version_label, v.seq, v.kind, v.note, v.released_on, v.released_by,
               v.sections, v.source_cr_id, c.request_code AS source_cr_code
          FROM ba_doc_versions v
          LEFT JOIN project_change_requests c ON c.id = v.source_cr_id
         WHERE v.doc_id = $1::uuid ORDER BY v.seq
        """,
        doc_id,
    )
    out = []
    for r in rows:
        v = dict(r)
        v["sections"] = _jsonb(v.get("sections")) or []
        v["content_md"] = join_markdown(v["sections"])
        out.append(v)
    return {"data": out}


# ═════════════════════════════════════════════════════════════════════════════
# CHANGE REQUESTS (tài liệu) — ghi vào project_change_requests
# ═════════════════════════════════════════════════════════════════════════════


@router.get("/doc-crs")
async def list_doc_crs(
    user: CurrentUser,
    doc_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    merge_state: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    clauses = ["c.target_doc_id IS NOT NULL"]
    params: list = []
    i = 1
    if doc_id:
        clauses.append(f"c.target_doc_id = ${i}::uuid"); params.append(doc_id); i += 1
    if project_id:
        clauses.append(f"c.project_id = ${i}::uuid"); params.append(project_id); i += 1
    if merge_state:
        clauses.append(f"c.merge_state = ${i}"); params.append(merge_state); i += 1
    if stage:
        clauses.append(f"c.status = ${i}"); params.append(stage); i += 1

    rows = await db.fetch(
        f"""
        SELECT c.*, p.code AS project_code, p.name AS project_name,
               d.doc_code, d.title AS doc_title, d.doc_type,
               d.current_version AS doc_current_version,
               (SELECT count(*) FROM ba_doc_cr_ops o WHERE o.pcr_id = c.id) AS ops_count
          FROM project_change_requests c
          LEFT JOIN projects p       ON p.id = c.project_id
          LEFT JOIN ba_master_docs d ON d.id = c.target_doc_id
         WHERE {' AND '.join(clauses)}
         ORDER BY c.created_at DESC
        """,
        *params,
    )
    data = [_cr_dict(r, ops_delta(await _ops(db, str(r["id"])))) for r in rows]
    return {"data": data}


@router.post("/doc-crs", status_code=201)
async def create_doc_cr(
    body: DocCRCreate,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    _validate_cr_enums(body.change_type, body.priority, body.stage)
    doc = await _get_doc_or_404(db, body.target_doc_id)
    if doc["status"] == "archived":
        raise HTTPException(409, "Tài liệu đã lưu trữ (archived) — không nhận Change Request mới")

    sections = await _sections(db, body.target_doc_id)
    ops = _prepare_ops(body.ops, body.content_md, sections)
    errors = validate_ops(ops, sections)
    if errors:
        raise HTTPException(422, "Thay đổi mục không hợp lệ: " + "; ".join(errors))

    code = await _next_pcr_code(db)
    pcr_id = str(uuid4())

    async with db.transaction():
        row = await db.fetchrow(
            """
            INSERT INTO project_change_requests
                (id, request_code, project_id, title, description, change_type, priority,
                 status, impact_scope, requested_by, reviewer, notes,
                 target_doc_id, merge_state, acceptance, dependencies)
            VALUES ($1::uuid,$2,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::uuid,'pending',$14::jsonb,$15)
            RETURNING *
            """,
            pcr_id, code, str(doc["project_id"]), body.title, body.description,
            body.change_type, body.priority, body.stage, body.impact_scope,
            body.requested_by, body.reviewer, body.notes or "",
            body.target_doc_id, json.dumps(body.acceptance, ensure_ascii=False),
            body.dependencies,
        )
        await _insert_ops(db, pcr_id, ops)
        await _log_request_history(
            db, pcr_id, "created", body.requested_by, to_status=body.stage,
            comment=f"Tạo CR tài liệu cho {doc['doc_code']}",
        )

    await log_audit(
        db=db, entity_type="project_change_requests", entity_id=pcr_id, action="CREATE",
        changed_by=user.sub,
        new_values={"request_code": code, "target_doc": doc["doc_code"],
                    "title": body.title, "ops": len(ops)},
    )
    return {"data": _cr_dict(row, ops_delta(ops))}


@router.get("/doc-crs/{pcr_id}")
async def get_doc_cr(
    pcr_id: str,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    cr = await _get_cr_or_404(db, pcr_id)
    ops = await _ops(db, pcr_id)
    doc_id = str(cr["target_doc_id"])

    before = await _sections(db, doc_id)
    if cr["merge_state"] == "merged":
        # đã merge: diff giữa bản trước và bản do CR này sinh ra
        ver = await db.fetchrow(
            "SELECT seq, sections FROM ba_doc_versions WHERE source_cr_id = $1::uuid", pcr_id
        )
        if ver:
            prev = await db.fetchrow(
                "SELECT sections FROM ba_doc_versions WHERE doc_id = $1::uuid AND seq = $2",
                doc_id, ver["seq"] - 1,
            )
            before = _jsonb(prev["sections"]) if prev else []
            after = _jsonb(ver["sections"]) or []
        else:
            after = apply_ops(before, ops)
    else:
        after = apply_ops(before, ops)

    version_count = await db.fetchval(
        "SELECT count(*) FROM ba_doc_versions WHERE doc_id = $1::uuid", doc_id
    )
    data = _cr_dict(cr, ops_delta(ops))
    data["ops"] = ops
    data["before_sections"] = before
    data["after_sections"] = after
    # bản Markdown đầy đủ: form sửa CR mở đúng file BA sẽ chỉnh, không phải ghép tay
    data["before_content_md"] = join_markdown(before)
    data["after_content_md"] = join_markdown(after)
    data["next_version_label"] = next_version_label(version_count + 1)
    data["can_merge"] = cr["merge_state"] == "pending"
    # ops còn áp được lên bản hiện hành không (CR cũ + tài liệu đã đổi = cần rebase)
    data["drift"] = (validate_ops(ops, await _sections(db, doc_id))
                     if cr["merge_state"] == "pending" else [])
    return {"data": data}


@router.put("/doc-crs/{pcr_id}")
async def update_doc_cr(
    pcr_id: str,
    body: DocCRUpdate,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    cr = await _get_cr_or_404(db, pcr_id)
    if cr["merge_state"] != "pending":
        raise HTTPException(
            409,
            f"{cr['request_code']} đã {('merge' if cr['merge_state'] == 'merged' else 'bị từ chối')} — "
            "không sửa được nữa. Tạo CR mới nếu cần thay đổi tiếp.",
        )
    _validate_cr_enums(body.change_type, body.priority, None)

    payload = body.model_dump(exclude_none=True)
    ops_in = payload.pop("ops", None)
    content_md = payload.pop("content_md", None)
    if not payload and ops_in is None and content_md is None:
        raise HTTPException(400, "Không có trường nào để cập nhật")

    ops: Optional[list[dict]] = None
    if ops_in is not None or content_md is not None:
        sections = await _sections(db, str(cr["target_doc_id"]))
        ops = _prepare_ops(
            [OpIn(**o) for o in (ops_in or [])], content_md, sections,
        )
        errors = validate_ops(ops, sections)
        if errors:
            raise HTTPException(422, "Thay đổi mục không hợp lệ: " + "; ".join(errors))

    async with db.transaction():
        if payload:
            values: list = []
            sets: list[str] = []
            i = 2
            for key, val in payload.items():
                if key == "acceptance":
                    sets.append(f"acceptance = ${i}::jsonb")
                    values.append(json.dumps(val, ensure_ascii=False))
                else:
                    sets.append(f"{key} = ${i}")
                    values.append(val)
                i += 1
            await db.execute(
                f"UPDATE project_change_requests SET {', '.join(sets)}, updated_at = NOW() "
                f"WHERE id = $1::uuid",
                pcr_id, *values,
            )
        if ops is not None:
            await db.execute("DELETE FROM ba_doc_cr_ops WHERE pcr_id = $1::uuid", pcr_id)
            await _insert_ops(db, pcr_id, ops)
        await _log_request_history(
            db, pcr_id, "updated", user.sub,
            comment="Cập nhật nội dung CR" + (f" ({len(ops)} thay đổi mục)" if ops else ""),
        )

    await log_audit(
        db=db, entity_type="project_change_requests", entity_id=pcr_id, action="UPDATE",
        changed_by=user.sub, new_values={**payload, "ops": len(ops) if ops else None},
    )
    row = await _get_cr_or_404(db, pcr_id)
    return {"data": _cr_dict(row, ops_delta(await _ops(db, pcr_id)))}


@router.delete("/doc-crs/{pcr_id}", status_code=204, response_class=Response)
async def delete_doc_cr(
    pcr_id: str,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> Response:
    cr = await _get_cr_or_404(db, pcr_id)
    if cr["merge_state"] != "pending":
        raise HTTPException(
            409,
            f"{cr['request_code']} đã được xử lý (merge_state={cr['merge_state']}) — "
            "phải giữ lại để truy vết, không xoá.",
        )
    async with db.transaction():
        await db.execute("DELETE FROM request_history WHERE ref_type='pcr' AND ref_id = $1::uuid", pcr_id)
        await db.execute("DELETE FROM project_change_requests WHERE id = $1::uuid", pcr_id)
    await log_audit(
        db=db, entity_type="project_change_requests", entity_id=pcr_id, action="DELETE",
        changed_by=user.sub, old_values={"request_code": cr["request_code"], "title": cr["title"]},
    )
    return Response(status_code=204)


@router.post("/doc-crs/{pcr_id}/stage")
async def change_cr_stage(
    pcr_id: str,
    body: StageChange,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """Chuyển bước phê duyệt: submitted ⇄ reviewing ⇄ approved (không skip bước)."""
    cr = await _get_cr_or_404(db, pcr_id)
    if cr["merge_state"] != "pending":
        raise HTTPException(409, f"{cr['request_code']} đã xử lý xong, không đổi bước được")
    if body.stage not in OPEN_STAGES:
        raise HTTPException(400, f"stage không hợp lệ: {body.stage} (chỉ {sorted(OPEN_STAGES)})")

    current = cr["status"]
    if body.stage == current:
        raise HTTPException(400, f"CR đang ở bước '{current}'")
    if body.stage not in STAGE_FLOW.get(current, set()):
        raise HTTPException(
            409,
            f"Không chuyển trực tiếp từ '{current}' sang '{body.stage}'. "
            f"Bước hợp lệ: {sorted(STAGE_FLOW.get(current, set()))}",
        )

    async with db.transaction():
        extra = ""
        params: list = [body.stage, pcr_id]
        if body.stage == "approved":
            extra = ", approved_by = $3, approved_at = NOW()"
            params.append(cr["reviewer"] or user.sub)
        await db.execute(
            f"UPDATE project_change_requests SET status = $1, updated_at = NOW(){extra} "
            f"WHERE id = $2::uuid",
            *params,
        )
        await _log_request_history(
            db, pcr_id, "status_changed", user.sub,
            from_status=current, to_status=body.stage, comment=body.comment,
        )
    await log_audit(
        db=db, entity_type="project_change_requests", entity_id=pcr_id, action="STATUS_CHANGE",
        changed_by=user.sub, old_values={"stage": current}, new_values={"stage": body.stage},
        notes=body.comment,
    )
    return {"data": {"request_code": cr["request_code"], "stage": body.stage}}


@router.post("/doc-crs/{pcr_id}/merge")
async def merge_doc_cr(
    pcr_id: str,
    body: MergeRequest,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    """
    Áp section ops vào tài liệu → phát hành phiên bản mới (snapshot bất biến).
    Yêu cầu CR đang pending và đã ở bước 'approved' (hoặc force_approve=true để
    phê duyệt + merge trong một hành động, vẫn ghi đủ 2 bước vào nhật ký).
    """
    cr = await _get_cr_or_404(db, pcr_id)
    if cr["merge_state"] != "pending":
        raise HTTPException(
            409,
            f"{cr['request_code']} đã {'merge vào ' + (cr['merged_version'] or '') if cr['merge_state'] == 'merged' else 'bị từ chối'} — "
            "không merge lại được.",
        )

    stage = cr["status"]
    if stage != "approved":
        if not body.force_approve:
            raise HTTPException(
                409,
                f"CR đang ở bước '{stage}' — cần phê duyệt (approved) trước khi merge. "
                "Gửi force_approve=true để phê duyệt và merge cùng lúc.",
            )

    doc_id = str(cr["target_doc_id"])
    ops = await _ops(db, pcr_id)
    if not ops:
        raise HTTPException(422, "CR không có thay đổi mục nào để merge")

    before = await _sections(db, doc_id)
    errors = validate_ops(ops, before)
    if errors:
        raise HTTPException(
            409,
            "Không merge được vì tài liệu đã đổi so với lúc tạo CR: " + "; ".join(errors)
            + ". Hãy cập nhật lại các thay đổi mục của CR.",
        )
    after = apply_ops(before, ops)

    max_seq = await db.fetchval(
        "SELECT COALESCE(max(seq), 0) FROM ba_doc_versions WHERE doc_id = $1::uuid", doc_id
    )
    new_seq = int(max_seq) + 1
    new_label = next_version_label(new_seq)
    today = date.today()
    actor = cr["reviewer"] or user.sub

    async with db.transaction():
        if stage != "approved":
            await db.execute(
                "UPDATE project_change_requests SET status = 'approved', approved_by = $1, "
                "approved_at = NOW() WHERE id = $2::uuid",
                actor, pcr_id,
            )
            await _log_request_history(
                db, pcr_id, "status_changed", user.sub, from_status=stage, to_status="approved",
                comment="Phê duyệt trước khi merge",
            )

        await _replace_sections(db, doc_id, after)
        await db.execute(
            """
            INSERT INTO ba_doc_versions
                (id, doc_id, version_label, seq, kind, source_cr_id, note,
                 released_on, released_by, sections)
            VALUES ($1::uuid,$2::uuid,$3,$4,'merge',$5::uuid,$6,$7,$8,$9::jsonb)
            """,
            str(uuid4()), doc_id, new_label, new_seq, pcr_id, cr["title"],
            today, actor, _snapshot_json(after),
        )
        await db.execute(
            "UPDATE ba_master_docs SET current_version = $1, updated_at = NOW(), updated_by = $2 "
            "WHERE id = $3::uuid",
            new_label, user.sub, doc_id,
        )
        default_note = f"Đã merge vào master ngày {today.strftime('%d/%m/%Y')}."
        await db.execute(
            """
            UPDATE project_change_requests
               SET merge_state = 'merged', status = 'implemented',
                   merged_version = $1, merged_at = NOW(), reviewed_at = NOW(),
                   approved_by = COALESCE(approved_by, $2), approved_at = COALESCE(approved_at, NOW()),
                   notes = CASE WHEN COALESCE(notes,'') = '' THEN $3 ELSE notes END,
                   updated_at = NOW()
             WHERE id = $4::uuid
            """,
            new_label, actor, default_note, pcr_id,
        )
        await _log_request_history(
            db, pcr_id, "status_changed", user.sub, from_status="approved", to_status="implemented",
            comment=body.comment or f"Đã merge vào {new_label}",
        )

    await log_audit(
        db=db, entity_type="ba_master_docs", entity_id=doc_id, action="STATUS_CHANGE",
        changed_by=user.sub,
        old_values={"current_version": cr["doc_current_version"]},
        new_values={"current_version": new_label, "merged_cr": cr["request_code"]},
        notes=body.comment,
    )
    return {
        "data": {
            "doc_id": doc_id,
            "request_code": cr["request_code"],
            "version_label": new_label,
            "section_count": len(after),
            "delta": ops_delta(ops),
        }
    }


@router.post("/doc-crs/{pcr_id}/reject")
async def reject_doc_cr(
    pcr_id: str,
    body: RejectRequest,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    cr = await _get_cr_or_404(db, pcr_id)
    if cr["merge_state"] != "pending":
        raise HTTPException(409, f"{cr['request_code']} đã được xử lý trước đó")

    async with db.transaction():
        await db.execute(
            """
            UPDATE project_change_requests
               SET merge_state = 'rejected', status = 'rejected', reviewed_at = NOW(),
                   notes = $1, updated_at = NOW()
             WHERE id = $2::uuid
            """,
            f"Từ chối: {body.reason}", pcr_id,
        )
        await _log_request_history(
            db, pcr_id, "status_changed", user.sub,
            from_status=cr["status"], to_status="rejected", comment=body.reason,
        )
    await log_audit(
        db=db, entity_type="project_change_requests", entity_id=pcr_id, action="STATUS_CHANGE",
        changed_by=user.sub, old_values={"merge_state": "pending"},
        new_values={"merge_state": "rejected"}, notes=body.reason,
    )
    return {"data": {"request_code": cr["request_code"], "merge_state": "rejected"}}


@router.get("/doc-crs/{pcr_id}/history")
async def get_doc_cr_history(
    pcr_id: str,
    user: CurrentUser,
    db: asyncpg.Connection = Depends(get_db),
) -> dict:
    await _get_cr_or_404(db, pcr_id)
    rows = await db.fetch(
        """
        SELECT id, action, actor, from_status, to_status, comment, created_at
          FROM request_history WHERE ref_type = 'pcr' AND ref_id = $1::uuid
         ORDER BY created_at
        """,
        pcr_id,
    )
    return {"data": [dict(r) for r in rows]}
