-- V039: Remove 'draft' from PCR status, default becomes 'submitted'
-- Migrate existing draft records to submitted first

UPDATE project_change_requests SET status = 'submitted' WHERE status = 'draft';

ALTER TABLE project_change_requests
  DROP CONSTRAINT IF EXISTS project_change_requests_status_check;

ALTER TABLE project_change_requests
  ALTER COLUMN status SET DEFAULT 'submitted';

ALTER TABLE project_change_requests
  ADD CONSTRAINT project_change_requests_status_check
  CHECK (status IN (
    'submitted', 'reviewing', 'approved',
    'rejected', 'implementing', 'implemented', 'cancelled'
  ));
