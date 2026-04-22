# Release Notes — DevOps Ecosystem Platform

**Product:** DevOps Ecosystem — IT Project Governance & Documentation Platform
**Version:** 3.0.0
**Release Date:** 2026-04-09
**Prepared by:** PO Agent

---

## Table of Contents

1. [Tổng quan](#1-tổng-quan)
2. [Thành phần hệ thống](#2-thành-phần-hệ-thống)
3. [What's New — v3.0.0](#3-whats-new--v300)
4. [Chi tiết tính năng](#4-chi-tiết-tính-năng)
5. [Kiến trúc hệ thống](#5-kiến-trúc-hệ-thống)
6. [Yêu cầu hệ thống](#6-yêu-cầu-hệ-thống)
7. [Hướng dẫn khởi động](#7-hướng-dẫn-khởi-động)
8. [Luồng nghiệp vụ chính](#8-luồng-nghiệp-vụ-chính)
9. [API Endpoints](#9-api-endpoints)
10. [Known Issues & Limitations](#10-known-issues--limitations)
11. [Lịch sử phiên bản](#11-lịch-sử-phiên-bản)

---

## 1. Tổng quan

**DevOps Ecosystem** là nền tảng quản trị dự án IT và tài liệu hóa nghiệp vụ tích hợp, được xây dựng theo kiến trúc microservices. Hệ thống hỗ trợ toàn bộ vòng đời dự án từ lập kế hoạch, quản lý yêu cầu, phê duyệt tài liệu, đến tự động sinh test case và báo cáo kiểm thử.

**Mục tiêu cốt lõi:** Biến yêu cầu nghiệp vụ thô → đặc tả có cấu trúc (BRD/BRS/ERD/API) → test case tự động, với dashboard quản trị toàn bộ 9 giai đoạn chuẩn của dự án IT.

---

## 2. Thành phần hệ thống

| Service | Port | Phiên bản | Mô tả |
|---------|------|-----------|-------|
| PPG System | 8001 | v3.0.0 | Project Portfolio Governance — quản trị dự án, milestone, file, meeting |
| BA Workflow | 8002 | v3.0.0 | Document Hub — quản lý tài liệu nghiệp vụ với state machine |
| Test Platform | 8003 | v3.0.0 | Auto-Test Generation — sinh test case tự động từ BRS |
| Frontend (SPA) | 5173 | v2.0.0 | React + TypeScript UI tích hợp cả 3 services |

---

## 3. What's New — v3.0.0

### PPG System

- **Auto-generate 9 milestones chuẩn** khi tạo dự án mới, phân phối tỷ lệ theo thời gian dự án
- **File Versioning** — mỗi file có lịch sử phiên bản đầy đủ, hỗ trợ tải xuống theo version cụ thể
- **External URL Attachment** — đính kèm file từ SharePoint, ADO, file server
- **Copy-from-URL** — tải file từ URL ngoài vào storage nội bộ
- **Meeting Minutes Parser** — parse ghi chú thô → biên bản họp có cấu trúc qua cú pháp `@alias`
- **Annual Plan** — lập kế hoạch danh mục dự án theo năm và quý
- **Sync endpoints** nhận tài liệu đã phê duyệt từ BA và báo cáo test từ Test Platform

### BA Workflow

- **Document State Machine** — luồng phê duyệt 4 trạng thái: `draft → review → approved → archived`
- **Document Versioning** — lưu snapshot lịch sử mỗi lần chỉnh sửa
- **Auto-push khi Approve** — tự động đẩy BRS sang Test Platform và tất cả doc sang PPG
- **Stakeholder Discussions** — luồng phản hồi và làm rõ yêu cầu trước khi phê duyệt
- **BA Timeline** — xem tiến độ task theo milestone theo dạng Gantt

### Test Platform

- **Auto Test Case Generation** từ BRS — mỗi business rule sinh 1 test case + Playwright script
- **Playwright Script Generation** — tạo script kiểm thử E2E tự động sẵn sàng chạy
- **Test Case State Machine** — `generated → reviewed → approved → executed`
- **Test Report Approval** — phê duyệt báo cáo kiểm thử → tự động đẩy metrics về PPG
- **Rediff** — tái sinh test case khi BRS có thay đổi
- **Test Timeline** — xem tiến độ kiểm thử theo milestone

### Frontend

- **Unified SPA** — giao diện thống nhất điều hướng cả 3 services qua sidebar
- **VIB Design System** — bộ UI components chuẩn hóa (StatusBadge, Modal, KpiCard, ProgressBar, Toast)
- **State Machine UI** — visualize trạng thái tài liệu/test case bằng progress bar trực quan
- **Playwright Script Viewer** — xem và copy script test trực tiếp trong UI
- **Dashboard KPI Cards** — số liệu tổng hợp về tài liệu và coverage kiểm thử per project
- **API Proxy** — Vite dev server proxy tự động route `/api/ppg`, `/api/ba`, `/api/test`

---

## 4. Chi tiết tính năng

### 4.1 PPG — Project Portfolio Governance

#### Quản lý dự án
- Tạo, cập nhật, archive dự án IT
- Trạng thái: `active | on_hold | completed | archived`
- Liên kết dự án với kế hoạch năm (Annual Plan)
- Dashboard tổng hợp: số lượng tài liệu theo loại, % test coverage, pass/fail rate

#### 9 Milestone Chuẩn (Auto-generated)
Khi tạo dự án, hệ thống tự động sinh 9 milestone phân bổ tỷ lệ theo timeline:

| # | Milestone | BA Tasks | Test Tasks |
|---|-----------|----------|------------|
| 1 | Kickoff | Requirements gathering | — |
| 2 | Requirements | BRD, sign-off | Test plan |
| 3 | Design | FRD, review | Test cases |
| 4 | Development | Support | Automation |
| 5 | SIT | Support | SIT execution |
| 6 | UAT | Sign-off support | UAT execution |
| 7 | Go-Live | Release notes | Go-live check |
| 8 | Hypercare | Monitoring docs | Regression |
| 9 | Closure | Closure report | Final report |

#### Quản lý thành viên dự án
- Vai trò: PM, BA, Dev, QA, PO, Stakeholder
- **Alias hệ thống** — dùng `@alias` trong meeting notes để tự động map tên đầy đủ

#### Quản lý file
- 3 loại file: `template | uploaded | external_url`
- Version history đầy đủ mỗi lần upload mới
- Tải xuống theo version cụ thể
- Copy file từ URL ngoài vào hệ thống

#### Meeting Minutes Generator
- Input: ghi chú thô (free text) với `@alias` tokens
- Output có cấu trúc: attendees, decisions, action items (assignee + due date), risks, suggestions

### 4.2 BA Workflow — Document Hub

#### Document State Machine
```
draft ──submit_review──► review ──approve──► approved ──archive──► archived
                              └──reject──► draft
```

#### Loại tài liệu hỗ trợ
| Type | Mô tả |
|------|-------|
| BRD | Business Requirements Document |
| BRS | Business Requirements Specification |
| ERD | Entity Relationship Diagram |
| API | API Specification |

#### Auto-push khi Approve
- Tất cả doc types → `POST /sync-doc` (PPG)
- BRS only → `POST /brs` (Test Platform) để trigger auto-generate test cases

#### Stakeholder Discussions
- Tạo thảo luận theo tài liệu cụ thể
- Trạng thái: `open | resolved | deferred`
- Ghi nhận resolution notes khi đóng

### 4.3 Test Platform — Auto Test Generation

#### BRS → Test Case Pipeline
```
BRS Approved (BA)
  └─► POST /brs (Test Platform)
        └─► Background: generate_test_cases_from_brs()
              └─► Mỗi business rule → 1 TestCase + 1 Playwright Script
```

#### Playwright Script Template (Auto-generated)
```javascript
import { test, expect } from '@playwright/test';

test('[Module]: [Business Rule Description]', async ({ page }) => {
  await page.goto(process.env.BASE_URL || 'http://localhost:3000');
  await page.waitForLoadState('networkidle');
  // TODO: Implement specific assertions
  await expect(page).toHaveTitle(/.+/);
});
```

#### Test Report Flow
1. Tạo report thủ công (total, passed, failed, logs)
2. Hệ thống tự tính `coverage = (passed / total) * 100`
3. Approve report → tự động push metrics về PPG dashboard

---

## 5. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React SPA)                  │
│            http://localhost:5173                        │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ PPG Page │  │   BA Page    │  │   Test Page     │   │
│  └────┬─────┘  └──────┬───────┘  └────────┬────────┘   │
└───────┼───────────────┼──────────────────┼─────────────┘
        │ /api/ppg      │ /api/ba          │ /api/test
        ▼               ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  PPG System  │ │ BA Workflow  │ │ Test Platform    │
│  :8001       │ │ :8002        │ │ :8003            │
│              │◄─── sync-doc ──┤                    │
│              │◄─── sync-test ─┼────────────────────┤
│              │                │◄──── /brs (BRS) ───┤
└──────┬───────┘ └──────┬───────┘ └────────┬─────────┘
       │                │                   │
       └────────────────┼───────────────────┘
                        ▼
              ┌──────────────────┐
              │   PostgreSQL 15  │
              │   devops_hub DB  │
              └──────────────────┘
                        │
              ┌──────────────────┐
              │  Apache Kafka    │  (optional)
              │  :9092           │
              └──────────────────┘
```

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend Framework | FastAPI | 0.115.5 |
| ASGI Server | Uvicorn | 0.32.1 |
| Database Driver | asyncpg | 0.30.0 |
| Data Validation | Pydantic | 2.10.3 |
| HTTP Client | httpx | 0.28.1 |
| Message Queue | aiokafka | 0.13.0 |
| Frontend Framework | React | 18.3.1 |
| Language | TypeScript | 5.4.5 |
| Build Tool | Vite | 5.2.12 |
| State Management | Zustand | 4.5.2 |
| Runtime | Python | 3.12+ |
| Node.js | Node.js | 20+ |
| Database | PostgreSQL | 15+ |

---

## 6. Yêu cầu hệ thống

### Bắt buộc
- Python 3.12+
- Node.js 20+ / npm 10+
- PostgreSQL 15+

### Tùy chọn
- Apache Kafka 3+ (event streaming giữa các services)
- Redis 7+ (caching)
- MongoDB 6+ (document store mở rộng)

### Cấu hình môi trường (.env per service)
```env
DATABASE_URL=postgresql://devops:devops123@localhost/devops_hub
KAFKA_BOOTSTRAP=localhost:9092
REDIS_URL=redis://localhost:6379
SECRET_KEY=<service-specific-key>
UPLOAD_DIR=../../uploads

# PPG only
# (no extra URLs needed)

# BA Workflow only
PPG_SERVICE_URL=http://localhost:8001
TEST_SERVICE_URL=http://localhost:8003

# Test Platform only
PPG_SERVICE_URL=http://localhost:8001
```

---

## 7. Hướng dẫn khởi động

### Windows — Khởi động nhanh
```bat
start.bat
```
Script tự động mở 4 cửa sổ CMD riêng biệt cho từng service.

### Hoặc chạy thủ công
```bash
# PPG System
cd backend/ppg
uvicorn app.main:app --port 8001 --reload

# BA Workflow
cd backend/ba-workflow
uvicorn app.main:app --port 8002 --reload

# Test Platform
cd backend/test-platform
uvicorn app.main:app --port 8003 --reload

# Frontend
cd frontend
npm run dev
```

### Cài đặt dependencies lần đầu
```bat
install.bat
```

Hoặc thủ công:
```bash
pip install -r backend/ppg/requirements.txt
pip install -r backend/ba-workflow/requirements.txt
pip install -r backend/test-platform/requirements.txt
cd frontend && npm install
```

### Khởi tạo database
```bash
psql -U postgres -f infra/init.sql
```

### Kiểm tra health
```
GET http://localhost:8001/health  → PPG
GET http://localhost:8002/health  → BA
GET http://localhost:8003/health  → Test
```

---

## 8. Luồng nghiệp vụ chính

### Flow 1: Tạo dự án mới

```
1. POST /projects (PPG)
   ├─ Tạo bản ghi dự án
   ├─ Auto-generate 9 milestones (phân bổ theo timeline)
   ├─ Tạo thư mục: uploads/{project_id}/
   ├─ Auto-generate BA tasks cho từng milestone
   ├─ Auto-generate Test tasks cho từng milestone
   └─ Sinh file template markdown (Project_Charter.md, BRD.md, ...)
   └─ Các object quản lý của dự án là các Ứng dụng/hệ thống/ Job/ Connection (API/ETL)
```

### Flow 2: BA tạo và phê duyệt tài liệu

```
2. POST /documents (BA) → trạng thái: draft
3. PUT  /documents/{id} (BA) → chỉnh sửa nội dung (lưu history)
4. POST /documents/{id}/action?action=submit_review → draft → review
5. POST /documents/{id}/action?action=approve      → review → approved
   ├─ Background: POST /sync-doc → PPG (tất cả loại)
   └─ Background: POST /brs     → Test Platform (chỉ BRS)
```

### Flow 3: Auto-generate Test Cases từ BRS

```
6. [BRS approved tại BA]
7. POST /brs (Test Platform) — nhận BRS payload
   └─ Background: generate_test_cases_from_brs()
      ├─ Parse modules/rules từ BRS content
      └─ Mỗi rule → 1 TestCase + 1 Playwright script
8. Tester review và approve test cases
9. Execute tests
10. POST /test-reports (Test Platform) → tạo báo cáo
11. POST /test-reports/{id}/approve
    └─ Background: POST /sync-test → PPG (cập nhật dashboard)
```

### Flow 4: Meeting Minutes Parser

```
12. POST /projects/{id}/meetings/generate (PPG)
    Input: raw_notes = "@john discussed login flow, @sarah raised risk about timeout"
    ├─ Parse @alias → map thành viên dự án
    ├─ Trích xuất: discussion items, decisions, action items, risks
    └─ Output: biên bản họp có cấu trúc JSON
```

---

## 9. API Endpoints

### PPG System — :8001

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/projects` | Danh sách dự án |
| POST | `/projects` | Tạo dự án (auto-gen milestones) |
| GET | `/projects/{id}` | Chi tiết dự án |
| PUT | `/projects/{id}` | Cập nhật dự án |
| DELETE | `/projects/{id}` | Archive dự án |
| GET | `/projects/{id}/dashboard` | KPI dashboard |
| GET | `/projects/{id}/milestones` | Danh sách milestones |
| POST | `/projects/{id}/milestones/generate` | Tái sinh milestones |
| GET | `/projects/{id}/members` | Thành viên dự án |
| POST | `/projects/{id}/members` | Thêm thành viên |
| GET | `/projects/{id}/files` | Danh sách file |
| POST | `/projects/{id}/files` | Tạo file record |
| GET | `/projects/{id}/files/{fid}/download` | Tải file |
| POST | `/projects/{id}/files/{fid}/copy-from-url` | Copy file từ URL |
| GET | `/projects/{id}/meetings` | Danh sách biên bản họp |
| POST | `/projects/{id}/meetings/generate` | Parse raw notes → meeting |
| GET | `/annual-plans` | Kế hoạch năm |
| POST | `/annual-plans` | Tạo kế hoạch năm |
| POST | `/sync-doc` | Nhận tài liệu từ BA |
| POST | `/sync-test` | Nhận test report từ Test Platform |

### BA Workflow — :8002

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/requirements` | Danh sách yêu cầu |
| POST | `/requirements` | Tạo yêu cầu |
| GET | `/documents` | Danh sách tài liệu |
| POST | `/documents` | Tạo tài liệu |
| GET | `/documents/{id}` | Chi tiết tài liệu |
| PUT | `/documents/{id}` | Cập nhật tài liệu (lưu history) |
| POST | `/documents/{id}/action` | State machine transition |
| GET | `/ba-tasks` | Danh sách BA tasks |
| POST | `/ba-tasks` | Tạo BA task |
| PUT | `/ba-tasks/{id}` | Cập nhật BA task |
| GET | `/discussions` | Danh sách discussions |
| POST | `/discussions` | Tạo discussion |
| PUT | `/discussions/{id}` | Resolve discussion |
| GET | `/timeline/{project_id}` | Timeline BA theo milestone |

### Test Platform — :8003

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/brs` | Danh sách BRS synced |
| POST | `/brs` | Nhận BRS (trigger auto-gen) |
| POST | `/brs/{id}/rediff` | Tái sinh test cases |
| GET | `/test-cases` | Danh sách test cases |
| POST | `/test-cases` | Tạo test case thủ công |
| PUT | `/test-cases/{id}/action` | State machine transition |
| GET | `/test-reports` | Danh sách test reports |
| POST | `/test-reports` | Tạo test report |
| POST | `/test-reports/{id}/approve` | Approve + push to PPG |
| GET | `/test-tasks` | Danh sách test tasks |
| POST | `/test-tasks` | Tạo test task |
| PUT | `/test-tasks/{id}` | Cập nhật test task |
| GET | `/discussions` | Danh sách discussions |
| GET | `/timeline/{project_id}` | Timeline test theo milestone |

> Swagger UI đầy đủ: `http://localhost:{port}/docs`

---

## 10. Known Issues & Limitations

| # | Issue | Service | Mức độ | Ghi chú |
|---|-------|---------|--------|---------|
| 1 | Kafka không kết nối được khi chạy local | PPG | Thấp | Service vẫn hoạt động bình thường, Kafka consumer bị bỏ qua gracefully |
| 2 | Playwright scripts được sinh là template, cần implement assertion cụ thể | Test | Trung bình | Team test cần bổ sung logic assertion cho từng rule |
| 3 | Vite CJS build API deprecated warning | Frontend | Thấp | Chỉ là cảnh báo, không ảnh hưởng runtime |
| 4 | File copy-from-URL không có timeout cấu hình | PPG | Thấp | Có thể treo nếu URL nguồn phản hồi chậm |
| 5 | Meeting parser phụ thuộc @alias — nếu alias không tồn tại sẽ không resolve được | PPG | Trung bình | Cần đảm bảo thêm member trước khi parse meeting |
| 6 | Không có authentication/authorization | Tất cả | Cao | API endpoints hiện không được bảo vệ, chỉ phù hợp môi trường nội bộ |

---

## 11. Lịch sử phiên bản

### v3.0.0 — 2026-04-09 *(current)*
- Nâng cấp toàn bộ 3 backend services lên FastAPI 0.115.5 + asyncpg 0.30.0
- Thêm File Versioning & Copy-from-URL (PPG)
- Thêm Annual Plan module (PPG)
- Thêm Meeting Minutes Parser với @alias syntax (PPG)
- Thêm Document State Machine với auto-push (BA)
- Thêm Playwright script auto-generation từ BRS (Test)
- Thêm Test Report Approval + sync metrics về PPG
- Frontend v2.0.0: unified SPA, VIB Design System, Playwright Script Viewer

### v2.0.0
- Kiến trúc microservices 3 services (PPG, BA, Test)
- Auto-generate milestones khi tạo dự án
- BRS sync pipeline từ BA → Test
- React frontend tích hợp với Zustand state management

### v1.0.0
- MVP: Quản lý dự án và tài liệu cơ bản
- Single FastAPI monolith
- PostgreSQL schema khởi tạo

---

*Tài liệu này được tạo tự động bởi PO Agent — DevOps Ecosystem v3.0.0*
