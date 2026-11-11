// Agentic systems: each rule fires on what teams get wrong, names the block that fixes it, and stays quiet otherwise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../src/engine/catalogue.js';
import { AGENT_DEFAULTS, AGENT_QUESTIONS, isAgentic, agentAnswers, agenticIssues } from '../src/engine/agentic.js';
import { fitFor } from '../src/engine/fit-rules.js';
import { evaluateOutcome } from '../src/engine/evaluate.js';
import { workloadNumbers, wlDefaults } from '../src/engine/workload.js';

const D = buildCatalogue();
const CONTROLS = ['agentid', 'sandbox', 'durable', 'approve', 'a2a'];
const prod = (c, i = 0) => D.cat[c].o[i];
const getter = picks => c => picks[c] != null ? prod(c, picks[c]) : null;
const issues = (comps, picks, W, deferred) => agenticIssues({ comps, get: getter(picks), W, deferred });
const texts = r => r.map(x => x[1]).join('\n');
const base = ['agents', 'tools', 'llm'];

test('only designs with coordinating agents are agentic', () => {
  assert.equal(isAgentic(['llm', 'orch']), false);
  assert.equal(isAgentic(base), true);
  assert.deepEqual(issues(['llm', 'orch'], {}, { impact: 'irreversible', code: 'yes' }), []);
});

test('defaults and questions line up', () => {
  assert.deepEqual(AGENT_QUESTIONS.map(q => q[0]).sort(), Object.keys(AGENT_DEFAULTS).sort());
  for (const [k, , , opts] of AGENT_QUESTIONS) assert.ok(opts.some(o => o[0] === AGENT_DEFAULTS[k]), k + ' default is an offered option');
  assert.deepEqual(agentAnswers({ impact: 'read' }), Object.assign({}, AGENT_DEFAULTS, { impact: 'read' }));
  const W = wlDefaults(D.apps.agents);
  for (const k of Object.keys(AGENT_DEFAULTS)) assert.equal(W[k], AGENT_DEFAULTS[k], 'workload carries ' + k);
});

test('no agent identity: always flagged, pointing at the block', () => {
  const r = issues(base.concat('agentid'), {}, {});
  assert.match(texts(r), /shared service account/);
  assert.equal(r.find(x => /shared service account/.test(x[1]))[2], 'agentid');
  const absent = issues(base, {}, {});
  assert.equal(absent.find(x => /shared service account/.test(x[1]))[2], null, 'not in the design: no block to point at');
  assert.match(absent.find(x => /shared service account/.test(x[1]))[3], /Add the Agent identity block/);
  assert.doesNotMatch(texts(issues(base, { agentid: 0 }, {})), /shared service account/);
});

test('code without a sandbox', () => {
  assert.doesNotMatch(texts(issues(base, {}, { code: 'no' })), /sandbox/);
  assert.match(texts(issues(base, {}, { code: 'yes' })), /Run them in a sandbox/);
  assert.doesNotMatch(texts(issues(base, { sandbox: 0 }, { code: 'yes' })), /Run them in a sandbox/);
});

test('long runs without durable execution; a checkpointer covers minutes, not hours', () => {
  assert.doesNotMatch(texts(issues(base, {}, { run: 'seconds' })), /records their progress/);
  assert.match(texts(issues(base, {}, { run: 'minutes' })), /Runs last minutes/);
  assert.match(texts(issues(base, {}, { run: 'hours' })), /Runs last hours or days/);
  const cp = D.cat.mem.o.findIndex(o => o.n.includes('checkpointer'));
  assert.doesNotMatch(texts(issues(base.concat('mem'), { mem: cp }, { run: 'minutes' })), /records their progress/);
  assert.match(texts(issues(base.concat('mem'), { mem: cp }, { run: 'hours' })), /records their progress/);
  assert.doesNotMatch(texts(issues(base, { durable: 0 }, { run: 'hours' })), /records their progress/);
});

test('irreversible actions need an approval tier', () => {
  assert.doesNotMatch(texts(issues(base, {}, { impact: 'write' })), /sign off/);
  assert.match(texts(issues(base, {}, { impact: 'irreversible' })), /sign off/);
  assert.doesNotMatch(texts(issues(base, { approve: 0 }, { impact: 'irreversible' })), /sign off/);
});

test('agents across teams or vendors need a shared protocol', () => {
  assert.doesNotMatch(texts(issues(base, {}, { cross: 'one' })), /custom glue/);
  assert.match(texts(issues(base, {}, { cross: 'many', agents: 3 })), /custom glue/);
  assert.doesNotMatch(texts(issues(base, {}, { cross: 'many', agents: 1 })), /custom glue/, 'one agent hands nothing over');
  assert.equal(issues(base, {}, { cross: 'many' }).find(x => /custom glue/.test(x[1]))[0], 'Interoperability');
});

test('blocks the learner\'s level hides are not asked for yet', () => {
  const W = { code: 'yes', run: 'hours', impact: 'irreversible', cross: 'many' };
  assert.equal(issues(base, {}, W).length, 5);
  assert.equal(issues(base, {}, W, CONTROLS).length, 0);
});

test('protocols are trade-offs, not defaults', () => {
  const N = W => ({ W: Object.assign({}, AGENT_DEFAULTS, W), users: 1e6 });
  const mcp = prod('tools', 0); const direct = prod('tools', 1);
  assert.ok(fitFor('tools', mcp, N({ tools: 3, cross: 'one' })).some(f => f.d === 2 && f.v < 0), 'MCP for three tools in one team costs ops ease');
  assert.deepEqual(fitFor('tools', mcp, N({ tools: 30, cross: 'many' })), []);
  assert.ok(fitFor('tools', direct, N({ cross: 'many' })).some(f => f.d === 3 && f.v === -2), 'direct calls across vendors lose portability');
  const a2a = prod('a2a', 0); const hand = prod('a2a', 1);
  assert.ok(fitFor('a2a', a2a, N({ cross: 'one' })).length === 2);
  assert.deepEqual(fitFor('a2a', a2a, N({ cross: 'many' })), []);
  assert.ok(fitFor('a2a', hand, N({ cross: 'many' })).some(f => f.d === 3));
  assert.ok(fitFor('durable', prod('durable', 0), N({ run: 'seconds' })).length === 1);
});

test('the multi-agent template carries every control except the cross-team protocol', () => {
  for (const c of ['agentid', 'sandbox', 'durable', 'approve']) assert.ok(D.apps.agents.c.includes(c), c);
  assert.ok(!D.apps.agents.c.includes('a2a'), 'A2A is added only when agents cross boundaries');
});

test('agentic issues reach the outcome score', () => {
  const comps = D.apps.agents.c; const st = { ai: 'native', reg: false, scale: '1M', cloud: 'aws', avail: '99.9', app: 'agents' };
  const all = {}; comps.forEach(c => { all[c] = 0; });
  const without = Object.assign({}, all); delete without.agentid; delete without.approve;
  const wl = W => workloadNumbers(D.apps.agents, Object.assign({}, st, { wl: { key: D.apps.agents.n, v: W } }));
  const ev = (picks, W) => evaluateOutcome({ o: { picks }, st, comps, appComps: comps, cat: D.cat, nonCrit: D.nonCrit, fitOpts: c => D.cat[c].o, workload: wl(W) });
  const full = ev(all, { impact: 'irreversible' }); const gaps = ev(without, { impact: 'irreversible' });
  assert.doesNotMatch(full.issues.map(i => i.text).join('\n'), /shared service account|sign off/);
  assert.match(gaps.issues.map(i => i.text).join('\n'), /shared service account/);
  assert.match(gaps.issues.map(i => i.text).join('\n'), /sign off/);
});
