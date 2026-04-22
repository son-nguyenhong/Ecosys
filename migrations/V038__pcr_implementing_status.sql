-- V038: Add 'implementing' to PCR status values
-- New flow: draft → submitted → reviewing → approved → implementing → implemented
-- Terminal: rejected, cancelled

ALTER TABLE project_change_requests
  DROP CONSTRAINT IF EXISTS project_change_requests_status_check;

ALTER TABLE project_change_requests
  ADD CONSTRAINT project_change_requests_status_check
  CHECK (status IN (
    'draft', 'submitted', 'reviewing', 'approved',
    'rejected', 'implementing', 'implemented', 'cancelled'
  ));
