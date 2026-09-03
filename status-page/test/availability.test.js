import test from 'node:test';
import assert from 'node:assert/strict';

// eslint-disable-next-line import/extensions
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
  const stat = { total_checks: 288, up_checks: 288, degraded_checks: 0, down_checks: 0 };
  assert.equal(classifyDailyStat(stat), 'operational');
  assert.equal(dailyAvailability(stat), 100);
});

test('uma falha isolada não pinta o dia inteiro de vermelho', () => {
  const stat = { total_checks: 288, up_checks: 287, degraded_checks: 0, down_checks: 1 };
  assert.equal(classifyDailyStat(stat), 'degraded');
  assert.ok(dailyAvailability(stat) > 99);
});

test('dia totalmente indisponível fica vermelho', () => {
  const stat = { total_checks: 288, up_checks: 0, degraded_checks: 0, down_checks: 288 };
  assert.equal(classifyDailyStat(stat), 'major_outage');
  assert.equal(dailyAvailability(stat), 0);
});

test('uptime agregado continua sendo calculado pelas amostras reais', () => {
  const uptime = aggregateUptime([
    { total_checks: 100, up_checks: 99 },
    { total_checks: 100, up_checks: 98 },
  ]);
  assert.equal(uptime, 98.5);
});

test('status desconhecido não é tratado como indisponibilidade', () => {
  assert.equal(bucketForStatus('unknown'), 'unknown');
  assert.equal(bucketForStatus('unexpected-value'), 'unknown');
});

test('um componente desconhecido impede banner falso de tudo operacional', () => {
  assert.equal(worstStatus(['operational', 'unknown']), 'unknown');
  assert.equal(worstStatus(['operational', 'degraded', 'unknown']), 'degraded');
});
