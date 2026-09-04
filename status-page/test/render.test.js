/* eslint-disable import/extensions */
import assert from 'node:assert/strict';
import test from 'node:test';

import { renderStatusPage } from '../src/render.js';

const config = { name: 'blue', baseUrl: 'https://mastodon.blue' };
const data = {
  components: [
    {
      id: 1,
      slug: 'website-api',
      name: 'Site e API',
      description: 'Site público.',
      current_status: 'operational',
    },
  ],
  stats: [
    {
      component_id: 1,
      day: '2026-09-04',
      total_checks: 120,
      up_checks: 109,
      degraded_checks: 0,
      down_checks: 11,
    },
  ],
  incidents: [],
};

test('renderiza identidade herdada, período observado e percentual correto', () => {
  const html = renderStatusPage(config, data, new Date('2026-09-04T23:00:00Z'));

  assert.match(html, /<title>Status — blue<\/title>/);
  assert.match(html, /src="\/instance-logo"/);
  assert.match(html, /href="\/favicon.ico"/);
  assert.match(html, /Dados desde 04 de set de 2026/);
  assert.match(html, /90,83%/);
  assert.doesNotMatch(html, /90 dias atrás/);
});

test('inclui os tokens BlueLab nos modos claro e escuro sem JavaScript', () => {
  const html = renderStatusPage(config, data, new Date('2026-09-04T23:00:00Z'));

  assert.match(html, /--bg: #ffffff/);
  assert.match(html, /--primary: #006acb/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /--bg: #000000/);
  assert.match(html, /--surface: #101820/);
  assert.match(html, /--primary: #0085ff/);
  assert.doesNotMatch(html, /<script\b/i);
});
