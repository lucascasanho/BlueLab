-- Local-only preview data. This file is never applied to the remote D1 database.

UPDATE components
SET current_status = 'operational',
    last_checked_at = CURRENT_TIMESTAMP,
    last_ok_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;

DELETE FROM daily_stats;

-- Fill 90 days as operational for every component so the preview resembles a
-- mature status page instead of a new installation with mostly gray bars.
WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 89
)
INSERT INTO daily_stats (
  component_id,
  day,
  total_checks,
  up_checks,
  degraded_checks,
  down_checks
)
SELECT
  components.id,
  date('now', printf('-%d day', days.n)),
  288,
  288,
  0,
  0
FROM components
CROSS JOIN days;

-- Two deliberately imperfect days on Website & API:
-- 287/288 = yellow (brief degradation), not red.
UPDATE daily_stats
SET up_checks = 287,
    down_checks = 1
WHERE component_id = (SELECT id FROM components WHERE slug = 'website-api')
  AND day = date('now', '-1 day');

-- 280/288 = orange (partial outage), not red.
UPDATE daily_stats
SET up_checks = 280,
    down_checks = 8
WHERE component_id = (SELECT id FROM components WHERE slug = 'website-api')
  AND day = date('now', '-2 day');
