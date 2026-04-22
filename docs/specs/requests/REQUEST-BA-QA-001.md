# Request — BA → QA (Joint)
**Request-ID:** REQUEST-BA-QA-001
**Từ:** BA Team
**Đến:** QA Team
**BRD liên quan:** BRD-001 (FR-013, NFR-004)
**Ngày tạo:** 2026-04-09
**Cần trả lời trước:** Trước Stage 1.4 Dev
**Priority:** NORMAL
**Status:** OPEN

## Câu hỏi / Yêu cầu

Define **BRS template chuẩn** để auto-generate test case hoạt động chính xác (FR-013).

Cần xác định:
1. Format của một "business rule" trong BRS là gì? (ví dụ: structured heading, table row, hay free text có marker?)
2. Minimum structure của BRS content để parser nhận ra từng rule?
3. Test case được sinh ra có format gì? (title, steps, expected result — mapping từ đâu trong BRS?)

## Context

FR-013: "Mỗi business rule trong BRS sinh 1 test case". Nếu BRS viết tự do không có cấu trúc, auto-gen sẽ không chính xác.

Hiện tại Playwright script template đang là:
```javascript
test('[Module]: [Business Rule Description]', async ({ page }) => { ... })
```

→ Parser cần biết đâu là [Module], đâu là [Business Rule Description] trong BRS.

## Impact nếu không có câu trả lời

[ ] Có thể tiếp tục với assumption: BRS dùng heading cấp 2 (##) cho module, bullet points (-) cho từng business rule

## Assumption tạm thời

```markdown
## [Tên Module]
- [Business Rule 1]
- [Business Rule 2]
```

→ Mỗi bullet = 1 test case. Dev implement parser theo assumption này cho đến khi QA define template chính thức.
