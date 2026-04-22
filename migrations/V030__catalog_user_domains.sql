-- ============================================================
-- V030 — catalog_user_domains
-- Junction table: một nhân sự có thể incharge nhiều domain
-- project_domains (LOV) đã có sẵn từ V028
-- ============================================================

CREATE TABLE catalog_user_domains (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES catalog_users(id) ON DELETE CASCADE,
    domain_code    VARCHAR(50) NOT NULL REFERENCES project_domains(code) ON UPDATE CASCADE ON DELETE CASCADE,
    role_in_domain VARCHAR(200),        -- mô tả vai trò trong domain (Domain Lead, BA Lead…)
    is_primary     BOOLEAN     NOT NULL DEFAULT FALSE,
    assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by    VARCHAR(200),
    UNIQUE (user_id, domain_code)
);

CREATE INDEX idx_cud_user   ON catalog_user_domains(user_id);
CREATE INDEX idx_cud_domain ON catalog_user_domains(domain_code);

COMMENT ON TABLE catalog_user_domains IS
  'Nhân sự phụ trách domain — M:M giữa catalog_users và project_domains';
COMMENT ON COLUMN catalog_user_domains.role_in_domain IS
  'Vai trò trong domain: Domain Lead, BA Lead, Tech Lead, QA Lead…';
COMMENT ON COLUMN catalog_user_domains.is_primary IS
  'TRUE nếu đây là domain chính của nhân sự này';
