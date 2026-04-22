-- ============================================================
-- V030 — Catalog Seed: Internal Web Apps (ESD, HR, Finance, Ops)
-- 16 sản phẩm web app nội bộ VIB từ các khối ESD, HR, Finance, RB
-- Nguồn: danh sách sản phẩm VIB internal ecosystem
-- ============================================================

-- ── 1. catalog_products ──────────────────────────────────────

INSERT INTO catalog_products (
    product_code, product_name, product_type,
    description, domain, business_owner, technical_owner, owner_team, department,
    status, tags,
    architecture_info, deployment_info, security_info,
    monitoring_info, resource_info, business_metadata
) VALUES

-- ── ESD Portal ─────────────────────────────────────────────
(
    'ESD-PORTAL',
    'ESD Portal',
    'web_app',
    'Hệ thống cổng thông tin nội bộ cho khối ESD, tích hợp quản lý tài sản, công việc, đăng ký công cụ dụng cụ, đi công tác và văn phòng phẩm.',
    'ESD',
    NULL, NULL,
    'ESD Team',
    'ESD Division',
    'active',
    ARRAY['esd','internal-tool','asset-management','operations'],
    '{"arch_type":"Monolith","tech_stack":[],"framework":"","dependency_systems":[]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 2 (High)","downtime_impact":"Ảnh hưởng tác nghiệp nội bộ khối ESD."}'
),

-- ── Digital Signature ──────────────────────────────────────
(
    'DIGITAL-SIGN',
    'Digital Signature',
    'web_app',
    'Hệ thống ký số toàn diện: ký số HSM, USB Token, Remote Signing, xác minh chữ ký số và đăng ký chứng thư số.',
    'ESD',
    NULL, NULL,
    'ESD Team',
    'ESD Division',
    'active',
    ARRAY['digital-signature','esign','hsm','usb-token','remote-signing','certificate'],
    '{"arch_type":"Microservices","tech_stack":[],"framework":"","dependency_systems":["HSM","USB Token","PKI CA"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO + Certificate","authorization":"RBAC","secrets_management":"HSM","compliance":["ISO 27001","eIDAS","Luật Giao dịch điện tử"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 1 (Critical)","downtime_impact":"Không thể ký số tài liệu. Ảnh hưởng toàn bộ quy trình phê duyệt điện tử."}'
),

-- ── e-Contract ─────────────────────────────────────────────
(
    'E-CONTRACT',
    'e-Contract',
    'web_app',
    'Hệ thống hợp đồng điện tử nội bộ, phục vụ ký kết hợp đồng cho khối ESD và HR.',
    'ESD',
    NULL, NULL,
    'ESD Team',
    'ESD Division',
    'active',
    ARRAY['e-contract','digital-contract','esd','hr'],
    '{"arch_type":"Monolith","tech_stack":[],"framework":"","dependency_systems":["Digital Signature","e-HR"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001","Luật Giao dịch điện tử"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 2 (High)","downtime_impact":"Ảnh hưởng quy trình ký kết hợp đồng nội bộ."}'
),

-- ── e-HR ───────────────────────────────────────────────────
(
    'E-HR',
    'e-HR',
    'web_app',
    'Hệ thống quản lý nguồn nhân lực toàn diện: nghỉ phép, lương, core HR (HiStaff), cơ cấu tổ chức (OMS), KPI, onboard, thuế TNCN, hồ sơ nhân sự, danh bạ và các quy trình nhân sự.',
    'HR',
    NULL, NULL,
    'HR IT Team',
    'Human Resources Division',
    'active',
    ARRAY['hr','hrm','histaff','oms','pms','onboard','pit','e-profile','directory'],
    '{"arch_type":"Microservices","tech_stack":["ASP.NET","WinForms","REST API","SQL Server"],"framework":"","dependency_systems":["Active Directory","e-Hiring","Digital Signature","EMS2"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"IdentityServer4 + VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001","Nghị định 13","Luật Lao động"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 1 (Critical)","downtime_impact":"Ảnh hưởng toàn bộ nghiệp vụ nhân sự: lương, nghỉ phép, cơ cấu tổ chức."}'
),

-- ── e-Hiring ───────────────────────────────────────────────
(
    'E-HIRING',
    'e-Hiring',
    'web_app',
    'Hệ thống tuyển dụng nhân sự nội bộ.',
    'HR',
    NULL, NULL,
    'HR IT Team',
    'Human Resources Division',
    'active',
    ARRAY['hr','recruiting','hiring','talent-acquisition'],
    '{"arch_type":"Monolith","tech_stack":[],"framework":"","dependency_systems":["e-HR","Active Directory"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 2 (High)","downtime_impact":"Ảnh hưởng quy trình tuyển dụng nhân sự."}'
),

-- ── e-Learning ─────────────────────────────────────────────
(
    'E-LEARNING',
    'e-Learning',
    'web_app',
    'Hệ thống cung cấp bài giảng và đào tạo trực tuyến cho nhân viên VIB (Cornerstone OnDemand SaaS).',
    'HR',
    NULL, NULL,
    'L&D Team',
    'Human Resources Division',
    'active',
    ARRAY['e-learning','lms','training','cornerstone','saas'],
    '{"arch_type":"SaaS","tech_stack":["Cornerstone OnDemand"],"framework":"","dependency_systems":["Active Directory","e-HR"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"","versioning_type":"","deploy_method":"SaaS (vendor managed)"}',
    '{"auth_method":"SSO (SAML/OAuth2)","authorization":"Role-based (Cornerstone)","secrets_management":"Vendor","compliance":["ISO 27001"]}',
    '{"logging_tool":"Cornerstone Analytics","monitoring_tool":"Vendor","alerting":"Vendor","sla_target":"99.9%","slo":""}',
    '{"cpu_config":"N/A (SaaS)","ram_config":"N/A","autoscaling_rules":"Vendor managed","throughput":""}',
    '{"sla_business":"SaaS vendor SLA 99.9%","critical_level":"Tier 3 (Medium)","downtime_impact":"Ảnh hưởng kế hoạch đào tạo nhân viên."}'
),

-- ── e-Invoice ──────────────────────────────────────────────
(
    'E-INVOICE',
    'e-Invoice',
    'web_app',
    'Hệ thống quản lý hóa đơn điện tử.',
    'Finance',
    NULL, NULL,
    'Finance IT Team',
    'Finance Division',
    'active',
    ARRAY['e-invoice','invoice','finance','accounting'],
    '{"arch_type":"Monolith","tech_stack":[],"framework":"","dependency_systems":["Oracle Finance","Digital Signature"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001","Thông tư 78/2021 TT-BTC"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 2 (High)","downtime_impact":"Ảnh hưởng phát hành và quản lý hóa đơn điện tử."}'
),

-- ── Oracle Finance ─────────────────────────────────────────
(
    'ORACLE-FINANCE',
    'Oracle Finance',
    'web_app',
    'Hệ thống quản lý tài chính kế toán Oracle ERP.',
    'Finance',
    NULL, NULL,
    'Finance IT Team',
    'Finance Division',
    'active',
    ARRAY['oracle','erp','finance','accounting','general-ledger'],
    '{"arch_type":"Monolith (ERP)","tech_stack":["Oracle E-Business Suite / Oracle Fusion"],"framework":"Oracle","dependency_systems":["Core Banking T24","EMS2","e-Invoice"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"","versioning_type":"","deploy_method":"On-premise"}',
    '{"auth_method":"Oracle IAM + VIB SSO","authorization":"Oracle RBAC","secrets_management":"Oracle Vault","compliance":["ISO 27001","VAS","IFRS"]}',
    '{"logging_tool":"Oracle EM","monitoring_tool":"Oracle Enterprise Manager","alerting":"Email","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 1 (Critical)","downtime_impact":"Ảnh hưởng toàn bộ nghiệp vụ kế toán tài chính."}'
),

-- ── EMS 2.0 ────────────────────────────────────────────────
(
    'EMS2',
    'Expenses Management System 2.0',
    'web_app',
    'Hệ thống quản lý quy trình chi tiêu mua sắm tập trung toàn ngân hàng (EMS 2.0).',
    'Finance',
    NULL, NULL,
    'Finance IT Team',
    'Finance Division',
    'active',
    ARRAY['ems','expenses','procurement','purchase','finance','internal-tool'],
    '{"arch_type":"Monolith","tech_stack":[],"framework":"","dependency_systems":["Oracle Finance","e-HR","Digital Signature","ESD Portal"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC + Approval workflow","secrets_management":"","compliance":["ISO 27001"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 2 (High)","downtime_impact":"Ảnh hưởng quy trình phê duyệt chi tiêu mua sắm toàn hàng."}'
),

-- ── Internal Audit 1.0 ─────────────────────────────────────
(
    'INTERNAL-AUDIT-1',
    'Internal Audit 1.0',
    'web_app',
    'Hệ thống kiểm toán nội bộ phiên bản 1.0 (Decisions platform).',
    'Risk & Compliance',
    NULL, NULL,
    'Internal Audit Team',
    'Audit & Compliance Division',
    'active',
    ARRAY['internal-audit','compliance','risk','decisions'],
    '{"arch_type":"SaaS/On-premise","tech_stack":["Decisions Platform"],"framework":"Decisions","dependency_systems":[]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"","versioning_type":"","deploy_method":"On-premise"}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001","NHNN"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 2 (High)","downtime_impact":"Ảnh hưởng quy trình kiểm toán nội bộ."}'
),

-- ── Internal Audit 2.0 ─────────────────────────────────────
(
    'INTERNAL-AUDIT-2',
    'Internal Audit 2.0',
    'web_app',
    'Hệ thống kiểm toán nội bộ phiên bản 2.0 (nâng cấp, thay thế dần IA 1.0).',
    'Risk & Compliance',
    NULL, NULL,
    'Internal Audit Team',
    'Audit & Compliance Division',
    'active',
    ARRAY['internal-audit','compliance','risk','ia2'],
    '{"arch_type":"Monolith","tech_stack":[],"framework":"","dependency_systems":[]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001","NHNN"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 2 (High)","downtime_impact":"Ảnh hưởng quy trình kiểm toán nội bộ."}'
),

-- ── Smart Shareholder ──────────────────────────────────────
(
    'SMART-SHAREHOLDER',
    'Smart Shareholder',
    'web_app',
    'Hệ thống quản lý cổ đông.',
    'Finance',
    NULL, NULL,
    'Finance IT Team',
    'Finance Division',
    'active',
    ARRAY['shareholder','governance','stock','finance'],
    '{"arch_type":"Monolith","tech_stack":[],"framework":"","dependency_systems":[]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001","Luật Doanh nghiệp","UBCKNN"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 2 (High)","downtime_impact":"Ảnh hưởng quản lý thông tin cổ đông."}'
),

-- ── Shareholder Management 2.0 ─────────────────────────────
(
    'SHAREHOLDER-MGT2',
    'Shareholder Management 2.0',
    'web_app',
    'Hệ thống quản lý cổ đông phiên bản 2.0.',
    'Finance',
    NULL, NULL,
    'Finance IT Team',
    'Finance Division',
    'active',
    ARRAY['shareholder','governance','stock','finance','v2'],
    '{"arch_type":"Monolith","tech_stack":[],"framework":"","dependency_systems":[]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001","Luật Doanh nghiệp","UBCKNN"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 2 (High)","downtime_impact":"Ảnh hưởng quản lý thông tin cổ đông."}'
),

-- ── OSS RB 1.0 ─────────────────────────────────────────────
(
    'OSS-RB-1',
    'RB Operational Support System 1.0',
    'web_app',
    'Hệ thống hỗ trợ nghiệp vụ Back Office khối Retail Banking (bao gồm Account Management). Tích hợp nhiều module: gửi tiền qua đêm, quản lý hồ sơ vay, AM, Marketing, hợp đồng tự động, lưu trữ văn bản, báo cáo NHNN.',
    'RB Operations',
    NULL, NULL,
    'RB Ops IT Team',
    'Retail Banking Division',
    'active',
    ARRAY['rb','operations','back-office','account-management','ops','oss'],
    '{"arch_type":"Monolith","tech_stack":[],"framework":"","dependency_systems":["Core Banking T24","Digital Signature","e-Contract"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001","Circular 09","NHNN"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 1 (Critical)","downtime_impact":"Ảnh hưởng toàn bộ tác nghiệp Back Office khối RB."}'
),

-- ── OSS RB 2.0 ─────────────────────────────────────────────
(
    'OSS-RB-2',
    'RB Operational Support System 2.0',
    'web_app',
    'Hệ thống hỗ trợ nghiệp vụ Back Office khối Retail Banking phiên bản 2.0, nâng cấp và mở rộng từ OSS RB 1.0.',
    'RB Operations',
    NULL, NULL,
    'RB Ops IT Team',
    'Retail Banking Division',
    'active',
    ARRAY['rb','operations','back-office','oss','v2'],
    '{"arch_type":"Monolith","tech_stack":[],"framework":"","dependency_systems":["Core Banking T24","Digital Signature","e-Contract","OSS-RB-1"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001","Circular 09","NHNN"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 1 (Critical)","downtime_impact":"Ảnh hưởng toàn bộ tác nghiệp Back Office khối RB."}'
),

-- ── AI Knowledge Assistant ─────────────────────────────────
(
    'AI-KA',
    'AI Knowledge Assistant',
    'web_app',
    'Trợ lý AI hỗ trợ tra cứu chính sách nội bộ: chính sách RBO, HR, SME và ACL Lending.',
    'IT Platform',
    NULL, NULL,
    'AI/Data Team',
    'IT Division',
    'active',
    ARRAY['ai','knowledge-base','llm','chatbot','policy','rbo','hr','sme','acl'],
    '{"arch_type":"Microservices","tech_stack":["LLM","RAG","Vector DB"],"framework":"","dependency_systems":["Knowledge Base","e-HR","Core Banking"]}',
    '{"git_repo":"","branch_strategy":"","cicd_tool":"Azure DevOps","versioning_type":"","deploy_method":""}',
    '{"auth_method":"VIB SSO","authorization":"RBAC","secrets_management":"","compliance":["ISO 27001"]}',
    '{"logging_tool":"","monitoring_tool":"","alerting":"","sla_target":"","slo":""}',
    '{"cpu_config":"GPU required","ram_config":"","autoscaling_rules":"","throughput":""}',
    '{"sla_business":"","critical_level":"Tier 3 (Medium)","downtime_impact":"Ảnh hưởng tra cứu chính sách nội bộ."}'
)

ON CONFLICT (product_code) DO NOTHING;


-- ── 2. Environments (PROD URL private) ───────────────────────

INSERT INTO catalog_product_environments (product_id, env_name, url, infra_type, region, status, notes)
-- ESD Portal — module URLs exposed as single PROD entry (main URL = fam.vib as asset management)
SELECT id, 'PROD', 'https://fam.vib',               'VM', 'HCM-DC1', 'active', 'ESD Portal — main access via fam.vib (Asset Mgmt)'   FROM catalog_products WHERE product_code = 'ESD-PORTAL'
UNION ALL
-- Digital Signature
SELECT id, 'PROD', 'https://esignservice.vib/',      'VM', 'HCM-DC1', 'active', 'E-Sign HSM'                                           FROM catalog_products WHERE product_code = 'DIGITAL-SIGN'
UNION ALL
-- e-Contract
SELECT id, 'PROD', 'https://econtract.vib/',         'VM', 'HCM-DC1', 'active', 'e-Contract for ESD'                                   FROM catalog_products WHERE product_code = 'E-CONTRACT'
UNION ALL
-- e-HR (main portal)
SELECT id, 'PROD', 'http://ehr.vib',                 'VM', 'HCM-DC1', 'active', 'e-HR portal chính — đăng ký nghỉ phép'               FROM catalog_products WHERE product_code = 'E-HR'
UNION ALL
-- e-Hiring
SELECT id, 'PROD', 'https://ehiring.ehr.vib/',        'VM', 'HCM-DC1', 'active', NULL                                                  FROM catalog_products WHERE product_code = 'E-HIRING'
UNION ALL
-- e-Learning (SaaS — external)
SELECT id, 'PROD', 'https://viblearning.csod.com/',  'SaaS', 'Cloud (vendor)', 'active', 'Cornerstone OnDemand SaaS'                   FROM catalog_products WHERE product_code = 'E-LEARNING'
UNION ALL
-- e-Invoice
SELECT id, 'PROD', 'https://einvoice.vib/',          'VM', 'HCM-DC1', 'active', NULL                                                   FROM catalog_products WHERE product_code = 'E-INVOICE'
UNION ALL
-- Oracle Finance
SELECT id, 'PROD', 'https://finance.vib:6868',       'VM', 'HCM-DC1', 'active', 'Oracle ERP — port 6868'                              FROM catalog_products WHERE product_code = 'ORACLE-FINANCE'
UNION ALL
-- EMS 2.0
SELECT id, 'PROD', 'https://ems2.vib',               'VM', 'HCM-DC1', 'active', NULL                                                   FROM catalog_products WHERE product_code = 'EMS2'
UNION ALL
-- Internal Audit 1.0
SELECT id, 'PROD', 'https://vib.decisions.com/',     'Cloud', 'Vendor', 'active', 'Decisions platform — vendor hosted'                FROM catalog_products WHERE product_code = 'INTERNAL-AUDIT-1'
UNION ALL
-- Internal Audit 2.0
SELECT id, 'PROD', 'https://ia.vib/',                'VM', 'HCM-DC1', 'active', NULL                                                   FROM catalog_products WHERE product_code = 'INTERNAL-AUDIT-2'
UNION ALL
-- Smart Shareholder — no public URL
SELECT id, 'PROD', NULL,                             'VM', 'HCM-DC1', 'active', 'URL nội bộ — chưa xác nhận'                         FROM catalog_products WHERE product_code = 'SMART-SHAREHOLDER'
UNION ALL
-- Shareholder Management 2.0 — no URL
SELECT id, 'PROD', NULL,                             'VM', 'HCM-DC1', 'active', 'URL nội bộ — chưa xác nhận'                         FROM catalog_products WHERE product_code = 'SHAREHOLDER-MGT2'
UNION ALL
-- OSS RB 1.0
SELECT id, 'PROD', 'https://ops.vib',                'VM', 'HCM-DC1', 'active', 'OSS RB 1.0 — portal chính'                          FROM catalog_products WHERE product_code = 'OSS-RB-1'
UNION ALL
-- OSS RB 2.0
SELECT id, 'PROD', 'https://ops.vib',                'VM', 'HCM-DC1', 'active', 'OSS RB 2.0 — cùng domain ops.vib, routing riêng'    FROM catalog_products WHERE product_code = 'OSS-RB-2'
UNION ALL
-- AI Knowledge Assistant — no public URL yet
SELECT id, 'PROD', NULL,                             'K8s', 'HCM-DC1', 'active', 'URL chưa xác nhận'                                 FROM catalog_products WHERE product_code = 'AI-KA'

ON CONFLICT (product_id, env_name) DO NOTHING;


-- ── 3. Type-specific details (web_app + modules list) ────────

-- ESD Portal
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "fam.vib / taskflow.esd.vib / ops.vib",
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": [
    {"code": "M1", "name": "Asset Management",  "description": "Hệ thống quản lý tài sản",                  "url": "https://fam.vib"},
    {"code": "M2", "name": "ESD Taskflow",       "description": "Hệ thống quản lý công việc",               "url": "https://taskflow.esd.vib/"},
    {"code": "M4", "name": "Branch Tools",       "description": "Hệ thống đăng ký Công cụ dụng cụ",        "url": "https://ops.vib/ccdc"},
    {"code": "M5", "name": "Traveldesk",         "description": "Hệ thống đăng ký đi công tác",            "url": "https://ops.vib/travelDesk"},
    {"code": "M6", "name": "Stationery",         "description": "Hệ thống đăng ký Văn phòng phẩm",         "url": "https://ops.vib/vpp"}
  ]
}'::jsonb FROM catalog_products WHERE product_code = 'ESD-PORTAL'
ON CONFLICT (product_id) DO NOTHING;

-- Digital Signature
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "esignservice.vib / esignportal.vib / verify.esign.vib",
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO + Certificate session",
  "modules": [
    {"code": "M1", "name": "E-Sign (HSM)",                    "description": "Hệ thống ký số sử dụng HSM",           "url": "https://esignservice.vib/"},
    {"code": "M2", "name": "E-Sign (USB Token)",              "description": "Tool ký số sử dụng USB Token",         "url": null},
    {"code": "M3", "name": "E-Sign (Remote Signing)",         "description": "Hệ thống ký số từ xa",                 "url": "https://remotehub.esignportal.vib/"},
    {"code": "M4", "name": "E-Sign Verify",                   "description": "Verify chữ ký số",                     "url": "https://verify.esign.vib"},
    {"code": "M5", "name": "Digital Certificate Management",  "description": "Hệ thống đăng ký mua chứng thư số",   "url": "https://esignportal.vib/"}
  ]
}'::jsonb FROM catalog_products WHERE product_code = 'DIGITAL-SIGN'
ON CONFLICT (product_id) DO NOTHING;

-- e-Contract
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "econtract.vib",
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": [
    {"code": "M1", "name": "e-Contract for ESD", "description": "Hợp đồng điện tử cho khối ESD", "url": "https://econtract.vib/"},
    {"code": "M2", "name": "e-Contract for HR",  "description": "Hợp đồng điện tử cho khối HR",  "url": null}
  ]
}'::jsonb FROM catalog_products WHERE product_code = 'E-CONTRACT'
ON CONFLICT (product_id) DO NOTHING;

-- e-HR
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "ehr.vib",
  "cdn": null,
  "browser_support": ["Chrome", "Edge", "IE11 (legacy WinForms)"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "IdentityServer4 + VIB SSO",
  "modules": [
    {"code": "M1",  "name": "ehr.vib",                    "description": "Website đăng ký nghỉ phép",                                                          "url": "http://ehr.vib"},
    {"code": "M2",  "name": "employeeinfo.ehr.vib",       "description": "Tra cứu lương của nhân sự",                                                          "url": "https://employeeinfo.ehr.vib/"},
    {"code": "M3",  "name": "histaff.ehr.vib",            "description": "Phần mềm core HR - dùng winform",                                                    "url": "https://histaff.ehr.vib"},
    {"code": "M4",  "name": "histaff-rest.ehr.vib",       "description": "REST API HiStaff - public thông tin nhân sự, tạo employee từ OfferManagement",       "url": "https://histaff-rest.ehr.vib"},
    {"code": "M5",  "name": "oms.ehr.vib",                "description": "Website quản lý cơ cấu tổ chức",                                                     "url": "https://oms.ehr.vib"},
    {"code": "M6",  "name": "oms-rest.ehr.vib",           "description": "REST API OMS - public thông tin cơ cấu tổ chức",                                     "url": "https://oms-rest.ehr.vib"},
    {"code": "M7",  "name": "pms.ehr.vib",                "description": "Website đánh giá KPI cuối năm",                                                      "url": "https://pms.ehr.vib"},
    {"code": "M8",  "name": "keypersonel-info.vib",       "description": "Website nhập thông tin cho nhân sự chủ chốt",                                        "url": "https://hrportal.ehr.vib/keypersonel"},
    {"code": "M9",  "name": "hronboard.ehr.vib",          "description": "Website quản lý Onboard của nhân viên mới",                                          "url": "https://hrportal.ehr.vib/hronboard"},
    {"code": "M10", "name": "pit.ehr.vib",                "description": "Website quản lý hồ sơ thuế thu nhập cá nhân",                                        "url": "https://hrportal.ehr.vib/pit"},
    {"code": "M11", "name": "offer-managerment.ehr.vib",  "description": "Website quản lý Offer gửi cho ứng viên",                                             "url": "https://offer-managerment.ehr.vib"},
    {"code": "M12", "name": "e-profile.ehr.vib",          "description": "Website quản lý lưu trữ hồ sơ nhân sự",                                              "url": "https://e-profile.ehr.vib"},
    {"code": "M13", "name": "identityserver4.ehr.vib",    "description": "Website xác thực dùng IdentityServer4",                                              "url": "https://identityserver4.ehr.vib"},
    {"code": "M14", "name": "directory.ehr.vib",          "description": "Danh bạ nhân sự VIB — hiển thị ảnh VIBer, không cần xác thực",                       "url": "https://directory.ehr.vib"},
    {"code": "M15", "name": "process.ehr.vib",            "description": "Website cũ quy trình nhân sự: điều chỉnh, nghỉ việc (chỉ để tra cứu)",               "url": "https://process.ehr.vib"},
    {"code": "M16", "name": "process-rest.ehr.vib",       "description": "REST API phục vụ quy trình nhân sự trên intranet",                                   "url": "https://process-rest.ehr.vib"},
    {"code": "M17", "name": "apiaspose.ehr.vib",          "description": "REST API sử dụng thư viện ASPOSE để convert Word/Excel/PDF",                         "url": "https://apiaspose.ehr.vib"},
    {"code": "M18", "name": "apisignature.ehr.vib",       "description": "REST API ký số",                                                                     "url": "https://apisignature.ehr.vib"},
    {"code": "M19", "name": "bts-searchusers.ehr.vib",    "description": "Website hỗ trợ BTS tra cứu user trong quá trình tạo tài khoản AD",                  "url": "https://bts-searchusers.ehr.vib"},
    {"code": "M20", "name": "userlimit.ehr.vib",          "description": "REST API phục vụ EMS2 thông tin hạn mức phê duyệt của manager",                      "url": "https://userlimit.ehr.vib"},
    {"code": "M21", "name": "repoting-portal.ehr.vib",    "description": "Website phục vụ báo cáo cho HR",                                                     "url": "https://repoting-portal.ehr.vib"},
    {"code": "M22", "name": "employee-confirmation.ehr.vib", "description": "Website xác thực 1 user có phải đã từng là VIBer",                                "url": "https://employee-confirmation.ehr.vib"},
    {"code": "M23", "name": "conflict-interest.vib",      "description": "Website khai báo xung đột lợi ích",                                                  "url": "https://conflict-interest.vib"}
  ]
}'::jsonb FROM catalog_products WHERE product_code = 'E-HR'
ON CONFLICT (product_id) DO NOTHING;

-- e-Hiring
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "ehiring.ehr.vib",
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": []
}'::jsonb FROM catalog_products WHERE product_code = 'E-HIRING'
ON CONFLICT (product_id) DO NOTHING;

-- e-Learning
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "viblearning.csod.com",
  "cdn": "Vendor CDN",
  "browser_support": ["Chrome", "Edge", "Firefox", "Safari"],
  "seo_config": "SaaS — vendor managed",
  "static_assets_storage": "Cornerstone cloud storage",
  "session_management": "SAML SSO + Cornerstone session",
  "modules": []
}'::jsonb FROM catalog_products WHERE product_code = 'E-LEARNING'
ON CONFLICT (product_id) DO NOTHING;

-- e-Invoice
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "einvoice.vib",
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": []
}'::jsonb FROM catalog_products WHERE product_code = 'E-INVOICE'
ON CONFLICT (product_id) DO NOTHING;

-- Oracle Finance
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "finance.vib",
  "cdn": null,
  "browser_support": ["Chrome", "IE11 (Oracle Forms)"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "Oracle IAM session",
  "modules": []
}'::jsonb FROM catalog_products WHERE product_code = 'ORACLE-FINANCE'
ON CONFLICT (product_id) DO NOTHING;

-- EMS 2.0
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "ems2.vib",
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": []
}'::jsonb FROM catalog_products WHERE product_code = 'EMS2'
ON CONFLICT (product_id) DO NOTHING;

-- Internal Audit 1.0
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "vib.decisions.com",
  "cdn": "Vendor CDN",
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": "Vendor cloud",
  "session_management": "VIB SSO + Decisions session",
  "modules": []
}'::jsonb FROM catalog_products WHERE product_code = 'INTERNAL-AUDIT-1'
ON CONFLICT (product_id) DO NOTHING;

-- Internal Audit 2.0
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "ia.vib",
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": []
}'::jsonb FROM catalog_products WHERE product_code = 'INTERNAL-AUDIT-2'
ON CONFLICT (product_id) DO NOTHING;

-- Smart Shareholder
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": null,
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": []
}'::jsonb FROM catalog_products WHERE product_code = 'SMART-SHAREHOLDER'
ON CONFLICT (product_id) DO NOTHING;

-- Shareholder Management 2.0
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": null,
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": []
}'::jsonb FROM catalog_products WHERE product_code = 'SHAREHOLDER-MGT2'
ON CONFLICT (product_id) DO NOTHING;

-- OSS RB 1.0
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "ops.vib",
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": [
    {"code": "M1", "name": "Manage Overnight Deposits", "description": "Digital quy trình đăng ký gửi tiền qua đêm", "url": "https://ops.vib/manageOvernightDeposits"},
    {"code": "M2", "name": "Document Storing",          "description": "Quản lý hồ sơ vay",                         "url": "https://ops.vib/qlhs"},
    {"code": "M3", "name": "AM - Account Management",   "description": "Quản lý tài khoản",                         "url": "https://ops.vib/am"},
    {"code": "M4", "name": "Marketing",                  "description": "Module Marketing",                          "url": "https://ops.vib/marketing"},
    {"code": "M5", "name": "Auto Contract",              "description": "Tự động tạo hợp đồng",                      "url": "https://ops.vib/autoContract"},
    {"code": "M6", "name": "Archive Document",           "description": "Lưu trữ văn bản",                          "url": "https://ops.vib/archive-vanban"},
    {"code": "M7", "name": "SBV Reporting",              "description": "Quản lý việc trả lời công văn tới cơ quan nhà nước (NHNN)", "url": "https://ops.vib/sbv-reporting"}
  ]
}'::jsonb FROM catalog_products WHERE product_code = 'OSS-RB-1'
ON CONFLICT (product_id) DO NOTHING;

-- OSS RB 2.0
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "ops.vib",
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": [
    {"code": "M1", "name": "CA Document",     "description": "Quản lý tài liệu CA", "url": null},
    {"code": "M2", "name": "Handover System", "description": "Hệ thống bàn giao",   "url": null}
  ]
}'::jsonb FROM catalog_products WHERE product_code = 'OSS-RB-2'
ON CONFLICT (product_id) DO NOTHING;

-- AI Knowledge Assistant
INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": null,
  "cdn": null,
  "browser_support": ["Chrome", "Edge"],
  "seo_config": "Internal tool — no SEO",
  "static_assets_storage": null,
  "session_management": "VIB SSO session",
  "modules": [
    {"code": "M1", "name": "RBO Policy",   "description": "Tra cứu chính sách RBO",        "url": null},
    {"code": "M2", "name": "HR Policy",    "description": "Tra cứu chính sách HR",         "url": null},
    {"code": "M3", "name": "SME Policy",   "description": "Tra cứu chính sách SME",        "url": null},
    {"code": "M4", "name": "ACL Lending",  "description": "Tra cứu chính sách ACL Lending","url": null}
  ]
}'::jsonb FROM catalog_products WHERE product_code = 'AI-KA'
ON CONFLICT (product_id) DO NOTHING;
