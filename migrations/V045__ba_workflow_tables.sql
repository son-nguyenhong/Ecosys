-- ============================================================
-- V045 — BA Workflow core tables (MISSING from original migrations)
-- Tạo các bảng module BA Workflow mà code (ba_documents_v2.py, ba_tasks.py)
-- tham chiếu nhưng chưa từng có migration:
--   ba_documents, ba_document_object_links, ba_document_files,
--   ba_document_history, ba_tasks
-- Cột khớp chính xác theo code backend. Additive, idempotent.
-- ============================================================

-- ── 1. ba_documents ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ba_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    doc_type      VARCHAR(20) NOT NULL
                  CHECK (doc_type IN ('BRD','BRS','FSD','API_SPEC','ERD','DATA_DICT','WIREFRAME','PROCESS_FLOW')),
    title         VARCHAR(500) NOT NULL,
    content       TEXT,
    version       VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    status        VARCHAR(20) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','in_review','approved','archived')),
    milestone_id  UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
    metadata      JSONB NOT NULL DEFAULT '{}',
    pushed_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(100),
    updated_by    VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_ba_documents_project   ON ba_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_ba_documents_status    ON ba_documents(status);
CREATE INDEX IF NOT EXISTS idx_ba_documents_milestone ON ba_documents(milestone_id);

-- ── 2. ba_document_object_links ──────────────────────────────
CREATE TABLE IF NOT EXISTS ba_document_object_links (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID NOT NULL REFERENCES ba_documents(id) ON DELETE CASCADE,
    object_id    UUID NOT NULL,   -- liên kết tới object; không ép FK vì ppg_project_objects thuộc nhóm migration đời đầu không có trong repo
    linked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by    VARCHAR(100),
    UNIQUE (document_id, object_id)
);
CREATE INDEX IF NOT EXISTS idx_ba_doc_obj_links_doc ON ba_document_object_links(document_id);
CREATE INDEX IF NOT EXISTS idx_ba_doc_obj_links_obj ON ba_document_object_links(object_id);

-- ── 3. ba_document_files ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ba_document_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES ba_documents(id) ON DELETE CASCADE,
    file_name       VARCHAR(500) NOT NULL,
    file_path       TEXT NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    checksum_sha256 VARCHAR(64) NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    is_current      BOOLEAN NOT NULL DEFAULT TRUE,
    source          VARCHAR(20) NOT NULL DEFAULT 'upload'
                    CHECK (source IN ('upload','copy_from_url')),
    source_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ba_doc_files_doc ON ba_document_files(document_id);

-- ── 4. ba_document_history ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ba_document_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id       UUID NOT NULL REFERENCES ba_documents(id) ON DELETE CASCADE,
    version      VARCHAR(20) NOT NULL,
    changed_by   VARCHAR(100),
    change_note  TEXT,
    snapshot     JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ba_doc_history_doc ON ba_document_history(doc_id);

-- ── 5. ba_tasks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ba_tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id  UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
    task_type     VARCHAR(50) NOT NULL DEFAULT 'requirements',
    title         VARCHAR(500) NOT NULL,
    description   TEXT,
    preconditions JSONB NOT NULL DEFAULT '[]',
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_progress','done','blocked','cancelled')),
    assigned_to   VARCHAR(100),
    due_date      DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ba_tasks_project   ON ba_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_ba_tasks_milestone ON ba_tasks(milestone_id);