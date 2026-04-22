-- ============================================================
-- V021 — Module Danh Mục Dữ Liệu (Data Catalog)
-- Org-wide catalog: Products (Web App / Mobile / Job / ETL / API)
--                   Users (internal + external) + Roles
-- ============================================================

-- ── 1. catalog_products ────────────────────────────────────────
CREATE TABLE catalog_products (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code     VARCHAR(50)  UNIQUE NOT NULL,
    product_name     VARCHAR(200) NOT NULL,
    product_type     VARCHAR(20)  NOT NULL CHECK (product_type IN ('web_app','mobile','job','etl','api')),
    description      TEXT,
    business_owner   VARCHAR(100),
    technical_owner  VARCHAR(100),
    owner_team       VARCHAR(100),
    department       VARCHAR(100),
    status           VARCHAR(20)  NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','inactive','deprecated','planned')),
    tags             TEXT[]       DEFAULT '{}',
    notes            TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       VARCHAR(100)
);

CREATE INDEX idx_catalog_products_type   ON catalog_products(product_type);
CREATE INDEX idx_catalog_products_status ON catalog_products(status);
CREATE INDEX idx_catalog_products_team   ON catalog_products(owner_team);

-- ── 2. catalog_product_environments ───────────────────────────
CREATE TABLE catalog_product_environments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
    env_name     VARCHAR(20) NOT NULL CHECK (env_name IN ('DEV','SIT','UAT','PROD','DR','STAGING')),
    url          TEXT,
    server_info  JSONB        DEFAULT '{}',
    deploy_date  DATE,
    version      VARCHAR(50),
    status       VARCHAR(20)  DEFAULT 'active'
                     CHECK (status IN ('active','inactive','maintenance')),
    notes        TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, env_name)
);

CREATE INDEX idx_cat_env_product ON catalog_product_environments(product_id);

-- ── 3. catalog_product_licenses ───────────────────────────────
CREATE TABLE catalog_product_licenses (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id         UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
    license_name       VARCHAR(200) NOT NULL,
    license_type       VARCHAR(30)  DEFAULT 'commercial'
                           CHECK (license_type IN ('commercial','open_source','proprietary','subscription','free')),
    vendor             VARCHAR(200),
    quantity           INTEGER,
    start_date         DATE,
    expiry_date        DATE,
    cost_amount        NUMERIC(15,2),
    currency           VARCHAR(10)  DEFAULT 'VND',
    auto_renewal       BOOLEAN      DEFAULT FALSE,
    compliance_status  VARCHAR(30)  DEFAULT 'compliant'
                           CHECK (compliance_status IN ('compliant','non_compliant','pending_review')),
    notes              TEXT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cat_lic_product ON catalog_product_licenses(product_id);
CREATE INDEX idx_cat_lic_expiry  ON catalog_product_licenses(expiry_date)
    WHERE expiry_date IS NOT NULL;

-- ── 4. catalog_product_details (JSONB — type-specific fields) ─
-- Web App:  { app_url, tech_stack, framework, database_tech[], hosting_type, architecture, sla_uptime_pct }
-- Mobile:   { os_support[], store_link_android, store_link_ios, min_os_android, min_os_ios, tech_framework, distribution_type }
-- Job:      { job_type, run_platform, run_language, schedule_cron, schedule_desc, expected_runtime_min, input_sources[], output_targets[] }
-- ETL:      { source_system, source_type, destination_system, destination_type, etl_tool, etl_logic, data_format, volume_estimate, schedule_cron, sla_minutes }
-- API:      { api_type, base_url, auth_method, version, swagger_url, endpoints[], business_logic, rate_limit, response_format }
CREATE TABLE catalog_product_details (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID UNIQUE NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
    details     JSONB        NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 5. catalog_users ──────────────────────────────────────────
CREATE TABLE catalog_users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id  VARCHAR(50)  UNIQUE,
    full_name    VARCHAR(200) NOT NULL,
    email        VARCHAR(200) UNIQUE NOT NULL,
    phone        VARCHAR(50),
    user_type    VARCHAR(20)  NOT NULL DEFAULT 'internal'
                     CHECK (user_type IN ('internal','external','contractor','vendor')),
    department   VARCHAR(200),
    position     VARCHAR(200),
    manager_id   UUID         REFERENCES catalog_users(id),
    team         VARCHAR(200),
    location     VARCHAR(200),
    status       VARCHAR(20)  NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','inactive','on_leave','terminated')),
    start_date   DATE,
    end_date     DATE,
    skills       TEXT[]       DEFAULT '{}',
    notes        TEXT,
    ppg_user_id  UUID,   -- loose link to ppg_users
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by   VARCHAR(100)
);

CREATE INDEX idx_catalog_users_type   ON catalog_users(user_type);
CREATE INDEX idx_catalog_users_dept   ON catalog_users(department);
CREATE INDEX idx_catalog_users_status ON catalog_users(status);
CREATE INDEX idx_catalog_users_team   ON catalog_users(team);

-- ── 6. catalog_roles ──────────────────────────────────────────
CREATE TABLE catalog_roles (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code            VARCHAR(50)  UNIQUE NOT NULL,
    role_name            VARCHAR(200) NOT NULL,
    role_category        VARCHAR(30)  DEFAULT 'business'
                             CHECK (role_category IN ('system','business','technical','management')),
    description          TEXT,
    workflow_permissions JSONB        DEFAULT '{}',
    -- workflow_permissions shape:
    -- { "can_view": ["ba_docs","test_cases"], "can_create": [...], "can_approve": [...] }
    product_access_level VARCHAR(20)  DEFAULT 'read'
                             CHECK (product_access_level IN ('none','read','write','admin')),
    is_active            BOOLEAN      DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by           VARCHAR(100)
);

CREATE INDEX idx_catalog_roles_category ON catalog_roles(role_category);
CREATE INDEX idx_catalog_roles_active   ON catalog_roles(is_active);

-- Seed default roles
INSERT INTO catalog_roles (role_code, role_name, role_category, description, workflow_permissions, product_access_level) VALUES
('BA',          'Business Analyst',      'business',   'Viết BRD, FSD, phân tích yêu cầu',
 '{"can_view":["all"],"can_create":["ba_docs","requirements"],"can_approve":["ba_docs"]}', 'read'),
('DEV',         'Developer',             'technical',  'Phát triển frontend/backend',
 '{"can_view":["all"],"can_create":["code_docs"],"can_approve":[]}', 'write'),
('QA',          'QA Engineer',           'technical',  'Kiểm thử, viết test case',
 '{"can_view":["all"],"can_create":["test_cases","test_docs"],"can_approve":["test_docs"]}', 'read'),
('PM',          'Project Manager',       'management', 'Quản lý dự án, milestone',
 '{"can_view":["all"],"can_create":["all"],"can_approve":["all"]}', 'admin'),
('PO',          'Product Owner',         'business',   'Định nghĩa sản phẩm, ưu tiên backlog',
 '{"can_view":["all"],"can_create":["requirements","roadmap"],"can_approve":["requirements"]}', 'write'),
('ARCH',        'Solution Architect',    'technical',  'Thiết kế kiến trúc hệ thống',
 '{"can_view":["all"],"can_create":["arch_docs","adr"],"can_approve":["arch_docs"]}', 'admin'),
('DEVOPS',      'DevOps Engineer',       'technical',  'CI/CD, hạ tầng, triển khai',
 '{"can_view":["all"],"can_create":["infra_docs"],"can_approve":[]}', 'admin'),
('VIEWER',      'Viewer',                'business',   'Chỉ xem, không chỉnh sửa',
 '{"can_view":["all"],"can_create":[],"can_approve":[]}', 'none');

-- ── 7. catalog_user_roles ─────────────────────────────────────
CREATE TABLE catalog_user_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES catalog_users(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES catalog_roles(id) ON DELETE CASCADE,
    scope_type  VARCHAR(20)  DEFAULT 'global'
                    CHECK (scope_type IN ('global','product','team')),
    scope_id    UUID,   -- product_id or team ref (nullable for global)
    assigned_by VARCHAR(200),
    assigned_at TIMESTAMPTZ  DEFAULT NOW(),
    expires_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_cat_user_roles
    ON catalog_user_roles(user_id, role_id, scope_type, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE INDEX idx_cat_user_roles_user ON catalog_user_roles(user_id);
CREATE INDEX idx_cat_user_roles_role ON catalog_user_roles(role_id);
