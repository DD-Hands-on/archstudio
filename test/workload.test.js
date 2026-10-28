// Workload sizing: the first-principles numbers every later step relies on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../src/engine/catalogue.js';
import { wlDefaults, workloadNumbers } from '../src/engine/workload.js';

const D = buildCatalogue();
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), msg + ': ' + a + ' vs ' + b);

test('online shop at 1M users: the worked arithmetic', () => {
  const N = workloadNumbers(D.apps.ecom, { app: 'ecom', scale: '1M', ai: 'enabled' });
  assert.equal(N.dau, 200000, '20% of 1M users active a day');
  near(N.avgRps, 200000 * 40 / 86400, 'average requests per second');
  near(N.peakRps, N.avgRps * 5, '5x peak');
  near(N.writeRps, N.peakRps / 101, '100 reads per write');
  near(N.readRps + N.writeRps, N.peakRps, 'reads plus writes equal peak');
  near(N.inflight, N.peakRps * 0.2, "Little's law at 200 ms");
  assert.equal(N.store3, 9000, '1 TB a year x 3 years x 3 copies, in GB');
  assert.equal(N.inst, Math.ceil(N.peakRps / 400) + 1, 'instances plus one spare');
  assert.equal(N.tokensDay, 200000 * 3 * 3000, 'AI-enabled: 3 calls a day x 3,000 tokens');
});

test('enterprise implementations assume heavier, more active users', () => {
  const A = D.apps.sap; assert.equal(A.kind, 'impl');
  const d = wlDefaults(A);
  assert.equal(d.actions, 150); assert.equal(d.ratio, '10:1'); assert.equal(d.lat, 1000);
  const N = workloadNumbers(A, { app: 'sap', scale: '10k', ai: 'none' });
  assert.equal(N.activeShare, 0.7); assert.equal(N.tokensDay, 0);
});

test('saved answers apply only to the model they were given for', () => {
  const heavy = { actions: 500, peak: 20, ratio: '1:10' };
  const mine = workloadNumbers(D.apps.ecom, { app: 'ecom', scale: '1M', ai: 'none', wl: { key: D.apps.ecom.n, v: heavy } });
  const other = workloadNumbers(D.apps.ecom, { app: 'ecom', scale: '1M', ai: 'none', wl: { key: 'something else', v: heavy } });
  assert.equal(mine.W.actions, 500); assert.equal(other.W.actions, 40);
  near(mine.writeRps, mine.peakRps * 10 / 11, 'mostly writes');
});

test('streams count every request as an event', () => {
  const N = workloadNumbers(D.apps.iot, { app: 'iot', scale: '1M', ai: 'none' });
  assert.equal(N.pattern, 'realtime'); assert.equal(N.events, N.peakRps);
});

test('AI-native designs make many more model calls', () => {
  const on = workloadNumbers(D.apps.agents, { app: 'agents', scale: '1M', ai: 'native' });
  const en = workloadNumbers(D.apps.agents, { app: 'agents', scale: '1M', ai: 'enabled' });
  near(on.tokensDay / en.tokensDay, 20 / 3, 'native 20 calls vs enabled 3');
});
