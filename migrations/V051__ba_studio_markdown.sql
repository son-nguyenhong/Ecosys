-- ============================================================
-- V051 — BA Studio: tài liệu là MỘT file Markdown
--
-- Bối cảnh: BA của VIB soạn BRS/FSD trong 1 file .md duy nhất, không nhập
-- rời từng mục. Module chuyển sang lấy Markdown làm bề mặt soạn thảo; các
-- "mục" (ba_doc_sections) trở thành phép chiếu được tách tự động theo heading
-- (#, ##, ###…) để vẫn giữ được diff cấp mục khi review Change Request.
--
-- Cần thêm 2 thông tin để tách/ghép Markdown không mất cấu trúc:
--   1. heading_level  — cấp heading của mục (0 = phần mở đầu trước heading đầu tiên)
--   2. op 'move'      — CR đổi vị trí mục / chèn mục vào đầu tài liệu.
--      Không có 'move' thì apply_ops không tái tạo được đúng THỨ TỰ mục của
--      file Markdown mới (op 'add' chỉ chèn được sau một mục neo).
--
-- Additive + idempotent. Không DROP/TRUNCATE dữ liệu.
-- Dữ liệu cũ: heading_level mặc định 2 → ghép lại thành '## Tiêu đề', đúng
-- với cách 7 tài liệu seed đang được trình bày.
-- ============================================================

-- ── 1. heading_level cho mục của bản hiện hành ───────────────
ALTER TABLE ba_doc_sections
    ADD COLUMN IF NOT EXISTS heading_level SMALLINT NOT NULL DEFAULT 2;

ALTER TABLE ba_doc_sections DROP CONSTRAINT IF EXISTS ba_doc_sections_heading_level_check;
ALTER TABLE ba_doc_sections
    ADD CONSTRAINT ba_doc_sections_heading_level_check
    CHECK (heading_level BETWEEN 0 AND 6);

-- heading rỗng chỉ hợp lệ với phần mở đầu (level 0) và ngược lại
ALTER TABLE ba_doc_sections DROP CONSTRAINT IF EXISTS ba_doc_sections_preamble_check;
ALTER TABLE ba_doc_sections
    ADD CONSTRAINT ba_doc_sections_preamble_check
    CHECK ((heading_level = 0 AND heading = '') OR (heading_level > 0 AND heading <> ''));

-- ── 2. heading_level cho section op của CR ───────────────────
ALTER TABLE ba_doc_cr_ops
    ADD COLUMN IF NOT EXISTS heading_level SMALLINT;

ALTER TABLE ba_doc_cr_ops DROP CONSTRAINT IF EXISTS ba_doc_cr_ops_heading_level_check;
ALTER TABLE ba_doc_cr_ops
    ADD CONSTRAINT ba_doc_cr_ops_heading_level_check
    CHECK (heading_level IS NULL OR heading_level BETWEEN 0 AND 6);

-- ── 3. op 'move' ─────────────────────────────────────────────
-- CHECK gốc của V049 là constraint inline (tên do Postgres sinh) → drop theo tên
-- chuẩn rồi tạo lại có tên tường minh để lần sau sửa được.
ALTER TABLE ba_doc_cr_ops DROP CONSTRAINT IF EXISTS ba_doc_cr_ops_op_check;
ALTER TABLE ba_doc_cr_ops
    ADD CONSTRAINT ba_doc_cr_ops_op_check
    CHECK (op IN ('add', 'modify', 'remove', 'move'));

-- ── 4. Kiểm tra ────────────────────────────────────────────────
DO $$
DECLARE
    n_sections INTEGER;
    n_bad      INTEGER;
BEGIN
    SELECT count(*) INTO n_sections FROM ba_doc_sections;
    SELECT count(*) INTO n_bad FROM ba_doc_sections WHERE heading_level IS NULL;
    RAISE NOTICE 'V051: % mục có heading_level, % mục thiếu', n_sections, n_bad;
END $$;
