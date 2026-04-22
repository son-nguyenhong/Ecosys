-- ============================================================
-- V035 — test_defects: bảng theo dõi defect từ quá trình test
-- ============================================================

CREATE TABLE IF NOT EXISTS test_defects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
    title         VARCHAR(500) NOT NULL,
    severity      VARCHAR(20)  NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('critical','high','medium','low')),
    status        VARCHAR(30)  NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved','closed','reopened')),
    found_in_env  VARCHAR(20)  NOT NULL DEFAULT 'SIT'
                    CHECK (found_in_env IN ('DEV','SIT','UAT','PROD','STAGING')),
    found_in_phase VARCHAR(20) NOT NULL DEFAULT 'testing'
                    CHECK (found_in_phase IN ('development','testing','uat','production')),
    module        VARCHAR(200),
    test_case_id  UUID REFERENCES test_cases(id) ON DELETE SET NULL,
    assigned_to   VARCHAR(200),
    reported_by   VARCHAR(200),
    reopen_count  INT NOT NULL DEFAULT 0,
    resolved_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_defects_project   ON test_defects(project_id);
CREATE INDEX IF NOT EXISTS idx_test_defects_severity  ON test_defects(severity);
CREATE INDEX IF NOT EXISTS idx_test_defects_status    ON test_defects(status);

COMMENT ON TABLE test_defects IS 'Defect tracking — phát hiện trong quá trình test (SIT/UAT/PROD)';

-- ── Seed data — 20 defects phân bổ realistic ───────────────────────────────

INSERT INTO test_defects (title, severity, status, found_in_env, found_in_phase, module, reported_by, assigned_to, reopen_count, resolved_at) VALUES
-- Critical
('Crash khi đăng nhập bằng tài khoản có ký tự đặc biệt',                       'critical', 'resolved',    'SIT',     'testing',     'Login',            'QA Team', 'Dev Team', 1, NOW() - INTERVAL '5 days'),
('Mất dữ liệu transaction khi đóng trình duyệt đột ngột',                       'critical', 'closed',      'UAT',     'uat',          'Transaction',      'QA Team', 'Dev Team', 0, NOW() - INTERVAL '10 days'),
('Token không expire sau 30 phút — lỗ hổng bảo mật',                           'critical', 'resolved',    'SIT',     'testing',      'Session Management','QA Team', 'Dev Team', 0, NOW() - INTERVAL '3 days'),
-- High
('Livecheck không nhận diện được khuôn mặt đeo kính',                          'high',     'open',        'SIT',     'testing',      'Liveness Detection','QA Team', 'Dev Team', 0, NULL),
('Dashboard không load khi có >1000 records',                                   'high',     'in_progress', 'SIT',     'testing',      'Dashboard',         'QA Team', 'Dev Team', 1, NULL),
('Export Excel bị lỗi encoding với tên tiếng Việt',                            'high',     'resolved',    'UAT',     'uat',          'Document Capture',  'QA Team', 'Dev Team', 0, NOW() - INTERVAL '7 days'),
('RBAC: Role Viewer vẫn truy cập được endpoint Admin',                         'high',     'resolved',    'SIT',     'testing',      'RBAC',              'QA Team', 'Dev Team', 2, NOW() - INTERVAL '8 days'),
('Database lookup trả về kết quả sai khi search theo số CCCD',                 'high',     'closed',      'SIT',     'testing',      'Database Lookup',   'QA Team', 'Dev Team', 0, NOW() - INTERVAL '15 days'),
('Lỗi performance: API response >5s khi concurrent 50 users',                  'high',     'open',        'UAT',     'uat',          'Performance',       'QA Team', 'Dev Team', 0, NULL),
-- Medium
('Button "Tải xuống" không hiển thị trên Safari',                              'medium',   'resolved',    'SIT',     'testing',      'Document Capture',  'QA Team', 'Dev Team', 0, NOW() - INTERVAL '12 days'),
('Thông báo lỗi không đủ thông tin khi login sai mật khẩu',                   'medium',   'closed',      'SIT',     'testing',      'Login',             'QA Team', 'Dev Team', 0, NOW() - INTERVAL '20 days'),
('Pagination không reset về trang 1 khi thay đổi filter',                      'medium',   'resolved',    'SIT',     'testing',      'Dashboard',         'QA Team', 'Dev Team', 1, NOW() - INTERVAL '6 days'),
('Tooltip hiển thị sai language khi chuyển locale',                            'medium',   'open',        'SIT',     'testing',      'Dashboard',         'QA Team', 'Dev Team', 0, NULL),
('Session countdown timer không đồng bộ giữa tabs',                           'medium',   'resolved',    'UAT',     'uat',          'Session Management','QA Team', 'Dev Team', 0, NOW() - INTERVAL '4 days'),
('Liveness detection: ánh sáng yếu gây false negative',                       'medium',   'in_progress', 'SIT',     'testing',      'Liveness Detection','QA Team', 'Dev Team', 0, NULL),
-- Low
('Font chữ không nhất quán giữa màn hình login và dashboard',                 'low',      'closed',      'SIT',     'testing',      'Login',             'QA Team', 'Dev Team', 0, NOW() - INTERVAL '25 days'),
('Hover effect chậm 0.3s trên mobile',                                        'low',      'closed',      'SIT',     'testing',      'Dashboard',         'QA Team', 'Dev Team', 0, NOW() - INTERVAL '22 days'),
('Breadcrumb không hiển thị đúng khi URL chứa query param',                   'low',      'open',        'SIT',     'testing',      'Dashboard',         'QA Team', 'Dev Team', 0, NULL),
('Ảnh avatar bị méo trên màn hình 4K',                                        'low',      'resolved',    'SIT',     'testing',      'Dashboard',         'QA Team', 'Dev Team', 0, NOW() - INTERVAL '18 days'),
-- Production leakage (tìm thấy ở PROD)
('Lỗi timeout API tại giờ cao điểm buổi tối',                                 'high',     'resolved',    'PROD',    'production',   'Performance',       'Ops Team','Dev Team', 1, NOW() - INTERVAL '2 days');
