# BRD — DevOps Ecosystem Platform
**BRD-ID:** BRD-001
**Version:** 1.3
**Status:** Draft
**Author:** BA Team / PO Agent
**Input Source:** Codebase audit 2026-04-13 — routers, migrations V017–V029, CLAUDE.md
**Created:** 2026-04-09
**Updated:** 2026-04-14
**Prepared by:** PO Agent
**Change Summary (v1.3):** Bổ sung Section 13 — Đối tượng dữ liệu được quản lý: mô tả đầy đủ các đối tượng thông tin của 4 module (PPG, BA Workflow, Test Platform, Catalog) bằng ngôn từ nghiệp vụ; làm rõ cấu trúc thông tin, trạng thái và mối quan hệ giữa các đối tượng dành cho end-user.
**Change Summary (v1.2):** Thêm Module 5 — Danh mục dữ liệu tổ chức (Catalog); thêm FR-033 đến FR-047 bao gồm: Org-wide Product Catalog (5 types), Product Environments/Licenses/Details, Catalog Users, Catalog Roles & User-Role Assignment, Project Domain Classification, Project Export/Import XLSX, Governance Checklist (5 domains), Project Brief, Stage Gates, Health Score, WSJF Priority, Portfolio Dashboard; đóng OQ-004 và OQ-005 (resolved bởi ADR-004 và CODE-002); cập nhật Business Rules BR-015 đến BR-019; cập nhật User Stories và Acceptance Criteria.

---

## 0. Product Vision

**For** IT project teams at VIB, **who** struggle with fragmented project information, undocumented application landscapes, and manual BA/test workflows, **DevOps Ecosystem** is an **internal governance platform** that **centralises project data, standardises application metadata, and automates the BA-to-test pipeline**. Unlike disparate tools (SharePoint, email, Excel), our platform provides a single source of truth from annual planning through project closure — covering all 9 standard milestones, org-wide product/personnel catalogs, and automated test case generation from approved BRS.

**Why Now:** VIB IT is scaling delivery capacity across 12 business domains with 50+ active projects. Without a unified registry and workflow platform, audit readiness, knowledge transfer, and cross-team visibility are not achievable at current scale.

---

## 1. Business Context

### 1.1 Mục tiêu kinh doanh

Xây dựng nền tảng quản trị dự án IT tích hợp, giải quyết các vấn đề cốt lõi:

1. **Thông tin dự án rời rạc** — Dữ liệu nằm phân tán (email, chat, file local, SharePoint), không có điểm tập trung để tra cứu trạng thái, tài liệu, tiến độ.
2. **Thông tin ứng dụng chưa có tiêu chuẩn** — Mỗi dự án mô tả ứng dụng/hệ thống/Job/Connection theo cách riêng, gây khó khăn khi bàn giao, audit, và tái sử dụng.
3. **Danh mục tài sản tổ chức chưa được quản lý tập trung** — Không có nơi tra cứu toàn bộ sản phẩm/ứng dụng và nhân sự IT của VIB theo chuẩn thống nhất.
4. **BA/Test workflow thủ công** — Test case viết tay từ BRS tốn thời gian, dễ thiếu sót, không có dashboard theo dõi coverage.

**Mục tiêu cụ thể:**
- Tập trung toàn bộ thông tin dự án IT vào một platform duy nhất
- Chuẩn hóa cấu trúc thông tin ứng dụng/hệ thống theo schema bắt buộc (project-level và org-level)
- Xây dựng danh mục tổ chức (org-wide catalog) cho sản phẩm và nhân sự
- Tự động hóa pipeline: yêu cầu nghiệp vụ thô → đặc tả có cấu trúc → test case

### 1.2 Người dùng

| Role | Mô tả | Hành động chính |
|------|-------|----------------|
| PM (Project Manager) | Quản lý danh mục dự án, milestone, tiến độ | Tạo dự án, quản lý milestone/stage gates, export XLSX |
| BA (Business Analyst) | Viết và quản lý tài liệu nghiệp vụ | Tạo BRD/BRS/FSD, chuyển trạng thái tài liệu, gắn với đối tượng |
| Dev (Developer) | Tra cứu spec, upload deliverables | Đọc tài liệu, upload file, xem meeting minutes |
| QA (Quality Assurance) | Quản lý test cases và test reports | Review test cases auto-gen, tạo test report, approve |
| PO (Product Owner) | Oversight toàn bộ danh mục dự án | Tạo kế hoạch năm, xem portfolio dashboard, WSJF scoring |
| Architect | Quản lý catalog sản phẩm và tiêu chuẩn kỹ thuật | Khai báo catalog sản phẩm, quản lý connection/dependency |
| Scrum Master | Theo dõi governance checklist và stage gates | Cập nhật activity tasks, xem health score |
| Stakeholder | Người liên quan, được thông báo | Đọc tài liệu, tham gia discussions |

### 1.3 Pain Points

| # | Pain Point | Tác động |
|---|-----------|---------|
| P-01 | Thông tin dự án rời rạc | Mất thời gian tìm kiếm, dễ dùng thông tin lỗi thời |
| P-02 | Thông tin ứng dụng không có tiêu chuẩn | Bàn giao khó, không audit được |
| P-03 | Tài liệu BA không có luồng phê duyệt rõ ràng | Không biết tài liệu nào đang ở trạng thái nào |
| P-04 | Test case viết tay từ BRS | Test coverage thấp, miss business rules |
| P-05 | Không có dashboard portfolio | PM/PO phải hỏi từng người để nắm tiến độ |
| P-06 | Danh mục sản phẩm/nhân sự tổ chức chưa có nơi lưu chuẩn | Không tra cứu được ai owns ứng dụng nào, ứng dụng nào đang active |
| P-07 | Không phân loại dự án theo domain nghiệp vụ | Không filter/report được theo HR, FS, DIGITAL, v.v. |

---

## 2. Scope

### 2.1 In Scope

| # | Module | Mô tả |
|---|--------|-------|
| S-01 | PPG — Project Governance | Tạo/quản lý dự án theo domain, 9 milestone chuẩn, brief, thành viên, file, meeting minutes |
| S-02 | PPG — Application Registry (Project-level) | Khai báo đối tượng gắn với dự án: Web App, Mobile App, API, ELT, connections |
| S-03 | PPG — Project Management Extended | Stage gates, health score, WSJF priority, stakeholders, portfolio summary |
| S-04 | PPG — Annual Plan | Kế hoạch năm, objectives, DoD items, liên kết dự án |
| S-05 | PPG — Governance Checklist | 5-domain activity tasks tự động tạo per project |
| S-06 | PPG — Export/Import XLSX | Export/import thông tin dự án (4 sheets: Overview, Timeline, Nguồn lực, To-do) |
| S-07 | PPG — Domain Classification | Phân loại dự án theo 12 domain VIB (HR, FS, DIGITAL, v.v.) |
| S-08 | BA Workflow — Document Hub | Tạo/quản lý BRD, BRS, FSD, ERD, API Spec với state machine 4 trạng thái |
| S-09 | BA Workflow — Discussions | Luồng thảo luận và làm rõ yêu cầu theo từng tài liệu |
| S-10 | Test Platform — Auto Test Gen | Tự động sinh test case + Playwright script từ BRS đã approved |
| S-11 | Test Platform — Test Report | Tạo và quản lý test report, approve, sync metrics về PPG |
| S-12 | Catalog — Org-wide Product Catalog | Danh mục sản phẩm tổ chức: 5 loại, environments, licenses, details JSONB |
| S-13 | Catalog — Org-wide User & Role | Danh mục nhân sự và vai trò tổ chức; gán vai trò có scope |
| S-14 | Frontend SPA | Giao diện thống nhất, dashboard KPI |
| S-15 | Basic Authentication | Đăng nhập cơ bản bảo vệ platform |
| S-16 | Inter-service Sync | Đồng bộ BA → PPG và Test Platform → PPG |
| S-17 | Cross-project Report | Báo cáo kết nối liên dự án |

### 2.2 Out of Scope

| # | Item | Lý do |
|---|------|-------|
| OS-01 | Kafka / Event Streaming | Chưa cần ở giai đoạn này |
| OS-02 | Mobile Application | Chỉ web-based trong v1 |
| OS-03 | Tích hợp hệ thống ngoài (SharePoint, ADO, Jira) | Không trong scope v1 |
| OS-04 | Role-based access control đầy đủ | Basic auth, chưa phân quyền theo role |
| OS-05 | AI/LLM tự động sinh nội dung tài liệu | Chỉ auto-gen test case từ BRS có cấu trúc |
| OS-06 | Notification / Alert system | Chưa trong scope v1 |
| OS-07 | Portfolio management đa cấp (kế hoạch → chương trình → dự án) | v1 chỉ hỗ trợ 2 cấp |
| OS-08 | Tự động tính toán OKR / scoring kế hoạch năm | Tracking thủ công trong v1 |
| OS-09 | So sánh thực tế vs kế hoạch tự động (variance analysis) | Chưa trong scope v1 |
| OS-10 | Export/import dữ liệu Application Registry sang Confluence / SharePoint | Không trong scope v1 |

### 2.3 Product Phasing

| Feature | MVP | Phase 2 | Backlog |
|---------|-----|---------|---------|
| Project CRUD + 9 milestones | ✅ | | |
| Application Registry (project-level) | ✅ | | |
| BA Document Hub + state machine | ✅ | | |
| Auto test case generation từ BRS | ✅ | | |
| Basic Auth | ✅ | | |
| Annual Plan + DoD | ✅ | | |
| Cross-project connections | ✅ | | |
| Org-wide Catalog (products, users, roles) | ✅ | | |
| Project domains (12 VIB domains) | ✅ | | |
| Export/Import XLSX | ✅ | | |
| Governance Checklist (5 domains) | ✅ | | |
| Stage Gates | ✅ | | |
| Health Score + WSJF Priority | ✅ | | |
| Portfolio Summary Dashboard | ✅ | | |
| RBAC đầy đủ | | ✅ | |
| VIB SSO / OAuth2 | | ✅ | |
| Notification / Alert | | ✅ | |
| AI-assisted BA document generation | | | ✅ |
| Variance analysis kế hoạch vs thực tế | | | ✅ |

### 2.4 Dependencies

Không có dependency với module/BRD nào đang làm song song.

---

## 3. Functional Requirements

### 3.1 Module PPG — Project Governance

| FR-ID | Tên | Mô tả | Priority | Phase | Acceptance Criteria |
|-------|-----|-------|----------|-------|---------------------|
| FR-001 | Quản lý dự án | Tạo, cập nhật, archive dự án IT với các trạng thái: active, on_hold, completed, archived. Gắn với domain nghiệp vụ (FR-041) | MUST | MVP | Tạo dự án thành công; trạng thái chuyển đúng; dự án archived không edit được |
| FR-002 | 9 Milestone chuẩn | Khi tạo dự án, tự động sinh 9 milestone chuẩn phân bổ tỷ lệ theo start_date–end_date. 3 tracks riêng biệt: project / ba / test | MUST | MVP | Sau khi tạo dự án, đúng 9 milestone được tạo per track; tổng thời gian milestone = thời gian dự án |
| FR-003 | Application Registry (project-level) | Khai báo các đối tượng quản lý của dự án (Web App / Mobile App / API / ELT) theo schema chuẩn bắt buộc | MUST | MVP | Không thể tạo object nếu thiếu trường bắt buộc; object gắn đúng với dự án |
| FR-004 | Quản lý thành viên | Thêm thành viên vào dự án với role: PM, BA, Dev, QA, PO, Stakeholder; hỗ trợ alias cho meeting parser | MUST | MVP | Thêm/xóa thành viên thành công; alias được map đúng |
| FR-005 | Quản lý file | Upload file, version history, tải file theo version, đính kèm URL ngoài, copy-from-URL | MUST | MVP | Upload file tạo version mới; tải đúng nội dung theo version; external URL lưu được |
| FR-006 | Meeting Minutes Parser | Input ghi chú thô với @alias → output biên bản có cấu trúc: attendees, decisions, action items, risks | MUST | MVP | @alias được resolve đúng; action items có assignee và due date |
| FR-007 | Dashboard KPI | Hiển thị số liệu tổng hợp per project: số tài liệu theo loại, test coverage %, pass/fail rate | MUST | MVP | Dashboard cập nhật sau khi BA approve tài liệu hoặc QA approve test report |
| FR-008 | Annual Plan | Lập kế hoạch danh mục dự án theo năm và quý | SHOULD | MVP | Tạo được annual plan; gắn dự án vào kế hoạch năm |
| FR-040 | Project Domain Classification | Mỗi dự án được gắn với một domain nghiệp vụ trong danh sách 12 domains VIB: HR, FS, RETAIL, CARDS, RISK, COMPLIANCE, IT, DIGITAL, OPERATIONS, DATA, SME, TREASURY. Hỗ trợ lọc dự án theo domain. Cấu trúc thư mục lưu trữ tuân theo: {domain}/{project}/BA và {domain}/{project}/Tester | MUST | MVP | Tạo dự án phải chọn domain; lọc theo domain trả đúng kết quả; thư mục tạo đúng cấu trúc |
| FR-041 | Project Brief | Lưu hồ sơ chi tiết dự án: purpose, general_info, success_metrics, enduser_value, primary_users, pain_points, user_role_matrix, must_have_features, nice_to_have_features, system_integrations, performance_scalability, compliance_security, availability_reliability, data_needs, reporting_needs, time_constraints, dependencies, potential_risks, methodology, decision_makers, key_milestones_notes | SHOULD | MVP | Tạo/cập nhật brief thành công; tất cả fields lưu đúng; brief gắn 1-1 với dự án |
| FR-042 | Export/Import XLSX | Export toàn bộ thông tin dự án ra file XLSX (4 sheets: Overview, Timeline, Nguồn lực, To-do list). Import từ XLSX để upsert data (milestone status, member info, task status). Format VIB-branded: dark navy header, striped rows | MUST | MVP | Export tạo file XLSX đúng 4 sheets; import upsert đúng records theo sheet; import file sai format → 400; import không xóa records hiện có |
| FR-043 | Governance Checklist (5 domains) | Tự động tạo 38 activity tasks per project khi khởi tạo, phân chia theo 5 governance domains: business_requirements, architecture_code, infrastructure, security_iam, compliance_governance. Trạng thái: pending / in_progress / done / skipped / na. Hỗ trợ thêm task tuỳ chỉnh. Filter theo domain | MUST | MVP | 38 tasks được tạo khi tạo dự án; cập nhật status thành công; filter theo domain trả đúng kết quả; task không hợp lệ domain bị từ chối |

### 3.2 Module PPG — Project Management Extended

| FR-ID | Tên | Mô tả | Priority | Phase | Acceptance Criteria |
|-------|-----|-------|----------|-------|---------------------|
| FR-044 | Stage Gates | Khai báo các Stage Gates của dự án (Gate 1–N). Mỗi gate có: stage_name, stage_order, status (pending/passed/blocked/skipped), gate_criteria (JSON array với is_met flag), gate_date, sign_off_by, notes. Auto-seed khi tạo dự án | MUST | MVP | Tạo stage gate thành công; cập nhật status/criteria thành công; gate criteria kiểm tra dạng JSON array |
| FR-045 | Health Score | Ghi nhận health score của dự án theo thời gian. Mỗi score có: rag_status (green/amber/red), score (0-100), notes, dimensions (JSONB). Lấy được latest health score | MUST | MVP | Tạo health score thành công; rag_status không hợp lệ → 422; get latest trả về record mới nhất |
| FR-046 | WSJF Priority | Khai báo/cập nhật điểm ưu tiên WSJF (Weighted Shortest Job First) cho dự án: business_value, time_criticality, risk_reduction, job_size. Tự động tính wsjf_score = (business_value + time_criticality + risk_reduction) / job_size | MUST | MVP | Upsert priority thành công; job_size = 0 → 422; wsjf_score tính đúng công thức; giá trị ngoài range → 422 |
| FR-047 | Portfolio Summary Dashboard | API tổng hợp toàn bộ dự án với health, priority, tiến độ milestone. Hỗ trợ lọc theo year và domain. Trả về: project info + latest health + wsjf priority | SHOULD | MVP | Trả về danh sách đầy đủ; filter year/domain hoạt động đúng; project không có health/priority → null trong response |

### 3.3 Module PPG — Annual Plan

| FR-ID | Tên | Mô tả | Priority | Phase | Acceptance Criteria |
|-------|-----|-------|----------|-------|---------------------|
| FR-019 | Tạo và quản lý kế hoạch năm | Tạo kế hoạch năm với: tên, năm, mô tả, danh sách mục tiêu (objectives), trạng thái (draft/active/closed). Một năm có thể có nhiều kế hoạch | MUST | MVP | Tạo kế hoạch năm thành công với ít nhất 1 objective; trạng thái chuyển đúng chiều; không thể xóa kế hoạch active |
| FR-020 | Definition of Done cấp kế hoạch năm | Định nghĩa tiêu chí DoD ở cấp độ kế hoạch năm: danh sách tiêu chí, trọng số, trạng thái đạt/chưa đạt. Tổng % hoàn thành tính theo trọng số | MUST | MVP | Lưu được danh sách DoD items; cập nhật trạng thái từng item; % hoàn thành tính đúng theo trọng số |
| FR-021 | Liên kết kế hoạch năm với dự án | Gắn/bỏ dự án vào kế hoạch năm; một dự án có thể thuộc nhiều kế hoạch năm; hiển thị danh sách dự án thuộc kế hoạch | MUST | MVP | Gắn dự án thành công; bỏ liên kết không xóa dự án; kế hoạch closed không nhận dự án mới |
| FR-022 | Dashboard tổng hợp kế hoạch năm | Hiển thị tổng quan: số dự án theo trạng thái, % DoD đạt, danh sách dự án kèm trạng thái tiến độ | SHOULD | MVP | Dashboard hiển thị đúng; % DoD tính đúng; cập nhật khi có thay đổi |

### 3.4 Module PPG — Application Registry (Project-level)

| FR-ID | Tên | Mô tả | Priority | Phase | Acceptance Criteria |
|-------|-----|-------|----------|-------|---------------------|
| FR-023 | Quản lý Web App & Mobile App | Khai báo với khung thông tin chuẩn: tên, mô tả, tech stack, URL/store link, môi trường, version, owner, trạng thái. Export/import theo template chuẩn | MUST | MVP | Tạo thiếu trường bắt buộc → từ chối; export đúng template; import tạo đúng records |
| FR-024 | Quản lý API | Khai báo với: tên, mô tả, base URL, auth method, version, owner, danh sách endpoint, môi trường, trạng thái. Export/import | MUST | MVP | Tạo thiếu trường bắt buộc → từ chối; export đúng template; import tạo đúng records |
| FR-025 | Quản lý ELT | Khai báo với: tên, mô tả, source, target, schedule, owner, công nghệ, trạng thái. Export/import | MUST | MVP | Tạo thiếu trường bắt buộc → từ chối; export đúng template; import tạo đúng records |
| FR-026 | Cross-project Connection Report | Tra cứu tất cả kết nối đến/từ một ứng dụng trên toàn bộ danh mục dự án (in/out connections) | SHOULD | MVP | Tra cứu theo tên ứng dụng trả đúng danh sách; kết quả bao gồm đủ thông tin dự án sở hữu |

### 3.5 Module Catalog — Org-wide Product Catalog

> **Mô tả module:** Danh mục tổ chức (org-wide) độc lập với dự án. Mục đích: lưu trữ tập trung toàn bộ sản phẩm/hệ thống của VIB với metadata đầy đủ, chuẩn hoá. Khác với Application Registry (project-level, gắn với dự án cụ thể).

| FR-ID | Tên | Mô tả | Priority | Phase | Acceptance Criteria |
|-------|-----|-------|----------|-------|---------------------|
| FR-033 | Danh mục sản phẩm tổ chức | CRUD sản phẩm org-wide: product_code (unique), product_name, product_type (web_app / mobile / job / etl / api), description, business_owner, technical_owner, owner_team, department, status (active/inactive/deprecated/planned), tags. Lọc theo product_type, status, department | MUST | MVP | Tạo thiếu product_code/product_name/product_type → 422; product_code trùng → 409; lọc trả đúng kết quả; soft-delete chuyển status = deprecated |
| FR-034 | Môi trường sản phẩm | Quản lý môi trường của từng sản phẩm trong catalog: env_name (DEV/SIT/UAT/PROD/DR/STAGING), url, server_info (JSONB), deploy_date, version, status. Mỗi sản phẩm-môi trường là duy nhất | MUST | MVP | Tạo môi trường thành công; trùng (product+env) → 409; cập nhật server_info JSONB đúng; xóa thành công |
| FR-035 | Licence sản phẩm | Quản lý licence của từng sản phẩm: license_name, license_type (commercial/open_source/proprietary/subscription/free), vendor, quantity, start_date, expiry_date, cost_amount, currency, auto_renewal, compliance_status | SHOULD | MVP | Tạo licence thành công; cập nhật compliance_status; xóa thành công |
| FR-036 | Chi tiết kỹ thuật per-type | Upsert chi tiết kỹ thuật dạng JSONB cho từng sản phẩm theo loại (web_app có domain_dns, cdn; api có spec_url, rate_limit; etl có lineage; v.v.). Lưu dạng ON CONFLICT upsert | SHOULD | MVP | Upsert chi tiết thành công; lấy về đúng JSONB; sản phẩm không tồn tại → 404 |

### 3.6 Module Catalog — Org-wide Users & Roles

| FR-ID | Tên | Mô tả | Priority | Phase | Acceptance Criteria |
|-------|-----|-------|----------|-------|---------------------|
| FR-037 | Danh mục nhân sự tổ chức | CRUD nhân sự org-wide: employee_id, full_name, email (unique), phone, user_type (internal/external/contractor/vendor), department, position, manager_id, team, location, status (active/inactive/on_leave/terminated), start_date, end_date, skills (list). Lọc theo user_type, department, team, status | MUST | MVP | Tạo thiếu full_name/email → 422; email trùng → 409; lọc trả đúng kết quả; soft-delete chuyển status = terminated |
| FR-038 | Danh mục vai trò tổ chức | CRUD vai trò org-wide: role_code (unique, UPPER), role_name, role_category (system/business/technical/management), description, workflow_permissions (JSONB), product_access_level (none/read/write/admin), is_active. 8 default roles seeded (BA, DEV, QA, PM, PO, ARCH, DEVOPS, VIEWER) | MUST | MVP | Tạo thiếu role_code/role_name → 422; role_code trùng → 409; role_category không hợp lệ → 422; soft-delete deactivate is_active = false |
| FR-039 | Gán vai trò cho nhân sự | Gán nhiều role cho user với scope: global / product / team. Mỗi assignment có: role_id, scope_type, scope_id, assigned_by, expires_at. Xem danh sách vai trò của user và danh sách user của vai trò | MUST | MVP | Gán role thành công; trùng (user+role+scope) → 409; thu hồi role thành công; danh sách role của user trả đúng |

### 3.7 Module BA Workflow

| FR-ID | Tên | Mô tả | Priority | Phase | Acceptance Criteria |
|-------|-----|-------|----------|-------|---------------------|
| FR-009 | Document State Machine | Tài liệu có 4 trạng thái: draft → review → approved → archived; không restrict theo role | MUST | MVP | Chuyển trạng thái đúng chiều; không thể nhảy cóc |
| FR-010 | Document Versioning | Mỗi lần edit tài liệu lưu snapshot lịch sử | MUST | MVP | Version trước vẫn xem được; history đúng thứ tự |
| FR-011 | Auto-push khi Approve | Khi BRS approved: tự động push sang Test Platform; tất cả doc type push sang PPG | MUST | MVP | BRS approve → Test Platform sinh test case; PPG cập nhật dashboard |
| FR-012 | Stakeholder Discussions | Thảo luận gắn với tài liệu, trạng thái: open/resolved/deferred | SHOULD | MVP | Tạo discussion thành công; resolve ghi nhận resolution notes |
| FR-027 | Gắn tài liệu BA với đối tượng | Khi tạo tài liệu BA, gắn với một hoặc nhiều đối tượng (Web App / Mobile App / API / ELT) | MUST | MVP | Gắn thành công; tra cứu theo đối tượng đúng; một tài liệu có thể gắn nhiều đối tượng |
| FR-028 | Tracking tài liệu theo milestone | Hiển thị trạng thái tài liệu BA theo milestone; cảnh báo khi chưa approve trong milestone hiện tại | SHOULD | MVP | Tài liệu hiển thị milestone; cảnh báo đúng khi milestone đến hạn |
| FR-029 | Loại tài liệu BA mở rộng | Hỗ trợ: BRD, BRS, FSD, API Spec, ERD, Data Dictionary, UI Wireframe, Process Flow | SHOULD | MVP | Tạo được đúng loại; loại không hợp lệ → từ chối |

### 3.8 Module Test Platform

| FR-ID | Tên | Mô tả | Priority | Phase | Acceptance Criteria |
|-------|-----|-------|----------|-------|---------------------|
| FR-013 | Auto Test Case Generation | Mỗi business rule trong BRS sinh 1 test case + 1 Playwright script | MUST | MVP | Số test case = số business rules; mỗi test case có Playwright script |
| FR-014 | Test Case State Machine | generated → reviewed → approved → executed | MUST | MVP | Chuyển trạng thái đúng chiều |
| FR-015 | Rediff | Khi BRS thay đổi và approve lại, tái sinh test case tự động; test case cũ → obsolete | MUST | MVP | Test case mới theo BRS mới; test case cũ đúng trạng thái |
| FR-016 | Test Report | Tạo test report: total, passed, failed, logs; coverage = passed/total × 100 | MUST | MVP | Tạo report thành công; coverage tính đúng |
| FR-017 | Test Report Approval | Approve test report → auto-push metrics về PPG | MUST | MVP | Approve thành công; PPG dashboard cập nhật đúng |
| FR-030 | Gắn test case với đối tượng | Test case được gắn tự động với đối tượng qua BRS nguồn | MUST | MVP | Test case kế thừa đúng đối tượng từ BRS |
| FR-031 | Tracking test theo milestone | Hiển thị coverage theo milestone; cảnh báo khi coverage < ngưỡng tối thiểu | SHOULD | MVP | Coverage đúng theo milestone; cảnh báo đúng khi dưới ngưỡng (default 80%) |
| FR-032 | Loại tài liệu Test mở rộng | Test Plan, Test Case, Test Report, Bug Report (severity), UAT Sign-off (approver, sign date) | SHOULD | MVP | Tạo đúng từng loại; Bug Report có severity; UAT Sign-off có trường approver |

### 3.9 Module Auth

| FR-ID | Tên | Mô tả | Priority | Phase | Acceptance Criteria |
|-------|-----|-------|----------|-------|---------------------|
| FR-018 | Basic Authentication | Đăng nhập username/password; JWT token; inactive user không được login | MUST | MVP | Không truy cập được API khi chưa đăng nhập; login thành công cấp JWT; sai password → 401; user inactive → 401 |

---

## 4. Non-Functional Requirements

| NFR-ID | Category | Requirement | Target |
|--------|----------|-------------|--------|
| NFR-001 | Performance | Response time API | < 2 giây cho các request thông thường |
| NFR-002 | Performance | Auto-gen test case | Hoàn thành trong < 30 giây cho BRS ≤ 50 business rules |
| NFR-003 | Availability | Uptime | ≥ 95% trong giờ hành chính |
| NFR-004 | Usability | BRS template | Phải có template chuẩn để auto-gen test case hoạt động chính xác |
| NFR-005 | Maintainability | Inter-service sync | Nếu sync thất bại, ghi log lỗi rõ ràng, không crash service chính |
| NFR-006 | Security | Basic Auth | Tất cả API endpoints được bảo vệ, không có public endpoint ngoài /health |
| NFR-007 | Data | Audit trail | Ghi log tất cả thao tác write với timestamp và user |
| NFR-008 | Data | Database | Tất cả tên bảng/cột dùng snake_case; migrations chỉ additive (không DROP/TRUNCATE trên prod) |
| NFR-009 | Code Quality | Backend | Python type hints bắt buộc; Black formatter; không tự gọi json.dumps() trước khi pass vào asyncpg parameter |
| NFR-010 | Code Quality | Frontend | TypeScript strict mode, không dùng `any` |

---

## 5. Business Rules

| BR-ID | Rule | Ghi chú |
|-------|------|---------|
| BR-001 | Tài liệu phải đi đúng chiều state machine: draft → review → approved → archived. Không nhảy cóc | Ai cũng có thể chuyển trạng thái — không restrict theo role |
| BR-002 | Chỉ BRS mới trigger auto-generate test cases khi được approve | BRD/ERD/API Spec không trigger |
| BR-003 | Test coverage = (passed / total) × 100. Total = 0 thì coverage = 0 | Không chia cho 0 |
| BR-004 | 9 milestone được tự động sinh và phân bổ tỷ lệ thời gian theo timeline dự án khi tạo mới | Ba tracks: project, ba, test |
| BR-005 | @alias trong meeting notes phải được thêm làm thành viên dự án trước khi parse | Nếu alias không tồn tại → ghi cảnh báo, không crash |
| BR-006 | Mỗi dự án phải khai báo đối tượng quản lý (Application Registry) theo schema chuẩn | Schema 4 types: Web App / Mobile App / API / ELT |
| BR-007 | File copy-from-URL lưu bản sao vào storage nội bộ — không chỉ lưu link | |
| BR-008 | Khi BRS rediff, test case cũ phải được đánh dấu obsolete hoặc archive | |
| BR-009 | Kế hoạch năm phải ở trạng thái active mới được phép gắn thêm dự án | Kế hoạch draft/closed không nhận dự án mới |
| BR-010 | Kế hoạch năm không thể chuyển sang closed nếu còn dự án active chưa hoàn thành | |
| BR-011 | Mỗi đối tượng (Web App / Mobile App / API / ELT) phải khai báo đủ trường bắt buộc trước khi gắn tài liệu BA hoặc test case | |
| BR-012 | Template export của từng loại đối tượng phải giống nhau giữa các dự án — không tùy chỉnh cột | Tính nhất quán để cross-project report hoạt động đúng |
| BR-013 | Khi import đối tượng từ file, nếu đối tượng đã tồn tại (cùng tên + cùng dự án) → hệ thống phải hỏi xác nhận: ghi đè hay tạo mới | Không tự động ghi đè |
| BR-014 | Tài liệu BA và test case kế thừa đối tượng từ BRS nguồn | Nếu BRS gắn nhiều đối tượng, tài liệu phái sinh gắn với tất cả |
| BR-015 | Catalog sản phẩm (org-wide) và Application Registry (project-level) là 2 danh mục riêng biệt | Catalog là tài sản tổ chức; Registry là scope dự án. Không merge |
| BR-016 | product_code trong Catalog và role_code trong Catalog Roles phải được tự động UPPER() và trim() khi lưu | |
| BR-017 | WSJF score = (business_value + time_criticality + risk_reduction) / job_size. job_size = 0 không được phép | Tránh divide-by-zero |
| BR-018 | 38 activity tasks được tự động tạo khi khởi tạo dự án, phân bổ theo 5 governance domains. Task mới thêm thủ công phải thuộc một trong 5 domains hợp lệ | |
| BR-019 | Export XLSX dùng VIB color scheme chuẩn (dark navy #1E3A5F header). Import XLSX chỉ upsert, không xóa records hiện có | |

---

## 6. System Integrations

| Integration | Từ | Đến | Trigger | Data |
|-------------|-----|-----|---------|------|
| sync-doc | BA Workflow | PPG | Document approved | Document metadata + content |
| /brs push | BA Workflow | Test Platform | BRS approved | BRS content đầy đủ |
| sync-test | Test Platform | PPG | Test Report approved | coverage, passed, failed, total |

**Ghi chú:** Tất cả integration là HTTP nội bộ. Không có integration với hệ thống bên ngoài trong version này.

---

## 7. User Stories

| US-ID | Role | Story | FR liên quan |
|-------|------|-------|-------------|
| US-001 | PM | Tôi muốn tạo dự án mới và có ngay 9 milestone chuẩn cho 3 tracks (project/BA/test) | FR-001, FR-002 |
| US-002 | PM | Tôi muốn khai báo danh sách ứng dụng/hệ thống của dự án theo chuẩn để dễ bàn giao | FR-003, FR-023, FR-024, FR-025 |
| US-003 | PM | Tôi muốn xem dashboard KPI của dự án để biết health mà không phải hỏi từng người | FR-007, FR-045 |
| US-004 | BA | Tôi muốn viết BRS và biết rõ tài liệu đang ở trạng thái nào trong luồng phê duyệt | FR-009, FR-010 |
| US-005 | BA | Tôi muốn approve BRS và tự động trigger sinh test case mà không cần thao tác thêm | FR-011, FR-013 |
| US-006 | QA | Tôi muốn nhận test case tự động từ BRS để tiết kiệm thời gian viết tay | FR-013, FR-014 |
| US-007 | QA | Tôi muốn approve test report và metrics tự động cập nhật lên dashboard | FR-016, FR-017 |
| US-008 | PM | Tôi muốn parse ghi chú họp thô thành biên bản có cấu trúc bằng cách dùng @alias | FR-006 |
| US-009 | PO | Tôi muốn tạo kế hoạch năm với objectives và DoD để theo dõi tiến độ toàn danh mục | FR-019, FR-020 |
| US-010 | PO | Tôi muốn xem portfolio dashboard với health và priority của tất cả dự án | FR-047, FR-045, FR-046 |
| US-011 | PM | Tôi muốn export toàn bộ thông tin dự án ra XLSX để gửi cho stakeholder và tái import khi cần | FR-042 |
| US-012 | Architect | Tôi muốn tra cứu tất cả kết nối đến/từ một ứng dụng để đánh giá impact khi thay đổi | FR-026 |
| US-013 | BA | Tôi muốn gắn tài liệu BA với đối tượng cụ thể (Web App / API / ELT) | FR-027, FR-028, FR-029 |
| US-014 | QA | Tôi muốn xem tất cả test case của một ứng dụng cụ thể và theo dõi coverage theo milestone | FR-030, FR-031, FR-032 |
| US-015 | Scrum Master | Tôi muốn theo dõi governance checklist của dự án theo 5 domain để đảm bảo tuân thủ quy trình | FR-043 |
| US-016 | PM | Tôi muốn khai báo stage gates và cập nhật trạng thái từng gate để kiểm soát chất lượng | FR-044 |
| US-017 | PO | Tôi muốn WSJF scoring cho từng dự án để ưu tiên backlog đúng cách | FR-046 |
| US-018 | Architect | Tôi muốn tra cứu toàn bộ catalog sản phẩm VIB (org-wide) theo loại và domain | FR-033, FR-034, FR-035, FR-036 |
| US-019 | PM | Tôi muốn tra cứu danh mục nhân sự VIB (org-wide) để biết ai có kỹ năng gì, thuộc team nào | FR-037 |
| US-020 | Architect | Tôi muốn quản lý vai trò tổ chức và gán vai trò cho nhân sự với scope rõ ràng | FR-038, FR-039 |
| US-021 | PM | Tôi muốn gắn dự án với domain VIB (HR, FS, DIGITAL...) để lọc và báo cáo theo domain | FR-040 |

---

## 8. Acceptance Criteria tổng thể

**Module gốc (v1.0)**
- [ ] Tạo dự án mới → 9 milestone được sinh tự động đúng tỷ lệ cho cả 3 tracks
- [ ] Khai báo ứng dụng/hệ thống theo schema chuẩn — thiếu trường bắt buộc thì không tạo được
- [ ] BA tạo BRS → approve → Test Platform tự động nhận và sinh test case
- [ ] Số test case sinh ra = số business rules trong BRS
- [ ] QA approve test report → PPG dashboard cập nhật coverage đúng
- [ ] Tài liệu không thể nhảy cóc trạng thái
- [ ] @alias trong meeting notes được resolve đúng
- [ ] Tất cả API endpoint trả về 401 khi chưa đăng nhập
- [ ] Inactive user không login được

**Module Annual Plan (v1.1)**
- [ ] Tạo kế hoạch năm với objectives và DoD items; trạng thái chuyển đúng chiều
- [ ] Kế hoạch closed không nhận dự án mới
- [ ] Kế hoạch không closed khi còn dự án active

**Module Application Registry mở rộng (v1.1)**
- [ ] Tạo Web App, Mobile App, API, ELT thiếu trường bắt buộc → bị từ chối
- [ ] Export đúng template; import tạo đúng records
- [ ] Import trùng tên → hỏi xác nhận

**Module Catalog (v1.2)**
- [ ] Tạo sản phẩm catalog thiếu product_code/product_name/product_type → 422
- [ ] product_code trùng → 409
- [ ] product_code tự động UPPER()
- [ ] Tạo môi trường trùng (product+env) → 409
- [ ] Tạo user catalog thiếu full_name/email → 422; email trùng → 409
- [ ] Tạo role catalog với role_category không hợp lệ → 422
- [ ] Gán role trùng (user+role+scope) → 409
- [ ] Xóa user → status = terminated (soft-delete)
- [ ] Xóa role → is_active = false (soft-delete)

**Project Management Extended (v1.2)**
- [ ] Health score rag_status không hợp lệ → 422
- [ ] WSJF job_size = 0 → 422
- [ ] WSJF score tính đúng công thức
- [ ] Portfolio summary filter đúng theo year/domain

**Project Governance Checklist (v1.2)**
- [ ] Tạo dự án → 38 activity tasks được sinh tự động theo 5 domains
- [ ] Cập nhật status activity task thành công
- [ ] Filter task theo domain trả đúng
- [ ] Task domain không hợp lệ → 400

**Export/Import XLSX (v1.2)**
- [ ] Export tạo file XLSX đúng 4 sheets với VIB branding
- [ ] Import upsert đúng theo từng sheet
- [ ] Import không xóa records hiện có
- [ ] Import file sai format → 400

**Domain Classification (v1.2)**
- [ ] 12 domains VIB seed đầy đủ
- [ ] Lọc dự án theo domain trả đúng
- [ ] GET /projects/domains trả danh sách LOV

---

## 9. Open Questions

| OQ-ID | Câu hỏi | Waiting | Status | Deadline | Impact |
|-------|---------|---------|--------|----------|--------|
| OQ-001 | Schema chuẩn Application Registry (project-level) — các trường bắt buộc? | Architect | **RESOLVED** — ADR-004 | — | FR-003, FR-023, FR-024, FR-025 |
| OQ-002 | Cơ chế Auth: username/password DB nội bộ hay VIB LDAP/SSO? | Tech Lead | **RESOLVED** — ADR-003 (DB-based JWT, upgrade path SSO) | — | FR-018 |
| OQ-003 | BRS template chuẩn để auto-gen test case — format business rules? | BA + QA | Pending | Trước Stage 1.4 Dev | FR-013 |
| OQ-004 | Schema chuẩn Web App / Mobile App / API / ELT? | Architect | **RESOLVED** — ADR-004 + CODE-002 | — | FR-023, FR-024, FR-025 |
| OQ-005 | Template export/import per type — format và columns? | BA + Architect | **RESOLVED** — ADR-004 (Excel .xlsx, columns cố định per type) | — | FR-023, FR-024, FR-025 |
| OQ-006 | Ngưỡng coverage tối thiểu mặc định (đề xuất 80%) — PO có đồng ý? | PO | Pending | Trước Stage 2.2 Dev | FR-031 |
| OQ-007 | Annual Plan — phân quyền xem/sửa có khác dự án thường không? | PO + Tech Lead | Pending | Trước Stage 2.1 Dev | FR-019, FR-020, FR-021 |
| OQ-008 | Catalog sản phẩm (org-wide) — ai có quyền tạo/sửa/xóa? Tất cả user hay chỉ Architect/Admin? | PO + Tech Lead | **[CLARIFY]** | Trước Stage 2.3 Dev | FR-033 đến FR-036 |
| OQ-009 | Catalog nhân sự (org-wide) — dữ liệu seed từ đâu? HR system hay tự nhập? | PO + HR | **[CLARIFY]** | Trước Stage 2.3 Dev | FR-037, FR-038, FR-039 |
| OQ-010 | Governance checklist (38 tasks) — template tasks có được thay đổi theo dự án/domain không? Hay cố định? | PO + Scrum Master | **[CLARIFY]** | Trước Stage 2.2 Dev | FR-043 |

---

## 10. Signals cho roles đang làm song song

### Architect cần biết:
- **FR-003, FR-023, FR-024, FR-025** — Application Registry schema đã resolved bởi ADR-004
- **FR-033 đến FR-036** — Catalog sản phẩm org-wide: schema đã implement (CODE-002 v2.0). Cần ADR review pattern JSONB details per type
- **FR-026** — Cross-project Connection Report cần query join nhiều bảng — xem xét index strategy
- **FR-046** — WSJF scoring: công thức đã implement (business_value + time_criticality + risk_reduction) / job_size
- **BR-015** — Catalog org-wide và Registry project-level là 2 danh mục riêng biệt — không merge

### Developer cần biết:
- State machine transition không restrict theo role — bất kỳ authenticated user
- Auto-push là background task — nếu thất bại ghi log, không rollback document transition
- asyncpg JSONB codec handles encoding — **không bao giờ gọi json.dumps() trước khi pass vào asyncpg params**
- start_date/end_date phải là `datetime.date` object, không phải string khi pass vào asyncpg
- **FR-019 đến FR-022** — Annual Plan đã implement (V018 migration + annual_plans_v2.py)
- **FR-033 đến FR-039** — Catalog module đã implement (V021 + V026 + V027 migrations, catalog_products.py + catalog_users.py)
- **FR-040** — project_domains LOV đã implement (V028 migration)
- **FR-042** — Export/Import XLSX đã implement (project_export.py router)
- **FR-043** — Governance Checklist đã implement (V029 migration + activity_tasks.py)
- **FR-044, FR-045, FR-046, FR-047** — Stage Gates, Health Score, WSJF, Portfolio đã implement (project_management.py)

### QA cần biết:
- Critical paths: FR-011 (BRS approve → auto-push), FR-013 (test case count = business rules), FR-017 (approve → PPG sync)
- **FR-033**: test product_code UPPER() coercion; duplicate → 409; soft-delete → status = deprecated
- **FR-037**: test email uniqueness; soft-delete → status = terminated
- **FR-038**: test role_category Literal validation (system/business/technical/management)
- **FR-046**: test WSJF job_size = 0 → 422; score tính đúng công thức
- **FR-043**: test 38 tasks được tạo khi init project; filter domain hoạt động đúng
- **BR-013**: import trùng tên → prompt xác nhận, không tự ghi đè
- **BR-019**: import XLSX chỉ upsert, không xóa records

---

## 11. API Summary (tổng hợp endpoints đã implement)

### PPG System — :8001

| Prefix | Endpoints chính |
|--------|----------------|
| `/projects` | CRUD, dashboard, brief, domains LOV |
| `/projects/{id}/milestones` | List, generate |
| `/projects/{id}/members` | CRUD |
| `/projects/{id}/files` | CRUD, download, copy-from-url |
| `/projects/{id}/meetings` | List, generate (meeting parser) |
| `/projects/{id}/objects` | CRUD Web App/Mobile/API/ELT |
| `/projects/{id}/stage-gates` | CRUD |
| `/projects/{id}/health-scores` | List, create, latest |
| `/projects/{id}/priority` | Get, upsert (WSJF) |
| `/projects/{id}/stakeholders` | CRUD |
| `/projects/{id}/export` | Download XLSX |
| `/projects/{id}/import` | Upload XLSX |
| `/projects/{id}/activity-tasks` | List, create, patch, delete |
| `/projects/portfolio/summary` | Portfolio dashboard |
| `/annual-plans` | CRUD, status, DoD items, projects |
| `/catalog/products` | CRUD catalog products, environments, licenses, details |
| `/catalog/users` | CRUD catalog users, roles assignment |
| `/catalog/roles` | CRUD catalog roles, role users |
| `/api/v1/reports/connections` | Cross-project connection report |
| `/sync-doc`, `/sync-test` | Inter-service sync receivers |

### BA Workflow — :8002

| Prefix | Endpoints chính |
|--------|----------------|
| `/api/v1/documents` | CRUD, state machine action, versioning, object links, file upload |
| `/api/v1/discussions` | CRUD, resolve |
| `/api/v1/ba-tasks` | CRUD |
| `/api/v1/timeline/{project_id}` | Timeline view |

### Test Platform — :8003

| Prefix | Endpoints chính |
|--------|----------------|
| `/brs` | Receive + rediff |
| `/test-cases` | CRUD, state machine, coverage |
| `/test-reports` | CRUD, approve |
| `/test-tasks` | CRUD |
| `/timeline/{project_id}` | Timeline view |

---

## 12. PO Critic Review

### Value Alignment
- ✅ Tất cả FR đều gắn với user story và pain point rõ ràng
- ✅ Catalog module (FR-033 đến FR-039) giải quyết P-06 (danh mục tổ chức chưa chuẩn)
- ✅ Export/Import XLSX (FR-042) giải quyết nhu cầu chia sẻ dữ liệu với stakeholder ngoài system

### Completeness
- ⚠️ **[CLARIFY]** OQ-008: Phân quyền Catalog chưa rõ — cần xác nhận trước khi ship
- ⚠️ **[CLARIFY]** OQ-010: Template governance checklist 38 tasks có thể tùy chỉnh hay cố định?
- ℹ️ FR-043 (governance checklist) chưa có cơ chế notification khi task overdue — trong scope OS-06

### Conflicts & Contradictions
- ⚠️ **[SCOPE RISK]** BR-015: Catalog org-wide vs Registry project-level — cần UI rõ ràng để user không nhầm lẫn giữa 2 danh mục
- ℹ️ FR-042 (Import XLSX) và BR-013 (Import từ file application registry) dùng cùng cơ chế upsert nhưng target table khác nhau — nhất quán về behavior

### Scope Risks
- **[SCOPE RISK]** FR-036 (chi tiết kỹ thuật per-type JSONB): Flexibility cao nhưng khó validate schema — cần business rule rõ ràng hơn về required fields per type
- **[SCOPE RISK]** FR-038 (workflow_permissions JSONB): Schema của JSONB này chưa được define rõ — cần document cấu trúc chuẩn

### Items Needing Clarification

| # | Item | Người cần confirm | Priority |
|---|------|------------------|----------|
| 1 | OQ-008: Phân quyền Catalog (ai tạo/sửa?) | PO + Tech Lead | High |
| 2 | OQ-009: Nguồn dữ liệu Catalog nhân sự | PO + HR | Medium |
| 3 | OQ-010: Governance checklist template có thể tùy chỉnh? | PO + Scrum Master | Medium |
| 4 | OQ-006: Ngưỡng coverage 80% — confirm với PO | PO | Low |
| 5 | OQ-003: BRS template chuẩn | BA + QA | High |

---

---

## 13. Đối tượng dữ liệu được quản lý

> Phần này mô tả **những gì hệ thống lưu trữ và quản lý** theo từng module, bằng ngôn từ nghiệp vụ dành cho người dùng cuối. Mỗi đối tượng là một "loại thông tin" mà người dùng tạo, xem, cập nhật trong quá trình làm việc hàng ngày.

---

### 13.1 Module PPG — Quản trị dự án

#### Dự án
Đơn vị trung tâm của toàn hệ thống. Mỗi dự án là một sáng kiến IT được triển khai tại VIB.

| Thông tin | Mô tả |
|-----------|-------|
| Mã dự án | Mã định danh duy nhất, không đổi trong suốt vòng đời (ví dụ: `PROJ-2026-001`) |
| Tên dự án | Tên đầy đủ, mô tả mục tiêu dự án |
| Trạng thái | **Đang triển khai** / **Tạm dừng** / **Hoàn thành** / **Lưu trữ** |
| Owner | Người chịu trách nhiệm chính (thường là PM) |
| Thời gian | Ngày bắt đầu và ngày kết thúc dự kiến |
| Domain nghiệp vụ | Lĩnh vực thuộc dự án (HR / Ngân hàng bán lẻ / Digital / Tuân thủ / ...) — 12 domain VIB |
| Hồ sơ dự án | Mục đích, người dùng mục tiêu, tính năng bắt buộc, rủi ro dự kiến, phương pháp triển khai |

---

#### Cột mốc dự án (Milestone)
Mỗi dự án có **9 cột mốc chuẩn** được tạo tự động ngay khi dự án được khởi tạo, trải dài từ Kickoff đến Closure.

| Thông tin | Mô tả |
|-----------|-------|
| Tên cột mốc | Ví dụ: Khởi động / Thu thập yêu cầu / Thiết kế / Phát triển / SIT / UAT / Go-Live / Hypercare / Đóng dự án |
| Thời gian | Ngày bắt đầu và kết thúc, phân bổ tự động theo timeline dự án |
| Trạng thái | **Lên kế hoạch** / **Đang thực hiện** / **Hoàn thành** / **Trễ** |
| Tiêu chí hoàn thành | Điều kiện để cột mốc được coi là đạt (do PM định nghĩa) |
| Điều kiện tiên quyết | Cột mốc nào phải xong trước cột mốc này mới được bắt đầu |

---

#### Thành viên dự án
Danh sách nhân sự tham gia dự án và vai trò của từng người.

| Thông tin | Mô tả |
|-----------|-------|
| Họ tên | Tên đầy đủ của thành viên |
| Bí danh (@alias) | Tên viết tắt dùng trong biên bản họp (ví dụ: `@john`, `@sarah`) — hệ thống tự map thành tên đầy đủ |
| Vai trò | PM / BA / Dev / QA / PO / Stakeholder |
| Email | Địa chỉ liên lạc |
| Trạng thái | Đang tham gia / Đã rời dự án |

---

#### Tài liệu dự án & Lịch sử phiên bản
Tất cả file tài liệu gắn với dự án, có theo dõi lịch sử thay đổi qua từng lần upload.

| Thông tin | Mô tả |
|-----------|-------|
| Tên tài liệu | Tên file và phân loại (ví dụ: BRD, Thiết kế kỹ thuật, Kịch bản test) |
| Loại file | **Template hệ thống** / **File tự upload** / **Liên kết ngoài** (SharePoint, ADO) |
| Phiên bản hiện tại | Phiên bản đang hiệu lực (ví dụ: v1.0, v1.1) |
| Lịch sử phiên bản | Toàn bộ các phiên bản trước: ai upload, khi nào, ghi chú thay đổi, dung lượng |
| Cột mốc gắn với | Tài liệu thuộc cột mốc nào trong dự án |

---

#### Biên bản họp
Ghi chép kết quả họp có cấu trúc, sinh tự động từ ghi chú thô.

| Thông tin | Mô tả |
|-----------|-------|
| Ghi chú thô | Nội dung người dùng nhập tự do, dùng `@alias` để đánh dấu người liên quan |
| Người tham dự | Danh sách thành viên được system tự nhận dạng qua @alias |
| Quyết định | Các kết luận và quyết định ghi nhận trong cuộc họp |
| Hành động cần làm | Danh sách việc cần làm sau họp — mỗi việc ghi rõ **người thực hiện** và **hạn chót** |
| Rủi ro phát sinh | Các rủi ro được đề cập và cần theo dõi |
| Ngày họp | Thời gian và địa điểm diễn ra cuộc họp |

---

#### Object Registry — Danh sách đối tượng công nghệ của dự án
Danh mục các ứng dụng, hệ thống, API và kết nối mà dự án này quản lý hoặc tác động đến.

| Thông tin | Mô tả |
|-----------|-------|
| Loại đối tượng | **Ứng dụng** (Web/Mobile) / **Hệ thống** (Backend/Legacy) / **Job** (Batch/Scheduler) / **Kết nối** (API/ETL) |
| Mã định danh | Mã duy nhất trong phạm vi dự án (ví dụ: `APP-EBANKING`, `JOB-EOD-SETTLE`) |
| Môi trường | Danh sách môi trường đang triển khai: DEV / SIT / UAT / PROD |
| Trạng thái | Đang hoạt động / Ngừng hoạt động / Đã lỗi thời |

---

#### Kế hoạch năm & Các thành phần mở rộng
Kế hoạch danh mục dự án toàn năm, bao gồm đầy đủ ngân sách, nhân lực, KPI và rủi ro.

| Đối tượng con | Thông tin lưu trữ |
|--------------|------------------|
| **Kế hoạch năm** | Tên kế hoạch, năm, trạng thái: **Bản nháp** / **Đang triển khai** / **Đóng**; danh sách mục tiêu; tiêu chí hoàn thành (DoD) có trọng số |
| **Sáng kiến** | Các chương trình lớn trong kế hoạch, phân theo quý (Q1–Q4), mức độ ưu tiên (1–5) |
| **Ngân sách** | Từng dòng ngân sách: tên hạng mục, loại chi phí (**Capex** / **Opex**), quý, số tiền kế hoạch, số tiền thực chi (VND) |
| **Phân bổ nhân lực** | Ai làm gì, thuộc team nào, tỷ lệ phân bổ (%), theo quý |
| **KPI / OKR** | Chỉ số đo lường: tên chỉ số, đơn vị, mục tiêu, thực tế, trạng thái: **Đúng tiến độ** / **Có rủi ro** / **Lệch mục tiêu** / **Đạt** |
| **Rủi ro kế hoạch** | Tiêu đề, mô tả, phân loại, xác suất (1–5), mức độ ảnh hưởng (1–5), điểm rủi ro (tích 2 chỉ số), biện pháp giảm thiểu, người chịu trách nhiệm, trạng thái |
| **Phụ thuộc giữa dự án** | Dự án A phải xong trước dự án B mới được bắt đầu — theo dõi trạng thái và loại phụ thuộc |
| **Mục tiêu kinh doanh** | Mục tiêu nghiệp vụ cấp cao (Tăng trưởng / Hiệu quả / Rủi ro / Tuân thủ / Khách hàng), liên kết với sáng kiến tương ứng |

---

#### Health Score — Đánh giá sức khỏe dự án
Đánh giá định kỳ về mức độ khỏe mạnh của dự án theo 6 chiều, dùng màu đèn giao thông.

| Thông tin | Mô tả |
|-----------|-------|
| Tổng thể | Xanh 🟢 / Vàng 🟡 / Đỏ 🔴 — tổng hợp toàn dự án |
| Tiến độ | Đánh giá riêng về mức độ đúng hạn |
| Ngân sách | Đánh giá riêng về mức độ trong ngân sách |
| Phạm vi | Đánh giá riêng về mức độ kiểm soát scope |
| Nhân sự | Đánh giá riêng về đầy đủ và ổn định nhân sự |
| Rủi ro | Đánh giá riêng về mức độ rủi ro đang được kiểm soát |
| Ngày đánh giá | Khi nào đánh giá, ai đánh giá, ghi chú giải thích từng chiều |

---

#### Stage Gate — Cổng kiểm soát chất lượng
Các điểm kiểm tra chính thức trước khi dự án chuyển sang giai đoạn tiếp theo.

| Thông tin | Mô tả |
|-----------|-------|
| Tên cổng | Ví dụ: Gate 1 — Phê duyệt yêu cầu / Gate 2 — Phê duyệt thiết kế / Gate 3 — Go-Live |
| Tiêu chí | Danh sách điều kiện phải đáp ứng, từng tiêu chí ghi rõ đã đạt hay chưa |
| Người phê duyệt | Ai là người sign-off cho cổng này |
| Trạng thái | **Chưa bắt đầu** / **Đang xem xét** / **Đã qua** / **Bị chặn** / **Bỏ qua** |
| Ngày kiểm tra | Ngày dự kiến và ngày thực tế thực hiện gate review |

---

#### Stakeholder Map — Bản đồ các bên liên quan
Danh sách tất cả bên liên quan đến dự án và chiến lược tiếp cận từng người.

| Thông tin | Mô tả |
|-----------|-------|
| Tên | Tên người hoặc tổ chức |
| Tổ chức | Phòng ban hoặc đơn vị bên ngoài |
| Mức độ quan tâm | Thấp / Trung bình / Cao — họ quan tâm bao nhiêu đến dự án |
| Mức độ ảnh hưởng | Thấp / Trung bình / Cao — họ có thể ảnh hưởng bao nhiêu đến dự án |
| Chiến lược tiếp cận | Cách thức tương tác, cập nhật thông tin và quản lý kỳ vọng |

---

#### Checklist quản trị (Governance Checklist)
38 đầu việc quản trị tự động tạo cho mỗi dự án, đảm bảo dự án tuân thủ đầy đủ quy trình VIB.

| Lĩnh vực | Nội dung tiêu biểu |
|---------|-------------------|
| **Yêu cầu nghiệp vụ** | BRD được phê duyệt, yêu cầu đã được stakeholder sign-off, scope đã được confirm |
| **Kiến trúc & Code** | Thiết kế kỹ thuật đã review, code review hoàn thành, unit test đủ coverage |
| **Hạ tầng** | Môi trường đã cấu hình, CI/CD pipeline hoạt động, monitoring đã thiết lập |
| **Bảo mật & IAM** | Security review hoàn thành, phân quyền truy cập đã cấu hình, penetration test (nếu cần) |
| **Tuân thủ & Governance** | Tài liệu bàn giao đầy đủ, approval từ stakeholder chính, post go-live review đã lên lịch |

Mỗi đầu việc theo dõi: **Chờ xử lý** / **Đang làm** / **Hoàn thành** / **Bỏ qua** / **Không áp dụng** — cùng với người phụ trách và hạn chót.

---

#### Hợp đồng & Licence phần mềm

| Đối tượng | Thông tin lưu trữ |
|-----------|------------------|
| **Hợp đồng** | Nhà cung cấp, loại hợp đồng (bảo trì / phát triển / SaaS / outsourcing), giá trị hợp đồng (VND), ngày bắt đầu, ngày hết hạn, có tự gia hạn không, thông tin SLA, trạng thái (**Đang hiệu lực** / **Hết hạn** / **Chờ ký**) |
| **Licence phần mềm** | Tên phần mềm, loại bản quyền (thương mại / mã nguồn mở / subscription), số lượng, ngày hết hạn, chi phí, trạng thái tuân thủ (**Hợp lệ** / **Vi phạm** / **Cần xem xét** / **Đã hết hạn**) |

---

### 13.2 Module BA Workflow — Quản lý tài liệu nghiệp vụ

#### Yêu cầu nghiệp vụ thô
Nội dung yêu cầu ở dạng chưa được chuẩn hóa, thường là đầu vào ban đầu từ stakeholder.

| Thông tin | Mô tả |
|-----------|-------|
| Tiêu đề | Tóm tắt ngắn gọn nội dung yêu cầu |
| Nội dung thô | Mô tả chi tiết theo ngôn ngữ nghiệp vụ, chưa qua định dạng chuẩn |
| Người tạo | BA hoặc người thu thập yêu cầu |
| Dự án | Yêu cầu thuộc dự án nào |

---

#### Tài liệu BA chính thức
Tài liệu nghiệp vụ đã được chuẩn hóa, đi qua luồng phê duyệt có kiểm soát.

| Thông tin | Mô tả |
|-----------|-------|
| Loại tài liệu | **BRD** (Tài liệu yêu cầu nghiệp vụ) / **BRS** (Đặc tả yêu cầu nghiệp vụ) / **FSD** (Đặc tả chức năng) / **ERD** (Sơ đồ quan hệ dữ liệu) / **API Spec** (Đặc tả API) |
| Phiên bản | Phiên bản hiện tại (v1.0, v1.1, ...) |
| Tiêu đề | Tên đầy đủ của tài liệu |
| Nội dung | Nội dung có cấu trúc theo từng loại tài liệu |
| Trạng thái | **Bản nháp** → **Đang review** → **Đã phê duyệt** → **Lưu trữ** |
| Người review | BA lead hoặc Architect review tài liệu |
| Người phê duyệt | PO hoặc Stakeholder chính phê duyệt |
| Thời điểm đẩy | Khi nào tài liệu được tự động gửi sang Test Platform hoặc PPG |

> **Lưu ý luồng:** Chỉ tài liệu ở trạng thái **Đã phê duyệt** mới được hệ thống tự động gửi sang các module khác. Riêng **BRS**, khi được phê duyệt sẽ tự động kích hoạt sinh test case tại Test Platform.

---

#### Lịch sử phiên bản tài liệu
Bản lưu tự động sau mỗi lần BA chỉnh sửa tài liệu. Không bao giờ xóa lịch sử — mọi thay đổi đều được truy vết.

| Thông tin | Mô tả |
|-----------|-------|
| Phiên bản | Phiên bản tương ứng tại thời điểm lưu |
| Người chỉnh sửa | Ai đã thực hiện thay đổi |
| Ghi chú thay đổi | Mô tả ngắn gọn đã thay đổi gì |
| Nội dung snapshot | Toàn bộ nội dung tài liệu tại thời điểm đó (có thể xem lại bất kỳ lúc nào) |
| Thời điểm | Ngày giờ thực hiện thay đổi |

---

#### Thảo luận Stakeholder
Luồng trao đổi và làm rõ yêu cầu gắn với từng tài liệu, trước khi phê duyệt.

| Thông tin | Mô tả |
|-----------|-------|
| Tiêu đề | Chủ đề của thảo luận |
| Nội dung | Câu hỏi, quan điểm hoặc vấn đề cần làm rõ |
| Người đặt vấn đề | Ai nêu ra thảo luận này |
| Trạng thái | **Đang mở** / **Đã giải quyết** / **Hoãn lại** |
| Kết quả xử lý | Ghi nhận quyết định cuối cùng khi đóng thảo luận, ai là người giải quyết |

---

#### Nhiệm vụ BA (BA Tasks)
Các đầu việc cụ thể của BA gắn với từng cột mốc dự án.

| Thông tin | Mô tả |
|-----------|-------|
| Loại công việc | Thu thập yêu cầu / Viết BRD / Review / Sign-off / v.v. |
| Mô tả | Chi tiết công việc cần làm |
| Điều kiện tiên quyết | Công việc nào phải xong trước công việc này |
| Trạng thái | **Chờ xử lý** / **Đang làm** / **Hoàn thành** / **Bỏ qua** |
| Người phụ trách | BA cụ thể chịu trách nhiệm |
| Hạn chót | Ngày phải hoàn thành |
| Cột mốc | Thuộc cột mốc nào trong dự án |

---

### 13.3 Module Test Platform — Kiểm thử tự động

#### BRS đã nhận từ BA
Bản sao của tài liệu BRS được hệ thống nhận khi BA phê duyệt, dùng làm nguyên liệu sinh test case.

| Thông tin | Mô tả |
|-----------|-------|
| Mã BRS | Mã tài liệu BRS gốc bên BA |
| Phiên bản | Phiên bản BRS khi nhận (mỗi lần BA cập nhật và phê duyệt lại → phiên bản mới) |
| Dự án | Dự án mà BRS này thuộc về |
| Nội dung | Toàn bộ danh sách module nghiệp vụ và các business rule — đây là đầu vào để sinh test case |

---

#### Test Case — Ca kiểm thử
Test case được sinh tự động từ từng business rule trong BRS. **1 business rule = 1 test case.**

| Thông tin | Mô tả |
|-----------|-------|
| Module nghiệp vụ | Nhóm chức năng mà test case này kiểm tra (ví dụ: Đăng nhập / Chuyển tiền / Phê duyệt hạn mức) |
| Tiêu đề | Mô tả ngắn gọn kịch bản kiểm thử |
| Các bước thực hiện | Danh sách bước thao tác tuần tự để chạy test |
| Kết quả kỳ vọng | Hệ thống phải phản hồi như thế nào khi chạy đúng kịch bản |
| Script kiểm thử tự động | Playwright script E2E tự động sinh — QA có thể xem, copy và bổ sung thêm assertion cụ thể |
| Trạng thái | **Vừa sinh** → **Đã review** → **Đã phê duyệt** → **Đã thực thi** |

---

#### Báo cáo kiểm thử
Kết quả của một đợt kiểm thử, do QA tạo sau khi chạy test.

| Thông tin | Mô tả |
|-----------|-------|
| Tổng số test case | Tổng ca kiểm thử trong đợt này |
| Số case đạt | Số ca kiểm thử chạy thành công |
| Số case không đạt | Số ca kiểm thử phát hiện lỗi |
| Tỷ lệ coverage | (Số đạt / Tổng số) × 100% — tự động tính |
| Nhật ký chi tiết | Log ghi nhận chi tiết quá trình chạy test |
| Trạng thái | **Mới tạo** / **Đã phê duyệt** |
| Thời điểm phê duyệt | Khi QA lead xác nhận báo cáo hợp lệ → kích hoạt tự động đồng bộ số liệu về PPG |

> **Lưu ý:** Ngay khi báo cáo được **phê duyệt**, số liệu coverage tự động cập nhật lên dashboard dự án bên PPG để PM và PO theo dõi mà không cần thao tác thêm.

---

#### Nhiệm vụ Test (Test Tasks)
Các đầu việc cụ thể của QA gắn với từng cột mốc dự án — tương tự Nhiệm vụ BA nhưng dành cho team kiểm thử.

| Thông tin | Mô tả |
|-----------|-------|
| Loại công việc | Lập kế hoạch test / Thiết kế test case / Chạy SIT / Chạy UAT / Regression / v.v. |
| Điều kiện tiên quyết | Công việc phải xong trước khi bắt đầu task này |
| Trạng thái | **Chờ xử lý** / **Đang làm** / **Hoàn thành** / **Bỏ qua** |
| Người phụ trách | QA cụ thể chịu trách nhiệm |
| Hạn chót | Ngày phải hoàn thành |
| Cột mốc | Thuộc cột mốc nào trong dự án |

---

### 13.4 Module Catalog — Danh mục tổ chức

> Catalog là danh mục **cấp toàn tổ chức VIB**, độc lập với dự án cụ thể. Mục đích: có một nơi duy nhất để tra cứu tất cả sản phẩm/hệ thống và nhân sự IT của VIB theo chuẩn thống nhất.

#### Sản phẩm & Hệ thống tổ chức (Org-wide Product Catalog)
Toàn bộ ứng dụng, hệ thống, API, pipeline dữ liệu đang hoạt động tại VIB — không phân biệt thuộc dự án nào.

| Thông tin | Mô tả |
|-----------|-------|
| Mã sản phẩm | Mã định danh duy nhất toàn tổ chức (tự động viết hoa) |
| Tên sản phẩm | Tên đầy đủ, thân thiện với người dùng |
| Loại | **Web App** / **Mobile App** / **Job/Scheduler** / **ETL Pipeline** / **API Service** |
| Đơn vị sở hữu | Team/phòng ban chịu trách nhiệm vận hành |
| Chủ sở hữu nghiệp vụ | Người đại diện nghiệp vụ (Business Owner) |
| Chủ sở hữu kỹ thuật | Người chịu trách nhiệm kỹ thuật (Technical Owner) |
| Trạng thái | **Đang hoạt động** / **Ngừng hoạt động** / **Đã lỗi thời** / **Đang lên kế hoạch** |
| Nhãn phân loại | Tags tự do để tìm kiếm nhanh |
| Chi tiết kỹ thuật | Thông tin đặc thù theo loại: Web App ghi URL và CDN; API ghi spec và rate limit; ETL ghi nguồn và đích dữ liệu; Job ghi lịch chạy và điều kiện retry |

---

#### Môi trường sản phẩm
Thông tin triển khai của từng sản phẩm theo từng môi trường.

| Thông tin | Mô tả |
|-----------|-------|
| Môi trường | **DEV** / **SIT** / **UAT** / **PROD** / **DR** / **STAGING** |
| URL truy cập | Địa chỉ để sử dụng sản phẩm trong môi trường này |
| Thông tin server | Loại hạ tầng (VM/K8s/Cloud), nhà cung cấp, cấu hình |
| Phiên bản đang chạy | Version hiện tại trên môi trường này |
| Ngày triển khai gần nhất | Lần cuối deploy là khi nào |
| Trạng thái | **Đang hoạt động** / **Không hoạt động** / **Đang bảo trì** |

---

#### Licence sản phẩm (cấp tổ chức)
Quản lý bản quyền phần mềm gắn với từng sản phẩm trong catalog.

| Thông tin | Mô tả |
|-----------|-------|
| Tên bản quyền | Ví dụ: Oracle Database Enterprise, Dynatrace APM, v.v. |
| Loại | **Thương mại** / **Mã nguồn mở** / **Subscription hàng năm** / **Miễn phí** |
| Nhà cung cấp | Tên công ty cung cấp bản quyền |
| Số lượng | Số license đang sở hữu |
| Ngày hết hạn | Cần gia hạn trước ngày này |
| Chi phí | Giá trị bản quyền (VND) |
| Gia hạn tự động | Có tự động gia hạn không |
| Trạng thái tuân thủ | **Hợp lệ** / **Vi phạm** / **Cần xem xét** |

---

#### Nhân sự tổ chức (Org-wide User Catalog)
Danh mục nhân sự IT VIB — tra cứu ai đang làm gì, thuộc team nào, có kỹ năng gì.

| Thông tin | Mô tả |
|-----------|-------|
| Mã nhân viên | Mã định danh nội bộ VIB |
| Họ tên | Tên đầy đủ |
| Loại | **Nội bộ VIB** / **Bên ngoài** / **Contractor** / **Vendor** |
| Phòng ban & Vị trí | Thuộc phòng ban nào, chức danh |
| Manager | Quản lý trực tiếp |
| Team | Nhóm làm việc cụ thể |
| Địa điểm | Văn phòng/chi nhánh |
| Trạng thái | **Đang làm việc** / **Nghỉ tạm thời** / **Đã nghỉ việc** |
| Kỹ năng | Danh sách kỹ năng/công nghệ (tự khai báo hoặc do HR cập nhật) |

---

#### Vai trò tổ chức (Org-wide Role Catalog)
Định nghĩa các vai trò chuẩn trong hệ thống — quy định ai được làm gì.

| Thông tin | Mô tả |
|-----------|-------|
| Mã vai trò | Ví dụ: BA, DEV, QA, PM, PO, ARCH, DEVOPS, VIEWER |
| Tên vai trò | Tên đầy đủ dễ hiểu |
| Nhóm vai trò | **Hệ thống** / **Nghiệp vụ** / **Kỹ thuật** / **Quản lý** |
| Quyền trên workflow | Những hành động được phép trong từng luồng công việc (phê duyệt tài liệu, review test case, v.v.) |
| Mức truy cập sản phẩm | Không có / Chỉ đọc / Đọc-ghi / Quản trị toàn quyền |

> Hệ thống đã có sẵn **8 vai trò mặc định**: BA, DEV, QA, PM, PO, ARCH, DEVOPS, VIEWER.

---

#### Phân công vai trò cho nhân sự
Gán nhân sự vào vai trò với phạm vi và thời hạn cụ thể.

| Thông tin | Mô tả |
|-----------|-------|
| Nhân sự | Người được gán vai trò |
| Vai trò | Vai trò được gán |
| Phạm vi | **Toàn tổ chức** / **Theo sản phẩm cụ thể** / **Theo team** |
| Người giao vai trò | Ai đã thực hiện phân công |
| Thời hạn | Vai trò có hiệu lực đến khi nào (để trống = không giới hạn) |

---

### 13.5 Sơ đồ quan hệ giữa các đối tượng

```
[Kế hoạch năm]
    └── gắn với nhiều ──► [Dự án]
                              ├── có 9 ──► [Cột mốc]
                              ├── có nhiều ──► [Thành viên]  ◄── tra cứu từ ── [Nhân sự tổ chức]
                              ├── có nhiều ──► [Tài liệu & Phiên bản]
                              ├── có nhiều ──► [Biên bản họp]
                              ├── có nhiều ──► [Object Registry]
                              ├── có 1 ──► [Health Score]
                              ├── có nhiều ──► [Stage Gates]
                              ├── có nhiều ──► [Stakeholders]
                              ├── có 38 ──► [Checklist quản trị]
                              ├── có nhiều ──► [Hợp đồng & Licence]
                              └── gắn với ──► [Nhiệm vụ BA]  ──► [Tài liệu BA]
                                                                       ├── BRS approved ──► [BRS nhận từ BA]
                                                                       │                        └── sinh ──► [Test Case]
                                                                       │                                        └── chạy ──► [Báo cáo kiểm thử]
                                                                       │                                                          └── approved ──► cập nhật dashboard
                                                                       └── gắn với ──► [Nhiệm vụ Test]

[Catalog tổ chức]  (độc lập — không phụ thuộc dự án cụ thể)
    ├── [Sản phẩm/Hệ thống]  ──► [Môi trường]  /  [Licence]  /  [Chi tiết kỹ thuật]
    ├── [Nhân sự]  ──► [Phân công vai trò]
    └── [Vai trò]  ──► [Phân công vai trò]
```

---

*BRD-001 — DevOps Ecosystem Platform | Author: BA Team / PO Agent | Created: 2026-04-09 | Updated: 2026-04-14 | Version: 1.3*
