/* eslint-disable import/extensions */
import {
  aggregateUptime,
  classifyDailyStat,
  dailyAvailability,
  worstStatus,
} from './availability.js';

const STATUS_LABELS = {
  unknown: 'Sem dados',
  operational: 'Operacional',
  degraded: 'Desempenho degradado',
  partial_outage: 'Indisponibilidade parcial',
  major_outage: 'Indisponível',
  maintenance: 'Em manutenção',
};

const BANNER_LABELS = {
  unknown: 'Ainda não há dados suficientes',
  operational: 'Todos os serviços estão operacionais',
  maintenance: 'Manutenção em andamento',
  degraded: 'Alguns serviços apresentam degradação',
  partial_outage: 'Alguns serviços estão indisponíveis',
  major_outage: 'Interrupção de serviço detectada',
};

const INCIDENT_STATUS_LABELS = {
  investigating: 'Investigando',
  identified: 'Identificado',
  monitoring: 'Monitorando',
  resolved: 'Resolvido',
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

function last90Days(now = new Date()) {
  const days = [];
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  for (let offset = 89; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - offset);
    days.push(dateKey(day));
  }
  return days;
}

function formatPercent(value) {
  if (value == null) return 'Sem dados';
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatDate(day) {
  if (!day) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(`${day}T00:00:00Z`))
    .replace('.', '');
}

function renderBars(statsByDay, days) {
  return days
    .map((day) => {
      const stat = statsByDay.get(day);
      const status = classifyDailyStat(stat);
      const availability = dailyAvailability(stat);
      const title =
        availability == null
          ? `${formatDate(day)}: sem dados`
          : `${formatDate(day)}: ${formatPercent(availability)} disponível (${Number(stat.up_checks) + Number(stat.degraded_checks)}/${Number(stat.total_checks)} verificações disponíveis)`;

      return `<span class="uptime-bar uptime-bar--${status}" title="${escapeHtml(title)}" aria-hidden="true"></span>`;
    })
    .join('');
}

function renderComponent(component, componentStats, days) {
  const statsByDay = new Map(componentStats.map((stat) => [stat.day, stat]));
  const uptime = aggregateUptime(componentStats);
  const firstObservedDay = componentStats[0]?.day;
  const observedLabel = firstObservedDay
    ? `Dados desde ${formatDate(firstObservedDay)}`
    : 'Aguardando a primeira verificação';
  const uptimeLabel =
    uptime == null
      ? 'Sem dados de disponibilidade'
      : `${formatPercent(uptime)} de disponibilidade no período observado`;

  return `
    <section class="component" aria-labelledby="component-${escapeHtml(component.slug)}">
      <div class="component__top">
        <div class="component__copy">
          <h2 id="component-${escapeHtml(component.slug)}">${escapeHtml(component.name)}</h2>
          <p>${escapeHtml(component.description)}</p>
        </div>
        <strong class="component__status status--${escapeHtml(component.current_status)}">
          <span aria-hidden="true"></span>${escapeHtml(STATUS_LABELS[component.current_status] ?? STATUS_LABELS.unknown)}
        </strong>
      </div>
      <div class="uptime-bars" role="img" aria-label="${escapeHtml(uptimeLabel)}">
        ${renderBars(statsByDay, days)}
      </div>
      <div class="uptime-meta">
        <span>${escapeHtml(observedLabel)}</span>
        <strong>${escapeHtml(formatPercent(uptime))}</strong>
        <span>Hoje</span>
      </div>
    </section>`;
}

function renderIncidents(incidents) {
  if (!incidents.length) {
    return `
      <div class="incident-empty">
        <span class="incident-empty__icon" aria-hidden="true">✓</span>
        <div><strong>Nenhum incidente recente</strong><p>Não houve incidentes relatados nos últimos 7 dias.</p></div>
      </div>`;
  }

  return incidents
    .map(
      (incident) => `
        <article class="incident">
          <div class="incident__top">
            <strong>${escapeHtml(incident.title)}</strong>
            <span>${escapeHtml(INCIDENT_STATUS_LABELS[incident.status] ?? incident.status)}</span>
          </div>
          ${incident.summary ? `<p>${escapeHtml(incident.summary)}</p>` : ''}
          <small>${escapeHtml(incident.started_at)} UTC</small>
        </article>`,
    )
    .join('');
}

export function renderStatusPage(config, data, now = new Date()) {
  const days = last90Days(now);
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
  const displayName = config.name || 'BlueLab';
  const hostname = config.baseUrl.replace(/^https?:\/\//, '');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000">
  <link rel="icon" href="/favicon.ico">
  <link rel="shortcut icon" href="/favicon.ico">
  <title>Status — ${escapeHtml(displayName)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #ffffff;
      --surface: #f3f3f8;
      --surface-raised: #ffffff;
      --border: #dfe5e9;
      --text: #101114;
      --muted: #626b75;
      --primary: #006acb;
      --primary-soft: #e8f3ff;
      --green: #087a55;
      --green-soft: #e5f7ef;
      --yellow: #805900;
      --yellow-soft: #fff4d1;
      --orange: #a94713;
      --orange-soft: #ffeadf;
      --red: #bd293d;
      --red-soft: #ffe8ec;
      --unknown: #77818b;
      --unknown-soft: #edf0f2;
      --halo: rgba(0, 106, 203, 0.1);
      --shadow: 0 12px 34px rgba(35, 45, 55, 0.08);
      --radius: 16px;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #000000;
        --surface: #101820;
        --surface-raised: #0b1117;
        --border: #18242d;
        --text: #f7f7f8;
        --muted: #9aa8b4;
        --primary: #0085ff;
        --primary-soft: #071d30;
        --green: #3ddc97;
        --green-soft: #09271d;
        --yellow: #ffd166;
        --yellow-soft: #2a210b;
        --orange: #ff995a;
        --orange-soft: #2b170c;
        --red: #ff667a;
        --red-soft: #2e0d14;
        --unknown: #8996a1;
        --unknown-soft: #182129;
        --halo: rgba(0, 133, 255, 0.12);
        --shadow: 0 16px 44px rgba(0, 0, 0, 0.34);
      }
    }

    * { box-sizing: border-box; }
    html { min-width: 280px; background: var(--bg); }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 50% -160px, var(--halo), transparent 390px),
        var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 15px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
    a:focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; border-radius: 6px; }
    .wrap { width: min(calc(100% - 32px), 780px); margin: 0 auto; padding: 38px 0 44px; }

    header { display: flex; justify-content: space-between; gap: 24px; align-items: center; margin-bottom: 28px; }
    .brand { display: flex; align-items: center; gap: 13px; min-width: 0; }
    .brand__logo { width: 46px; height: 46px; padding: 3px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface-raised); object-fit: contain; flex: 0 0 auto; box-shadow: var(--shadow); }
    .brand__text { min-width: 0; }
    .eyebrow { margin: 0 0 2px; color: var(--muted); font-size: 12px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
    header h1 { margin: 0; font-size: 23px; line-height: 1.15; letter-spacing: -.025em; overflow-wrap: anywhere; }
    .instance-link { display: inline-flex; align-items: center; min-height: 38px; padding: 8px 13px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface-raised); color: var(--text); font-size: 13px; font-weight: 650; box-shadow: 0 4px 16px rgba(20, 32, 42, .05); white-space: nowrap; }
    .instance-link:hover { border-color: var(--primary); color: var(--primary); text-decoration: none; }

    .banner { position: relative; display: flex; align-items: center; gap: 13px; overflow: hidden; min-height: 76px; padding: 19px 21px; margin-bottom: 18px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--unknown-soft); color: var(--unknown); font-size: 16px; font-weight: 780; box-shadow: var(--shadow); }
    .banner::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 4px; background: currentColor; }
    .banner__pulse { position: relative; width: 13px; height: 13px; border-radius: 50%; background: currentColor; flex: 0 0 auto; }
    .banner--operational { background: var(--green-soft); color: var(--green); }
    .banner--degraded, .banner--maintenance { background: var(--yellow-soft); color: var(--yellow); }
    .banner--partial_outage { background: var(--orange-soft); color: var(--orange); }
    .banner--major_outage { background: var(--red-soft); color: var(--red); }

    .section-label { margin: 31px 0 12px; color: var(--muted); font-size: 12px; font-weight: 750; letter-spacing: .065em; text-transform: uppercase; }
    .components { overflow: hidden; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface-raised); box-shadow: var(--shadow); }
    .component { padding: 23px 21px 19px; border-bottom: 1px solid var(--border); }
    .component:last-child { border-bottom: 0; }
    .component__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
    .component__copy { min-width: 0; }
    .component h2 { margin: 0; font-size: 16px; line-height: 1.3; letter-spacing: -.012em; }
    .component p { margin: 6px 0 0; color: var(--muted); font-size: 13px; }
    .component__status { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; font-size: 12px; }
    .component__status span { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .status--operational { color: var(--green); }
    .status--degraded, .status--maintenance { color: var(--yellow); }
    .status--partial_outage { color: var(--orange); }
    .status--major_outage { color: var(--red); }
    .status--unknown { color: var(--unknown); }

    .uptime-bars { display: grid; grid-template-columns: repeat(90, minmax(1px, 1fr)); gap: 2px; height: 28px; margin-top: 22px; }
    .uptime-bar { min-width: 1px; height: 28px; border-radius: 2px; background: var(--unknown-soft); }
    .uptime-bar--operational { background: var(--green); }
    .uptime-bar--degraded, .uptime-bar--maintenance { background: var(--yellow); }
    .uptime-bar--partial_outage { background: var(--orange); }
    .uptime-bar--major_outage { background: var(--red); }
    .uptime-meta { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; margin-top: 9px; color: var(--muted); font-size: 11px; }
    .uptime-meta strong { color: var(--text); font-size: 12px; }
    .uptime-meta span:last-child { text-align: right; }

    .incident-empty, .incident { padding: 20px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface-raised); box-shadow: var(--shadow); }
    .incident-empty { display: flex; align-items: center; gap: 13px; color: var(--text); }
    .incident-empty__icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--green-soft); color: var(--green); font-weight: 800; flex: 0 0 auto; }
    .incident-empty strong { font-size: 14px; }
    .incident-empty p, .incident p { margin: 3px 0 0; color: var(--muted); font-size: 13px; }
    .incident + .incident { margin-top: 10px; }
    .incident__top { display: flex; justify-content: space-between; gap: 16px; }
    .incident__top span, .incident small { color: var(--muted); font-size: 12px; }

    footer { display: flex; justify-content: flex-end; margin-top: 26px; padding: 0 3px; color: var(--muted); font-size: 12px; }

    @media (max-width: 600px) {
      .wrap { width: min(calc(100% - 24px), 780px); padding: 24px 0 32px; }
      header { align-items: flex-start; margin-bottom: 22px; }
      .brand { gap: 10px; }
      .brand__logo { width: 42px; height: 42px; border-radius: 13px; }
      header h1 { font-size: 20px; }
      .instance-link { min-height: 34px; padding: 7px 10px; font-size: 0; }
      .instance-link::before { content: 'Abrir'; font-size: 12px; }
      .banner { min-height: 68px; padding: 16px 17px; font-size: 14px; }
      .component { padding: 19px 15px 16px; }
      .component__top { display: block; }
      .component__status { margin-top: 11px; }
      .uptime-bars { gap: 1px; height: 24px; margin-top: 18px; }
      .uptime-bar { height: 24px; border-radius: 1px; }
      .uptime-meta { grid-template-columns: 1fr auto; }
      .uptime-meta span:last-child { display: none; }
      footer { display: block; text-align: center; }
    }

    @media (prefers-reduced-motion: no-preference) {
      .instance-link { transition: border-color .15s ease, color .15s ease, transform .15s ease; }
      .instance-link:hover { transform: translateY(-1px); }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <header>
      <div class="brand">
        <img class="brand__logo" src="/instance-logo" alt="" width="46" height="46">
        <div class="brand__text">
          <p class="eyebrow">Status dos serviços</p>
          <h1>${escapeHtml(displayName)}</h1>
        </div>
      </div>
      <a class="instance-link" href="${escapeHtml(config.baseUrl)}" rel="noopener noreferrer" aria-label="Abrir ${escapeHtml(hostname)}">${escapeHtml(hostname)}</a>
    </header>

    <div class="banner banner--${escapeHtml(overall)}" role="status">
      <span class="banner__pulse" aria-hidden="true"></span>
      <span>${escapeHtml(BANNER_LABELS[overall] ?? BANNER_LABELS.unknown)}</span>
    </div>

    <h2 class="section-label">Serviços monitorados</h2>
    <div class="components">${componentsHtml}</div>

    <h2 class="section-label">Incidentes recentes</h2>
    ${renderIncidents(data.incidents)}

    <footer>
      <a href="${escapeHtml(config.baseUrl)}" rel="noopener noreferrer">Voltar para ${escapeHtml(hostname)}</a>
    </footer>
  </main>
</body>
</html>`;
}
