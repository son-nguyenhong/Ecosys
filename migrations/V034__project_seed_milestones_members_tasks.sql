-- ============================================================
-- V034 — Seed: Project Milestones, Members, BA Tasks, Document Templates
-- 20 projects from V033 — proportional phase allocation
-- Date: 2026-04-14 | Author: Dev Agent
-- ============================================================
-- Part 1 — project_milestones (track='project', 8 phases)
-- Part 2 — project_members (PM / Tech Lead / BA Lead / Dev / BA / QA)
-- Part 3 — ba_tasks per milestone
-- Part 4 — project_files (document template stubs)
-- No DROP / TRUNCATE. All inserts use ON CONFLICT DO NOTHING.
-- ============================================================


-- ============================================================
-- PART 1 — PROJECT MILESTONES (project track, 8 phases)
-- Status derived from today = 2026-04-14
-- ============================================================

WITH proj AS (
    SELECT id, code,
           start_date,
           COALESCE(end_date, '2026-12-31'::date) AS end_date
    FROM projects
    WHERE code = ANY(ARRAY[
        'IA2-2026','LAOS-AI-2026','UDATALAKE-2026',
        'ASSET-MGT-2026','ECONTRACT-PD-2026','ESD-PORTAL-2026',
        'TRAVEL-DESK-2026','EMS2-UPG-2026','FINNFLOW-2026',
        'COACHING-2026','CORNERSTONE-2026','ECONTRACT-HR-2026',
        'EHR1-2026','EHR2-2026','EINVOICE-2026',
        'ORACLE-FIN-2026','VIB-GIFT-2026','IT-ASSET-2026',
        'REMOTE-SIGN-2026','SMART-SH-2026'
    ])
),
phases(srt, phase_type, name_vi, sp, ep) AS (VALUES
    (1, 'kickoff',      'Kickoff',                  0.00::numeric, 0.08::numeric),
    (2, 'requirements', 'Thu thập yêu cầu',          0.08::numeric, 0.22::numeric),
    (3, 'design',       'Phân tích & Thiết kế',       0.22::numeric, 0.40::numeric),
    (4, 'development',  'Phát triển',                0.40::numeric, 0.70::numeric),
    (5, 'sit',          'Kiểm thử SIT',              0.70::numeric, 0.82::numeric),
    (6, 'uat',          'Kiểm thử UAT',              0.82::numeric, 0.92::numeric),
    (7, 'golive',       'Go-Live',                   0.92::numeric, 0.96::numeric),
    (8, 'closure',      'Closure & Bàn giao',        0.96::numeric, 1.00::numeric)
)
INSERT INTO project_milestones (
    id, project_id, name, milestone_type,
    start_date, end_date, status, sort_order, track
)
SELECT
    gen_random_uuid(),
    p.id,
    ph.name_vi,
    ph.phase_type,
    -- proportional start / end dates
    p.start_date + ((p.end_date - p.start_date) * ph.sp)::int           AS ms_start,
    p.start_date + ((p.end_date - p.start_date) * ph.ep)::int - 1        AS ms_end,
    CASE
        WHEN p.start_date + ((p.end_date - p.start_date) * ph.ep)::int - 1
             < '2026-04-14'::date                                          THEN 'completed'
        WHEN p.start_date + ((p.end_date - p.start_date) * ph.sp)::int
             <= '2026-04-14'::date                                         THEN 'in_progress'
        ELSE 'planned'
    END,
    ph.srt,
    'project'
FROM proj p
CROSS JOIN phases ph
ON CONFLICT DO NOTHING;


-- ============================================================
-- PART 2 — PROJECT MEMBERS
-- ============================================================

-- ── 2a. PM assignments ────────────────────────────────────────
-- Nhữ Tuấn Anh → IT, BOS, DATA, COMPLIANCE, FS + specific HR/other projects
-- Trương Hoàng Nam Cường → ESD, RETAIL, HR projects

INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT
    gen_random_uuid(),
    p.id,
    'Nhữ Tuấn Anh',
    'anh.nhutuan',
    'anh.nhutuan@vib.com.vn',
    'PM',
    true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'IA2-2026',          -- BOS
    'LAOS-AI-2026',      -- COMPLIANCE
    'UDATALAKE-2026',    -- DATA
    'EMS2-UPG-2026',     -- FS
    'FINNFLOW-2026',     -- FS
    'ORACLE-FIN-2026',   -- HR (explicit)
    'VIB-GIFT-2026',     -- HR (explicit)
    'IT-ASSET-2026',     -- IT (explicit)
    'REMOTE-SIGN-2026'   -- IT (explicit)
])
ON CONFLICT DO NOTHING;

INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT
    gen_random_uuid(),
    p.id,
    'Trương Hoàng Nam Cường',
    'cuong.truonghoang',
    'cuong.truonghoang@vib.com.vn',
    'PM',
    true
FROM projects p
WHERE p.code = ANY(ARRAY[
    -- ESD domain
    'ASSET-MGT-2026',
    'ECONTRACT-PD-2026',
    'ESD-PORTAL-2026',
    'TRAVEL-DESK-2026',
    -- HR domain
    'COACHING-2026',
    'CORNERSTONE-2026',
    'ECONTRACT-HR-2026',
    'EHR1-2026',
    'EHR2-2026',
    'EINVOICE-2026',
    -- RETAIL domain
    'SMART-SH-2026'
])
ON CONFLICT DO NOTHING;


-- ── 2b. Tech Lead / BA Lead (Chuyên gia) ─────────────────────

-- Đặng Vũ Hiệp — Tech Lead: BOS, COMPLIANCE, IT
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Đặng Vũ Hiệp', 'hiep.dangvu', 'hiep.dangvu@vib.com.vn',
       'Tech Lead', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'IA2-2026',          -- BOS
    'LAOS-AI-2026',      -- COMPLIANCE
    'IT-ASSET-2026',     -- IT
    'REMOTE-SIGN-2026'   -- IT
])
ON CONFLICT DO NOTHING;

-- Dương Danh Phương — BA Lead: FS, DATA, RETAIL
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Dương Danh Phương', 'phuong.duongdanh', 'phuong.duongdanh@vib.com.vn',
       'BA Lead', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'EMS2-UPG-2026',     -- FS
    'FINNFLOW-2026',     -- FS
    'UDATALAKE-2026',    -- DATA
    'SMART-SH-2026'      -- RETAIL
])
ON CONFLICT DO NOTHING;

-- Kim Sơn Quang — Tech Lead: HR (EHR1, EHR2, ECONTRACT-HR, COACHING, CORNERSTONE)
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Kim Sơn Quang', 'quang.kimson', 'quang.kimson@vib.com.vn',
       'Tech Lead', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'EHR1-2026',
    'EHR2-2026',
    'ECONTRACT-HR-2026',
    'COACHING-2026',
    'CORNERSTONE-2026'
])
ON CONFLICT DO NOTHING;

-- Lê Đức Tin — BA Lead: ESD + HR (EINVOICE, VIB-GIFT, ORACLE-FIN)
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Lê Đức Tin', 'tin.leduc', 'tin.leduc@vib.com.vn',
       'BA Lead', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    -- ESD
    'ASSET-MGT-2026',
    'ECONTRACT-PD-2026',
    'ESD-PORTAL-2026',
    'TRAVEL-DESK-2026',
    -- HR
    'EINVOICE-2026',
    'VIB-GIFT-2026',
    'ORACLE-FIN-2026'
])
ON CONFLICT DO NOTHING;


-- ── 2c. Developer / BA / QA (Chuyên viên) ────────────────────

-- Chu Việt Hồng — Developer: FS, BOS
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Chu Việt Hồng', 'hong.chuviet', 'hong.chuviet@vib.com.vn',
       'Developer', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'EMS2-UPG-2026',
    'FINNFLOW-2026',
    'IA2-2026'
])
ON CONFLICT DO NOTHING;

-- Hoàng Thế Vinh — Developer: IT, COMPLIANCE, DATA
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Hoàng Thế Vinh', 'vinh.hoangthe', 'vinh.hoangthe@vib.com.vn',
       'Developer', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'IT-ASSET-2026',
    'REMOTE-SIGN-2026',
    'LAOS-AI-2026',
    'UDATALAKE-2026'
])
ON CONFLICT DO NOTHING;

-- Hoàng Thị Hòa — BA: ESD projects
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Hoàng Thị Hòa', 'hoa.hoang1', 'hoa.hoang1@vib.com.vn',
       'BA', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'ASSET-MGT-2026',
    'ECONTRACT-PD-2026',
    'ESD-PORTAL-2026',
    'TRAVEL-DESK-2026'
])
ON CONFLICT DO NOTHING;

-- Lê Đình Dũng — Developer: HR (COACHING, CORNERSTONE, EINVOICE)
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Lê Đình Dũng', 'dung.ledinh4', 'dung.ledinh4@vib.com.vn',
       'Developer', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'COACHING-2026',
    'CORNERSTONE-2026',
    'EINVOICE-2026'
])
ON CONFLICT DO NOTHING;

-- Man Ngọc Lam — QA: ESD, FS
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Man Ngọc Lam', 'lam.manngoc', 'lam.manngoc@vib.com.vn',
       'QA', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'ASSET-MGT-2026',
    'ECONTRACT-PD-2026',
    'ESD-PORTAL-2026',
    'TRAVEL-DESK-2026',
    'EMS2-UPG-2026',
    'FINNFLOW-2026'
])
ON CONFLICT DO NOTHING;

-- Ngô Thị Thúy Nga — BA: HR (EHR1, EHR2, ECONTRACT-HR, VIB-GIFT)
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Ngô Thị Thúy Nga', 'nga.ngothuy', 'nga.ngothuy@vib.com.vn',
       'BA', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'EHR1-2026',
    'EHR2-2026',
    'ECONTRACT-HR-2026',
    'VIB-GIFT-2026'
])
ON CONFLICT DO NOTHING;

-- Nguyễn Hồng Sơn — Developer: HR (EHR1, EHR2, ORACLE-FIN)
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Nguyễn Hồng Sơn', 'son.nguyenhong13', 'son.nguyenhong13@vib.com.vn',
       'Developer', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'EHR1-2026',
    'EHR2-2026',
    'ORACLE-FIN-2026'
])
ON CONFLICT DO NOTHING;

-- Nguyễn Văn Quỳnh — QA: HR (COACHING, CORNERSTONE, EHR2), RETAIL
INSERT INTO project_members (id, project_id, full_name, alias, email, role, is_active)
SELECT gen_random_uuid(), p.id,
       'Nguyễn Văn Quỳnh', 'quynh.nguyenvan1', 'quynh.nguyenvan1@vib.com.vn',
       'QA', true
FROM projects p
WHERE p.code = ANY(ARRAY[
    'COACHING-2026',
    'CORNERSTONE-2026',
    'EHR2-2026',
    'SMART-SH-2026'
])
ON CONFLICT DO NOTHING;


-- ============================================================
-- PART 3 — BA TASKS per milestone
-- assigned_to: completed milestones → Lê Đức Tin (BA Lead)
--              in_progress milestones → Hoàng Thị Hòa (BA)
--              planned milestones    → NULL
-- due_date: milestone end_date
-- ============================================================

INSERT INTO ba_tasks (
    id, project_id, milestone_id, task_type,
    title, status, assigned_to, due_date
)
SELECT
    gen_random_uuid(),
    p.id,
    m.id,
    m.milestone_type,
    task.title,
    'pending',
    CASE m.status
        WHEN 'completed'   THEN 'Lê Đức Tin'
        WHEN 'in_progress' THEN 'Hoàng Thị Hòa'
        ELSE NULL
    END,
    m.end_date
FROM projects p
JOIN project_milestones m
    ON m.project_id = p.id AND m.track = 'project'
JOIN (VALUES
    -- kickoff
    ('kickoff', 'Chuẩn bị agenda kickoff'),
    ('kickoff', 'Xác nhận scope và mục tiêu dự án'),
    ('kickoff', 'Setup cấu trúc thư mục dự án'),
    -- requirements
    ('requirements', 'Thu thập yêu cầu nghiệp vụ từ stakeholder'),
    ('requirements', 'Phân tích As-Is Process'),
    ('requirements', 'Viết Business Requirement Document (BRD)'),
    ('requirements', 'Review và sign-off BRD'),
    -- design
    ('design', 'Thiết kế giải pháp kỹ thuật'),
    ('design', 'Viết Functional Requirement Specification (FRS)'),
    ('design', 'Review thiết kế với team DEV'),
    -- development
    ('development', 'Theo dõi tiến độ phát triển theo sprint'),
    ('development', 'Ghi nhận và xử lý Change Request'),
    -- sit
    ('sit', 'Chuẩn bị test case SIT'),
    ('sit', 'Hỗ trợ team DEV fix defect'),
    ('sit', 'Báo cáo kết quả SIT'),
    -- uat
    ('uat', 'Hỗ trợ business thực hiện UAT'),
    ('uat', 'Thu thập và xử lý feedback UAT'),
    ('uat', 'Lấy sign-off UAT'),
    -- golive
    ('golive', 'Checklist Go-Live'),
    ('golive', 'Xác nhận Go/No-Go decision'),
    -- closure
    ('closure', 'Chuẩn bị biên bản bàn giao'),
    ('closure', 'Viết Lessons Learned'),
    ('closure', 'Lưu trữ tài liệu dự án')
) AS task(phase, title)
    ON task.phase = m.milestone_type
WHERE p.code = ANY(ARRAY[
    'IA2-2026','LAOS-AI-2026','UDATALAKE-2026',
    'ASSET-MGT-2026','ECONTRACT-PD-2026','ESD-PORTAL-2026',
    'TRAVEL-DESK-2026','EMS2-UPG-2026','FINNFLOW-2026',
    'COACHING-2026','CORNERSTONE-2026','ECONTRACT-HR-2026',
    'EHR1-2026','EHR2-2026','EINVOICE-2026',
    'ORACLE-FIN-2026','VIB-GIFT-2026','IT-ASSET-2026',
    'REMOTE-SIGN-2026','SMART-SH-2026'
])
ON CONFLICT DO NOTHING;


-- ============================================================
-- PART 4 — DOCUMENT TEMPLATE RECORDS (project_files)
-- file_type = 'template' | status = 'draft' | current_version = '1.0'
-- storage_path = 00Project/project/{milestone_type}/{filename}
-- ============================================================

INSERT INTO project_files (
    id, project_id, milestone_id, name,
    file_type, doc_category, current_version,
    storage_path, status
)
SELECT
    gen_random_uuid(),
    p.id,
    m.id,
    doc.filename,
    'template',
    m.milestone_type,
    '1.0',
    '00Project/project/' || m.milestone_type || '/' || doc.filename,
    'draft'
FROM projects p
JOIN project_milestones m
    ON m.project_id = p.id AND m.track = 'project'
JOIN (VALUES
    -- kickoff
    ('kickoff', 'Project_Charter.md'),
    ('kickoff', 'RACI_Matrix.md'),
    ('kickoff', 'Meeting_Minutes_Kickoff.md'),
    ('kickoff', 'Stakeholder_Register.md'),
    -- requirements
    ('requirements', 'BRD.md'),
    ('requirements', 'Business_Case.md'),
    ('requirements', 'High_Level_Scope.md'),
    -- design
    ('design', 'FRS.md'),
    ('design', 'API_Spec.md'),
    ('design', 'Data_Dictionary.md'),
    ('design', 'Use_Case_Detail.md'),
    -- development
    ('development', 'Sprint_Plan.md'),
    ('development', 'Clarification_Log.md'),
    -- sit
    ('sit', 'Test_Plan_SIT.md'),
    ('sit', 'SIT_Summary_Report.md'),
    ('sit', 'Defect_Log.md'),
    ('sit', 'Test_Case_Detail.md'),
    -- uat
    ('uat', 'UAT_Plan.md'),
    ('uat', 'UAT_Test_Cases.md'),
    ('uat', 'UAT_Signoff.md'),
    -- golive
    ('golive', 'Deployment_Plan.md'),
    ('golive', 'Release_Checklist.md'),
    ('golive', 'Rollback_Plan.md'),
    -- closure
    ('closure', 'Project_Closure_Report.md'),
    ('closure', 'Lessons_Learned.md'),
    ('closure', 'Handover_Document.md')
) AS doc(phase, filename)
    ON doc.phase = m.milestone_type
WHERE p.code = ANY(ARRAY[
    'IA2-2026','LAOS-AI-2026','UDATALAKE-2026',
    'ASSET-MGT-2026','ECONTRACT-PD-2026','ESD-PORTAL-2026',
    'TRAVEL-DESK-2026','EMS2-UPG-2026','FINNFLOW-2026',
    'COACHING-2026','CORNERSTONE-2026','ECONTRACT-HR-2026',
    'EHR1-2026','EHR2-2026','EINVOICE-2026',
    'ORACLE-FIN-2026','VIB-GIFT-2026','IT-ASSET-2026',
    'REMOTE-SIGN-2026','SMART-SH-2026'
])
ON CONFLICT DO NOTHING;
