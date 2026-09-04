/* eslint-disable import/extensions */
import assert from 'node:assert/strict';
import test from 'node:test';

import { getInstanceConfig } from '../src/config.js';

const baseEnv = {
  INSTANCE_NAME: 'Blue',
  INSTANCE_URL: 'https://mastodon.blue/',
};

test('exibe por padrão apenas componentes com monitor HTTP real', () => {
  const config = getInstanceConfig(baseEnv);

  assert.equal(config.baseUrl, 'https://mastodon.blue');
  assert.deepEqual(
    config.components.map((component) => component.slug),
    ['website-api', 'streaming-api'],
  );
});

test('ativa mídia e filas somente quando seus sinais estão configurados', () => {
  const config = getInstanceConfig({
    ...baseEnv,
    MEDIA_HEALTH_URL: 'https://mastodon.blue/system/probe.png',
    HEARTBEAT_TOKEN: 'configured-secret',
  });

  assert.deepEqual(
    config.components.map((component) => component.slug),
    ['website-api', 'streaming-api', 'media-storage', 'background-queues'],
  );
});
