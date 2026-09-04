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
