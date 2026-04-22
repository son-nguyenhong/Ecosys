-- ============================================================
-- V031 — Catalog Seed: Internal Users
-- 14 nhân viên nội bộ VIB
-- Nguồn: danh sách nhân viên từ Active Directory / HR system
-- Fields: employee_id = CODE, full_name = FULLNAME, email = EMAIL
--         position = POSNAME (truncated in source — mapped best-effort)
--         notes lưu LOGINNAME + FULLNAMEEN để tra cứu
-- ============================================================

INSERT INTO catalog_users (
    employee_id,
    full_name,
    email,
    user_type,
    status,
    position,
    notes
) VALUES
--                  CODE    FULLNAME                        EMAIL                               TYPE        STATUS    POSNAME                    NOTES
('56476', 'Hoàng Thị Hòa',         'hoa.hoang1@vib.com.vn',       'internal', 'active', 'Chuyên viên',  'LOGINNAME: hoa.hoang1 | EN_NAME: Hoang Thi Hoa'),
('35818', 'Lê Đức Tin',             'tin.leduc@vib.com.vn',         'internal', 'active', 'Chuyên gia',   'LOGINNAME: tin.leduc | EN_NAME: Le Duc Tin'),
('41601', 'Đặng Vũ Hiệp',           'hiep.dangvu@vib.com.vn',       'internal', 'active', 'Chuyên gia',   'LOGINNAME: hiep.dangvu | EN_NAME: Dang Vu Hiep'),
('50383', 'Lê Đình Dũng',           'dung.ledinh4@vib.com.vn',      'internal', 'active', 'Chuyên viên',  'LOGINNAME: dung.ledinh4 | EN_NAME: Le Dinh Dung'),
('42406', 'Dương Danh Phương',      'phuong.duongdanh@vib.com.vn',  'internal', 'active', 'Chuyên gia',   'LOGINNAME: phuong.duongdanh | EN_NAME: Duong Danh Phuong'),
('54753', 'Nguyễn Hồng Sơn',        'son.nguyenhong13@vib.com.vn',  'internal', 'active', 'Chuyên viên',  'LOGINNAME: son.nguyenhong13 | EN_NAME: Nguyen Hong Son'),
('54456', 'Chu Việt Hồng',          'hong.chuviet@vib.com.vn',      'internal', 'active', 'Chuyên viên',  'LOGINNAME: hong.chuviet | EN_NAME: Chu Viet Hong'),
('34946', 'Ngô Thị Thúy Nga',       'nga.ngothuy@vib.com.vn',       'internal', 'active', 'Chuyên viên',  'LOGINNAME: nga.ngothuy | EN_NAME: Ngo Thi Thuy Nga'),
('46299', 'Kim Sơn Quang',          'quang.kimson@vib.com.vn',      'internal', 'active', 'Chuyên gia',   'LOGINNAME: quang.kimson | EN_NAME: Kim Son Quang'),
('42056', 'Hoàng Thế Vinh',         'vinh.hoangthe@vib.com.vn',     'internal', 'active', 'Chuyên viên',  'LOGINNAME: vinh.hoangthe | EN_NAME: Hoang The Vinh'),
('45159', 'Nguyễn Văn Quỳnh',       'quynh.nguyenvan1@vib.com.vn',  'internal', 'active', 'Chuyên viên',  'LOGINNAME: quynh.nguyenvan1 | EN_NAME: Nguyen Van Quynh'),
('37407', 'Trương Hoàng Nam Cường', 'cuong.truonghoang@vib.com.vn', 'internal', 'active', 'Giám đốc',     'LOGINNAME: cuong.truonghoang | EN_NAME: Truong Hoang Nam Cuong'),
('16609', 'Nhữ Tuấn Anh',           'anh.nhutuan@vib.com.vn',       'internal', 'active', 'Giám đốc',     'LOGINNAME: anh.nhutuan | EN_NAME: Nhu Tuan Anh'),
('42886', 'Man Ngọc Lam',           'lam.manngoc@vib.com.vn',       'internal', 'active', 'Chuyên viên',  'LOGINNAME: lam.manngoc | EN_NAME: Man Ngoc Lam')

ON CONFLICT (employee_id) DO UPDATE SET
    full_name  = EXCLUDED.full_name,
    email      = EXCLUDED.email,
    position   = EXCLUDED.position,
    notes      = EXCLUDED.notes,
    updated_at = NOW();
