// @ts-check
// AI in production: model tiers with planning prices and speeds, what the Workload step asks about AI,
// real money for AI cost, the time a user waits for an answer, and the rules teams get wrong.
// Prices are rounded planning figures, not quotes: providers change them often. Each tier is dated in
// src/data/provenance.json (section "prices") and must be reviewed by its review date.

/** @typedef {import('./types.js').Product} Product */
/** @typedef {'small' | 'mid' | 'frontier'} Tier */

/**
 * Planning figures per tier. Prices in US dollars per million tokens; ttft = seconds to first token;
 * tps = output tokens per second once streaming.
 * @type {Record<Tier, { l: string, examples: string, pin: number, pout: number, ttft: number, tps: number }>}
 */
export const AI_TIERS = {
  small: { l: 'Small', examples: 'Haiku, mini or Flash-Lite class', pin: 0.5, pout: 3, ttft: 0.4, tps: 150 },
  mid: { l: 'Mid', examples: 'Sonnet, standard or Flash class', pin: 2, pout: 12, ttft: 0.8, tps: 80 },
  frontier: { l: 'Frontier', examples: 'Opus or flagship class', pin: 5, pout: 25, ttft: 1.5, tps: 50 }
};

/** Input tokens per AI call: instructions, retrieved context and history. */
export const INPUT_TOKENS = 2250;

/**
 * @typedef {object} AiAnswers
 * @property {Tier} tier      model tier for most calls
 * @property {number} route   share of calls routed to the small tier (0 to 1)
 * @property {number} out     output tokens per answer
 * @property {'yes' | 'no'} stream  answers stream as they are written
 * @property {number} cache   share of calls answered from a semantic cache (0 to 1)
 */

/** Starting answers: mid tier, no routing, a medium answer, streamed, no cache. 2,250 + 750 = 3,000 tokens a call. */
export const AI_DEFAULTS = /** @type {AiAnswers} */ ({ tier: 'mid', route: 0, out: 750, stream: 'yes', cache: 0 });

/** The Workload questions, shown when the design calls a model. [key, label, help, options] */
export const AI_QUESTIONS = /** @type {[keyof AiAnswers, string, string, [any, string][]][]} */ ([
  ['tier', 'Model tier for most calls', 'Bigger models reason better, cost more and answer more slowly.', [['small', 'Small'], ['mid', 'Mid'], ['frontier', 'Frontier']]],
  ['route', 'Calls routed to a small model', 'Simple requests (classify, extract, short replies) can go to a cheaper tier.', [[0, 'None'], [0.5, 'Half'], [0.8, 'Most']]],
  ['out', 'Length of a typical answer', 'Output tokens cost several times input tokens.', [[300, 'Short'], [750, 'Medium'], [2000, 'Long']]],
  ['stream', 'Answers stream as they are written', 'Streaming shows the first words quickly instead of the whole answer at the end.', [['yes', 'Yes'], ['no', 'No']]],
  ['cache', 'Questions answered from a cache', 'Repeat or similar questions served from a semantic cache skip the model.', [[0, 'None'], [0.2, 'A fifth'], [0.5, 'Half']]]
]);

/**
 * The AI answers from a Workload object, with defaults filled in.
 * @param {Record<string, any>} W
 * @returns {AiAnswers}
 */
export function aiAnswers(W) {
  const a = /** @type {any} */ (Object.assign({}, AI_DEFAULTS));
  /** @type {(keyof AiAnswers)[]} */ (Object.keys(AI_DEFAULTS)).forEach(k => { if (W && W[k] != null) a[k] = W[k]; });
  if (!AI_TIERS[/** @type {Tier} */ (a.tier)]) a.tier = 'mid';
  return a;
}

/** Self-hosted models are paid in GPU hours, not tokens. */
const selfHosted = (/** @type {Product | null} */ p) => !!p && p.t.indexOf('gpu') >= 0;

/** @param {number} n */
const usd = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? '$' + Math.round(n / 1e3) + 'k' : n >= 100 ? '$' + Math.round(n).toLocaleString('en-GB') : n >= 1 ? '$' + n.toFixed(2) : n >= 0.01 ? '$' + n.toFixed(3) : '$' + n.toFixed(4);
export { usd as formatUsd };

/**
 * Real money for the AI calls, with the working.
 * @param {{ W: Record<string, any>, aiCallsDay: number, dau: number, llm: Product | null }} input
 * @returns {{ selfHosted: boolean, perQuery: number, perUserMonth: number, perMonth: number, tokensPerCall: number, working: string[] }}
 */
export function aiCost({ W, aiCallsDay, dau, llm }) {
  const a = aiAnswers(W); const t = AI_TIERS[a.tier]; const s = AI_TIERS.small;
  const tokensPerCall = INPUT_TOKENS + a.out;
  if (selfHosted(llm)) return { selfHosted: true, perQuery: 0, perUserMonth: 0, perMonth: 0, tokensPerCall, working: ['Self-hosted model: paid in GPU hours, not per token. Size GPUs from tokens a day (' + Math.round(aiCallsDay * tokensPerCall / 1e6) + 'M) and the model\'s throughput.'] };
  const call = (/** @type {typeof t} */ x) => (INPUT_TOKENS * x.pin + a.out * x.pout) / 1e6;
  const blended = a.route * call(s) + (1 - a.route) * call(t);
  const perQuery = blended * (1 - a.cache);
  const callsPerUser = dau ? aiCallsDay / dau : 0;
  const perUserMonth = perQuery * callsPerUser * 30;
  const perMonth = perQuery * aiCallsDay * 30;
  const working = [
    'One call: ' + INPUT_TOKENS.toLocaleString('en-GB') + ' input tokens × $' + t.pin + ' + ' + a.out.toLocaleString('en-GB') + ' output tokens × $' + t.pout + ', per million (' + t.l.toLowerCase() + ' tier) = ' + usd(call(t)) + '.',
    a.route ? Math.round(a.route * 100) + '% routed to the small tier at ' + usd(call(s)) + ' a call: blended ' + usd(blended) + '.' : 'No routing: every call uses the ' + t.l.toLowerCase() + ' tier.',
    a.cache ? Math.round(a.cache * 100) + '% answered from the cache, which costs almost nothing: ' + usd(perQuery) + ' a query on average.' : 'No cache: every query calls the model.',
    usd(perQuery) + ' × ' + Math.round(callsPerUser) + ' AI calls a day per active user × 30 days = ' + usd(perUserMonth) + ' per active user a month.',
    usd(perQuery) + ' × ' + Math.round(aiCallsDay).toLocaleString('en-GB') + ' calls a day × 30 days = ' + usd(perMonth) + ' a month.'
  ];
  return { selfHosted: false, perQuery, perUserMonth, perMonth, tokensPerCall, working };
}

/**
 * How long a user waits: time to first token when streaming, the whole answer when not.
 * @param {Record<string, any>} W
 * @returns {{ ttft: number, full: number, wait: number, working: string }}
 */
export function aiLatency(W) {
  const a = aiAnswers(W); const t = AI_TIERS[a.tier];
  const full = t.ttft + a.out / t.tps;
  const wait = a.stream === 'yes' ? t.ttft : full;
  const working = 'First token after about ' + t.ttft + ' s (' + t.l.toLowerCase() + ' tier); ' + a.out + ' tokens at about ' + t.tps + ' a second take ' + (a.out / t.tps).toFixed(1) + ' s more. ' + (a.stream === 'yes' ? 'Streaming: the user starts reading after ' + t.ttft + ' s.' : 'Not streaming: the user waits ' + full.toFixed(1) + ' s for the whole answer.');
  return { ttft: t.ttft, full, wait, working };
}

/**
 * Issues for a design that calls a model. Blocks the learner's level hides are not asked for yet.
 * @param {{ comps: string[], get: (cid: string) => Product | null, W: Record<string, any>, ai: string, deferred?: string[] }} input
 * @returns {[string, string, string | null, string][]} category, text, block to fix (null if not in the design), tip
 */
export function aiIssues({ comps, get, W, ai, deferred = [] }) {
  const llm = get('llm');
  if (ai === 'none' || !llm) return [];
  const a = aiAnswers(W);
  /** @type {[string, string, string | null, string][]} */
  const out = [];
  const ask = (/** @type {string} */ c) => !get(c) && deferred.indexOf(c) < 0;
  const at = (/** @type {string} */ c) => comps.indexOf(c) >= 0 ? c : null;
  const tip = (/** @type {string} */ c, /** @type {string} */ name) => comps.indexOf(c) >= 0 ? 'Pick an option for ' + name + '.' : 'Add the ' + name + ' block on the Blueprint or Canvas.';
  const hosted = !selfHosted(llm);

  // Latency: what the user waits for, against the budget.
  const lat = aiLatency(W); const budget = (W && W.lat ? W.lat : 1000) / 1000;
  if ((W && W.pattern) === 'interactive' && lat.wait > budget) out.push(['Non-functional', 'Users wait about ' + lat.wait.toFixed(1) + ' s for ' + (a.stream === 'yes' ? 'the first words' : 'the whole answer') + ', over the ' + budget + ' s latency budget. ' + (a.stream === 'yes' ? 'Route to a smaller tier, cache repeat questions, or move AI off the request path.' : 'Stream the answer so people start reading after the first token.'), 'llm', a.stream === 'yes' ? 'Pick a faster tier on the Workload step, or raise the latency budget for AI answers.' : 'Turn on streaming on the Workload step.']);

  // Gateway: fallbacks and routing need one controlled path to the models.
  if (hosted && ask('aigw')) out.push(['Non-functional', 'Services call the model provider directly: when it fails there is no fallback, and nothing enforces budgets or routing.', at('aigw'), tip('aigw', 'AI gateway and model routing')]);
  if (a.route > 0 && ask('aigw')) out.push(['Interoperability', Math.round(a.route * 100) + '% of calls are meant to go to a smaller model, but nothing in the design routes them.', at('aigw'), tip('aigw', 'AI gateway and model routing')]);

  // Cache: the cost figures assume hits only a semantic cache provides.
  if (a.cache > 0 && !get('semcache')) out.push(['Non-functional', 'The cost figures assume ' + Math.round(a.cache * 100) + '% of questions come from a cache, but the design has no semantic cache.', at('semcache'), tip('semcache', 'Semantic cache')]);

  // Monitoring and evaluation: you cannot run what you cannot measure.
  const evals = get('aimon') || ((get('guard') || { n: '' }).n === 'Langfuse');
  if (!evals && deferred.indexOf('aimon') < 0) out.push(['Non-functional', 'No AI monitoring or golden-set evaluation: you cannot see cost per query, time to first token or answer quality, or tell whether a model or prompt change made answers worse.', at('aimon'), tip('aimon', 'AI monitoring and evaluation')]);

  // Knowledge graph without vector search loses plain semantic lookup.
  if (get('kg') && !get('vec')) out.push(['Interoperability', 'A knowledge graph answers questions about relationships; most designs pair it with vector search for plain lookups (hybrid retrieval).', at('vec'), tip('vec', 'Vector store')]);
  return out;
}
