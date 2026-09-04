/* eslint-disable import/extensions */
import { getInstanceConfig } from './config.js';
import {
  getDashboardData,
  healthPayload,
  receiveHeartbeat,
  runScheduledChecks,
  syncComponents,
} from './db.js';
import { renderStatusPage } from './render.js';

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

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const config = getInstanceConfig(env);

    if (url.pathname === '/health') {
      return json(healthPayload(config));
    }

    if (request.method === 'POST' && url.pathname.startsWith('/api/heartbeat/')) {
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

    const html = renderStatusPage(config, data);
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
    ctx.waitUntil((async () => {
      await syncComponents(env.DB, config);
      await runScheduledChecks(env.DB);
    })());
  },
};

export default worker;
