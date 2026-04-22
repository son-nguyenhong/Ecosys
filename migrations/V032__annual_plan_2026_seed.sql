-- ============================================================
-- V032 — Annual Plan 2026 Seed
-- 1. Extend ppg_plan_initiatives: thêm bu_code, request_type,
--    expected_outcome, target_date
-- 2. Tạo bản ghi ppg_annual_plans cho năm 2026
-- 3. Seed 20 initiatives theo BU: PS / FS / HR / RBO / GC / BTS / OSS / All
-- Nguồn: Kế hoạch IT năm 2026 (ảnh danh sách requirements)
-- ============================================================

-- ── 1. Extend ppg_plan_initiatives ───────────────────────────

ALTER TABLE ppg_plan_initiatives
    ADD COLUMN IF NOT EXISTS bu_code          VARCHAR(20),    -- PS | FS | HR | RBO | GC | BTS | OSS | All
    ADD COLUMN IF NOT EXISTS request_type     VARCHAR(50),    -- enhancement | new_project | new_development | in_progress
    ADD COLUMN IF NOT EXISTS expected_outcome TEXT,           -- Expected final outcome
    ADD COLUMN IF NOT EXISTS target_date      DATE;           -- Expected timeline (deadline)

CREATE INDEX IF NOT EXISTS idx_plan_initiatives_bu   ON ppg_plan_initiatives(bu_code);
CREATE INDEX IF NOT EXISTS idx_plan_initiatives_type ON ppg_plan_initiatives(request_type);

COMMENT ON COLUMN ppg_plan_initiatives.bu_code          IS 'Business Unit: PS, FS, HR, RBO, GC, BTS, OSS, All';
COMMENT ON COLUMN ppg_plan_initiatives.request_type     IS 'enhancement | new_project | new_development | in_progress';
COMMENT ON COLUMN ppg_plan_initiatives.expected_outcome IS 'Expected final outcome / deliverable';
COMMENT ON COLUMN ppg_plan_initiatives.target_date      IS 'Expected completion deadline';


-- ── 2. Tạo Annual Plan 2026 ───────────────────────────────────

INSERT INTO ppg_annual_plans
    (id, name, year, description, domain, start_date, end_date, related_systems, status, created_by)
VALUES (
    gen_random_uuid(),
    'Kế hoạch IT năm 2026',
    2026,
    'Kế hoạch phát triển hệ thống công nghệ thông tin năm 2026 bao gồm các sáng kiến từ các khối PS, FS, HR, RBO, GC, BTS, OSS với tổng cộng 20 requirements.',
    'IT Division',
    '2026-01-01',
    '2026-12-31',
    '["EMS2","E-HR","E-CONTRACT","DIGITAL-SIGN","ORACLE-FINANCE","E-INVOICE","OSS-RB-1","SMART-SHAREHOLDER","AI-KA"]'::jsonb,
    'active',
    'system'
)
ON CONFLICT DO NOTHING;


-- ── 3. Seed Initiatives ───────────────────────────────────────
-- Dùng CTE để lấy plan_id vừa insert (hoặc đã tồn tại)

WITH plan AS (
    SELECT id FROM ppg_annual_plans WHERE year = 2026 AND name = 'Kế hoạch IT năm 2026' LIMIT 1
)

INSERT INTO ppg_plan_initiatives
    (id, plan_id, bu_code, title, description, request_type, expected_outcome, target_date, quarter, priority, status, sort_order, created_by)
SELECT
    gen_random_uuid(),
    plan.id,
    v.bu_code,
    v.title,
    v.description,
    v.request_type,
    v.expected_outcome,
    v.target_date::DATE,
    v.quarter,
    v.priority,
    v.status,
    v.sort_order,
    'system'
FROM plan, (VALUES

    -- ══ PS ══════════════════════════════════════════════════════
    (
        'PS', 'EMS 2.0 Upgrading',
        'Bổ sung quản lý chi tiêu cho PS, PR/PP/VSP, e-bidding; nâng cấp quy trình IS, ER, PO, PM để đáp ứng nghiệp vụ và hỗ trợ tích hợp với: Collection Support System, Jetsaas, ESD Portal via VIB.',
        'enhancement',
        'Hoàn thiện quy trình quản lý chi tiêu trên nền tảng EMS.',
        '2026-09-30', 'Q3', 3, 'planned', 10
    ),
    (
        'PS', 'Fix Asset Management',
        'Bổ sung tính năng quản lý tài sản, nâng cấp báo cáo tài sản và tích hợp hệ thống ESD Portal.',
        'enhancement',
        'Hoàn thiện chức năng quản lý và báo cáo tài sản nội bộ.',
        '2026-05-29', 'Q2', 3, 'planned', 20
    ),
    (
        'PS', 'Travel-desk',
        'Phát triển quy trình đăng ký công tác dạng dynamic, có thể cấu hình theo policy mới của VIB và tùy chỉnh theo từng thứ tự ký duyệt.',
        'enhancement',
        'Cải tiến chức năng đặt phòng và đăng ký công tác linh hoạt theo policy.',
        '2026-05-29', 'Q2', 3, 'planned', 30
    ),
    (
        'PS', 'e-contract PD',
        'Triển khai phương thức ký số HSM; tích hợp với hệ thống dây chuyền VIB và Vendor ký số → cho phép các hệ thống tự động ký số; phát triển và cập nhật luồng ký Huy HD.',
        'enhancement',
        'Hoàn thiện các phương thức ký số; đảm bảo đăng ký và xác thực chữ ký số đầy đủ.',
        '2026-09-30', 'Q3', 3, 'planned', 40
    ),
    (
        'PS', 'ESD Portal',
        'Cập nhật tính năng điều chuyển điện tại kho, hoàn trả tài khoản kho; mua tài liệu và cập nhật website vib.com.vn.',
        'enhancement',
        'Hoàn thiện báo cáo và chức năng quản lý kho nội bộ ESD.',
        '2026-01-30', 'Q1', 3, 'planned', 50
    ),

    -- ══ FS ══════════════════════════════════════════════════════
    (
        'FS', 'FinnFlow',
        'Cập nhật và tích hợp thêm dữ liệu từ Ngân hàng Nhà nước; xây dựng AI và Workflow tự động hóa và điều phối quy trình tài chính nội bộ bao gồm EMS, DF và các hệ thống VIB liên quan.',
        'new_project',
        'Xử lý nhanh nghiệp vụ EMS; Chatbot tự động hóa nghiệp vụ EMS, DF, eInvoice (Finance Service); Data analytics tài chính.',
        '2026-11-30', 'Q4', 4, 'planned', 60
    ),

    -- ══ HR ══════════════════════════════════════════════════════
    (
        'HR', 'eInvoice',
        'Xây dựng API gửi hóa đơn cho các khách hàng (MySQL); tích hợp với hệ thống Neon Core.',
        'new_development',
        'Hoàn thiện API hóa đơn điện tử và tích hợp Neon Core.',
        '2026-11-30', 'Q4', 3, 'planned', 70
    ),
    (
        'HR', 'Oracle Financial',
        'Nâng cấp hệ thống Oracle Finance và integrate lên AWS cloud; tích hợp hệ thống Neon Core.',
        'in_progress',
        'Hệ thống Oracle Finance vận hành trên AWS cloud, tích hợp đầy đủ với Neon Core.',
        NULL, NULL, 4, 'in_progress', 80
    ),
    (
        'HR', 'eHR 2.0',
        'Phát triển thêm tính năng của hệ thống eHR, mở rộng so với phiên bản năm 2025.',
        'in_progress',
        'Hệ thống eHR 2.0 với đầy đủ tính năng quản lý nhân sự nâng cao.',
        '2026-11-30', 'Q4', 3, 'in_progress', 90
    ),
    (
        'HR', 'Cornerstone Talent Management & Succession Plans',
        'Phát triển quản lý nhân tài, đánh giá năng lực và xây dựng nguồn kế nhiệm tại VIB.',
        'new_project',
        'Hệ thống quản lý nhân tài và kế hoạch kế nhiệm vận hành đầy đủ.',
        '2026-11-30', 'Q4', 4, 'planned', 100
    ),
    (
        'HR', 'Coaching Platform',
        'Platform hỗ trợ phát triển năng lực thông qua Coaching — kết nối CRM, cho phép cán bộ quản lý kết quả và chia sẻ kinh nghiệm; nền tảng học tập kết nối người học với người đã được đào tạo.',
        'new_project',
        'Hỗ trợ HR learning liên tục; nền tảng đào tạo, chia sẻ và phát triển năng lực cán bộ.',
        '2026-11-30', 'Q4', 3, 'planned', 110
    ),
    (
        'HR', 'VIB GIFT',
        'Trợ lý AI nội bộ dạng Generative AI hỗ trợ HR, R&A, RBO, BTS, IT — tra cứu quy trình nội bộ VIB, hướng dẫn nghiệp vụ, hỗ trợ workflow; giúp giảm tải và cá nhân hóa trải nghiệm làm việc.',
        'in_progress',
        'Trợ lý AI VIB GIFT hoạt động ổn định, phục vụ tra cứu đa nghiệp vụ.',
        '2026-06-30', 'Q2', 4, 'in_progress', 120
    ),
    (
        'HR', 'eHR 1.0',
        'Thực hiện enhancement theo yêu cầu của HR trên các hệ thống: OMS, Reporting Portal, K-Profiles, e-Profile để bổ sung IT, Performance, Tuyển dụng và đề cử.',
        'in_progress',
        'Đảm bảo đáp ứng đầy đủ yêu cầu nghiệp vụ HR trên các hệ thống hiện tại.',
        '2026-12-30', 'Q4', 3, 'in_progress', 130
    ),
    (
        'HR', 'e-contract HR',
        'Phát triển hệ thống quản lý hợp đồng lao động VIB.',
        'in_progress',
        'Hệ thống e-contract HR vận hành đầy đủ quy trình ký kết hợp đồng lao động.',
        '2026-12-30', 'Q4', 3, 'in_progress', 140
    ),

    -- ══ RBO ═════════════════════════════════════════════════════
    (
        'RBO', 'Smart Shareholder',
        'Phát triển báo cáo cao cấp cho hội cổ đông; thực hiện migration data cũ lên hệ thống mới.',
        'enhancement',
        'Hoàn thiện báo cáo cổ đông và migration data đầy đủ.',
        '2026-11-30', 'Q4', 3, 'planned', 150
    ),

    -- ══ GC ══════════════════════════════════════════════════════
    (
        'GC', 'VIB Laos AI Assistant',
        'Tự động hóa quy trình quản trị tính pháp lý và nội bộ thông qua nền tảng AI hỗ trợ các vấn đề pháp lý.',
        'new_project',
        'AI Assistant pháp lý VIB Laos vận hành, hỗ trợ tự động hóa quy trình pháp lý nội bộ.',
        '2026-08-31', 'Q3', 4, 'planned', 160
    ),

    -- ══ BTS ═════════════════════════════════════════════════════
    (
        'BTS', 'IT Asset Management & Account Management',
        'Hệ thống quản lý tài sản Công nghệ thông tin tại VIB; tích hợp hệ thống 724 và các phần tích hợp cần thiết để cấp tài khoản VIB dùng Company thay thế Branch.',
        'new_project',
        'Hệ thống IT Asset Management vận hành đầy đủ; cấp tài khoản tập trung qua Company.',
        '2026-06-30', 'Q2', 3, 'planned', 170
    ),

    -- ══ OSS ═════════════════════════════════════════════════════
    (
        'OSS', 'IA 2.0',
        'Xây dựng quy trình BPM, liên tục theo dõi và enhance tính năng; tích hợp các hệ thống để phục vụ phát triển nghiệp vụ.',
        'in_progress',
        'Số hóa toàn bộ quy trình nghiệp vụ; tự động hóa và tái cấu hình linh hoạt bất kỳ quy trình nào.',
        '2026-04-30', 'Q2', 4, 'in_progress', 180
    ),

    -- ══ All ══════════════════════════════════════════════════════
    (
        'All', 'User Activity Data Lake & Journey Analytics',
        'Thu thập activity của từng user trên các hệ thống nội bộ; xây dựng "hành trình người dùng" (User Journey) có thể phân tích và theo dõi theo thời gian.',
        'new_project',
        'Data Lake user activity vận hành; dashboard User Journey Analytics phục vụ phân tích hành vi người dùng nội bộ.',
        '2026-08-30', 'Q3', 3, 'planned', 190
    ),
    (
        'All', 'Remote-Signing (EPT)',
        'Triển khai hệ thống ký số remote-signing với đối tác EPT.',
        'new_project',
        'Hệ thống Remote Signing với EPT được triển khai và vận hành.',
        '2026-03-30', 'Q1', 3, 'planned', 200
    )

) AS v(bu_code, title, description, request_type, expected_outcome, target_date, quarter, priority, status, sort_order);
