-- V043 — Project To-do List (All Phases: FR-T01 – FR-T10)
-- Date: 2026-04-20 | Author: Dev Agent

-- ── Main todos table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_todos (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID         REFERENCES projects(id) ON DELETE CASCADE,
    title        VARCHAR(500) NOT NULL,
    description  TEXT,
    task_type    VARCHAR(30)  NOT NULL DEFAULT 'other'
                 CHECK (task_type IN ('feature','bug','review','meeting','documentation','deployment','other')),
    status       VARCHAR(20)  NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo','in_progress','blocked','done','cancelled')),
    priority     VARCHAR(10)  NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('critical','high','medium','low')),
    assignee_id  VARCHAR(255),
    created_by   VARCHAR(255),
    due_date     DATE,
    milestone_id UUID         REFERENCES project_milestones(id) ON DELETE SET NULL,
    parent_id    UUID         REFERENCES project_todos(id) ON DELETE CASCADE,
    -- Context link (PCR / BUG_REPORT / TEST_PLAN / OBJECT …)
    ref_type     VARCHAR(30),
    ref_id       UUID,
    tags         TEXT[]       DEFAULT '{}',
    sort_order   INT          NOT NULL DEFAULT 0,
    -- Recurrence: {pattern:'weekly', interval:1, day_of_week:1, end_date:'2026-12-31'}
    recurrence   JSONB,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_project    ON project_todos(project_id);
CREATE INDEX IF NOT EXISTS idx_todos_assignee   ON project_todos(assignee_id);
CREATE INDEX IF NOT EXISTS idx_todos_status     ON project_todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_due_date   ON project_todos(due_date)   WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_parent     ON project_todos(parent_id)  WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_todos_milestone  ON project_todos(milestone_id) WHERE milestone_id IS NOT NULL;

-- ── Watchers ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_todo_watchers (
    todo_id  UUID         NOT NULL REFERENCES project_todos(id) ON DELETE CASCADE,
    user_id  VARCHAR(255) NOT NULL,
    added_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (todo_id, user_id)
);

-- ── Comments ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_todo_comments (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id    UUID         NOT NULL REFERENCES project_todos(id) ON DELETE CASCADE,
    author     VARCHAR(255) NOT NULL,
    content    TEXT         NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todo_comments_todo ON project_todo_comments(todo_id);

-- ── Activity log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_todo_activity (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    todo_id     UUID         NOT NULL REFERENCES project_todos(id) ON DELETE CASCADE,
    actor       VARCHAR(255) NOT NULL,
    action      VARCHAR(50)  NOT NULL,  -- created|status_changed|assigned|commented|updated
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todo_activity_todo ON project_todo_activity(todo_id);
