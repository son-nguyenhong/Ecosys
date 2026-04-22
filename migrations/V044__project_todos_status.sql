-- V044 — Update project_todos status CHECK constraint
-- New status set: todo | in_progress | pending | done | cancelled  (remove blocked)

ALTER TABLE project_todos DROP CONSTRAINT IF EXISTS project_todos_status_check;

ALTER TABLE project_todos
  ADD CONSTRAINT project_todos_status_check
  CHECK (status IN ('todo', 'in_progress', 'pending', 'done', 'cancelled'));

-- Migrate any existing 'blocked' rows to 'pending'
UPDATE project_todos SET status = 'pending' WHERE status = 'blocked';
