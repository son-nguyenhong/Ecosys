-- Migration V023: Fix projects.plan_id FK to reference ppg_annual_plans instead of annual_plans
-- Reason: API /annual-plans uses ppg_annual_plans (v2 table), but projects.plan_id still
--         references the legacy annual_plans table, causing ForeignKeyViolationError on insert.

-- Step 1: Drop the old FK constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_plan_id_fkey;

-- Step 2: Nullify any plan_id values that don't exist in ppg_annual_plans
--         (migrate existing references from annual_plans → ppg_annual_plans where possible)
UPDATE projects p
SET plan_id = NULL
WHERE plan_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM ppg_annual_plans ap WHERE ap.id = p.plan_id
  );

-- Step 3: Add new FK pointing to ppg_annual_plans
ALTER TABLE projects
    ADD CONSTRAINT projects_plan_id_fkey
    FOREIGN KEY (plan_id) REFERENCES ppg_annual_plans(id) ON DELETE SET NULL;
