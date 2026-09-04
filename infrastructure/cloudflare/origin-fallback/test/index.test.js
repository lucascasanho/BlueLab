/* eslint-disable import/extensions */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyInterceptableError,
  handleRequest,
  renderUnavailablePage,
} from '../src/index.js';

const documentRequest = (host = 'mastodon.blue') =>
  new Request(`https://${host}/`, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'sec-fetch-dest': 'document',
    },
  });

describe('transparent proxy behavior', () => {
  it('returns a normal origin response object without rebuilding it', async () => {
    const origin = new Response('mastodon', {
      status: 200,
      headers: { 'x-origin-header': 'preserved' },
    });

    const result = await handleRequest(documentRequest(), async () => origin);

    assert.equal(result, origin);
    assert.equal(result.headers.get('x-origin-header'), 'preserved');
  });

  for (const status of [401, 403, 404, 422, 500, 502, 530]) {
    it(`does not replace an ordinary ${status} application response`, async () => {
      const origin = new Response(`application ${status}`, { status });
      const result = await handleRequest(documentRequest(), async () => origin);

      assert.equal(result, origin);
      assert.equal(await result.text(), `application ${status}`);
    });
  }

  it('does not inspect or replace API responses', async () => {
    const origin = new Response('error code: 1033', { status: 530 });
    const request = new Request('https://mastodon.blue/api/v1/instance', {
      headers: { accept: 'application/json' },
    });

    assert.equal(await handleRequest(request, async () => origin), origin);
  });

  it('passes POST requests and their body to the origin unchanged', async () => {
    const request = new Request('https://mastodon.blue/api/v1/statuses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"status":"teste"}',
    });
    let seenRequest;
    const origin = new Response('{"error":"unauthorized"}', { status: 401 });

    const result = await handleRequest(request, async (received) => {
      seenRequest = received;
      return origin;
    });

    assert.equal(result, origin);
    assert.equal(seenRequest, request);
    assert.equal(await seenRequest.text(), '{"status":"teste"}');
  });
});

describe('safe Cloudflare/Tunnel error classification', () => {
  for (const status of [520, 521, 522, 523, 524]) {
    it(`classifies Cloudflare origin status ${status}`, async () => {
      assert.equal(
        await classifyInterceptableError(
          new Response('edge error', { status }),
        ),
        String(status),
      );
    });
  }

  it('only classifies 502 when it has a Tunnel origin fingerprint', async () => {
    assert.equal(
      await classifyInterceptableError(
        new Response('Unable to reach the origin service via cloudflared', {
          status: 502,
        }),
      ),
      '502',
    );
    assert.equal(
      await classifyInterceptableError(
        new Response('Bad Gateway from application proxy', { status: 502 }),
      ),
      null,
    );
  });

  it('only classifies 530 when it contains Tunnel error 1033', async () => {
    assert.equal(
      await classifyInterceptableError(
        new Response('error code: 1033', { status: 530 }),
      ),
      '1033',
    );
    assert.equal(
      await classifyInterceptableError(
        new Response(
          '<title>Cloudflare Tunnel error</title><script>errorCode: 1033</script>',
          { status: 530 },
        ),
      ),
      '1033',
    );
    assert.equal(
      await classifyInterceptableError(
        new Response('error code: 1016', { status: 530 }),
      ),
      null,
    );
  });

  it('classifies the bodyless 1033 response exposed to a Worker by its Cloudflare headers', async () => {
    assert.equal(
      await classifyInterceptableError(
        new Response(null, {
          status: 530,
          headers: {
            server: 'cloudflare',
            'retry-after': '120',
          },
        }),
      ),
      '1033',
    );
  });
});

describe('fallback page', () => {
  it('renders the Blue identity, links and security headers', async () => {
    const response = await handleRequest(
      documentRequest(),
      async () =>
        new Response('edge timeout', {
          status: 522,
          headers: { 'retry-after': '30' },
        }),
    );
    const html = await response.text();

    assert.equal(response.status, 522);
    assert.equal(response.headers.get('retry-after'), '30');
    assert.match(
      response.headers.get('content-security-policy'),
      /default-src 'none'/,
    );
    assert.match(html, /Blue está temporariamente indisponível/);
    assert.match(html, /mastodon\.blue/);
    assert.match(html, /https:\/\/status\.mastodon\.blue/);
    assert.doesNotMatch(html, /https:\/\/status\.espelunca\.social/);
    assert.match(html, /prefers-color-scheme:light/);
    assert.doesNotMatch(html, /<script/i);
  });

  it('renders the Espelunca identity from the request hostname', async () => {
    const response = await handleRequest(
      documentRequest('espelunca.social'),
      async () => new Response('error code: 1033', { status: 530 }),
    );
    const html = await response.text();

    assert.equal(response.status, 530);
    assert.match(html, /Espelunca está temporariamente indisponível/);
    assert.match(html, /status\.espelunca\.social/);
    assert.doesNotMatch(html, /status\.mastodon\.blue/);
    assert.match(html, /servidor · 1033/);
  });

  it('uses the current name, logo and favicon supplied by its status Worker', async () => {
    const response = await handleRequest(
      documentRequest('espelunca.social'),
      async () => new Response('error code: 1033', { status: 530 }),
      async (_instance, request) => {
        assert.equal(new URL(request.url).pathname, '/api/branding');
        return Response.json({
          name: 'Espelunca Atualizada',
          refreshedAt: '2026-09-04 14:00:00',
        });
      },
    );
    const html = await response.text();

    assert.match(
      html,
      /Espelunca Atualizada está temporariamente indisponível/,
    );
    assert.match(html, /status\.espelunca\.social\/instance-logo/);
    assert.match(html, /status\.espelunca\.social\/instance-favicon/);
    assert.doesNotMatch(html, />BlueLab</);
  });

  it('renders a document fallback when fetch itself throws', async () => {
    const response = await handleRequest(documentRequest(), async () => {
      throw new TypeError('network failure');
    });

    assert.equal(response.status, 503);
    assert.match(
      await response.text(),
      /Blue está temporariamente indisponível/,
    );
  });

  it('returns a bodyless 502 when a non-document origin fetch throws', async () => {
    const request = new Request('https://mastodon.blue/api/v1/instance', {
      headers: { accept: 'application/json' },
    });
    const response = await handleRequest(request, async () => {
      throw new TypeError('network failure');
    });

    assert.equal(response.status, 502);
    assert.equal(await response.text(), '');
  });

  it('rejects hosts that are not assigned to the Worker', async () => {
    const response = await handleRequest(
      documentRequest('example.com'),
      async () => new Response('should not be reached'),
    );

    assert.equal(response.status, 421);
  });

  it('escapes all dynamic page values', () => {
    const html = renderUnavailablePage(
      { name: '<Blue>', statusUrl: 'https://status.example/?a=1&b=2' },
      'bad<host',
      '"522"',
    );

    assert.doesNotMatch(html, /<Blue>/);
    assert.match(html, /&lt;Blue&gt;/);
    assert.match(html, /bad&lt;host/);
    assert.match(html, /a=1&amp;b=2/);
  });
});
