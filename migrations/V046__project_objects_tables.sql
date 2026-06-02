-- ============================================================
-- V046 — Project Objects registry (MISSING from original migrations)
-- Tạo nhóm bảng object đời đầu mà code tham chiếu nhưng repo không có:
--   ppg_project_objects, ppg_object_connections
-- Sau đó bật lại FK ba_document_object_links.object_id → ppg_project_objects
-- để tính năng "gắn tài liệu BA với object dự án" hoạt động đầy đủ.
-- Cột khớp chính xác theo code (project_objects.py). Additive, idempotent.
-- Yêu cầu: chạy SAU V045 (ba_document_object_links đã tồn tại).
-- ============================================================

-- ── 1. ppg_project_objects ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_project_objects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    object_type   VARCHAR(20) NOT NULL
                  CHECK (object_type IN ('web_app','mobile_app','api','elt')),
    name          VARCHAR(300) NOT NULL,
    code          VARCHAR(100) NOT NULL,
    description   TEXT,
    owner         VARCHAR(100),
    status        VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive','decommissioned')),
    standard_info JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by    VARCHAR(100),
    updated_by    VARCHAR(100),
    UNIQUE (project_id, code)          -- code duy nhất trong phạm vi dự án (409 nếu trùng)
);
CREATE INDEX IF NOT EXISTS idx_ppg_objects_project ON ppg_project_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_ppg_objects_type    ON ppg_project_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_ppg_objects_status  ON ppg_project_objects(status);

-- ── 2. ppg_object_connections ────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_object_connections (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_object_id  UUID NOT NULL REFERENCES ppg_project_objects(id) ON DELETE CASCADE,
    target_object_id  UUID NOT NULL REFERENCES ppg_project_objects(id) ON DELETE CASCADE,
    connection_type   VARCHAR(20) NOT NULL
                      CHECK (connection_type IN ('api_call','data_feed','event','file_transfer','db_sync','other')),
    protocol          VARCHAR(50),
    frequency         VARCHAR(50),
    description       TEXT,
    status            VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','removed')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(100),
    updated_by        VARCHAR(100),
    CHECK (source_object_id <> target_object_id)   -- chặn self-loop (409 trong code)
);
CREATE INDEX IF NOT EXISTS idx_obj_conn_source ON ppg_object_connections(source_object_id);
CREATE INDEX IF NOT EXISTS idx_obj_conn_target ON ppg_object_connections(target_object_id);

-- ── 3. Bật lại FK cho ba_document_object_links.object_id ─────
-- (V045 cố tình bỏ FK này vì bảng object chưa tồn tại; giờ thêm lại)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ba_doc_obj_links_object_fk'
          AND table_name = 'ba_document_object_links'
    ) THEN
        ALTER TABLE ba_document_object_links
            ADD CONSTRAINT ba_doc_obj_links_object_fk
            FOREIGN KEY (object_id) REFERENCES ppg_project_objects(id) ON DELETE CASCADE;
    END IF;
END $$;