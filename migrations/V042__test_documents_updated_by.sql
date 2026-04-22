-- V042 — Add updated_by column to test_documents
ALTER TABLE test_documents ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
