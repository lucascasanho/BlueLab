/* eslint-disable import/extensions */
import assert from 'node:assert/strict';
import test from 'node:test';

import { checkHttp } from '../src/db.js';

const component = { target_url: 'https://example.test/health' };

test('falha HTTP transitória é confirmada antes de virar downtime', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('temporary network failure');
    return new Response(null, { status: 200 });
  };

  try {
    const result = await checkHttp(component);
    assert.equal(attempts, 2);
    assert.equal(result.status, 'operational');
    assert.match(result.message, /segunda tentativa/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('duas falhas HTTP consecutivas continuam registradas como indisponibilidade', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async () => {
    attempts += 1;
    return new Response(null, { status: 503 });
  };

  try {
    const result = await checkHttp(component);
    assert.equal(attempts, 2);
    assert.equal(result.status, 'major_outage');
    assert.equal(result.httpStatus, 503);
    assert.match(result.message, /duas tentativas/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
