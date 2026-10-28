// Scores one outcome (a product pick per building block): quality averages, interoperability and non-functional issues,
// the availability chain, a relative cost index and the overall score. Pure: everything it needs is passed in.
//   o          { picks: { blockId: optionIndex } }
//   st         settings: cloud, ai, scale, reg, field, avail
//   comps      building blocks in the design; appComps: blocks in the reference model
//   cat        the catalogue; nonCrit: blocks users do not wait on
//   fitOpts(c) options for block c with scores adjusted to the workload; workload: workloadNumbers()
export function evaluateOutcome({ o, st, comps, appComps, cat, nonCrit, fitOpts, workload }) {
  const picks = comps.filter(c => o.picks[c] != null && cat[c].o[o.picks[c]]).map(c => ({ c, p: fitOpts(c)[o.picks[c]] }));
  const get = c => { const x = picks.find(q => q.c === c); return x ? x.p : null; };
  const fitted = picks.filter(q => q.p.fit);
  const avg = [0,1,2,3,4].map(i => picks.length ? picks.reduce((a, q) => a + q.p.s[i], 0) / picks.length : 0);
  const issues = [];
  const add = (cat, text, cid, tip) => issues.push({ cat, text, cid, tip });
  const missing = comps.filter(c => o.picks[c] == null);
  if (missing.length) add('Functional', 'No choice yet for ' + missing.map(c => cat[c].l.toLowerCase()).join(', ') + '.', missing[0], 'Choose an option for this component.');
  const clouds = ['aws','azure','gcp'].filter(cl => picks.some(q => q.p.t.indexOf(cl) >= 0));
  const cname = { aws: 'AWS', azure: 'Azure', gcp: 'Google Cloud' };
  const offCloud = cl => picks.find(q => q.p.t.indexOf(cl) >= 0);
  if (clouds.length > 1) { const odd = clouds.find(c => c !== st.cloud) || clouds[1]; add('Interoperability', 'Mixes ' + clouds.map(c => cname[c]).join(' and ') + ' native services: cross-cloud networking, egress cost and two identity models.', offCloud(odd).c, 'Swap this for an option on your primary cloud, or an open source one.'); }
  else if (clouds.length === 1 && st.cloud !== 'multi' && clouds[0] !== st.cloud) add('Interoperability', 'Uses ' + cname[clouds[0]] + ' services on a ' + cname[st.cloud] + '-first estate; expect landing zone and network exceptions.', offCloud(clouds[0]).c, 'Pick an option native to ' + cname[st.cloud] + ' or an open source one.');
  const app = get('app'); const isServerless = app && app.t.indexOf('serverless') >= 0; const db = get('db');
  if (isServerless && db && db.t.indexOf('pg') >= 0) add('Non-functional', 'Lambda functions opening direct Postgres connections exhaust the pool under load. Add RDS Proxy or PgBouncer.', 'app', 'Use containers, or keep Lambda and record a connection proxy in the ADR.');
  ['gw','lb','mesh'].forEach(c => { const p = get(c); if (isServerless && p && p.t.indexOf('k8s') >= 0) add('Interoperability', p.n + ' assumes a Kubernetes cluster that your serverless app tier does not provide.', c, 'Pick a managed option that does not need a cluster.'); });
  const llm = get('llm');
  if (llm && llm.t.indexOf('gpu') >= 0 && !(app && app.t.indexOf('k8s') >= 0)) add('Interoperability', 'Self-hosted vLLM needs a GPU node pool; your compute choice does not provide one.', 'llm', 'Use a hosted model, or choose Kubernetes for application services.');
  const vec = get('vec');
  if (vec && vec.t.indexOf('pg') >= 0 && db && db.t.indexOf('pg') < 0) add('Interoperability', 'pgvector needs PostgreSQL but the operational database is ' + db.n + ', so you run two databases.', 'vec', 'Pick Qdrant or Pinecone, or switch the database to PostgreSQL.');
  if (vec && vec.t.indexOf('pg') >= 0 && st.scale === '50M') add('Non-functional', 'pgvector slows past tens of millions of vectors; plan partitioning or a dedicated vector store.', 'vec', 'Pick a dedicated vector store for this scale.');
  const ag = get('agents'); const tl = get('tools');
  if (ag && tl && ag.n === 'CrewAI' && tl.n.indexOf('A2A') >= 0) add('Interoperability', 'Check CrewAI support for A2A in your version before committing; MCP is more widely supported.', 'tools', 'Pick MCP for tool access.');
  const erp = get('erpcore'), mdmP = get('mdm'), uxP = get('ux'), hcmP = get('hcm'), payP = get('payroll'), extP = get('ext');
  const isSap = p => p && p.t.indexOf('sap') >= 0;
  const sapApp = picks.some(q => isSap(q.p) && ['ipaas','alm','migr','proc','mdm','grc','ext','ux','embai'].indexOf(q.c) < 0);
  if (uxP && uxP.n.indexOf('Fiori') >= 0 && !sapApp) add('Interoperability', 'Fiori is built for SAP back ends, but ' + (erp ? erp.n + ' is not SAP' : 'this design has no SAP application') + '; you need a different user experience.', 'ux', 'Pick Teams apps or a custom portal.');
  if (isSap(erp) && mdmP && !isSap(mdmP)) add('Interoperability', 'Non-SAP master data with an SAP core adds a synchronisation layer for material and vendor records.', 'mdm', 'Consider SAP MDG, or record the sync design in an ADR.');
  if (isSap(erp) && extP && extP.t.indexOf('k8s') >= 0) add('Non-functional', 'Custom extensions on Kubernetes keep the core clean but need your own event and API plumbing to SAP.', 'ext', 'Consider SAP BTP for prebuilt SAP connectivity.');
  if (st.field === 'brown' && erp && erp.n.indexOf('private edition') < 0) add('Non-functional', 'Brownfield conversion keeps ECC history only with S/4HANA private edition or on-premises; ' + erp.n + ' means a reimplementation.', 'erpcore', 'Pick S/4HANA private edition, or switch the brief to greenfield.');
  if (erp && erp.n === 'Odoo' && (st.reg || st.scale === '50M')) add('Non-functional', 'Odoo has few reference cases at this scale or under GxP validation.', 'erpcore', 'Pick an enterprise ERP for the group core; keep Odoo for small subsidiaries.');
  if (hcmP && payP && isSap(hcmP) !== isSap(payP) && payP.n !== 'ADP') add('Interoperability', 'HR core and payroll from different vendors need a certified integration and reconciliation every pay cycle.', 'payroll', 'Pick payroll from the same vendor as HR, or a global provider such as ADP.');
  const ai = st.ai; const emb = get('embai'); const gwP = get('aigw');
  if (emb) {
    const supportOnly = ['ipaas','alm','migr','proc','mdm','grc','ext','ux'];
    const need = { 'SAP Joule': [p => isSap(p), 'SAP application'], 'Salesforce Agentforce': [p => p.n.indexOf('Salesforce') >= 0, 'Salesforce CRM'], 'ServiceNow Now Assist': [p => p.n.indexOf('ServiceNow') >= 0, 'ServiceNow platform'] }[emb.n];
    if (need && !picks.some(q => q.c !== 'embai' && supportOnly.indexOf(q.c) < 0 && need[0](q.p))) add('Interoperability', emb.n + ' only works on its own platform, but this design has no ' + need[1] + ' for it to run on.', 'embai', 'Pick the AI that ships with your core platform, or Copilot Studio or your own agents for cross-platform work.');
  }
  if (ai === 'native' && tl && tl.n.indexOf('OpenAPI') >= 0) add('Non-functional', 'Bespoke tool adapters for every agent will not scale in an AI-native estate.', 'tools', 'Pick MCP so every agent reaches tools the same way.');
  if (ai !== 'none' && llm && llm.k !== 'OSS' && st.scale === '50M') add('Non-functional', 'Token spend grows with every user and agent step; set budgets per task, cache prompts and route simple calls to smaller models.', gwP ? 'aigw' : 'llm', 'Pick an AI gateway that enforces budgets and caching.');
  if (ai !== 'none' && st.reg && !get('aigov')) add('Non-functional', 'Regulated AI use: classify each use case (for example under the EU AI Act), keep human oversight, and log model inputs, outputs and approvals.', comps.indexOf('aigov') >= 0 ? 'aigov' : null, 'Choose an AI governance platform and record each use case\'s risk class in an ADR.');
  if (ai === 'native' && llm && !get('guard') && comps.indexOf('guard') >= 0) add('Non-functional', 'Agents act without guardrails or evaluation: wrong or manipulated actions go unchecked.', 'guard', 'Pick a guardrail and evaluation option before agents touch real systems.');
  fitted.forEach(q => q.p.fit.filter(f => f.v <= -2).forEach(f => add('Non-functional', q.p.n + ' at your workload: ' + f.why, q.c, 'Pick an option that fits the Workload numbers, or record in an ADR why this one is still right.')));
  if (llm && comps.indexOf('llm') >= 0) { const Nw = workload; if (Nw.lat <= 200 && Nw.pattern === 'interactive') add('Non-functional', 'A model call takes from half a second to several seconds, but the latency budget is 200 ms. Keep AI off the request path: stream, precompute or answer asynchronously.', 'llm', 'Raise the latency budget for AI features in the Workload step, or design AI as a background task.'); }
  const saas = picks.filter(q => q.p.t.indexOf('saas') >= 0);
  if (st.reg && saas.length) add('Non-functional', saas.length + ' SaaS service(s) (' + saas.map(q => q.p.n).join(', ') + ') touch regulated data: confirm residency, GxP validation and exit terms.', saas[0].c, 'Pick a self-hosted or region-pinned option for regulated data.');
  if (st.scale === '50M') { const low = picks.filter(q => q.p.s[0] < 4); if (low.length) add('Non-functional', low.map(q => q.p.n).join(', ') + ' may cap out at 50M users.', low[0].c, 'Pick an option with scale 4 or 5.'); }
  const heavy = picks.filter(q => q.p.s[2] <= 2);
  if (heavy.length >= 3) add('Non-functional', heavy.map(q => q.p.n).join(', ') + ' are self-run platforms: needs a mature platform team and 24x7 on-call.', heavy[0].c, 'Swap one self-run platform for a managed service.');
  if (picks.length && avg[3] <= 2.6) { const lk = picks.slice().sort((a, b) => a.p.s[3] - b.p.s[3])[0]; add('Non-functional', 'High lock-in across the stack: an exit would mean re-platforming.', lk.c, 'Pick a more portable option here, the most locked-in choice.'); }
  if (picks.length && avg[1] <= 2.6) { const cs = picks.slice().sort((a, b) => a.p.s[1] - b.p.s[1])[0]; add('Non-functional', 'Licence and consumption costs dominate; model run cost at target scale before committing.', cs.c, 'Pick a lower-cost option here, the most expensive choice.'); }
  const avOf = p => p.k !== 'OSS' ? 0.9999 : (p.s[2] >= 4 ? 0.9995 : 0.999);
  const aiSoft = st.ai === 'native' ? ['aigov'] : ['llm','aigw','vec','guard','embai','aigov','agents','tools','mem'];
  const aiIsProduct = appComps.indexOf('llm') >= 0;
  const crit = picks.filter(q => nonCrit.indexOf(q.c) < 0 && (aiIsProduct || aiSoft.indexOf(q.c) < 0));
  const avail = crit.reduce((a, q) => a * avOf(q.p), 1);
  const target = parseFloat(st.avail) / 100; const meets = avail >= target;
  if (picks.length && !meets) { const weak = crit.slice().sort((a, b) => avOf(a.p) - avOf(b.p))[0]; add('Non-functional', 'Serial availability of the critical path is ' + (avail * 100).toFixed(3) + '%, below the ' + st.avail + '% target. Add redundancy or higher-SLA tiers on the critical path.', weak ? weak.c : null, 'Pick a managed tier for this critical-path component.'); }
  const cost = [1, 10, 60].map(m => Math.round(picks.reduce((a, q) => { const b = (6 - q.p.s[1]) + (q.p.k === 'OSS' && q.p.s[2] <= 2 ? 1.5 : 0); return a + b * (q.p.k === 'OSS' ? Math.pow(m, 0.8) : m); }, 0)));
  const base = avg.reduce((a, b) => a + b, 0) / 5 * 20;
  const realIssues = issues.filter(i => i.cat !== 'Functional').length;
  const overall = Math.max(0, Math.min(100, Math.round(base - realIssues * 4 - missing.length * 6)));
  const chain = crit.map(q => q.p.n + ' ' + (avOf(q.p) * 100).toFixed(2) + '%');
  return { avg, issues, overall, filled: picks.length, total: comps.length, picks, avail, meets, cost, heavy, saas, missing, base, realIssues, chain, fitted };
}
