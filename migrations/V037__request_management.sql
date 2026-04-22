-- V037: Request Management — project_change_requests + service_requests
-- project_change_requests: gắn với projects đang chạy (scope/timeline/resource/budget/technical)
-- service_requests: gắn với catalog_products đang vận hành (bug_fix/enhancement/incident...)

-- Sequences cho auto-gen request code
CREATE SEQUENCE IF NOT EXISTS pcr_seq START 1;
CREATE SEQUENCE IF NOT EXISTS sr_seq  START 1;

-- ── Project Change Requests ──────────────────────────────────────────────────
CREATE TABLE project_change_requests (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    request_code    TEXT        NOT NULL UNIQUE,   -- PCR-2026-001
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title           TEXT        NOT NULL,
    description     TEXT,
    change_type     TEXT        NOT NULL DEFAULT 'other'
                    CHECK (change_type IN ('scope','timeline','resource','budget','technical','process','other')),
    priority        TEXT        NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical','high','medium','low')),
    status          TEXT        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','reviewing','approved','rejected','implemented','cancelled')),
    impact_scope    TEXT,
    impact_effort   TEXT,
    requested_by    TEXT        NOT NULL,
    assigned_to     TEXT,
    target_date     DATE,
    approved_by     TEXT,
    approved_at     TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pcr_project_id ON project_change_requests(project_id);
CREATE INDEX idx_pcr_status     ON project_change_requests(status);
CREATE INDEX idx_pcr_priority   ON project_change_requests(priority);

-- ── Service Requests ─────────────────────────────────────────────────────────
CREATE TABLE service_requests (
    id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    request_code     TEXT        NOT NULL UNIQUE,  -- SR-2026-001
    product_id       UUID        REFERENCES catalog_products(id) ON DELETE SET NULL,
    title            TEXT        NOT NULL,
    description      TEXT,
    request_type     TEXT        NOT NULL DEFAULT 'support'
                     CHECK (request_type IN ('bug_fix','enhancement','support','incident','access_request','data_request','other')),
    priority         TEXT        NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('critical','high','medium','low')),
    severity         TEXT
                     CHECK (severity IS NULL OR severity IN ('critical','high','medium','low')),
    environment      TEXT
                     CHECK (environment IS NULL OR environment IN ('DEV','SIT','UAT','PROD','DR','STAGING')),
    status           TEXT        NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','submitted','triaged','in_progress','resolved','closed','rejected')),
    sla_deadline     TIMESTAMPTZ,
    requested_by     TEXT        NOT NULL,
    assigned_to      TEXT,
    resolution_notes TEXT,
    resolved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sr_product_id   ON service_requests(product_id);
CREATE INDEX idx_sr_status       ON service_requests(status);
CREATE INDEX idx_sr_priority     ON service_requests(priority);
CREATE INDEX idx_sr_request_type ON service_requests(request_type);
