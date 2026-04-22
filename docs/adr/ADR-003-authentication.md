# ADR-003 — Authentication Mechanism
**ADR-ID:** ADR-003
**Status:** Accepted
**Date:** 2026-04-09
**Author:** Solutions Architect
**BRD Reference:** BRD-001 (FR-018)
**Resolves:** REQUEST-ARCH-002

---

## Context

BRD-001 yêu cầu Basic Authentication để bảo vệ platform. 3 options đã được đánh giá:

| Option | Mô tả | Complexity | VIB-aligned |
|--------|-------|-----------|------------|
| A | Username/password lưu DB nội bộ | Thấp | Không cần |
| B | VIB LDAP / Active Directory | Trung bình | Có |
| C | VIB SSO OAuth2/OIDC | Cao | Có (VIB standard) |

## Decision

**Chọn Option A (DB-based)** cho v1 với upgrade path rõ ràng sang Option C sau.

**Lý do:**
- Scope BRD-001 là "basic authentication" — không cần phân quyền theo role
- `launch_target: internal_only` — rủi ro thấp, nội bộ VIB
- Team có thể deliver nhanh hơn
- `has_mobile: false` — không cần OAuth flow phức tạp
- Upgrade path: khi cần SSO thì replace auth module, không cần rewrite business logic

## Implementation

### Token Strategy: JWT

```python
# Shared across 3 services — mỗi service tự verify JWT
# Secret key riêng per service (lưu trong .env)

# Login endpoint: POST /auth/login (PPG service làm auth provider)
# Các service khác verify JWT từ Authorization: Bearer <token> header

JWT Payload:
{
    "sub": "username",
    "name": "Full Name",
    "exp": <timestamp>,  # 8 giờ
    "iat": <timestamp>
}
```

### DB Table: `ppg_users` (trong PPG service)

```sql
CREATE TABLE ppg_users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username     VARCHAR(50) UNIQUE NOT NULL,
    full_name    VARCHAR(200) NOT NULL,
    email        VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Auth Flow

```
Client → POST /auth/login {username, password}
PPG    → verify password (bcrypt)
PPG    → return {access_token, token_type: "bearer", expires_in: 28800}
Client → include "Authorization: Bearer <token>" in all requests
All services → verify JWT signature + expiry on every request
```

### Protected endpoints

- Tất cả endpoints (trừ `GET /health` và `POST /auth/login`) cần valid JWT
- 401 Unauthorized nếu thiếu hoặc invalid token
- Frontend: lưu token trong memory (không localStorage vì banking_grade)

## Consequences

- PPG service (`:8001`) là **auth provider** — có `POST /auth/login` endpoint
- BA (`:8002`) và Test (`:8003`) verify JWT independently — không call về PPG mỗi request
- Cùng SECRET_KEY được share qua environment variable (hoặc mỗi service dùng key riêng + public key verification)
- **Upgrade path v2:** Thay `POST /auth/login` bằng OAuth2 flow, giữ nguyên JWT format và middleware — không cần rewrite routers

## Parallel impact

Dev cần implement auth middleware trước khi implement business logic — đây là prerequisite cho tất cả endpoints.
