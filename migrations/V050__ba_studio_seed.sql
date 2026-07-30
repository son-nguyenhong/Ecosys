-- ============================================================
-- V050 — BA Studio seed: 7 Master Doc + sections + versions, 8 CR tài liệu + ops
--
-- Map vào 7 dự án THẬT đã có trong DB (V033): EMS2-UPG-2026, ORACLE-FIN-2026,
-- UDATALAKE-2026, ECONTRACT-PD-2026, SMART-SH-2026, LAOS-AI-2026, FINNFLOW-2026.
-- owner/reviewer dùng full_name của nhân sự thật trong catalog_users (V031)
-- để khớp với UserSelect trên UI.
--
-- Snapshot v1.0 và v2.0 KHÔNG gõ tay: sinh bằng jsonb_agg từ ba_doc_sections,
-- và bản v2.0 của EMS2 được tạo bằng cách SQL tự áp ops của PCR-EMS2-05.
-- → snapshot luôn nhất quán với ops, không lệch do copy tay.
--
-- Idempotent: ON CONFLICT DO NOTHING + xoá trước ops/history của đúng 8 mã CR seed.
-- ============================================================

BEGIN;

-- ── 0. Dọn phần không có unique key để migration chạy lại được ────
DELETE FROM ba_doc_cr_ops
 WHERE pcr_id IN (SELECT id FROM project_change_requests
                   WHERE request_code IN ('PCR-EMS2-05','PCR-EMS2-01','PCR-ORACLE-02',
                                          'PCR-UDATALAKE-03','PCR-ECONTRACT-04',
                                          'PCR-SMART-06','PCR-LAOS-07','PCR-FINNFLOW-08'));
DELETE FROM request_history
 WHERE ref_type = 'pcr'
   AND ref_id IN (SELECT id FROM project_change_requests
                   WHERE request_code IN ('PCR-EMS2-05','PCR-EMS2-01','PCR-ORACLE-02',
                                          'PCR-UDATALAKE-03','PCR-ECONTRACT-04',
                                          'PCR-SMART-06','PCR-LAOS-07','PCR-FINNFLOW-08'));

-- ── 1. Master Docs ───────────────────────────────────────────────
INSERT INTO ba_master_docs (doc_code, project_id, doc_type, title, abbr, owner,
                            base_version, base_date, base_note, current_version, created_by)
SELECT 'doc-ems2-brs', p.id, 'BRS',
       'BRS — Nâng cấp Hệ thống Quản lý Chi tiêu (EMS 2.0)',
       'Business Requirements Specification', 'Hoàng Thị Hòa',
       'v1.0', DATE '2026-05-20', 'Khởi tạo tài liệu BRS ban đầu cho phạm vi EMS 2.0.', 'v1.0', 'seed'
  FROM projects p WHERE p.code = 'EMS2-UPG-2026'
ON CONFLICT (doc_code) DO NOTHING;

INSERT INTO ba_master_docs (doc_code, project_id, doc_type, title, abbr, owner,
                            base_version, base_date, base_note, current_version, created_by)
SELECT 'doc-oracle-brs', p.id, 'BRS',
       'BRS — Hệ thống Tài chính Oracle Financial',
       'Business Requirements Specification', 'Ngô Thị Thúy Nga',
       'v1.0', DATE '2026-02-20', 'Khởi tạo BRS cho triển khai Oracle Financial.', 'v1.0', 'seed'
  FROM projects p WHERE p.code = 'ORACLE-FIN-2026'
ON CONFLICT (doc_code) DO NOTHING;

INSERT INTO ba_master_docs (doc_code, project_id, doc_type, title, abbr, owner,
                            base_version, base_date, base_note, current_version, created_by)
SELECT 'doc-datalake-brs', p.id, 'BRS',
       'BRS — User Activity Data Lake & Journey Analytics',
       'Business Requirements Specification', 'Man Ngọc Lam',
       'v1.0', DATE '2026-06-15', 'Khởi tạo BRS cho nền tảng Data Lake hành vi người dùng.', 'v1.0', 'seed'
  FROM projects p WHERE p.code = 'UDATALAKE-2026'
ON CONFLICT (doc_code) DO NOTHING;

INSERT INTO ba_master_docs (doc_code, project_id, doc_type, title, abbr, owner,
                            base_version, base_date, base_note, current_version, created_by)
SELECT 'doc-econtract-fsd', p.id, 'FSD',
       'FSD — Hợp đồng điện tử e-contract PD',
       'Functional Specification Document', 'Hoàng Thị Hòa',
       'v1.0', DATE '2026-06-30', 'Khởi tạo FSD cho hợp đồng điện tử khối PD.', 'v1.0', 'seed'
  FROM projects p WHERE p.code = 'ECONTRACT-PD-2026'
ON CONFLICT (doc_code) DO NOTHING;

INSERT INTO ba_master_docs (doc_code, project_id, doc_type, title, abbr, owner,
                            base_version, base_date, base_note, current_version, created_by)
SELECT 'doc-smartsh-brs', p.id, 'BRS',
       'BRS — Hệ thống Cổ đông Smart Shareholder',
       'Business Requirements Specification', 'Man Ngọc Lam',
       'v1.0', DATE '2026-07-04', 'Khởi tạo BRS cho hệ thống quản lý cổ đông.', 'v1.0', 'seed'
  FROM projects p WHERE p.code = 'SMART-SH-2026'
ON CONFLICT (doc_code) DO NOTHING;

INSERT INTO ba_master_docs (doc_code, project_id, doc_type, title, abbr, owner,
                            base_version, base_date, base_note, current_version, created_by)
SELECT 'doc-laos-brs', p.id, 'BRS',
       'BRS — Trợ lý AI Tuân thủ GC Laos',
       'Business Requirements Specification', 'Hoàng Thị Hòa',
       'v1.0', DATE '2026-06-26', 'Khởi tạo BRS cho trợ lý AI hỗ trợ tuân thủ tại Lào.', 'v1.0', 'seed'
  FROM projects p WHERE p.code = 'LAOS-AI-2026'
ON CONFLICT (doc_code) DO NOTHING;

INSERT INTO ba_master_docs (doc_code, project_id, doc_type, title, abbr, owner,
                            base_version, base_date, base_note, current_version, created_by)
SELECT 'doc-finnflow-fsd', p.id, 'FSD',
       'FSD — Nền tảng Quy trình FinnFlow',
       'Functional Specification Document', 'Ngô Thị Thúy Nga',
       'v1.0', DATE '2026-07-08', 'Khởi tạo FSD cho nền tảng workflow FinnFlow.', 'v1.0', 'seed'
  FROM projects p WHERE p.code = 'FINNFLOW-2026'
ON CONFLICT (doc_code) DO NOTHING;

-- ── 2. Sections (nội dung bản gốc v1.0) ──────────────────────────
-- 2.1 EMS 2.0 — 8 mục, tài liệu "flagship" để demo diff
INSERT INTO ba_doc_sections (doc_id, section_key, heading, body, sort_order)
SELECT d.id, v.k, v.h, v.b, v.o FROM ba_master_docs d CROSS JOIN (VALUES
 ('s1','Mục tiêu & phạm vi','Nâng cấp hệ thống EMS (Expense Management System) lên phiên bản 2.0 nhằm tối ưu quy trình quản lý chi tiêu nội bộ cho khối Vận hành (PS). Phạm vi bao gồm quản lý đề nghị thanh toán (PR/PP/VSP), quy trình phê duyệt và đối soát ngân sách theo quý. Không bao gồm tích hợp với hệ thống thu hồi nợ ở giai đoạn này.',1),
 ('s2','Các bên liên quan','Chủ đầu tư là Khối Vận hành (PS). Người dùng chính gồm nhân viên lập đề nghị, kế toán và các cấp phê duyệt. Đội phát triển và QA thuộc Khối Công nghệ (BTS) chịu trách nhiệm xây dựng và kiểm thử.',2),
 ('s3','Yêu cầu nghiệp vụ tổng quan','Hệ thống cho phép tạo, chỉnh sửa và theo dõi đề nghị chi tiêu theo từng phòng ban; hỗ trợ phân loại PR (Purchase Request), PP (Payment Proposal) và VSP. Mọi giao dịch phải có nhật ký kiểm toán đầy đủ và không thể xoá cứng.',3),
 ('s4','Quy trình phê duyệt PO','Đề nghị mua sắm (PO) được phê duyệt qua một cấp là trưởng phòng phụ trách. Sau khi được phê duyệt, PO chuyển sang bộ phận kế toán để xử lý thanh toán.',4),
 ('s5','Quản lý ngân sách & chi tiêu','Hệ thống theo dõi ngân sách phân bổ theo quý cho từng phòng ban, cảnh báo khi mức chi vượt 80% ngân sách và khoá tạo mới đề nghị khi vượt 100%. Cho phép điều chuyển ngân sách nội bộ giữa các phòng theo phê duyệt.',5),
 ('s6','Yêu cầu tích hợp hệ thống','EMS 2.0 tích hợp với ESD Portal để đồng bộ danh mục nhà cung cấp và với hệ thống kế toán lõi để hạch toán chi phí. Việc trao đổi dữ liệu thực hiện qua API nội bộ theo chuẩn REST, có xác thực và ghi log giao dịch.',6),
 ('s7','Báo cáo & Dashboard','Cung cấp dashboard tổng hợp chi tiêu theo phòng ban, theo quý và theo loại đề nghị; cho phép lọc theo trạng thái và xuất báo cáo Excel/PDF phục vụ đối soát.',7),
 ('s8','Tiêu chí nghiệm thu','Toàn bộ luồng tạo — phê duyệt — thanh toán chạy thông suốt trên môi trường UAT; hiệu năng đáp ứng tối thiểu 200 người dùng đồng thời; số liệu đối soát ngân sách khớp 100% với hệ thống kế toán.',8)
) AS v(k,h,b,o) WHERE d.doc_code = 'doc-ems2-brs'
ON CONFLICT (doc_id, section_key) DO NOTHING;

-- 2.2 Oracle Financial
INSERT INTO ba_doc_sections (doc_id, section_key, heading, body, sort_order)
SELECT d.id, v.k, v.h, v.b, v.o FROM ba_master_docs d CROSS JOIN (VALUES
 ('s1','Mục tiêu & phạm vi','Triển khai nền tảng Oracle Financial làm hệ thống sổ cái (GL) tập trung, thay thế các module tài chính rời rạc. Phạm vi gồm sổ cái, công nợ phải trả/phải thu và hợp nhất báo cáo tài chính.',1),
 ('s2','Yêu cầu chức năng chính','Hệ thống hỗ trợ hạch toán đa tiền tệ, quản lý kỳ kế toán, khoá sổ định kỳ và đối soát tự động với các hệ vệ tinh. Cung cấp bộ báo cáo tài chính chuẩn và tuỳ biến.',2),
 ('s3','Yêu cầu tích hợp','Oracle Financial nhận dữ liệu giao dịch từ Neon Core qua API tài khoản GL và đồng bộ danh mục đối tượng kế toán. Giao diện tích hợp theo lô hàng ngày và bổ sung đồng bộ gần thời gian thực cho một số nghiệp vụ trọng yếu.',3),
 ('s4','Kế hoạch triển khai & UAT','Giai đoạn UAT dự kiến bắt đầu tuần đầu tháng 8 và kéo dài 3 tuần, phụ thuộc lịch bàn giao API từ đối tác Neon Core. Go-live dự kiến cuối Q3.',4),
 ('s5','Ràng buộc & giả định','Giả định đối tác Neon Core bàn giao đặc tả API tài khoản GL đúng hạn. Ràng buộc: dữ liệu tài chính phải tuân thủ quy định lưu trữ và kiểm toán nội bộ.',5)
) AS v(k,h,b,o) WHERE d.doc_code = 'doc-oracle-brs'
ON CONFLICT (doc_id, section_key) DO NOTHING;

-- 2.3 Data Lake
INSERT INTO ba_doc_sections (doc_id, section_key, heading, body, sort_order)
SELECT d.id, v.k, v.h, v.b, v.o FROM ba_master_docs d CROSS JOIN (VALUES
 ('s1','Mục tiêu & phạm vi','Xây dựng Data Lake tập trung thu thập dữ liệu hành vi người dùng trên các kênh số. Phạm vi giai đoạn 1 gồm thu thập sự kiện, chuẩn hoá và lưu trữ; chưa bao gồm phân tích hành trình khách hàng chuyên sâu.',1),
 ('s2','Nguồn dữ liệu','Thu thập sự kiện từ ứng dụng di động, internet banking và website. Dữ liệu được nạp qua pipeline streaming và batch, gắn định danh ẩn danh theo chuẩn bảo mật.',2),
 ('s3','Hạ tầng & ngân sách','Sử dụng hạ tầng cloud với cụm lưu trữ và xử lý theo nhu cầu. Ngân sách hạ tầng giai đoạn 1 được phê duyệt ở mức cơ bản cho khối lượng dữ liệu dự kiến.',3),
 ('s4','Yêu cầu tuân thủ dữ liệu','Toàn bộ dữ liệu cá nhân phải được ẩn danh hoặc mã hoá; áp dụng chính sách phân quyền truy cập theo vai trò và ghi nhật ký truy xuất.',4),
 ('s5','Tiêu chí nghiệm thu','Pipeline nạp dữ liệu ổn định với độ trễ trong ngưỡng cho phép; dữ liệu chuẩn hoá đầy đủ trường bắt buộc; vượt qua đánh giá bảo mật và tuân thủ.',5)
) AS v(k,h,b,o) WHERE d.doc_code = 'doc-datalake-brs'
ON CONFLICT (doc_id, section_key) DO NOTHING;

-- 2.4 e-contract PD
INSERT INTO ba_doc_sections (doc_id, section_key, heading, body, sort_order)
SELECT d.id, v.k, v.h, v.b, v.o FROM ba_master_docs d CROSS JOIN (VALUES
 ('s1','Tổng quan chức năng','Hệ thống cho phép khởi tạo, ký số và lưu trữ hợp đồng điện tử theo mẫu chuẩn. Hỗ trợ luồng ký nhiều bên và theo dõi trạng thái hợp đồng theo thời gian thực.',1),
 ('s2','Luồng ký số','Hợp đồng được ký số sử dụng HSM đặt tại on-premise. Người dùng xác thực trước khi ký, chữ ký số gắn dấu thời gian và được kiểm tra tính toàn vẹn khi lưu trữ.',2),
 ('s3','Yêu cầu phi chức năng & bảo mật','Hệ thống đáp ứng yêu cầu sẵn sàng cao cho dịch vụ ký; toàn bộ khoá ký được quản lý trong HSM. Nhật ký ký số bất biến phục vụ tra soát và pháp lý.',3),
 ('s4','Quản lý vòng đời hợp đồng','Hỗ trợ các trạng thái: nháp, chờ ký, đã ký, hết hiệu lực và huỷ. Cho phép gia hạn và lưu vết đầy đủ mọi thay đổi trạng thái.',4),
 ('s5','Tiêu chí nghiệm thu','Luồng ký nhiều bên hoàn tất đúng thứ tự; chữ ký số vượt kiểm tra hợp lệ; hệ thống chịu tải ký đồng thời theo mục tiêu đề ra.',5)
) AS v(k,h,b,o) WHERE d.doc_code = 'doc-econtract-fsd'
ON CONFLICT (doc_id, section_key) DO NOTHING;

-- 2.5 Smart Shareholder
INSERT INTO ba_doc_sections (doc_id, section_key, heading, body, sort_order)
SELECT d.id, v.k, v.h, v.b, v.o FROM ba_master_docs d CROSS JOIN (VALUES
 ('s1','Mục tiêu & phạm vi','Xây dựng hệ thống quản lý cổ đông tập trung, hỗ trợ tra cứu thông tin, quản lý sổ cổ đông và phục vụ Đại hội đồng cổ đông trực tuyến.',1),
 ('s2','Di trú dữ liệu cổ đông','Dữ liệu cổ đông được di trú từ hệ thống cũ. Đội dự án hiện có một cán bộ phụ trách trích xuất và nạp dữ liệu, đối soát thủ công theo lô.',2),
 ('s3','Yêu cầu chức năng','Hỗ trợ quản lý danh mục cổ đông, lịch sử sở hữu, chi trả cổ tức và biểu quyết điện tử. Cung cấp cổng thông tin tra cứu cho cổ đông.',3),
 ('s4','Kế hoạch & nguồn lực','Kế hoạch triển khai chia làm hai giai đoạn. Nguồn lực hiện tại tập trung cho xây dựng chức năng lõi; công tác di trú dữ liệu dựa trên nguồn lực sẵn có của dự án.',4),
 ('s5','Tiêu chí nghiệm thu','Dữ liệu cổ đông di trú đầy đủ và khớp đối soát; các chức năng lõi hoạt động ổn định; cổng tra cứu đáp ứng yêu cầu bảo mật.',5)
) AS v(k,h,b,o) WHERE d.doc_code = 'doc-smartsh-brs'
ON CONFLICT (doc_id, section_key) DO NOTHING;

-- 2.6 GC Laos AI
INSERT INTO ba_doc_sections (doc_id, section_key, heading, body, sort_order)
SELECT d.id, v.k, v.h, v.b, v.o FROM ba_master_docs d CROSS JOIN (VALUES
 ('s1','Mục tiêu & phạm vi','Xây dựng trợ lý AI hỗ trợ tra cứu quy định và nghiệp vụ tuân thủ cho chi nhánh Lào. Giai đoạn 1 tập trung hỏi đáp quy định nội bộ, hỗ trợ đa ngôn ngữ (Việt, Anh, Lào).',1),
 ('s2','Yêu cầu chức năng','Trợ lý trả lời câu hỏi dựa trên kho tri thức tuân thủ, trích dẫn nguồn và cho phép người dùng phản hồi độ chính xác. Có vòng kiểm duyệt của con người trước khi công bố nội dung nhạy cảm.',2),
 ('s3','Hỗ trợ đa ngôn ngữ','Hệ thống hỗ trợ ba ngôn ngữ Việt, Anh và Lào ngay từ giai đoạn 1, bao gồm nhận câu hỏi và trả lời theo ngôn ngữ người dùng lựa chọn.',3),
 ('s4','Ràng buộc tuân thủ dữ liệu','Dữ liệu xử lý phải tuân thủ quy định pháp lý địa phương về dữ liệu xuyên biên giới; kho tri thức được kiểm soát phiên bản và phân quyền.',4),
 ('s5','Tiêu chí nghiệm thu','Trợ lý trả lời chính xác trên bộ câu hỏi mẫu đạt ngưỡng mục tiêu; trích dẫn nguồn đúng; vượt đánh giá tuân thủ pháp lý.',5)
) AS v(k,h,b,o) WHERE d.doc_code = 'doc-laos-brs'
ON CONFLICT (doc_id, section_key) DO NOTHING;

-- 2.7 FinnFlow
INSERT INTO ba_doc_sections (doc_id, section_key, heading, body, sort_order)
SELECT d.id, v.k, v.h, v.b, v.o FROM ba_master_docs d CROSS JOIN (VALUES
 ('s1','Tổng quan chức năng','FinnFlow là nền tảng số hoá và tự động hoá quy trình nghiệp vụ tài chính, cho phép cấu hình luồng phê duyệt linh hoạt không cần lập trình lại.',1),
 ('s2','Workflow engine','Hệ thống sử dụng workflow engine tự xây dựng nội bộ để điều phối các bước nghiệp vụ, định tuyến và phân công công việc theo cấu hình.',2),
 ('s3','Yêu cầu phi chức năng','Nền tảng đáp ứng yêu cầu mở rộng theo tải, độ sẵn sàng cao và khả năng theo dõi trạng thái từng tiến trình. Toàn bộ thao tác được ghi nhật ký.',3),
 ('s4','Tích hợp & mở rộng','FinnFlow cung cấp API để các hệ thống nghiệp vụ khởi tạo và theo dõi tiến trình; hỗ trợ webhook thông báo trạng thái.',4),
 ('s5','Tiêu chí nghiệm thu','Cấu hình một quy trình mẫu end-to-end chạy thông suốt; hệ thống chịu tải mục tiêu; nhật ký tiến trình đầy đủ và truy vết được.',5)
) AS v(k,h,b,o) WHERE d.doc_code = 'doc-finnflow-fsd'
ON CONFLICT (doc_id, section_key) DO NOTHING;

-- ── 3. Snapshot bản gốc v1.0 (sinh từ sections, không gõ tay) ────
INSERT INTO ba_doc_versions (doc_id, version_label, seq, kind, source_cr_id, note,
                             released_on, released_by, sections)
SELECT d.id, d.base_version, 1, 'base', NULL, d.base_note, d.base_date, d.owner,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('section_key', s.section_key,
                                                    'heading',     s.heading,
                                                    'body',        s.body)
                                  ORDER BY s.sort_order)
                   FROM ba_doc_sections s WHERE s.doc_id = d.id), '[]'::jsonb)
  FROM ba_master_docs d
 WHERE d.doc_code IN ('doc-ems2-brs','doc-oracle-brs','doc-datalake-brs','doc-econtract-fsd',
                      'doc-smartsh-brs','doc-laos-brs','doc-finnflow-fsd')
ON CONFLICT (doc_id, version_label) DO NOTHING;

-- ── 4. CR tài liệu (ghi vào sổ CR dùng chung) ────────────────────
-- 4.1 PCR-EMS2-05 — ĐÃ MERGE (sinh ra v2.0 ở bước 6)
INSERT INTO project_change_requests
  (request_code, project_id, title, description, change_type, priority, status,
   impact_scope, requested_by, reviewer, assigned_to, approved_by, approved_at,
   reviewed_at, notes, target_doc_id, merge_state, merged_version, merged_at,
   acceptance, dependencies, created_at, updated_at)
SELECT 'PCR-EMS2-05', d.project_id,
       'Điều chỉnh quy trình phê duyệt PO đa cấp theo policy mới',
       'Cập nhật luồng ký duyệt PO nhiều cấp theo hạn mức giá trị, tuân thủ policy phê duyệt mới của Khối Vận hành.',
       'process', 'medium', 'implemented',
       'Ảnh hưởng module phê duyệt và cấu hình định tuyến; không thay đổi mô hình dữ liệu. Khối lượng nhỏ, đã triển khai trong sprint hiện hành.',
       'Hoàng Thị Hòa', 'Ngô Thị Thúy Nga', 'Ngô Thị Thúy Nga', 'Ngô Thị Thúy Nga',
       TIMESTAMPTZ '2026-06-18 10:00+07', TIMESTAMPTZ '2026-06-18 10:00+07',
       'Đã merge vào v2.0 — quy trình phê duyệt PO đa cấp theo policy mới.',
       d.id, 'merged', 'v2.0', TIMESTAMPTZ '2026-06-18 10:00+07',
       '["PO được định tuyến đúng cấp duyệt theo giá trị","Ghi nhật ký từng bước phê duyệt","Cấu hình hạn mức có thể thay đổi không cần deploy"]'::jsonb,
       '{}'::text[], TIMESTAMPTZ '2026-06-02 09:00+07', TIMESTAMPTZ '2026-06-18 10:00+07'
  FROM ba_master_docs d WHERE d.doc_code = 'doc-ems2-brs'
ON CONFLICT (request_code) DO NOTHING;

-- 4.2 PCR-EMS2-01 — CHỜ DUYỆT, đã phê duyệt nghiệp vụ (flagship demo diff)
INSERT INTO project_change_requests
  (request_code, project_id, title, description, change_type, priority, status,
   impact_scope, requested_by, reviewer, notes, target_doc_id, merge_state,
   acceptance, dependencies, created_at, updated_at)
SELECT 'PCR-EMS2-01', d.project_id,
       'Mở rộng scope tích hợp Collection Support System',
       'Hoàn thiện tích hợp thêm hệ thống Collection Support ngoài phạm vi ban đầu; đồng bộ trạng thái khoản thu và cảnh báo công nợ nhà cung cấp.',
       'scope', 'high', 'approved',
       'Ảnh hưởng module tích hợp, mô hình dữ liệu khoản thu và luồng cảnh báo thanh toán. Ước tính tăng khoảng 15 người-ngày, cần bổ sung 1 sprint và một môi trường sandbox cho Collection Support.',
       'Hoàng Thị Hòa', 'Ngô Thị Thúy Nga', '', d.id, 'pending',
       '["Đồng bộ trạng thái khoản thu hai chiều với Collection Support","Tự động cảnh báo và tạm giữ thanh toán khi có công nợ quá hạn","Báo cáo đối soát công nợ theo nhà cung cấp","Lịch sử đồng bộ đầy đủ phục vụ kiểm toán"]'::jsonb,
       ARRAY['PCR-UDATALAKE-03']::text[], TIMESTAMPTZ '2026-07-02 09:00+07', TIMESTAMPTZ '2026-07-02 09:00+07'
  FROM ba_master_docs d WHERE d.doc_code = 'doc-ems2-brs'
ON CONFLICT (request_code) DO NOTHING;

-- 4.3 PCR-ORACLE-02 — timeline, critical
INSERT INTO project_change_requests
  (request_code, project_id, title, description, change_type, priority, status,
   impact_scope, requested_by, reviewer, notes, target_doc_id, merge_state,
   acceptance, dependencies, created_at, updated_at)
SELECT 'PCR-ORACLE-02', d.project_id,
       'Điều chỉnh timeline UAT do phụ thuộc Neon Core',
       'Timeline UAT lùi 2 tuần do đối tác Neon Core chậm bàn giao API tài khoản GL.',
       'timeline', 'critical', 'approved',
       'Ảnh hưởng mốc UAT và go-live; cần điều chỉnh lịch nguồn lực QA. Không thay đổi phạm vi chức năng.',
       'Ngô Thị Thúy Nga', 'Nguyễn Hồng Sơn', '', d.id, 'pending',
       '["Lịch UAT phản ánh đúng phụ thuộc Neon Core","Mốc go-live cập nhật và được các bên xác nhận"]'::jsonb,
       '{}'::text[], TIMESTAMPTZ '2026-06-30 09:00+07', TIMESTAMPTZ '2026-06-30 09:00+07'
  FROM ba_master_docs d WHERE d.doc_code = 'doc-oracle-brs'
ON CONFLICT (request_code) DO NOTHING;

-- 4.4 PCR-UDATALAKE-03 — budget, đang review
INSERT INTO project_change_requests
  (request_code, project_id, title, description, change_type, priority, status,
   impact_scope, requested_by, reviewer, notes, target_doc_id, merge_state,
   acceptance, dependencies, created_at, updated_at)
SELECT 'PCR-UDATALAKE-03', d.project_id,
       'Bổ sung ngân sách hạ tầng và mở rộng phân tích hành trình',
       'Cần thêm storage và compute khi scope Data Lake mở rộng sang phân tích hành trình khách hàng.',
       'budget', 'high', 'reviewing',
       'Tăng ngân sách hạ tầng cloud giai đoạn 1; mở rộng phạm vi sang journey analytics. Cần rà soát lại kiến trúc lưu trữ.',
       'Man Ngọc Lam', 'Trương Hoàng Nam Cường', '', d.id, 'pending',
       '["Ngân sách hạ tầng bổ sung được phê duyệt","Phạm vi journey analytics được định nghĩa rõ trong tài liệu"]'::jsonb,
       ARRAY['PCR-EMS2-01']::text[], TIMESTAMPTZ '2026-06-28 09:00+07', TIMESTAMPTZ '2026-06-28 09:00+07'
  FROM ba_master_docs d WHERE d.doc_code = 'doc-datalake-brs'
ON CONFLICT (request_code) DO NOTHING;

-- 4.5 PCR-ECONTRACT-04 — technical, mới gửi
INSERT INTO project_change_requests
  (request_code, project_id, title, description, change_type, priority, status,
   impact_scope, requested_by, reviewer, notes, target_doc_id, merge_state,
   acceptance, dependencies, created_at, updated_at)
SELECT 'PCR-ECONTRACT-04', d.project_id,
       'Chuyển phương thức ký số sang HSM cloud',
       'Chuyển từ HSM on-premise sang HSM cloud để giảm chi phí vận hành và tăng tính sẵn sàng của dịch vụ ký.',
       'technical', 'medium', 'submitted',
       'Ảnh hưởng luồng ký số và yêu cầu phi chức năng về bảo mật; cần đánh giá bảo mật độc lập cho HSM cloud.',
       'Hoàng Thị Hòa', 'Kim Sơn Quang', '', d.id, 'pending',
       '["Ký số qua HSM cloud đạt yêu cầu hợp lệ chữ ký","Đáp ứng SLA sẵn sàng cao","Vượt đánh giá bảo mật độc lập"]'::jsonb,
       '{}'::text[], TIMESTAMPTZ '2026-07-05 09:00+07', TIMESTAMPTZ '2026-07-05 09:00+07'
  FROM ba_master_docs d WHERE d.doc_code = 'doc-econtract-fsd'
ON CONFLICT (request_code) DO NOTHING;

-- 4.6 PCR-SMART-06 — resource, đang review
INSERT INTO project_change_requests
  (request_code, project_id, title, description, change_type, priority, status,
   impact_scope, requested_by, reviewer, notes, target_doc_id, merge_state,
   acceptance, dependencies, created_at, updated_at)
SELECT 'PCR-SMART-06', d.project_id,
       'Bổ sung nhân lực cho di trú dữ liệu cổ đông',
       'Cần thêm 1 data engineer cho di trú dữ liệu cổ đông và đối soát chất lượng dữ liệu.',
       'resource', 'high', 'reviewing',
       'Tăng nguồn lực đội di trú; bổ sung bước đối soát tự động. Giảm rủi ro chất lượng dữ liệu khi migrate.',
       'Man Ngọc Lam', 'Nguyễn Hồng Sơn', '', d.id, 'pending',
       '["Có thêm 1 data engineer cho công tác di trú","Bổ sung quy trình đối soát tự động trước khi nạp chính thức"]'::jsonb,
       '{}'::text[], TIMESTAMPTZ '2026-07-06 09:00+07', TIMESTAMPTZ '2026-07-06 09:00+07'
  FROM ba_master_docs d WHERE d.doc_code = 'doc-smartsh-brs'
ON CONFLICT (request_code) DO NOTHING;

-- 4.7 PCR-LAOS-07 — ĐÃ TỪ CHỐI (có op remove)
INSERT INTO project_change_requests
  (request_code, project_id, title, description, change_type, priority, status,
   impact_scope, requested_by, reviewer, reviewed_at, notes, target_doc_id, merge_state,
   acceptance, dependencies, created_at, updated_at)
SELECT 'PCR-LAOS-07', d.project_id,
       'Thu hẹp scope giai đoạn 1 — bỏ đa ngôn ngữ',
       'Đề xuất bỏ tính năng đa ngôn ngữ ở giai đoạn 1 để kịp go-live.',
       'scope', 'medium', 'rejected',
       'Giảm khối lượng phát triển giai đoạn 1 nhưng ảnh hưởng trải nghiệm người dùng tại Lào.',
       'Hoàng Thị Hòa', 'Trương Hoàng Nam Cường', TIMESTAMPTZ '2026-07-03 15:00+07',
       'Từ chối: đa ngôn ngữ (đặc biệt tiếng Lào) là yêu cầu bắt buộc theo cam kết với chi nhánh; không được loại khỏi giai đoạn 1.',
       d.id, 'rejected', '[]'::jsonb, '{}'::text[],
       TIMESTAMPTZ '2026-06-29 09:00+07', TIMESTAMPTZ '2026-07-03 15:00+07'
  FROM ba_master_docs d WHERE d.doc_code = 'doc-laos-brs'
ON CONFLICT (request_code) DO NOTHING;

-- 4.8 PCR-FINNFLOW-08 — technical, mới gửi
INSERT INTO project_change_requests
  (request_code, project_id, title, description, change_type, priority, status,
   impact_scope, requested_by, reviewer, notes, target_doc_id, merge_state,
   acceptance, dependencies, created_at, updated_at)
SELECT 'PCR-FINNFLOW-08', d.project_id,
       'Thay workflow engine tự xây bằng Camunda',
       'Đề xuất dùng Camunda thay cho engine tự xây để rút ngắn thời gian phát triển và tận dụng năng lực BPMN sẵn có.',
       'technical', 'high', 'submitted',
       'Thay đổi lựa chọn công nghệ workflow engine; ảnh hưởng kiến trúc và yêu cầu phi chức năng. Cần bổ sung năng lực vận hành Camunda.',
       'Ngô Thị Thúy Nga', 'Trương Hoàng Nam Cường', '', d.id, 'pending',
       '["Cấu hình quy trình mẫu trên Camunda chạy thông suốt","Đáp ứng yêu cầu mở rộng và sẵn sàng","Có phương án vận hành và giám sát Camunda"]'::jsonb,
       '{}'::text[], TIMESTAMPTZ '2026-07-07 09:00+07', TIMESTAMPTZ '2026-07-07 09:00+07'
  FROM ba_master_docs d WHERE d.doc_code = 'doc-finnflow-fsd'
ON CONFLICT (request_code) DO NOTHING;

-- ── 5. Section ops của từng CR ───────────────────────────────────
-- 5.1 PCR-EMS2-05: 1 modify
INSERT INTO ba_doc_cr_ops (pcr_id, op, section_key, after_section_key, heading, body, sort_order)
SELECT c.id, v.op, v.k, v.ak, v.h, v.b, v.o FROM project_change_requests c CROSS JOIN (VALUES
 ('modify','s4',NULL::varchar,'Quy trình phê duyệt PO','Đề nghị mua sắm (PO) được phê duyệt theo hạn mức nhiều cấp: giá trị dưới 50 triệu do trưởng phòng duyệt; từ 50 đến 200 triệu cần thêm phê duyệt của Giám đốc khối; trên 200 triệu phải trình Ban Điều hành. Hệ thống tự động định tuyến cấp duyệt theo giá trị PO và ghi nhật ký từng bước. Sau khi hoàn tất, PO chuyển sang bộ phận kế toán để xử lý thanh toán.',1)
) AS v(op,k,ak,h,b,o) WHERE c.request_code = 'PCR-EMS2-05';

-- 5.2 PCR-EMS2-01: 3 modify + 1 add
INSERT INTO ba_doc_cr_ops (pcr_id, op, section_key, after_section_key, heading, body, sort_order)
SELECT c.id, v.op, v.k, v.ak, v.h, v.b, v.o FROM project_change_requests c CROSS JOIN (VALUES
 ('modify','s1',NULL::varchar,'Mục tiêu & phạm vi','Nâng cấp hệ thống EMS (Expense Management System) lên phiên bản 2.0 nhằm tối ưu quy trình quản lý chi tiêu nội bộ cho khối Vận hành (PS). Phạm vi bao gồm quản lý đề nghị thanh toán (PR/PP/VSP), quy trình phê duyệt, đối soát ngân sách theo quý và tích hợp với Collection Support System để đồng bộ trạng thái khoản thu. Bổ sung khả năng cảnh báo công nợ liên quan tới nhà cung cấp.',1),
 ('modify','s6',NULL,'Yêu cầu tích hợp hệ thống','EMS 2.0 tích hợp với ESD Portal để đồng bộ danh mục nhà cung cấp, với hệ thống kế toán lõi để hạch toán chi phí, và bổ sung tích hợp hai chiều với Collection Support System để đồng bộ trạng thái khoản thu và công nợ nhà cung cấp. Việc trao đổi dữ liệu thực hiện qua API nội bộ theo chuẩn REST, có hàng đợi message cho đồng bộ trạng thái gần thời gian thực.',2),
 ('add','s9','s6','Đồng bộ trạng thái khoản thu & cảnh báo nợ','Hệ thống nhận trạng thái khoản thu từ Collection Support System và đối chiếu với đề nghị chi tiêu liên quan. Khi phát sinh công nợ quá hạn với một nhà cung cấp, EMS 2.0 tự động cảnh báo và tạm giữ các đề nghị thanh toán mới cho nhà cung cấp đó cho tới khi được xử lý. Toàn bộ lịch sử đồng bộ được ghi nhận phục vụ kiểm toán.',3),
 ('modify','s7',NULL,'Báo cáo & Dashboard','Cung cấp dashboard tổng hợp chi tiêu theo phòng ban, theo quý và theo loại đề nghị; bổ sung báo cáo đối soát công nợ và trạng thái khoản thu theo nhà cung cấp; cho phép lọc theo trạng thái và xuất báo cáo Excel/PDF phục vụ đối soát.',4)
) AS v(op,k,ak,h,b,o) WHERE c.request_code = 'PCR-EMS2-01';

-- 5.3 PCR-ORACLE-02: 2 modify
INSERT INTO ba_doc_cr_ops (pcr_id, op, section_key, after_section_key, heading, body, sort_order)
SELECT c.id, v.op, v.k, v.ak, v.h, v.b, v.o FROM project_change_requests c CROSS JOIN (VALUES
 ('modify','s4',NULL::varchar,'Kế hoạch triển khai & UAT','Giai đoạn UAT được lùi 2 tuần, dự kiến bắt đầu tuần thứ ba của tháng 8 và kéo dài 3 tuần, do đối tác Neon Core chậm bàn giao API tài khoản GL. Go-live điều chỉnh sang đầu Q4 với kế hoạch dự phòng cho nhánh phụ thuộc.',1),
 ('modify','s5',NULL,'Ràng buộc & giả định','Cập nhật giả định: đối tác Neon Core bàn giao đặc tả API tài khoản GL trong tháng 8, có môi trường sandbox riêng để giảm rủi ro tích hợp. Ràng buộc lưu trữ và kiểm toán dữ liệu tài chính giữ nguyên.',2)
) AS v(op,k,ak,h,b,o) WHERE c.request_code = 'PCR-ORACLE-02';

-- 5.4 PCR-UDATALAKE-03: 2 modify + 1 add
INSERT INTO ba_doc_cr_ops (pcr_id, op, section_key, after_section_key, heading, body, sort_order)
SELECT c.id, v.op, v.k, v.ak, v.h, v.b, v.o FROM project_change_requests c CROSS JOIN (VALUES
 ('modify','s1',NULL::varchar,'Mục tiêu & phạm vi','Xây dựng Data Lake tập trung thu thập dữ liệu hành vi người dùng trên các kênh số. Phạm vi giai đoạn 1 mở rộng bao gồm thu thập sự kiện, chuẩn hoá, lưu trữ và phân tích hành trình khách hàng (journey analytics) cơ bản để phục vụ các bài toán trải nghiệm.',1),
 ('modify','s3',NULL,'Hạ tầng & ngân sách','Sử dụng hạ tầng cloud với cụm lưu trữ và xử lý theo nhu cầu. Do mở rộng sang phân tích hành trình, ngân sách hạ tầng giai đoạn 1 được bổ sung cho khối lượng dữ liệu và compute lớn hơn, kèm cơ chế giám sát chi phí theo tháng.',2),
 ('add','s6','s3','Phân tích hành trình khách hàng','Bổ sung năng lực dựng bản đồ hành trình khách hàng từ dữ liệu sự kiện, phân khúc người dùng và đo lường tỷ lệ chuyển đổi theo từng bước. Kết quả phân tích được cung cấp qua lớp dữ liệu phục vụ báo cáo.',3)
) AS v(op,k,ak,h,b,o) WHERE c.request_code = 'PCR-UDATALAKE-03';

-- 5.5 PCR-ECONTRACT-04: 2 modify
INSERT INTO ba_doc_cr_ops (pcr_id, op, section_key, after_section_key, heading, body, sort_order)
SELECT c.id, v.op, v.k, v.ak, v.h, v.b, v.o FROM project_change_requests c CROSS JOIN (VALUES
 ('modify','s2',NULL::varchar,'Luồng ký số','Hợp đồng được ký số sử dụng dịch vụ HSM cloud thay cho HSM on-premise. Người dùng xác thực trước khi ký, chữ ký số gắn dấu thời gian từ nguồn tin cậy và được kiểm tra tính toàn vẹn khi lưu trữ. Kết nối tới HSM cloud được mã hoá và giám sát liên tục.',1),
 ('modify','s3',NULL,'Yêu cầu phi chức năng & bảo mật','Hệ thống đáp ứng yêu cầu sẵn sàng cao cho dịch vụ ký nhờ hạ tầng HSM cloud đa vùng. Khoá ký được quản lý trong HSM cloud đạt chuẩn, có phân tách vai trò quản trị. Nhật ký ký số bất biến phục vụ tra soát và pháp lý; bổ sung đánh giá bảo mật độc lập trước go-live.',2)
) AS v(op,k,ak,h,b,o) WHERE c.request_code = 'PCR-ECONTRACT-04';

-- 5.6 PCR-SMART-06: 2 modify
INSERT INTO ba_doc_cr_ops (pcr_id, op, section_key, after_section_key, heading, body, sort_order)
SELECT c.id, v.op, v.k, v.ak, v.h, v.b, v.o FROM project_change_requests c CROSS JOIN (VALUES
 ('modify','s2',NULL::varchar,'Di trú dữ liệu cổ đông','Dữ liệu cổ đông được di trú từ hệ thống cũ. Bổ sung 1 data engineer chuyên trách cùng cán bộ hiện có để trích xuất, làm sạch và nạp dữ liệu; áp dụng đối soát tự động theo lô kèm chạy thử hai vòng trước khi nạp chính thức.',1),
 ('modify','s4',NULL,'Kế hoạch & nguồn lực','Kế hoạch triển khai chia làm hai giai đoạn. Nguồn lực bổ sung 1 data engineer cho công tác di trú song song với xây dựng chức năng lõi, giảm rủi ro chậm tiến độ do đối soát dữ liệu.',2)
) AS v(op,k,ak,h,b,o) WHERE c.request_code = 'PCR-SMART-06';

-- 5.7 PCR-LAOS-07: 1 modify + 1 remove (CR bị từ chối)
INSERT INTO ba_doc_cr_ops (pcr_id, op, section_key, after_section_key, heading, body, sort_order)
SELECT c.id, v.op, v.k, v.ak, v.h, v.b, v.o FROM project_change_requests c CROSS JOIN (VALUES
 ('modify','s1',NULL::varchar,'Mục tiêu & phạm vi','Xây dựng trợ lý AI hỗ trợ tra cứu quy định và nghiệp vụ tuân thủ cho chi nhánh Lào. Giai đoạn 1 tập trung hỏi đáp quy định nội bộ bằng tiếng Việt và tiếng Anh; hỗ trợ tiếng Lào chuyển sang giai đoạn 2.',1),
 ('remove','s3',NULL,NULL,NULL,2)
) AS v(op,k,ak,h,b,o) WHERE c.request_code = 'PCR-LAOS-07';

-- 5.8 PCR-FINNFLOW-08: 2 modify
INSERT INTO ba_doc_cr_ops (pcr_id, op, section_key, after_section_key, heading, body, sort_order)
SELECT c.id, v.op, v.k, v.ak, v.h, v.b, v.o FROM project_change_requests c CROSS JOIN (VALUES
 ('modify','s2',NULL::varchar,'Workflow engine','Hệ thống sử dụng Camunda làm workflow engine thay cho engine tự xây, tận dụng chuẩn BPMN để mô hình hoá và điều phối các bước nghiệp vụ, định tuyến và phân công công việc theo cấu hình trực quan.',1),
 ('modify','s3',NULL,'Yêu cầu phi chức năng','Nền tảng đáp ứng yêu cầu mở rộng theo tải và độ sẵn sàng cao dựa trên năng lực cụm của Camunda; theo dõi trạng thái từng tiến trình qua công cụ giám sát tích hợp. Toàn bộ thao tác được ghi nhật ký; bổ sung phương án vận hành engine mới.',2)
) AS v(op,k,ak,h,b,o) WHERE c.request_code = 'PCR-FINNFLOW-08';

-- ── 6. "Merge" PCR-EMS2-05 → sinh v2.0 cho EMS 2.0 ───────────────
-- 6a. Áp op modify vào working copy
UPDATE ba_doc_sections s
   SET heading = o.heading, body = o.body, updated_at = NOW()
  FROM ba_doc_cr_ops o
  JOIN project_change_requests c ON c.id = o.pcr_id
 WHERE c.request_code = 'PCR-EMS2-05'
   AND o.op = 'modify'
   AND s.doc_id = c.target_doc_id
   AND s.section_key = o.section_key;

-- 6b. Chụp snapshot v2.0 từ working copy vừa cập nhật
INSERT INTO ba_doc_versions (doc_id, version_label, seq, kind, source_cr_id, note,
                             released_on, released_by, sections)
SELECT c.target_doc_id, 'v2.0', 2, 'merge', c.id, c.title,
       DATE '2026-06-18', c.reviewer,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('section_key', s.section_key,
                                                    'heading',     s.heading,
                                                    'body',        s.body)
                                  ORDER BY s.sort_order)
                   FROM ba_doc_sections s WHERE s.doc_id = c.target_doc_id), '[]'::jsonb)
  FROM project_change_requests c
 WHERE c.request_code = 'PCR-EMS2-05'
ON CONFLICT (doc_id, version_label) DO NOTHING;

-- 6c. Cập nhật bản hiện hành của tài liệu
UPDATE ba_master_docs
   SET current_version = 'v2.0', updated_at = NOW(), updated_by = 'seed'
 WHERE doc_code = 'doc-ems2-brs';

-- ── 7. Nhật ký xử lý CR (dùng lại request_history của module Requests) ──
INSERT INTO request_history (ref_type, ref_id, action, actor, from_status, to_status, comment, created_at)
SELECT 'pcr', c.id, 'created', c.requested_by, NULL, c.status,
       'Tạo CR tài liệu từ dữ liệu khởi tạo BA Studio', c.created_at
  FROM project_change_requests c
 WHERE c.request_code IN ('PCR-EMS2-05','PCR-EMS2-01','PCR-ORACLE-02','PCR-UDATALAKE-03',
                          'PCR-ECONTRACT-04','PCR-SMART-06','PCR-LAOS-07','PCR-FINNFLOW-08');

INSERT INTO request_history (ref_type, ref_id, action, actor, from_status, to_status, comment, created_at)
SELECT 'pcr', c.id, 'status_changed', c.reviewer, 'approved', 'implemented',
       'Đã merge vào ' || c.merged_version, c.merged_at
  FROM project_change_requests c WHERE c.request_code = 'PCR-EMS2-05';

INSERT INTO request_history (ref_type, ref_id, action, actor, from_status, to_status, comment, created_at)
SELECT 'pcr', c.id, 'status_changed', c.reviewer, 'reviewing', 'rejected', c.notes, c.reviewed_at
  FROM project_change_requests c WHERE c.request_code = 'PCR-LAOS-07';

COMMIT;
