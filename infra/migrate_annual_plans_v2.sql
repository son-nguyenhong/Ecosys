-- Migration: Create ppg_annual_plans v2 tables
-- Run as: psql -U postgres -d devops_hub -f infra/migrate_annual_plans_v2.sql

-- ── ppg_annual_plans ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_annual_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(300) NOT NULL,
    year            INT NOT NULL,
    description     TEXT,
    domain          VARCHAR(200),
    start_date      DATE,
    end_date        DATE,
    related_systems JSONB DEFAULT '[]',
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by      VARCHAR(255) NOT NULL DEFAULT 'system',
    updated_by      VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppg_ap_year   ON ppg_annual_plans(year);
CREATE INDEX IF NOT EXISTS idx_ppg_ap_status ON ppg_annual_plans(status);
GRANT ALL ON ppg_annual_plans TO devops;

-- ── ppg_annual_plan_objectives ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_annual_plan_objectives (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id     UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    description TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    created_by  VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppg_ap_obj_plan ON ppg_annual_plan_objectives(plan_id);
GRANT ALL ON ppg_annual_plan_objectives TO devops;

-- ── ppg_annual_plan_dod_items ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_annual_plan_dod_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id     UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    criterion   VARCHAR(500) NOT NULL,
    weight      NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    is_achieved BOOLEAN NOT NULL DEFAULT FALSE,
    notes       TEXT,
    achieved_at TIMESTAMPTZ,
    achieved_by VARCHAR(255),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppg_ap_dod_plan ON ppg_annual_plan_dod_items(plan_id);
GRANT ALL ON ppg_annual_plan_dod_items TO devops;

-- ── ppg_plan_project_links ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_plan_project_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id     UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    linked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by   VARCHAR(255),
    unlinked_at TIMESTAMPTZ,
    unlinked_by VARCHAR(255),
    UNIQUE (plan_id, project_id)
);

GRANT ALL ON ppg_plan_project_links TO devops;

-- ── ppg_audit_log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ppg_audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id   VARCHAR(255) NOT NULL,
    action      VARCHAR(50)  NOT NULL,
    changed_by  VARCHAR(255) NOT NULL,
    old_values  JSONB,
    new_values  JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppg_audit_entity ON ppg_audit_log(entity_type, entity_id);
GRANT ALL ON ppg_audit_log TO devops;

-- ── Sample data ──────────────────────────────────────────────────
INSERT INTO ppg_annual_plans (id, name, year, description, domain, start_date, end_date, related_systems, status, created_by)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Kế hoạch Chuyển đổi số 2026',
    2026,
    'Kế hoạch tổng thể cho chương trình chuyển đổi số năm 2026, tập trung vào nâng cấp hệ thống Core Banking, triển khai Digital Banking và nâng cao năng lực Data Analytics.',
    'Chuyển đổi số',
    '2026-01-01',
    '2026-12-31',
    '["CoreBanking T24", "Mobile App VIB", "BankPlus", "Data Warehouse", "API Gateway"]',
    'active',
    'admin'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ppg_annual_plan_objectives (plan_id, title, sort_order)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Nâng cấp Core Banking T24 lên phiên bản R22', 1),
    ('11111111-1111-1111-1111-111111111111', 'Ra mắt Mobile App VIB phiên bản 3.0 với tính năng Open Banking', 2),
    ('11111111-1111-1111-1111-111111111111', 'Triển khai Data Platform phục vụ phân tích rủi ro tín dụng', 3),
    ('11111111-1111-1111-1111-111111111111', 'Tích hợp eKYC và thanh toán QR quốc tế', 4)
ON CONFLICT DO NOTHING;

INSERT INTO ppg_annual_plan_dod_items (plan_id, criterion, weight, is_achieved)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Ít nhất 80% dự án trong kế hoạch hoàn thành đúng tiến độ', 40, false),
    ('11111111-1111-1111-1111-111111111111', 'Test coverage >= 80% cho tất cả hệ thống critical', 30, false),
    ('11111111-1111-1111-1111-111111111111', 'Không có sự cố P1 nào sau go-live quá 48 giờ chưa xử lý', 20, false),
    ('11111111-1111-1111-1111-111111111111', 'Toàn bộ tài liệu BRD và FSD được approve trước khi dev', 10, true)
ON CONFLICT DO NOTHING;

SELECT 'Migration complete. Annual plan inserted: ' || COUNT(*) FROM ppg_annual_plans;
