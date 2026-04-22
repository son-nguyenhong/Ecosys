-- ============================================================
-- V033 — Create Projects from 2026 Annual Plan Initiatives
-- 20 projects — 1 per initiative
-- Links: ppg_plan_project_links (plan → project)
--        ppg_initiative_projects (initiative → project)
-- BU → domain_code mapping:
--   PS  → OPERATIONS   FS  → FS           HR  → HR
--   RBO → RETAIL       GC  → COMPLIANCE   BTS → IT
--   OSS → OPERATIONS   All → DATA / IT
-- ============================================================


-- ── 1. Insert projects ────────────────────────────────────────
-- start_date derived from quarter; end_date = target_date
-- NULLIF handles Oracle Financial (no target_date)

WITH plan AS (
    SELECT id AS plan_id
    FROM ppg_annual_plans
    WHERE year = 2026 AND name = 'Kế hoạch IT năm 2026'
    LIMIT 1
)
INSERT INTO projects (code, name, description, status, start_date, end_date, plan_id, domain_code)
SELECT
    v.code,
    v.name,
    v.description,
    'active',
    v.start_date::date,
    NULLIF(v.end_date, '')::date,
    plan.plan_id,
    v.domain_code
FROM plan,
(VALUES
    -- ── PS ──────────────────────────────────────────────────
    ('EMS2-UPG-2026',
     'EMS 2.0 Upgrading',
     'Bổ sung quản lý chi tiêu cho PS, PR/PP/VSP, e-bidding; nâng cấp quy trình IS, ER, PO, PM để đáp ứng nghiệp vụ và hỗ trợ tích hợp với: Collection Support System, Jetsaas, ESD Portal via VIB.',
     '2026-07-01', '2026-09-30', 'OPERATIONS'),

    ('ASSET-MGT-2026',
     'Fix Asset Management',
     'Bổ sung tính năng quản lý tài sản, nâng cấp báo cáo tài sản và tích hợp hệ thống ESD Portal.',
     '2026-04-01', '2026-05-29', 'OPERATIONS'),

    ('TRAVEL-DESK-2026',
     'Travel-desk',
     'Phát triển quy trình đăng ký công tác dạng dynamic, có thể cấu hình theo policy mới của VIB và tùy chỉnh theo từng thứ tự ký duyệt.',
     '2026-04-01', '2026-05-29', 'OPERATIONS'),

    ('ECONTRACT-PD-2026',
     'e-contract PD',
     'Triển khai phương thức ký số HSM; tích hợp với hệ thống dây chuyền VIB và Vendor ký số → cho phép các hệ thống tự động ký số; phát triển và cập nhật luồng ký Huy HD.',
     '2026-07-01', '2026-09-30', 'OPERATIONS'),

    ('ESD-PORTAL-2026',
     'ESD Portal',
     'Cập nhật tính năng điều chuyển điện tại kho, hoàn trả tài khoản kho; mua tài liệu và cập nhật website vib.com.vn.',
     '2026-01-01', '2026-01-30', 'OPERATIONS'),

    -- ── FS ──────────────────────────────────────────────────
    ('FINNFLOW-2026',
     'FinnFlow',
     'Cập nhật và tích hợp thêm dữ liệu từ Ngân hàng Nhà nước; xây dựng AI và Workflow tự động hóa và điều phối quy trình tài chính nội bộ bao gồm EMS, DF và các hệ thống VIB liên quan.',
     '2026-10-01', '2026-11-30', 'FS'),

    -- ── HR ──────────────────────────────────────────────────
    ('EINVOICE-2026',
     'eInvoice',
     'Xây dựng API gửi hóa đơn cho các khách hàng (MySQL); tích hợp với hệ thống Neon Core.',
     '2026-10-01', '2026-11-30', 'HR'),

    ('ORACLE-FIN-2026',
     'Oracle Financial',
     'Nâng cấp hệ thống Oracle Finance và integrate lên AWS cloud; tích hợp hệ thống Neon Core.',
     '2026-01-01', '', 'HR'),

    ('EHR2-2026',
     'eHR 2.0',
     'Phát triển thêm tính năng của hệ thống eHR, mở rộng so với phiên bản năm 2025.',
     '2026-10-01', '2026-11-30', 'HR'),

    ('CORNERSTONE-2026',
     'Cornerstone Talent Management & Succession Plans',
     'Phát triển quản lý nhân tài, đánh giá năng lực và xây dựng nguồn kế nhiệm tại VIB.',
     '2026-10-01', '2026-11-30', 'HR'),

    ('COACHING-2026',
     'Coaching Platform',
     'Platform hỗ trợ phát triển năng lực thông qua Coaching — kết nối CRM, cho phép cán bộ quản lý kết quả và chia sẻ kinh nghiệm; nền tảng học tập kết nối người học với người đã được đào tạo.',
     '2026-10-01', '2026-11-30', 'HR'),

    ('VIB-GIFT-2026',
     'VIB GIFT',
     'Trợ lý AI nội bộ dạng Generative AI hỗ trợ HR, R&A, RBO, BTS, IT — tra cứu quy trình nội bộ VIB, hướng dẫn nghiệp vụ, hỗ trợ workflow; giúp giảm tải và cá nhân hóa trải nghiệm làm việc.',
     '2026-04-01', '2026-06-30', 'HR'),

    ('EHR1-2026',
     'eHR 1.0',
     'Thực hiện enhancement theo yêu cầu của HR trên các hệ thống: OMS, Reporting Portal, K-Profiles, e-Profile để bổ sung IT, Performance, Tuyển dụng và đề cử.',
     '2026-10-01', '2026-12-30', 'HR'),

    ('ECONTRACT-HR-2026',
     'e-contract HR',
     'Phát triển hệ thống quản lý hợp đồng lao động VIB.',
     '2026-10-01', '2026-12-30', 'HR'),

    -- ── RBO ─────────────────────────────────────────────────
    ('SMART-SH-2026',
     'Smart Shareholder',
     'Phát triển báo cáo cao cấp cho hội cổ đông; thực hiện migration data cũ lên hệ thống mới.',
     '2026-10-01', '2026-11-30', 'RETAIL'),

    -- ── GC ──────────────────────────────────────────────────
    ('LAOS-AI-2026',
     'VIB Laos AI Assistant',
     'Tự động hóa quy trình quản trị tính pháp lý và nội bộ thông qua nền tảng AI hỗ trợ các vấn đề pháp lý.',
     '2026-07-01', '2026-08-31', 'COMPLIANCE'),

    -- ── BTS ─────────────────────────────────────────────────
    ('IT-ASSET-2026',
     'IT Asset Management & Account Management',
     'Hệ thống quản lý tài sản Công nghệ thông tin tại VIB; tích hợp hệ thống 724 và các phần tích hợp cần thiết để cấp tài khoản VIB dùng Company thay thế Branch.',
     '2026-04-01', '2026-06-30', 'IT'),

    -- ── OSS ─────────────────────────────────────────────────
    ('IA2-2026',
     'IA 2.0',
     'Xây dựng quy trình BPM, liên tục theo dõi và enhance tính năng; tích hợp các hệ thống để phục vụ phát triển nghiệp vụ.',
     '2026-01-01', '2026-04-30', 'OPERATIONS'),

    -- ── All ──────────────────────────────────────────────────
    ('UDATALAKE-2026',
     'User Activity Data Lake & Journey Analytics',
     'Thu thập activity của từng user trên các hệ thống nội bộ; xây dựng "hành trình người dùng" (User Journey) có thể phân tích và theo dõi theo thời gian.',
     '2026-07-01', '2026-08-30', 'DATA'),

    ('REMOTE-SIGN-2026',
     'Remote-Signing (EPT)',
     'Triển khai hệ thống ký số remote-signing với đối tác EPT.',
     '2026-01-01', '2026-03-30', 'IT')

) AS v(code, name, description, start_date, end_date, domain_code)
ON CONFLICT (code) DO NOTHING;


-- ── 2. Link annual plan → project ────────────────────────────
INSERT INTO ppg_plan_project_links (plan_id, project_id, linked_by)
SELECT a.id, p.id, 'system'
FROM ppg_annual_plans a
JOIN projects p ON p.plan_id = a.id
WHERE a.year = 2026
  AND a.name  = 'Kế hoạch IT năm 2026'
ON CONFLICT DO NOTHING;


-- ── 3. Link initiative → project (match on project name = initiative title) ──
INSERT INTO ppg_initiative_projects (initiative_id, project_id)
SELECT i.id, p.id
FROM ppg_plan_initiatives i
JOIN ppg_annual_plans a ON a.id = i.plan_id
JOIN projects p          ON p.plan_id = a.id AND p.name = i.title
WHERE a.year = 2026
ON CONFLICT DO NOTHING;
