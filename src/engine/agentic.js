// @ts-check
// Agentic systems: what the Workload step asks about agents, and the rules that flag what teams get wrong.
// Rules decide; the learner decides what to do about them. Each issue names the block that fixes it.

/** @typedef {import('./types.js').Product} Product */

/**
 * @typedef {object} AgentAnswers
 * @property {number} agents      agents in the design
 * @property {'read' | 'write' | 'irreversible'} impact  most an agent can do
 * @property {'no' | 'yes'} code  agents run code or shell commands
 * @property {'seconds' | 'minutes' | 'hours'} run  how long one run takes
 * @property {'one' | 'many'} cross  teams or vendors that own the agents and tools
 * @property {number} tools       tools the agents call
 */

/** Starting answers: a small multi-agent system that changes records, run by one team. */
export const AGENT_DEFAULTS = /** @type {AgentAnswers} */ ({ agents: 3, impact: 'write', code: 'no', run: 'minutes', cross: 'one', tools: 10 });

/** The Workload questions, shown only for agentic designs. [key, label, help, options] */
export const AGENT_QUESTIONS = /** @type {[keyof AgentAnswers, string, string, [any, string][]][]} */ ([
  ['agents', 'Agents in the design', 'Count each agent with its own role and tools.', [[1, '1'], [3, '3'], [10, '10']]],
  ['impact', 'The most an agent can do', 'Think of its most powerful tool, not its usual task.', [['read', 'Read and suggest'], ['write', 'Change records that can be undone'], ['irreversible', 'Pay, delete or message outside']]],
  ['code', 'Agents run code or commands', 'Generated scripts, shell commands, browser automation.', [['no', 'No'], ['yes', 'Yes']]],
  ['run', 'How long one run takes', 'From the task arriving to the result, including waits for people.', [['seconds', 'Seconds'], ['minutes', 'Minutes'], ['hours', 'Hours or days']]],
  ['cross', 'Who owns the agents and tools', 'Agents or tools run by other teams or vendors need a shared contract.', [['one', 'One team'], ['many', 'Several teams or vendors']]],
  ['tools', 'Tools the agents call', 'Distinct systems or functions across all agents.', [[3, '3'], [10, '10'], [30, '30']]]
]);

/**
 * Is this design agentic? Agents coordinate work and act through tools.
 * @param {string[]} comps
 */
export function isAgentic(comps) {
  return comps.indexOf('agents') >= 0;
}

/**
 * The agent answers from a Workload object, with defaults filled in.
 * @param {Record<string, any>} W
 * @returns {AgentAnswers}
 */
export function agentAnswers(W) {
  const a = /** @type {any} */ (Object.assign({}, AGENT_DEFAULTS));
  /** @type {(keyof AgentAnswers)[]} */ (Object.keys(AGENT_DEFAULTS)).forEach(k => { if (W && W[k] != null) a[k] = W[k]; });
  return a;
}

/**
 * Issues for an agentic design. A block the learner's level hides (deferred) is not asked for yet.
 * @param {{ comps: string[], get: (cid: string) => Product | null, W: Record<string, any>, deferred?: string[] }} input
 * @returns {[string, string, string | null, string][]} category, text, block to fix (null if not in the design), tip
 */
export function agenticIssues({ comps, get, W, deferred = [] }) {
  if (!isAgentic(comps)) return [];
  const a = agentAnswers(W);
  /** @type {[string, string, string | null, string][]} */
  const out = [];
  const has = (/** @type {string} */ c) => !!get(c);
  const ask = (/** @type {string} */ c) => !has(c) && deferred.indexOf(c) < 0;
  const at = (/** @type {string} */ c) => comps.indexOf(c) >= 0 ? c : null;
  const addTip = (/** @type {string} */ c, /** @type {string} */ name) => comps.indexOf(c) >= 0 ? 'Pick an option for ' + name + '.' : 'Add the ' + name + ' block on the Blueprint or Canvas.';

  if (ask('agentid')) out.push(['Non-functional', 'Agents act under a shared service account or the user\'s own rights, so one manipulated agent reaches everything that account can. Give each agent its own identity, scoped to its tools.', at('agentid'), addTip('agentid', 'Agent identity')]);
  if (a.code === 'yes' && ask('sandbox')) out.push(['Non-functional', 'Agents run code or commands where real systems are reachable: one bad command can reach production. Run them in a sandbox with no standing credentials.', at('sandbox'), addTip('sandbox', 'Sandboxed execution')]);
  const checkpointed = (() => { const m = get('mem'); return !!m && m.n.indexOf('checkpointer') >= 0; })();
  if (a.run !== 'seconds' && ask('durable') && !(a.run === 'minutes' && checkpointed)) out.push(['Non-functional', 'Runs last ' + (a.run === 'hours' ? 'hours or days' : 'minutes') + ' but nothing records their progress: a crash or deploy restarts the run and repeats side effects such as emails or payments.', at('durable'), addTip('durable', 'Durable execution')]);
  if (a.impact === 'irreversible' && ask('approve')) out.push(['Non-functional', 'Agents can pay, delete or message outside the company with no approval step. Put irreversible actions in a tier that waits for a person to sign off.', at('approve'), addTip('approve', 'Approval tiers')]);
  if (a.cross === 'many' && a.agents > 1 && ask('a2a')) out.push(['Interoperability', 'Agents owned by different teams or vendors hand work over through custom glue. Agree a shared protocol, such as A2A, with identity checked on every hop.', at('a2a'), addTip('a2a', 'Agent-to-agent protocol')]);
  return out;
}
