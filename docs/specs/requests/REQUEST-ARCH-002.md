# Request — BA → Architect / Tech Lead
**Request-ID:** REQUEST-ARCH-002
**Từ:** BA Team
**Đến:** Architect / Tech Lead
**BRD liên quan:** BRD-001 (FR-018)
**Ngày tạo:** 2026-04-09
**Cần trả lời trước:** Trước Stage 1.4 Dev
**Priority:** NORMAL
**Status:** RESOLVED

## Câu hỏi / Yêu cầu

Xác định cơ chế **Basic Authentication** cho platform:

Option A: Username/password lưu trong DB nội bộ (users table trong devops_hub)
Option B: Tích hợp VIB LDAP / Active Directory
Option C: VIB SSO (OAuth2/OIDC) — phức tạp hơn nhưng aligned với VIB standard

## Context

BRD-001 scope là "Basic Authentication" — đủ để bảo vệ internal platform, không cần RBAC đầy đủ. Tuy nhiên cơ chế kỹ thuật ảnh hưởng đến:
- DB schema (có cần bảng users không?)
- Token/session management
- Dev effort (Option A đơn giản nhất, Option C phức tạp nhất)
- Compliance banking_grade yêu cầu gì tối thiểu?

## Impact nếu không có câu trả lời

[x] Bị block hoàn toàn — FR-018 không implement được nếu chưa chọn cơ chế

## Assumption tạm thời

Tạm thời assume **Option A (DB-based)** để không block Dev. Nếu Architect chọn option khác thì cần báo sớm để Dev refactor.

---
**Resolved:** 2026-04-09 — Chọn Option A (DB-based JWT). Chi tiết trong ADR-003 (docs/adr/ADR-003-authentication.md). JWT shared secret qua env var `JWT_SECRET`. PPG là auth provider.
