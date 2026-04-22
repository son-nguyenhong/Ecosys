# ADR-004 — Object Type Schema Strategy (Web App / Mobile App / API / ELT)
**ADR-ID:** ADR-004
**Status:** Accepted
**Date:** 2026-04-10
**Author:** Solutions Architect
**BRD Reference:** BRD-001 v1.1 (FR-023, FR-024, FR-025, OQ-004, OQ-005)
**Resolves:** OQ-004, OQ-005

---

## Context

BRD-001 v1.1 yêu cầu khai báo 4 loại đối tượng mới với khung thông tin chuẩn per type:

| Object Type | FR | Trường đặc thù |
|-------------|-----|----------------|
| Web App     | FR-023 | tech_stack, URL per env, version |
| Mobile App  | FR-023 | platform (iOS/Android), store link, version |
| API         | FR-024 | base_url, auth_method, endpoints list |
| ELT         | FR-025 | source, target, schedule, technology |

Đây là phần mở rộng của `ppg_app_registry` (ADR-002 — đã accepted). 4 loại trong ADR-002 (`application`, `system`, `job`, `connection`) là **classification type** ở tầng registry. 4 loại mới trong v1.1 (`web_app`, `mobile_app`, `api`, `elt`) là **object type** ở tầng project object — phục vụ gắn tài liệu BA và test case, có export/import template chuẩn và cross-project connection report.

**3 options kiến trúc được đánh giá:**

### Option A — JSONB flexible (extend ADR-002 pattern)
Dùng bảng `project_objects` duy nhất với cột `object_type` (enum) và `standard_info JSONB` chứa toàn bộ trường type-specific.

| Ưu điểm | Nhược điểm |
|---------|-----------|
| Không cần migration khi thêm trường | Không có DB-level constraint cho trường bắt buộc |
| Query đơn giản, 1 bảng | Schema enforcement phải ở API layer (Pydantic) |
| Dễ export/import JSON | Index JSONB chậm hơn typed column với large dataset |
| Align với pattern `extra` của ADR-002 | Khó readable khi debug trực tiếp DB |

### Option B — Typed columns trên bảng chung
Bảng `project_objects` với tất cả columns của 4 types, dùng nullable cho trường không áp dụng.

| Ưu điểm | Nhược điểm |
|---------|-----------|
| DB-level constraint rõ ràng | Bảng có quá nhiều nullable column (sparse table) |
| Query/index nhanh | Migration mỗi khi thêm type hoặc field mới |
| Schema tự documenting | Không scale nếu số type tăng |

### Option C — Separate tables per type
Bảng `project_objects` cho common fields + 4 bảng con: `project_objects_web_app`, `project_objects_mobile_app`, `project_objects_api`, `project_objects_elt`.

| Ưu điểm | Nhược điểm |
|---------|-----------|
| DB-level NOT NULL constraint per type | 5 bảng, JOIN phức tạp |
| Schema chặt nhất | Cross-type query cần UNION hoặc view |
| Dễ add column per type | Overhead migration cao hơn |

---

## Decision

**Chọn Option A — JSONB flexible** với typed Pydantic models ở API layer.

**Lý do:**

1. **Consistency với ADR-002:** ADR-002 đã chọn JSONB (`extra` field) cho type-specific data — giữ pattern nhất quán.
2. **Schema enforcement ở đúng layer:** Banking-grade enforcement qua Pydantic v2 discriminated unions — strict validation tại API boundary, không phụ thuộc vào DB constraints nullable.
3. **Export/import flexibility:** `standard_info` JSONB có thể serialize/deserialize trực tiếp sang Excel template theo type mà không cần complex JOIN.
4. **Cross-project query:** Bảng đơn giúp `FR-026` query join 1 bảng thay vì UNION 4 bảng.
5. **Additive migration policy:** Thêm field mới không cần ALTER TABLE — chỉ update Pydantic schema và migration additive.

**Schema quyết định:**

### Bảng `ppg_project_objects`

```sql
CREATE TABLE ppg_project_objects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES ppg_projects(id) ON DELETE CASCADE,
    object_type     VARCHAR(20) NOT NULL
                    CHECK (object_type IN ('web_app','mobile_app','api','elt')),
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(50) NOT NULL,
    description     TEXT,
    owner           VARCHAR(100),                    -- team/cá nhân sở hữu
    status          VARCHAR(30) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','deprecated','decommissioned')),
    standard_info   JSONB NOT NULL DEFAULT '{}',     -- type-specific fields
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL,
    updated_by      VARCHAR(100),
    UNIQUE (project_id, code)
);

CREATE INDEX idx_project_objects_project_id ON ppg_project_objects(project_id);
CREATE INDEX idx_project_objects_type ON ppg_project_objects(object_type);
CREATE INDEX idx_project_objects_status ON ppg_project_objects(status);
CREATE INDEX idx_project_objects_standard_info ON ppg_project_objects USING GIN(standard_info);
```

### `standard_info` schema per type (enforced tại Pydantic layer)

**web_app:**
```python
class WebAppInfo(BaseModel):
    # Required fields
    tech_stack:     str                        # "React + FastAPI", "SAP", v.v.
    version:        str                        # "1.0.0"
    # Optional fields
    url_dev:        str | None = None
    url_staging:    str | None = None
    url_uat:        str | None = None
    url_prod:       str | None = None
    deployment_type: Literal["on-premise","cloud","hybrid"] | None = None
    sso_enabled:    bool = False
    notes:          str | None = None
```

**mobile_app:**
```python
class MobileAppInfo(BaseModel):
    # Required fields
    platform:       Literal["iOS","Android","cross-platform"]
    version:        str
    # Optional fields
    store_link_ios:     str | None = None
    store_link_android: str | None = None
    tech_stack:     str | None = None          # "React Native", "Flutter", "Swift"
    min_os_version: str | None = None
    notes:          str | None = None
```

**api:**
```python
class ApiInfo(BaseModel):
    # Required fields
    base_url:       str                        # base URL production hoặc placeholder
    auth_method:    Literal["JWT","OAuth2","API_Key","Basic","None"]
    version:        str                        # "v1", "2.0"
    # Optional fields
    url_dev:        str | None = None
    url_uat:        str | None = None
    protocol:       Literal["REST","SOAP","GraphQL","gRPC"] = "REST"
    endpoints:      list[dict] = []            # [{"method": "GET", "path": "/users", "desc": "..."}]
    swagger_url:    str | None = None
    notes:          str | None = None
```

**elt:**
```python
class EltInfo(BaseModel):
    # Required fields
    source_system:  str                        # tên hệ thống nguồn
    target_system:  str                        # tên hệ thống đích
    schedule:       str                        # cron hoặc mô tả: "daily 2AM", "0 2 * * *"
    # Optional fields
    technology:     str | None = None          # "Apache Spark", "SSIS", "dbt", "Python"
    data_format:    str | None = None          # "CSV", "JSON", "Parquet"
    volume_estimate: str | None = None         # "~500K rows/day"
    sla_minutes:    int | None = None          # SLA hoàn thành trong N phút
    notes:          str | None = None
```

### Export/Import template columns per type

| Type | Bắt buộc | Tùy chọn |
|------|----------|---------|
| web_app | name, code, tech_stack, version | url_dev, url_staging, url_uat, url_prod, deployment_type, description, owner, notes |
| mobile_app | name, code, platform, version | store_link_ios, store_link_android, tech_stack, min_os_version, description, owner, notes |
| api | name, code, base_url, auth_method, version | url_dev, url_uat, protocol, swagger_url, description, owner, notes |
| elt | name, code, source_system, target_system, schedule | technology, data_format, volume_estimate, sla_minutes, description, owner, notes |

**Format file export/import:** Excel (.xlsx) — dễ sử dụng cho non-technical stakeholders. Template cố định, không được tùy chỉnh cột (BR-012).

## Consequences

- `ppg_project_objects` là bảng mới — không thay thế `ppg_app_registry` (ADR-002). Hai bảng song song, phục vụ mục đích khác nhau:
  - `ppg_app_registry`: catalog khai báo toàn bộ ứng dụng/hệ thống/job/connection của tổ chức (registry)
  - `ppg_project_objects`: đối tượng output cụ thể của từng dự án (web_app/mobile_app/api/elt), phục vụ gắn BA docs và test cases
- Dev cần implement Pydantic discriminated union validator per object_type
- Export/import service cần map JSONB fields sang Excel columns theo type — không được thêm/xóa column template (BR-012)
- Import conflict handling (BR-013): kiểm tra `(project_id, code)` unique trước khi upsert, trả về 409 với danh sách conflict objects để user confirm
- GIN index trên `standard_info` phục vụ cross-project search FR-026
- Audit trail: mọi INSERT/UPDATE phải ghi vào `ppg_audit_log` (xem schema-draft-v2.md)
