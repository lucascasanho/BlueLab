/* eslint-disable import/extensions */
import { fetchBrandingAsset } from './branding.js';
import { getInstanceConfig } from './config.js';
import {
  getDashboardData,
  healthPayload,
  receiveHeartbeat,
  runScheduledChecks,
  syncComponents,
} from './db.js';
import { renderStatusPage } from './render.js';

const FAVICON_PATH = '/instance-favicon';
const FAVICON_VERSION = '20260904-1';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function authorizeHeartbeat(request, env) {
  if (!env.HEARTBEAT_TOKEN) return false;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${env.HEARTBEAT_TOKEN}`;
}

function withVersionedFavicon(html) {
  return html.replaceAll(
    'href="/favicon.ico"',
    `href="${FAVICON_PATH}?v=${FAVICON_VERSION}"`,
  );
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const config = getInstanceConfig(env);

    if (url.pathname === '/health') {
      return json(healthPayload(config));
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      if (url.pathname === '/favicon.ico' || url.pathname === FAVICON_PATH) {
        const response = await fetchBrandingAsset(config, 'favicon');
        return request.method === 'HEAD'
          ? new Response(null, response)
          : response;
      }

      if (url.pathname === '/instance-logo') {
        const response = await fetchBrandingAsset(config, 'logo');
        return request.method === 'HEAD'
          ? new Response(null, response)
          : response;
      }
    }

    if (
      request.method === 'POST' &&
      url.pathname.startsWith('/api/heartbeat/')
    ) {
      if (!authorizeHeartbeat(request, env)) {
        return json({ ok: false, error: 'unauthorized' }, 401);
      }

      const slug = url.pathname.slice('/api/heartbeat/'.length);
      const accepted = await receiveHeartbeat(env.DB, slug);
      return accepted
        ? json({ ok: true, heartbeat: slug })
        : json({ ok: false, error: 'unknown heartbeat' }, 404);
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const data = await getDashboardData(env.DB);

    if (url.pathname === '/api/status') {
      return json({ instance: config.name, ...data });
    }

    if (url.pathname !== '/') {
      return new Response('Not Found', { status: 404 });
    }

    const html = withVersionedFavicon(renderStatusPage(config, data));
    return new Response(request.method === 'HEAD' ? null : html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=30, stale-while-revalidate=60',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
      },
    });
  },

  async scheduled(_controller, env, ctx) {
    const config = getInstanceConfig(env);
    ctx.waitUntil(
      (async () => {
        await syncComponents(env.DB, config);
        await runScheduledChecks(env.DB);
      })(),
    );
  },
};

export default worker;
