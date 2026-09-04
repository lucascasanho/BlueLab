-- Do not present components as monitored until a real signal is configured.
-- Their checks/history are intentionally preserved for a future heartbeat or
-- media probe.
UPDATE components
SET enabled = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE slug IN ('background-queues', 'media-storage')
  AND current_status = 'unknown'
  AND last_ok_at IS NULL;
