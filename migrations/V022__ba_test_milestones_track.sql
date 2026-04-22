-- V022 — BA Track / Test Track milestones + Project Folder metadata
-- Features:
--   1. track column on project_milestones (project | ba | test)
--   2. project_folders — virtual folder tree per project (for document management)
-- Date: 2026-04-10 | Author: Dev Agent

-- ============================================================
-- 1. Add TRACK column to project_milestones
-- ============================================================
ALTER TABLE project_milestones
    ADD COLUMN IF NOT EXISTS track VARCHAR(20) NOT NULL DEFAULT 'project'
        CHECK (track IN ('project', 'ba', 'test'));

CREATE INDEX IF NOT EXISTS idx_milestones_track
    ON project_milestones(project_id, track);

-- ============================================================
-- 2. PROJECT FOLDERS — tài liệu dự án
-- ============================================================
CREATE TABLE IF NOT EXISTS project_folders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id   UUID REFERENCES project_folders(id) ON DELETE CASCADE,
    folder_name VARCHAR(255) NOT NULL,
    folder_path TEXT NOT NULL,         -- relative path, e.g. "ba/ba_brd"
    track       VARCHAR(20) NOT NULL DEFAULT 'project'
                CHECK (track IN ('project','ba','test','management')),
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_folders_project ON project_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_folders_parent  ON project_folders(parent_id);
