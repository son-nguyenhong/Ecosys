# Signal — Architect → Dev (URGENT)
**Request-ID:** REQUEST-DEV-001-URGENT
**Từ:** Architect
**Đến:** Backend Dev (Agent 06) + Frontend Dev (Agent 05) + DBA (Agent 07)
**Liên quan đến:** BRD-001, ADR-001, ADR-002, ADR-003, ARCH-001
**Ngày tạo:** 2026-04-09
**Priority:** URGENT
**Status:** OPEN

## Architecture Ready — Dev có thể bắt đầu

Tất cả ADR và architecture docs đã sẵn sàng. Đọc trước khi code:

| File | Nội dung | Bắt buộc đọc |
|------|---------|-------------|
| docs/adr/ADR-001-tech-stack.md | Tech stack, service ports, DB naming | Tất cả |
| docs/adr/ADR-002-application-registry-schema.md | Schema Application Registry, DB table `ppg_app_registry` | Backend + DBA |
| docs/adr/ADR-003-authentication.md | JWT auth, DB table `ppg_users`, auth flow | Backend |
| docs/arch/architecture-001-devops-ecosystem.md | Project structure, full DB schema, API contracts, implementation order | Tất cả |

## Implementation Order bắt buộc

```
Phase 1 — DBA + Auth (làm TRƯỚC, mọi thứ phụ thuộc vào đây):
  DBA (07)  → infra/init.sql: tất cả CREATE TABLE
  Backend   → auth middleware: JWT verify cho cả 3 services

Phase 2 — Core business logic (sau Phase 1 xong)
Phase 3 — Features + Sync pipeline
Phase 4 — Polish
```

**Chi tiết trong ARCH-001 section 6.**

## Code ownership — không overlap

| Agent | Files được phép tạo/sửa |
|-------|------------------------|
| Agent 07 (DBA) | `infra/init.sql` |
| Agent 06 (Backend) | `backend/ppg/app/`, `backend/ba-workflow/app/`, `backend/test-platform/app/` |
| Agent 05 (Frontend) | `frontend/src/` |

## Critical decisions cần implement đúng

1. **JWT_SECRET** — dùng chung 1 env var cho cả 3 services (tránh 401 cross-service)
2. **State machine** — BA document: draft→review→approved→archived, KHÔNG restrict theo role
3. **BRS auto-gen trigger** — chỉ khi doc_type='BRS' được approve, không trigger với BRD/ERD/API
4. **Sync failure** — log vào `ppg_sync_log`, KHÔNG rollback document transition
5. **Application Registry code** — UNIQUE per project, uppercase, A-Z/0-9/underscore only

## Status

Resolved: Không — đây là signal, Dev đọc và bắt đầu implement.
