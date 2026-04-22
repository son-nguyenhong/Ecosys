-- ============================================================
-- V026 — Catalog Product Extended
-- Thêm 6 nhóm thông tin chung cho tất cả loại sản phẩm:
--   1. domain (identification)
--   2. architecture_info (tech stack, framework, arch_type, dependencies)
--   3. deployment_info (git, CI/CD, deploy method)
--   4. security_info (auth, compliance)
--   5. monitoring_info (logging, alerting, SLA)
--   6. resource_info (CPU/RAM, autoscaling)
--   7. business_metadata (SLA business, tier, downtime impact)
-- Thêm infra_type + region cho environments
-- ============================================================

ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS domain            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS architecture_info JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deployment_info   JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS security_info     JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS monitoring_info   JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resource_info     JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS business_metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_catalog_products_domain ON catalog_products(domain)
  WHERE domain IS NOT NULL;

-- Environments: add infra type + region
ALTER TABLE catalog_product_environments
  ADD COLUMN IF NOT EXISTS infra_type VARCHAR(50),   -- VM / K8s / Serverless
  ADD COLUMN IF NOT EXISTS region     VARCHAR(100);  -- Data center / region / cloud zone

COMMENT ON COLUMN catalog_products.architecture_info IS
  '{arch_type, tech_stack[], framework, dependency_systems[]}';
COMMENT ON COLUMN catalog_products.deployment_info IS
  '{git_repo, branch_strategy, cicd_tool, versioning_type, deploy_method}';
COMMENT ON COLUMN catalog_products.security_info IS
  '{auth_method, authorization, secrets_management, compliance[]}';
COMMENT ON COLUMN catalog_products.monitoring_info IS
  '{logging_tool, monitoring_tool, alerting, sla_target, slo}';
COMMENT ON COLUMN catalog_products.resource_info IS
  '{cpu_config, ram_config, autoscaling_rules, throughput}';
COMMENT ON COLUMN catalog_products.business_metadata IS
  '{sla_business, critical_level, downtime_impact}';

-- Type-specific details schema (documentation in comments):
-- web_app: { domain_dns, cdn, browser_support[], seo_config, static_assets_storage, session_management }
-- mobile:  { platforms[], app_version, store_link_android, store_link_ios, build_pipeline, push_notification, offline_capability }
-- api:     { spec_url, endpoints[], rate_limit, auth_type, api_version, backward_compat_rule }
-- etl:     { source_systems[], target_systems[], transformation_logic, data_schema, data_quality_rules[], schedule, batch_or_streaming, data_lineage }
-- job:     { job_type, schedule_cron, retry_policy, timeout_seconds, is_idempotent, queue_system }
