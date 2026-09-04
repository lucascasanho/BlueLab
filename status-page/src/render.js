/* eslint-disable import/extensions */
import {
  aggregateUptime,
  classifyDailyStat,
  dailyAvailability,
  worstStatus,
} from './availability.js';

const STATUS_LABELS = {
  unknown: 'Desconhecido',
  operational: 'Operacional',
  degraded: 'Desempenho degradado',
  partial_outage: 'Indisponibilidade parcial',
  major_outage: 'Indisponível',
  maintenance: 'Manutenção',
};

const BANNER_LABELS = {
  unknown: 'Status parcialmente desconhecido',
  operational: 'Todos os sistemas operacionais',
  maintenance: 'Manutenção em andamento',
  degraded: 'Alguns sistemas apresentam degradação',
  partial_outage: 'Alguns sistemas estão indisponíveis',
  major_outage: 'Interrupção de serviço detectada',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function last90Days() {
  const days = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let offset = 89; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - offset);
    days.push(dateKey(day));
  }
  return days;
}

function formatPercent(value) {
  if (value == null) return '—';
  return `${value.toFixed(3)}% uptime`;
}

function renderBars(statsByDay, days) {
  return days
    .map((day) => {
      const stat = statsByDay.get(day);
      const status = classifyDailyStat(stat);
      const availability = dailyAvailability(stat);
      const title =
        availability == null
          ? `${day}: sem dados`
          : `${day}: ${availability.toFixed(3)}% (${Number(stat.up_checks)}/${Number(stat.total_checks)} verificações OK)`;

      return `<span class="uptime-bar uptime-bar--${status}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"></span>`;
    })
    .join('');
}

function renderComponent(component, componentStats, days) {
  const statsByDay = new Map(componentStats.map((stat) => [stat.day, stat]));
  const uptime = aggregateUptime(componentStats);

  return `
    <section class="component">
      <div class="component__top">
        <div>
          <h2>${escapeHtml(component.name)}</h2>
          <p>${escapeHtml(component.description)}</p>
        </div>
        <strong class="component__status status--${escapeHtml(component.current_status)}">${escapeHtml(STATUS_LABELS[component.current_status] ?? STATUS_LABELS.unknown)}</strong>
      </div>
      <div class="uptime-bars" role="img" aria-label="Disponibilidade dos últimos 90 dias">
        ${renderBars(statsByDay, days)}
      </div>
      <div class="uptime-meta">
        <span>90 dias atrás</span>
        <strong>${formatPercent(uptime)}</strong>
        <span>Hoje</span>
      </div>
    </section>`;
}

function renderIncidents(incidents) {
  if (!incidents.length) {
    return '<div class="incident-empty">Nenhum incidente relatado nos últimos 7 dias.</div>';
  }

  return incidents
    .map(
      (incident) => `
    <article class="incident">
      <div class="incident__top">
        <strong>${escapeHtml(incident.title)}</strong>
        <span>${escapeHtml(incident.status)}</span>
      </div>
      ${incident.summary ? `<p>${escapeHtml(incident.summary)}</p>` : ''}
      <small>${escapeHtml(incident.started_at)}</small>
    </article>`,
    )
    .join('');
}

export function renderStatusPage(config, data) {
  const days = last90Days();
  const statsByComponent = new Map();
  for (const stat of data.stats) {
    const list = statsByComponent.get(stat.component_id) ?? [];
    list.push(stat);
    statsByComponent.set(stat.component_id, list);
  }

  const overall = worstStatus(
    data.components.map((component) => component.current_status),
  );
  const componentsHtml = data.components
    .map((component) =>
      renderComponent(
        component,
        statsByComponent.get(component.id) ?? [],
        days,
      ),
    )
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>Status — ${escapeHtml(config.name)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0f1115;
      --surface: #171a20;
      --border: #2b3038;
      --text: #f3f5f7;
      --muted: #aeb8c6;
      --green: #15c884;
      --green-bg: #133f31;
      --yellow: #e5b93e;
      --orange: #e88935;
      --red: #ed5454;
      --unknown: #30343c;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
    }
    a { color: inherit; text-decoration: none; }
    .wrap { width: min(100% - 32px, 820px); margin: 0 auto; padding: 0 0 54px; }
    header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding: 0 0 36px; }
    header h1 { margin: 0; font-size: 22px; line-height: 1.15; }
    header p { margin: 7px 0 0; color: #d4dce8; font-weight: 600; }
    header a { margin-top: 8px; color: #aeb9ff; }

    .banner {
      display: flex;
      align-items: center;
      gap: 12px;
      border-radius: 12px;
      padding: 19px 20px;
      margin-bottom: 30px;
      background: #282d35;
      font-weight: 750;
    }
    .banner::before { content: ''; width: 11px; height: 11px; border-radius: 50%; background: var(--unknown); flex: 0 0 auto; }
    .banner--operational { background: var(--green-bg); color: var(--green); }
    .banner--operational::before { background: var(--green); }
    .banner--degraded, .banner--maintenance { color: var(--yellow); }
    .banner--degraded::before, .banner--maintenance::before { background: var(--yellow); }
    .banner--partial_outage { color: var(--orange); }
    .banner--partial_outage::before { background: var(--orange); }
    .banner--major_outage { color: var(--red); }
    .banner--major_outage::before { background: var(--red); }

    .components { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--surface); }
    .component { padding: 24px 22px 20px; border-bottom: 1px solid var(--border); }
    .component:last-child { border-bottom: 0; }
    .component__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
    .component h2 { margin: 0; font-size: 16px; }
    .component p { margin: 7px 0 0; color: var(--muted); font-size: 12px; }
    .component__status { white-space: nowrap; font-size: 12px; }
    .status--operational { color: var(--green); }
    .status--degraded, .status--maintenance { color: var(--yellow); }
    .status--partial_outage { color: var(--orange); }
    .status--major_outage { color: var(--red); }
    .status--unknown { color: var(--muted); }

    .uptime-bars { display: grid; grid-template-columns: repeat(90, minmax(2px, 1fr)); gap: 2px; margin-top: 24px; height: 26px; }
    .uptime-bar { min-width: 2px; height: 26px; border-radius: 2px; background: var(--unknown); }
    .uptime-bar--operational { background: var(--green); }
    .uptime-bar--degraded, .uptime-bar--maintenance { background: var(--yellow); }
    .uptime-bar--partial_outage { background: var(--orange); }
    .uptime-bar--major_outage { background: var(--red); }
    .uptime-bar--unknown { background: var(--unknown); }
    .uptime-meta { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin-top: 8px; color: var(--muted); font-size: 11px; }
    .uptime-meta strong { color: var(--text); font-size: 11px; }
    .uptime-meta span:last-child { text-align: right; }

    h3 { margin: 40px 0 14px; font-size: 17px; }
    .incident-empty, .incident { padding: 22px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--muted); }
    .incident + .incident { margin-top: 10px; }
    .incident__top { display: flex; justify-content: space-between; gap: 16px; color: var(--text); }
    .incident p { margin: 10px 0; }

    @media (max-width: 650px) {
      .wrap { width: min(100% - 24px, 820px); }
      header { padding-bottom: 24px; }
      .component { padding: 20px 16px 18px; }
      .component__top { gap: 12px; }
      .uptime-bars { gap: 1px; height: 22px; }
      .uptime-bar { height: 22px; }
      .uptime-meta { grid-template-columns: 1fr; gap: 3px; }
      .uptime-meta strong { grid-row: 1; }
      .uptime-meta span:last-child { display: none; }
      .uptime-meta span:first-child { display: none; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <header>
      <div>
        <h1>${escapeHtml(config.name)}</h1>
        <p>Status dos serviços</p>
      </div>
      <a href="${escapeHtml(config.baseUrl)}" rel="noopener noreferrer">${escapeHtml(config.baseUrl.replace(/^https?:\/\//, ''))}</a>
    </header>

    <div class="banner banner--${escapeHtml(overall)}">${escapeHtml(BANNER_LABELS[overall] ?? BANNER_LABELS.unknown)}</div>

    <div class="components">${componentsHtml}</div>

    <h3>Incidentes recentes</h3>
    ${renderIncidents(data.incidents)}
  </main>
</body>
</html>`;
}
