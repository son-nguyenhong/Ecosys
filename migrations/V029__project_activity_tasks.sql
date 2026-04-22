-- ============================================================
-- V029 — Project Activity Tasks (5-domain governance checklist)
-- Auto-created on project init; status tracked per project.
-- 5 domains × ~8 tasks = 38 default tasks per project.
-- ============================================================

CREATE TABLE project_activity_tasks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    activity_domain VARCHAR(50) NOT NULL
                        CHECK (activity_domain IN (
                            'business_requirements',
                            'architecture_code',
                            'infrastructure',
                            'security_iam',
                            'compliance_governance'
                        )),
    title           TEXT        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','in_progress','done','skipped','na')),
    assignee        VARCHAR(100),
    notes           TEXT,
    due_date        DATE,
    sort_order      INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pat_project     ON project_activity_tasks(project_id);
CREATE INDEX idx_pat_domain      ON project_activity_tasks(project_id, activity_domain);
CREATE INDEX idx_pat_status      ON project_activity_tasks(project_id, status);

COMMENT ON TABLE project_activity_tasks IS
  '38 default activity tasks across 5 governance domains, auto-created on project init';
COMMENT ON COLUMN project_activity_tasks.activity_domain IS
  'business_requirements | architecture_code | infrastructure | security_iam | compliance_governance';
