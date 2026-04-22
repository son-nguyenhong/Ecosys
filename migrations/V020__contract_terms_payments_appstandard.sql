-- V020 — Contract Terms/Payments + App/Job Standard Info
-- Features:
--   1. project_contract_terms   — Điều khoản hợp đồng
--   2. project_contract_payments — Nghĩa vụ thanh toán / lịch thanh toán
--   3. project_app_standard_info — Thông tin chuẩn của ứng dụng
--   4. project_job_standard_info — Thông tin chuẩn của batch job
-- Date: 2026-04-10 | Author: Dev Agent (Agent 06)

-- ============================================================
-- 1. CONTRACT TERMS (Điều khoản hợp đồng)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_contract_terms (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id   UUID NOT NULL REFERENCES project_contracts(id) ON DELETE CASCADE,
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    term_order    INT NOT NULL DEFAULT 0,
    term_type     VARCHAR(50) NOT NULL DEFAULT 'general'
                  CHECK (term_type IN (
                      'general',        -- điều khoản chung
                      'sla',            -- cam kết dịch vụ
                      'warranty',       -- bảo hành/bảo trì
                      'penalty',        -- phạt vi phạm
                      'liability',      -- trách nhiệm pháp lý
                      'confidential',   -- bảo mật thông tin
                      'termination',    -- chấm dứt hợp đồng
                      'ip_ownership',   -- sở hữu trí tuệ
                      'payment_term',   -- điều khoản thanh toán
                      'acceptance',     -- nghiệm thu
                      'other'
                  )),
    title         VARCHAR(255) NOT NULL,
    content       TEXT NOT NULL,
    effective_date DATE,
    expiry_date   DATE,
    is_key_term   BOOLEAN NOT NULL DEFAULT FALSE,  -- điều khoản quan trọng
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. CONTRACT PAYMENT OBLIGATIONS (Nghĩa vụ thanh toán)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_contract_payments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id      UUID NOT NULL REFERENCES project_contracts(id) ON DELETE CASCADE,
    project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    payment_order    INT NOT NULL DEFAULT 0,
    milestone_name   VARCHAR(255) NOT NULL,         -- tên mốc thanh toán
    payment_type     VARCHAR(50) NOT NULL DEFAULT 'progress'
                     CHECK (payment_type IN (
                         'advance',      -- tạm ứng
                         'progress',     -- thanh toán theo tiến độ
                         'acceptance',   -- thanh toán nghiệm thu
                         'warranty',     -- phí bảo hành
                         'maintenance',  -- phí bảo trì
                         'final',        -- quyết toán
                         'penalty',      -- tiền phạt
                         'refund'        -- hoàn trả
                     )),
    payment_basis    TEXT,                          -- căn cứ thanh toán
    amount           NUMERIC(18,2) NOT NULL,
    currency         VARCHAR(10) NOT NULL DEFAULT 'VND',
    percentage_of_total NUMERIC(5,2),              -- % trên tổng giá trị HĐ
    due_date         DATE,                          -- hạn thanh toán
    status           VARCHAR(30) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','invoiced','paid','overdue','disputed','cancelled')),
    invoice_number   VARCHAR(100),
    invoice_date     DATE,
    paid_date        DATE,
    paid_amount      NUMERIC(18,2),
    bank_reference   VARCHAR(255),                  -- số chứng từ ngân hàng
    approved_by      VARCHAR(255),
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. APP STANDARD INFO (Thông tin chuẩn ứng dụng)
--    Applied for product_type: application / api / service
-- ============================================================
CREATE TABLE IF NOT EXISTS project_app_standard_info (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id            UUID NOT NULL REFERENCES project_product_registry(id) ON DELETE CASCADE UNIQUE,
    project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Định danh
    app_code              VARCHAR(50),               -- mã ứng dụng nội bộ
    app_full_name         VARCHAR(255),

    -- Phân loại
    app_type              VARCHAR(50)
                          CHECK (app_type IN (
                              'web_app','mobile_ios','mobile_android','mobile_hybrid',
                              'desktop','api','microservice','integration','reporting'
                          )),
    criticality_level     VARCHAR(20) NOT NULL DEFAULT 'medium'
                          CHECK (criticality_level IN ('critical','high','medium','low')),

    -- Công nghệ
    platform              VARCHAR(100),    -- .NET / Java / Python / NodeJS / PHP / Go
    primary_language      VARCHAR(100),    -- ngôn ngữ chính
    framework             VARCHAR(100),    -- Spring Boot / FastAPI / NextJS / .NET MVC
    ui_framework          VARCHAR(100),    -- React / Angular / Vue / Blazor
    database_tech         JSONB NOT NULL DEFAULT '[]',
    -- [{name:"Oracle",version:"19c",role:"primary"}, {name:"Redis",version:"7","role":"cache"}]
    message_queue         VARCHAR(100),    -- Kafka / RabbitMQ / Azure SB
    api_style             VARCHAR(50),     -- REST / GraphQL / SOAP / gRPC

    -- Kiến trúc & Hạ tầng
    architecture_style    VARCHAR(50)
                          CHECK (architecture_style IN (
                              'monolith','microservice','serverless','event_driven',
                              'soa','layered','hexagonal'
                          )),
    hosting_type          VARCHAR(50)
                          CHECK (hosting_type IN (
                              'on_premise','cloud_azure','cloud_aws','cloud_gcp',
                              'hybrid','saas','paas'
                          )),
    server_os             VARCHAR(50),     -- Windows Server / Linux / Container
    network_zone          VARCHAR(30)
                          CHECK (network_zone IN ('internet','dmz','intranet','closed')),
    container_platform    VARCHAR(50),     -- Docker / Kubernetes / OpenShift

    -- Source & Version
    source_repo_url       TEXT,
    source_repo_type      VARCHAR(30),     -- Azure DevOps / GitHub / GitLab / SVN
    current_version       VARCHAR(50),
    release_date          DATE,
    next_release_date     DATE,

    -- Người dùng
    user_count_internal   INT,
    user_count_external   INT,
    peak_concurrent_users INT,

    -- SLA & Khả dụng
    sla_uptime_pct        NUMERIC(5,2),    -- 99.9 = 99.9%
    rto_hours             INT,             -- Recovery Time Objective
    rpo_hours             INT,             -- Recovery Point Objective
    maintenance_window    VARCHAR(100),    -- "Sunday 00:00–02:00 ICT"

    -- Tích hợp
    integration_count     INT DEFAULT 0,
    integration_list      JSONB NOT NULL DEFAULT '[]',
    -- [{system:"CBS",direction:"upstream",protocol:"REST",description:"..."}]

    -- Tuân thủ & Bảo mật
    data_classification   VARCHAR(30) NOT NULL DEFAULT 'internal'
                          CHECK (data_classification IN (
                              'public','internal','confidential','restricted','secret'
                          )),
    compliance_standards  JSONB NOT NULL DEFAULT '[]',
    -- ["PCI-DSS","ISO27001","SOC2","GDPR"]
    last_security_audit   DATE,
    next_security_audit   DATE,
    last_pen_test         DATE,

    -- Vận hành
    monitoring_tool       VARCHAR(100),    -- Grafana / Datadog / Zabbix
    log_management        VARCHAR(100),    -- ELK / Splunk / Azure Monitor
    deployment_tool       VARCHAR(100),    -- ADO Pipeline / Jenkins / ArgoCD
    backup_policy         VARCHAR(255),

    -- Mô tả nghiệp vụ
    business_function     TEXT,
    target_users          TEXT,

    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. JOB STANDARD INFO (Thông tin chuẩn batch/job)
--    Applied for product_type: batch_job
-- ============================================================
CREATE TABLE IF NOT EXISTS project_job_standard_info (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id            UUID NOT NULL REFERENCES project_product_registry(id) ON DELETE CASCADE UNIQUE,
    project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Định danh
    job_code              VARCHAR(50),
    job_full_name         VARCHAR(255),

    -- Phân loại
    job_type              VARCHAR(50)
                          CHECK (job_type IN (
                              'etl','report','sync','cleanup','notification',
                              'interface','calculation','validation','archive','other'
                          )),
    criticality_level     VARCHAR(20) NOT NULL DEFAULT 'medium'
                          CHECK (criticality_level IN ('critical','high','medium','low')),

    -- Công nghệ
    run_platform          VARCHAR(50)
                          CHECK (run_platform IN (
                              'windows_task','linux_cron','k8s_cronjob',
                              'cloud_function','ado_pipeline','airflow',
                              'spring_batch','quartz','other'
                          )),
    run_language          VARCHAR(100),    -- Python / Java / Shell / SSIS
    run_framework         VARCHAR(100),    -- Spring Batch / Apache Spark / Pandas
    run_server            VARCHAR(255),    -- server/host chạy job

    -- Lịch chạy
    frequency             VARCHAR(50)
                          CHECK (frequency IN (
                              'real_time','hourly','daily','weekly','monthly',
                              'quarterly','yearly','on_demand','event_driven'
                          )),
    schedule_cron         VARCHAR(100),    -- cron expression
    schedule_description  VARCHAR(255),   -- "Chạy lúc 02:00 hàng ngày"
    expected_start_time   VARCHAR(20),    -- "02:00 ICT"
    deadline_time         VARCHAR(20),    -- "04:00 ICT" — phải xong trước
    expected_runtime_min  INT,            -- phút chạy bình thường
    max_runtime_min       INT,            -- SLA: tối đa bao nhiêu phút

    -- Input / Output
    input_sources         JSONB NOT NULL DEFAULT '[]',
    -- [{name:"CBS_ACCOUNT",type:"db/file/api",system:"CBS",table_or_path:"...",format:"..."}]
    output_targets        JSONB NOT NULL DEFAULT '[]',
    -- [{name:"DWH_FACT",type:"db/file/sftp",system:"DWH",table_or_path:"...",format:"..."}]
    data_volume_estimate  VARCHAR(100),   -- "~500K records / 200MB per run"

    -- Xử lý lỗi & Retry
    retry_policy          JSONB NOT NULL DEFAULT '{}',
    -- {max_retries:3, retry_interval_min:15, backoff:"exponential", alert_on_final_fail:true}
    failure_action        VARCHAR(50)
                          CHECK (failure_action IN (
                              'alert_only','stop_pipeline','rollback',
                              'skip_and_continue','manual_intervention'
                          )),
    error_notification    JSONB NOT NULL DEFAULT '{}',
    -- {channels:["email","teams"], recipients:["ops@vib.com.vn"], escalation_after_min:30}

    -- Điều kiện thành công
    success_criteria      TEXT,           -- tiêu chí hoàn thành thành công
    reconciliation_check  TEXT,           -- kiểm tra đối chiếu sau khi chạy

    -- Thống kê & Giám sát
    monitoring_url        TEXT,
    last_run_date         DATE,
    last_run_status       VARCHAR(20),    -- success/failed/timeout
    avg_runtime_min       INT,
    success_rate_pct      NUMERIC(5,2),

    -- Dependencies
    depends_on_jobs       JSONB NOT NULL DEFAULT '[]',  -- [{job_code:"...", reason:"..."}]
    dependent_jobs        JSONB NOT NULL DEFAULT '[]',  -- jobs phụ thuộc vào job này

    -- Vận hành
    runbook_url           TEXT,
    on_call_contact       VARCHAR(255),
    data_classification   VARCHAR(30) NOT NULL DEFAULT 'internal'
                          CHECK (data_classification IN (
                              'public','internal','confidential','restricted','secret'
                          )),

    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contract_terms_contract    ON project_contract_terms(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_terms_type        ON project_contract_terms(contract_id, term_type);
CREATE INDEX IF NOT EXISTS idx_contract_payments_contract ON project_contract_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_status   ON project_contract_payments(contract_id, status);
CREATE INDEX IF NOT EXISTS idx_contract_payments_due      ON project_contract_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_app_standard_product       ON project_app_standard_info(product_id);
CREATE INDEX IF NOT EXISTS idx_app_standard_code          ON project_app_standard_info(app_code);
CREATE INDEX IF NOT EXISTS idx_job_standard_product       ON project_job_standard_info(product_id);
CREATE INDEX IF NOT EXISTS idx_job_standard_code          ON project_job_standard_info(job_code);
