/* eslint-disable import/extensions */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateUptime,
  bucketForStatus,
  classifyDailyStat,
  dailyAvailability,
  worstStatus,
} from '../src/availability.js';
import { getInstanceConfig } from '../src/config.js';
import { renderStatusPage } from '../src/render.js';

test('sem amostras fica desconhecido/cinza', () => {
  assert.equal(classifyDailyStat({ total_checks: 0 }), 'unknown');
  assert.equal(dailyAvailability({ total_checks: 0 }), null);
});

test('dia 100% operacional fica verde', () => {
  const stat = {
    total_checks: 288,
    up_checks: 288,
    degraded_checks: 0,
    down_checks: 0,
  };
  assert.equal(classifyDailyStat(stat), 'operational');
  assert.equal(dailyAvailability(stat), 100);
});

test('uma falha isolada acima de 99% continua verde', () => {
  const stat = {
    total_checks: 288,
    up_checks: 287,
    degraded_checks: 0,
    down_checks: 1,
  };
  assert.equal(classifyDailyStat(stat), 'operational');
  assert.ok(dailyAvailability(stat) > 99);
});

test('98% de disponibilidade fica amarelo, não vermelho', () => {
  const stat = {
    total_checks: 100,
    up_checks: 98,
    degraded_checks: 0,
    down_checks: 2,
  };
  assert.equal(classifyDailyStat(stat), 'degraded');
  assert.equal(dailyAvailability(stat), 98);
});

test('abaixo de 95% fica laranja como indisponibilidade parcial', () => {
  const stat = {
    total_checks: 100,
    up_checks: 94,
    degraded_checks: 0,
    down_checks: 6,
  };
  assert.equal(classifyDailyStat(stat), 'partial_outage');
});

test('dia totalmente indisponível fica vermelho', () => {
  const stat = {
    total_checks: 288,
    up_checks: 0,
    degraded_checks: 0,
    down_checks: 288,
  };
  assert.equal(classifyDailyStat(stat), 'major_outage');
  assert.equal(dailyAvailability(stat), 0);
});

test('degradação conta como serviço disponível no percentual de uptime', () => {
  const stat = {
    total_checks: 100,
    up_checks: 98,
    degraded_checks: 2,
    down_checks: 0,
  };
  assert.equal(dailyAvailability(stat), 100);
  assert.equal(classifyDailyStat(stat), 'degraded');
});

test('uptime agregado usa verificações disponíveis, inclusive degradadas', () => {
  const uptime = aggregateUptime([
    { total_checks: 100, up_checks: 98, degraded_checks: 2 },
    { total_checks: 100, up_checks: 99, degraded_checks: 0 },
  ]);
  assert.equal(uptime, 99.5);
});

test('status desconhecido não é tratado como indisponibilidade', () => {
  assert.equal(bucketForStatus('unknown'), 'unknown');
  assert.equal(bucketForStatus('unexpected-value'), 'unknown');
});

test('um componente desconhecido impede banner falso de tudo operacional', () => {
  assert.equal(worstStatus(['operational', 'unknown']), 'unknown');
  assert.equal(worstStatus(['operational', 'degraded', 'unknown']), 'degraded');
});

test('somente o Blue pode calcular o banner pelos monitores com estado conhecido', () => {
  const data = {
    components: [
      {
        id: 1,
        name: 'Website & API',
        description: 'Site principal',
        current_status: 'operational',
      },
      {
        id: 2,
        name: 'Media storage',
        description: 'Monitoramento manual',
        current_status: 'unknown',
      },
    ],
    stats: [],
    incidents: [],
  };

  const blueConfig = getInstanceConfig({
    INSTANCE_NAME: 'Blue',
    INSTANCE_URL: 'https://mastodon.blue',
    STATUS_IGNORE_UNKNOWN_IN_OVERALL: 'true',
  });
  const blueHtml = renderStatusPage(blueConfig, data);
  assert.match(blueHtml, /banner--operational/);
  assert.match(blueHtml, /Sistemas monitorados operacionais/);
  assert.doesNotMatch(blueHtml, /Status parcialmente desconhecido/);

  const defaultConfig = getInstanceConfig({
    INSTANCE_NAME: 'Espelunca',
    INSTANCE_URL: 'https://espelunca.social',
  });
  const defaultHtml = renderStatusPage(defaultConfig, data);
  assert.match(defaultHtml, /banner--unknown/);
  assert.match(defaultHtml, /Status parcialmente desconhecido/);
});
