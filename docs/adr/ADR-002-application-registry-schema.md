# ADR-002 — Application Registry Schema
**ADR-ID:** ADR-002
**Status:** Accepted
**Date:** 2026-04-09
**Author:** Solutions Architect
**BRD Reference:** BRD-001 (FR-003, BR-006)
**Resolves:** REQUEST-ARCH-001

---

## Context

BRD-001 FR-003 yêu cầu khai báo các đối tượng quản lý của dự án theo **schema chuẩn bắt buộc** để giải quyết pain point "thông tin ứng dụng chưa có tiêu chuẩn". Cần define 4 loại object và schema của từng loại.

## Decision

### Object Types

4 loại object trong Application Registry:

| Type | Enum value | Mô tả |
|------|-----------|-------|
| Application | `application` | Ứng dụng/phần mềm end-user |
| System | `system` | Hệ thống backend/platform/infrastructure |
| Job | `job` | Batch job, scheduled task, ETL job |
| Connection | `connection` | API endpoint, ETL pipeline, integration point |

### Schema chung (tất cả 4 loại)

```python
class AppRegistryObject(BaseModel):
    id: UUID                        # auto-generated
    project_id: UUID                # FK → projects.id (required)
    object_type: Literal["application", "system", "job", "connection"]  # required
    name: str                       # required, max 200 chars
    code: str                       # required, unique per project, uppercase, no spaces (ví dụ: "CRM", "PAYROLL_JOB")
    description: str | None         # optional
    owner_team: str | None          # optional — team/department sở hữu
    status: Literal["active", "inactive", "deprecated"] = "active"  # required, default active
    environment: list[str] = []     # ["DEV", "SIT", "UAT", "PROD"]
    created_at: datetime            # auto
    updated_at: datetime            # auto
    created_by: str                 # required — username
    extra: dict = {}                # type-specific fields (xem bên dưới)
```

### Type-specific fields (trong `extra`)

**application:**
```python
extra = {
    "tech_stack": str | None,       # "React + FastAPI", "SAP", v.v.
    "url_prod": str | None,         # URL production
    "url_uat": str | None,
    "deployment_type": str | None,  # "on-premise" | "cloud" | "hybrid"
}
```

**system:**
```python
extra = {
    "system_type": str | None,      # "database" | "middleware" | "platform" | "infra"
    "vendor": str | None,
    "version": str | None,
}
```

**job:**
```python
extra = {
    "schedule": str | None,         # cron expression hoặc mô tả: "daily 2AM"
    "job_type": str | None,         # "batch" | "etl" | "report" | "cleanup"
    "source_system": str | None,
    "target_system": str | None,
}
```

**connection:**
```python
extra = {
    "connection_type": str | None,  # "api" | "etl" | "db_link" | "file_transfer"
    "source": str | None,           # tên hệ thống nguồn
    "target": str | None,           # tên hệ thống đích
    "protocol": str | None,         # "REST" | "SOAP" | "JDBC" | "SFTP"
    "frequency": str | None,        # "real-time" | "daily" | "on-demand"
}
```

### DB Table: `ppg_app_registry`

```sql
CREATE TABLE ppg_app_registry (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES ppg_projects(id) ON DELETE CASCADE,
    object_type VARCHAR(20) NOT NULL CHECK (object_type IN ('application','system','job','connection')),
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(50) NOT NULL,
    description TEXT,
    owner_team  VARCHAR(100),
    status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','deprecated')),
    environment JSONB NOT NULL DEFAULT '[]',
    extra       JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(100) NOT NULL,
    UNIQUE (project_id, code)
);
```

### Validation rules (bắt buộc enforce ở API layer)

- `code`: uppercase, chỉ A-Z, 0-9, underscore. Unique trong cùng project.
- `name`: không được để trống, không được trùng tên trong cùng project + cùng type
- `object_type`: chỉ nhận 4 giá trị enum
- `environment`: chỉ nhận giá trị trong `["DEV", "SIT", "UAT", "PROD", "STAGING"]`

## Consequences

- PPG Service (`:8001`) sở hữu toàn bộ Application Registry API
- `extra` field dùng JSONB — flexible cho type-specific data mà không cần alter table
- Dev cần implement validation ở Pydantic model layer, không chỉ DB constraint
- BA cần hướng dẫn user điền đúng `code` convention khi onboard
