/* eslint-disable import/extensions */
import assert from 'node:assert/strict';
import test from 'node:test';

import { bundledBrandingAsset } from '../src/brand-assets.js';
import {
  findFaviconInHtml,
  getBrandingAsset,
  getBrandingSummary,
  refreshBranding,
  selectFaviconInstanceIcon,
  selectLargestInstanceIcon,
} from '../src/branding.js';

function brandingDb(initialRow = null) {
  let row = initialRow;
  return {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              row = {
                name: values[0],
                logo_base64: values[1],
                logo_content_type: values[2],
                favicon_base64: values[3],
                favicon_content_type: values[4],
                refreshed_at: '2026-09-04 14:00:00',
              };
            },
          };
        },
        async first() {
          if (sql.includes('SELECT 1 AS fresh'))
            return row ? { fresh: 1 } : null;
          return row;
        },
      };
    },
  };
}

test('seleciona o maior ícone da instância para o topo', () => {
  const icons = [
    { src: 'https://example.test/36.png', size: '36x36' },
    { src: 'https://example.test/192.png', size: '192x192' },
    { src: 'https://example.test/48.png', size: '48x48' },
  ];

  assert.equal(
    selectLargestInstanceIcon(icons),
    'https://example.test/192.png',
  );
});

test('prefere ícone próximo de 48px como fallback de favicon', () => {
  const icons = [
    { src: 'https://example.test/192.png', size: '192x192' },
    { src: 'https://example.test/48.png', size: '48x48' },
    { src: 'https://example.test/72.png', size: '72x72' },
  ];

  assert.equal(selectFaviconInstanceIcon(icons), 'https://example.test/48.png');
});

test('usa o favicon declarado pelo HTML da instância', () => {
  const html =
    '<html><head><link rel="icon" href="/favicon-blue.svg"></head></html>';
  assert.equal(
    findFaviconInHtml(html, 'https://mastodon.example'),
    'https://mastodon.example/favicon-blue.svg',
  );
});

test('mantém uma cópia local do ícone do Blue', async () => {
  const response = bundledBrandingAsset({
    baseUrl: 'https://mastodon.blue',
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.ok((await response.arrayBuffer()).byteLength > 1_000);
});

test('mantém uma cópia local do ícone da Espelunca', async () => {
  const response = bundledBrandingAsset({
    baseUrl: 'https://espelunca.social',
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.ok((await response.arrayBuffer()).byteLength > 1_000);
});

test('serve o ícone incorporado sem redirecionar quando a instância cai', async () => {
  const response = await getBrandingAsset(
    brandingDb(),
    { name: 'Blue', baseUrl: 'https://mastodon.blue' },
    'logo',
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.ok((await response.arrayBuffer()).byteLength > 1_000);
});

test('salva e serve automaticamente nome, logo e favicon da instância', async () => {
  const db = brandingDb();
  const config = { name: 'Blue', baseUrl: 'https://mastodon.blue' };
  const image = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  const originFetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/v2/instance')) {
      return Response.json({
        title: 'Nome atualizado',
        icon: [
          { src: 'https://mastodon.blue/logo.png', size: '192x192' },
          { src: 'https://mastodon.blue/icon.png', size: '48x48' },
        ],
      });
    }
    if (url === 'https://mastodon.blue') {
      return new Response('<link rel="icon" href="/favicon.png">', {
        headers: { 'content-type': 'text/html' },
      });
    }
    return new Response(image, { headers: { 'content-type': 'image/png' } });
  };

  assert.equal(await refreshBranding(db, config, originFetch), true);
  assert.deepEqual(await getBrandingSummary(db, config), {
    name: 'Nome atualizado',
    refreshedAt: '2026-09-04 14:00:00',
    logoUrl: '/instance-logo',
    faviconUrl: '/instance-favicon',
  });
  const logo = await getBrandingAsset(db, config, 'logo');
  assert.equal(logo.headers.get('content-type'), 'image/png');
  assert.deepEqual(new Uint8Array(await logo.arrayBuffer()), image);
});
