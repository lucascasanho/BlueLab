const DOWN_STATUSES = new Set(['partial_outage', 'major_outage']);

function countAvailableChecks(stat) {
  return Number(stat?.up_checks ?? 0) + Number(stat?.degraded_checks ?? 0);
}

export function dailyAvailability(stat) {
  const total = Number(stat?.total_checks ?? 0);
  if (total <= 0) return null;

  const available = countAvailableChecks(stat);
  return Math.max(0, Math.min(100, (available / total) * 100));
}

// Availability is intentionally more tolerant than health state: degraded
// checks still mean the service was reachable, while isolated failed checks
// should not make an otherwise healthy day look degraded. Red remains reserved
// for a day where every recorded check was unavailable.
export function classifyDailyStat(stat) {
  const total = Number(stat?.total_checks ?? 0);
  if (total <= 0) return 'unknown';

  const up = Number(stat?.up_checks ?? 0);
  const degraded = Number(stat?.degraded_checks ?? 0);
  const down = Number(stat?.down_checks ?? 0);

  if (down >= total) return 'major_outage';

  // An explicitly degraded monitor state is still shown as degraded even
  // though it counts as available for the uptime percentage.
  if (down === 0 && degraded > 0) return 'degraded';

  const availability = dailyAvailability({
    total_checks: total,
    up_checks: up,
    degraded_checks: degraded,
  });

  if (availability >= 99) return 'operational';
  if (availability >= 95) return 'degraded';
  return 'partial_outage';
}

export function aggregateUptime(stats) {
  let total = 0;
  let available = 0;

  for (const stat of stats ?? []) {
    total += Number(stat?.total_checks ?? 0);
    available += countAvailableChecks(stat);
  }

  if (total <= 0) return null;
  return Math.max(0, Math.min(100, (available / total) * 100));
}

export function bucketForStatus(status) {
  if (status === 'operational') return 'up';
  if (status === 'degraded' || status === 'maintenance') return 'degraded';
  if (DOWN_STATUSES.has(status)) return 'down';
  return 'unknown';
}

export function worstStatus(statuses) {
  const rank = {
    operational: 1,
    unknown: 2,
    maintenance: 3,
    degraded: 4,
    partial_outage: 5,
    major_outage: 6,
  };

  let worst = 'unknown';
  let hasStatus = false;
  for (const status of statuses ?? []) {
    if (!Object.hasOwn(rank, status)) continue;
    if (!hasStatus || rank[status] > rank[worst]) {
      worst = status;
      hasStatus = true;
    }
  }
  return worst;
}
