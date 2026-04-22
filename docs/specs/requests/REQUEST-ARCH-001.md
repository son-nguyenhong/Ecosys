# Request — BA → Architect
**Request-ID:** REQUEST-ARCH-001
**Từ:** BA Team
**Đến:** Architect
**BRD liên quan:** BRD-001 (FR-003)
**Ngày tạo:** 2026-04-09
**Cần trả lời trước:** Trước Stage 1.4 Dev
**Priority:** NORMAL
**Status:** RESOLVED

## Câu hỏi / Yêu cầu

Define schema chuẩn cho **Application Registry** — các đối tượng quản lý của dự án gồm 4 loại:
- Ứng dụng (Application)
- Hệ thống (System)
- Job (Batch/Scheduled Job)
- Connection (API/ETL connection)

Với mỗi loại, cần xác định:
1. Trường bắt buộc (required fields)
2. Trường tùy chọn (optional fields)
3. Kiểu dữ liệu và validation rules
4. Có sub-type không? (ví dụ: Connection phân ra API vs ETL)

## Context

Pain point core của project là "thông tin ứng dụng chưa có tiêu chuẩn". FR-003 giải quyết điều này bằng cách bắt buộc khai báo theo schema chuẩn. Schema này cần được Architect define để:
- Dev biết DB schema và API contract cần implement
- BA biết hướng dẫn user điền thông tin gì
- QA biết validation rules để viết test case

## Impact nếu không có câu trả lời

[x] Bị block hoàn toàn — FR-003 không thể implement nếu chưa có schema

## Assumption tạm thời

BA tạm thời dùng các trường tối thiểu sau để không block discussions:
- name (string, required)
- type (enum: application/system/job/connection, required)
- description (text, optional)
- owner (string, optional)
- status (enum: active/inactive, required)

---
**Resolved:** 2026-04-09 — Schema đã define trong ADR-002 (docs/adr/ADR-002-application-registry-schema.md).
