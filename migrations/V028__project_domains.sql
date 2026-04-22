-- ============================================================
-- V028 — Project Domains LOV + domain_code on projects
-- LOV table: project_domains (HR, FS, RETAIL, CARDS, ...)
-- Folder tree: {domain}/{project}/BA + Tester
-- ============================================================

-- ── 1. LOV table ───────────────────────────────────────────
CREATE TABLE project_domains (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(50) UNIQUE NOT NULL,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_domains_active ON project_domains(is_active, sort_order);

-- ── 2. Seed standard VIB domains ───────────────────────────
INSERT INTO project_domains (code, name, description, sort_order) VALUES
  ('HR',          'Human Resources',        'Nhân sự & Quản lý con người',          1),
  ('FS',          'Financial Services',     'Dịch vụ tài chính & Ngân hàng',        2),
  ('RETAIL',      'Retail Banking',         'Ngân hàng bán lẻ',                     3),
  ('CARDS',       'Cards & Payments',       'Thẻ & Thanh toán',                     4),
  ('RISK',        'Risk Management',        'Quản lý rủi ro',                       5),
  ('COMPLIANCE',  'Compliance & Legal',     'Tuân thủ & Pháp lý',                   6),
  ('IT',          'Information Technology', 'Hạ tầng & Công nghệ thông tin',        7),
  ('DIGITAL',     'Digital Banking',        'Ngân hàng số',                         8),
  ('OPERATIONS',  'Operations',             'Vận hành & Hỗ trợ',                    9),
  ('DATA',        'Data & Analytics',       'Dữ liệu & Phân tích',                 10),
  ('SME',         'SME Banking',            'Ngân hàng doanh nghiệp vừa và nhỏ',   11),
  ('TREASURY',    'Treasury',               'Ngân quỹ',                            12)
ON CONFLICT (code) DO NOTHING;

-- ── 3. Add domain_code to projects ─────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS domain_code VARCHAR(50)
      REFERENCES project_domains(code) ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(domain_code)
  WHERE domain_code IS NOT NULL;

COMMENT ON COLUMN projects.domain_code IS
  'Business domain (HR / FS / RETAIL / ...) — drives folder tree layer 1';
