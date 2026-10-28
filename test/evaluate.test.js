// Outcome evaluation: issues, availability chain, cost index and the overall score.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../src/engine/catalogue.js';
import { workloadNumbers } from '../src/engine/workload.js';
import { fitFor, applyFit } from '../src/engine/fit-rules.js';
import { evaluateOutcome } from '../src/engine/evaluate.js';

const D = buildCatalogue();
const A = D.apps.ecom;
const comps = A.c.slice();
const idx = (c, name) => D.cat[c].o.findIndex(o => o.n.indexOf(name) === 0);
const st = over => Object.assign({ app: 'ecom', cloud: 'aws', ai: 'none', scale: '1M', reg: false, field: 'green', avail: '99.95' }, over);
const run = (picks, s, opts = {}) => {
  const S = st(s); const W = workloadNumbers(A, S);
  const fitOpts = opts.fit ? c => D.cat[c].o.map(o => applyFit(o, fitFor(c, o, W))) : c => D.cat[c].o;
  return evaluateOutcome({ o: { picks }, st: S, comps, appComps: A.c, cat: D.cat, nonCrit: D.nonCrit, fitOpts, workload: W });
};
const allFirst = () => Object.fromEntries(comps.map(c => [c, 0]));

test('nothing chosen: every block is missing and the score is zero', () => {
  const e = run({}, {});
  assert.equal(e.missing.length, comps.length); assert.equal(e.overall, 0);
  assert.equal(e.issues[0].cat, 'Functional');
});

test('overall = quality average x 20, minus 4 per issue and 6 per missing block', () => {
  const e = run(allFirst(), {});
  const avg = [0, 1, 2, 3, 4].map(i => comps.reduce((a, c) => a + D.cat[c].o[0].s[i], 0) / comps.length);
  const base = avg.reduce((a, b) => a + b, 0) / 5 * 20;
  const real = e.issues.filter(i => i.cat !== 'Functional').length;
  assert.equal(e.overall, Math.max(0, Math.min(100, Math.round(base - real * 4))));
});

test('availability is the product of the critical path only', () => {
  const e = run(allFirst(), {});
  const avOf = p => p.k !== 'OSS' ? 0.9999 : (p.s[2] >= 4 ? 0.9995 : 0.999);
  const crit = comps.filter(c => !D.nonCrit.includes(c));
  const expected = crit.reduce((a, c) => a * avOf(D.cat[c].o[0]), 1);
  assert.ok(Math.abs(e.avail - expected) < 1e-12);
  assert.equal(e.meets, expected >= 0.9995);
  assert.equal(e.chain.length, crit.length, 'search and observability are off the critical path');
});

test('mixing clouds is an interoperability issue', () => {
  const p = allFirst(); p.edge = idx('edge', 'Azure Front Door'); p.lb = idx('lb', 'AWS Application Load Balancer');
  const e = run(p, { cloud: 'aws' });
  assert.ok(e.issues.some(i => i.cat === 'Interoperability' && /Mixes AWS and Azure/.test(i.text)));
});

test('a serverless app tier with direct Postgres connections is flagged', () => {
  const p = allFirst(); p.app = idx('app', 'AWS Lambda'); p.db = idx('db', 'PostgreSQL');
  assert.ok(run(p, {}).issues.some(i => /RDS Proxy or PgBouncer/.test(i.text)));
});

test('cost index: managed grows with users, open source grows slower', () => {
  const e = run(allFirst(), {});
  const expect = [1, 10, 60].map(m => Math.round(comps.reduce((a, c) => { const q = D.cat[c].o[0]; const b = (6 - q.s[1]) + (q.k === 'OSS' && q.s[2] <= 2 ? 1.5 : 0); return a + b * (q.k === 'OSS' ? Math.pow(m, 0.8) : m); }, 0)));
  assert.deepEqual(e.cost, expect);
});

test('workload fit: a severe mismatch becomes an issue and lowers the score', () => {
  const p = allFirst(); p.db = idx('db', 'PostgreSQL');
  const heavy = { wl: { key: A.n, v: { actions: 500, peak: 20, ratio: '1:10' } } };
  const plain = run(p, heavy), fitted = run(p, heavy, { fit: true });
  assert.ok(fitted.issues.some(i => /PostgreSQL at your workload/.test(i.text)));
  assert.ok(fitted.overall < plain.overall);
  assert.ok(fitted.fitted.some(q => q.c === 'db'));
});
