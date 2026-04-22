# VIB DevOps Ecosystem Platform

Nền tảng quản lý dự án & quy trình nội bộ — Project Governance · BA Workflow · Test Platform · Danh mục · Requests · To-do.

---

## Kiến trúc tổng quan

```
Browser (localhost:5173)
    │
    ▼
React Frontend (Vite)
    ├── /api/ppg/*   ──▶  PPG System    (localhost:8001)  ← Auth provider
    ├── /api/ba/*    ──▶  BA Workflow   (localhost:8002)
    └── /api/test/*  ──▶  Test Platform (localhost:8003)
                              │
                         PostgreSQL (localhost:5432)
                         database: devops_hub
```

| Service | Port | Swagger UI |
|---------|------|------------|
| PPG System (Auth + Governance) | 8001 | http://localhost:8001/docs |
| BA Workflow | 8002 | http://localhost:8002/docs |
| Test Platform | 8003 | http://localhost:8003/docs |
| Frontend | 5173 | http://localhost:5173 |

---

## Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu | Tải về |
|---------|---------------------|--------|
| Python | **3.11+** | https://www.python.org/downloads/ |
| Node.js | **20 LTS** | https://nodejs.org/ |
| PostgreSQL | **15+** | https://www.postgresql.org/download/ |

> **Windows:** Khi cài PostgreSQL, nhớ tick chọn "Add to PATH". Khi cài Python, nhớ tick "Add Python to PATH".

---

## Cài đặt từ đầu (Step by step)

### Bước 1 — Giải nén source code

Giải nén file zip vào thư mục bất kỳ, ví dụ `C:\projects\ecosys`. Toàn bộ hướng dẫn dưới đây sẽ gọi thư mục này là **`<project_root>`**.

---

### Bước 2 — Chuẩn bị PostgreSQL

Mở **psql** hoặc **pgAdmin**, chạy các lệnh sau với user `postgres`:

```sql
-- Tạo user và database
CREATE USER devops WITH PASSWORD 'devops123';
CREATE DATABASE devops_hub OWNER devops;
GRANT ALL PRIVILEGES ON DATABASE devops_hub TO devops;
```

**Kiểm tra kết nối:**
```bash
psql -h 127.0.0.1 -U devops -d devops_hub -c "SELECT 1;"
# Kết quả mong đợi: (1 row)
```

---

### Bước 3 — Khởi tạo schema database

Từ `<project_root>`, chạy **1 lệnh duy nhất**:

```bat
migrate.bat
```

Script này sẽ tự động chạy `infra/init.sql` + toàn bộ 32 migration files theo đúng thứ tự.

**Hoặc chạy thủ công từng file** (nếu cần):

```bash
psql -h 127.0.0.1 -U devops -d devops_hub -f infra/init.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V017__publish_jobs.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V018__annual_plan_extended.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V019__project_management_extended.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V020__contract_terms_payments_appstandard.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V021__catalog_module.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V022__ba_test_milestones_track.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V023__fix_projects_plan_id_fk.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V024__project_brief.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V025__fix_annual_plan_related_systems.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V026__catalog_product_extended.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V027__catalog_seed_standard.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V028__project_domains.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V029__project_activity_tasks.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V030__catalog_seed_internal_webapps.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V030__catalog_user_domains.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V031__catalog_product_domain_fk.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V031__catalog_seed_users.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V032__annual_plan_2026_seed.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V033__projects_from_2026_initiatives.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V034__project_seed_milestones_members_tasks.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V035__test_defects.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V036__fix_einvoice_oracle_domain_to_fs.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V037__request_management.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V038__pcr_implementing_status.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V039__pcr_remove_draft_status.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V040__request_history.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V041__sr_update_statuses.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V041__test_documents.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V042__request_attachments.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V042__test_documents_updated_by.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V043__project_todos.sql
psql -h 127.0.0.1 -U devops -d devops_hub -f migrations/V044__project_todos_status.sql
```

> **Lưu ý:** Một số migration dùng `IF NOT EXISTS` — chạy lại không bị lỗi. Nếu thấy lỗi `already exists` có thể bỏ qua.

**Kiểm tra schema:**
```bash
psql -h 127.0.0.1 -U devops -d devops_hub -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
# Mong đợi: 40+
```

---

### Bước 4 — Cài đặt dependencies (1 lần duy nhất)

Mở Command Prompt, `cd` vào `<project_root>`, chạy:

```bat
install.bat
```

Script này sẽ tự động:
1. `pip install` cho PPG System
2. `pip install` cho BA Workflow
3. `pip install` cho Test Platform
4. `npm install` cho Frontend

**Hoặc cài thủ công nếu muốn:**

```bash
# Backend PPG
cd backend\ppg
pip install -r requirements.txt
cd ..\..

# Backend BA Workflow
cd backend\ba-workflow
pip install -r requirements.txt
cd ..\..

# Backend Test Platform
cd backend\test-platform
pip install -r requirements.txt
cd ..\..

# Frontend
cd frontend
npm install
cd ..
```

> **Tip:** Nên dùng virtual environment để tránh conflict:
> ```bash
> python -m venv venv
> venv\Scripts\activate     # Windows
> # sau đó pip install bình thường
> ```

---

### Bước 5 — Khởi động toàn bộ platform

```bat
start.bat
```

Script sẽ mở **4 cửa sổ terminal** riêng, mỗi cửa sổ chạy 1 service. Chờ khoảng **15–20 giây** để tất cả khởi động xong.

**Hoặc khởi động thủ công** (mở 4 terminal riêng):

```bash
# Terminal 1 — PPG System
cd <project_root>\backend\ppg
uvicorn app.main:app --port 8001 --reload

# Terminal 2 — BA Workflow
cd <project_root>\backend\ba-workflow
uvicorn app.main:app --port 8002 --reload

# Terminal 3 — Test Platform
cd <project_root>\backend\test-platform
uvicorn app.main:app --port 8003 --reload

# Terminal 4 — Frontend
cd <project_root>\frontend
npm run dev
```

---

### Bước 6 — Truy cập ứng dụng

Mở trình duyệt, vào: **http://localhost:5173**

| Thông tin | Giá trị |
|-----------|---------|
| URL | http://localhost:5173 |
| Username | `admin` |
| Password | `admin123` |

---

## Cấu trúc thư mục

```
ecosys/
├── backend/
│   ├── ppg/                  # PPG System — Auth, Project Governance, Catalog
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── auth.py
│   │   │   ├── database.py
│   │   │   └── routers/
│   │   └── requirements.txt
│   ├── ba-workflow/          # BA Workflow — Document Hub, Requirements
│   │   ├── app/
│   │   └── requirements.txt
│   └── test-platform/        # Test Platform — Test Cases, Reports
│       ├── app/
│       └── requirements.txt
├── frontend/                 # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── api/              # API client functions
│   │   ├── components/       # Shared UI components
│   │   ├── pages/            # Page components per module
│   │   └── stores/           # Zustand state
│   ├── package.json
│   └── vite.config.ts
├── infra/
│   └── init.sql              # Schema khởi tạo
├── migrations/               # V017–V044 incremental migrations
├── docs/                     # ADRs, Architecture, BRD
├── uploads/                  # File uploads (tự tạo khi chạy)
├── install.bat               # Cài dependencies (chạy 1 lần)
└── start.bat                 # Khởi động toàn bộ platform
```

---

## Cấu hình database

Mặc định tất cả service kết nối bằng:

```
postgresql://devops:devops123@127.0.0.1/devops_hub
```

Nếu cần đổi (PostgreSQL chạy port khác, password khác, v.v.), tạo file `.env` trong mỗi thư mục service:

```bash
# backend/ppg/.env
# backend/ba-workflow/.env
# backend/test-platform/.env
DATABASE_URL=postgresql://devops:devops123@127.0.0.1/devops_hub
```

---

## Xử lý lỗi thường gặp

### ❌ `could not connect to server: Connection refused`
PostgreSQL chưa chạy hoặc sai thông tin kết nối.
```bash
# Kiểm tra PostgreSQL đang chạy
psql -h 127.0.0.1 -U devops -d devops_hub -c "SELECT 1;"
```

### ❌ `ModuleNotFoundError: No module named 'fastapi'`
Chưa cài dependencies hoặc đang dùng sai Python environment.
```bash
pip install -r requirements.txt
python --version   # Phải là 3.11+
```

### ❌ `OSError: [Errno 10048] address already in use` (port bị chiếm)
```bash
# Tìm process đang dùng port 8001
netstat -ano | findstr :8001
# Kill process (thay <PID> bằng số tìm được)
taskkill /PID <PID> /F
```

### ❌ Frontend hiển thị lỗi API / CORS
Đảm bảo cả 3 backend đang chạy trước khi mở frontend. Kiểm tra:
```bash
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
```

### ❌ `npm install` lỗi dependency conflict
```bash
cd frontend
rmdir /s /q node_modules
del package-lock.json
npm install
```

### ❌ Migration lỗi `relation already exists`
Bảng đã tồn tại từ lần chạy trước — bỏ qua, không ảnh hưởng.

---

## Thông tin kỹ thuật

| Thành phần | Phiên bản |
|-----------|-----------|
| Python | 3.11+ |
| FastAPI | 0.115.5 |
| Uvicorn | 0.32.1 |
| asyncpg | 0.30.0 |
| React | 18.3.1 |
| TypeScript | 5.4.5 |
| Vite | 5.2.12 |
| PostgreSQL | 15+ |
| openpyxl | 3.1.5 |
| PyJWT | 2.10.1 |
