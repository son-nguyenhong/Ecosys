# Architecture — DevOps Ecosystem Platform
**ARCH-ID:** ARCH-001
**Version:** 2.0
**Date:** 2026-04-10
**Author:** Solutions Architect
**BRD Reference:** BRD-001 v1.1
**ADR References:** ADR-001, ADR-002, ADR-003, ADR-004, ADR-005
**Change Summary (v2.0):** Thêm 4 module mới từ BRD-001 v1.1 — Annual Plan, Project Objects (Web App/Mobile App/API/ELT), BA Workflow v1.1, Test Workflow v1.1. Cập nhật system diagram, database schema, API contract summary, implementation order.

---

## 1. System Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (Next.js 15 SPA)                           │
│                               http://localhost:5173                              │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  PPG Pages    │  │  Annual Plan │  │   BA Pages       │  │  Test Pages    │  │
│  │  (Projects,   │  │  Pages       │  │  (Docs, Files,   │  │  (Test Docs,   │  │
│  │   Objects,    │  │              │  │   Discussions)   │  │   Coverage)    │  │
│  │   Registry)   │  │              │  │                  │  │                │  │
│  └──────┬────────┘  └──────┬───────┘  └────────┬─────────┘  └───────┬────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────────────┼───────────┘
          │ /api/ppg        │ /api/ppg           │ /api/ba            │ /api/test
          ▼                 ▼                    ▼                    ▼
┌──────────────────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│         PPG System :8001         │  │  BA Workflow     │  │  Test Platform       │
│  + Auth Provider (JWT)           │  │  :8002           │  │  :8003               │
│                                  │  │                  │  │                      │
│  Modules:                        │  │  Modules:        │  │  Modules:            │
│  - Project Management            │  │  - Document Hub  │  │  - Auto Test Gen     │
│  - Annual Plan (NEW)             │◄─┤    (+ File       │  │  - Test Case SM      │
│  - Project Objects (NEW)         │  │     Attach v1.1) │  │  - Test Documents    │
│    Web App / Mobile App /        │  │  - Doc-Object    │◄─┤    (NEW: Test Plan,  │
│    API / ELT                     │  │    Links (NEW)   │  │     Bug Report,      │
│  - Object Connections (NEW)      │  │  - Discussions   │  │     UAT Sign-off)    │
│  - Application Registry          │  │  - Milestone     │  │  - Case-Object Links │
│  - Cross-project Reports (NEW)   │  │    Tracking (NEW)│  │    (NEW, auto BR-014)│
│  - File Management               │  │                  │  │  - Test Report       │
│  - Meeting Minutes               │  │                  │  │  - Coverage Alerts   │
│  - Milestone Management          │  │                  │  │    (NEW FR-031)      │
│  - Audit Log (NEW, shared)       │  │                  │  │                      │
│                │◄─── sync-doc ───┤                  │◄─┤                      │
│                │◄─── sync-test ──┼──────────────────┼──┘                      │
│                │                 │◄──── /brs ────────┘                         │
└───────┬────────┘  └──────┬───────┘  └──────────────────────────────────────────┘
        │                  │
        └──────────────────┘
                  ▼
    ┌──────────────────────────────┐      ┌──────────────────────┐
    │       PostgreSQL 15          │      │  File Storage        │
    │       devops_hub DB          │      │  /data/vib-docstore/ │
    │       (1 schema)             │      │  ba/  test/          │
    │                              │      │  (ADR-005 Hybrid)    │
    │  ppg_ prefix (16 tables v2): │      └──────────────────────┘
    │   annual_plans, objectives,  │
    │   dod_items, plan_proj_links,│
    │   project_objects (NEW),     │
    │   object_connections (NEW),  │
    │   projects, milestones,      │
    │   members, files, meetings,  │
    │   app_registry, users,       │
    │   sync_log, audit_log (NEW), │
    │   object_permissions (NEW)   │
    │                              │
    │  ba_ prefix (6 tables v2):   │
    │   documents, doc_versions,   │
    │   doc_object_links (NEW),    │
    │   document_files (NEW),      │
    │   tasks, discussions         │
    │                              │
    │  test_ prefix (7 tables v2): │
    │   brs, cases, reports,       │
    │   tasks, discussions,        │
    │   documents (NEW),           │
    │   case_object_links (NEW)    │
    └──────────────────────────────┘
```

---

## 2. Project Structure

```
ecosys/
├── backend/
│   ├── ppg/                          ← PPG System :8001
│   │   ├── app/
│   │   │   ├── main.py               ← FastAPI app, include routers
│   │   │   ├── auth.py               ← JWT auth provider (ADR-003)
│   │   │   ├── dependencies.py       ← get_current_user(), get_db()
│   │   │   ├── models/
│   │   │   │   ├── project.py
│   │   │   │   ├── milestone.py
│   │   │   │   ├── member.py
│   │   │   │   ├── file.py
│   │   │   │   ├── meeting.py
│   │   │   │   ├── annual_plan.py
│   │   │   │   ├── app_registry.py   ← ADR-002
│   │   │   │   └── user.py           ← ADR-003
│   │   │   ├── routers/
│   │   │   │   ├── projects.py
│   │   │   │   ├── milestones.py
│   │   │   │   ├── members.py
│   │   │   │   ├── files.py
│   │   │   │   ├── meetings.py
│   │   │   │   ├── annual_plans.py
│   │   │   │   ├── app_registry.py
│   │   │   │   ├── auth.py           ← POST /auth/login
│   │   │   │   └── sync.py           ← POST /sync-doc, POST /sync-test
│   │   │   └── services/
│   │   │       ├── milestone_generator.py
│   │   │       └── meeting_parser.py
│   │   ├── requirements.txt
│   │   └── .env
│   │
│   ├── ba-workflow/                  ← BA Workflow :8002
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── dependencies.py       ← verify JWT (không call PPG)
│   │   │   ├── models/
│   │   │   │   ├── document.py       ← state machine
│   │   │   │   ├── requirement.py
│   │   │   │   ├── ba_task.py
│   │   │   │   └── discussion.py
│   │   │   ├── routers/
│   │   │   │   ├── documents.py      ← state machine transitions
│   │   │   │   ├── requirements.py
│   │   │   │   ├── ba_tasks.py
│   │   │   │   ├── discussions.py
│   │   │   │   └── timeline.py
│   │   │   └── services/
│   │   │       ├── state_machine.py  ← draft/review/approved/archived
│   │   │       └── sync_service.py   ← push to PPG + Test Platform
│   │   ├── requirements.txt
│   │   └── .env
│   │
│   └── test-platform/               ← Test Platform :8003
│       ├── app/
│       │   ├── main.py
│       │   ├── dependencies.py       ← verify JWT
│       │   ├── models/
│       │   │   ├── brs.py
│       │   │   ├── test_case.py      ← state machine
│       │   │   ├── test_report.py
│       │   │   └── test_task.py
│       │   ├── routers/
│       │   │   ├── brs.py            ← POST /brs (nhận từ BA)
│       │   │   ├── test_cases.py
│       │   │   ├── test_reports.py
│       │   │   ├── test_tasks.py
│       │   │   ├── discussions.py
│       │   │   └── timeline.py
│       │   └── services/
│       │       ├── test_generator.py ← BRS → test cases + Playwright
│       │       └── sync_service.py   ← push metrics to PPG
│       ├── requirements.txt
│       └── .env
│
├── frontend/                         ← React SPA :5173
│   ├── src/
│   │   ├── components/               ← shared VIB Design System components
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── KpiCard.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── Toast.tsx
│   │   ├── pages/
│   │   │   ├── ppg/                  ← PPG pages
│   │   │   ├── ba/                   ← BA pages
│   │   │   └── test/                 ← Test pages
│   │   ├── stores/                   ← Zustand stores per domain
│   │   ├── api/                      ← API client per service
│   │   │   ├── ppg.ts
│   │   │   ├── ba.ts
│   │   │   └── test.ts
│   │   └── App.tsx
│   ├── vite.config.ts                ← proxy config
│   └── package.json
│
├── infra/
│   └── init.sql                      ← DB init script
│
├── start.bat                         ← Windows quick start
├── install.bat
├── project-profile.yaml
└── CLAUDE.md
```

---

## 3. Database Schema

**Naming convention:** `{service_prefix}_{table_name}` — snake_case

| Prefix | Service | Tables v1 (baseline) | Tables v2 mới (BRD-001 v1.1) |
|--------|---------|----------------------|-------------------------------|
| `ppg_` | PPG System | `ppg_projects`, `ppg_milestones`, `ppg_members`, `ppg_files`, `ppg_file_versions`, `ppg_meetings`, `ppg_annual_plans`, `ppg_app_registry`, `ppg_users`, `ppg_sync_log` | `ppg_annual_plan_objectives`, `ppg_annual_plan_dod_items`, `ppg_plan_project_links`, `ppg_project_objects`, `ppg_object_connections`, `ppg_audit_log`, `ppg_object_permissions` |
| `ba_` | BA Workflow | `ba_documents`, `ba_document_versions`, `ba_requirements`, `ba_tasks`, `ba_discussions` | `ba_document_object_links`, `ba_document_files` |
| `test_` | Test Platform | `test_brs`, `test_cases`, `test_reports`, `test_tasks`, `test_discussions` | `test_documents`, `test_document_files`, `test_case_object_links` |

**Schema chi tiết v2:** xem `docs/arch/schema-draft-v2.md`

**Key schemas:**

```sql
-- ppg_projects
CREATE TABLE ppg_projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    start_date  DATE,
    end_date    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(100) NOT NULL
);

-- ba_documents (state machine)
CREATE TABLE ba_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL,
    milestone_id UUID,
    doc_type    VARCHAR(20) NOT NULL CHECK (doc_type IN ('BRD','BRS','ERD','API')),
    title       VARCHAR(300) NOT NULL,
    content     TEXT NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    status      VARCHAR(20) NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','review','approved','archived')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(100) NOT NULL
);

-- test_cases (state machine)
CREATE TABLE test_cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brs_id          UUID NOT NULL REFERENCES test_brs(id),
    title           VARCHAR(500) NOT NULL,
    business_rule   TEXT NOT NULL,
    playwright_script TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'generated'
                    CHECK (status IN ('generated','reviewed','approved','executed')),
    is_obsolete     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. API Contract Summary

**Chi tiết API v2:** xem `docs/arch/api-contract-draft-v2.md`

### Authentication (PPG :8001)
```
POST /auth/login        → {access_token, token_type, expires_in}
GET  /health            → {status: "ok"}  [no auth required]
```

### Annual Plan (PPG :8001) — NEW (FR-019 → FR-022)
```
GET    /api/v1/annual-plans                           → list plans
POST   /api/v1/annual-plans                           → create plan (with objectives + dod_items)
GET    /api/v1/annual-plans/{plan_id}                 → detail + projects
PUT    /api/v1/annual-plans/{plan_id}                 → update metadata
DELETE /api/v1/annual-plans/{plan_id}                 → soft-delete (draft only)
POST   /api/v1/annual-plans/{plan_id}/status          → state transition (activate / close)
PUT    /api/v1/annual-plans/{plan_id}/dod-items/{id}  → update DoD item status
POST   /api/v1/annual-plans/{plan_id}/projects        → link project (BR-009)
DELETE /api/v1/annual-plans/{plan_id}/projects/{id}   → unlink project
```

### Project Objects (PPG :8001) — NEW (FR-023 → FR-025)
```
GET    /api/v1/projects/{id}/objects                  → list objects (filter by type/status)
POST   /api/v1/projects/{id}/objects                  → create object (validate standard_info per type)
GET    /api/v1/projects/{id}/objects/{obj_id}         → detail
PUT    /api/v1/projects/{id}/objects/{obj_id}         → update (code/type immutable)
DELETE /api/v1/projects/{id}/objects/{obj_id}         → soft-delete (status=decommissioned)
GET    /api/v1/projects/{id}/objects/export           → Excel export by type (BR-012)
POST   /api/v1/projects/{id}/objects/import           → Excel import (BR-013 conflict handling)
GET    /api/v1/projects/{id}/objects/{obj_id}/connections  → in/out connections
POST   /api/v1/projects/{id}/objects/{obj_id}/connections  → create connection
DELETE /api/v1/projects/{id}/objects/{obj_id}/connections/{conn_id} → soft-delete connection
```

### Application Registry (PPG :8001) — existing (ADR-002)
```
GET    /projects/{id}/app-registry          → list objects
POST   /projects/{id}/app-registry          → create object
GET    /projects/{id}/app-registry/{obj_id} → detail
PUT    /projects/{id}/app-registry/{obj_id} → update
DELETE /projects/{id}/app-registry/{obj_id} → soft-delete (status=deprecated)
```

### Cross-project Reports (PPG :8001) — NEW (FR-026, FR-022)
```
GET /api/v1/reports/connections                     → cross-project connection map (FR-026)
GET /api/v1/reports/annual-plan-summary/{plan_id}   → annual plan dashboard (FR-022)
```

### Document State Machine (BA :8002) — extended v1.1
```
POST /documents/{id}/action?action=submit_review  → draft → review
POST /documents/{id}/action?action=approve        → review → approved (triggers sync)
POST /documents/{id}/action?action=reject         → review → draft
POST /documents/{id}/action?action=archive        → approved → archived
```

### BA Document Object Links (BA :8002) — NEW (FR-027)
```
GET    /api/v1/documents/{id}/objects              → objects linked to this document
POST   /api/v1/documents/{id}/objects              → link object to document
DELETE /api/v1/documents/{id}/objects/{object_id}  → unlink (no delete)
```

### BA Document Files (BA :8002) — NEW (ADR-005)
```
GET    /api/v1/documents/{id}/files                      → list current file attachments
POST   /api/v1/documents/{id}/files                      → upload file
POST   /api/v1/documents/{id}/files/copy-from-url        → copy from URL (BR-007)
GET    /api/v1/documents/{id}/files/{file_id}/download   → download (auth + audit)
```

### Test Documents (Test :8003) — NEW (FR-032)
```
GET    /api/v1/test-documents                          → list test documents
POST   /api/v1/test-documents                          → create (Test Plan, Bug Report, UAT Sign-off)
GET    /api/v1/test-documents/{id}                     → detail
PUT    /api/v1/test-documents/{id}                     → update
POST   /api/v1/test-documents/{id}/status              → state transition per type
POST   /api/v1/test-documents/{id}/files               → upload attachment
GET    /api/v1/test-documents/{id}/files/{fid}/download → download
```

### Test Case Coverage (Test :8003) — NEW (FR-030, FR-031)
```
GET /api/v1/test-cases/{id}/objects              → objects linked to test case
GET /api/v1/objects/{id}/test-cases              → test cases for object (FR-030)
GET /api/v1/objects/{id}/test-coverage           → coverage + milestone alerts (FR-031)
```

### Inter-service Sync (internal, no user auth needed — internal network only)
```
PPG  POST /sync-doc   ← BA (khi document approved)
PPG  POST /sync-test  ← Test Platform (khi test report approved)
Test POST /brs        ← BA (khi BRS approved, triggers auto-gen + object link inheritance BR-014)
```

---

## 5. Code Ownership Map cho Dev

**CHỈ ĐƯỢC sửa/tạo:**

| Dev | Scope |
|-----|-------|
| Backend Dev (Agent 06) | `backend/ppg/app/`, `backend/ba-workflow/app/`, `backend/test-platform/app/` |
| Frontend Dev (Agent 05) | `frontend/src/` |
| DBA (Agent 07) | `infra/init.sql`, bất kỳ migration file mới |

**KHÔNG ĐƯỢC touch:**
- `docs/brd/`, `docs/adr/`, `docs/arch/` — BA/Architect domain
- `tests/` — QA domain
- `CLAUDE.md` — append-only, theo protocol

---

## 6. Implementation Order (Dependencies)

```
Phase 1 — Foundation (prerequisite cho tất cả):
  DBA (07)   → infra/init.sql — V001 baseline tables (schema v1)
  Backend    → auth middleware (ADR-003) — prerequisite cho mọi endpoint

Phase 2 — Core v1.0 (sau Phase 1):
  Backend    → PPG: projects, milestones, members
  Backend    → BA: documents + state machine
  Backend    → Test: brs + test_generator
  Frontend   → Auth flow (login page, token storage)

Phase 3 — Features v1.0 (sau Phase 2):
  Backend    → PPG: app_registry (ADR-002), files, meetings
  Backend    → BA → Test sync pipeline (FR-011)
  Backend    → Test → PPG sync pipeline (FR-017)
  Frontend   → All pages + Dashboard KPI

Phase 4 — V1.1 Foundation (sau Phase 3):
  DBA (07)   → Migrations V002–V016 (schema-draft-v2.md)
  Backend    → ppg_audit_log service (shared, prerequisite cho V1.1 features)
  Backend    → File storage service LocalFileAdapter (ADR-005)

Phase 5 — V1.1 Annual Plan (sau Phase 4):
  Backend    → Annual Plan CRUD + state machine (FR-019, FR-020)
  Backend    → Plan-Project links + BR-009/BR-010 validation (FR-021)
  Frontend   → Annual Plan pages + DoD tracker (FR-022)

Phase 6 — V1.1 Project Objects (sau Phase 4):
  Backend    → Project Objects CRUD + Pydantic discriminated union (FR-023, FR-024, FR-025)
  Backend    → Object Connections + Cross-project Report (FR-026)
  Backend    → Export/Import Excel + conflict handling BR-013 (FR-023, FR-024, FR-025)
  Frontend   → Object pages per type + Connection diagram

Phase 7 — V1.1 BA & Test Workflow (sau Phase 6 — objects phải tồn tại):
  Backend    → ba_document_object_links + doc-to-object linking (FR-027, FR-028)
  Backend    → BA Document Files upload/download (ADR-005)
  Backend    → test_documents (Test Plan, Bug Report, UAT Sign-off) (FR-032)
  Backend    → test_case_object_links auto-inheritance từ BRS (FR-030, BR-014)
  Backend    → Coverage alerts per milestone (FR-031)
  Frontend   → BA Doc-Object UI + Test Document pages + Coverage dashboard

Phase 8 — Polish v1.1:
  Frontend   → Annual Plan dashboard + Cross-project connection map
  Frontend   → Milestone tracking alerts (FR-028, FR-031)
  Backend    → ppg_object_permissions placeholder (v2 RBAC prep)
```

---

## 7. Devil's Advocate — Risks

### Risks v1.0 (giữ nguyên)

| Risk | Severity | Mitigation |
|------|---------|------------|
| Inter-service sync failure mất dữ liệu | Medium | Log lỗi vào `ppg_sync_log`, retry manual từ dashboard |
| BRS parser không nhận dạng đúng business rules | Medium | Dùng assumption format từ REQUEST-BA-QA-001, QA validate |
| JWT secret key không đồng bộ giữa 3 services | High | Dùng chung 1 secret key qua environment variable `JWT_SECRET` |
| `ppg_app_registry.code` UNIQUE per project bị conflict khi bulk import | Low | Trả về 409 Conflict với message rõ ràng |

### Risks v1.1 (mới)

| Risk | Severity | Mitigation |
|------|---------|------------|
| JSONB `standard_info` không có DB-level required constraint — có thể bị bypass | Medium | Pydantic discriminated union enforcement tại API layer; integration test per type (FR-023, FR-024, FR-025) |
| File storage local filesystem không HA — mất file nếu volume lỗi | High | Docker volume backup bắt buộc; upgrade path sang MinIO (ADR-005) khi volume tăng; checksum SHA-256 detect corruption |
| Cross-project connection query (FR-026) join nhiều bảng → slow với large dataset | Medium | GIN index trên `standard_info`, composite index trên `object_connections`; pagination bắt buộc (max 100/page) |
| BR-014 auto-inheritance object links khi BRS approved: nếu Test Platform down → links không được tạo | Medium | Log lỗi trong `ppg_sync_log`; expose endpoint retry `POST /brs/{brs_id}/relink-objects`; QA verify sau mỗi BRS approval |
| BR-010 race condition: nhiều user đồng thời complete projects và close plan | Low | PostgreSQL row-level lock trong transaction close_annual_plan; re-check trong transaction |
| Excel import malformed file → crash service | Low | Try/catch với rõ ràng error message; limit file size 10MB; validate header row trước khi parse data |
| Audit log table `ppg_audit_log` grow vô hạn | Medium | Retention policy 5 năm (banking_grade); monthly partition plan ở Phase 3+ |

---

## 8. Banking-grade Compliance Checklist

| Control | Implementation | Status |
|---------|---------------|--------|
| Audit trail tất cả write ops | `ppg_audit_log` — entity_type, entity_id, action, user, timestamp, old/new values | Designed |
| Audit trail file operations | UPLOAD, DOWNLOAD actions trong `ppg_audit_log` | Designed |
| Data residency | File storage local `/data/vib-docstore/` — không có external cloud | Designed |
| No public file URL | File download yêu cầu JWT + ownership check | Designed |
| File integrity | SHA-256 checksum verify on upload và download | Designed |
| Executable file rejection | MIME type whitelist (ADR-005) | Designed |
| Soft delete (không xóa cứng) | `deleted_at` timestamp, status=decommissioned/deprecated | Designed |
| Access control prep | `ppg_object_permissions` placeholder table (v2 RBAC) | Designed |
| Audit log retention | 5 năm minimum (cleanup job) | Designed |
| State machine protection | Transition validation tại API layer — không bypass | Designed |

---

*ARCH-001 v2.0 — DevOps Ecosystem Platform | Solutions Architect | 2026-04-10*
