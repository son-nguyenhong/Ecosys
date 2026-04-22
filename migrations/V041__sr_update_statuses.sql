-- V041: Align SR statuses with PCR pattern
-- New flow: submitted → reviewing → approved → in_progress → resolved (terminal: rejected, cancelled)

UPDATE service_requests SET status = 'submitted'   WHERE status = 'draft';
UPDATE service_requests SET status = 'reviewing'   WHERE status = 'triaged';
UPDATE service_requests SET status = 'resolved'    WHERE status = 'closed';

ALTER TABLE service_requests
  DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE service_requests
  ALTER COLUMN status SET DEFAULT 'submitted';

ALTER TABLE service_requests
  ADD CONSTRAINT service_requests_status_check
  CHECK (status IN (
    'submitted', 'reviewing', 'approved',
    'in_progress', 'resolved', 'rejected', 'cancelled'
  ));
