# VIB DevOps Ecosystem Platform

![Status](https://img.shields.io/badge/status-Phase%200%20Foundation-blue)
![Stack](https://img.shields.io/badge/stack-FastAPI%20%7C%20React%20%7C%20PostgreSQL-informational)
![Version](https://img.shields.io/badge/version-3.0.0-green)
![Compliance](https://img.shields.io/badge/compliance-banking__grade-red)

---

## Tổng quan / Overview

VIB DevOps Ecosystem Platform là **internal tool** dành cho các team IT nội bộ VIB, được xây dựng để giải quyết hai vấn đề cốt lõi: thông tin dự án phân tán và thiếu tiêu chuẩn mô tả ứng dụng/hệ thống. Platform tập trung toàn bộ dữ liệu dự án vào một nơi, chuẩn hóa cấu trúc Application Registry, và tự động hóa pipeline từ yêu cầu nghiệp vụ thô đến test case có cấu trúc. (per BRD-001, Section 1.1)

**Người dùng mục tiêu:** PM, BA, Developer, QA, PO, Stakeholder nội bộ VIB. Platform không hỗ trợ mobile và không tích hợp hệ thống bên ngoài trong version này. (per BRD-001, Section 1.2 và 2.2)

---

## Kiến trúc hệ thống / Architecture

(per ARCH-001, Section 1 — per ADR-001)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                         │
│                 http://localhost:5173                           │
│   ┌────────────┐   ┌──────────────┐   ┌──────────────────┐     │
│   │  PPG Pages │   │   BA Pages   │   │   Test Pages     │     │
│   └─────┬──────┘   └──────┬───────┘   └────────┬─────────┘     │
└─────────┼────────────────┼───────────────────┼───────────────┘
          │ /api/ppg       │ /api/ba           │ /api/test
          ▼                ▼                   ▼
┌────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  PPG System    │ │ BA Workflow  │ │ Test Platform    │
│  :8001         │ │ :8002        │ │ :8003            │
│  + Auth Provider│ │              │ │                  │
│                │◄── sync-doc ───┤                    │
│                │◄── sync-test ──┼────────────────────┤
│                │                │◄──── /brs ─────────┤
└───────┬────────┘ └──────┬───────┘ └────────┬─────────┘
        │                 │                   │
        └─────────────────┼───────────────────┘
                          ▼
                ┌──────────────────┐
                │   PostgreSQL 15  │
                │   devops_hub DB  │
                │   (1 schema,     │
                │   3 table prefix)│
                └──────────────────┘
```

**Inter-service communication:** HTTP direct call (background task). Không dùng Kafka trong v1. Nếu sync thất bại → ghi log vào `ppg_sync_log`, không rollback transaction chính. (per ADR-001, Consequences; per BRD-001 NFR-005)

---

## Modules

### PPG — Project Portfolio & Governance (port 8001)

Service trung tâm, đồng thời là **auth provider** cho toàn hệ thống. (per ADR-003)

**Features (per BRD-001 FR-001 đến FR-008):**
- Tạo/quản lý dự án IT với 4 trạng thái: `active`, `on_hold`, `completed`, `archived` (FR-001)
- Tự động sinh 9 milestone chuẩn phân bổ theo timeline khi tạo dự án (FR-002, BR-004)
- Application Registry: khai báo Ứng dụng/Hệ thống/Job/Connection theo schema chuẩn bắt buộc (FR-003 — per ADR-002)
- Quản lý thành viên dự án với role và alias (FR-004)
- Quản lý file với version history và copy-from-URL (FR-005, BR-007)
- Meeting Minutes Parser: input ghi chú thô với `@alias` → output biên bản có cấu trúc (FR-006)
- Dashboard KPI: số tài liệu, test coverage %, pass/fail rate (FR-007)
- Annual Plan: lập kế hoạch danh mục dự án theo năm/quý (FR-008)

**Routers (per `backend/ppg/app/main.py`):**
`auth`, `projects`, `app_registry`, `milestones`, `members`, `files`, `meetings`, `annual_plans`, `sync`

---

### BA Workflow (port 8002)

**Features (per BRD-001 FR-009 đến FR-012):**
- Document Hub: tạo/quản lý BRD, BRS, ERD, API Spec (S-03)
- State machine 4 trạng thái: `draft → review → approved → archived` (FR-009, BR-001)
- Document versioning: lưu snapshot lịch sử mỗi lần edit (FR-010)
- Auto-push khi approve: BRS approved → tự động push sang Test Platform; tất cả doc type push sang PPG (FR-011)
- Stakeholder Discussions gắn với tài liệu cụ thể (FR-012)

**Routers (per `backend/ba-workflow/app/main.py`):**
`requirements`, `documents`, `discussions`, `ba_tasks`, `timeline`

---

### Test Platform (port 8003)

**Features (per BRD-001 FR-013 đến FR-017):**
- Auto Test Case Generation: mỗi business rule trong BRS → 1 test case + 1 Playwright script (FR-013, BR-002)
- Test case state machine: `generated → reviewed → approved → executed` (FR-014)
- Rediff: khi BRS thay đổi và approve lại → tái sinh test case, đánh dấu cũ là `obsolete` (FR-015, BR-008)
- Test Report với metrics: total, passed, failed, coverage (FR-016, BR-003)
- Approve test report → tự động sync metrics về PPG dashboard (FR-017)

**Routers (per `backend/test-platform/app/main.py`):**
`brs`, `test_reports`, `test_cases`, `test_tasks`, `discussions`, `timeline`

---

### Frontend (port 5173)

(per ADR-001, per ARCH-001 Section 2)

**Tech stack:**
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React + TypeScript | 18.3+ / 5.4+ |
| Build Tool | Vite | 5.2+ |
| State Management | Zustand | 4.5+ |

**Pages (per `frontend/src/pages/`):**
| Page | Path | Module |
|------|------|--------|
| Login | `LoginPage.tsx` | Auth |
| Projects List | `ppg/ProjectsPage.tsx` | PPG |
| Project Detail | `ppg/ProjectDetailPage.tsx` | PPG |
| BA Workflow | `ba/BAPage.tsx` | BA |
| Test Platform | `test/TestPage.tsx` | Test |

Frontend proxy cấu hình: `/api/ppg` → `:8001`, `/api/ba` → `:8002`, `/api/test` → `:8003` (per ADR-001, Consequences)

---

## Database Schema

(per ADR-001, ADR-002, ARCH-001 Section 3 — nguồn: `infra/init.sql`)

**Convention:** snake_case cho tất cả tên bảng/cột. Mỗi service có prefix bảng riêng.

| Prefix | Service | Tables chính |
|--------|---------|-------------|
| `ppg_` | PPG System | `ppg_users`, `ppg_app_registry`, `projects`, `project_milestones`, `project_members`, `project_files`, `file_versions`, `meeting_minutes`, `annual_plans`, `plan_items`, `project_documents`, `test_results` |
| `ba_` / (no prefix) | BA Workflow | `requirements`, `documents`, `document_history`, `stakeholder_discussions`, `ba_tasks` |
| `test_` | Test Platform | `brs_sync`, `test_cases`, `test_reports`, `test_tasks` |

**Bảng trọng tâm:**

`ppg_app_registry` — Application Registry, 4 loại object: `application`, `system`, `job`, `connection`. Dùng JSONB `extra` field cho type-specific data (per ADR-002):

```sql
CREATE TABLE ppg_app_registry (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    object_type VARCHAR(20) NOT NULL
                CHECK (object_type IN ('application','system','job','connection')),
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(50) NOT NULL,  -- uppercase, unique per project
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    environment JSONB NOT NULL DEFAULT '[]',
    extra       JSONB NOT NULL DEFAULT '{}',
    created_by  VARCHAR(100) NOT NULL DEFAULT 'system',
    UNIQUE (project_id, code)
);
```

`documents` — State machine với `status CHECK (status IN ('draft','review','approved','archived'))` (per BRD-001 BR-001)

`test_cases` — Mỗi record chứa `playwright_script TEXT` cho auto-gen (per BRD-001 FR-013)

**Seed data:** Default admin user `admin@vib.com.vn` (password: `admin123`) được tạo sẵn trong `infra/init.sql`.

---

## Authentication

(per ADR-003)

Platform dùng **JWT DB-based authentication**. PPG service (`:8001`) là auth provider duy nhất. BA Workflow và Test Platform verify JWT independently — không call về PPG mỗi request.

**Auth flow:**

```
Client → POST /auth/login {username, password}
PPG    → verify password (bcrypt)
PPG    → return {access_token, token_type: "bearer", expires_in: 28800}
Client → include "Authorization: Bearer <token>" trong mọi request
All services → verify JWT signature + expiry on every request
```

**JWT Payload:**
```json
{
    "sub": "username",
    "name": "Full Name",
    "exp": "<timestamp — 8 giờ>",
    "iat": "<timestamp>"
}
```

**Protected endpoints:** Tất cả endpoints trừ `GET /health` và `POST /auth/login` yêu cầu valid JWT. Trả về `401 Unauthorized` nếu thiếu hoặc invalid token. (per BRD-001 NFR-006)

**Lưu ý bảo mật (banking_grade):** Frontend lưu token trong memory, không dùng `localStorage`. (per ADR-003, Implementation)

**Upgrade path (v2):** Thay `POST /auth/login` bằng OAuth2/SSO flow, giữ nguyên JWT format — không cần rewrite business logic. (per ADR-003, Consequences)

---

## Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.12+ |
| Node.js | 20+ (LTS) |
| PostgreSQL | 15+ |

### Setup & Run

```bash
# 1. Khởi tạo database
psql -U <user> -d <db> -f infra/init.sql

# 2. Backend PPG (auth provider + project governance)
cd backend/ppg && pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload

# 3. Backend BA Workflow
cd backend/ba-workflow && pip install -r requirements.txt
uvicorn app.main:app --port 8002 --reload

# 4. Backend Test Platform
cd backend/test-platform && pip install -r requirements.txt
uvicorn app.main:app --port 8003 --reload

# 5. Frontend
cd frontend && npm install && npm run dev
```

Sau khi khởi động, truy cập: `http://localhost:5173`  
Login với default admin: `admin` / `admin123` (per `infra/init.sql` seed data)

**Windows:** Có thể dùng `install.bat` và `start.bat` ở root directory.

---

## API Endpoints Overview

(per ARCH-001, Section 4)

### Authentication — PPG :8001

| Method | Path | Description | Auth Required |
|--------|------|-------------|--------------|
| POST | `/auth/login` | Đăng nhập, nhận JWT | No |
| GET | `/health` | Health check | No |

### PPG System — :8001

| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | Danh sách dự án |
| POST | `/projects` | Tạo dự án mới (auto-gen 9 milestones — FR-002) |
| GET | `/projects/{id}` | Chi tiết dự án |
| GET | `/projects/{id}/app-registry` | Danh sách Application Registry objects |
| POST | `/projects/{id}/app-registry` | Khai báo object mới (ADR-002) |
| PUT | `/projects/{id}/app-registry/{obj_id}` | Cập nhật object |
| DELETE | `/projects/{id}/app-registry/{obj_id}` | Soft-delete (status=deprecated) |
| GET | `/projects/{id}/milestones` | 9 milestones của dự án |
| GET | `/projects/{id}/members` | Thành viên dự án |
| POST | `/projects/{id}/members` | Thêm thành viên |
| POST | `/projects/{id}/meetings` | Tạo meeting minutes (Meeting Parser — FR-006) |
| GET | `/projects/{id}/files` | File theo dự án |
| GET | `/annual-plans` | Annual plans |
| POST | `/sync-doc` | Nhận sync từ BA (internal) |
| POST | `/sync-test` | Nhận sync từ Test Platform (internal) |

### BA Workflow — :8002

| Method | Path | Description |
|--------|------|-------------|
| GET | `/requirements` | Danh sách requirements |
| POST | `/requirements` | Tạo requirement mới |
| GET | `/documents` | Danh sách tài liệu |
| POST | `/documents` | Tạo tài liệu (BRD/BRS/ERD/API Spec) |
| POST | `/documents/{id}/action` | Chuyển trạng thái state machine (FR-009) |
| GET | `/discussions` | Stakeholder discussions |
| GET | `/ba-tasks` | BA tasks theo dự án |
| GET | `/timeline` | BA timeline |

**State machine actions (per BRD-001 FR-009, BR-001):**  
`?action=submit_review` → draft → review  
`?action=approve` → review → approved (triggers sync to PPG + Test)  
`?action=reject` → review → draft  
`?action=archive` → approved → archived

### Test Platform — :8003

| Method | Path | Description |
|--------|------|-------------|
| POST | `/brs` | Nhận BRS từ BA Workflow (triggers auto-gen — FR-013) |
| GET | `/brs` | Danh sách BRS đã sync |
| GET | `/test-cases` | Danh sách test cases |
| POST | `/test-cases/{id}/action` | Chuyển trạng thái test case (FR-014) |
| GET | `/test-reports` | Danh sách test reports |
| POST | `/test-reports` | Tạo test report mới |
| POST | `/test-reports/{id}/approve` | Approve report → sync metrics về PPG (FR-017) |
| GET | `/test-tasks` | Test tasks |
| GET | `/timeline` | Test timeline |

---

## Project Structure

(per ARCH-001, Section 2)

```
ecosys/
├── backend/
│   ├── ppg/                          ← PPG System :8001
│   │   ├── app/
│   │   │   ├── main.py               ← FastAPI app entry point
│   │   │   ├── auth.py               ← JWT auth provider (ADR-003)
│   │   │   ├── dependencies.py       ← get_current_user(), get_db()
│   │   │   ├── models/               ← Pydantic + DB models
│   │   │   ├── routers/              ← API route handlers
│   │   │   └── services/             ← Business logic
│   │   ├── requirements.txt
│   │   └── .env
│   │
│   ├── ba-workflow/                  ← BA Workflow :8002
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── dependencies.py       ← JWT verify (không call PPG)
│   │   │   ├── models/
│   │   │   ├── routers/
│   │   │   └── services/
│   │   │       ├── state_machine.py  ← draft/review/approved/archived
│   │   │       └── sync_service.py   ← push to PPG + Test Platform
│   │   ├── requirements.txt
│   │   └── .env
│   │
│   └── test-platform/               ← Test Platform :8003
│       ├── app/
│       │   ├── main.py
│       │   ├── dependencies.py       ← JWT verify
│       │   ├── models/
│       │   ├── routers/
│       │   └── services/
│       │       ├── test_generator.py ← BRS → test cases + Playwright script
│       │       └── sync_service.py   ← push metrics to PPG
│       ├── requirements.txt
│       └── .env
│
├── frontend/                         ← React SPA :5173
│   ├── src/
│   │   ├── components/               ← Shared UI components
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ppg/                  ← ProjectsPage, ProjectDetailPage
│   │   │   ├── ba/                   ← BAPage
│   │   │   └── test/                 ← TestPage
│   │   ├── stores/                   ← Zustand stores per domain
│   │   ├── api/                      ← API clients: ppg.ts, ba.ts, test.ts
│   │   └── App.tsx
│   ├── vite.config.ts                ← Proxy config
│   └── package.json
│
├── infra/
│   └── init.sql                      ← DB init + seed data
│
├── docs/
│   ├── adr/                          ← Architecture Decision Records
│   ├── arch/                         ← System Architecture docs
│   └── brd/                          ← Business Requirements Documents
│
├── start.bat                         ← Windows quick start
├── install.bat
├── project-profile.yaml
└── CLAUDE.md                         ← Project shared context
```

---

## ADRs

Tất cả ADRs có status **Accepted** (date: 2026-04-09):

| ADR | Tiêu đề | File |
|-----|---------|------|
| ADR-001 | Tech Stack & System Architecture | [docs/adr/ADR-001-tech-stack.md](adr/ADR-001-tech-stack.md) |
| ADR-002 | Application Registry Schema (4 types, ppg_app_registry) | [docs/adr/ADR-002-application-registry-schema.md](adr/ADR-002-application-registry-schema.md) |
| ADR-003 | Authentication Mechanism (JWT DB-based, upgrade path → SSO) | [docs/adr/ADR-003-authentication.md](adr/ADR-003-authentication.md) |

---

## Status

| Field | Value |
|-------|-------|
| Current Phase | Phase 0 — Foundation |
| Current Stage | Stage 0.1 — Discover & Deconstruct |
| Scaffold status | ready-for-review (CODE-001, 2026-04-09) |
| BRD | BRD-001 Draft (18 FR, 7 NFR, 8 BR) |
| Architecture | ARCH-001 ready-for-dev |

**Pending decisions (chờ confirm trước Stage 1.4):**
- Format file convert cần hỗ trợ (waiting: PO)
- Storage strategy cho converted files (waiting: Architect)
- Authentication method VIB SSO OAuth2 vs internal auth (waiting: Tech Lead)
- Deployment: Docker Compose vs Kubernetes (waiting: DevOps)
- BRS template chuẩn để auto-gen test case (REQUEST-BA-QA-001, waiting: QA)

(per CLAUDE.md — Decisions đang chờ)

---

*VIB DevOps Ecosystem Platform | Technical Writer: Agent 09 | 2026-04-09*  
*Nguồn: BRD-001, ADR-001, ADR-002, ADR-003, ARCH-001, CODE-001, infra/init.sql*
