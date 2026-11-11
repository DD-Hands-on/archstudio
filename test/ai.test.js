// AI in production: real money with the working, the wait users feel, and the rules for gateways,
// routing, caching, monitoring and hybrid retrieval.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../src/engine/catalogue.js';
import { AI_TIERS, AI_DEFAULTS, AI_QUESTIONS, INPUT_TOKENS, aiAnswers, aiCost, aiLatency, aiIssues } from '../src/engine/ai.js';
import { workloadNumbers } from '../src/engine/workload.js';
import { provenanceOf } from '../src/engine/provenance.js';

const D = buildCatalogue();
const llm = n => D.cat.llm.o.find(o => o.n === n);
const claude = llm('Claude via API'); const vllm = llm('vLLM + Hugging Face models');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' ≈ ' + b);

test('every tier has dated planning prices with a short review date', () => {
  for (const k of Object.keys(AI_TIERS)) {
    const p = provenanceOf('prices', k);
    assert.ok(p && p.note.startsWith('Planning figure'), k);
    assert.ok(p.reviewBy <= '2027-03-01', k + ' is reviewed within months');
  }
  assert.ok(AI_TIERS.small.pin < AI_TIERS.mid.pin && AI_TIERS.mid.pin < AI_TIERS.frontier.pin);
  assert.ok(AI_TIERS.small.ttft < AI_TIERS.frontier.ttft);
});

test('questions and defaults line up; the default keeps 3,000 tokens a call', () => {
  assert.deepEqual(AI_QUESTIONS.map(q => q[0]).sort(), Object.keys(AI_DEFAULTS).sort());
  for (const [k, , , opts] of AI_QUESTIONS) assert.ok(opts.some(o => o[0] === AI_DEFAULTS[k]), k);
  assert.equal(INPUT_TOKENS + AI_DEFAULTS.out, 3000);
  assert.equal(aiAnswers({ tier: 'nonsense' }).tier, 'mid');
});

test('cost per query, per user and per month, with the working', () => {
  const c = aiCost({ W: {}, aiCallsDay: 30000, dau: 10000, llm: claude });
  near(c.perQuery, (2250 * 2 + 750 * 12) / 1e6); // $0.0135
  near(c.perUserMonth, c.perQuery * 3 * 30);
  near(c.perMonth, c.perQuery * 30000 * 30);
  assert.equal(c.working.length, 5);
  assert.match(c.working[0], /2,250 input tokens × \$2 \+ 750 output tokens × \$12/);
});

test('routing and caching lower the cost', () => {
  const base = aiCost({ W: {}, aiCallsDay: 1000, dau: 100, llm: claude }).perQuery;
  const routed = aiCost({ W: { route: 0.8 }, aiCallsDay: 1000, dau: 100, llm: claude }).perQuery;
  const cached = aiCost({ W: { cache: 0.5 }, aiCallsDay: 1000, dau: 100, llm: claude }).perQuery;
  assert.ok(routed < base);
  near(cached, base * 0.5);
  assert.ok(aiCost({ W: { tier: 'frontier' }, aiCallsDay: 1, dau: 1, llm: claude }).perQuery > base);
});

test('self-hosted models are paid in GPU hours, not tokens', () => {
  const c = aiCost({ W: {}, aiCallsDay: 1000, dau: 100, llm: vllm });
  assert.equal(c.selfHosted, true);
  assert.equal(c.perMonth, 0);
  assert.match(c.working[0], /GPU hours/);
});

test('streaming changes the wait users feel', () => {
  const s = aiLatency({ tier: 'mid', out: 800, stream: 'yes' });
  const n = aiLatency({ tier: 'mid', out: 800, stream: 'no' });
  assert.equal(s.wait, AI_TIERS.mid.ttft);
  near(n.wait, AI_TIERS.mid.ttft + 800 / AI_TIERS.mid.tps);
  assert.match(n.working, /Not streaming/);
});

test('the workload uses the answer length for tokens a day', () => {
  const A = D.apps.genai; const st = { app: 'genai', scale: '10k', ai: 'enabled' };
  const base = workloadNumbers(A, st);
  const long = workloadNumbers(A, Object.assign({ wl: { key: A.n, v: { out: 2000 } } }, st));
  assert.equal(long.tokensDay / base.tokensDay, (2250 + 2000) / 3000);
  assert.notEqual(long.key, base.key, 'the cache key changes when an AI answer changes');
});

const get = picks => c => picks[c] != null ? D.cat[c].o[picks[c]] : null;
const txt = r => r.map(x => x[1]).join('\n');
const comps = ['llm', 'aigw', 'vec', 'aimon', 'semcache', 'kg'];
const issues = (picks, W = {}, ai = 'enabled', deferred = []) => aiIssues({ comps, get: get(picks), W: Object.assign({ lat: 1000, pattern: 'interactive' }, W), ai, deferred });

test('no AI or no model: no AI rules', () => {
  assert.deepEqual(issues({ llm: 1 }, {}, 'none'), []);
  assert.deepEqual(issues({}), []);
});

test('latency over budget, with advice that fits streaming or not', () => {
  assert.doesNotMatch(txt(issues({ llm: 1, aigw: 0, aimon: 0 })), /latency budget/);
  assert.match(txt(issues({ llm: 1, aigw: 0, aimon: 0 }, { stream: 'no' })), /whole answer.*Stream the answer/s);
  assert.match(txt(issues({ llm: 1, aigw: 0, aimon: 0 }, { tier: 'frontier', lat: 1000 })), /first words.*smaller tier/s);
  assert.doesNotMatch(txt(issues({ llm: 1, aigw: 0, aimon: 0 }, { stream: 'no', pattern: 'async' })), /latency budget/);
});

test('a hosted model needs a gateway; routing needs one too; deferred blocks wait', () => {
  assert.match(txt(issues({ llm: 1, aimon: 0 })), /no fallback/);
  assert.doesNotMatch(txt(issues({ llm: 0, aimon: 0 })), /no fallback/, 'self-hosted: no provider to fail over from');
  assert.doesNotMatch(txt(issues({ llm: 1, aimon: 0 }, {}, 'enabled', ['aigw'])), /no fallback/);
  assert.match(txt(issues({ llm: 1, aimon: 0 }, { route: 0.5 })), /nothing in the design routes them/);
  assert.doesNotMatch(txt(issues({ llm: 1, aimon: 0 }, { route: 0.5 }, 'enabled', ['aigw'])), /routes them/);
});

test('cache assumptions need a semantic cache', () => {
  assert.match(txt(issues({ llm: 1, aigw: 0, aimon: 0 }, { cache: 0.2 })), /no semantic cache/);
  assert.doesNotMatch(txt(issues({ llm: 1, aigw: 0, aimon: 0, semcache: 0 }, { cache: 0.2 })), /no semantic cache/);
});

test('monitoring and golden-set evaluation; Langfuse in guardrails counts', () => {
  assert.match(txt(issues({ llm: 1, aigw: 0 })), /golden-set evaluation/);
  assert.doesNotMatch(txt(issues({ llm: 1, aigw: 0, aimon: 0 })), /golden-set/);
  const lf = D.cat.guard.o.findIndex(o => o.n === 'Langfuse');
  assert.doesNotMatch(txt(aiIssues({ comps: ['llm', 'guard'], get: get({ llm: 1, guard: lf, aigw: 0 }), W: {}, ai: 'enabled' })), /golden-set/);
});

test('a knowledge graph pairs with vector search', () => {
  assert.match(txt(issues({ llm: 1, aigw: 0, aimon: 0, kg: 0 })), /hybrid retrieval/);
  assert.doesNotMatch(txt(issues({ llm: 1, aigw: 0, aimon: 0, kg: 0, vec: 0 })), /hybrid retrieval/);
});
