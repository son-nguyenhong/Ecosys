-- V041 — Test Documents (FR-030 – FR-032)
-- Stores Test Plan, Bug Report, and UAT Sign-off documents per project.
-- Date: 2026-04-20 | Author: Dev Agent

CREATE TABLE IF NOT EXISTS test_documents (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    doc_type     VARCHAR(20) NOT NULL CHECK (doc_type IN ('TEST_PLAN', 'BUG_REPORT', 'UAT_SIGNOFF')),
    title        VARCHAR(255) NOT NULL,
    content      TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'draft',
    object_id    UUID,
    milestone_id UUID         REFERENCES project_milestones(id) ON DELETE SET NULL,
    metadata     JSONB,
    created_by   VARCHAR(255),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_documents_project  ON test_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_test_documents_object   ON test_documents(object_id)   WHERE object_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_test_documents_status   ON test_documents(status);
CREATE INDEX IF NOT EXISTS idx_test_documents_doc_type ON test_documents(doc_type);
