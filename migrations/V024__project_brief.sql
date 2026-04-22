-- Migration V024: Project Brief — structured project overview (BRD-lite)
-- Stores 7 structured sections as a 1:1 companion to the projects table.
-- JSONB fields store string[] for list items (one entry per element).

CREATE TABLE IF NOT EXISTS project_briefs (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id               UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,

    -- Section 1: Business Overview & Objectives
    purpose                  TEXT,
    general_info             TEXT,
    success_metrics          JSONB NOT NULL DEFAULT '[]',   -- string[]
    enduser_value            TEXT,

    -- Section 2: Target Users & Personas
    primary_users            TEXT,
    pain_points              TEXT,
    user_role_matrix         JSONB NOT NULL DEFAULT '[]',   -- string[] (one row per entry)

    -- Section 3: Functional Requirements
    must_have_features       JSONB NOT NULL DEFAULT '[]',   -- string[]
    nice_to_have_features    JSONB NOT NULL DEFAULT '[]',   -- string[]
    system_integrations      JSONB NOT NULL DEFAULT '[]',   -- string[]

    -- Section 4: Non-Functional Requirements
    performance_scalability  TEXT,
    compliance_security      TEXT,
    availability_reliability TEXT,

    -- Section 5: Data & Reporting Needs
    data_needs               TEXT,
    reporting_needs          TEXT,

    -- Section 6: Constraints, Risks & Assumptions
    time_constraints         TEXT,
    dependencies             JSONB NOT NULL DEFAULT '[]',   -- string[]
    potential_risks          JSONB NOT NULL DEFAULT '[]',   -- string[]

    -- Section 7: Project Timeline & Roadmap
    key_milestones_notes     JSONB NOT NULL DEFAULT '[]',   -- string[]
    methodology              VARCHAR(100),
    decision_makers          JSONB NOT NULL DEFAULT '[]',   -- string[]

    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_briefs_project ON project_briefs(project_id);
GRANT ALL ON project_briefs TO devops;
