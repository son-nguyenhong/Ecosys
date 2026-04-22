-- DevOps Ecosystem Platform — Database Init Script
-- Schema aligns with devops-ecosystem reference project
-- PPG-specific additions: ppg_users (auth) + ppg_app_registry (ADR-002)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PPG AUTH TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ppg_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50) UNIQUE NOT NULL,
    full_name     VARCHAR(200) NOT NULL,
    email         VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANNUAL PLANS (must come before projects for FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS annual_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year        INT NOT NULL,
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(50) DEFAULT 'active',
    created_by  VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id       UUID REFERENCES annual_plans(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    priority      INT DEFAULT 0,
    target_q      VARCHAR(10),
    done_criteria TEXT,
    status        VARCHAR(50) DEFAULT 'planned',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(50) DEFAULT 'active',
    owner       VARCHAR(255),
    start_date  DATE,
    end_date    DATE,
    plan_id     UUID REFERENCES annual_plans(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID REFERENCES projects(id),
    doc_ref_id  VARCHAR(100) UNIQUE,
    doc_type    VARCHAR(50),
    version     VARCHAR(20),
    title       VARCHAR(255),
    status      VARCHAR(50),
    synced_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID REFERENCES projects(id),
    report_ref  VARCHAR(100),
    total_cases INT DEFAULT 0,
    passed      INT DEFAULT 0,
    failed      INT DEFAULT 0,
    coverage    NUMERIC(5,2),
    executed_at TIMESTAMPTZ,
    synced_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECT MILESTONES
-- ============================================================
CREATE TABLE IF NOT EXISTS project_milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    milestone_type  VARCHAR(100),
    description     TEXT,
    start_date      DATE,
    end_date        DATE,
    status          VARCHAR(50) DEFAULT 'planned',
    sort_order      INT DEFAULT 0,
    preconditions   JSONB DEFAULT '[]',
    done_criteria   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS project_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
    full_name   VARCHAR(255) NOT NULL,
    alias       VARCHAR(100),
    email       VARCHAR(255),
    role        VARCHAR(100),
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROJECT FILES
-- ============================================================
CREATE TABLE IF NOT EXISTS project_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id    UUID REFERENCES project_milestones(id),
    name            VARCHAR(255) NOT NULL,
    file_type       VARCHAR(100) DEFAULT 'template',
    doc_category    VARCHAR(100),
    current_version VARCHAR(20) DEFAULT 'v0.1',
    storage_path    TEXT,
    external_url    TEXT,
    status          VARCHAR(50) DEFAULT 'draft',
    created_by      VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_versions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id      UUID REFERENCES project_files(id) ON DELETE CASCADE,
    version      VARCHAR(20) NOT NULL,
    storage_path TEXT,
    external_url TEXT,
    change_note  TEXT,
    uploaded_by  VARCHAR(255),
    file_size    BIGINT,
    uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEETING MINUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS meeting_minutes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID REFERENCES projects(id),
    milestone_id      UUID REFERENCES project_milestones(id),
    title             VARCHAR(255) NOT NULL,
    meeting_date      DATE,
    location          VARCHAR(255),
    raw_notes         TEXT,
    generated_content JSONB,
    status            VARCHAR(50) DEFAULT 'draft',
    created_by        VARCHAR(255),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BA WORKFLOW TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS requirements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID,
    title       VARCHAR(255) NOT NULL,
    raw_text    TEXT,
    status      VARCHAR(50) DEFAULT 'draft',
    created_by  VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    req_id      UUID REFERENCES requirements(id),
    project_id  UUID,
    doc_type    VARCHAR(50) NOT NULL,
    version     VARCHAR(20) DEFAULT 'v1.0',
    title       VARCHAR(255) NOT NULL,
    content     JSONB,
    status      VARCHAR(50) DEFAULT 'draft',
    reviewed_by VARCHAR(255),
    approved_by VARCHAR(255),
    pushed_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id      UUID REFERENCES documents(id),
    version     VARCHAR(20),
    changed_by  VARCHAR(255),
    change_note TEXT,
    snapshot    JSONB,
    changed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stakeholder_discussions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID,
    doc_id        VARCHAR(100),
    workflow_type VARCHAR(50),
    title         VARCHAR(255),
    content       TEXT,
    raised_by     VARCHAR(255),
    status        VARCHAR(50) DEFAULT 'open',
    resolution    TEXT,
    resolved_by   VARCHAR(255),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ba_tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID,
    milestone_id  UUID REFERENCES project_milestones(id),
    task_type     VARCHAR(100),
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    preconditions JSONB DEFAULT '[]',
    status        VARCHAR(50) DEFAULT 'pending',
    assigned_to   VARCHAR(255),
    due_date      DATE,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEST PLATFORM TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS brs_sync (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brs_id      VARCHAR(100) NOT NULL,
    version     VARCHAR(20),
    project_id  UUID,
    payload     JSONB,
    synced_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (brs_id, version)
);

CREATE TABLE IF NOT EXISTS test_cases (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brs_id            VARCHAR(100),
    brs_sync_id       UUID REFERENCES brs_sync(id),
    title             VARCHAR(255) NOT NULL,
    module            VARCHAR(255),
    steps             JSONB,
    expected_result   TEXT,
    playwright_script TEXT,
    status            VARCHAR(50) DEFAULT 'generated',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID,
    total       INT DEFAULT 0,
    passed      INT DEFAULT 0,
    failed      INT DEFAULT 0,
    coverage    NUMERIC(5,2),
    logs        TEXT,
    status      VARCHAR(50) DEFAULT 'generated',
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    pushed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS test_tasks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID,
    milestone_id  UUID REFERENCES project_milestones(id),
    task_type     VARCHAR(100),
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    preconditions JSONB DEFAULT '[]',
    status        VARCHAR(50) DEFAULT 'pending',
    assigned_to   VARCHAR(255),
    due_date      DATE,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PPG APP REGISTRY (ADR-002)
-- ============================================================
CREATE TABLE IF NOT EXISTS ppg_app_registry (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    object_type VARCHAR(20) NOT NULL
                CHECK (object_type IN ('application','system','job','connection')),
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(50) NOT NULL,
    description TEXT,
    owner_team  VARCHAR(100),
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','inactive','deprecated')),
    environment JSONB NOT NULL DEFAULT '[]',
    extra       JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(100) NOT NULL DEFAULT 'system',
    UNIQUE (project_id, code)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_annual_plans_year       ON annual_plans(year);
CREATE INDEX IF NOT EXISTS idx_projects_status         ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_plan           ON projects(plan_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project      ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_members_project         ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_files_project           ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_file      ON file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project        ON meeting_minutes(project_id);
CREATE INDEX IF NOT EXISTS idx_discussions_project     ON stakeholder_discussions(project_id);
CREATE INDEX IF NOT EXISTS idx_ba_tasks_project        ON ba_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_test_tasks_project      ON test_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_status        ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_project       ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_brs          ON test_cases(brs_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_status       ON test_cases(status);
CREATE INDEX IF NOT EXISTS idx_ppg_app_registry_project ON ppg_app_registry(project_id);
CREATE INDEX IF NOT EXISTS idx_ppg_app_registry_type   ON ppg_app_registry(object_type);

-- ============================================================
-- SEED: default admin user (password: admin123)
-- ============================================================
INSERT INTO ppg_users (username, full_name, email, password_hash)
VALUES ('admin', 'System Admin', 'admin@vib.com.vn',
        '$2b$12$8C92m.jhLDdHzDkO39TK0e/LH9/SAlgZA0lYHbssRsvg5/BDHtiGe')
ON CONFLICT (username) DO NOTHING;
