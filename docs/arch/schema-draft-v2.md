# Schema Draft v2 — 4 Modules Mới (BRD-001 v1.1)
**SCHEMA-ID:** SCHEMA-DRAFT-V2
**Version:** 2.0
**Date:** 2026-04-10
**Author:** Solutions Architect
**Target:** DBA (Agent 07)
**BRD Reference:** BRD-001 v1.1 (FR-019 → FR-032)
**ADR References:** ADR-004 (object type schema), ADR-005 (document storage)
**Prerequisite:** infra/init.sql (Schema v1 — Phase 1 baseline)

---

## Tổng quan thay đổi so với v1

| Module | Tables mới | Tables sửa |
|--------|-----------|-----------|
| Annual Plan | `ppg_annual_plans`, `ppg_annual_plan_objectives`, `ppg_annual_plan_dod_items`, `ppg_plan_project_links` | `ppg_projects` (thêm 0 cột — link qua junction table) |
| Project Objects | `ppg_project_objects`, `ppg_object_connections` | — |
| BA Workflow v1.1 | `ba_document_object_links`, `ba_document_files` | `ba_documents` (mở rộng doc_type, thêm object FK) |
| Test Workflow v1.1 | `test_documents`, `test_document_files`, `test_case_object_links` | `test_cases` (thêm object link) |
| Shared | `ppg_audit_log` | — |

**Quy tắc migration:**
- Tất cả migration là ADDITIVE — không DROP, không ALTER cột hiện có
- Mỗi bảng mới là 1 migration file riêng, đánh số thứ tự: `V002__*.sql`, `V003__*.sql`, ...
- FK tới bảng hiện có phải kiểm tra bảng tồn tại trước khi add constraint

---

## Module 1 — Annual Plan

### `ppg_annual_plans`

```sql
-- Migration: V002__create_annual_plans.sql
CREATE TABLE ppg_annual_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(300) NOT NULL,
    year            INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2050),
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','closed')),
    -- State machine: draft → active → closed
    -- BR-009: chỉ active mới nhận dự án mới
    -- BR-010: không thể close khi còn dự án active
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL,
    updated_by      VARCHAR(100)
    -- Không UNIQUE(year) — một năm có thể có nhiều kế hoạch (FR-019)
);

CREATE INDEX idx_annual_plans_year ON ppg_annual_plans(year);
CREATE INDEX idx_annual_plans_status ON ppg_annual_plans(status);
```

### `ppg_annual_plan_objectives`

```sql
-- Migration: V003__create_annual_plan_objectives.sql
CREATE TABLE ppg_annual_plan_objectives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL
);

CREATE INDEX idx_plan_objectives_plan_id ON ppg_annual_plan_objectives(plan_id);
```

### `ppg_annual_plan_dod_items`

```sql
-- Migration: V004__create_annual_plan_dod_items.sql
-- FR-020: Definition of Done cấp kế hoạch năm
CREATE TABLE ppg_annual_plan_dod_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    criterion       VARCHAR(500) NOT NULL,           -- tiêu chí
    weight          NUMERIC(5,2) NOT NULL DEFAULT 1.0
                    CHECK (weight > 0 AND weight <= 100),  -- trọng số %
    is_achieved     BOOLEAN NOT NULL DEFAULT FALSE,
    achieved_at     TIMESTAMPTZ,                    -- khi nào đạt
    achieved_by     VARCHAR(100),
    notes           TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL,
    updated_by      VARCHAR(100)
    -- % hoàn thành = SUM(weight WHERE is_achieved) / SUM(weight) * 100
    -- Tính tại application layer (FR-020)
    -- Mỗi thay đổi is_achieved phải ghi ppg_audit_log
);

CREATE INDEX idx_dod_items_plan_id ON ppg_annual_plan_dod_items(plan_id);
```

### `ppg_plan_project_links`

```sql
-- Migration: V005__create_plan_project_links.sql
-- FR-021: Junction table — một dự án có thể thuộc nhiều kế hoạch năm
CREATE TABLE ppg_plan_project_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id         UUID NOT NULL REFERENCES ppg_annual_plans(id) ON DELETE CASCADE,
    project_id      UUID NOT NULL REFERENCES ppg_projects(id) ON DELETE CASCADE,
    linked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by       VARCHAR(100) NOT NULL,
    unlinked_at     TIMESTAMPTZ,                    -- soft unlink — không xóa record
    unlinked_by     VARCHAR(100),
    UNIQUE (plan_id, project_id)
    -- BR-009: validate tại API layer — plan.status = 'active' mới link được
    -- BR-010: validate tại API layer khi close plan — check active projects
);

CREATE INDEX idx_plan_project_links_plan_id ON ppg_plan_project_links(plan_id);
CREATE INDEX idx_plan_project_links_project_id ON ppg_plan_project_links(project_id);
```

---

## Module 2 — Project Objects & Connections

### `ppg_project_objects`

```sql
-- Migration: V006__create_project_objects.sql
-- ADR-004: JSONB flexible strategy
-- FR-023 (Web App, Mobile App), FR-024 (API), FR-025 (ELT)
CREATE TABLE ppg_project_objects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES ppg_projects(id) ON DELETE CASCADE,
    object_type     VARCHAR(20) NOT NULL
                    CHECK (object_type IN ('web_app','mobile_app','api','elt')),
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(50) NOT NULL,
    -- code: uppercase, A-Z 0-9 underscore, unique per project
    description     TEXT,
    owner           VARCHAR(100),
    status          VARCHAR(30) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','deprecated','decommissioned')),
    standard_info   JSONB NOT NULL DEFAULT '{}',
    -- Bắt buộc per type (enforced tại Pydantic layer — xem ADR-004):
    -- web_app:    tech_stack (str), version (str)
    -- mobile_app: platform (str), version (str)
    -- api:        base_url (str), auth_method (str), version (str)
    -- elt:        source_system (str), target_system (str), schedule (str)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL,
    updated_by      VARCHAR(100),
    UNIQUE (project_id, code)
);

CREATE INDEX idx_project_objects_project_id ON ppg_project_objects(project_id);
CREATE INDEX idx_project_objects_type ON ppg_project_objects(object_type);
CREATE INDEX idx_project_objects_status ON ppg_project_objects(status);
CREATE INDEX idx_project_objects_name ON ppg_project_objects(name);    -- cross-project search
CREATE INDEX idx_project_objects_info_gin ON ppg_project_objects USING GIN(standard_info);
```

### `ppg_object_connections`

```sql
-- Migration: V007__create_object_connections.sql
-- FR-026: Cross-project connection map (in/out per object)
CREATE TABLE ppg_object_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_object_id UUID NOT NULL REFERENCES ppg_project_objects(id) ON DELETE CASCADE,
    target_object_id UUID NOT NULL REFERENCES ppg_project_objects(id) ON DELETE CASCADE,
    -- source → target (directional)
    connection_type VARCHAR(30) NOT NULL
                    CHECK (connection_type IN ('api_call','data_feed','event','file_transfer','db_sync','other')),
    protocol        VARCHAR(30),                    -- "REST", "JDBC", "SFTP", etc.
    frequency       VARCHAR(50),                    -- "real-time", "daily 2AM"
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','deprecated','removed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL,
    updated_by      VARCHAR(100),
    CONSTRAINT no_self_loop CHECK (source_object_id != target_object_id),
    UNIQUE (source_object_id, target_object_id, connection_type)
);

CREATE INDEX idx_obj_conn_source ON ppg_object_connections(source_object_id);
CREATE INDEX idx_obj_conn_target ON ppg_object_connections(target_object_id);
-- Phục vụ FR-026: query "tất cả kết nối IN hoặc OUT của object X"
-- → WHERE source_object_id = X (outbound) UNION WHERE target_object_id = X (inbound)
```

---

## Module 3 — BA Workflow v1.1

### Sửa `ba_documents` — thêm cột mới (ADDITIVE)

```sql
-- Migration: V008__alter_ba_documents_v11.sql
-- Mở rộng doc_type (FR-029: thêm FSD, DATA_DICT, WIREFRAME, PROCESS_FLOW)
ALTER TABLE ba_documents
    DROP CONSTRAINT IF EXISTS ba_documents_doc_type_check;

ALTER TABLE ba_documents
    ADD CONSTRAINT ba_documents_doc_type_check
    CHECK (doc_type IN ('BRD','BRS','FSD','API_SPEC','ERD','DATA_DICT','WIREFRAME','PROCESS_FLOW'));

-- Thêm milestone tracking (FR-028)
ALTER TABLE ba_documents
    ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES ppg_milestones(id);

-- Thêm metadata JSONB cho từng doc_type (FR-029: mỗi loại có metadata riêng)
ALTER TABLE ba_documents
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
-- Ví dụ metadata cho WIREFRAME: {"tool": "Figma", "figma_url": "..."}
-- Ví dụ metadata cho PROCESS_FLOW: {"tool": "draw.io", "format": "BPMN"}
```

### `ba_document_object_links`

```sql
-- Migration: V009__create_ba_document_object_links.sql
-- FR-027: Gắn tài liệu BA với nhiều đối tượng
CREATE TABLE ba_document_object_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES ba_documents(id) ON DELETE CASCADE,
    object_id       UUID NOT NULL REFERENCES ppg_project_objects(id) ON DELETE CASCADE,
    linked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by       VARCHAR(100) NOT NULL,
    UNIQUE (document_id, object_id)
    -- BR-014: kế thừa links này sang ba_test_case_object_links khi BRS approved
);

CREATE INDEX idx_ba_doc_obj_links_doc_id ON ba_document_object_links(document_id);
CREATE INDEX idx_ba_doc_obj_links_obj_id ON ba_document_object_links(object_id);
```

### `ba_document_files`

```sql
-- Migration: V010__create_ba_document_files.sql
-- ADR-005: Hybrid storage — file attachments cho tài liệu BA
CREATE TABLE ba_document_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES ba_documents(id) ON DELETE CASCADE,
    file_name       VARCHAR(500) NOT NULL,
    file_path       TEXT NOT NULL,
    -- Relative path từ storage root: ba/{document_id}/{version}/{filename}
    mime_type       VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    checksum_sha256 VARCHAR(64) NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    is_current      BOOLEAN NOT NULL DEFAULT TRUE,
    source          VARCHAR(20) NOT NULL DEFAULT 'upload'
                    CHECK (source IN ('upload','copy_from_url')),
    source_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL,
    deleted_at      TIMESTAMPTZ                      -- soft delete, grace 30 days
);

CREATE INDEX idx_ba_doc_files_document_id ON ba_document_files(document_id);
CREATE INDEX idx_ba_doc_files_is_current ON ba_document_files(document_id, is_current) WHERE is_current = TRUE;
```

---

## Module 4 — Test Workflow v1.1

### `test_documents`

```sql
-- Migration: V011__create_test_documents.sql
-- FR-032: Test Plan, Bug Report, UAT Sign-off (thêm vào bên cạnh test_cases, test_reports)
CREATE TABLE test_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES ppg_projects(id) ON DELETE CASCADE,
    object_id       UUID REFERENCES ppg_project_objects(id),
    -- Tài liệu test có thể gắn với object cụ thể (FR-030)
    doc_type        VARCHAR(20) NOT NULL
                    CHECK (doc_type IN ('TEST_PLAN','BUG_REPORT','UAT_SIGNOFF')),
    -- TEST_CASE và TEST_REPORT đã có bảng riêng (test_cases, test_reports)
    title           VARCHAR(300) NOT NULL,
    content         TEXT NOT NULL DEFAULT '',        -- authored content
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- Status per type:
    -- TEST_PLAN:    draft → review → approved → archived
    -- BUG_REPORT:   open → in_progress → resolved → closed
    -- UAT_SIGNOFF:  draft → pending_sign → signed → archived
    milestone_id    UUID REFERENCES ppg_milestones(id),
    metadata        JSONB NOT NULL DEFAULT '{}',
    -- BUG_REPORT metadata: {"severity": "high|medium|low|critical", "component": "..."}
    -- UAT_SIGNOFF metadata: {"approver": "...", "sign_date": "2026-04-10", "scope": "..."}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL,
    updated_by      VARCHAR(100)
);

CREATE INDEX idx_test_docs_project_id ON test_documents(project_id);
CREATE INDEX idx_test_docs_type ON test_documents(doc_type);
CREATE INDEX idx_test_docs_object_id ON test_documents(object_id);
CREATE INDEX idx_test_docs_status ON test_documents(status);
```

### `test_document_files`

```sql
-- Migration: V012__create_test_document_files.sql
-- ADR-005: File attachments cho test documents
CREATE TABLE test_document_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES test_documents(id) ON DELETE CASCADE,
    file_name       VARCHAR(500) NOT NULL,
    file_path       TEXT NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    checksum_sha256 VARCHAR(64) NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    is_current      BOOLEAN NOT NULL DEFAULT TRUE,
    source          VARCHAR(20) NOT NULL DEFAULT 'upload'
                    CHECK (source IN ('upload','copy_from_url')),
    source_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_test_doc_files_document_id ON test_document_files(document_id);
CREATE INDEX idx_test_doc_files_is_current ON test_document_files(document_id, is_current) WHERE is_current = TRUE;
```

### Sửa `test_cases` — thêm object link (ADDITIVE)

```sql
-- Migration: V013__alter_test_cases_v11.sql
-- FR-030: test case kế thừa object từ BRS nguồn
```

### `test_case_object_links`

```sql
-- Migration: V014__create_test_case_object_links.sql
-- FR-030: Gắn test case với đối tượng (kế thừa từ BRS — BR-014)
CREATE TABLE test_case_object_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_id    UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    object_id       UUID NOT NULL REFERENCES ppg_project_objects(id) ON DELETE CASCADE,
    inherited_from_brs BOOLEAN NOT NULL DEFAULT TRUE,
    -- TRUE = tự động kế thừa khi BRS approved (BR-014)
    -- FALSE = thêm thủ công sau
    linked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by       VARCHAR(100) NOT NULL,
    UNIQUE (test_case_id, object_id)
);

CREATE INDEX idx_tc_obj_links_test_case_id ON test_case_object_links(test_case_id);
CREATE INDEX idx_tc_obj_links_object_id ON test_case_object_links(object_id);
```

---

## Bảng Audit Log chung

### `ppg_audit_log`

```sql
-- Migration: V015__create_audit_log.sql
-- NFR-007: Ghi log tất cả thao tác write — banking_grade compliance
-- Bảng này shared cho toàn bộ platform, prefix ppg_ vì PPG service là owner
CREATE TABLE ppg_audit_log (
    id              BIGSERIAL PRIMARY KEY,           -- INT8, tốc độ insert cao
    entity_type     VARCHAR(50) NOT NULL,            -- tên bảng: "ppg_annual_plans", "ba_documents", etc.
    entity_id       UUID NOT NULL,                   -- ID của record bị tác động
    action          VARCHAR(20) NOT NULL
                    CHECK (action IN ('CREATE','UPDATE','DELETE','STATUS_CHANGE','LINK','UNLINK','UPLOAD','DOWNLOAD')),
    changed_by      VARCHAR(100) NOT NULL,           -- username
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    old_values      JSONB,                           -- snapshot trước khi thay đổi (nullable cho CREATE)
    new_values      JSONB,                           -- snapshot sau khi thay đổi (nullable cho DELETE)
    ip_address      INET,                            -- IP client
    user_agent      TEXT,                            -- browser/client info
    notes           TEXT                             -- ghi chú tùy chọn
);

-- Partition by changed_at (monthly) khi volume tăng — không cần ở v1
CREATE INDEX idx_audit_log_entity ON ppg_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_changed_by ON ppg_audit_log(changed_by);
CREATE INDEX idx_audit_log_changed_at ON ppg_audit_log(changed_at DESC);

-- Retention policy: giữ audit log ít nhất 5 năm (banking_grade)
-- Implement cleanup job: DELETE WHERE changed_at < NOW() - INTERVAL '5 years'
```

---

## Access Control Per Object (Banking-grade)

BRD-001 OS-04 xác nhận "Basic auth, chưa phân quyền theo role" trong v1. Tuy nhiên, để đáp ứng banking_grade compliance và chuẩn bị cho v2 RBAC:

```sql
-- Migration: V016__create_object_access_control.sql
-- Placeholder table — v1 không enforce, v2 bật lên
CREATE TABLE ppg_object_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(50) NOT NULL,            -- "ppg_project_objects", "ppg_annual_plans", etc.
    entity_id       UUID NOT NULL,
    grantee         VARCHAR(100) NOT NULL,           -- username
    permission      VARCHAR(20) NOT NULL
                    CHECK (permission IN ('read','write','admin')),
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by      VARCHAR(100) NOT NULL,
    revoked_at      TIMESTAMPTZ,
    UNIQUE (entity_type, entity_id, grantee, permission)
);
-- v1: table tồn tại nhưng API không check — bypass allowed
-- v2: API middleware kiểm tra table này trước khi allow write operations
```

---

## Migration Execution Order

```
V002 → ppg_annual_plans
V003 → ppg_annual_plan_objectives (FK → V002)
V004 → ppg_annual_plan_dod_items  (FK → V002)
V005 → ppg_plan_project_links      (FK → V002, ppg_projects)
V006 → ppg_project_objects         (FK → ppg_projects)
V007 → ppg_object_connections      (FK → V006)
V008 → ALTER ba_documents          (modify constraint + add columns)
V009 → ba_document_object_links    (FK → ba_documents, V006)
V010 → ba_document_files           (FK → ba_documents)
V011 → test_documents              (FK → ppg_projects, V006, ppg_milestones)
V012 → test_document_files         (FK → V011)
V013 → ALTER test_cases            (additive)
V014 → test_case_object_links      (FK → test_cases, V006)
V015 → ppg_audit_log               (standalone)
V016 → ppg_object_permissions      (standalone placeholder)
```

---

*Schema Draft v2 — Agent 07 (DBA) | Solutions Architect | 2026-04-10 | BRD-001 v1.1*
