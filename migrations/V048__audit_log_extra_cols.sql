-- ============================================================
-- V048 — ppg_audit_log: thêm cột ip_address, user_agent, notes
-- Code (audit_service.log_audit) INSERT 9 cột gồm ip_address/user_agent/notes,
-- nhưng bảng gốc (infra/migrate_annual_plans_v2.sql) chỉ tới new_values.
-- Thiếu → mọi lần ghi audit log thất bại (không chặn luồng chính, nhưng mất log).
-- Additive, idempotent.
-- ============================================================

ALTER TABLE ppg_audit_log
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64),
    ADD COLUMN IF NOT EXISTS user_agent TEXT,
    ADD COLUMN IF NOT EXISTS notes      TEXT;
