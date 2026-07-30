# VIB convert file System — CLAUDE.md
# Shared context cho tất cả agents và team members
# Cập nhật sau mỗi decision quan trọng. KHÔNG xóa history — chỉ append.
# Xem: Build_Standard.md — Section 1.4 (Multi-Human Collaboration)

---

## Project Profile
project_id:     ecosys
name:           VIB ecosystem
product_type:   internal_tool
tech_stack:
  frontend:     nextjs        # Next.js 15 + TypeScript
  backend:      python        # Python 3.11 + FastAPI
  database:     postgres      # PostgreSQL
launch_target:  internal_only
has_ui:         true
has_mobile:     false
compliance:     banking_grade
autonomy_level: 2             # L2 — Partial: AI thực hiện subtask, Human review từng bước
agents_active:  [01, 02, 03, 04, 05, 06, 07, 08, 09]
current_phase:  Phase 0 — Foundation
current_stage:  Stage 0.1 — Discover & Deconstruct

---

## Kiến trúc đã quyết định (ADRs)

- ADR-001: Tech Stack (FastAPI, React, PostgreSQL, JWT) — [docs/adr/ADR-001-tech-stack.md](docs/adr/ADR-001-tech-stack.md)
- ADR-002: Application Registry Schema (4 types, ppg_app_registry table) — [docs/adr/ADR-002-application-registry-schema.md](docs/adr/ADR-002-application-registry-schema.md)
- ADR-003: Authentication — JWT DB-based, PPG là auth provider, upgrade path → SSO — [docs/adr/ADR-003-authentication.md](docs/adr/ADR-003-authentication.md)
- ADR-004: Object Type Schema Strategy — JSONB flexible + Pydantic discriminated union (web_app/mobile_app/api/elt) — [docs/adr/ADR-004-object-type-schema.md](docs/adr/ADR-004-object-type-schema.md)
- ADR-005: Document Storage Strategy — Hybrid (DB text content + local filesystem for binary), upgrade path → MinIO — [docs/adr/ADR-005-document-storage.md](docs/adr/ADR-005-document-storage.md)

---

## Hướng dẫn làm việc với Azure DevOps (ADO) qua MCP

Claude sử dụng MCP server `ecosys-mcpado` để tương tác với Azure DevOps. Áp dụng các quy tắc sau mỗi khi làm việc với ADO:

### Nguyên tắc chung
- Luôn dùng MCP tools của `ecosys-mcpado` (không dùng REST API trực tiếp hay Azure CLI) khi có thể.
- Trước khi tạo/sửa bất kỳ item nào trên ADO, hãy xác nhận với user nếu hành động có thể ảnh hưởng đến người khác (ví dụ: cập nhật Work Item của người khác, đóng Sprint, xóa Branch).
- Không tự ý push code lên ADO Repos hay tạo PR mà chưa có yêu cầu rõ ràng từ user.

### Work Items
- Khi tạo Work Item mới (Epic / Feature / User Story / Task / Bug): điền đủ `Title`, `Description`, `Assigned To`, `Iteration Path`, `Area Path`.
- Khi cập nhật trạng thái Work Item: chỉ chuyển sang trạng thái hợp lệ theo flow (New → Active → Resolved → Closed). Không skip bước.
- Liên kết Work Item với BRD reference tương ứng: ghi `BRD-XXX` vào `Tags` hoặc `Description`.
- Commit message và PR title phải chứa Work Item ID: `feat(CVF-XXX): ... #<WorkItemID>`.

### Boards & Sprints
- Khi query board/sprint: luôn lọc theo `Iteration Path` hiện tại trừ khi user yêu cầu xem lịch sử.
- Không tự ý di chuyển items giữa Sprint mà không có lệnh rõ ràng.

### Repositories & Pull Requests
- Tạo PR: luôn set `reviewers` (ít nhất 1 người), gắn Work Item liên quan, chọn đúng `target branch`.
- Không approve hay complete PR thay cho user.
- Không force-push lên `main`/`master`/`develop`.

### Pipelines
- Chỉ trigger pipeline khi user yêu cầu tường minh.
- Báo cáo kết quả pipeline (success/fail/log tóm tắt) sau khi run xong.

### Query mẫu thường dùng
- Xem Work Items của sprint hiện tại: query theo `Iteration Path = @CurrentIteration` và `Assigned To = @Me` (hoặc theo yêu cầu).
- Xem bugs chưa xử lý: `Work Item Type = Bug AND State <> Closed`.
- Xem PRs đang chờ review: dùng tool pull request list của `ecosys-mcpado`.

---

## Conventions bắt buộc
- Mọi commit message phải chứa BRD reference: `feat(CVF-XXX): ...`
- PR không được merge nếu chưa có test file
- Không DROP/TRUNCATE/ALTER ngoài môi trường dev/test
- Frontend code: TypeScript strict mode, không dùng `any`
- Backend code: Python type hints bắt buộc, Black formatter
- Database: snake_case cho tất cả tên bảng/cột, migrations chỉ additive

---

## Decisions đang chờ (pending)
- [ ] Confirm chi tiết tính năng convert: các format file cần hỗ trợ (waiting: PO)
- [x] Confirm storage strategy cho converted files — RESOLVED bởi ADR-005 (Hybrid: DB text + local filesystem)
- [ ] Confirm authentication method: VIB SSO OAuth2 hay internal auth (waiting: Tech Lead)
- [ ] Confirm deployment: Docker compose hay Kubernetes (waiting: DevOps)
- [x] REQUEST-ARCH-001: Schema chuẩn Application Registry — RESOLVED bởi ADR-002
- [x] REQUEST-ARCH-002: Cơ chế Basic Authentication — RESOLVED bởi ADR-003
- [ ] REQUEST-BA-QA-001: BRS template chuẩn để auto-gen test case — waiting: QA, deadline: trước Stage 1.4
- [x] OQ-004: Schema chuẩn Web App / Mobile App / API / ELT — RESOLVED bởi ADR-004
- [x] OQ-005: Template export/import Web App / Mobile App / API / ELT — RESOLVED bởi ADR-004 (Excel .xlsx, columns cố định per type)
- [ ] OQ-006: Ngưỡng coverage tối thiểu mặc định (đề xuất 80%) — waiting: PO, deadline: trước Stage 2.2
- [ ] OQ-007: Phân quyền tạo kế hoạch năm — waiting: PO + Tech Lead, deadline: trước Stage 2.1

---

## Domain ownership
- `docs/brd/`, `docs/research/` → BA / PO Team
- `docs/arch/`, `docs/adr/`     → Architect
- `frontend/src/`               → Frontend Dev (Agent 05)
- `backend/`                    → Backend Dev (Agent 06)
- `migrations/`                 → DBA (Agent 07)
- `tests/`                      → QA Team (Agent 08)
- `docs/user-guide/`            → Technical writer (Agent 09)
---

## Artifacts đã complete
<!-- Owner của artifact append sau khi artifact được approve -->
<!-- Format: - {ARTIFACT_ID}: {tên} — approved {YYYY-MM-DD} -->

### BA artifacts
- BRD-001: DevOps Ecosystem Platform — file: docs/brd/BRD-001-devops-ecosystem.md
  status: draft | date: 2026-04-09 | author: BA Team | ready-for: Architect, Dev, QA
  updated: 2026-04-10 | version: 1.1 | change: Thêm Module 1 Annual Plan (FR-019 đến FR-022), mở rộng Module 2 với Web App/Mobile App/API/ELT và cross-project report (FR-023 đến FR-026), làm rõ BA workflow (FR-027 đến FR-029) và Test workflow (FR-030 đến FR-032) gắn với đối tượng cụ thể. Tổng: 32 FR, 7 NFR, 14 BR. 4 Open Questions mới (OQ-004 đến OQ-007) | ready-for: Architect (OQ-004, OQ-005), PO (OQ-006, OQ-007)

### Dev artifacts
- CODE-001: DevOps Ecosystem Platform scaffold — infra/init.sql, backend/ppg/, backend/ba-workflow/, backend/test-platform/, frontend/src/api/
  status: ready-for-review | date: 2026-04-09 | ready-for: QA

- CODE-002: Module Danh Mục Dữ Liệu (Data Catalog)
  status: ready-for-review | date: 2026-04-10 | ready-for: QA
  updated: 2026-04-12 | version: 2.0 | change: Mở rộng toàn bộ metadata sản phẩm — 6 JSONB sections chung + chi tiết riêng per type
  files:
    migration:  migrations/V021__catalog_module.sql
                migrations/V025__fix_annual_plan_related_systems.sql
                migrations/V026__catalog_product_extended.sql
    models:     backend/ppg/app/models/catalog.py
    routers:    backend/ppg/app/routers/catalog_products.py
                backend/ppg/app/routers/catalog_users.py
    api_client: frontend/src/api/catalog.ts
    ui_page:    frontend/src/pages/catalog/CatalogPage.tsx
    updated:    backend/ppg/app/main.py (v4 routers registered)
                frontend/src/App.tsx (route /catalog + sidebar item)
  scope:
    - Danh mục sản phẩm (org-wide, không gắn project): Web App / Mobile / Job / ETL / API
    - Mỗi sản phẩm: 6 sections chung (Architecture, Deployment, Security, Monitoring, Resource, Business)
      + môi trường (DEV/SIT/UAT/PROD/DR/STAGING) với infra_type + region
      + licence + chi tiết kỹ thuật riêng per type (JSONB)
    - Type-specific fields: WebApp (domain_dns, cdn, browser_support…) | Mobile (platforms, store links…)
      | API (spec_url, endpoints, rate_limit…) | ETL (source/target systems, lineage…) | Job (cron, retry, idempotent…)
    - Danh mục nhân sự: internal / external / contractor / vendor — thông tin cơ bản
    - Danh mục vai trò: role_code, role_category, workflow_permissions (JSONB), product_access_level
    - Gán nhiều vai trò cho user với scope (global / product / team)
    - 8 default roles seeded: BA, DEV, QA, PM, PO, ARCH, DEVOPS, VIEWER
  db_tables: catalog_products (+7 columns), catalog_product_environments (+2 columns),
             catalog_product_licenses, catalog_product_details,
             catalog_users, catalog_roles, catalog_user_roles
  api_prefix: /catalog/products (14 endpoints) | /catalog/users (7) | /catalog/roles (6)
  ui_route: /catalog — 3 tabs: Danh mục sản phẩm / Danh mục nhân sự / Vai trò & Quyền
  ui_detail_tabs: Tổng quan | Kiến trúc | Môi trường | Deployment | Bảo mật | Vận hành | Chi tiết | Licence
  ui_create_tabs: Cơ bản | Kiến trúc | Deployment | Bảo mật | Vận hành

- CODE-004: BA Studio — Master Doc có version + Change Request cấp tài liệu
  status: ready-for-review | date: 2026-07-29 | ready-for: QA, BA Lead
  updated: 2026-07-30 | version: 2.0 | change: Tài liệu là MỘT file Markdown (V051);
    Master Doc chuyển sang bảng có filter + group by Dự án/Loại; thêm view
    "So sánh tài liệu" (2 tài liệu bất kỳ, kiểu text-compare.com); diff mặc định
    render Markdown thay vì nguồn .md thô
  files:
    migration:  migrations/V049__ba_studio_master_docs.sql
                migrations/V050__ba_studio_seed.sql
                migrations/V051__ba_studio_markdown.sql
    backend:    backend/ba-workflow/app/services/section_ops.py
                backend/ba-workflow/app/routers/ba_studio.py
                backend/ppg/app/routers/requests.py (guard CR tài liệu)
    frontend:   frontend/src/pages/ba-studio/ (shell + 8 view + 6 component)
                frontend/src/lib/ba-studio/ (diff.ts, versions.ts, labels.ts, types.ts)
                frontend/src/api/ba-studio.ts
                frontend/src/data/ba-ai-adoption.ts (nội dung AI Adoption — static)
    tests:      tests/backend/test_ba_studio.py (55 test)
                frontend/src/lib/ba-studio/__tests__/diff.test.ts (33 test)
                frontend/src/pages/ba-studio/__tests__/ (13 test)
  scope:
    - Master Doc = chuỗi phiên bản: v2.0 = v1.0 + các CR đã merge (không upload file mới)
    - CR nhắm 1 tài liệu, mang section ops (add/modify/remove theo section_key)
    - Diff section + word-level (LCS, giữ whitespace làm token, guard n*m>250000)
      + bước cleanupSemantic gom khối để review đọc được
    - Merge sinh phiên bản mới; phiên bản đã phát hành lưu SNAPSHOT JSONB bất biến
    - 8 view: Console / Thư viện / Chi tiết tài liệu (3 tab) / Sổ CR / Chi tiết CR /
      So sánh phiên bản / AI Adoption + 6 trụ cột · Command palette ⌘K
  db_tables: ba_master_docs, ba_doc_sections (+heading_level), ba_doc_versions,
             ba_doc_cr_ops (+heading_level, op thêm 'move')
             + project_change_requests (+8 cột: target_doc_id, merge_state, merged_version,
               merged_at, reviewer, reviewed_at, acceptance JSONB, dependencies TEXT[])
  api_prefix: /api/v1/ba-studio (service ba-workflow :8002) — 15 endpoint
  ui_route: /ba-studio (mục nav mới "BA Studio")
  markdown_v2 (2026-07-30):
    - Tài liệu = 1 file Markdown. Mục (section) là PHÉP CHIẾU: tách theo heading ATX,
      ghép lại ra đúng file. Engine: backend markdown_doc.py ↔ frontend lib/ba-studio/markdown.ts
      (parity fixture chung, 3 bất biến: normalize idempotent · split(join(split x)) == split x ·
      apply_ops(cũ, derive_ops(cũ,mới)) == mới KỂ CẢ THỨ TỰ)
    - CR = BA sửa cả file .md → backend tự suy ra section ops. Vẫn là *patch* cấp mục nên
      2 CR sửa 2 mục khác nhau vẫn merge độc lập được (không phải "ghi đè cả file")
    - Thêm op 'move' để tái tạo đúng thứ tự mục (add chỉ chèn được SAU mục neo).
      after_section_key NULL: add = xuống cuối (giữ nguyên hành vi V049), move = lên đầu
    - align_sections giữ section_key khi đổi tên heading / viết lại body (3 lượt khớp:
      heading+level → body → tương đồng Jaccard ≥ 0.5) → diff ra 'modify' chứ không remove+add
    - Renderer Markdown tự viết (components/Markdown.tsx): dựng React element, KHÔNG
      dangerouslySetInnerHTML, HTML thô trong tài liệu hiển thị như văn bản, link giới hạn scheme
    - Diff mặc định render Markdown; đổi sang "Nguồn .md" để soát tới từng từ
    - View mới "So sánh tài liệu" (text-diff.ts): so 2 tài liệu BẤT KỲ theo dòng, nguồn =
      Master Doc (kể cả phiên bản cũ) / dán tay / tải .md; guard 4M ô LCS → đồng bộ theo cửa sổ
  api_md: content_md nhận/trả ở POST /docs · PUT /docs/{id}/sections · POST|PUT /doc-crs;
          GET /docs/{id} và /versions trả content_md; GET /doc-crs/{id} trả before/after_content_md
          + drift[] (ops không còn áp được lên bản hiện hành → cần cập nhật CR)
  tests_md: tests/backend/test_ba_studio.py 118 test · frontend 164 test
            (markdown.test.ts, text-diff.test.ts, Markdown.test.tsx, DocLibraryView.test.tsx,
             CompareDocView.test.tsx, DiffView markdown mode)

### Arch artifacts
- ADR-001: Tech Stack & System Architecture — file: docs/adr/ADR-001-tech-stack.md
  status: accepted | date: 2026-04-09 | ready-for: Dev
- ADR-002: Application Registry Schema — file: docs/adr/ADR-002-application-registry-schema.md
  status: accepted | date: 2026-04-09 | ready-for: Dev (resolves REQUEST-ARCH-001)
- ADR-003: Authentication Mechanism (JWT DB-based) — file: docs/adr/ADR-003-authentication.md
  status: accepted | date: 2026-04-09 | ready-for: Dev (resolves REQUEST-ARCH-002)
- ADR-004: Object Type Schema Strategy (JSONB + Pydantic discriminated union) — file: docs/adr/ADR-004-object-type-schema.md
  status: accepted | date: 2026-04-10 | ready-for: Dev (resolves OQ-004, OQ-005) | blocks: FR-023, FR-024, FR-025
- ADR-005: Document Storage Strategy (Hybrid DB+filesystem, upgrade path MinIO) — file: docs/adr/ADR-005-document-storage.md
  status: accepted | date: 2026-04-10 | ready-for: Dev (resolves storage pending) | blocks: FR-027, FR-029, FR-030, FR-032
- ARCH-001: System Architecture v2.0 — file: docs/arch/architecture-001-devops-ecosystem.md
  status: ready-for-dev | date: 2026-04-10 | change: Updated to v2.0 — added 4 new modules, new system diagram, updated implementation phases
- SCHEMA-DRAFT-V2: DB Schema Draft v2 (V002–V016 migrations) — file: docs/arch/schema-draft-v2.md
  status: ready-for-dba | date: 2026-04-10 | target: Agent 07 (DBA)
- API-DRAFT-V2: API Contract Draft v2 — file: docs/arch/api-contract-draft-v2.md
  status: ready-for-dev | date: 2026-04-10 | target: Agent 06 (Backend Dev)

---

## Highlight Log (recent — đọc trước khi làm việc)
<!-- Agent 01 tự động inject 10 entries gần nhất từ .highlight-log.yaml -->
_Xem .highlight-log.yaml để xem full log._

---

## Lessons learned (append only)
<!-- Format: - {YYYY-MM-DD}: {insight} -->

- 2026-04-09: Project khởi tạo. File system được tạo theo Build_Standard.md v7.0.
- 2026-04-09: BA session — BRD-001 drafted (18 FR, 7 NFR, 8 BR). 3 open questions gửi Architect + QA.
- 2026-04-09: Architect session — ADR-001/002/003 accepted. ARCH-001 ready-for-dev. REQUEST-ARCH-001/002 resolved.
- 2026-04-09: Dev session — Phase 1+2 scaffold complete: init.sql (tất cả tables), auth middleware, PPG/BA/Test core routers, frontend API clients. Human Dev cần implement business logic phức tạp và Phase 3-4 features.
- 2026-04-10: BA session — BRD-001 updated to v1.1 (32 FR, 14 BR, 7 OQ). Thêm 4 module rõ ràng: Annual Plan, Project (mở rộng object types), BA workflow, Test workflow. 4 Open Questions mới gửi Architect + PO (OQ-004 đến OQ-007). ADR-002 cần mở rộng để cover schema Web App/Mobile App/API/ELT.
- 2026-04-10: Architect session — ADR-004/005 accepted. ARCH-001 updated to v2.0. SCHEMA-DRAFT-V2 và API-DRAFT-V2 ready-for-dev. OQ-004/005 resolved. Còn 2 pending: OQ-006 (PO — coverage threshold), OQ-007 (PO+Tech Lead — annual plan access control).
- 2026-04-10: Dev session — CODE-002 complete: Module Danh Mục Dữ Liệu (V021 migration, 7 tables, 27 API endpoints, UI 3 tabs). Catalog là org-wide (không scoped theo project) — khác với project_product_registry (V019) vốn gắn với project cụ thể. Chi tiết kỹ thuật per-type lưu dạng JSONB trong catalog_product_details. Roles seeded sẵn 8 defaults. Pattern: JSONB details + Python type hints + asyncpg + React hooks.
- 2026-04-12: Dev session — CODE-002 v2.0: Mở rộng catalog module với đầy đủ metadata cấu trúc cho 5 loại sản phẩm. V026 migration thêm 7 columns (domain + 6 JSONB sections) vào catalog_products, thêm infra_type + region vào environments. Pydantic sub-models typed cho 6 sections chung + 5 type-specific detail models. UI rewrite: 8-tab detail modal + 5-section create form + structured forms per product type. Fix asyncpg double-serialization bug (V025 migration + router rewrite). Key pattern: asyncpg JSONB codec handles encoding — never call json.dumps() before passing to asyncpg parameters.
- 2026-07-29: Dev session — CODE-004: BA Studio (module riêng trong khu BA). Quyết định kiến trúc:
  (1) **Tái dùng project_change_requests làm sổ CR duy nhất** — CR tài liệu phân biệt bằng
  `merge_state IS NOT NULL` + `target_doc_id`; ánh xạ: design.status → merge_state,
  design.stage → status (enum PCR sẵn có). ppg vẫn sở hữu CRUD PCR, ba-workflow sở hữu
  merge/reject; thêm guard ở ppg chặn đổi trạng thái/xoá CR tài liệu đã xử lý.
  (2) **Lưu snapshot JSONB cho bản đã phát hành** thay vì replay ops như prototype —
  ops có thể bị sửa/xoá sau merge, replay sẽ âm thầm viết lại lịch sử (yêu cầu banking-grade).
  (3) Sửa nội dung trực tiếp chỉ cho phép khi tài liệu chưa có CR và chỉ có bản gốc;
  sau đó mọi thay đổi phải đi qua CR — đây là giá trị cốt lõi của module.
  (4) UI dựng bằng design token VIB (không cài antd) theo đúng hướng dẫn của gói handoff.
  Bẫy gặp phải: pool asyncpg của ba-workflow KHÔNG đăng ký jsonb codec (khác ppg) → phải
  json.dumps khi ghi / json.loads khi đọc JSONB. Diff LCS thuần cho ra "confetti" khó đọc
  với câu tiếng Việt viết lại → thêm cleanupSemantic (gom khối, vẫn giữ bất biến tái tạo
  văn bản). Bug phụ đã vá: username mất sau F5 (nay lưu kèm token trong sessionStorage).
- 2026-04-13: Dev session — CODE-003: 3 features shipped. (1) Export/Import XLSX project info (4 sheets: Overview/Timeline/Nguồn lực/To-do list) — backend StreamingResponse + openpyxl, frontend blob download + file upload. (2) Domain field cho project — V028 migration (project_domains LOV 12 entries + FK projects.domain_code), folder tree thay đổi thành {domain}/{project}/BA/ và {domain}/{project}/Tester/, GET /projects/domains LOV endpoint. (3) 5-domain governance checklist — V029 migration (project_activity_tasks), 38 tasks auto-generated per project, new router activity_tasks.py, ChecklistTab UI với progress bar + per-domain sections + click-to-cycle status.
- 2026-07-30: Dev session — CODE-004 v2.0: BA Studio chuyển sang **tài liệu là 1 file Markdown**
  (V051). Quyết định kiến trúc:
  (1) **Markdown là bề mặt soạn thảo, "mục" là phép chiếu** — tách theo heading ATX, ghép lại
  ra đúng file. Giữ được cả hai giá trị: BA làm việc với 1 file .md như thực tế, mà module vẫn
  diff được CẤP MỤC khi review CR. Không thêm cột content_md: ghép từ mục là hàm thuần nên
  không có nguy cơ lệch giữa 2 nguồn sự thật.
  (2) **CR vẫn là patch cấp mục** (không lưu "cả file đề nghị"): BA sửa cả file, backend
  derive_ops so với bản hiện hành. Nhờ vậy 2 CR sửa 2 mục khác nhau vẫn merge độc lập —
  nếu lưu cả file thì CR merge sau sẽ âm thầm xoá thay đổi của CR merge trước.
  (3) **Thêm op 'move'** vì op 'add' chỉ chèn được SAU mục neo → không tái tạo được thứ tự
  khi BA chèn mục vào đầu file hoặc sắp xếp lại. Bất biến được test:
  apply_ops(cũ, derive_ops(cũ, mới)) == mới KỂ CẢ THỨ TỰ (11 tình huống, parity BE↔FE).
  Lưu ý after_section_key = NULL có nghĩa KHÁC nhau giữa 2 op: add = xuống cuối (giữ nguyên
  hành vi đã lưu hành từ V049, 8 CR seed đang dùng), move = lên đầu.
  (4) **align_sections giữ section_key** khi đổi tên heading / viết lại body (3 lượt: heading+level
  → body → Jaccard ≥ 0.5) để diff ra 'modify' chứ không phải remove+add. Đổi CẢ tiêu đề lẫn nội
  dung quá nhiều thì có chủ ý coi là mục khác (ép khớp sẽ khiến người review hiểu sai lịch sử).
  (5) **Renderer Markdown tự viết**, không thêm dependency: dựng React element nên HTML thô
  trong tài liệu hiển thị như văn bản, link chỉ cho http/https/mailto — tài liệu nghiệp vụ nội bộ
  không nên có đường chèn HTML vào DOM.
  Bẫy gặp phải: (a) uvicorn --reload không nhận code mới vì tiến trình con cũ vẫn giữ socket sau
  khi kill tiến trình reloader → phải kill cả tiến trình multiprocessing-fork con.
  (b) Chèn heading LÊN TRÊN phần mở đầu thì phần mở đầu bị hút thành body của mục mới — đúng
  ngữ nghĩa Markdown, không phải bug; test phải phản ánh điều đó.
  (c) diffSections báo "đổi vị trí" phải so thứ tự TƯƠNG ĐỐI (LCS trên chuỗi key chung), nếu so
  index tuyệt đối thì xoá 1 mục ở trên sẽ làm mọi mục dưới bị báo nhầm.
  UX theo yêu cầu người dùng: Master Doc là BẢNG (filter dự án/loại/chủ tài liệu/trạng thái +
  group by Dự án hoặc Loại, gập nhóm được), diff mặc định render Markdown (đổi sang "Nguồn .md"
  khi cần soát từng từ), thêm view "So sánh tài liệu" so 2 tài liệu bất kỳ theo dòng.
