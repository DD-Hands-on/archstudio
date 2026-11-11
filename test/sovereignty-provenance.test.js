// Sovereignty shifts product fit with stated reasons; provenance keeps every catalogue entry dated.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCatalogue } from '../src/engine/catalogue.js';
import { FIT_RULES, fitFor } from '../src/engine/fit-rules.js';
import { workloadNumbers } from '../src/engine/workload.js';
import { sovFromText, sovOf, SOV_OPTIONS } from '../src/engine/sovereignty.js';
import { provenanceOf, asOfLabel, monthYear } from '../src/engine/provenance.js';
import { checkProvenance, expectedKeys } from '../build/provenance-check.mjs';
import { AI_TIERS } from '../src/engine/ai.js';

const D = buildCatalogue();
const opt = (c, name) => D.cat[c].o.find(o => o.n === name);
const N = sov => ({ users: 1e6, avgRps: 10, peakRps: 50, readRps: 45, writeRps: 5, events: 5, store3: 100, sov });
const port = (c, name, sov) => fitFor(c, opt(c, name), N(sov)).filter(f => f.d === 3).reduce((a, f) => a + f.v, 0);
const json = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));

test('the brief sets sovereignty, strictest mention first', () => {
  assert.equal(sovFromText('Must run on-prem in our own data centre'), 'onprem');
  assert.equal(sovFromText('Air-gapped site, sovereign requirements'), 'onprem');
  assert.equal(sovFromText('A sovereign cloud for the ministry'), 'sovereign');
  assert.equal(sovFromText('Patient data must stay in the EU'), 'region');
  assert.equal(sovFromText('We need data residency in India'), 'region');
  assert.equal(sovFromText('An online shop for a million users'), null);
  assert.equal(sovOf('nonsense'), 'any');
  assert.deepEqual(SOV_OPTIONS.map(o => o[0]), ['any', 'region', 'sovereign', 'onprem']);
});

test('anywhere: no sovereignty notes', () => {
  assert.equal(port('llm', 'Claude via API', 'any'), 0);
  assert.equal(port('idp', 'Okta', 'any'), 0);
});

test('on premises: hosted listings lose portability, self-managed ones do not', () => {
  assert.equal(port('idp', 'Okta', 'onprem'), -2);
  assert.equal(port('db', 'Amazon Aurora PostgreSQL', 'onprem'), -2);
  assert.equal(port('db', 'PostgreSQL', 'onprem'), 0);
  assert.equal(port('llm', 'vLLM + Hugging Face models', 'onprem'), 0);
  const why = fitFor('idp', opt('idp', 'Okta'), N('onprem')).find(f => f.key === '*/#hosted#1').why;
  assert.ok(why.includes('Check whether a self-managed edition exists'), 'the reason asks the learner to check');
});

test('sovereign cloud: hosted model APIs are flagged twice, other hosted services once', () => {
  assert.equal(port('llm', 'Amazon Bedrock', 'sovereign'), -2);
  assert.equal(port('idp', 'Okta', 'sovereign'), -1);
  assert.equal(port('db', 'PostgreSQL', 'sovereign'), 0);
});

test('in region: vendor-hosted services and hosted models need residency confirmed', () => {
  assert.equal(port('llm', 'Claude via API', 'region'), -2);
  assert.equal(port('llm', 'Amazon Bedrock', 'region'), -1);
  assert.equal(port('db', 'Amazon Aurora PostgreSQL', 'region'), 0, 'public-cloud regions are a choice you make');
  assert.equal(port('idp', 'Okta', 'region'), -1);
});

test('the workload cache key changes only when sovereignty is set', () => {
  const A = D.apps.ecom; const st = { app: 'ecom', scale: '1M', ai: 'none' };
  assert.equal(workloadNumbers(A, st).key, workloadNumbers(A, Object.assign({ sov: 'any' }, st)).key);
  assert.notEqual(workloadNumbers(A, st).key, workloadNumbers(A, Object.assign({ sov: 'onprem' }, st)).key);
  assert.equal(workloadNumbers(A, Object.assign({ sov: 'region' }, st)).sov, 'region');
});

test('every catalogue entry has valid, dated provenance today', () => {
  const r = checkProvenance(json('src/data/provenance.json'), json('src/data/provenance.schema.json'), { cat: D.cat, fitRules: FIT_RULES, incidents: D.incidents, apps: D.apps, tiers: AI_TIERS }, '2026-11-11');
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test('the provenance check catches gaps, orphans, drift and stale entries', () => {
  const schema = json('src/data/provenance.schema.json');
  const cat = { cat: { db: { o: [{ n: 'PostgreSQL', u: 'https://www.postgresql.org/docs/' }] } }, fitRules: [['db', 'PostgreSQL']], incidents: { outage: ['t', 'd', 'https://example.org/x'] }, apps: { ecom: {} } };
  const e = (o = {}) => Object.assign({ source: 'curated', asOf: '2026-10-23', reviewedBy: 'unreviewed', reviewBy: '2027-10-23' }, o);
  const good = { products: { 'db/PostgreSQL': e({ source: 'https://www.postgresql.org/docs/' }) }, fitRules: { 'db/PostgreSQL#1': e() }, incidents: { outage: e({ source: 'https://example.org/x' }) }, referenceModels: { ecom: e() }, prices: {} };
  assert.deepEqual(checkProvenance(good, schema, cat, '2026-11-11'), { errors: [], warnings: [] });
  const bad = JSON.parse(JSON.stringify(good));
  delete bad.referenceModels.ecom; bad.referenceModels.gone = e();
  bad.products['db/PostgreSQL'].source = 'https://elsewhere.example/';
  bad.fitRules['db/PostgreSQL#1'].asOf = '2027-01-01';
  const r = checkProvenance(bad, schema, cat, '2026-11-11').errors.join('\n');
  assert.match(r, /no entry for "ecom"/);
  assert.match(r, /"gone" is not in the catalogue/);
  assert.match(r, /does not match the catalogue link/);
  assert.match(r, /is in the future/);
  assert.deepEqual(checkProvenance(good, schema, cat, '2028-01-01').warnings.length, 4, 'past reviewBy warns');
  const noSource = JSON.parse(JSON.stringify(good)); noSource.fitRules['db/PostgreSQL#1'].source = 'a blog';
  assert.match(checkProvenance(noSource, schema, cat, '2026-11-11').errors[0], /^schema:/);
  assert.deepEqual(Object.keys(expectedKeys(cat)), ['products', 'fitRules', 'incidents', 'referenceModels', 'prices']);
});

test('as-of labels for screens', () => {
  assert.equal(monthYear('2026-10-23'), 'Oct 2026');
  const p = provenanceOf('incidents', 'regulation');
  assert.ok(p.source.includes('2026') && p.asOf === '2026-11-11');
  assert.equal(asOfLabel(p, '2026-11-11'), 'As of Nov 2026');
  assert.equal(asOfLabel(p, '2027-06-01'), 'As of Nov 2026 · review due');
  assert.equal(asOfLabel(null, '2026-11-11'), '');
});
