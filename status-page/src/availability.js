const DOWN_STATUSES = new Set(['partial_outage', 'major_outage']);

export function dailyAvailability(stat) {
  const total = Number(stat?.total_checks ?? 0);
  if (total <= 0) return null;

  const up = Number(stat?.up_checks ?? 0);
  return Math.max(0, Math.min(100, (up / total) * 100));
}

/**
 * A day is red only when every recorded check was down.
 * Mixed days are shown as degraded (yellow), not as a full outage.
 */
export function classifyDailyStat(stat) {
  const total = Number(stat?.total_checks ?? 0);
  if (total <= 0) return 'unknown';

  const up = Number(stat?.up_checks ?? 0);
  const degraded = Number(stat?.degraded_checks ?? 0);
  const down = Number(stat?.down_checks ?? 0);

  if (down >= total) return 'major_outage';
  if (up >= total && degraded === 0 && down === 0) return 'operational';
  return 'degraded';
}

export function aggregateUptime(stats) {
  let total = 0;
  let up = 0;

  for (const stat of stats ?? []) {
    total += Number(stat?.total_checks ?? 0);
    up += Number(stat?.up_checks ?? 0);
  }

  if (total <= 0) return null;
  return Math.max(0, Math.min(100, (up / total) * 100));
}

export function bucketForStatus(status) {
  if (status === 'operational') return 'up';
  if (status === 'degraded' || status === 'maintenance') return 'degraded';
  if (DOWN_STATUSES.has(status)) return 'down';
  return 'degraded';
}

export function worstStatus(statuses) {
  const rank = {
    unknown: 0,
    operational: 1,
    maintenance: 2,
    degraded: 3,
    partial_outage: 4,
    major_outage: 5,
  };

  let worst = 'unknown';
  for (const status of statuses ?? []) {
    if ((rank[status] ?? 0) > (rank[worst] ?? 0)) worst = status;
  }
  return worst;
}
