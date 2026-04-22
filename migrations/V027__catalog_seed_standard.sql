-- ============================================================
-- V027 — Catalog Seed: Danh mục sản phẩm tiêu chuẩn
-- 10 sản phẩm mẫu đại diện cho 5 loại (2 mỗi loại)
-- Mục đích: dữ liệu mẫu để demo + template tham chiếu
-- ============================================================

-- ── 1. catalog_products ──────────────────────────────────────

INSERT INTO catalog_products (
    product_code, product_name, product_type,
    description, domain, business_owner, technical_owner, owner_team, department,
    status, tags,
    architecture_info, deployment_info, security_info,
    monitoring_info, resource_info, business_metadata
) VALUES

-- ── WEB APP 1: Internet Banking Portal ─────────────────────
(
    'IB-WEB',
    'Internet Banking Portal',
    'web_app',
    'Cổng giao dịch ngân hàng trực tuyến dành cho khách hàng cá nhân và doanh nghiệp. Hỗ trợ chuyển tiền, thanh toán hóa đơn, quản lý tài khoản, sản phẩm đầu tư.',
    'Digital Banking',
    'Nguyễn Văn An',
    'Trần Thị Bình',
    'Digital Channel Team',
    'Digital Banking Division',
    'active',
    ARRAY['internet-banking','digital','core-channel','critical'],
    '{"arch_type":"Microservices","tech_stack":["React 18","TypeScript","Java 17","Spring Boot 3","PostgreSQL","Redis"],"framework":"Spring Boot / React","dependency_systems":["Core Banking T24","Payment Gateway","eKYC Service","Notification Service"]}',
    '{"git_repo":"https://dev.azure.com/vib/digital/internet-banking","branch_strategy":"GitFlow","cicd_tool":"Azure DevOps","versioning_type":"Semantic","deploy_method":"Blue-green"}',
    '{"auth_method":"OAuth2 + OTP","authorization":"RBAC","secrets_management":"HashiCorp Vault","compliance":["PCI DSS","ISO 27001","Circular 09"]}',
    '{"logging_tool":"ELK Stack","monitoring_tool":"Prometheus + Grafana","alerting":"PagerDuty + Slack","sla_target":"99.95%","slo":"p95 < 2s"}',
    '{"cpu_config":"8 vCPU","ram_config":"16 GB","autoscaling_rules":"Min 3 / Max 10 / CPU > 70%","throughput":"500 req/s"}',
    '{"sla_business":"99.95% uptime 24/7","critical_level":"Tier 1 (Critical)","downtime_impact":"Ngừng hoạt động ảnh hưởng toàn bộ giao dịch online của khách hàng. Thiệt hại uy tín và doanh thu trực tiếp."}'
),

-- ── WEB APP 2: CMS / Backoffice Portal ─────────────────────
(
    'CMS-WEB',
    'CMS & Backoffice Portal',
    'web_app',
    'Hệ thống quản lý nội dung và tác nghiệp nội bộ. Cho phép cán bộ ngân hàng quản lý sản phẩm, chiến dịch marketing, quy trình phê duyệt và báo cáo vận hành.',
    'Infrastructure',
    'Lê Hoàng Minh',
    'Phạm Đức Tài',
    'Platform Engineering',
    'IT Division',
    'active',
    ARRAY['backoffice','internal-tool','cms','admin'],
    '{"arch_type":"Monolith","tech_stack":["Next.js 15","TypeScript","Python 3.11","FastAPI","PostgreSQL"],"framework":"FastAPI / Next.js","dependency_systems":["Active Directory / LDAP","Notification Service","File Storage"]}',
    '{"git_repo":"https://dev.azure.com/vib/platform/cms-backoffice","branch_strategy":"Trunk-based","cicd_tool":"Azure DevOps","versioning_type":"Build number","deploy_method":"Rolling"}',
    '{"auth_method":"JWT + SSO (SAML)","authorization":"RBAC","secrets_management":"Azure Key Vault","compliance":["ISO 27001"]}',
    '{"logging_tool":"Loki + Grafana","monitoring_tool":"Prometheus","alerting":"Slack","sla_target":"99.5%","slo":"p95 < 3s"}',
    '{"cpu_config":"4 vCPU","ram_config":"8 GB","autoscaling_rules":"Min 2 / Max 6 / CPU > 75%","throughput":"100 req/s"}',
    '{"sla_business":"99.5% uptime 7-22h","critical_level":"Tier 2 (High)","downtime_impact":"Ảnh hưởng tác nghiệp nội bộ, không ảnh hưởng khách hàng trực tiếp."}'
),

-- ── MOBILE APP 1: VIB Online Plus ──────────────────────────
(
    'VIB-APP',
    'VIB Online Plus',
    'mobile',
    'Ứng dụng ngân hàng di động toàn năng: giao dịch tài chính, quản lý thẻ, mở tài khoản online, vay tiêu dùng, đầu tư. Kênh phân phối số chính của ngân hàng.',
    'Digital Banking',
    'Nguyễn Văn An',
    'Vũ Thành Long',
    'Mobile Channel Team',
    'Digital Banking Division',
    'active',
    ARRAY['mobile','ios','android','digital','flagship'],
    '{"arch_type":"Microservices","tech_stack":["React Native","TypeScript","Java 17 (BFF)","PostgreSQL","Redis"],"framework":"React Native + BFF","dependency_systems":["Core Banking T24","Payment Gateway","eKYC Service","Biometric Service","Push Notification"]}',
    '{"git_repo":"https://dev.azure.com/vib/digital/vib-mobile","branch_strategy":"GitFlow","cicd_tool":"Azure DevOps + Fastlane","versioning_type":"Semantic","deploy_method":"App Store / Play Store staged rollout"}',
    '{"auth_method":"Biometric + PIN + OTP","authorization":"RBAC","secrets_management":"HashiCorp Vault","compliance":["PCI DSS","ISO 27001","Circular 09","NAPAS"]}',
    '{"logging_tool":"Firebase Crashlytics + ELK","monitoring_tool":"Datadog Mobile","alerting":"PagerDuty","sla_target":"99.9%","slo":"App launch < 3s"}',
    '{"cpu_config":"N/A (client-side)","ram_config":"N/A","autoscaling_rules":"BFF: Min 4 / Max 20","throughput":"800 req/s (BFF)"}',
    '{"sla_business":"99.9% uptime 24/7","critical_level":"Tier 1 (Critical)","downtime_impact":"Gián đoạn kênh bán hàng số chính. Ảnh hưởng trực tiếp đến doanh thu và trải nghiệm hàng triệu khách hàng."}'
),

-- ── MOBILE APP 2: VIB Business (SME) ───────────────────────
(
    'VIB-BIZ',
    'VIB Business Banking',
    'mobile',
    'Ứng dụng ngân hàng di động dành riêng cho khách hàng doanh nghiệp vừa và nhỏ (SME). Hỗ trợ quản lý dòng tiền, thanh toán đối tác, bảng lương, vay vốn lưu động.',
    'Digital Banking',
    'Đỗ Quang Vinh',
    'Vũ Thành Long',
    'Mobile Channel Team',
    'Business Banking Division',
    'active',
    ARRAY['mobile','sme','business-banking','ios','android'],
    '{"arch_type":"Microservices","tech_stack":["Flutter","Dart","Go (BFF)","PostgreSQL"],"framework":"Flutter + Go BFF","dependency_systems":["Core Banking T24","Payment Gateway","ERP Integration","Tax API"]}',
    '{"git_repo":"https://dev.azure.com/vib/digital/vib-business","branch_strategy":"GitFlow","cicd_tool":"Azure DevOps + Fastlane","versioning_type":"Semantic","deploy_method":"Staged rollout"}',
    '{"auth_method":"Certificate + OTP","authorization":"RBAC + Approval workflow","secrets_management":"HashiCorp Vault","compliance":["PCI DSS","ISO 27001","NAPAS","Circular 09"]}',
    '{"logging_tool":"ELK Stack","monitoring_tool":"Datadog","alerting":"PagerDuty + Email","sla_target":"99.9%","slo":"p95 < 2s"}',
    '{"cpu_config":"N/A (client-side)","ram_config":"N/A","autoscaling_rules":"BFF: Min 3 / Max 15","throughput":"300 req/s (BFF)"}',
    '{"sla_business":"99.9% uptime 24/7","critical_level":"Tier 1 (Critical)","downtime_impact":"Ảnh hưởng nghiêm trọng đến hoạt động kinh doanh của khách hàng SME."}'
),

-- ── API 1: Core Banking API Gateway ────────────────────────
(
    'COREBANK-API',
    'Core Banking API Gateway',
    'api',
    'API Gateway trung tâm cung cấp dịch vụ nghiệp vụ từ hệ thống Core Banking T24. Được sử dụng bởi tất cả các kênh phân phối số (Internet Banking, Mobile App, ATM, POS).',
    'Core Banking',
    'Hoàng Thị Mai',
    'Ngô Minh Khoa',
    'Core Banking Team',
    'IT Division',
    'active',
    ARRAY['api','core-banking','t24','gateway','critical'],
    '{"arch_type":"Microservices","tech_stack":["Java 17","Spring Cloud Gateway","Oracle DB","Redis","Kafka"],"framework":"Spring Cloud","dependency_systems":["T24 Core Banking","Oracle DB","NAPAS","SWIFT"]}',
    '{"git_repo":"https://dev.azure.com/vib/core/corebank-api","branch_strategy":"GitFlow","cicd_tool":"Jenkins","versioning_type":"Semantic","deploy_method":"Canary"}',
    '{"auth_method":"OAuth2 (client_credentials)","authorization":"Scope-based","secrets_management":"CyberArk","compliance":["PCI DSS","ISO 27001","SWIFT CSP","Circular 09"]}',
    '{"logging_tool":"Splunk","monitoring_tool":"AppDynamics","alerting":"PagerDuty","sla_target":"99.99%","slo":"p99 < 500ms"}',
    '{"cpu_config":"16 vCPU","ram_config":"32 GB","autoscaling_rules":"Min 5 / Max 20 / Latency > 200ms","throughput":"2000 req/s"}',
    '{"sla_business":"99.99% uptime 24/7","critical_level":"Tier 1 (Critical)","downtime_impact":"Toàn bộ hệ thống ngân hàng ngừng hoạt động. Ảnh hưởng mọi giao dịch tài chính."}'
),

-- ── API 2: eKYC Service API ─────────────────────────────────
(
    'EKYC-API',
    'eKYC Verification Service',
    'api',
    'API xác minh danh tính khách hàng điện tử: nhận diện khuôn mặt (Face ID), OCR CCCD/Hộ chiếu, liveneness detection, đối chiếu CSDL dân cư quốc gia (C06).',
    'eKYC',
    'Trần Quốc Huy',
    'Bùi Thị Lan',
    'eKYC Team',
    'Digital Banking Division',
    'active',
    ARRAY['ekyc','ai','face-recognition','ocr','onboarding'],
    '{"arch_type":"Microservices","tech_stack":["Python 3.11","FastAPI","TensorFlow","PostgreSQL","Redis","MinIO"],"framework":"FastAPI","dependency_systems":["C06 National ID DB","VinAI Face SDK","AWS Textract","Notification Service"]}',
    '{"git_repo":"https://dev.azure.com/vib/digital/ekyc-service","branch_strategy":"GitFlow","cicd_tool":"Azure DevOps","versioning_type":"Semantic","deploy_method":"Blue-green"}',
    '{"auth_method":"API Key + mTLS","authorization":"IP Whitelist + Scope","secrets_management":"HashiCorp Vault","compliance":["PCI DSS","ISO 27001","Nghị định 13","Circular 09"]}',
    '{"logging_tool":"ELK Stack","monitoring_tool":"Prometheus + Grafana","alerting":"Slack + PagerDuty","sla_target":"99.9%","slo":"Verification < 5s"}',
    '{"cpu_config":"8 vCPU + 2 GPU","ram_config":"16 GB","autoscaling_rules":"Min 3 / Max 12 / Queue > 100","throughput":"50 verif/s"}',
    '{"sla_business":"99.9% uptime 24/7","critical_level":"Tier 1 (Critical)","downtime_impact":"Không thể mở tài khoản mới, đăng ký thẻ, vay vốn. Ảnh hưởng toàn bộ luồng onboarding."}'
),

-- ── ETL 1: Daily Transaction Report ────────────────────────
(
    'TXN-ETL',
    'Daily Transaction ETL Pipeline',
    'etl',
    'Pipeline ETL xử lý dữ liệu giao dịch hàng ngày từ Core Banking T24 sang Data Warehouse. Cung cấp dữ liệu cho báo cáo quản trị, phân tích rủi ro và báo cáo SBV.',
    'Data & Analytics',
    'Phạm Thị Hoa',
    'Lương Văn Dũng',
    'Data Engineering Team',
    'Data & Analytics Division',
    'active',
    ARRAY['etl','data-warehouse','t24','daily-batch','reporting'],
    '{"arch_type":"Event-driven","tech_stack":["Apache Spark 3.4","Python 3.11","dbt","Apache Airflow","PostgreSQL","Hadoop HDFS"],"framework":"Apache Airflow + dbt","dependency_systems":["Core Banking T24","Oracle DWH","BI Platform (MicroStrategy)","SBV Reporting Portal"]}',
    '{"git_repo":"https://dev.azure.com/vib/data/txn-etl","branch_strategy":"Trunk-based","cicd_tool":"Azure DevOps","versioning_type":"Build number","deploy_method":"Recreate"}',
    '{"auth_method":"Service Account + Kerberos","authorization":"Data ACL","secrets_management":"HashiCorp Vault","compliance":["PCI DSS","ISO 27001","Circular 99 (SBV)","AML regulations"]}',
    '{"logging_tool":"ELK Stack + Airflow UI","monitoring_tool":"Grafana","alerting":"Email + Slack","sla_target":"Hoàn thành trước 06:00 hàng ngày","slo":"< 4 giờ xử lý"}',
    '{"cpu_config":"Spark: 20 cores/job","ram_config":"40 GB/job","autoscaling_rules":"Dynamic allocation Spark (min 5 exec / max 20 exec)","throughput":"5M transactions/day"}',
    '{"sla_business":"Hoàn thành trước 06:00 mỗi ngày làm việc","critical_level":"Tier 1 (Critical)","downtime_impact":"Báo cáo ban lãnh đạo và báo cáo SBV bị trễ. Ảnh hưởng quyết định quản trị và tuân thủ pháp lý."}'
),

-- ── ETL 2: Customer 360 Sync ────────────────────────────────
(
    'CUS360-ETL',
    'Customer 360 Sync Pipeline',
    'etl',
    'Pipeline đồng bộ và làm giàu dữ liệu khách hàng từ nhiều nguồn (CRM, Core Banking, Mobile App) vào Customer 360 platform. Phục vụ phân tích hành vi, personalization và cross-sell.',
    'Data & Analytics',
    'Phạm Thị Hoa',
    'Nguyễn Thị Thu',
    'Data Engineering Team',
    'Data & Analytics Division',
    'active',
    ARRAY['etl','customer-360','crm','streaming','personalization'],
    '{"arch_type":"Event-driven","tech_stack":["Apache Kafka","Apache Flink","Python 3.11","MongoDB","Redis","dbt"],"framework":"Kafka + Flink","dependency_systems":["CRM Salesforce","Core Banking T24","VIB Mobile App events","Customer 360 MongoDB"]}',
    '{"git_repo":"https://dev.azure.com/vib/data/customer360-etl","branch_strategy":"Trunk-based","cicd_tool":"Azure DevOps","versioning_type":"Build number","deploy_method":"Rolling"}',
    '{"auth_method":"Service Account + mTLS","authorization":"Topic ACL (Kafka)","secrets_management":"HashiCorp Vault","compliance":["ISO 27001","Nghị định 13 (Personal Data Protection)","PDPA"]}',
    '{"logging_tool":"ELK Stack","monitoring_tool":"Grafana + Kafka UI","alerting":"Slack","sla_target":"Lag < 5 phút","slo":"Processing latency < 30s"}',
    '{"cpu_config":"Flink: 16 cores","ram_config":"32 GB","autoscaling_rules":"Auto-scale Flink TaskManager (min 4 / max 16)","throughput":"50K events/min"}',
    '{"sla_business":"Near real-time (<5min lag)","critical_level":"Tier 2 (High)","downtime_impact":"Dữ liệu khách hàng bị lỗi thời. Ảnh hưởng chiến dịch marketing và phân tích hành vi."}'
),

-- ── JOB 1: EOD Batch Processing ────────────────────────────
(
    'EOD-JOB',
    'EOD Batch Processing',
    'job',
    'Job xử lý cuối ngày (End-of-Day) cho toàn hệ thống Core Banking: tất toán lãi, cập nhật số dư, tạo sao kê, kiểm tra hạn mức, reconciliation với NAPAS/SWIFT.',
    'Core Banking',
    'Hoàng Thị Mai',
    'Ngô Minh Khoa',
    'Core Banking Team',
    'IT Division',
    'active',
    ARRAY['batch','eod','core-banking','critical','reconciliation'],
    '{"arch_type":"Monolith","tech_stack":["Java 11","Spring Batch","Oracle DB","IBM MQ"],"framework":"Spring Batch","dependency_systems":["T24 Core Banking","Oracle DB","NAPAS","SWIFT","Statement Service"]}',
    '{"git_repo":"https://dev.azure.com/vib/core/eod-batch","branch_strategy":"GitFlow","cicd_tool":"Jenkins","versioning_type":"Build number","deploy_method":"Recreate"}',
    '{"auth_method":"Service Account","authorization":"Privileged Access Management","secrets_management":"CyberArk","compliance":["PCI DSS","ISO 27001","Circular 99 (SBV)"]}',
    '{"logging_tool":"Splunk","monitoring_tool":"AppDynamics + Custom Dashboard","alerting":"PagerDuty + SMS","sla_target":"Hoàn thành trước 23:30 hàng ngày","slo":"< 3 giờ xử lý"}',
    '{"cpu_config":"32 vCPU (dedicated)","ram_config":"64 GB","autoscaling_rules":"Không auto-scale (dedicated server)","throughput":"2M accounts/run"}',
    '{"sla_business":"Hoàn thành trước 23:30 mỗi ngày","critical_level":"Tier 1 (Critical)","downtime_impact":"Gián đoạn EOD ảnh hưởng toàn bộ hệ thống ngày hôm sau. Không thể mở cửa hàng sáng hôm sau nếu EOD thất bại."}'
),

-- ── JOB 2: Notification Scheduler ──────────────────────────
(
    'NOTIF-JOB',
    'Notification Scheduler',
    'job',
    'Job lên lịch gửi thông báo đa kênh (Push, SMS, Email) cho khách hàng: nhắc nhở thanh toán, sao kê, OTP, cảnh báo giao dịch, tin tức sản phẩm theo lịch marketing.',
    'Digital Banking',
    'Đỗ Quang Vinh',
    'Phạm Đức Tài',
    'Platform Engineering',
    'Digital Banking Division',
    'active',
    ARRAY['scheduler','notification','push','sms','email','marketing'],
    '{"arch_type":"Microservices","tech_stack":["Node.js 20","TypeScript","Redis","PostgreSQL","Kafka","BullMQ"],"framework":"NestJS","dependency_systems":["Firebase FCM","Zalo ZNS","VNPT SMS Gateway","SendGrid","Kafka"]}',
    '{"git_repo":"https://dev.azure.com/vib/platform/notification-scheduler","branch_strategy":"Trunk-based","cicd_tool":"Azure DevOps","versioning_type":"Semantic","deploy_method":"Rolling"}',
    '{"auth_method":"Service Account + API Key","authorization":"Queue-level ACL","secrets_management":"HashiCorp Vault","compliance":["Nghị định 13","PDPA","TCPA (opt-out compliance)"]}',
    '{"logging_tool":"Loki + Grafana","monitoring_tool":"Prometheus + BullMQ Board","alerting":"Slack","sla_target":"99.5%","slo":"Delivery < 30s từ trigger"}',
    '{"cpu_config":"4 vCPU","ram_config":"8 GB","autoscaling_rules":"Min 2 / Max 8 / Queue depth > 10K","throughput":"100K messages/hour"}',
    '{"sla_business":"99.5% uptime 24/7","critical_level":"Tier 2 (High)","downtime_impact":"Khách hàng không nhận được OTP, cảnh báo giao dịch. Ảnh hưởng bảo mật và trải nghiệm khách hàng."}'
)

ON CONFLICT (product_code) DO NOTHING;


-- ── 2. Environments ──────────────────────────────────────────

INSERT INTO catalog_product_environments (product_id, env_name, url, infra_type, region, version, status, notes)
SELECT id, 'DEV',  'https://ib-dev.internal.vib.com.vn',  'K8s', 'HCM-DC1', '2.14.0-dev', 'active', 'Dev sandbox'             FROM catalog_products WHERE product_code = 'IB-WEB'
UNION ALL
SELECT id, 'SIT',  'https://ib-sit.internal.vib.com.vn',  'K8s', 'HCM-DC1', '2.13.5-sit', 'active', 'System Integration Test'  FROM catalog_products WHERE product_code = 'IB-WEB'
UNION ALL
SELECT id, 'UAT',  'https://ib-uat.internal.vib.com.vn',  'K8s', 'HCM-DC1', '2.13.0',     'active', 'User Acceptance Test'     FROM catalog_products WHERE product_code = 'IB-WEB'
UNION ALL
SELECT id, 'PROD', 'https://online.vib.com.vn',           'K8s', 'HCM-DC1', '2.12.3',     'active', 'Production'               FROM catalog_products WHERE product_code = 'IB-WEB'
UNION ALL
SELECT id, 'DR',   'https://ib-dr.internal.vib.com.vn',   'K8s', 'HNI-DC2', '2.12.3',     'active', 'Disaster Recovery (HNI)'  FROM catalog_products WHERE product_code = 'IB-WEB'

UNION ALL
SELECT id, 'DEV',  NULL,                                   'K8s', 'HCM-DC1', '1.5.0-dev', 'active', NULL FROM catalog_products WHERE product_code = 'CMS-WEB'
UNION ALL
SELECT id, 'PROD', 'https://cms.internal.vib.com.vn',     'VM',  'HCM-DC1', '1.4.2',     'active', NULL FROM catalog_products WHERE product_code = 'CMS-WEB'

UNION ALL
SELECT id, 'DEV',  NULL,                                   'K8s', 'HCM-DC1', '5.1.0-dev', 'active', NULL FROM catalog_products WHERE product_code = 'VIB-APP'
UNION ALL
SELECT id, 'SIT',  NULL,                                   'K8s', 'HCM-DC1', '5.0.1-sit', 'active', NULL FROM catalog_products WHERE product_code = 'VIB-APP'
UNION ALL
SELECT id, 'UAT',  NULL,                                   'K8s', 'HCM-DC1', '5.0.0',     'active', NULL FROM catalog_products WHERE product_code = 'VIB-APP'
UNION ALL
SELECT id, 'PROD', NULL,                                   'K8s', 'HCM-DC1', '4.9.2',     'active', 'App Store 4.9.2 / Play Store 4.9.2' FROM catalog_products WHERE product_code = 'VIB-APP'

UNION ALL
SELECT id, 'PROD', NULL,                                   'K8s', 'HCM-DC1', '1.2.0',     'active', NULL FROM catalog_products WHERE product_code = 'VIB-BIZ'

UNION ALL
SELECT id, 'SIT',  'https://corebank-api-sit.internal.vib.com.vn', 'K8s', 'HCM-DC1', '3.2.0-sit', 'active', NULL FROM catalog_products WHERE product_code = 'COREBANK-API'
UNION ALL
SELECT id, 'UAT',  'https://corebank-api-uat.internal.vib.com.vn', 'K8s', 'HCM-DC1', '3.1.5',     'active', NULL FROM catalog_products WHERE product_code = 'COREBANK-API'
UNION ALL
SELECT id, 'PROD', 'https://corebank-api.internal.vib.com.vn',     'K8s', 'HCM-DC1', '3.1.2',     'active', 'Internal only — not exposed to internet' FROM catalog_products WHERE product_code = 'COREBANK-API'
UNION ALL
SELECT id, 'DR',   'https://corebank-api-dr.internal.vib.com.vn',  'K8s', 'HNI-DC2', '3.1.2',     'active', 'DR site' FROM catalog_products WHERE product_code = 'COREBANK-API'

UNION ALL
SELECT id, 'DEV',  'https://ekyc-api-dev.internal.vib.com.vn', 'K8s', 'HCM-DC1', '2.0.0-dev', 'active', NULL FROM catalog_products WHERE product_code = 'EKYC-API'
UNION ALL
SELECT id, 'UAT',  'https://ekyc-api-uat.internal.vib.com.vn', 'K8s', 'HCM-DC1', '1.9.5',     'active', NULL FROM catalog_products WHERE product_code = 'EKYC-API'
UNION ALL
SELECT id, 'PROD', 'https://ekyc-api.internal.vib.com.vn',     'K8s', 'HCM-DC1', '1.9.2',     'active', NULL FROM catalog_products WHERE product_code = 'EKYC-API'

UNION ALL
SELECT id, 'PROD', NULL, 'Bare Metal', 'HCM-DC1', '4.5.1', 'active', 'Spark cluster on-premise' FROM catalog_products WHERE product_code = 'TXN-ETL'

UNION ALL
SELECT id, 'PROD', NULL, 'K8s', 'HCM-DC1', '2.1.0', 'active', 'Flink on K8s' FROM catalog_products WHERE product_code = 'CUS360-ETL'

UNION ALL
SELECT id, 'PROD', NULL, 'VM',  'HCM-DC1', '8.3.0', 'active', 'Dedicated server — không share resource' FROM catalog_products WHERE product_code = 'EOD-JOB'
UNION ALL
SELECT id, 'DR',   NULL, 'VM',  'HNI-DC2', '8.3.0', 'active', 'DR hot standby' FROM catalog_products WHERE product_code = 'EOD-JOB'

UNION ALL
SELECT id, 'DEV',  NULL, 'K8s', 'HCM-DC1', '3.1.0-dev', 'active', NULL FROM catalog_products WHERE product_code = 'NOTIF-JOB'
UNION ALL
SELECT id, 'PROD', NULL, 'K8s', 'HCM-DC1', '3.0.5',     'active', NULL FROM catalog_products WHERE product_code = 'NOTIF-JOB'

ON CONFLICT (product_id, env_name) DO NOTHING;


-- ── 3. Type-specific details ──────────────────────────────────

INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "online.vib.com.vn",
  "cdn": "Cloudflare Enterprise",
  "browser_support": ["Chrome 100+", "Firefox 100+", "Safari 15+", "Edge 100+"],
  "seo_config": "SSR (Next.js) + sitemap.xml",
  "static_assets_storage": "Azure CDN + Blob Storage",
  "session_management": "Redis session + JWT refresh token (15min/7day)"
}'::jsonb FROM catalog_products WHERE product_code = 'IB-WEB'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "domain_dns": "cms.internal.vib.com.vn",
  "cdn": null,
  "browser_support": ["Chrome 100+", "Edge 100+"],
  "seo_config": "Không cần SEO (internal tool)",
  "static_assets_storage": "Azure Blob Storage",
  "session_management": "JWT + SAML SSO session"
}'::jsonb FROM catalog_products WHERE product_code = 'CMS-WEB'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "platforms": ["iOS 15+", "Android 8+"],
  "app_version": "4.9.2",
  "store_link_android": "https://play.google.com/store/apps/details?id=com.vib.online",
  "store_link_ios": "https://apps.apple.com/vn/app/vib-online-plus/id123456789",
  "build_pipeline": "Fastlane + Azure DevOps",
  "push_notification": "Firebase FCM (Android) + APNS (iOS)",
  "offline_capability": false
}'::jsonb FROM catalog_products WHERE product_code = 'VIB-APP'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "platforms": ["iOS 15+", "Android 9+"],
  "app_version": "1.2.0",
  "store_link_android": "https://play.google.com/store/apps/details?id=com.vib.business",
  "store_link_ios": "https://apps.apple.com/vn/app/vib-business/id987654321",
  "build_pipeline": "Fastlane + Azure DevOps",
  "push_notification": "Firebase FCM + APNS",
  "offline_capability": false
}'::jsonb FROM catalog_products WHERE product_code = 'VIB-BIZ'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "spec_url": "https://corebank-api.internal.vib.com.vn/docs",
  "endpoints": [
    "GET /v3/accounts/{id}",
    "POST /v3/transfers/internal",
    "POST /v3/transfers/napas",
    "GET /v3/transactions",
    "GET /v3/products/loans",
    "POST /v3/cards/activate"
  ],
  "rate_limit": "1000 req/min per client_id",
  "auth_type": "OAuth2 client_credentials",
  "api_version": "v3 (v2 deprecated 2025-06)",
  "backward_compat_rule": "Maintain v2 for 12 months after new major version. Breaking changes require 90-day notice."
}'::jsonb FROM catalog_products WHERE product_code = 'COREBANK-API'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "spec_url": "https://ekyc-api.internal.vib.com.vn/docs",
  "endpoints": [
    "POST /v2/verify/face",
    "POST /v2/ocr/cccd",
    "POST /v2/liveness",
    "POST /v2/verify/full",
    "GET /v2/result/{session_id}"
  ],
  "rate_limit": "200 verif/min per API key",
  "auth_type": "API Key + mTLS client certificate",
  "api_version": "v2",
  "backward_compat_rule": "v1 maintained until 2026-06-30"
}'::jsonb FROM catalog_products WHERE product_code = 'EKYC-API'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "source_systems": ["Core Banking T24 (Oracle)", "NAPAS File Transfer", "SWIFT MT Messages"],
  "target_systems": ["Oracle DWH (Teradata)", "BI Platform (MicroStrategy)", "SBV Reporting Portal"],
  "transformation_logic": "Aggregate daily transactions by account, branch, product type. Calculate net positions, interest accruals, fee summaries. Apply T24 → DWH schema mapping.",
  "data_schema": "Star schema — fact_daily_txn, dim_account, dim_branch, dim_product",
  "data_quality_rules": [
    "No null transaction_id",
    "Amount > 0",
    "Debit/credit balance per account",
    "Row count >= 95% of previous day average"
  ],
  "schedule": "0 20 * * *",
  "batch_or_streaming": "batch",
  "data_lineage": "T24 Oracle → Staging (HDFS) → Spark Transform → DWH Teradata → MicroStrategy"
}'::jsonb FROM catalog_products WHERE product_code = 'TXN-ETL'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "source_systems": ["CRM Salesforce", "Core Banking T24", "VIB Mobile App (Kafka events)", "Branch Teller System"],
  "target_systems": ["Customer 360 MongoDB", "Personalization Engine (Redis)", "Marketing Cloud"],
  "transformation_logic": "Merge customer profiles from multiple sources using golden record algorithm. Enrich with behavioral signals from mobile events. Calculate RFM scores, product propensity.",
  "data_schema": "Document model — customer_360 collection with nested accounts, transactions, behaviors, scores",
  "data_quality_rules": [
    "Unique customer_id per record",
    "Valid email format if present",
    "Profile completeness >= 60%"
  ],
  "schedule": "streaming",
  "batch_or_streaming": "streaming",
  "data_lineage": "Multiple sources → Kafka topics → Flink streaming → Customer 360 MongoDB → Personalization Engine"
}'::jsonb FROM catalog_products WHERE product_code = 'CUS360-ETL'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "job_type": "cron",
  "schedule_cron": "0 20 * * 1-5",
  "retry_policy": "Manual intervention only — không tự retry do rủi ro duplicate accounting entries",
  "timeout_seconds": 10800,
  "is_idempotent": false,
  "queue_system": "IBM MQ (job orchestration)"
}'::jsonb FROM catalog_products WHERE product_code = 'EOD-JOB'
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO catalog_product_details (product_id, details)
SELECT id, '{
  "job_type": "event-driven",
  "schedule_cron": "*/1 * * * *",
  "retry_policy": "3 attempts, exponential backoff 1min/5min/15min",
  "timeout_seconds": 60,
  "is_idempotent": true,
  "queue_system": "Redis BullMQ + Kafka (event trigger)"
}'::jsonb FROM catalog_products WHERE product_code = 'NOTIF-JOB'
ON CONFLICT (product_id) DO NOTHING;


-- ── 4. Licenses (một số ví dụ) ───────────────────────────────

INSERT INTO catalog_product_licenses (product_id, license_name, license_type, vendor, cost_amount, currency, expiry_date, auto_renewal, compliance_status)
SELECT id, 'Cloudflare Enterprise', 'subscription', 'Cloudflare Inc.', 480000000, 'VND', '2026-12-31'::date, TRUE,  'compliant' FROM catalog_products WHERE product_code = 'IB-WEB'
UNION ALL
SELECT id, 'DataDog APM',           'subscription', 'Datadog Inc.',    240000000, 'VND', '2026-06-30'::date, TRUE,  'compliant' FROM catalog_products WHERE product_code = 'VIB-APP'
UNION ALL
SELECT id, 'AppDynamics Enterprise','commercial',   'Cisco AppDyn.',   600000000, 'VND', '2026-09-30'::date, FALSE, 'compliant' FROM catalog_products WHERE product_code = 'COREBANK-API'
UNION ALL
SELECT id, 'VinAI Face SDK',        'commercial',   'VinAI Research',  360000000, 'VND', '2026-12-31'::date, TRUE,  'compliant' FROM catalog_products WHERE product_code = 'EKYC-API'
UNION ALL
SELECT id, 'Splunk Enterprise',     'commercial',   'Splunk Inc.',     900000000, 'VND', '2026-03-31'::date, TRUE,  'pending_review' FROM catalog_products WHERE product_code = 'COREBANK-API';
