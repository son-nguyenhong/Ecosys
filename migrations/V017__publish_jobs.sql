-- ============================================================
-- V017: Publish Jobs — track MkDocs site builds per project
-- ============================================================

CREATE TABLE IF NOT EXISTS publish_jobs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
    status       VARCHAR(50)  DEFAULT 'pending',   -- pending | building | success | failed
    site_url     TEXT,
    doc_count    INT          DEFAULT 0,
    error_msg    TEXT,
    triggered_by VARCHAR(255),
    triggered_at TIMESTAMPTZ  DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_publish_jobs_project
    ON publish_jobs(project_id, triggered_at DESC);
