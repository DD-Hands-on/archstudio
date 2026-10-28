// Workload fit: product scores shift at the learner's numbers, each with a stated reason.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../src/engine/catalogue.js';
import { FIT_RULES, fitFor, applyFit } from '../src/engine/fit-rules.js';

const D = buildCatalogue();
const opt = (c, name) => D.cat[c].o.find(o => o.n === name);
const base = { users: 1e6, impl: false, avgRps: 100, peakRps: 500, readRps: 495, writeRps: 5, events: 5, store3: 9000, lat: 1000, cons: 'strong', pattern: 'interactive', inflight: 500, inst: 3, tokensDay: 0 };
const N = over => Object.assign({}, base, over);

test('every rule targets a block and product that exist', () => {
  for (const [c, name, , d] of FIT_RULES) {
    assert.ok(D.cat[c], 'unknown block ' + c);
    if (name !== '*hosted') assert.ok(D.cat[c].o.some(o => o.n.indexOf(name) === 0), c + ': no product starting ' + name);
    for (const k of Object.keys(d)) assert.ok(+k >= 0 && +k <= 4 && d[k] !== 0, 'dimension and change are valid');
  }
});

test('one Postgres primary: fine at low writes, strained near 5k, sharding past 20k', () => {
  const pg = opt('db', 'PostgreSQL');
  assert.deepEqual(fitFor('db', pg, N({ writeRps: 4000 })), []);
  assert.deepEqual(fitFor('db', pg, N({ writeRps: 6000 })).map(f => [f.d, f.v]), [[0, -1]]);
  const hard = fitFor('db', pg, N({ writeRps: 21000 }));
  assert.deepEqual(hard.map(f => [f.d, f.v]), [[0, -2]]);
  assert.match(hard[0].why, /21\.0k writes\/s/);
});

test('Kafka is overkill for a trickle, fine for a firehose', () => {
  const k = opt('mq', 'Apache Kafka');
  assert.equal(fitFor('mq', k, N({ events: 50 }))[0].d, 2);
  assert.deepEqual(fitFor('mq', k, N({ events: 80000 })), []);
  assert.equal(fitFor('mq', opt('mq', 'RabbitMQ'), N({ events: 80000 }))[0].v, -2);
});

test('self-hosted models: costly when idle, cheaper at very high volume; hosted APIs the reverse', () => {
  const v = D.cat.llm.o.find(o => o.t.includes('gpu'));
  const hosted = opt('llm', 'OpenAI API');
  assert.equal(fitFor('llm', v, N({ tokensDay: 5e6 }))[0].v, -1);
  assert.equal(fitFor('llm', v, N({ tokensDay: 5e9 }))[0].v, +1);
  assert.equal(fitFor('llm', hosted, N({ tokensDay: 5e9 }))[0].v, -1);
  assert.deepEqual(fitFor('llm', hosted, N({ tokensDay: 5e6 })), []);
});

test('rules for SaaS-scale users do not fire for enterprise implementations', () => {
  assert.equal(fitFor('idp', opt('idp', 'Okta'), N({ users: 5e7 })).length, 1);
  assert.deepEqual(fitFor('idp', opt('idp', 'Okta'), N({ users: 5e7, impl: true })), []);
});

test('applyFit keeps the curated scores, clamps to 1..5 and records reasons', () => {
  const o = { n: 'X', s: [1, 5, 3, 3, 3], t: [] };
  const f = applyFit(o, [{ d: 0, v: -2, why: 'a' }, { d: 1, v: +1, why: 'b' }]);
  assert.deepEqual(f.s, [1, 5, 3, 3, 3]); assert.deepEqual(f.s0, o.s); assert.equal(f.fit.length, 2);
  assert.equal(applyFit(o, []), o, 'no notes returns the same option');
});

test('reasons are plain text without em dashes', () => {
  const heavy = N({ writeRps: 60000, events: 60000, avgRps: 30000, peakRps: 60000, readRps: 5000, store3: 200000, inflight: 9000, inst: 200, tokensDay: 5e9, users: 5e7, lat: 200, pattern: 'realtime' });
  for (const c of Object.keys(D.cat)) for (const o of D.cat[c].o) for (const f of fitFor(c, o, heavy)) {
    assert.ok(f.why.length > 10 && !f.why.includes('—'), c + ' ' + o.n);
  }
});
