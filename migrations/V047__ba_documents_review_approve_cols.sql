-- ============================================================
-- V047 — ba_documents: thêm cột reviewed_by/approved_by + sửa CHECK status
-- Code (ba_documents_v2.py change_document_status):
--   - ghi reviewed_by khi submit_review, approved_by khi approve
--   - state machine dùng 'in_review' (KHÔNG phải 'review')
-- V045 ban đầu thiếu 2 cột này và đặt CHECK sai ('review') → approve sẽ lỗi.
-- Migration này vá cả hai, idempotent, an toàn cho mọi trạng thái hiện có.
-- ============================================================

-- 1. Thêm cột còn thiếu
ALTER TABLE ba_documents
    ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);

-- 2. Sửa CHECK constraint status: 'review' → 'in_review' cho khớp code
ALTER TABLE ba_documents DROP CONSTRAINT IF EXISTS ba_documents_status_check;
ALTER TABLE ba_documents
    ADD CONSTRAINT ba_documents_status_check
    CHECK (status IN ('draft','in_review','approved','archived'));
