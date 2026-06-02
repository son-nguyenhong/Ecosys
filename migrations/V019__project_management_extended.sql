-- V019 — Project Management Extended
-- Covers: Governance, Monitoring, Health, Stakeholder, Prioritization
--         Product Registry, Environment, App Detail, Batch/Job,
--         License, Contract, Security, Operation, Handover, Integration
-- Date: 2026-04-10 | Author: Dev Agent (Agent 05/06)

-- ============================================================
-- GENERAL MANAGEMENT INFO
-- ============================================================

-- Stage Gate Control (Governance)
CREATE TABLE IF NOT EXISTS project_stage_gates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_name      VARCHAR(100) NOT NULL,
    stage_order     INT DEFAULT 0,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','passed','failed','skipped')),
    gate_criteria   JSONB NOT NULL DEFAULT '[]',  -- [{criterion, is_met, notes}]
    sign_off_by     VARCHAR(255),
    gate_date       DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project Health Scoring — RAG
CREATE TABLE IF NOT EXISTS project_health_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assessed_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_rag     VARCHAR(10) NOT NULL DEFAULT 'green'
                    CHECK (overall_rag IN ('red','amber','green')),
    schedule_rag    VARCHAR(10) CHECK (schedule_rag IN ('red','amber','green')),
    budget_rag      VARCHAR(10) CHECK (budget_rag IN ('red','amber','green')),
    scope_rag       VARCHAR(10) CHECK (scope_rag IN ('red','amber','green')),
    team_rag        VARCHAR(10) CHECK (team_rag IN ('red','amber','green')),
    risk_rag        VARCHAR(10) CHECK (risk_rag IN ('red','amber','green')),
    health_notes    JSONB NOT NULL DEFAULT '{}',   -- {schedule: "...", budget: "..."}
    assessed_by     VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stakeholder Mapping
CREATE TABLE IF NOT EXISTS project_stakeholders (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name                 VARCHAR(255) NOT NULL,
    role                 VARCHAR(100),
    organization         VARCHAR(255),
    interest_level       VARCHAR(20) NOT NULL DEFAULT 'medium'
                         CHECK (interest_level IN ('low','medium','high')),
    influence_level      VARCHAR(20) NOT NULL DEFAULT 'medium'
                         CHECK (influence_level IN ('low','medium','high')),
    engagement_strategy  TEXT,
    contact_info         JSONB NOT NULL DEFAULT '{}',  -- {email, phone, department}
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Priority Model (WSJF / ROI / Risk)
CREATE TABLE IF NOT EXISTS project_priorities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    business_value      NUMERIC(5,2) NOT NULL DEFAULT 0,
    time_criticality    NUMERIC(5,2) NOT NULL DEFAULT 0,
    risk_reduction      NUMERIC(5,2) NOT NULL DEFAULT 0,
    job_size            NUMERIC(5,2) NOT NULL DEFAULT 1
                        CHECK (job_size > 0),
    -- WSJF = (BV + TC + RR) / JS — computed column
    wsjf_score          NUMERIC(8,4) GENERATED ALWAYS AS (
                            (business_value + time_criticality + risk_reduction) / job_size
                        ) STORED,
    roi_score           NUMERIC(5,2) NOT NULL DEFAULT 0,
    risk_score          NUMERIC(5,2) NOT NULL DEFAULT 0,
    priority_rank       INT,
    notes               TEXT,
    assessed_at         DATE,
    assessed_by         VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCT REGISTRY
-- ============================================================

CREATE TABLE IF NOT EXISTS project_product_registry (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_name     VARCHAR(255) NOT NULL,
    product_type     VARCHAR(50) NOT NULL
                     CHECK (product_type IN ('application','batch_job','api','service')),
    business_owner   VARCHAR(255),
    technical_owner  VARCHAR(255),
    owner_team       VARCHAR(255),
    system_mappings  JSONB NOT NULL DEFAULT '[]',  -- [{system_name, relation_type, notes}]
    description      TEXT,
    status           VARCHAR(50) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','inactive','deprecated','planned')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ENVIRONMENT INFO (per product)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_environments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_id        UUID NOT NULL REFERENCES project_product_registry(id) ON DELETE CASCADE,
    env_name          VARCHAR(20) NOT NULL
                      CHECK (env_name IN ('DEV','SIT','UAT','PROD','DR')),
    infra_info        JSONB NOT NULL DEFAULT '{}',
    -- {server_type: "VM/K8s/Cloud", provider: "Azure/AWS", spec: "..."}
    access_info       JSONB NOT NULL DEFAULT '{}',
    -- {url: "...", ip: "...", port: 8080, vpn_required: true}
    deployment_info   JSONB NOT NULL DEFAULT '{}',
    -- {ci_cd_tool: "ADO/Jenkins", pipeline_url: "...", deploy_branch: "main"}
    monitoring_setup  JSONB NOT NULL DEFAULT '{}',
    -- {tool: "Grafana/Datadog", dashboard_url: "...", alert_channel: "..."}
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, env_name)
);

-- ============================================================
-- APPLICATION DETAIL (per product)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_app_details (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id               UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_id               UUID NOT NULL REFERENCES project_product_registry(id) ON DELETE CASCADE UNIQUE,
    architecture_description TEXT,
    tech_stack               JSONB NOT NULL DEFAULT '[]',
    -- [{name: "Python", version: "3.11", category: "backend/db/frontend"}]
    source_repo_url          TEXT,
    current_version          VARCHAR(100),
    release_notes            TEXT,
    dependencies             JSONB NOT NULL DEFAULT '[]',
    -- [{system_name: "...", type: "upstream/downstream", criticality: "high"}]
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BATCH / JOB INFO (per product)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_batch_jobs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_id       UUID NOT NULL REFERENCES project_product_registry(id) ON DELETE CASCADE,
    job_name         VARCHAR(255) NOT NULL,
    schedule         VARCHAR(255),           -- cron expression
    trigger_type     VARCHAR(50) NOT NULL DEFAULT 'scheduled'
                     CHECK (trigger_type IN ('scheduled','event','manual','api_call')),
    input_info       JSONB NOT NULL DEFAULT '{}',
    -- {source: "...", format: "CSV/DB", location: "..."}
    output_info      JSONB NOT NULL DEFAULT '{}',
    -- {target: "...", format: "...", location: "..."}
    failure_handling TEXT,
    status           VARCHAR(50) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','inactive','deprecated')),
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LICENSE MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS project_licenses (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    software_name      VARCHAR(255) NOT NULL,
    license_type       VARCHAR(50) NOT NULL
                       CHECK (license_type IN ('commercial','open_source','freeware','proprietary','subscription')),
    vendor             VARCHAR(255),
    version_covered    VARCHAR(100),
    expiry_date        DATE,
    cost_amount        NUMERIC(15,2),
    cost_currency      VARCHAR(10) NOT NULL DEFAULT 'VND',
    cost_period        VARCHAR(50),   -- annual/monthly/one-time/perpetual
    seat_count         INT,
    compliance_status  VARCHAR(50) NOT NULL DEFAULT 'compliant'
                       CHECK (compliance_status IN ('compliant','non_compliant','pending_review','expired','unknown')),
    notes              TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTRACT MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS project_contracts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    vendor_name          VARCHAR(255) NOT NULL,
    vendor_contact       JSONB NOT NULL DEFAULT '{}',
    -- {name: "...", email: "...", phone: "...", address: "..."}
    contract_number      VARCHAR(100),
    contract_type        VARCHAR(100),   -- maintenance/development/SaaS/support/outsourcing
    contract_description TEXT,
    sla_details          JSONB NOT NULL DEFAULT '{}',
    -- {uptime_pct: 99.9, response_time_hours: 4, penalty_clause: "..."}
    support_contact      JSONB NOT NULL DEFAULT '{}',
    -- {email: "...", phone: "...", hours: "24/7", escalation: "..."}
    start_date           DATE,
    expiry_date          DATE,
    auto_renewal         BOOLEAN NOT NULL DEFAULT FALSE,
    contract_value       NUMERIC(15,2),
    currency             VARCHAR(10) NOT NULL DEFAULT 'VND',
    status               VARCHAR(50) NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','expired','terminated','pending_renewal','pending_sign')),
    documents_url        TEXT,
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECURITY INFO (per product)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_security_info (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_id            UUID NOT NULL REFERENCES project_product_registry(id) ON DELETE CASCADE UNIQUE,
    data_classification   VARCHAR(50) NOT NULL DEFAULT 'internal'
                          CHECK (data_classification IN ('public','internal','confidential','restricted','secret')),
    data_categories       JSONB NOT NULL DEFAULT '[]',
    -- ["PII","financial_data","health_data","transaction_data"]
    access_control        JSONB NOT NULL DEFAULT '[]',
    -- [{role: "admin", description: "...", user_count: 5, access_type: "read/write"}]
    last_security_scan    DATE,
    vulnerabilities       JSONB NOT NULL DEFAULT '[]',
    -- [{cve_id: "CVE-xxx", severity: "high", status: "open/patched", description: "..."}]
    pen_test_date         DATE,
    pen_test_result       TEXT,
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OPERATIONS (per product)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_operations (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_id                UUID NOT NULL REFERENCES project_product_registry(id) ON DELETE CASCADE UNIQUE,
    runbook_url               TEXT,
    runbook_content           TEXT,
    incident_guide_url        TEXT,
    incident_guide_content    TEXT,
    backup_schedule           VARCHAR(255),    -- cron or description
    recovery_rto_hours        INT,             -- Recovery Time Objective
    recovery_rpo_hours        INT,             -- Recovery Point Objective
    backup_details            TEXT,
    dr_plan_url               TEXT,
    monitoring_dashboard_url  TEXT,
    on_call_info              JSONB NOT NULL DEFAULT '{}',
    -- {primary: "...", secondary: "...", escalation_path: "..."}
    notes                     TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HANDOVER
-- ============================================================

CREATE TABLE IF NOT EXISTS project_handover (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    checklist_items             JSONB NOT NULL DEFAULT '[]',
    -- [{item: "...", is_done: false, done_by: "...", done_date: "..."}]
    acceptance_sign_off_by      VARCHAR(255),
    acceptance_sign_off_date    DATE,
    acceptance_notes            TEXT,
    go_live_date                DATE,
    post_go_live_review_date    DATE,
    post_go_live_review_notes   TEXT,
    status                      VARCHAR(50) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','in_progress','completed')),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INTEGRATION LINKS (BA/QA/Doc/Backlog/Feedback)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_integration_links (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    link_type    VARCHAR(50) NOT NULL
                 CHECK (link_type IN ('ba_doc','qa_doc','backlog','feedback','monitoring','other')),
    title        VARCHAR(255) NOT NULL,
    url          TEXT,
    system_name  VARCHAR(100),   -- ADO/Jira/Confluence/SharePoint/Grafana
    description  TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_stage_gates_project      ON project_stage_gates(project_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_project    ON project_health_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_date       ON project_health_scores(project_id, assessed_date DESC);
CREATE INDEX IF NOT EXISTS idx_stakeholders_project     ON project_stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_priorities_project       ON project_priorities(project_id);

CREATE INDEX IF NOT EXISTS idx_product_registry_project ON project_product_registry(project_id);
CREATE INDEX IF NOT EXISTS idx_product_registry_type    ON project_product_registry(product_type);
CREATE INDEX IF NOT EXISTS idx_environments_product     ON project_environments(product_id);
CREATE INDEX IF NOT EXISTS idx_app_details_product      ON project_app_details(product_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_product       ON project_batch_jobs(product_id);

CREATE INDEX IF NOT EXISTS idx_licenses_project         ON project_licenses(project_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry          ON project_licenses(expiry_date);
CREATE INDEX IF NOT EXISTS idx_contracts_project        ON project_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_expiry         ON project_contracts(expiry_date);
CREATE INDEX IF NOT EXISTS idx_security_info_product    ON project_security_info(product_id);
CREATE INDEX IF NOT EXISTS idx_operations_product       ON project_operations(product_id);
CREATE INDEX IF NOT EXISTS idx_handover_project         ON project_handover(project_id);
CREATE INDEX IF NOT EXISTS idx_integration_links_project ON project_integration_links(project_id);