-- V025: Fix double-serialized related_systems in ppg_annual_plans
-- Background: related_systems was accidentally stored as a JSON string
-- (e.g. '"[\"CoreBanking\"]"') instead of a JSON array (["CoreBanking"])
-- because json.dumps() was called in Python before asyncpg's JSONB codec
-- applied its own json.dumps(). This fix unwraps those values.

UPDATE ppg_annual_plans
SET related_systems = (related_systems #>> '{}')::jsonb
WHERE jsonb_typeof(related_systems) = 'string';
