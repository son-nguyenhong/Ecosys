# ADR-001 — Tech Stack & System Architecture
**ADR-ID:** ADR-001
**Status:** Accepted
**Date:** 2026-04-09
**Author:** Solutions Architect
**BRD Reference:** BRD-001

---

## Context

DevOps Ecosystem Platform là internal tool với 3 backend services + 1 React SPA. Cần chọn tech stack phù hợp với:
- Existing VIB infrastructure (Python/FastAPI đã được dùng)
- Team capability hiện tại
- `compliance: banking_grade`, `launch_target: internal_only`
- Không có mobile, không cần Kafka trong v1

## Decision

Giữ nguyên tech stack đã được khai báo trong `project-profile.yaml` và align với Release Notes v3.0.0:

| Layer | Technology | Version | Lý do |
|-------|-----------|---------|-------|
| Backend Framework | FastAPI | 0.115.5+ | Async-native, type-safe, OpenAPI tự động |
| ASGI Server | Uvicorn | 0.32.1+ | Standard cho FastAPI |
| Database Driver | asyncpg | 0.30.0+ | Async PostgreSQL, hiệu năng cao |
| Data Validation | Pydantic v2 | 2.10.3+ | Strict validation, type-safe models |
| HTTP Client (inter-service) | httpx | 0.28.1+ | Async HTTP cho service-to-service calls |
| Frontend Framework | React + TypeScript | 18.3+ / 5.4+ | SPA, type-safe |
| Build Tool | Vite | 5.2+ | Fast HMR, proxy built-in |
| State Management | Zustand | 4.5+ | Lightweight, đủ dùng cho 3-service SPA |
| Database | PostgreSQL | 15+ | Relational, ACID, audit-friendly |
| Runtime | Python 3.12+, Node.js 20+ | — | LTS versions |

**Service ports (cố định):**
- PPG System: `:8001`
- BA Workflow: `:8002`
- Test Platform: `:8003`
- Frontend SPA: `:5173` (dev), `:80` (prod)

## Consequences

- Tất cả backend dùng chung pattern: `app/main.py`, `app/models/`, `app/routers/`, `app/services/`
- Database: 1 PostgreSQL instance, 1 schema `devops_hub`, mỗi service có prefix bảng riêng (`ppg_`, `ba_`, `test_`)
- Frontend proxy `/api/ppg` → `:8001`, `/api/ba` → `:8002`, `/api/test` → `:8003`
- Không có Kafka trong v1 — inter-service communication là HTTP direct call (background task)
- Nếu sync thất bại → log lỗi, không rollback transaction chính

## Parallel impact
Không có module nào đang làm song song.
