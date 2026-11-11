// Principle checks and gap analysis: the reasons shown to learners come from these rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../src/engine/catalogue.js';
import { buildAdmContent } from '../src/engine/adm-content.js';
import { principleCheck } from '../src/engine/principles.js';
import { baselineFor, gapAnalysis, PLATEAUS } from '../src/engine/gap.js';

const cat = buildCatalogue().cat;
const check = (o = {}) => Object.assign({ checks: [], conf: null, devN: 0, chosen: 0 }, o);
const run = (id, o = {}) => principleCheck(id, Object.assign({ cat, design: { comps: [], picks: {} }, check: check(), libNone: false, settings: { avail: '99.9', reg: false, ai: 'none' } }, o));

test('every principle in the content has a check', () => {
  for (const p of buildAdmContent().principles) {
    const r = run(p.id, { design: { comps: ['idp'], picks: {} } });
    assert.ok(['met', 'risk', 'open'].includes(r.state), p.id);
    assert.ok(r.t.length > 0, p.id + ' explains itself');
  }
  assert.deepEqual(run('not-a-principle'), { state: 'open', t: '' });
});

test('continuity needs observability and at least 99.9%', () => {
  assert.deepEqual(run('continuity', { design: { comps: ['obs'], picks: {} }, settings: { avail: '99.95', reg: false, ai: 'none' } }), { state: 'met', t: 'Observability in place, 99.95% availability target.' });
  assert.equal(run('continuity', { design: { comps: ['obs'], picks: {} }, settings: { avail: '99.5', reg: false, ai: 'none' } }).state, 'risk');
});

test('regulated data needs identity and a governance block', () => {
  const s = { avail: '99.9', reg: true, ai: 'none' };
  assert.equal(run('compliance', { settings: s, design: { comps: ['idp'], picks: {} } }).t, 'Regulated data: identity in place; governance block missing.');
  assert.equal(run('compliance', { settings: s, design: { comps: ['idp', 'grc'], picks: {} } }).state, 'met');
  assert.equal(run('compliance').t, 'No regulated data in scope.');
});

test('responsible AI needs guardrails and AI governance when AI is in scope', () => {
  assert.equal(run('rai').t, 'No AI in scope.');
  const s = { avail: '99.9', reg: false, ai: 'native' };
  assert.deepEqual(run('rai', { settings: s }), { state: 'risk', t: 'No guardrails; no AI governance block.' });
  assert.equal(run('rai', { settings: s, design: { comps: ['guard', 'aigov'], picks: {} } }).state, 'met');
});

test('reuse principles use conformance, and need a pattern library', () => {
  assert.equal(run('benefit', { libNone: true, check: check({ conf: 90 }) }).state, 'open');
  assert.deepEqual(run('benefit', { check: check({ conf: 75 }) }), { state: 'met', t: '75% of chosen blocks are shared enterprise standards.' });
  assert.equal(run('reuse', { check: check({ conf: 75 }) }).state, 'risk', 'reuse asks for 80%');
  assert.equal(run('diversity', { check: check({ conf: 50, devN: 3 }) }).t, '3 blocks off standard or under review.');
  assert.equal(run('diversity', { check: check({ conf: 50, devN: 1 }) }).t, '1 block off standard or under review.');
});

test('independence averages product portability', () => {
  // PostgreSQL portability 5, Okta 3
  assert.deepEqual(run('independence', { design: { comps: ['db', 'idp'], picks: { db: 0, idp: 1 } } }), { state: 'met', t: 'Average portability 4.0 out of 5.' });
  assert.equal(run('independence').state, 'open');
});

test('baseline comes from the scenario, a typical brownfield estate, or nothing', () => {
  assert.deepEqual(baselineFor(null, 'green').base, []);
  assert.equal(baselineFor(null, 'brown').base.length, 4);
  const sc = { base: [['Old CRM', 'crmcore', 'replace']] };
  assert.equal(baselineFor(sc, 'green').base, sc.base);
  assert.ok(baselineFor(sc, 'green').note.startsWith('Baseline from the scenario'));
});

test('brownfield gap: keep, change, new and retire, grouped into transition architectures', () => {
  const std = { gw: { i: 0, status: 'approved' }, idp: { i: -1, status: 'none' } };
  const g = gapAnalysis({ cat, design: { comps: ['idp', 'app', 'db', 'gw'], picks: { app: 0, db: 1 } }, std, base: baselineFor(null, 'brown').base });
  assert.deepEqual(g.rows.map(r => [r.gap, r.tgt]), [
    ['Retire', 'Removed'],
    ['Change', 'Kubernetes'],
    ['Change', 'Amazon Aurora PostgreSQL'],
    ['New', 'Kong Gateway (standard)'],
    ['Keep', 'Product not chosen']
  ]);
  assert.deepEqual(g.count, { New: 1, Change: 2, Keep: 1, Retire: 1 });
  assert.deepEqual(g.plateaus.map(p => p.items), [
    ['Replace On-premises database with Amazon Aurora PostgreSQL', 'Introduce Kong Gateway (standard)'],
    ['Replace Legacy core system with Kubernetes'],
    ['Decommission Point-to-point integrations']
  ]);
  assert.deepEqual(g.plateaus.map(p => p.k), PLATEAUS.map(p => p.k));
});

test('greenfield gap: everything is new', () => {
  const g = gapAnalysis({ cat, design: { comps: ['db', 'not-a-block'], picks: { db: 0 } }, std: {}, base: [] });
  assert.deepEqual(g.rows.map(r => r.gap), ['New']);
  assert.equal(g.rows[0].wp, 'Introduce PostgreSQL');
});
