/* eslint-disable import/extensions */
import assert from 'node:assert/strict';
import test from 'node:test';

import { getInstanceConfig } from '../src/config.js';

const baseEnv = {
  INSTANCE_NAME: 'Blue',
  INSTANCE_URL: 'https://mastodon.blue/',
};

test('exibe por padrão os três componentes com monitor HTTP real', () => {
  const config = getInstanceConfig(baseEnv);

  assert.equal(config.baseUrl, 'https://mastodon.blue');
  assert.deepEqual(
    config.components.map((component) => component.slug),
    ['website-api', 'streaming-api', 'media-storage'],
  );
  assert.equal(
    config.components.at(-1).targetUrl,
    'https://mastodon.blue/api/v2/instance',
  );
});

test('ativa filas somente quando o heartbeat está configurado', () => {
  const config = getInstanceConfig({
    ...baseEnv,
    HEARTBEAT_TOKEN: 'configured-secret',
  });

  assert.deepEqual(
    config.components.map((component) => component.slug),
    ['website-api', 'streaming-api', 'media-storage', 'background-queues'],
  );
});
