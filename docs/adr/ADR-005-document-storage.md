# ADR-005 — Document Storage Strategy (BA & Test Documents)
**ADR-ID:** ADR-005
**Status:** Accepted
**Date:** 2026-04-10
**Author:** Solutions Architect
**BRD Reference:** BRD-001 v1.1 (FR-027, FR-029, FR-030, FR-032)
**Resolves:** CLAUDE.md pending — "Confirm storage strategy cho converted files"

---

## Context

BRD-001 v1.1 mở rộng tài liệu BA (FR-029: BRD, BRS, FSD, API Spec, ERD, Data Dictionary, UI Wireframe, Process Flow) và tài liệu Test (FR-032: Test Plan, Test Case, Test Report, Bug Report, UAT Sign-off) với file attachments. Cần quyết định strategy lưu trữ file nội dung tài liệu.

**Constraints:**
- `compliance: banking_grade` — dữ liệu không được rời khỏi VIB network boundary
- `launch_target: internal_only` — không có public cloud access
- `has_mobile: false` — không cần CDN
- BRD OS-10: Không export/import sang Confluence/SharePoint trong v1
- NFR-007: Audit trail bắt buộc
- BR-007: File copy-from-URL phải lưu bản sao nội bộ

**3 options được đánh giá:**

### Option A — DB reference (file content lưu filesystem nội bộ, DB lưu metadata + path)
Database lưu metadata (tên, loại, kích thước, path) và content text (cho tài liệu text-based như BRS, BRD). File binary (PDF, Excel, image) lưu vào local filesystem được mount vào container.

| Ưu điểm | Nhược điểm |
|---------|-----------|
| Đơn giản, không cần infra thêm | Filesystem không HA — cần NFS/volume backup |
| Phù hợp scale hiện tại (internal tool) | Path management phức tạp khi scale |
| Content text search được (PostgreSQL full-text) | Khó migrate sang object storage sau này |
| Không phụ thuộc external service | File bị mất nếu volume không được backup |

### Option B — MinIO (S3-compatible, self-hosted)
Self-hosted object storage, S3-compatible API. Deploy như container bên cạnh services.

| Ưu điểm | Nhược điểm |
|---------|-----------|
| Trong VIB network — data residency compliant | Cần thêm container/service để manage |
| S3-compatible — dễ migrate sang AWS S3/Azure Blob sau | Overhead infra cho internal tool ở phase hiện tại |
| Có presigned URL — secure file download | Thêm dependency vào stack |
| Scale tốt, HA built-in (MinIO cluster) | Team phải học MinIO ops |

### Option C — Hybrid: DB lưu content nhỏ + filesystem cho file binary
Content text-based (BRS, BRD viết trực tiếp trên platform) lưu trong DB column (TEXT). File attachment upload (PDF, Excel, image) lưu local filesystem. DB lưu metadata và file path.

| Ưu điểm | Nhược điểm |
|---------|-----------|
| Text content: searchable, versionable, transactional | 2 storage paths cần manage |
| File binary: không bloat DB | Vẫn phụ thuộc filesystem reliability |
| Pattern rõ ràng cho 2 loại nội dung khác nhau | Moderate complexity |

---

## Decision

**Chọn Option C — Hybrid** với roadmap upgrade sang MinIO ở Phase 3+.

**Lý do:**

1. **Phù hợp 2 loại tài liệu khác nhau về bản chất:**
   - **Tài liệu authored trên platform** (BRD, BRS, FSD, Test Plan, Test Case): content là TEXT — lưu trong DB phục vụ versioning, full-text search, state machine transition có transaction safety.
   - **File attachment** (PDF upload, Excel template, Wireframe image): binary blob — lưu filesystem tránh bloat DB, streaming download efficient.

2. **Banking-grade compliance:** Cả 2 path đều nằm trong VIB infrastructure boundary. Không có gì ra ngoài.

3. **Pragmatic cho current scale:** Internal tool, không cần MinIO complexity ở v1. Upgrade path rõ ràng.

4. **Audit trail tích hợp:** DB transactions cho text content đảm bảo audit log atomic. File operations log vào `ppg_audit_log`.

**Implementation:**

### Storage path logic

```
Nếu tài liệu là "authored" (nội dung viết trực tiếp):
    → Lưu content TEXT vào ba_documents.content / test_documents.content
    → Versioning: ba_document_versions table (snapshot per save)

Nếu tài liệu là "uploaded file" (PDF, Excel, image, v.v.):
    → Lưu file vào: /data/vib-docstore/{service}/{document_id}/{version}/{filename}
    → Lưu metadata vào ba_document_files / test_document_files table
    → DB record: file_path (relative), file_size, mime_type, checksum (SHA-256)
```

### File storage directory structure

```
/data/vib-docstore/
├── ba/
│   └── {document_id}/
│       └── {version}/
│           └── {original_filename}
└── test/
    └── {document_id}/
        └── {version}/
            └── {original_filename}
```

### Bảng `ba_document_files`

```sql
CREATE TABLE ba_document_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES ba_documents(id) ON DELETE CASCADE,
    file_name       VARCHAR(500) NOT NULL,
    file_path       TEXT NOT NULL,                   -- relative path từ storage root
    mime_type       VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    is_current      BOOLEAN NOT NULL DEFAULT TRUE,
    source          VARCHAR(20) NOT NULL DEFAULT 'upload'
                    CHECK (source IN ('upload','copy_from_url')),
    source_url      TEXT,                            -- nếu copy-from-URL (BR-007)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL,
    deleted_at      TIMESTAMPTZ                      -- soft delete
);
```

### Bảng `test_document_files`

```sql
CREATE TABLE test_document_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES test_documents(id) ON DELETE CASCADE,
    file_name       VARCHAR(500) NOT NULL,
    file_path       TEXT NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    is_current      BOOLEAN NOT NULL DEFAULT TRUE,
    source          VARCHAR(20) NOT NULL DEFAULT 'upload'
                    CHECK (source IN ('upload','copy_from_url')),
    source_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      VARCHAR(100) NOT NULL,
    deleted_at      TIMESTAMPTZ
);
```

### File size limits & allowed types (banking_grade controls)

| Category | Allowed MIME types | Max size |
|----------|-------------------|---------|
| Document | application/pdf, application/vnd.openxmlformats-officedocument.* | 20 MB |
| Image | image/png, image/jpeg, image/gif | 5 MB |
| Text | text/plain, text/markdown | 2 MB |
| Spreadsheet | application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 10 MB |

Rejected types: executable files (.exe, .sh, .bat), archive with executables, scripts (.js standalone).

### Upgrade path → MinIO (Phase 3+)

Khi volume tăng hoặc cần HA storage:
1. Deploy MinIO container (hoặc MinIO cluster)
2. Replace `file_path` (local path) bằng `object_key` (S3 key)
3. Update `FileStorageService` từ local write sang MinIO SDK — không thay đổi API contract
4. Migrate existing files: script copy local → MinIO bucket, update DB paths

## Consequences

- Backend Dev cần implement `FileStorageService` với 2 adapters: `LocalFileAdapter` (v1) và `MinioFileAdapter` (future) — interface chung
- `copy-from-URL` (BR-007): download URL → save to local storage → tạo record với `source=copy_from_url`
- Deployment: Docker volume `/data/vib-docstore` phải được mount và backed up
- Security: File download endpoint phải validate JWT + ownership — không có public file URL
- Checksum SHA-256 verify khi upload và khi download — detect corruption
- Soft delete: `deleted_at` không xóa file vật lý ngay — có grace period 30 ngày trước khi cleanup job xóa
- Audit: Mọi upload/download/delete phải ghi vào `ppg_audit_log` với user, timestamp, file_id, action
