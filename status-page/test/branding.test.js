/* eslint-disable import/extensions */
import assert from 'node:assert/strict';
import test from 'node:test';

import { bundledBrandingAsset } from '../src/brand-assets.js';
import {
  fetchBrandingAsset,
  findFaviconInHtml,
  selectFaviconInstanceIcon,
  selectLargestInstanceIcon,
} from '../src/branding.js';

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
  const response = await fetchBrandingAsset(
    { baseUrl: 'https://mastodon.blue' },
    'logo',
    async () => {
      throw new TypeError('origin offline');
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.ok((await response.arrayBuffer()).byteLength > 1_000);
});
