import assert from 'node:assert/strict';
import test from 'node:test';

/* eslint-disable import/extensions */
import {
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
