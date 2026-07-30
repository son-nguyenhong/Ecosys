/**
 * Khung tài liệu Markdown mẫu cho BA Studio.
 *
 * Dùng khi tạo Master Doc mới: BA có ngay bộ xương đúng chuẩn tài liệu nghiệp vụ
 * của ngân hàng (có mục tuân thủ SBV/PDPL) rồi điền nội dung, thay vì đối diện
 * một ô trống. Mỗi heading `##` sẽ thành một mục để diff khi review Change Request.
 */

import type { DocType } from '../lib/ba-studio/types'

export const BRS_TEMPLATE = `# BRS — <Tên hệ thống / dự án>

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | <doc-code> |
| Phiên bản | v1.0 |
| Chủ tài liệu | <BA phụ trách> |
| Ngày ban hành | <DD/MM/YYYY> |
| Trạng thái | Bản gốc |

## 1. Mục tiêu & phạm vi

**Mục tiêu:** <vấn đề nghiệp vụ cần giải quyết và kết quả mong đợi, đo được>.

**Trong phạm vi:**

- <chức năng / quy trình 1>
- <chức năng / quy trình 2>

**Ngoài phạm vi:**

- <hạng mục sẽ làm ở giai đoạn sau>

## 2. Các bên liên quan

| Vai trò | Đơn vị | Người phụ trách | Trách nhiệm |
| --- | --- | --- | --- |
| Product Owner | <đơn vị> | <họ tên> | Quyết định phạm vi, ưu tiên |
| Business Analyst | <đơn vị> | <họ tên> | Phân tích, tài liệu, nghiệm thu |
| Tech Lead | <đơn vị> | <họ tên> | Thiết kế kỹ thuật |
| QA Lead | <đơn vị> | <họ tên> | Kịch bản kiểm thử |

## 3. Quy trình nghiệp vụ hiện tại (AS-IS)

<mô tả luồng hiện tại, điểm nghẽn, số liệu minh chứng>

## 4. Quy trình nghiệp vụ mục tiêu (TO-BE)

1. <bước 1 — ai làm, đầu vào, đầu ra>
2. <bước 2>
3. <bước 3>

## 5. Yêu cầu chức năng

| Mã | Yêu cầu | Ưu tiên | Ghi chú |
| --- | --- | --- | --- |
| FR-001 | <mô tả yêu cầu ở góc nhìn người dùng> | Cao | |
| FR-002 | | Trung bình | |

## 6. Yêu cầu phi chức năng

| Mã | Loại | Chỉ tiêu |
| --- | --- | --- |
| NFR-001 | Hiệu năng | <p95 thời gian phản hồi ≤ … giây> |
| NFR-002 | Khả dụng | <SLA …%> |
| NFR-003 | Nhật ký & truy vết | Ghi vết đầy đủ hành động thay đổi dữ liệu |

## 7. Quy tắc nghiệp vụ

- **BR-001:** <điều kiện → hành động → ngoại lệ>
- **BR-002:**

## 8. Tích hợp & dữ liệu

| Hệ thống | Chiều | Giao thức | Dữ liệu | Tần suất |
| --- | --- | --- | --- | --- |
| <core / T24 / …> | Nhận | REST / MQ | <trường dữ liệu> | <realtime / batch> |

## 9. Bảo mật & tuân thủ

- Phân quyền theo vai trò; dữ liệu khách hàng chỉ hiển thị theo nguyên tắc cần-biết.
- Dữ liệu cá nhân xử lý theo PDPL; không đưa dữ liệu khách hàng thật ra môi trường ngoài.
- Lưu vết truy cập và thay đổi phục vụ kiểm toán nội bộ và báo cáo SBV.

## 10. Tiêu chí nghiệm thu

- [ ] <tiêu chí kiểm chứng được 1>
- [ ] <tiêu chí kiểm chứng được 2>

## 11. Rủi ro & giả định

| Loại | Nội dung | Mức | Phương án xử lý |
| --- | --- | --- | --- |
| Rủi ro | | Trung bình | |
| Giả định | | | |

## 12. Phụ lục

<liên kết tới sơ đồ, mock-up, biên bản họp>
`

export const FSD_TEMPLATE = `# FSD — <Tên tính năng / hệ thống>

| Thuộc tính | Giá trị |
| --- | --- |
| Mã tài liệu | <doc-code> |
| Phiên bản | v1.0 |
| Tài liệu nguồn | <BRS-…> |
| Chủ tài liệu | <BA phụ trách> |

## 1. Tổng quan giải pháp

<mô tả giải pháp chức năng ở mức người dùng thấy được>

## 2. Sơ đồ luồng xử lý

\`\`\`
<Người dùng> → [Màn hình A] → [Kiểm tra hợp lệ] → [Ghi nhận] → <Thông báo>
\`\`\`

## 3. Đặc tả màn hình

| Trường | Kiểu | Bắt buộc | Quy tắc hợp lệ | Ghi chú |
| --- | --- | --- | --- | --- |
| | | Có | | |

## 4. Đặc tả xử lý

1. **Điều kiện bắt đầu:** <…>
2. **Các bước xử lý:** <…>
3. **Kết quả:** <…>
4. **Ngoại lệ:** <mã lỗi → thông điệp người dùng>

## 5. Quy tắc & công thức

- <công thức tính, ví dụ số liệu cụ thể>

## 6. Đặc tả giao diện tích hợp

| API | Phương thức | Tham số | Phản hồi | Lỗi |
| --- | --- | --- | --- | --- |
| | POST | | | |

## 7. Phân quyền

| Vai trò | Xem | Tạo | Sửa | Phê duyệt |
| --- | --- | --- | --- | --- |
| BA | ✔ | ✔ | ✔ | |
| Trưởng phòng | ✔ | | | ✔ |

## 8. Kịch bản kiểm thử chính

| Mã | Tình huống | Kết quả mong đợi |
| --- | --- | --- |
| TC-001 | | |

## 9. Ảnh hưởng & phụ thuộc

<hệ thống liên quan, dữ liệu cần chuyển đổi, thứ tự triển khai>
`

export const DOC_TEMPLATES: Partial<Record<DocType, string>> = {
  BRS: BRS_TEMPLATE,
  BRD: BRS_TEMPLATE,
  FSD: FSD_TEMPLATE,
  FRS: FSD_TEMPLATE,
  SRS: FSD_TEMPLATE,
}

export function templateFor(docType: DocType): string {
  return DOC_TEMPLATES[docType] ?? BRS_TEMPLATE
}
