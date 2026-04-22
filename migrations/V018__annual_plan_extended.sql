-- ============================================================
-- V018: Annual Plan Extended Modules
-- Planning Hierarchy | Business Mapping | Budget | Resource
-- KPI/OKR | Dependencies | Risk Register
-- ============================================================

-- ── 1. Planning Hierarchy: Initiatives ──────────────────────
CREATE TABLE IF NOT EXISTS ppg_plan_initiatives (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id      UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    title        VARCHAR(300) NOT NULL,
    description  TEXT,
    quarter      VARCHAR(10),              -- Q1 | Q2 | Q3 | Q4 | null = full-year
    priority     SMALLINT DEFAULT 3,       -- 1=Low … 5=Critical
    status       VARCHAR(50) DEFAULT 'planned',  -- planned | in_progress | completed | cancelled
    sort_order   INT DEFAULT 0,
    created_by   VARCHAR(255),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_initiatives_plan ON ppg_plan_initiatives(plan_id);

-- Link initiatives to existing ppg_plan_project_links (optional)
CREATE TABLE IF NOT EXISTS ppg_initiative_projects (
    initiative_id UUID NOT NULL REFERENCES ppg_plan_initiatives(id) ON DELETE CASCADE,
    project_id    UUID NOT NULL,
    notes         TEXT,
    PRIMARY KEY (initiative_id, project_id)
);

-- ── 2. Business Objective Mapping ───────────────────────────
CREATE TABLE IF NOT EXISTS ppg_biz_objectives (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id      UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    title        VARCHAR(500) NOT NULL,
    description  TEXT,
    biz_owner    VARCHAR(255),
    category     VARCHAR(100),   -- Growth | Efficiency | Risk | Compliance | Customer | Other
    sort_order   INT DEFAULT 0,
    created_by   VARCHAR(255),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_biz_objectives_plan ON ppg_biz_objectives(plan_id);

-- Map business objectives ↔ IT initiatives (M:M)
CREATE TABLE IF NOT EXISTS ppg_biz_obj_initiative_map (
    biz_obj_id    UUID NOT NULL REFERENCES ppg_biz_objectives(id) ON DELETE CASCADE,
    initiative_id UUID NOT NULL REFERENCES ppg_plan_initiatives(id) ON DELETE CASCADE,
    notes         TEXT,
    PRIMARY KEY (biz_obj_id, initiative_id)
);

-- ── 3. Budget Management (Capex / Opex) ─────────────────────
CREATE TABLE IF NOT EXISTS ppg_plan_budget (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id        UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    initiative_id  UUID REFERENCES ppg_plan_initiatives(id) ON DELETE SET NULL,
    project_id     UUID,                  -- optional reference to projects table
    label          VARCHAR(300) NOT NULL, -- budget line description
    budget_type    VARCHAR(20) NOT NULL,  -- capex | opex
    quarter        VARCHAR(10),           -- Q1-Q4 or null = annual total
    amount_planned NUMERIC(18,2) DEFAULT 0,
    amount_actual  NUMERIC(18,2) DEFAULT 0,
    currency       VARCHAR(10) DEFAULT 'VND',
    notes          TEXT,
    created_by     VARCHAR(255),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_budget_plan ON ppg_plan_budget(plan_id);

-- ── 4. Resource Allocation ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_plan_resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    initiative_id   UUID REFERENCES ppg_plan_initiatives(id) ON DELETE SET NULL,
    project_id      UUID,
    member_name     VARCHAR(255) NOT NULL,
    role            VARCHAR(200),
    team            VARCHAR(200),
    allocation_pct  NUMERIC(5,2) DEFAULT 100 CHECK (allocation_pct BETWEEN 0 AND 100),
    quarter         VARCHAR(10),   -- Q1-Q4 or null = full year
    notes           TEXT,
    created_by      VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_resources_plan ON ppg_plan_resources(plan_id);

-- ── 5. KPI / OKR Tracking ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_plan_kpis (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id        UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    initiative_id  UUID REFERENCES ppg_plan_initiatives(id) ON DELETE SET NULL,
    biz_obj_id     UUID REFERENCES ppg_biz_objectives(id) ON DELETE SET NULL,
    metric_name    VARCHAR(300) NOT NULL,
    unit           VARCHAR(50),           -- %, VND, count, days, ...
    target_value   NUMERIC(18,4),
    actual_value   NUMERIC(18,4),
    quarter        VARCHAR(10),           -- Q1-Q4 or null = annual
    status         VARCHAR(50) DEFAULT 'on_track', -- on_track | at_risk | off_track | achieved
    notes          TEXT,
    created_by     VARCHAR(255),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_kpis_plan ON ppg_plan_kpis(plan_id);

-- ── 6. Project Dependencies ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_plan_dependencies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    from_project_id UUID,             -- source (blocks this)
    to_project_id   UUID,             -- target (blocked by source)
    from_label      VARCHAR(255),     -- display label when no project_id
    to_label        VARCHAR(255),
    dep_type        VARCHAR(50) DEFAULT 'finish_to_start',
    description     TEXT,
    status          VARCHAR(50) DEFAULT 'active',  -- active | resolved | blocked
    created_by      VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_dependencies_plan ON ppg_plan_dependencies(plan_id);

-- ── 7. Risk Register ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_plan_risks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id      UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    title        VARCHAR(300) NOT NULL,
    description  TEXT,
    category     VARCHAR(100),                     -- Technical | Resource | External | Compliance | Budget
    probability  SMALLINT CHECK (probability BETWEEN 1 AND 5),  -- 1=VeryLow … 5=VeryHigh
    impact       SMALLINT CHECK (impact BETWEEN 1 AND 5),
    risk_score   SMALLINT GENERATED ALWAYS AS (probability * impact) STORED,
    mitigation   TEXT,
    contingency  TEXT,
    owner        VARCHAR(255),
    quarter      VARCHAR(10),
    status       VARCHAR(50) DEFAULT 'open',  -- open | mitigated | closed | occurred
    created_by   VARCHAR(255),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_risks_plan ON ppg_plan_risks(plan_id);
