# API Contract Draft v2 — 4 Modules Mới (BRD-001 v1.1)
**API-CONTRACT-ID:** API-DRAFT-V2
**Version:** 2.0
**Date:** 2026-04-10
**Author:** Solutions Architect
**Target:** Backend Dev (Agent 06)
**BRD Reference:** BRD-001 v1.1 (FR-019 → FR-032)
**ADR References:** ADR-001 (tech stack), ADR-003 (JWT auth), ADR-004 (object schema), ADR-005 (document storage)
**Schema Reference:** docs/arch/schema-draft-v2.md

---

## Conventions chung

- Tất cả endpoints yêu cầu `Authorization: Bearer <JWT>` trừ `/health` và `/auth/login`
- Response format: `{"data": ..., "meta": {...}}` cho list; `{"data": {...}}` cho single
- Error format: `{"error": {"code": "ERR_CODE", "message": "...", "details": {...}}}`
- Pagination: `?page=1&size=20` — default size 20, max 100
- Audit: mọi POST/PUT/PATCH/DELETE phải ghi `ppg_audit_log` với user từ JWT
- Soft delete: DELETE endpoints không xóa vật lý — set `deleted_at` hoặc status change
- Datetime: ISO 8601 UTC, ví dụ `"2026-04-10T08:00:00Z"`

---

## Service: PPG System (:8001)

### Annual Plan — `/api/v1/annual-plans`

#### `GET /api/v1/annual-plans`
Lấy danh sách kế hoạch năm.

**Query params:**
| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| year | integer | No | Filter theo năm |
| status | string | No | Filter: draft, active, closed |
| page | integer | No | Default 1 |
| size | integer | No | Default 20 |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Kế hoạch IT năm 2026",
      "year": 2026,
      "description": "...",
      "status": "active",
      "objectives_count": 5,
      "dod_completion_pct": 40.0,
      "projects_count": 8,
      "created_at": "2026-01-01T00:00:00Z",
      "created_by": "admin"
    }
  ],
  "meta": {"total": 3, "page": 1, "size": 20}
}
```

#### `POST /api/v1/annual-plans`
Tạo kế hoạch năm mới.

**Request body:**
```json
{
  "name": "Kế hoạch IT năm 2026",
  "year": 2026,
  "description": "Kế hoạch chuyển đổi số",
  "objectives": [
    {"title": "Triển khai 5 ứng dụng mới", "description": "...", "sort_order": 1}
  ],
  "dod_items": [
    {"criterion": "Đạt test coverage ≥ 80%", "weight": 30.0},
    {"criterion": "Hoàn thành tài liệu BA cho tất cả dự án", "weight": 20.0}
  ]
}
```
Validation: ít nhất 1 objective (FR-019).

**Response 201:** Annual plan object đầy đủ.

**Errors:**
- `400 BAD_REQUEST` — thiếu objectives
- `422 VALIDATION_ERROR` — year ngoài range

#### `GET /api/v1/annual-plans/{plan_id}`
Chi tiết 1 kế hoạch năm, bao gồm objectives, dod_items, và danh sách projects gắn.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "...",
    "year": 2026,
    "status": "active",
    "objectives": [...],
    "dod_items": [
      {"id": "uuid", "criterion": "...", "weight": 30.0, "is_achieved": false}
    ],
    "projects": [
      {"project_id": "uuid", "name": "Dự án A", "status": "active", "linked_at": "..."}
    ],
    "dod_completion_pct": 40.0
  }
}
```

#### `PUT /api/v1/annual-plans/{plan_id}`
Cập nhật metadata kế hoạch (name, description). Không thay đổi status qua endpoint này.

#### `DELETE /api/v1/annual-plans/{plan_id}`
Soft delete — chỉ cho phép khi status = 'draft'. Active/closed không xóa được.

**Errors:**
- `409 CONFLICT` — plan đang active hoặc closed

#### `POST /api/v1/annual-plans/{plan_id}/status`
Chuyển trạng thái: draft → active → closed.

**Request body:**
```json
{"action": "activate"}   // hoặc "close"
```

**State machine:**
```
draft  → [activate] → active
active → [close]    → closed
```

**BR-010 validation (close):** Query `ppg_projects` via `ppg_plan_project_links` — nếu còn project.status IN ('active') → 409.
**BR-009 note:** Không chuyển draft→active nếu không có ít nhất 1 project link (warning, không block).

**Response 200:** Plan object với status mới.

#### `GET /api/v1/annual-plans/{plan_id}/dod-items`
Danh sách DoD items với % completion.

#### `PUT /api/v1/annual-plans/{plan_id}/dod-items/{item_id}`
Cập nhật trạng thái DoD item.
```json
{"is_achieved": true, "notes": "Đã đạt sau Sprint 5"}
```
Mọi thay đổi `is_achieved` phải ghi `ppg_audit_log`.

#### `GET /api/v1/annual-plans/{plan_id}/projects`
Danh sách projects gắn với plan (chỉ active links).

#### `POST /api/v1/annual-plans/{plan_id}/projects`
Gắn project vào plan.
```json
{"project_id": "uuid"}
```
**BR-009:** Validate plan.status = 'active'. Ghi audit log.

#### `DELETE /api/v1/annual-plans/{plan_id}/projects/{project_id}`
Bỏ liên kết (set `unlinked_at`, không xóa record). Ghi audit log.

---

### Project Objects — `/api/v1/projects/{project_id}/objects`

#### `GET /api/v1/projects/{project_id}/objects`
Danh sách objects của dự án.

**Query params:**
| Param | Type | Mô tả |
|-------|------|-------|
| object_type | string | Filter: web_app, mobile_app, api, elt |
| status | string | Filter: active, deprecated, decommissioned |
| q | string | Search theo name hoặc code |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "object_type": "api",
      "name": "Customer API",
      "code": "CUSTOMER_API",
      "status": "active",
      "owner": "team-platform",
      "standard_info": {
        "base_url": "https://api.vib.com.vn/customers",
        "auth_method": "JWT",
        "version": "v2"
      },
      "created_at": "...",
      "created_by": "john.doe"
    }
  ],
  "meta": {"total": 5, "page": 1, "size": 20}
}
```

#### `POST /api/v1/projects/{project_id}/objects`
Tạo object mới. Validate `standard_info` theo `object_type` (ADR-004).

**Request body:**
```json
{
  "object_type": "api",
  "name": "Customer API",
  "code": "CUSTOMER_API",
  "description": "...",
  "owner": "team-platform",
  "standard_info": {
    "base_url": "https://api.vib.com.vn/customers",
    "auth_method": "JWT",
    "version": "v2",
    "protocol": "REST"
  }
}
```

**Validation:**
- `code`: uppercase, A-Z 0-9 underscore, unique per project → 409 nếu trùng
- `standard_info`: Pydantic discriminated union theo `object_type` — thiếu required field → 422 (BR-011)

**Response 201:** Object đầy đủ.

#### `GET /api/v1/projects/{project_id}/objects/{object_id}`
Chi tiết object kèm thống kê: số ba_docs gắn, số test_cases.

#### `PUT /api/v1/projects/{project_id}/objects/{object_id}`
Cập nhật object. `object_type` và `code` không được đổi sau khi tạo.

#### `DELETE /api/v1/projects/{project_id}/objects/{object_id}`
Soft delete — set status = 'decommissioned'. Cần check: nếu object có active BA docs hoặc test cases → 409 warning.

#### `GET /api/v1/projects/{project_id}/objects/{object_id}/connections`
Kết nối in và out của object.

**Response 200:**
```json
{
  "data": {
    "outbound": [
      {
        "connection_id": "uuid",
        "target_object": {"id": "uuid", "name": "Payment Gateway", "project": "Dự án thanh toán"},
        "connection_type": "api_call",
        "protocol": "REST",
        "frequency": "real-time"
      }
    ],
    "inbound": [...]
  }
}
```

#### `POST /api/v1/projects/{project_id}/objects/{object_id}/connections`
Tạo kết nối từ object này sang object khác (có thể khác project).

```json
{
  "target_object_id": "uuid",
  "connection_type": "api_call",
  "protocol": "REST",
  "frequency": "real-time",
  "description": "..."
}
```

**Validation:** `target_object_id` phải là UUID hợp lệ trong `ppg_project_objects`. Self-loop không được phép.

#### `DELETE /api/v1/projects/{project_id}/objects/{object_id}/connections/{conn_id}`
Soft delete connection — set status = 'removed'.

---

### Export/Import Objects

#### `GET /api/v1/projects/{project_id}/objects/export`
Export danh sách objects ra Excel.

**Query params:**
| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| object_type | string | YES | Chỉ export 1 type mỗi lần (BR-012 — template cố định per type) |

**Response:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
Headers: `Content-Disposition: attachment; filename="web_app_export_2026-04-10.xlsx"`

**Template columns per type** (cố định — không customizable, BR-012):
- web_app: `name, code, description, owner, status, tech_stack, version, url_dev, url_staging, url_uat, url_prod, deployment_type, notes`
- mobile_app: `name, code, description, owner, status, platform, version, store_link_ios, store_link_android, tech_stack, min_os_version, notes`
- api: `name, code, description, owner, status, base_url, auth_method, version, protocol, url_dev, url_uat, swagger_url, notes`
- elt: `name, code, description, owner, status, source_system, target_system, schedule, technology, data_format, volume_estimate, sla_minutes, notes`

#### `POST /api/v1/projects/{project_id}/objects/import`
Import từ Excel file.

**Request:** `multipart/form-data`
- `file`: Excel file
- `object_type`: string (web_app / mobile_app / api / elt)
- `conflict_strategy`: `ask` (default) | `overwrite` | `skip`

**Processing:**
1. Parse Excel → validate từng row theo type schema
2. Check conflict: `(project_id, code)` unique
3. Nếu conflict và `conflict_strategy=ask` → trả về 409 với list conflicting codes
4. Nếu `conflict_strategy=overwrite` → upsert
5. Nếu `conflict_strategy=skip` → skip conflicting rows

**Response 200 (no conflict / skip/overwrite):**
```json
{
  "data": {
    "created": 5,
    "updated": 2,
    "skipped": 1,
    "errors": [{"row": 4, "error": "tech_stack is required for web_app"}]
  }
}
```

**Response 409 (conflict, ask mode):**
```json
{
  "error": {
    "code": "IMPORT_CONFLICT",
    "message": "Tìm thấy đối tượng trùng tên. Vui lòng xác nhận.",
    "details": {
      "conflicting_codes": ["CUSTOMER_API", "PAYMENT_API"],
      "hint": "Gửi lại với conflict_strategy=overwrite hoặc conflict_strategy=skip"
    }
  }
}
```

---

### Cross-project Connection Report

#### `GET /api/v1/reports/connections`
Tra cứu tất cả kết nối đến/từ một ứng dụng trên toàn platform (FR-026).

**Query params:**
| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| object_name | string | One of three | Search theo tên object |
| object_id | UUID | One of three | Search theo ID chính xác |
| project_id | UUID | No | Giới hạn trong 1 dự án |
| direction | string | No | `in`, `out`, `both` (default both) |
| status | string | No | Filter connection status |

**Response 200:**
```json
{
  "data": {
    "query_object": {
      "id": "uuid",
      "name": "Core Banking API",
      "project": {"id": "uuid", "name": "Core Banking Project"}
    },
    "outbound_connections": [
      {
        "connection_id": "uuid",
        "target": {
          "id": "uuid",
          "name": "Mobile Banking App",
          "object_type": "mobile_app",
          "project": {"id": "uuid", "name": "Mobile Banking Project"}
        },
        "connection_type": "api_call",
        "protocol": "REST",
        "status": "active"
      }
    ],
    "inbound_connections": [...],
    "total_outbound": 3,
    "total_inbound": 7
  }
}
```

#### `GET /api/v1/reports/annual-plan-summary/{plan_id}`
Dashboard tổng hợp kế hoạch năm (FR-022).

**Response 200:**
```json
{
  "data": {
    "plan": {"id": "uuid", "name": "...", "year": 2026, "status": "active"},
    "dod_completion_pct": 40.0,
    "projects_by_status": {
      "active": 5,
      "on_hold": 1,
      "completed": 2,
      "archived": 0
    },
    "projects": [
      {
        "id": "uuid",
        "name": "Dự án A",
        "status": "active",
        "milestone_progress": "5/9",
        "ba_docs_approved": 3,
        "test_coverage_pct": 72.5
      }
    ]
  }
}
```

---

## Service: BA Workflow (:8002)

### BA Documents — `/api/v1/documents` (mở rộng v1.1)

#### `POST /api/v1/documents`
Tạo tài liệu BA — mở rộng so với v1: thêm `doc_type` mới và `object_ids`.

**Request body:**
```json
{
  "project_id": "uuid",
  "doc_type": "FSD",
  "title": "Functional Specification — Customer Module",
  "content": "...",
  "milestone_id": "uuid",
  "object_ids": ["uuid-web-app-1", "uuid-api-1"],
  "metadata": {
    "format": "markdown"
  }
}
```

**Supported doc_type v1.1:** `BRD, BRS, FSD, API_SPEC, ERD, DATA_DICT, WIREFRAME, PROCESS_FLOW`

**Validation:**
- `object_ids`: mỗi UUID phải tồn tại trong `ppg_project_objects` và thuộc cùng `project_id`
- BR-011: object phải có `status = active` mới được gắn tài liệu

#### `GET /api/v1/documents`
Lấy danh sách tài liệu.

**Query params thêm v1.1:**
| Param | Type | Mô tả |
|-------|------|-------|
| object_id | UUID | Filter tài liệu gắn với object cụ thể (FR-027) |
| doc_type | string | Filter theo loại |
| milestone_id | UUID | Filter theo milestone |

#### `POST /api/v1/documents/{doc_id}/objects`
Gắn tài liệu với object bổ sung.
```json
{"object_id": "uuid"}
```

#### `DELETE /api/v1/documents/{doc_id}/objects/{object_id}`
Bỏ liên kết — không xóa tài liệu (FR-027).

#### `GET /api/v1/documents/{doc_id}/objects`
Danh sách objects gắn với tài liệu này.

### BA Document Files

#### `POST /api/v1/documents/{doc_id}/files`
Upload file attachment (ADR-005).

**Request:** `multipart/form-data`
- `file`: file binary
- `source`: `upload` (default)

**Validation:**
- MIME type whitelist (ADR-005)
- Max size theo loại
- Virus scan placeholder (banking_grade — implement tại infra level)

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "file_name": "BRS_Customer_v1.pdf",
    "mime_type": "application/pdf",
    "file_size_bytes": 204800,
    "checksum_sha256": "abc123...",
    "version": 1,
    "created_at": "..."
  }
}
```

#### `POST /api/v1/documents/{doc_id}/files/copy-from-url`
Copy file từ URL về storage nội bộ (BR-007).
```json
{"url": "https://internal-sharepoint/file.pdf", "file_name": "BRS_Customer.pdf"}
```

#### `GET /api/v1/documents/{doc_id}/files`
Danh sách files (chỉ current version).

#### `GET /api/v1/documents/{doc_id}/files/{file_id}/download`
Download file. JWT required + ownership check. Ghi audit log với action `DOWNLOAD`.

**Response:** Stream binary với `Content-Disposition: attachment`.

---

## Service: Test Platform (:8003)

### Test Documents — `/api/v1/test-documents`

#### `POST /api/v1/test-documents`
Tạo tài liệu test (Test Plan, Bug Report, UAT Sign-off).

**Request body:**
```json
{
  "project_id": "uuid",
  "doc_type": "BUG_REPORT",
  "title": "Bug: Login timeout không hiển thị message",
  "content": "...",
  "object_id": "uuid",
  "milestone_id": "uuid",
  "metadata": {
    "severity": "high",
    "component": "authentication"
  }
}
```

**Supported doc_type:** `TEST_PLAN, BUG_REPORT, UAT_SIGNOFF`

**State machine per type:**
```
TEST_PLAN:   draft → review → approved → archived
BUG_REPORT:  open → in_progress → resolved → closed
UAT_SIGNOFF: draft → pending_sign → signed → archived
```

#### `POST /api/v1/test-documents/{doc_id}/status`
Chuyển trạng thái theo state machine của loại tài liệu.
```json
{"action": "resolve", "notes": "Fixed in commit abc123"}
```

**UAT_SIGNOFF specific:** action `sign` yêu cầu thêm:
```json
{"action": "sign", "approver": "pham.van.a", "sign_date": "2026-04-10"}
```
Thông tin này ghi vào `metadata.approver` và `metadata.sign_date`.

#### `GET /api/v1/test-documents`
**Query params:**
| Param | Type | Mô tả |
|-------|------|-------|
| object_id | UUID | Filter theo object (FR-030) |
| doc_type | string | Filter theo loại |
| status | string | Filter theo trạng thái |
| milestone_id | UUID | Filter theo milestone |
| severity | string | Chỉ cho BUG_REPORT: critical, high, medium, low |

### Test Case Object Links

#### `GET /api/v1/test-cases/{test_case_id}/objects`
Danh sách objects gắn với test case (kế thừa từ BRS).

**Response 200:**
```json
{
  "data": [
    {
      "object_id": "uuid",
      "name": "Customer Portal",
      "object_type": "web_app",
      "inherited_from_brs": true,
      "project": {"id": "uuid", "name": "Customer Project"}
    }
  ]
}
```

#### `GET /api/v1/objects/{object_id}/test-cases`
Tất cả test cases gắn với object cụ thể (FR-030).

**Query params:** `status`, `page`, `size`

#### `GET /api/v1/objects/{object_id}/test-coverage`
Coverage summary theo object (phục vụ FR-031).

**Response 200:**
```json
{
  "data": {
    "object_id": "uuid",
    "object_name": "Customer Portal",
    "total_test_cases": 45,
    "executed": 32,
    "passed": 28,
    "failed": 4,
    "coverage_pct": 62.2,
    "milestone_coverage": [
      {
        "milestone_id": "uuid",
        "milestone_name": "SIT",
        "coverage_pct": 62.2,
        "threshold_pct": 80.0,
        "is_below_threshold": true,
        "alert": "Coverage 62.2% dưới ngưỡng 80% cho milestone SIT"
      }
    ]
  }
}
```

### Auto-link khi BRS Approved (Internal — Service Logic)

Khi BA service gọi `POST /brs` (internal sync), Test Platform cần:

```python
# Trong test_generator.py — sau khi sinh test cases từ BRS
# 1. Lấy object_ids từ BRS (ba_document_object_links)
# 2. Tạo test_case_object_links cho mỗi test case × mỗi object
#    với inherited_from_brs = True
# BR-014: nếu BRS gắn với 3 objects → mỗi test case từ BRS đó gắn 3 links
```

### Test Document Files

#### `POST /api/v1/test-documents/{doc_id}/files`
Upload file cho test document (Bug Report screenshot, UAT evidence, v.v.).
Spec tương tự BA Document Files.

#### `GET /api/v1/test-documents/{doc_id}/files/{file_id}/download`
Download với JWT auth + audit log.

---

## Error Codes chuẩn hóa

| Code | HTTP Status | Mô tả |
|------|------------|-------|
| `UNAUTHORIZED` | 401 | Missing hoặc invalid JWT |
| `FORBIDDEN` | 403 | JWT valid nhưng không có quyền (v2) |
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `VALIDATION_ERROR` | 422 | Input không hợp lệ (Pydantic) |
| `CONFLICT` | 409 | Duplicate key hoặc state machine violation |
| `IMPORT_CONFLICT` | 409 | Import file có record trùng (BR-013) |
| `PLAN_NOT_ACTIVE` | 409 | Thêm project vào plan không active (BR-009) |
| `ACTIVE_PROJECTS_EXIST` | 409 | Close plan khi còn dự án active (BR-010) |
| `OBJECT_INCOMPLETE` | 422 | Object thiếu required fields (BR-011) |
| `STATE_MACHINE_VIOLATION` | 409 | Chuyển trạng thái không hợp lệ |
| `FILE_TYPE_NOT_ALLOWED` | 415 | MIME type không trong whitelist |
| `FILE_TOO_LARGE` | 413 | Vượt giới hạn kích thước file |
| `INTERNAL_ERROR` | 500 | Lỗi hệ thống |

---

## Implementation Notes cho Backend Dev (Agent 06)

### 1. Pydantic Discriminated Union cho Object Type
```python
from typing import Annotated, Literal, Union
from pydantic import BaseModel, Field

class WebAppInfo(BaseModel):
    object_type: Literal["web_app"]
    tech_stack: str
    version: str
    url_dev: str | None = None
    # ... (xem ADR-004 cho full schema)

class ApiInfo(BaseModel):
    object_type: Literal["api"]
    base_url: str
    auth_method: Literal["JWT","OAuth2","API_Key","Basic","None"]
    version: str
    # ...

ObjectInfo = Annotated[
    Union[WebAppInfo, MobileAppInfo, ApiInfo, EltInfo],
    Field(discriminator="object_type")
]
```

### 2. Audit Log Helper
```python
# services/audit_service.py
async def log_audit(
    db: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    action: str,
    changed_by: str,
    old_values: dict | None = None,
    new_values: dict | None = None,
    request: Request | None = None
) -> None:
    # Gọi sau mỗi write operation
    # action: CREATE | UPDATE | DELETE | STATUS_CHANGE | LINK | UNLINK | UPLOAD | DOWNLOAD
```

### 3. File Storage Service Interface
```python
# services/file_storage.py
class FileStorageService:
    async def save(self, content: bytes, path: str) -> str: ...
    async def read(self, path: str) -> bytes: ...
    async def delete(self, path: str) -> None: ...
    async def compute_checksum(self, content: bytes) -> str: ...
```

### 4. BR-010 Validation Example
```python
# Trước khi close annual plan
async def close_annual_plan(plan_id: UUID, db: AsyncSession):
    active_projects = await db.execute(
        select(func.count()).where(
            and_(
                ppg_plan_project_links.plan_id == plan_id,
                ppg_plan_project_links.unlinked_at.is_(None),
                ppg_projects.status == 'active'
            )
        ).join(ppg_projects)
    )
    if active_projects.scalar() > 0:
        raise HTTPException(
            status_code=409,
            detail={"code": "ACTIVE_PROJECTS_EXIST", "message": "..."}
        )
```

---

*API Contract Draft v2 — Agent 06 (Backend Dev) | Solutions Architect | 2026-04-10 | BRD-001 v1.1*
