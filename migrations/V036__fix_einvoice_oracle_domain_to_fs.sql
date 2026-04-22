-- ============================================================
-- V036 — Fix domain_code: eINV + Oracle Finance → FS
-- Both EINVOICE-2026 and ORACLE-FIN-2026 were incorrectly seeded
-- under domain HR. Finance projects belong to domain FS.
-- Date: 2026-04-14 | Author: Dev Agent
-- ============================================================

-- 1. Update domain_code on projects table
UPDATE projects
SET domain_code = 'FS',
    updated_at  = NOW()
WHERE code IN ('EINVOICE-2026', 'ORACLE-FIN-2026')
  AND domain_code = 'HR';

-- 2. Update storage_path in project_files where path references the old HR folder
--    Handles full filesystem paths written by write_template_file (e.g. .../HR/EINVOICE-2026/...)
UPDATE project_files
SET storage_path = REPLACE(storage_path, '/HR/EINVOICE-2026/', '/FS/EINVOICE-2026/')
WHERE project_id IN (SELECT id FROM projects WHERE code = 'EINVOICE-2026')
  AND storage_path LIKE '%/HR/EINVOICE-2026/%';

UPDATE project_files
SET storage_path = REPLACE(storage_path, '/HR/ORACLE-FIN-2026/', '/FS/ORACLE-FIN-2026/')
WHERE project_id IN (SELECT id FROM projects WHERE code = 'ORACLE-FIN-2026')
  AND storage_path LIKE '%/HR/ORACLE-FIN-2026/%';

-- 3. Update storage_path in file_versions for the same projects
UPDATE file_versions
SET storage_path = REPLACE(storage_path, '/HR/EINVOICE-2026/', '/FS/EINVOICE-2026/')
WHERE file_id IN (
    SELECT pf.id FROM project_files pf
    JOIN projects p ON p.id = pf.project_id
    WHERE p.code = 'EINVOICE-2026'
)
  AND storage_path LIKE '%/HR/EINVOICE-2026/%';

UPDATE file_versions
SET storage_path = REPLACE(storage_path, '/HR/ORACLE-FIN-2026/', '/FS/ORACLE-FIN-2026/')
WHERE file_id IN (
    SELECT pf.id FROM project_files pf
    JOIN projects p ON p.id = pf.project_id
    WHERE p.code = 'ORACLE-FIN-2026'
)
  AND storage_path LIKE '%/HR/ORACLE-FIN-2026/%';
