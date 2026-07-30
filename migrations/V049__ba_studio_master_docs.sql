-- ============================================================
-- V049 — BA Studio: Master Doc + version chain + document-level Change Request
--
-- Mô hình lõi:
--   ba_master_docs      : header tài liệu (BRS/FSD), thuộc 1 project
--   ba_doc_sections     : các mục nội dung của BẢN HIỆN HÀNH (working copy)
--   ba_doc_versions     : bản đã phát hành — snapshot BẤT BIẾN (JSONB)
--   ba_doc_cr_ops       : section ops (add/modify/remove) của một CR tài liệu
--   project_change_requests + 7 cột : tái dùng làm SỔ CR duy nhất
--
-- Ánh xạ với thiết kế BA Studio:
--   design.status (pending|merged|rejected) → project_change_requests.merge_state
--   design.stage  (submitted|reviewing|approved|implemented|rejected)
--                                          → project_change_requests.status (enum sẵn có)
--   merge_state IS NULL  → CR cấp dự án thường, hành vi module Requests không đổi
--
-- Vì sao lưu snapshot thay vì replay (khác prototype §8.2):
--   ops của CR có thể bị sửa/xoá sau khi merge → replay sẽ âm thầm viết lại lịch sử
--   đã phát hành. compliance: banking_grade yêu cầu bản đã phát hành là bất biến.
--
-- Additive + idempotent. Không DROP/TRUNCATE dữ liệu.
-- ============================================================

-- ── 1. ba_master_docs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ba_master_docs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_code        VARCHAR(100) NOT NULL UNIQUE,        -- 'doc-ems2-brs' — hiển thị "Mã tài liệu"
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    doc_type        VARCHAR(20) NOT NULL DEFAULT 'BRS'
                    CHECK (doc_type IN ('BRS','FSD','BRD','FRS','SRS')),
    title           VARCHAR(500) NOT NULL,
    abbr            VARCHAR(200),                        -- 'Business Requirements Specification'
    owner           VARCHAR(200),                        -- full_name, theo pattern UserSelect/catalog_users
    base_version    VARCHAR(20)  NOT NULL DEFAULT 'v1.0',
    base_date       DATE,
    base_note       TEXT,
    current_version VARCHAR(20)  NOT NULL DEFAULT 'v1.0',
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','archived')),
    -- link tuỳ chọn sang BA Doc Hub cũ (file đính kèm, object link đã có ở đó)
    ba_document_id  UUID REFERENCES ba_documents(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_ba_master_docs_project ON ba_master_docs(project_id);
CREATE INDEX IF NOT EXISTS idx_ba_master_docs_type    ON ba_master_docs(doc_type);
CREATE INDEX IF NOT EXISTS idx_ba_master_docs_status  ON ba_master_docs(status);

-- ── 2. ba_doc_sections (working copy = bản hiện hành) ────────
CREATE TABLE IF NOT EXISTS ba_doc_sections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id      UUID NOT NULL REFERENCES ba_master_docs(id) ON DELETE CASCADE,
    section_key VARCHAR(50) NOT NULL,                    -- 's1','s2'… duy nhất trong 1 tài liệu
    heading     VARCHAR(500) NOT NULL,
    body        TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (doc_id, section_key)
);
CREATE INDEX IF NOT EXISTS idx_ba_doc_sections_doc ON ba_doc_sections(doc_id, sort_order);

-- ── 3. ba_doc_versions (snapshot bất biến) ───────────────────
CREATE TABLE IF NOT EXISTS ba_doc_versions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id        UUID NOT NULL REFERENCES ba_master_docs(id) ON DELETE CASCADE,
    version_label VARCHAR(20) NOT NULL,                  -- 'v1.0','v2.0'
    seq           INTEGER NOT NULL,                      -- 1,2,3… thứ tự phát hành
    kind          VARCHAR(10) NOT NULL DEFAULT 'merge'
                  CHECK (kind IN ('base','merge')),
    source_cr_id  UUID,                                  -- FK thêm ở bước 5 (sau khi PCR có cột mới)
    note          TEXT,
    released_on   DATE,
    released_by   VARCHAR(200),
    sections      JSONB NOT NULL DEFAULT '[]',           -- [{section_key,heading,body}] — snapshot
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (doc_id, version_label),
    UNIQUE (doc_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_ba_doc_versions_doc ON ba_doc_versions(doc_id, seq);

-- ── 4. project_change_requests — 7 cột cho CR tài liệu ───────
ALTER TABLE project_change_requests
    ADD COLUMN IF NOT EXISTS target_doc_id  UUID REFERENCES ba_master_docs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS merge_state    VARCHAR(20),
    ADD COLUMN IF NOT EXISTS merged_version VARCHAR(20),
    ADD COLUMN IF NOT EXISTS merged_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reviewer       VARCHAR(200),
    -- ngày người review xử lý CR (merge HOẶC từ chối) — approved_at chỉ đúng cho nhánh approve
    ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acceptance     JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS dependencies   TEXT[] NOT NULL DEFAULT '{}';

-- merge_state: NULL = CR dự án thường (module Requests), khác NULL = CR tài liệu (BA Studio)
ALTER TABLE project_change_requests DROP CONSTRAINT IF EXISTS pcr_merge_state_check;
ALTER TABLE project_change_requests
    ADD CONSTRAINT pcr_merge_state_check
    CHECK (merge_state IS NULL OR merge_state IN ('pending','merged','rejected'));

-- CR tài liệu bắt buộc có tài liệu đích và ngược lại
ALTER TABLE project_change_requests DROP CONSTRAINT IF EXISTS pcr_doc_cr_pair_check;
ALTER TABLE project_change_requests
    ADD CONSTRAINT pcr_doc_cr_pair_check
    CHECK ((target_doc_id IS NULL AND merge_state IS NULL)
        OR (target_doc_id IS NOT NULL AND merge_state IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_pcr_target_doc ON project_change_requests(target_doc_id)
    WHERE target_doc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pcr_merge_state ON project_change_requests(merge_state)
    WHERE merge_state IS NOT NULL;

-- ── 5. FK ba_doc_versions.source_cr_id → PCR ─────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ba_doc_versions_source_cr_fkey'
    ) THEN
        ALTER TABLE ba_doc_versions
            ADD CONSTRAINT ba_doc_versions_source_cr_fkey
            FOREIGN KEY (source_cr_id) REFERENCES project_change_requests(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ── 6. ba_doc_cr_ops (section ops của CR) ────────────────────
CREATE TABLE IF NOT EXISTS ba_doc_cr_ops (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pcr_id            UUID NOT NULL REFERENCES project_change_requests(id) ON DELETE CASCADE,
    op                VARCHAR(10) NOT NULL CHECK (op IN ('add','modify','remove')),
    section_key       VARCHAR(50) NOT NULL,
    after_section_key VARCHAR(50),                       -- chỉ dùng với op = 'add'
    heading           VARCHAR(500),
    body              TEXT,
    sort_order        INTEGER NOT NULL DEFAULT 0,        -- thứ tự áp op (quan trọng)
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ba_doc_cr_ops_pcr ON ba_doc_cr_ops(pcr_id, sort_order);
