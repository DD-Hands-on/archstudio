// The ArchStudio app: state, step logic and the view model the template renders.
// DCLogic comes from the runtime (src/runtime/dc-runtime.js), loaded before this bundle.
import { fmtW, fmtGBW } from '../engine/format.js';
import { fitFor, applyFit } from '../engine/fit-rules.js';
import { buildCatalogue } from '../engine/catalogue.js';
import { buildAdmContent } from '../engine/adm-content.js';
import { wlDefaults, workloadNumbers } from '../engine/workload.js';
import { evaluateOutcome } from '../engine/evaluate.js';
import { BOARD_ROLES } from '../app/board-roles.js';
import { TRACKS } from '../app/tracks.js';
import { localStore } from '../standalone/local-store.js';
import { AI_PROVIDERS, aiErr, makeLLM, loadAICfg, saveAICfg } from '../standalone/ai-providers.js';

const DCLogic = window.DCLogic;

export class Component extends DCLogic {
  state = { step: 'tour', level: 'beginner', plain: true, term: null, tourIdx: 0,
    app: 'ecom', text: '', custom: null, interp: null, interpMiss: false, scale: '1M', reg: false, cloud: 'aws', field: 'green', lens: 'system', avail: '99.95', ai: 'enabled',
    outcomes: [], outcomesApp: null, active: 0, chosen: null, guided: true, predict: {}, focus: null, work: {},
    reqStep: -1, reqHit: true, off: {}, drill: 'surge', stage: 0, capMat: {}, time: {}, quiz: {},
    chat: [], thinking: false, thinkStarted: false, flowSel: null, showCtx: false, showTpl: false, aiReady: false,
    mode: 'learn', teamView: 'flight', std: null, appr: {}, apprLocal: {}, openCard: null, showSamples: true, isLead: true, canWrite: true, uid: null,
    scenario: null, principles: null, stake: null, chg: {}, contractSigned: false,
    canvas: null, canvasSel: null, linkFrom: null, linkType: 'sync', palQ: '',
    board: null, boardVerdict: null, portfolio: [], names: {}, savedId: null, showPort: false, showFw: false, showMenu: false, showSide: false, portMsg: '', portErr: false, confirmDel: null, teamMsg: '',
    track: 'full', showAI: false, aiCfg: { provider: 'anthropic', model: 'claude-sonnet-5-5', key: '', url: '', remember: false }, aiSrc: 'none', aiTest: '', aiTestOk: null, aiTesting: false };

  componentDidMount() {
    this._host = !!(window.claude && typeof window.claude.use === 'function');
    try {
      if (this._host) {
        window.claude.use('sample').then(s => { this._sample = s || null; this.setState({ aiReady: !!s, aiSrc: s ? 'claude' : 'none' }); }).catch(() => { this._sample = null; });
      } else {
        const c = loadAICfg();
        if (c) {
          const cfg = Object.assign({ key: '', url: '' }, c);
          const ok = cfg.connected && (!AI_PROVIDERS[cfg.provider].key || cfg.key);
          if (ok) this._sample = makeLLM(cfg);
          this.setState({ aiCfg: cfg, aiSrc: ok ? 'byo' : 'none', aiReady: !!ok });
        }
      }
    } catch (e) { this._sample = null; }
    document.addEventListener('pointerdown', e => this.onPointerDown(e));
    document.addEventListener('pointermove', e => this.onPointerMove(e), { passive: false });
    document.addEventListener('pointerup', e => this.onPointerUp(e));
    document.addEventListener('pointercancel', () => { if (this._drag && this._drag.ghost) this._drag.ghost.remove(); this._drag = null; });
    document.addEventListener('click', e => { if (this._suppress) { e.stopPropagation(); e.preventDefault(); } }, true);
    this.initStore();
  }

  componentWillUnmount() { if (this._t) clearInterval(this._t); if (this._ctl) this._ctl.abort(); (this._unsubs || []).forEach(u => { try { u(); } catch (e) {} }); }

  aiName() { const c = this.state.aiCfg || {}; return this.state.aiSrc === 'byo' && AI_PROVIDERS[c.provider] ? AI_PROVIDERS[c.provider].s : 'Claude'; }

  byoErr(e, prov) {
    const c = this.state.aiCfg || {}; const id = prov || c.provider; const P = AI_PROVIDERS[id] || AI_PROVIDERS.anthropic; const n = P.n; const code = e && e.code; const d = e && e.detail ? ' (' + e.detail + ')' : '';
    if (code === 'bad_key') return n + ' did not accept the API key' + d + '. Check it in AI model settings.';
    if (code === 'network') return id === 'ollama' ? 'Could not reach Ollama. Check it is running at the address given and that OLLAMA_ORIGINS allows this site.' : 'Could not reach ' + n + '. Check your connection and try again.';
    if (code === 'rate_limited') return n + ' is busy or your usage limit was reached' + d + '. Try again later.';
    if (code === 'bad_json') return 'The model replied in an unexpected format. Try again, or choose a stronger model.';
    if (code === 'provider_error') return n + ' returned an error' + d + '. Check the model name.';
    return n + ' could not answer just now. Try again.';
  }

  setAICfg(patch) {
    const c = Object.assign({}, this.state.aiCfg, patch);
    if (patch.provider && patch.provider !== this.state.aiCfg.provider) { c.model = AI_PROVIDERS[patch.provider].model; c.url = AI_PROVIDERS[patch.provider].url || ''; }
    this.setState({ aiCfg: c, aiTest: '' });
    if ('remember' in patch && this.state.aiSrc === 'byo') saveAICfg(Object.assign({}, c, { connected: true }));
  }

  async connectAI() {
    if (this.state.aiTesting) return;
    const c = Object.assign({}, this.state.aiCfg); const P = AI_PROVIDERS[c.provider] || AI_PROVIDERS.anthropic;
    c.model = String(c.model || P.model).trim() || P.model; c.key = String(c.key || '').trim(); if (P.url) c.url = String(c.url || P.url).trim() || P.url;
    if (P.key && !c.key) { this.setState({ aiTest: 'Paste an API key first.', aiTestOk: false }); return; }
    this.setState({ aiTesting: true, aiTest: 'Checking the connection...', aiTestOk: null });
    const llm = makeLLM(c); const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 45000);
    try {
      const r = await llm.json('Reply with only this JSON object and nothing else: {"ok": true}', { signal: ctl.signal });
      if (!r || typeof r !== 'object') throw aiErr('bad_json');
      c.connected = true; this._sample = llm; saveAICfg(c);
      this.setState({ aiCfg: c, aiSrc: 'byo', aiReady: true, aiTesting: false, aiTestOk: true, aiTest: 'Connected to ' + P.n + ' (' + c.model + '). Briefs and the AI board now use it.' });
    } catch (e) {
      const msg = e && e.code === 'cancelled' ? 'No reply after 45 seconds. Check the address and model, then try again.' : this.byoErr(e, c.provider);
      this.setState({ aiTesting: false, aiTestOk: false, aiTest: msg });
    } finally { clearTimeout(t); }
  }

  disconnectAI() {
    const c = Object.assign({}, this.state.aiCfg, { key: '', connected: false });
    this._sample = null; saveAICfg(c);
    this.setState({ aiCfg: c, aiSrc: 'none', aiReady: false, aiTestOk: true, aiTest: 'Disconnected. The key is removed from this browser. Briefs use keyword matching.' });
  }

  aiVals() {
    const st = this.state; const c = st.aiCfg || {}; const cur = AI_PROVIDERS[c.provider] ? c.provider : 'anthropic'; const P = AI_PROVIDERS[cur];
    const byo = st.aiSrc === 'byo';
    return { canSetupAI: !this._host, showAI: !!st.showAI && !this._host,
      openAI: () => { this.setState({ showAI: true, showMenu: false, aiTest: '' }); try { window.scrollTo({ top: 0 }); } catch (e) {} },
      closeAI: () => this.setState({ showAI: false }),
      aiBtnLabel: byo ? 'Change AI model' : 'Connect an AI model',
      aiStatus: st.aiSrc === 'claude' ? 'Claude, through this page' : byo ? AI_PROVIDERS[c.provider].n + ' · ' + c.model : 'Not connected. Briefs use keyword matching.',
      aiProv: Object.keys(AI_PROVIDERS).map(id => { const on = id === cur; return { n: AI_PROVIDERS[id].n, on: on ? 'true' : 'false', pick: () => this.setAICfg({ provider: id }),
        bd: on ? 'var(--accent)' : 'var(--hair)', bg: on ? 'var(--accent-soft)' : 'var(--surface)', fg: on ? 'var(--accent-ink)' : 'var(--ink)' }; }),
      aiHelp: P.help, aiProvName: P.n, aiKeyLink: P.link, aiLinkLabel: P.key ? 'Get a key' : 'Download Ollama',
      aiNeedsKey: !!P.key, aiNeedsUrl: !!P.url, aiKey: c.key || '', aiModel: c.model || P.model, aiUrl: c.url || P.url || '',
      onAIKey: e => this.setAICfg({ key: e.target.value }), onAIModel: e => this.setAICfg({ model: e.target.value }), onAIUrl: e => this.setAICfg({ url: e.target.value }),
      aiRemember: c.remember ? 'true' : 'false', toggleRemember: () => this.setAICfg({ remember: !c.remember }),
      aiConnect: () => this.connectAI(), aiConnectLabel: st.aiTesting ? 'Checking...' : byo ? 'Save and test again' : 'Connect and test',
      aiConnected: byo, disconnectAI: () => this.disconnectAI(),
      hasAITest: !!st.aiTest, aiTest: st.aiTest || '', aiTestBg: st.aiTestOk === false ? 'var(--bad-soft)' : st.aiTestOk ? 'var(--good-soft)' : 'var(--fill)', aiTestFg: st.aiTestOk === false ? 'var(--bad)' : st.aiTestOk ? 'var(--good)' : 'var(--ink-2)' };
  }

  buildPrompt(chat) {
    const D = this.data();
    const models = Object.keys(D.apps).map(k => '- ' + k + ': ' + D.apps[k].n + '. ' + D.apps[k].d).join('\n');
    const comps = Object.keys(D.cat).map(k => '- ' + k + ': ' + D.cat[k].l + '. ' + D.cat[k].need).join('\n');
    const convo = chat.slice(-10).map(m => m.role === 'user' ? 'User: ' + m.text : (m.role === 'studio' ? 'Studio (your earlier reading): ' + m.summary : '')).filter(Boolean).join('\n');
    return 'You are the brief interpreter inside an architecture design studio used by aspiring and practising architects. ' +
      'Read the conversation and turn the user\'s latest intent into a design brief that uses ONLY the studio catalogue below. ' +
      'Accept any kind of input: a product idea, a company or style to emulate, an enterprise implementation (ERP, HR, CRM, ITSM, procurement), a business problem, or a refinement of the earlier reading. ' +
      'If the user refines, keep everything from the earlier reading that they did not change.\n\n' +
      (this.state.lens === 'enterprise' ? 'The user works enterprise portfolio first: read the brief in terms of business capabilities, the existing application estate, systems to retire and enterprise standards, and ask clarifying questions about those rather than about load or latency.\n\n' : 'The user works system first: read the brief in terms of one system, its users, load, data and building blocks, and ask clarifying questions about those.\n\n') +
      'REFERENCE MODELS (choose the closest as base, or "custom"):\n' + models + '\n\n' +
      'COMPONENT CATALOGUE (use only these ids):\n' + comps + '\n\n' +
      'CONVERSATION (oldest first):\n' + convo + '\n\n' +
      'Reply with only one JSON object in this shape:\n' +
      '{"title": "short name, max 8 words", "understanding": "2 or 3 plain sentences restating what they want to build and why", ' +
      '"base": "one reference model id or custom", "components": ["5 to 16 catalogue ids the design needs; omit generic AI ids unless AI is central, the studio adds AI parts from the posture"], ' +
      '"settings": {"ai": "none|enabled|native", "reg": true, "field": "green|brown", "scale": "10k|1M|50M", "cloud": "aws|azure|multi", "avail": "99.9|99.95|99.99"}, ' +
      '"request": "one typical user journey, lower case, e.g. a buyer posts a purchase order", ' +
      '"flows": [{"from": "id", "to": "id", "type": "sync|async|batch", "label": "2 to 4 words"}], ' +
      '"assumptions": ["up to 3 short assumptions"], "notCovered": ["parts of the brief the catalogue cannot represent"], ' +
      '"questions": ["up to 2 short clarifying questions that would most change the design"]}\n' +
      'Include in settings only what the conversation implies. Give up to 14 flows for the most important interactions. Use British spelling. Do not use em dashes.';
  }

  async send(raw) {
    const text = String(raw != null ? raw : this.state.text).trim();
    if (!text || this.state.thinking) return;
    const chat = this.state.chat.concat([{ role: 'user', text }]);
    const allUser = chat.filter(m => m.role === 'user').map(m => m.text).join('. ');
    this.setState({ chat, text: '', interpMiss: false });
    if (!this._sample) { this.interpret(allUser, 'Keyword matching', chat); return; }
    const ctl = new AbortController(); this._ctl = ctl;
    this.setState({ thinking: true, thinkStarted: false });
    try {
      const res = await this._sample.json(this.buildPrompt(chat), { signal: ctl.signal, cache: false, onText: () => { if (!this.state.thinkStarted) this.setState({ thinkStarted: true }); } });
      this.applyAI(res, chat);
    } catch (e) {
      const code = e && e.code;
      if (code === 'cancelled') { this.setState({ thinking: false, chat: chat.concat([{ role: 'note', text: 'Stopped. Send again when ready.' }]) }); return; }
      const gone = ['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].indexOf(code) >= 0;
      if (gone) { this._sample = null; this.setState({ aiReady: false }); }
      const why = this.state.aiSrc === 'byo' && code !== 'cancelled' ? this.byoErr(e) + ' I used keyword matching for now.' : gone ? 'Claude is not available in this view, so I used keyword matching.' : code === 'rate_limited' ? 'Claude is busy or your usage limit was reached, so I used keyword matching. Try again later.' : 'Claude could not answer just now, so I used keyword matching. You can send again.';
      this.setState({ thinking: false });
      this.interpret(allUser, 'Keyword matching', chat.concat([{ role: 'note', text: why }]));
    }
  }

  applyAI(res, chat) {
    const D = this.data(); const r = res && typeof res === 'object' ? res : {};
    const list = v => Array.isArray(v) ? v.map(x => String(x)).filter(Boolean) : [];
    const comps = list(r.components).filter(c => D.cat[c]).filter((c, i, a) => a.indexOf(c) === i);
    const baseKey = D.apps[r.base] ? r.base : null;
    const generic = { req: 'a user makes a request', caps: ['Customer engagement','Core operations','Insight and reporting','Partner integration'],
      nb: [['ERP','Finance and operations','batch or API'],['CRM','Customer records','REST API'],['Identity platform','Workforce and customer SSO','OIDC'],['Enterprise data platform','Analytics','change-data-capture']],
      dom: ['Customer','Transaction','Reference data'], shelf: [], sig: [] };
    const base = baseKey ? D.apps[baseKey] : generic;
    const c = comps.length >= 3 ? comps : (baseKey ? base.c.slice() : ['ui','gw','idp','app','db','obs']);
    const flows = (Array.isArray(r.flows) ? r.flows : []).filter(f => f && D.cat[f.from] && D.cat[f.to] && f.from !== f.to && ['sync','async','batch'].indexOf(f.type) >= 0)
      .slice(0, 20).map(f => ({ from: f.from, to: f.to, type: f.type, label: String(f.label || '').slice(0, 40) }));
    const s = r.settings && typeof r.settings === 'object' ? r.settings : {};
    const flags = {}; const applied = [];
    const pick = (key, ok, label) => { if (s[key] !== undefined && ok.indexOf(s[key]) >= 0) { flags[key] = s[key]; applied.push(label(s[key])); } };
    pick('ai', ['none','enabled','native'], v => ({ none: 'no AI', enabled: 'AI-enabled', native: 'AI-native' })[v]);
    pick('reg', [true, false], v => v ? 'regulated data' : 'standard data');
    pick('field', ['green','brown'], v => v === 'brown' ? 'brownfield' : 'greenfield');
    pick('scale', ['10k','1M','50M'], v => v + ' users');
    pick('cloud', ['aws','azure','multi'], v => ({ aws: 'AWS first', azure: 'Azure first', multi: 'multi-cloud' })[v]);
    pick('avail', ['99.9','99.95','99.99'], v => v + '% availability');
    const lastUser = chat.filter(m => m.role === 'user').slice(-1)[0];
    const title = String(r.title || (lastUser ? lastUser.text : 'Custom design')).slice(0, 70);
    const custom = Object.assign({}, base, { n: title, d: 'Interpreted by ' + this.aiName() + ' from your brief.', c, flows, req: r.request ? String(r.request).slice(0, 90) : base.req });
    const understanding = String(r.understanding || '').slice(0, 600);
    const msg = { role: 'studio', title, understanding, base: baseKey ? base.n : 'A custom design', comps: c.map(x => D.cat[x].l).join(', '), applied: applied.join(', ') || 'none',
      assumptions: list(r.assumptions).slice(0, 3), gaps: list(r.notCovered).slice(0, 4), questions: list(r.questions).slice(0, 2), mode: 'Interpreted by ' + this.aiName(),
      summary: title + '. ' + understanding + ' Components: ' + c.join(', ') + '. Settings: ' + (applied.join(', ') || 'unchanged') + '.' };
    this.setState(Object.assign({ app: 'custom', custom, chat: chat.concat([msg]), thinking: false, interp: null,
      outcomes: [], outcomesApp: null, active: 0, chosen: null, capMat: {}, time: {}, off: {}, reqStep: -1, predict: {}, focus: null, flowSel: null }, flags));
  }

  wlDefaults(A) { return wlDefaults(A); }

  wlNums() { return workloadNumbers(this.getApp(), this.state); }

  // The catalogue options for a building block, with scores adjusted to the current workload
  fitOpts(cid) {
    const N = this.wlNums(); const cache = this._fitCache && this._fitCache.key === N.key ? this._fitCache : (this._fitCache = { key: N.key, m: {} });
    if (!cache.m[cid]) cache.m[cid] = this.data().cat[cid].o.map(o => applyFit(o, fitFor(cid, o, N)));
    return cache.m[cid];
  }

  editComps(cid, add) {
    const A = this.getApp();
    const c = add ? (A.c.indexOf(cid) < 0 ? A.c.concat([cid]) : A.c.slice()) : A.c.filter(x => x !== cid);
    const forced = add ? (A.forced || []).concat([cid]) : (A.forced || []).filter(x => x !== cid);
    const removed = add ? (A.removed || []).filter(x => x !== cid) : (A.removed || []).concat([cid]);
    const custom = Object.assign({}, A, { c, forced, removed });
    this.setState({ app: 'custom', custom, outcomes: [], outcomesApp: null, active: 0, chosen: null, off: {}, reqStep: -1, focus: null, flowSel: null, canvas: null, canvasSel: null, linkFrom: null });
  }

  flowEdges(comps) {
    const st = this.state; const A = this.getApp();
    const has = c => comps.indexOf(c) >= 0; const E = []; const seen = {};
    const add = (a, b, type, label) => { if (!a || !b || !has(a) || !has(b) || a === b) return; const k = [a, b].sort().join('|'); if (seen[k]) return; seen[k] = 1; E.push({ from: a, to: b, type, label }); };
    (A.flows || []).forEach(f => add(f.from, f.to, f.type, f.label));
    add('obs', 'aiops', 'async', 'alerts'); add('aiops', 'itsm', 'sync', 'correlated incidents'); add('itsm', 'runbook', 'sync', 'approved fixes');
    add('tools', 'runbook', 'sync', 'fix requests'); add('agents', 'aiops', 'sync', 'related alerts');
    const entry = ['ui','ux','bi'].find(has);
    const front = [entry, 'edge', 'lb', 'gw'].filter(c => c && has(c));
    for (let i = 0; i < front.length - 1; i++) add(front[i], front[i + 1], 'sync', i === 0 ? 'user requests' : 'forwards traffic');
    const door = front[front.length - 1] || entry;
    const implCores = ['erpcore','hcm','crmcore','itsm','p2p'].filter(has);
    const cores = implCores.length ? implCores : ['app','ingest'].filter(has);
    const mainCore = cores[0];
    if (has('ext')) { add(door, 'ext', 'sync', 'custom apps'); implCores.forEach(c => add('ext', c, 'sync', 'APIs and events')); }
    cores.forEach(c => add(door, c, 'sync', c === 'ingest' ? 'device messages' : 'transactions'));
    if (!cores.length && has('orch')) add(door, 'orch', 'sync', 'questions');
    add(door, 'idp', 'sync', 'sign-in and tokens'); if (!door) add(entry, 'idp', 'sync', 'sign-in');
    ['db','cache','nosql','search','geo'].forEach(d => add('app', d, 'sync', d === 'cache' ? 'hot reads' : d === 'search' ? 'search queries' : d === 'geo' ? 'nearby lookups' : 'reads and writes'));
    add('app', 'orch', 'sync', 'questions'); add('orch', 'vec', 'sync', 'retrieval'); add('orch', 'db', 'sync', 'history');
    add('app', 'media', 'sync', 'playback URLs'); add('media', 'edge', 'batch', 'video segments'); add('app', 'reco', 'sync', 'rankings');
    add('app', 'mq', 'async', 'publishes events'); add('ingest', 'mq', 'async', 'telemetry'); add('mq', 'stream', 'async', 'event stream');
    if (!has('mq')) add('ingest', 'stream', 'async', 'telemetry');
    add('stream', 'tsdb', 'async', 'aggregates'); add('mq', 'reco', 'async', 'behaviour signals'); add('mq', 'lake', 'async', 'event history');
    add('integ', 'lake', 'batch', 'scheduled loads'); add('bi', 'lake', 'sync', 'queries'); add('catalog', 'lake', 'batch', 'metadata and lineage');
    implCores.forEach(c => { add(c, 'mdm', 'sync', 'master data'); add(c, 'ipaas', 'async', 'business events'); add('grc', c, 'sync', 'access checks'); add('alm', c, 'batch', 'tests and releases'); add(c, 'proc', 'batch', 'event logs'); });
    add('p2p', 'erpcore', 'sync', 'orders and invoices'); add('hcm', 'payroll', 'batch', 'pay run inputs'); add('hcm', 'talent', 'async', 'new hire');
    if (mainCore) add('migr', mainCore, 'batch', 'one-off data loads');
    if (has('lake')) { implCores.slice(0, 2).forEach(c => add(c, 'lake', 'batch', 'analytics feed')); add('bi', 'lake', 'sync', 'queries'); }
    else implCores.slice(0, 1).forEach(c => add('bi', c, 'sync', 'reports'));
    if (entry === 'bi' && has('lake')) add('bi', 'lake', 'sync', 'queries');
    const caller = st.ai === 'native' ? 'agents' : (has('embai') ? 'embai' : (has('orch') ? 'orch' : 'app'));
    if (st.ai === 'native') { add(entry, 'agents', 'sync', 'tasks and approvals'); add('agents', 'tools', 'sync', 'tool calls'); (implCores.length ? implCores : ['app']).forEach(c => add('tools', c, 'sync', 'governed actions')); add('agents', 'mem', 'sync', 'context'); add('agents', 'vec', 'sync', 'retrieval'); }
    if (has('embai')) implCores.forEach(c => add(c, 'embai', 'sync', 'in-app copilot'));
    if (has('aigw')) { add(caller, 'aigw', 'sync', 'prompts'); add('aigw', 'llm', 'sync', 'model calls'); add('aigw', 'guard', 'sync', 'safety checks'); add('aigw', 'aigov', 'async', 'usage and model log'); }
    else { add(caller, 'llm', 'sync', 'model calls'); add(caller, 'guard', 'sync', 'safety checks'); add(caller, 'aigov', 'async', 'usage log'); }
    add(mainCore || door, 'obs', 'async', 'telemetry');
    return E;
  }

  data() {
    if (!this._d) this._d = buildCatalogue();
    return this._d;
  }

  getApp() { const st = this.state; return st.app === 'custom' && st.custom ? st.custom : this.data().apps[st.app]; }

  comps(capOverride) {
    const D = this.data(); const A = this.getApp();
    const cap = capOverride || { beginner: 1, intermediate: 2, advanced: 3 }[this.state.level];
    const ai = this.state.ai; const impl = A.kind === 'impl';
    const aiAdd = ai === 'none' ? [] : (impl ? (ai === 'native' ? ['agents','tools','aigw','llm','guard','aigov','embai'] : ['embai','aigw','guard','aigov'])
      : (ai === 'native' ? ['agents','tools','mem','aigw','llm','vec','guard','aigov'] : ['aigw','llm','vec','guard','aigov']));
    const forced = A.forced || [], removed = A.removed || [];
    const all = A.c.concat(aiAdd.filter(x => A.c.indexOf(x) < 0)).filter(x => removed.indexOf(x) < 0);
    const c = all.filter(x => (D.lvlOf[x] || 1) <= cap || forced.indexOf(x) >= 0);
    if (!c.some(x => D.cat[x].layer === 'data')) { const d = A.c.find(x => D.cat[x].layer === 'data'); if (d) c.push(d); }
    return c;
  }

  allSteps() {
    if (this.state.lens === 'enterprise') return [['tour','Start here',1,''],['principles','Principles',1,'Prelim'],['brief','Brief',1,'A'],['vision','Vision',1,'A'],['enterprise','Business',1,'B'],['blueprint','Blueprint',1,'C D'],['canvas','Canvas',1,'C D'],['outcomes','Outcomes',1,'E'],['compare','Compare',1,'E'],['gap','Gap and roadmap',1,'E F'],['decisions','Decisions',2,'E'],['workload','Workload',2,'R'],['evolve','Evolve',2,'F'],['drill','Drill',2,'G'],['board','AI board',1,'G'],['review','Review',3,'G'],['change','Change',3,'H']];
    return [['tour','Start here',1,''],['principles','Principles',1,'Prelim'],['brief','Brief',1,'A'],['vision','Vision',1,'A'],['workload','Workload',1,'R'],['enterprise','Business',2,'B'],['blueprint','Blueprint',1,'C D'],['canvas','Canvas',1,'C D'],['outcomes','Outcomes',1,'E'],['compare','Compare',1,'E'],['decisions','Decisions',2,'E'],['gap','Gap and roadmap',2,'E F'],['evolve','Evolve',2,'F'],['drill','Drill',2,'G'],['board','AI board',1,'G'],['review','Review',3,'G'],['change','Change',3,'H']];
  }

  visibleSteps(level) {
    const cap = { beginner: 1, intermediate: 2, advanced: 3 }[level || this.state.level];
    const T = TRACKS[this.state.track];
    if (T && T.steps) {
      const all = this.allSteps(); const byId = {}; all.forEach(x => { byId[x[0]] = x; });
      return (cap === 1 ? [byId.tour] : []).concat(T.steps.map(x => byId[x[0]]).filter(Boolean));
    }
    return this.allSteps().filter(s => s[2] <= cap && (s[0] !== 'tour' || cap === 1));
  }

  pickTrack(id) {
    const T = TRACKS[id]; if (!T) return;
    const patch = { track: id, showMenu: false };
    if (T.lens) patch.lens = T.lens;
    if (T.steps) patch.step = T.steps[0][0];
    this.setState(patch);
    try { window.scrollTo({ top: 0 }); } catch (e) {}
  }

  trackVals() {
    const st = this.state; const cur = TRACKS[st.track] ? st.track : 'full';
    const opts = ['interview', 'tradeoff', 'full'].map(id => { const T = TRACKS[id]; const on = id === cur;
      return { n: T.n, t: T.t, d: T.d, on: on ? 'true' : 'false', pick: () => this.pickTrack(id),
        path: T.steps ? T.steps.map(x => this.allSteps().find(a => a[0] === x[0])[1]).join(' › ') : (st.lens === 'enterprise' ? 'Portfolio first · all steps' : 'System first · all steps'),
        bd: on ? 'var(--accent)' : 'var(--hair)', bg: on ? 'var(--accent-soft)' : 'var(--surface)', ring: on ? '0 0 0 1px var(--accent)' : 'none' }; });
    const T = TRACKS[cur];
    return { trackOpts: opts, inTrack: !!T.steps, trackName: T.n, trackLine: T.steps ? T.n + ' · ' + T.t.toLowerCase() : '',
      fullJourney: () => this.pickTrack('full') };
  }

  setLevel(level) {
    const vis = this.visibleSteps(level).map(s => s[0]);
    this.setState({ level, step: vis.indexOf(this.state.step) >= 0 ? this.state.step : 'brief', focus: null });
  }

  interpret(raw, mode, chatIn) {
    const D = this.data();
    const text = (raw || '').trim();
    if (!text) { this.setState({ interpMiss: true }); return; }
    const t = ' ' + text.toLowerCase() + ' ';
    const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    const hit = k => new RegExp('[^a-z0-9]' + esc(k)).test(t);
    const scored = D.patterns.map(p => ({ p, sc: p.keys.filter(hit).length })).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc);
    const best = scored.length ? scored[0].p : null;
    const isImpl = best && D.implKeys.indexOf(best.app) >= 0;
    const extra = [];
    D.traits.forEach(([keys, comps]) => {
      if (isImpl && comps.indexOf('llm') < 0 && comps.indexOf('bi') < 0) return;
      if (keys.some(hit)) comps.forEach(c => { if (extra.indexOf(c) < 0) extra.push(c); });
    });
    const flags = {}; const applied = [];
    if (/brownfield|[^a-z]ecc[^a-z]|conversion/.test(t)) { flags.field = 'brown'; applied.push('brownfield starting point'); }
    else if (/greenfield/.test(t)) { flags.field = 'green'; applied.push('greenfield starting point'); }
    if (/gxp|pharma|regulated|[^a-z]fda[^a-z]|clinical|hipaa|[^a-z]pii[^a-z]|medical|life science|biotech/.test(t)) { flags.reg = true; applied.push('regulated data (GxP, PII)'); }
    if (/ai-native|ai native|agentic|autonomous agent|agent-first/.test(t)) { flags.ai = 'native'; applied.push('AI-native posture'); }
    else if (/ai-enabled|ai enabled|copilot|genai|[^a-z]ai[^a-z]|[^a-z]llm/.test(t)) { flags.ai = 'enabled'; applied.push('AI-enabled posture'); }
    let base, c, baseName;
    if (best) { base = D.apps[best.app]; baseName = base.n; c = base.c.slice(); }
    else {
      baseName = extra.length ? 'No known pattern, so composed from your keywords' : 'Nothing recognised, so this is a generic core blueprint';
      base = { req: 'a user makes a request', caps: ['Customer engagement','Core operations','Insight and reporting','Partner integration'],
        nb: [['ERP','Finance and operations','batch or API'],['CRM','Customer records','REST API'],['Identity platform','Workforce and customer SSO','OIDC'],['Enterprise data platform','Analytics','change-data-capture']],
        dom: ['Customer','Transaction','Reference data'], shelf: [], sig: [] };
      c = ['ui','gw','idp','app','db','obs'];
    }
    const merged = [];
    if (best) scored.slice(1).forEach(x => {
      if (D.implKeys.indexOf(x.p.app) < 0 || x.p.app === best.app) return;
      const a = D.apps[x.p.app]; let addedAny = false;
      a.c.forEach(cc => { if (c.indexOf(cc) < 0) { c.push(cc); addedAny = true; } });
      merged.push(a.n + (addedAny ? '' : ' (already covered)'));
    });
    const added = extra.filter(x => c.indexOf(x) < 0 && D.cat[x]);
    c = c.concat(added);
    if (c.indexOf('vec') >= 0 && c.indexOf('llm') < 0) c.push('llm');
    const stop = ['the','and','for','with','our','new','how','does','what','style','that','this','like','architecture','system','systems','platform','application','build','want','using','based','from','have','will','into','also','some','very','which','their','them','where','design','implementation','implement','scale','large','company','enterprise','global','across','its','are','can','all','help','need','understand','happens','plus','rollout','rollouts','it','an','in','of','to','on','we','my','is','be','set','up'];
    const flagWords = ['brownfield','greenfield','ecc','conversion','gxp','pharma','regulated','fda','clinical','hipaa','pii','medical','life','science','biotech','ai-native','native','agentic','autonomous','agent-first','ai-enabled','enabled','copilot','ai'];
    const allKeys = [].concat.apply([], D.patterns.map(p => p.keys)).concat([].concat.apply([], D.traits.map(x => x[0]))).concat(flagWords);
    const words = text.toLowerCase().split(/[^a-z0-9\/-]+/).filter(w => w.length >= 2 && stop.indexOf(w) < 0);
    const unused = words.filter(w => !allKeys.some(k => k === w || w.indexOf(k) === 0 || k.split(' ').indexOf(w) >= 0)).filter((w, i, arr) => arr.indexOf(w) === i);
    const title = text.charAt(0).toUpperCase() + text.slice(1, 70);
    const custom = Object.assign({}, base, { n: title, d: 'Interpreted from your brief.', c });
    const note = best ? 'Signature patterns and sources are on the Blueprint step. Refine your words and interpret again at any time.' :
      'I did not recognise a known pattern. Try naming the system type (ERP, HR, CRM, ITSM, procurement), a style (streaming, marketplace, multi-agent, IoT) or a product (SAP, Workday, ServiceNow).';
    const kwMsg = { role: 'studio', title, understanding: best ? 'I matched your words to the ' + baseName + ' model' + (merged.length ? ', combined with ' + merged.join(', ') : '') + '.' : note,
      base: baseName, comps: c.map(x => D.cat[x].l).join(', '), applied: applied.join(', ') || 'none', assumptions: [],
      gaps: unused.length ? ['Words I could not use: ' + unused.join(', ') + '. Company names are not looked up; add the industry instead.'] : [],
      questions: [], mode: mode || 'Keyword matching', summary: title + '. Components: ' + c.join(', ') + '.' };
    this.setState(Object.assign({ app: 'custom', custom, interpMiss: false, chat: (chatIn || this.state.chat).concat([kwMsg]), thinking: false,
      interp: { title, base: baseName, added: added.length ? added.map(x => D.cat[x].l.toLowerCase()).join(', ') : 'nothing beyond the pattern',
        merged: merged.join(', '), hasMerged: merged.length > 0, applied: applied.join(', '), hasApplied: applied.length > 0,
        unused: unused.join(', '), hasUnused: unused.length > 0, note },
      outcomes: [], outcomesApp: null, active: 0, chosen: null, capMat: {}, time: {}, off: {}, reqStep: -1, predict: {}, focus: null }, flags));
  }

  platformOf(picks) {
    const C = this.data().cat; const names = [];
    Object.keys(picks).forEach(c => { if (c !== 'embai' && c !== 'ux' && C[c] && C[c].o[picks[c]]) names.push(C[c].o[picks[c]]); });
    if (names.some(p => p.n.indexOf('ServiceNow') >= 0)) return 'servicenow';
    if (names.some(p => p.n.indexOf('Salesforce') >= 0)) return 'salesforce';
    if (names.some(p => p.t.indexOf('sap') >= 0 && ['ipaas','alm','migr','proc','mdm','grc','ext'].every(x => C[x].o.indexOf(p) < 0))) return 'sap';
    if (names.some(p => p.t.indexOf('azure') >= 0)) return 'microsoft';
    return 'other';
  }

  pickIdx(kind, cid, picks) {
    const opts = this.fitOpts(cid); const cloud = this.state.cloud;
    const plat = this.platformOf(picks || {});
    const byName = s => opts.findIndex(o => o.n.indexOf(s) >= 0);
    if (cid === 'embai') return byName({ sap: 'Joule', salesforce: 'Agentforce', servicenow: 'Now Assist', microsoft: 'Copilot Studio', other: 'Copilot Studio' }[plat]);
    if (cid === 'ux') return plat === 'sap' ? byName('Fiori') : (kind === 'managed' || plat === 'microsoft' ? byName('Teams') : byName('React'));
    let i = -1;
    const sum = o => o.s.reduce((x, y) => x + y, 0);
    const bestOf = idx => idx.length ? idx.slice().sort((x, y) => sum(opts[y]) - sum(opts[x]) || opts[x].n.localeCompare(opts[y].n))[0] : -1;
    const clouds = ['aws', 'azure', 'gcp']; const bound = o => clouds.some(c => o.t.indexOf(c) >= 0);
    let all = opts.map((_, j) => j);
    // A vendor the user named in the brief is honoured for managed and scale fills
    const A = this.getApp(); const said = ((A && A.n) || '') + ' ' + (this.state.chat || []).filter(m => m.role === 'user').map(m => m.text).join(' ');
    const vendors = ['SAP', 'Oracle', 'Workday', 'ServiceNow', 'Salesforce', 'Coupa', 'Jira', 'Microsoft', 'Google', 'Amazon', 'OpenAI', 'Claude', 'Datadog', 'Snowflake', 'Databricks'];
    const named = vendors.filter(v => new RegExp('\\b' + v + '\\b', 'i').test(said));
    const hinted = all.filter(j => named.some(v => opts[j].n.toLowerCase().indexOf(v.toLowerCase()) >= 0));
    if (kind !== 'oss' && hinted.length) all = hinted;
    if (kind === 'oss') i = bestOf(all.filter(j => opts[j].k === 'OSS'));
    if (kind === 'managed') {
      const prop = all.filter(j => opts[j].k !== 'OSS');
      if (cloud !== 'multi') i = bestOf(prop.filter(j => opts[j].t.indexOf(cloud) >= 0));
      if (i < 0) i = bestOf(prop.filter(j => !bound(opts[j])));
      if (i < 0 && cloud === 'multi') i = bestOf(all.filter(j => opts[j].k === 'OSS'));
      if (i < 0) i = bestOf(prop);
    }
    if (kind === 'scale') i = all.slice().sort((x, y) => (opts[y].s[0] * 10 + opts[y].s[4]) - (opts[x].s[0] * 10 + opts[x].s[4]) || opts[x].n.localeCompare(opts[y].n))[0];
    return i < 0 ? 0 : i;
  }

  build(kind) {
    const picks = {}; if (kind === 'clear') return picks;
    const cs = this.comps(); const later = ['embai','ux'];
    cs.filter(c => later.indexOf(c) < 0).concat(cs.filter(c => later.indexOf(c) >= 0)).forEach(c => { picks[c] = this.pickIdx(kind, c, picks); });
    return picks;
  }

  getOuts() {
    const st = this.state;
    if (st.outcomesApp === st.app && st.outcomes.length) return st.outcomes;
    return st.guided ? [{ picks: {} }] : [{ picks: this.build('oss') }, { picks: this.build('managed') }];
  }
  setOuts(outs, extra) { this.setState(Object.assign({ outcomes: outs, outcomesApp: this.state.app }, extra || {})); }
  cloneOuts() { return this.getOuts().map(o => ({ picks: Object.assign({}, o.picks) })); }

  evalOut(o) {
    const D = this.data();
    return evaluateOutcome({ o, st: this.state, comps: this.comps(), appComps: this.getApp().c, cat: D.cat, nonCrit: D.nonCrit, fitOpts: c => this.fitOpts(c), workload: this.wlNums() });
  }

  // ---------- ADM content ----------
  admData() {
    if (!this._adm) this._adm = buildAdmContent();
    return this._adm;
  }

  ensureAdm(D) {
    if (D._admMerged) return;
    const G = this.admData().glossary;
    Object.keys(G).forEach(k => { D.glossary[k] = G[k]; });
    const add = (step, keys) => { D.stepTerms[step] = (D.stepTerms[step] || []).concat(keys); };
    add('principles', ['adm', 'principle']); add('vision', ['stakemap']); add('canvas', ['sbb']); add('gap', ['gapan', 'plateau']); add('review', ['contract']); add('change', ['chg']);
    D._admMerged = true;
  }

  scen() { const id = this.state.scenario; return id ? this.admData().scenarios.find(s => s.id === id) || null : null; }

  pickScenario(id) {
    const s = this.admData().scenarios.find(x => x.id === id); if (!s) return;
    this.setState(Object.assign({ briefChosen: true, scenario: id, app: s.app, active: 0, chosen: null, capMat: {}, time: {}, off: {}, reqStep: -1, predict: {}, focus: null, canvas: null, canvasSel: null, linkFrom: null, chg: {}, stake: null, contractSigned: false, savedId: null, board: null, boardVerdict: null }, s.set));
  }

  prinOn() { const st = this.state; if (st.principles) return st.principles; const m = {}; this.admData().defaultOn.forEach(k => { m[k] = true; }); return m; }

  // ---------- Team standards ----------
  libNone() { return !this.state.std && (this.state.stdLib || 'none') === 'none'; }

  // Standards come from the team (Team mode), from an example library the learner loads, or from nowhere.
  // Nothing is preferred by default. Example libraries follow a written rule, and ties are broken alphabetically.
  stdMap() {
    if (this.state.std) return this.state.std;
    const D = this.data(); const m = {}; const lib = this.state.stdLib || 'none';
    if (lib === 'none') { Object.keys(D.cat).forEach(k => { m[k] = { i: -1, status: 'none' }; }); return m; }
    const review = ['agents', 'tools', 'mem', 'llm', 'vec', 'aigw', 'orch'];
    const sum = o => o.s.reduce((x, y) => x + y, 0);
    const rank = (opts, idx) => idx.slice().sort((x, y) => sum(opts[y]) - sum(opts[x]) || opts[x].n.localeCompare(opts[y].n))[0];
    const prefer = { sapms: o => o.t.indexOf('sap') >= 0 ? 2 : o.t.indexOf('azure') >= 0 ? 1 : 0, aws: o => o.t.indexOf('aws') >= 0 ? 1 : 0, oss: o => o.k === 'OSS' ? 1 : 0 }[lib] || (() => 0);
    // Core business platforms follow a vendor named in the brief, such as SAP or ServiceNow
    const A = this.getApp(); const said = ((A && A.n) || '') + ' ' + (this.state.chat || []).filter(x => x.role === 'user').map(x => x.text).join(' ');
    const named = ['SAP', 'Oracle', 'Workday', 'ServiceNow', 'Salesforce', 'Coupa', 'Jira', 'Microsoft'].filter(v => new RegExp('\\b' + v + '\\b', 'i').test(said));
    const coreK = ['erpcore', 'hcm', 'payroll', 'crmcore', 'itsm', 'p2p'];
    const pickFor = (k, plat) => {
      const opts = D.cat[k].o; let idx = opts.map((_, j) => j);
      if (coreK.indexOf(k) >= 0) { const h = idx.filter(j => named.some(v => opts[j].n.toLowerCase().indexOf(v.toLowerCase()) >= 0)); if (h.length) idx = h; }
      if (k === 'ux') idx = idx.filter(j => opts[j].t.indexOf('sap') < 0 || plat === 'sap');
      if (k === 'embai') { const want = { sap: 'Joule', salesforce: 'Agentforce', servicenow: 'Now Assist' }[plat] || 'Copilot Studio'; idx = idx.filter(j => opts[j].n.indexOf(want) >= 0); }
      const top = Math.max.apply(null, idx.map(j => prefer(opts[j])));
      return rank(opts, idx.filter(j => prefer(opts[j]) === top));
    };
    Object.keys(D.cat).filter(k => k !== 'ux' && k !== 'embai').forEach(k => { m[k] = { i: pickFor(k, null), status: review.indexOf(k) >= 0 ? 'review' : 'approved' }; });
    // Platform-bound blocks (user experience, embedded AI) follow the platform this design actually uses
    const ds = this.designState(); const core = {};
    ds.comps.forEach(k => { if (k !== 'ux' && k !== 'embai' && m[k]) core[k] = ds.picks[k] != null ? ds.picks[k] : m[k].i; });
    const plat = this.platformOf(core);
    ['ux', 'embai'].forEach(k => { m[k] = { i: pickFor(k, plat), status: 'approved' }; });
    if (plat === 'other' && lib !== 'sapms') m.embai = { i: -1, status: 'none' };
    return m;
  }

  checkDesign(cids, pickOf) {
    const D = this.data(); const std = this.stdMap();
    const checks = (cids || []).filter(c => D.cat[c]).map(c => {
      const cc = D.cat[c]; const sd = std[c] || { i: -1, status: 'none' }; const p = pickOf(c);
      if (p == null || !cc.o[p]) return { c: cc.l, st: 'open', t: 'No product chosen yet' };
      const name = cc.o[p].n;
      if (sd.status === 'none' || sd.i < 0) return { c: cc.l, st: 'free', t: name + ' (' + cc.o[p].k + '). No enterprise standard set, so it is judged on its trade-offs.' };
      if (sd.status !== 'approved') return { c: cc.l, st: 'review', t: name + '. The pattern is still under review.' };
      return p === sd.i ? { c: cc.l, st: 'ok', t: name + ', the enterprise standard.' } : { c: cc.l, st: 'dev', t: name + '. The standard is ' + cc.o[sd.i].n + '.' };
    });
    const measured = checks.filter(x => x.st === 'ok' || x.st === 'dev' || x.st === 'review');
    const ok = checks.filter(x => x.st === 'ok').length;
    return { checks, conf: measured.length ? Math.round(ok / measured.length * 100) : null, devN: checks.filter(x => x.st === 'dev' || x.st === 'review').length, chosen: checks.filter(x => x.st !== 'open').length };
  }

  // The design as it stands: the canvas once someone has edited it, otherwise the active outcome.
  designState() {
    const st = this.state;
    if (st.canvas && st.canvas.app === st.app) {
      const picks = {}; st.canvas.nodes.forEach(n => { if (n.p != null) picks[n.cid] = n.p; });
      return { comps: st.canvas.nodes.map(n => n.cid), picks, src: 'canvas' };
    }
    const outs = this.getOuts();
    const oi = st.chosen != null && outs[st.chosen] ? st.chosen : Math.min(st.active || 0, outs.length - 1);
    return { comps: this.comps(), picks: Object.assign({}, (outs[oi] && outs[oi].picks) || {}), src: 'outcomes' };
  }

  liveStage(r) {
    const st = this.state;
    if (!r.chosen) return 'draft';
    if (st.contractSigned || ['drill', 'review', 'change'].indexOf(st.step) >= 0) return 'review';
    if (['outcomes', 'compare', 'decisions', 'gap', 'evolve', 'canvas'].indexOf(st.step) >= 0) return 'sim';
    return 'draft';
  }

  principleCheck(id, ds) {
    const st = this.state; const D = this.data(); const has = c => ds.comps.indexOf(c) >= 0;
    const r = this.checkDesign(ds.comps, c => ds.picks[c]);
    const R = (ok, t) => ({ state: ok ? 'met' : 'risk', t });
    if (this.libNone() && (id === 'benefit' || id === 'reuse' || id === 'diversity')) return { state: 'open', t: 'No pattern library is set, so reuse of standards is not measured. Choose one on the Canvas.' };
    switch (id) {
      case 'primacy': return R(true, 'Applied through every check on this page.');
      case 'benefit': return r.conf == null ? { state: 'open', t: 'Choose products to check reuse of shared standards.' } : R(r.conf >= 70, r.conf + '% of chosen blocks are shared enterprise standards.');
      case 'continuity': return R(has('obs') && Number(st.avail) >= 99.9, (has('obs') ? 'Observability in place' : 'No observability block') + ', ' + st.avail + '% availability target.');
      case 'compliance': return !st.reg ? R(true, 'No regulated data in scope.') : R(has('idp') && (has('grc') || has('aigov') || has('catalog') || has('guard')), has('idp') ? 'Regulated data: identity in place; governance block ' + ((has('grc') || has('aigov') || has('catalog') || has('guard')) ? 'present.' : 'missing.') : 'Regulated data with no identity and access block.');
      case 'asset': return R(has('catalog') || has('mdm'), has('catalog') || has('mdm') ? 'Catalogue or master data block present.' : 'No data catalogue or master data block.');
      case 'shared': return R(has('mdm') || has('lake') || has('catalog'), has('mdm') || has('lake') || has('catalog') ? 'Shared data platform or master data in the design.' : 'No shared data platform or master data.');
      case 'security': return R(has('idp'), has('idp') ? 'Identity and access at the boundary.' : 'No identity and access block.');
      case 'reuse': return r.conf == null ? { state: 'open', t: 'Choose products to check against the pattern library.' } : R(r.conf >= 80, r.conf + '% follow the pattern library.');
      case 'interop': return R(has('gw') || has('ipaas'), has('gw') || has('ipaas') ? 'API gateway or integration platform present.' : 'No API gateway or integration platform.');
      case 'diversity': return r.conf == null ? { state: 'open', t: 'Choose products to count deviations.' } : R(r.devN <= 2, r.devN + (r.devN === 1 ? ' block' : ' blocks') + ' off standard or under review.');
      case 'independence': {
        const ps = ds.comps.filter(c => ds.picks[c] != null && D.cat[c]).map(c => D.cat[c].o[ds.picks[c]].s[3]);
        if (!ps.length) return { state: 'open', t: 'Choose products to score portability.' };
        const avg = ps.reduce((a, b) => a + b, 0) / ps.length;
        return R(avg >= 3.5, 'Average portability ' + avg.toFixed(1) + ' out of 5.');
      }
      case 'rai': return st.ai === 'none' ? R(true, 'No AI in scope.') : R(has('guard') && has('aigov'), (has('guard') ? 'Guardrails present' : 'No guardrails') + '; ' + (has('aigov') ? 'model registry present.' : 'no AI governance block.'));
      default: return { state: 'open', t: '' };
    }
  }

  // ---------- Canvas ----------
  cvGeo() { return { w: 1180, laneH: 140, nodeW: 150, nodeH: 56, left: 132, lanes: [['exp', 'Experience', 'Application, user facing'], ['edge', 'Edge and access', 'Technology'], ['app', 'Application', 'Application'], ['data', 'Data and events', 'Data'], ['x', 'Cross-cutting', 'Technology, shared']] }; }

  laneSlot(layer, nodes) {
    const G = this.cvGeo(); const li = Math.max(0, G.lanes.findIndex(l => l[0] === layer)); const top = li * G.laneH;
    const per = Math.floor((G.w - G.left - 8) / (G.nodeW + 18));
    for (let i = 0; i < per * 2; i++) {
      const x = G.left + 8 + (i % per) * (G.nodeW + 18), y = top + 12 + Math.floor(i / per) * (G.nodeH + 8);
      if (!nodes.some(n => Math.abs(n.x - x) < G.nodeW - 20 && Math.abs(n.y - y) < G.nodeH - 10)) return { x, y };
    }
    return { x: G.left + 8, y: top + 12 };
  }

  seedCanvas() {
    const D = this.data(); const st = this.state; const std = this.stdMap(); const ds = this.designState(); const nodes = [];
    ds.comps.forEach(c => { const pos = this.laneSlot(D.cat[c].layer, nodes); nodes.push({ id: c, cid: c, x: pos.x, y: pos.y, p: ds.picks[c] != null ? ds.picks[c] : (std[c] && std[c].i >= 0 ? std[c].i : null) }); });
    const edges = this.flowEdges(ds.comps).map(e => ({ a: e.from, b: e.to, t: e.type }));
    return { app: st.app, nodes, edges };
  }

  getCanvas() { const st = this.state; return st.canvas && st.canvas.app === st.app ? st.canvas : this.seedCanvas(); }

  editCanvas(fn, extra) {
    const cv = this.getCanvas();
    const next = fn({ app: cv.app, nodes: cv.nodes.map(n => Object.assign({}, n)), edges: cv.edges.map(e => Object.assign({}, e)) }) || null;
    this.setState(Object.assign({ canvas: next }, extra || {}));
  }

  clampPos(x, y) { const G = this.cvGeo(); return { x: Math.round(Math.min(Math.max(x, G.left + 4), G.w - G.nodeW - 6)), y: Math.round(Math.min(Math.max(y, 4), G.lanes.length * G.laneH - G.nodeH - 4)) }; }

  addNode(cid, x, y) {
    const D = this.data(); const std = this.stdMap(); const cv = this.getCanvas();
    if (cv.nodes.some(n => n.cid === cid)) { this.setState({ canvasSel: cid }); return; }
    this.editCanvas(c => {
      const pos = x == null ? this.laneSlot(D.cat[cid].layer, c.nodes) : this.clampPos(x, y);
      c.nodes.push({ id: cid, cid, x: pos.x, y: pos.y, p: std[cid] && std[cid].i >= 0 ? std[cid].i : null });
      return c;
    }, { canvasSel: cid });
  }

  onPointerDown(e) {
    if (e.button > 0) return;
    const t = e.target; if (!t || !t.closest) return;
    const node = t.closest('[data-node]'); const pal = t.closest('[data-pal]');
    if (node) {
      const id = node.getAttribute('data-node'); const n = this.getCanvas().nodes.find(q => q.id === id); if (!n) return;
      this._drag = { kind: 'node', id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false, el: node };
    } else if (pal) {
      this._drag = { kind: 'pal', cid: pal.getAttribute('data-pal'), sx: e.clientX, sy: e.clientY, moved: false, label: (pal.querySelector('span') || pal).textContent };
    }
  }

  onPointerMove(e) {
    const d = this._drag; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved) { if (Math.hypot(dx, dy) < 5) return; d.moved = true; if (d.kind === 'pal' && e.pointerType === 'touch') { this._drag = null; return; } }
    e.preventDefault();
    if (d.kind === 'node') {
      const p = this.clampPos(d.ox + dx, d.oy + dy); d.x = p.x; d.y = p.y;
      if (d.el) { d.el.style.left = p.x + 'px'; d.el.style.top = p.y + 'px'; }
      if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = 0; const q = this._drag; if (q && q.kind === 'node' && q.x != null) this.editCanvas(c => { const n = c.nodes.find(z => z.id === q.id); if (n) { n.x = q.x; n.y = q.y; } return c; }); });
    } else {
      if (!d.ghost) {
        const g = document.createElement('div'); g.textContent = d.label;
        g.style.cssText = 'position:fixed;z-index:50;pointer-events:none;padding:8px 12px;border-radius: var(--r-sm);background:var(--surface);border:2px solid var(--accent);font:600 13px var(--font);color:var(--ink);box-shadow:0 8px 24px rgba(0,0,0,0.18)';
        document.body.appendChild(g); d.ghost = g;
      }
      d.ghost.style.left = (e.clientX + 10) + 'px'; d.ghost.style.top = (e.clientY + 10) + 'px';
    }
  }

  onPointerUp(e) {
    const d = this._drag; if (!d) return; this._drag = null;
    if (d.ghost) d.ghost.remove();
    if (!d.moved) return;
    this._suppress = true; setTimeout(() => { this._suppress = false; }, 50);
    if (d.kind === 'node') {
      if (d.x != null) this.editCanvas(c => { const n = c.nodes.find(z => z.id === d.id); if (n) { n.x = d.x; n.y = d.y; } return c; });
    } else {
      const cvEl = document.getElementById('as-canvas'); if (!cvEl) return;
      const r = cvEl.getBoundingClientRect(); const G = this.cvGeo();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) this.addNode(d.cid, e.clientX - r.left - G.nodeW / 2, e.clientY - r.top - G.nodeH / 2);
    }
  }

  canvasVals() {
    const D = this.data(); const st = this.state; const std = this.stdMap(); const G = this.cvGeo(); const cv = this.getCanvas();
    const ACC = 'var(--accent)', LINE = 'var(--hair)';
    const byId = {}; cv.nodes.forEach(n => { byId[n.id] = n; });
    const r = this.checkDesign(cv.nodes.map(n => n.cid), c => { const n = cv.nodes.find(z => z.cid === c); return n ? n.p : null; });
    const stOf = n => { const sd = std[n.cid]; if (n.p == null) return 'open'; if (!sd || sd.status === 'none' || sd.i < 0) return 'free'; if (sd.status !== 'approved') return 'review'; return n.p === sd.i ? 'ok' : 'dev'; };
    const dotC = { ok: 'var(--good)', dev: 'var(--bad)', review: 'var(--warn)', open: 'var(--ink-4)', free: 'var(--accent)' };
    const sel = st.canvasSel && byId[st.canvasSel] ? byId[st.canvasSel] : null;
    const linking = !!(st.linkFrom && byId[st.linkFrom]);
    const nodes = cv.nodes.map(n => {
      const cc = D.cat[n.cid]; const on = sel && sel.id === n.id; const s = stOf(n);
      return { id: n.id, x: n.x, y: n.y, l: cc.l, prod: n.p != null && cc.o[n.p] ? cc.o[n.p].n : 'Choose a product', dot: dotC[s], on: on ? 'true' : 'false',
        aria: cc.l + ', ' + (n.p != null && cc.o[n.p] ? cc.o[n.p].n : 'no product') + ({ ok: ', enterprise standard', dev: ', deviation', review: ', under review', open: '', free: ', no standard set' }[s]),
        border: on ? '2px solid ' + ACC : (linking && st.linkFrom !== n.id ? '2px dashed ' + ACC : '1px solid var(--hair-strong)'),
        pick: () => {
          if (this._suppress) return;
          if (linking && st.linkFrom !== n.id) {
            const a = st.linkFrom; const t = st.linkType || 'sync';
            this.editCanvas(c => { if (!c.edges.some(e => (e.a === a && e.b === n.id) || (e.a === n.id && e.b === a))) c.edges.push({ a, b: n.id, t }); return c; }, { linkFrom: null, canvasSel: a });
          } else this.setState({ canvasSel: on ? null : n.id, linkFrom: null });
        },
        key: e => {
          const step = e.shiftKey ? 40 : 10; const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
          if (mv) { e.preventDefault(); this.editCanvas(c => { const q = c.nodes.find(z => z.id === n.id); const p = this.clampPos(q.x + mv[0], q.y + mv[1]); q.x = p.x; q.y = p.y; return c; }, { canvasSel: n.id }); }
          else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.editCanvas(c => { c.nodes = c.nodes.filter(z => z.id !== n.id); c.edges = c.edges.filter(z => z.a !== n.id && z.b !== n.id); return c; }, { canvasSel: null, linkFrom: null }); }
          else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.setState({ canvasSel: on ? null : n.id }); }
          else if (e.key === 'Escape') this.setState({ canvasSel: null, linkFrom: null });
        } };
    });
    const clip = (cx, cy, tx, ty) => { const dx = tx - cx, dy = ty - cy; if (!dx && !dy) return [cx, cy]; const sx = dx ? (G.nodeW / 2 + 4) / Math.abs(dx) : Infinity, sy = dy ? (G.nodeH / 2 + 4) / Math.abs(dy) : Infinity; const k = Math.min(sx, sy); return [cx + dx * k, cy + dy * k]; };
    const edges = cv.edges.filter(e => byId[e.a] && byId[e.b]).map(e => {
      const A = byId[e.a], B = byId[e.b]; const ax = A.x + G.nodeW / 2, ay = A.y + G.nodeH / 2, bx = B.x + G.nodeW / 2, by = B.y + G.nodeH / 2;
      const p1 = clip(ax, ay, bx, by), p2 = clip(bx, by, ax, ay); const hot = sel && (sel.id === e.a || sel.id === e.b);
      return { d: 'M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + 'L' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1), c: hot ? ACC : 'var(--ink-4)', sw: hot ? 2 : 1.25, dash: e.t === 'async' ? '6 4' : (e.t === 'batch' ? '2 4' : 'none'), m: hot ? 'url(#cv-arrow-on)' : 'url(#cv-arrow)' };
    });
    const q = (st.palQ || '').trim().toLowerCase(); const onIds = {}; cv.nodes.forEach(n => { onIds[n.cid] = 1; });
    const palette = G.lanes.map(([k, name]) => ({ name, items: Object.keys(D.cat).filter(c => D.cat[c].layer === k && (!q || D.cat[c].l.toLowerCase().indexOf(q) >= 0)).map(c => {
      const sd = std[c]; const onC = !!onIds[c];
      const noStd = sd.status === 'none' || sd.i < 0;
      return { cid: c, l: D.cat[c].l, sub: onC ? 'On canvas' : noStd ? D.cat[c].o.length + ' options, no standard set' : (sd.status === 'approved' ? 'Standard: ' : 'Under review: ') + D.cat[c].o[sd.i].n,
        sfg: onC || noStd ? 'var(--ink-3)' : (sd.status === 'approved' ? 'var(--good)' : 'var(--warn)'), bg: onC ? 'var(--fill)' : 'var(--surface)', bd: onC ? LINE : 'var(--hair-strong)', add: () => { if (!this._suppress) this.addNode(c); } };
    }) })).filter(g => g.items.length);
    const lanes = G.lanes.map(([k, l, t], i) => ({ l, t, top: i * G.laneH, bg: i % 2 ? 'var(--fill-1)' : 'var(--surface)' }));
    let selV = { l: '', layer: '', need: '', opts: [], linkTypes: [], links: [], hasLinks: false, remove: () => {}, close: () => {} };
    if (sel) {
      const cc = D.cat[sel.cid]; const sd = std[sel.cid];
      const links = cv.edges.map((e, i) => ({ e, i })).filter(x => x.e.a === sel.id || x.e.b === sel.id).map(x => {
        const other = x.e.a === sel.id ? x.e.b : x.e.a; const dir = x.e.a === sel.id ? 'to' : 'from';
        return { t: ({ sync: 'Calls', async: 'Events', batch: 'Batch' }[x.e.t] || 'Link') + ' ' + dir + ' ' + D.cat[byId[other].cid].l, remove: () => this.editCanvas(c => { c.edges.splice(x.i, 1); return c; }) };
      });
      selV = { l: cc.l, layer: D.layerNames[cc.layer], need: cc.need, hasLinks: links.length > 0, links,
        opts: cc.o.map((o, j) => { const on = sel.p === j; const noStd = sd.status === 'none' || sd.i < 0; const isStd = !noStd && sd.i === j;
          return { n: o.n, on: on ? 'true' : 'false', tag: isStd ? (sd.status === 'approved' ? 'Enterprise standard' : 'Proposed standard, under review') : noStd ? o.k : o.k + ' · off standard', tfg: isStd ? (sd.status === 'approved' ? 'var(--good)' : 'var(--warn)') : 'var(--ink-3)',
            bg: on ? 'var(--accent-soft)' : 'var(--surface)', bd: on ? ACC : LINE, pick: () => this.editCanvas(c => { const n = c.nodes.find(z => z.id === sel.id); n.p = j; return c; }) }; }),
        linkTypes: [['sync', 'Calls it'], ['async', 'Sends events'], ['batch', 'Batch feed']].map(([t, l]) => ({ l, go: () => this.setState({ linkFrom: sel.id, linkType: t }) })),
        remove: () => this.editCanvas(c => { c.nodes = c.nodes.filter(z => z.id !== sel.id); c.edges = c.edges.filter(z => z.a !== sel.id && z.b !== sel.id); return c; }, { canvasSel: null, linkFrom: null }),
        close: () => this.setState({ canvasSel: null, linkFrom: null }) };
    }
    const confC = r.conf == null ? ['var(--fill)', 'var(--ink-2)'] : r.conf >= 85 ? ['var(--good-soft)', 'var(--good)'] : r.conf >= 70 ? ['var(--warn-soft)', 'var(--warn)'] : ['var(--bad-soft)', 'var(--bad)'];
    const touched = !!(st.canvas && st.canvas.app === st.app);
    return { cv: { w: G.w, h: G.lanes.length * G.laneH, laneH: G.laneH, nodeW: G.nodeW, nodeH: G.nodeH, lanes, nodes, edges, palette, empty: !cv.nodes.length,
      confLine: r.conf == null ? cv.nodes.length + ' blocks · ' + r.chosen + ' with a product' + (this.libNone() ? ' · no pattern library set' : '') : cv.nodes.length + ' blocks · ' + r.conf + '% on standards · ' + r.devN + (r.devN === 1 ? ' issue' : ' issues'), confBg: confC[0], confFg: confC[1],
      reset: () => this.setState({ canvas: null, canvasSel: null, linkFrom: null }), clear: () => this.setState({ canvas: { app: st.app, nodes: [], edges: [] }, canvasSel: null, linkFrom: null }), clearLabel: touched && !cv.nodes.length ? 'Canvas cleared' : 'Clear canvas',
      linking, linkFrom: linking ? D.cat[byId[st.linkFrom].cid].l : '', cancelLink: () => this.setState({ linkFrom: null }), hasSel: !!sel, sel: selV },
      palQ: st.palQ || '', onPalQ: e => this.setState({ palQ: e.target.value }) };
  }

  // ---------- ADM step views ----------
  fwVals(go) {
    const st = this.state;
    const vis = this.visibleSteps().map(s => s[0]);
    const cur = vis.indexOf(st.step) >= 0 ? st.step : 'brief';
    const names = {}; const lvl = {}; this.allSteps().forEach(s => { names[s[0]] = s[1]; lvl[s[0]] = s[2]; });
    const lvlName = { 2: 'Intermediate', 3: 'Advanced' };
    const F = [
      ['togaf', 'TOGAF Standard, 10th Edition', 'The Open Group · 2025 update', 'The ADM cycle behind the step bar: principles (Preliminary), vision and stakeholders (A), business, data, application and technology architecture (B to D), gap analysis and transition architectures (E, F), the architecture contract and compliance review (G) and change classification (H). Architecture and solution building blocks shape the canvas.', ['principles','brief','vision','workload','enterprise','blueprint','canvas','outcomes','compare','gap','evolve','review','change'], [['TOGAF Standard', 'https://www.opengroup.org/togaf']]],
      ['archimate', 'ArchiMate', 'The Open Group · version 4 is the latest', 'The layer vocabulary in the Enterprise view: business, application, data and technology. ArchiMate is the modelling language aligned with TOGAF.', ['enterprise'], [['About ArchiMate', 'https://www.opengroup.org/archimate-forum/archimate-overview']]],
      ['iso42010', 'ISO/IEC/IEEE 42010:2022', 'ISO, IEC and IEEE', 'Architecture description: stakeholders, their concerns and the views that answer them. The stakeholder map shows each concern and the view that stakeholder needs.', ['vision'], [['ISO/IEC/IEEE 42010:2022', 'https://www.iso.org/standard/74393.html']]],
      ['adr', 'Architecture decision records', 'Michael Nygard · 2011', 'One short record per decision: context, decision, alternatives and consequences. Complements TOGAF; the Decisions step generates them.', ['decisions'], [['Documenting architecture decisions', 'https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions']]],
      ['time', 'TIME model', 'Gartner', 'Tolerate, Invest, Migrate or Eliminate for each application in the portfolio. Migrate and Eliminate become dependencies on the roadmap.', ['enterprise','gap'], [['Explainer (Gartner research is subscriber-only)', 'https://www.leanix.net/en/wiki/ea/gartner-time-model']]],
      ['wa', 'Well-Architected frameworks', 'AWS, Microsoft Azure, Google Cloud', 'The trade-offs scored in Outcomes and Compare (scale, run cost, operational effort, portability) follow the pillars these frameworks share. The scores are curated judgements, not measurements.', ['workload','outcomes','compare'], [['AWS', 'https://aws.amazon.com/architecture/well-architected/'], ['Azure', 'https://learn.microsoft.com/azure/well-architected/'], ['Google Cloud', 'https://cloud.google.com/architecture/framework']]],
      ['strangler', 'Strangler fig pattern', 'Martin Fowler', 'Brownfield migration: grow the new system around the old one and retire the old parts piece by piece.', ['blueprint','evolve'], [['Strangler fig application', 'https://martinfowler.com/bliki/StranglerFigApplication.html']]],
      ['stride', 'STRIDE threat model', 'Microsoft', 'Six threat types checked at each trust boundary in the Drill step: spoofing, tampering, repudiation, information disclosure, denial of service and elevation of privilege.', ['drill'], [['STRIDE threat categories', 'https://learn.microsoft.com/azure/security/develop/threat-modeling-tool-threats']]],
      ['aigov', 'AI governance standards', 'EU AI Act · NIST AI RMF 1.0 · ISO/IEC 42001:2023', 'Risk classification, human oversight and an AI management system. Applied when a design uses AI, in the Enterprise view and the shortcomings checked in Compare.', ['enterprise','compare'], [['EU AI Act', 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj'], ['NIST AI RMF', 'https://www.nist.gov/itl/ai-risk-management-framework'], ['ISO/IEC 42001', 'https://www.iso.org/standard/81230.html']]],
      ['gamp', 'GAMP 5, Second Edition', 'ISPE', 'Risk-based validation of computerised systems in GxP-regulated life sciences. Applies to the regulated and SAP scenarios.', ['brief','blueprint'], [['GAMP 5 guide', 'https://ispe.org/publications/guidance-documents/gamp-5-guide-2nd-edition']]],
      ['finops', 'FinOps Framework', 'FinOps Foundation', 'Run-cost accountability. The review board includes a FinOps lead who tests cost at scale, including AI spend.', ['review'], [['FinOps Framework', 'https://www.finops.org/framework/']]]
    ];
    const open = () => this.setState({ showFw: true });
    const rows = F.map(([id, n, by, use, steps, links]) => {
      const here = steps.indexOf(cur) >= 0;
      return { id, n, by, use, here, links: links.map(([t, u]) => ({ t, u })),
        steps: steps.map(k => { const ok = vis.indexOf(k) >= 0; const on = k === cur;
          return { l: names[k] || k, go: ok ? () => this.setState({ step: k, focus: null }) : () => {}, off: ok ? 'false' : 'true', tip: ok ? 'Go to ' + (names[k] || k) : 'Unlocks at ' + (lvlName[lvl[k]] || 'a higher level'),
            bg: on ? 'var(--accent-soft)' : 'var(--surface)', bd: on ? 'var(--accent)' : 'var(--hair)', fg: ok ? (on ? 'var(--accent-ink)' : 'var(--ink)') : 'var(--ink-4)' }; }) };
    });
    const sorted = rows.filter(r => r.here).concat(rows.filter(r => !r.here));
    const here = rows.filter(r => r.here).map(r => ({ n: r.n, open }));
    return { showFw: !!st.showFw, toggleFw: () => this.setState({ showFw: !st.showFw }), fwExpanded: st.showFw ? 'true' : 'false',
      fwBg: st.showFw ? 'var(--accent-soft)' : 'var(--surface)', fwBd: st.showFw ? 'var(--accent)' : 'var(--hair)', fwFg: st.showFw ? 'var(--accent-ink)' : 'var(--ink)',
      fwAll: sorted, fwHere: here, fwHasHere: here.length > 0,
      menuShown: !!st.showMenu, menuOpen: st.showMenu ? 'true' : 'false', toggleMenu: () => this.setState({ showMenu: !st.showMenu }),
      sideOpen: st.showSide ? 'true' : 'false', sideCls: st.showSide ? 'open' : '', toggleSide: () => this.setState({ showSide: !st.showSide, showMenu: false }),
      stepCount: (vis.indexOf(cur) + 1) + ' of ' + vis.length };
  }

  admVals(go, stepNames) {
    const D = this.data(); const st = this.state; const A = this.getApp(); const sc = this.scen(); const ad = this.admData();
    const ds = this.designState(); const on = this.prinOn();
    const chip = { met: ['Met', 'var(--good-soft)', 'var(--good)'], risk: ['At risk', 'var(--bad-soft)', 'var(--bad)'], open: ['Not checked yet', 'var(--fill)', 'var(--ink-2)'] };
    const prin = ad.principles.map(p => { const adopted = !!on[p.id]; const c = adopted ? this.principleCheck(p.id, ds) : { state: 'open', t: 'Not adopted for this design.' };
      return Object.assign({}, p, { on: adopted ? 'true' : 'false', toggleLabel: adopted ? 'Adopted' : 'Adopt', tbg: adopted ? 'var(--inverse)' : 'var(--surface)', tfg: adopted ? 'var(--on-accent)' : 'var(--ink)', tbd: adopted ? 'var(--ink)' : 'var(--hair-strong)', bd: adopted ? 'var(--hair-strong)' : 'var(--hair)',
        toggle: () => this.setState({ principles: Object.assign({}, on, { [p.id]: !adopted }) }), cl: adopted ? chip[c.state][0] : 'Optional', cbg: adopted ? chip[c.state][1] : 'var(--fill)', cfg: adopted ? chip[c.state][2] : 'var(--ink-3)', ct: c.t, state: adopted ? c.state : 'off' }); });
    const adoptedP = prin.filter(p => p.state !== 'off');
    const prinStats = [{ t: adoptedP.length + ' adopted', bg: 'var(--fill)', fg: 'var(--ink-2)' }, { t: adoptedP.filter(p => p.state === 'met').length + ' met by the current design', bg: 'var(--good-soft)', fg: 'var(--good)' }, { t: adoptedP.filter(p => p.state === 'risk').length + ' at risk', bg: 'var(--bad-soft)', fg: 'var(--bad)' }];

    // Vision
    const stake = sc ? sc.stake : [['Executive sponsor', 'h', 'h', 'Value delivered for the investment', 'Business capabilities and portfolio', 'enterprise'], ['Business process owner', 'h', 'h', 'The process works end to end', 'Blueprint and request flow', 'blueprint'], ['End users', 'l', 'h', 'Speed and ease of use', 'Blueprint and request flow', 'blueprint'], ['Operations and support', 'l', 'h', 'Running it day to day', 'Failure drills', 'drill'], ['Security office', 'h', 'l', 'Identity, access and data protection', 'Design canvas', 'canvas'], ['Finance', 'h', 'l', 'Cost to build and run', 'Compare outcomes', 'compare']].concat(st.reg ? [['Data protection officer', 'h', 'l', 'Personal and regulated data', 'Principles', 'principles']] : []);
    const qDef = [['h', 'l', 'Keep satisfied', 'var(--fill)', 'var(--ink-2)'], ['h', 'h', 'Manage closely', 'var(--accent-soft)', 'var(--accent-ink)'], ['l', 'l', 'Monitor', 'var(--fill-1)', 'var(--ink-3)'], ['l', 'h', 'Keep informed', 'var(--good-soft)', 'var(--good)']];
    const selS = st.stake != null && stake[st.stake] ? stake[st.stake] : null;
    const quads = qDef.map(([pw, it, l, bg, fg]) => ({ l, bg, fg, empty: !stake.some(x => x[1] === pw && x[2] === it), items: stake.map((s, i) => ({ s, i })).filter(x => x.s[1] === pw && x.s[2] === it).map(x => ({ n: x.s[0], on: st.stake === x.i ? 'true' : 'false', bd: st.stake === x.i ? 'var(--accent)' : 'var(--hair)', pick: () => this.setState({ stake: st.stake === x.i ? null : x.i }) })) }));
    const scaleWord = { '10k': 'thousands of', '1M': 'a million', '50M': 'tens of millions of' }[st.scale] || 'many';
    const lc = t => /^[A-Z]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
    const statement = sc ? 'Success means ' + sc.goals.slice(0, -1).map(lc).join(', ') + ' and ' + lc(sc.goals[sc.goals.length - 1]) + '. The target is built on ' + A.n + ' and must meet ' + (st.reg ? 'regulatory obligations' : 'enterprise standards') + ' and a ' + st.avail + '% availability target.'
      : 'Deliver the ' + A.n + ' for ' + scaleWord + ' users on ' + ({ aws: 'AWS', azure: 'Azure', multi: 'a hybrid or multi-cloud estate' }[st.cloud]) + ', ' + (st.field === 'brown' ? 'replacing parts of an existing estate' : 'built new') + ', ' + (st.reg ? 'with regulated data' : 'with standard data') + ' and a ' + st.avail + '% availability target.';
    const L = (h, items, m, c) => ({ h, m, c, items: items.map(t => ({ t })) });
    const vision = { title: sc ? sc.n : 'Architecture vision: ' + A.n, hasScen: !!sc, scenName: sc ? sc.n : '', sit: sc ? sc.sit : '', statement,
      lists: [L('Business drivers', sc ? sc.drivers : [A.d], '›', 'var(--accent)'), L('Goals and measures', sc ? sc.goals : ['Meet the ' + st.avail + '% availability target', 'Stay within the approved pattern library', 'Pass the architecture review board'], '✓', 'var(--good)'), L('In scope', sc ? sc.scopeIn : (A.caps || []).slice(0, 4), '+', 'var(--accent)'), L('Out of scope', sc ? sc.scopeOut : ['Systems outside this design', 'Organisation and process redesign'], '−', 'var(--warn)')],
      quads, hasSel: !!selS, sel: selS ? { n: selS[0], c: selS[3], v: selS[4], stepName: stepNames[selS[5]] || selS[4], go: go(selS[5]) } : { n: '', c: '', v: '', stepName: '', go: () => {} } };

    // Scenario picker
    const entScen = ad.scenarios.map(s => { const sl = st.scenario === s.id; return { n: s.n, d: s.d, tags: D.apps[s.app].n + ' · ' + (s.set.field === 'brown' ? 'brownfield' : 'greenfield') + (s.set.reg ? ' · regulated' : '') + (s.set.ai === 'native' ? ' · AI-native' : ''),
      on: sl ? 'true' : 'false', bg: sl ? 'var(--accent-soft)' : 'var(--surface)', bd: sl ? 'var(--accent)' : 'var(--hair)', ring: sl ? '0 0 0 1px var(--accent)' : 'none', pick: () => this.pickScenario(s.id) }; });

    // Gap analysis
    const std = this.stdMap();
    let base, baseNote;
    if (sc) { base = sc.base; baseNote = 'Baseline from the scenario: the estate as it runs today.'; }
    else if (st.field === 'brown') { base = [['Legacy core system', 'app', 'replace'], ['On-premises database', 'db', 'replace'], ['Point-to-point integrations', null, 'retire'], ['Identity provider', 'idp', 'keep']]; baseNote = 'Brownfield: a typical baseline estate is assumed. Pick a scenario for a specific one.'; }
    else { base = []; baseNote = 'Greenfield: there is no baseline, so every building block is new.'; }
    const used = {}; const rows = [];
    ds.comps.forEach(c => {
      const cc = D.cat[c]; if (!cc) return; const p = ds.picks[c]; const tgt = p != null && cc.o[p] ? cc.o[p].n : (std[c] && std[c].i >= 0 ? cc.o[std[c].i].n + ' (standard)' : 'Product not chosen');
      const bi = base.findIndex(b => b[1] === c);
      if (bi >= 0) { used[bi] = 1; const b = base[bi]; rows.push(b[2] === 'keep' ? { c: cc.l, base: b[0], tgt, gap: 'Keep', layer: cc.layer, wp: 'No change' } : { c: cc.l, base: b[0], tgt, gap: 'Change', layer: cc.layer, wp: 'Replace ' + b[0] + ' with ' + tgt }); }
      else rows.push({ c: cc.l, base: 'Not in place', tgt, gap: 'New', layer: cc.layer, wp: 'Introduce ' + tgt });
    });
    base.forEach((b, i) => { if (!used[i]) rows.push({ c: b[1] && D.cat[b[1]] ? D.cat[b[1]].l : 'Baseline system', base: b[0], tgt: 'Removed', gap: 'Retire', layer: 'retire', wp: 'Decommission ' + b[0] }); });
    const gc = { New: ['var(--accent-soft)', 'var(--accent-ink)'], Change: ['var(--warn-soft)', 'var(--warn)'], Keep: ['var(--good-soft)', 'var(--good)'], Retire: ['var(--bad-soft)', 'var(--bad)'] };
    const ord = { Retire: 0, Change: 1, New: 2, Keep: 3 };
    rows.sort((a, b) => ord[a.gap] - ord[b.gap]);
    const gapRows = rows.map(r => Object.assign({}, r, { bg: gc[r.gap][0], fg: gc[r.gap][1] }));
    const cnt = k => rows.filter(r => r.gap === k).length;
    const wp = rows.filter(r => r.gap !== 'Keep');
    const plat = [['T1', 'Foundations', 'Identity, data, integration and shared services stand up alongside the baseline.', ['x', 'data', 'edge'], 'var(--accent)'], ['T2', 'Core services', 'Core applications move onto the target while the baseline runs in parallel for cutover.', ['app'], 'var(--warn)'], ['T3', 'Target and retirement', 'People move to the new experience and baseline systems are decommissioned.', ['exp', 'retire'], 'var(--good)']];
    const gap = { intro: baseNote + ' Compare it with your target design to find what is new, changed, kept and retired, then group the work into transition architectures.',
      stats: ['New', 'Change', 'Keep', 'Retire'].map(k => ({ t: cnt(k) + ' ' + k.toLowerCase(), bg: gc[k][0], fg: gc[k][1] })), rows: gapRows,
      plateaus: plat.map(([k, n, d, layers, c]) => { const items = wp.filter(r => layers.indexOf(r.layer) >= 0).map(r => ({ t: r.wp })); return { k: 'Transition architecture ' + k, n, d, c, items, empty: !items.length }; }) };

    // Change management
    const chg = st.chg || {};
    const kinds = [['simple', 'Simple change'], ['incremental', 'Incremental change'], ['rearch', 'Re-architect: new ADM cycle']];
    const changes = (sc ? sc.changes : ad.defaultChanges).map((c, i) => { const a = chg[i]; const answered = !!a; const right = a === c[1];
      return { t: c[0], answered, verdict: right ? 'Right.' : 'Not quite. It is ' + kinds.find(k => k[0] === c[1])[1].toLowerCase() + '.', vfg: right ? 'var(--good)' : 'var(--warn)', why: c[2],
        opts: kinds.map(([k, l]) => { const mine = a === k; const isRight = answered && k === c[1]; return { l, on: mine ? 'true' : 'false', bg: isRight ? 'var(--good-soft)' : (mine ? 'var(--bad-soft)' : 'var(--surface)'), bd: isRight ? 'var(--good)' : (mine ? 'var(--bad)' : 'var(--hair)'), pick: () => this.setState({ chg: Object.assign({}, chg, { [i]: k }) }) }; }) }; });

    // Architecture contract
    const r = this.checkDesign(ds.comps, c => ds.picks[c]);
    const signed = !!st.contractSigned;
    const bv = st.boardVerdict; const aiBoard = !!this._sample;
    const passed = !!bv && (bv.decision === 'approve' || bv.decision === 'conditional');
    const locked = aiBoard && !passed && !signed; const rejected = !!bv && bv.decision === 'reject';
    const bLabel = bv ? { approve: 'Approved', conditional: 'Approved with conditions', reject: 'Not approved' }[bv.decision] : '';
    const contract = { status: signed ? 'Signed, submitted for review' : 'Draft', sbg: signed ? 'var(--good-soft)' : 'var(--fill)', sfg: signed ? 'var(--good)' : 'var(--ink-2)',
      facts: [{ l: 'Scope', v: sc ? sc.n + '. ' + sc.scopeIn.join('; ') + '.' : A.n }, { l: 'Baseline to target', v: cnt('New') + ' new, ' + cnt('Change') + ' changed, ' + cnt('Keep') + ' kept, ' + cnt('Retire') + ' retired' }, { l: 'Standards', v: this.libNone() ? 'No pattern library set: products are chosen on their trade-offs' : r.conf == null ? 'No products chosen yet' : r.conf + '% of chosen blocks follow the approved pattern library' }, { l: 'Design source', v: ds.src === 'canvas' ? 'Design canvas' : 'Selected outcome' }],
      prin: adoptedP.map(p => ({ n: p.n, cl: p.cl, cbg: p.cbg, cfg: p.cfg, ct: p.ct })),
      devs: r.checks.filter(x => x.st === 'dev' || x.st === 'review').map(x => ({ c: x.c, t: x.t })), hasDev: r.devN > 0,
      board: bv ? bLabel + (bv.conditions && bv.conditions.length ? ' (' + bv.conditions.length + ' condition' + (bv.conditions.length === 1 ? '' : 's') + ')' : '') : aiBoard ? 'Not yet given' : 'No AI board in this view',
      bbg: !bv ? 'var(--fill)' : passed ? (bv.decision === 'approve' ? 'var(--good-soft)' : 'var(--warn-soft)') : 'var(--bad-soft)', bfg: !bv ? 'var(--ink-2)' : passed ? (bv.decision === 'approve' ? 'var(--good)' : 'var(--warn)') : 'var(--bad)',
      conds: passed && bv.conditions ? bv.conditions.map(t => ({ t })) : [], hasConds: passed && !!bv.conditions && bv.conditions.length > 0,
      locked, gateLine: locked ? (rejected ? 'The board did not approve this design. Address the risks it raised, then convene a new board.' : 'The contract unlocks when the AI board approves the design, with or without conditions.') : !aiBoard && !bv ? 'Without an AI model the board cannot sit here, so you sign on your own review. Connect a model to have the board decide first.' : '',
      hasGate: locked || (!aiBoard && !bv),
      signLabel: signed ? 'Withdraw signature' : locked ? 'Go to the AI board' : 'Sign and submit for review', signCls: signed || locked ? 'as-secondary' : 'as-primary', signBg: signed ? 'var(--ink-3)' : 'var(--good)',
      note: locked ? 'Locked until the board approves.' : signed ? 'The design is now marked ready for review in your portfolio' + (this._db ? ' and is saved to your portfolio.' : '.') : 'Signing moves the design to ready for review' + (this._db ? ' and saves it to your portfolio.' : '.'),
      sign: () => { if (signed) this.setState({ contractSigned: false }); else if (locked) go('board')(); else { this.setState({ contractSigned: true }); if (this._db) this.saveDesign('review'); } } };

    return { principles: prin, prinStats, vision, entScen, hasScenario: !!sc, clearScenario: () => this.setState({ scenario: null, chg: {}, stake: null }), gap, changes, contract };
  }

  // ---------- AI review board ----------
  boardContext() {
    const D = this.data(); const st = this.state; const A = this.getApp(); const sc = this.scen(); const std = this.stdMap();
    const ds = this.designState(); const on = this.prinOn(); const ad = this.admData();
    const lines = [];
    lines.push('DESIGN: ' + (sc ? sc.n : A.n) + '. Template: ' + A.n + '. ' + A.d);
    if (sc) lines.push('SITUATION: ' + sc.sit);
    lines.push('CONSTRAINTS: ' + ({ '10k': 'thousands of', '1M': 'about a million', '50M': 'tens of millions of' }[st.scale] || st.scale) + ' users; availability target ' + st.avail + '%; cloud ' + st.cloud + '; ' + (st.reg ? 'regulated data' : 'no regulated data') + '; ' + (st.field === 'brown' ? 'brownfield' : 'greenfield') + '; AI posture ' + st.ai + '.');
    if (sc) { lines.push('DRIVERS: ' + sc.drivers.join('; ')); lines.push('GOALS: ' + sc.goals.join('; ')); lines.push('IN SCOPE: ' + sc.scopeIn.join('; ') + '. OUT OF SCOPE: ' + sc.scopeOut.join('; ')); }
    const stake = sc ? sc.stake.map(s => s[0] + ' (concern: ' + s[3] + ')') : ['Executive sponsor', 'Security office', 'Operations and support', 'Finance'];
    lines.push('STAKEHOLDERS: ' + stake.join('; '));
    lines.push('ADOPTED PRINCIPLES (with automatic check):');
    ad.principles.filter(p => on[p.id]).forEach(p => { const c = this.principleCheck(p.id, ds); lines.push('- ' + p.n + ': ' + ({ met: 'met', risk: 'AT RISK', open: 'not yet checkable' }[c.state]) + '. ' + c.t); });
    lines.push('BUILDING BLOCKS (' + (ds.src === 'canvas' ? 'from the design canvas' : 'from the selected outcome') + '):');
    ds.comps.forEach(c => { const cc = D.cat[c]; if (!cc) return; const p = ds.picks[c]; const sd = std[c];
      const prod = p != null && cc.o[p] ? cc.o[p].n : 'no product chosen';
      const status = p == null ? '' : (!sd || sd.status === 'none' || sd.i < 0) ? ' [' + cc.o[p].k + ', no enterprise standard set]' : (sd.status !== 'approved' ? ' [pattern under review]' : (p === sd.i ? ' [enterprise standard]' : ' [DEVIATION, standard is ' + cc.o[sd.i].n + ']'));
      lines.push('- ' + D.layerNames[cc.layer] + ': ' + cc.l + ' = ' + prod + status); });
    let edges = [];
    if (st.canvas && st.canvas.app === st.app) edges = st.canvas.edges.map(e => [e.a, e.b, e.t]); else edges = this.flowEdges(ds.comps).map(e => [e.from, e.to, e.type]);
    if (edges.length) lines.push('CONNECTIONS: ' + edges.slice(0, 30).map(e => (D.cat[e[0]] ? D.cat[e[0]].l : e[0]) + ' -> ' + (D.cat[e[1]] ? D.cat[e[1]].l : e[1]) + ' (' + e[2] + ')').join('; '));
    const g = this.admVals(() => () => {}, {}).gap;
    lines.push('GAP ANALYSIS: ' + g.stats.map(x => x.t).join(', ') + '. Retiring: ' + (g.rows.filter(r => r.gap === 'Retire').map(r => r.base).join('; ') || 'nothing') + '.');
    lines.push('ROADMAP: ' + g.plateaus.map(p => p.n + ' (' + p.items.length + ' work packages)').join('; '));
    const Nw = this.wlNums();
    lines.push('WORKLOAD (from the Workload step): peak ' + fmtW(Nw.peakRps) + ' requests/s (average ' + fmtW(Nw.avgRps) + '); ' + fmtW(Nw.readRps) + ' reads/s and ' + fmtW(Nw.writeRps) + ' writes/s at peak; ' + fmtGBW(Nw.store3) + ' stored after 3 years; latency budget ' + Nw.lat + ' ms; ' + Nw.cons + ' consistency; main pattern ' + Nw.pattern + (Nw.tokensDay ? '; about ' + fmtW(Nw.tokensDay) + ' AI tokens a day' : '') + '.');
    const fitFlags = []; ds.comps.forEach(c => { const p = ds.picks[c]; const cc = D.cat[c]; if (p == null || !cc || !cc.o[p]) return; fitFor(c, cc.o[p], Nw).forEach(f => fitFlags.push(cc.o[p].n + ': ' + f.why)); });
    lines.push('WORKLOAD FIT FLAGS: ' + (fitFlags.length ? fitFlags.filter((x, i, a) => a.indexOf(x) === i).join(' ') : 'none, every chosen product is within its comfortable range.'));
    lines.push('DESIGN LENS: ' + (st.lens === 'enterprise' ? 'enterprise portfolio first. Weigh capability gaps, application rationalisation, standards and the roadmap above technical detail.' : 'system first. Weigh building blocks, non-functional qualities and operations.'));
    lines.push('LEARNER LEVEL: ' + st.level + '.');
    return lines.join('\n');
  }

  boardRules() {
    return 'You are an enterprise architecture review board inside ArchStudio, a studio where architects practise designing system and enterprise architectures using the TOGAF ADM. ' +
      'Be rigorous and specific: refer to the actual building blocks, products, connections, principles and gaps in the design. Never ask generic textbook questions. ' +
      'Pitch difficulty to the learner level: beginner gets clear, single-issue questions; advanced gets questions that combine trade-offs across layers. ' +
      'A strong answer names the trade-off the architect accepted and gives evidence from the design: a Workload number, a product choice, a decision record or a drill result. Adjectives without evidence are weak. ' +
      'Use British spelling. Do not use em dashes. Keep sentences short and plain.';
  }

  async boardCall(prompt, label, apply) {
    if (!this._sample) { this.setState({ board: Object.assign({}, this.state.board || {}, { err: this._host ? 'The AI board needs this page opened in Claude, where it can ask for your permission to use Claude.' : 'The AI board needs an AI model. Connect one from the options menu.' }) }); return; }
    const ctl = new AbortController(); this._bctl = ctl;
    this.setState({ board: Object.assign({}, this.state.board || {}, { busy: label, err: '' }) });
    try {
      const res = await this._sample.json(prompt, { signal: ctl.signal, cache: false });
      apply(res && typeof res === 'object' ? res : {});
      this.setState({ board: Object.assign({}, this.state.board || {}, { busy: '' }) });
    } catch (e) {
      const code = e && e.code;
      const gone = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].indexOf(code) >= 0;
      if (gone) { this._sample = null; this.setState({ aiReady: false }); }
      const err = code === 'cancelled' ? 'Stopped. Try again when ready.' : this.state.aiSrc === 'byo' ? this.byoErr(e) : gone ? 'Claude is not available in this view, so the AI board cannot sit.' : code === 'rate_limited' ? 'Claude is busy or your usage limit was reached. Try again later.' : 'The board could not respond just now. Try again.';
      this.setState({ board: Object.assign({}, this.state.board || {}, { busy: '', err }) });
    }
  }

  boardPanel() {
    const sc = this.scen(); const st = this.state;
    const stake = sc ? sc.stake.filter(x => x[1] === 'h').map(x => [x[0], x[3]]) : [];
    const lead = stake[0] || (st.lens === 'enterprise' ? ['Business owner', 'whether the change delivers the capability it promises, on time'] : null);
    return { roles: BOARD_ROLES, stake: lead };
  }

  convene() {
    const P = this.boardPanel(); const names = P.roles.map(r => r[0]).concat(P.stake ? [P.stake[0]] : []);
    const prompt = this.boardRules() + '\n\nThe board has a chair (Chief architect) and these members, each with one lens:\n' +
      P.roles.map(r => '- ' + r[0] + ' (' + r[1] + '): probes ' + r[2] + '.').join('\n') + (P.stake ? '\n- ' + P.stake[0] + ' (stakeholder): cares about ' + P.stake[1] + '.' : '') + '\n\n' + this.boardContext() + '\n\n' +
      'Convene the board. Write a one or two sentence opening from the chair, then exactly ' + names.length + ' questions: one from each member, in the order listed, each strictly from that member\'s lens. ' +
      'Aim each question at the weakest point in this design for that lens: a principle at risk, a deviation, a workload fit flag, a drill gap or a roadmap risk. ' +
      'Reply with only one JSON object: {"opening": "...", "questions": [{"member": "exact member name", "question": "one question, max 40 words, naming specific blocks, products or numbers", "why": "what the board is testing, max 15 words", "focus": "the block, principle, number or plateau it targets, max 5 words"}]}';
    this.setState({ board: { questions: [], verdict: null, opening: '', busy: '', err: '' } });
    this.boardCall(prompt, 'The board is reading your design...', r => {
      const qs = (Array.isArray(r.questions) ? r.questions : []).filter(q => q && q.question).slice(0, names.length).map((q, k) => ({ member: String(names.find(n => String(q.member || '').toLowerCase().indexOf(n.toLowerCase()) >= 0) || q.member || names[k] || 'Chief architect').slice(0, 60), q: String(q.question).slice(0, 400), why: String(q.why || '').slice(0, 160), focus: String(q.focus || '').slice(0, 60), draft: '', rounds: [] }));
      if (!qs.length) { this.setState({ board: Object.assign({}, this.state.board, { err: 'The board did not return questions. Try convening again.' }) }); return; }
      this.setState({ board: Object.assign({}, this.state.board, { opening: String(r.opening || '').slice(0, 400), questions: qs, verdict: null }) });
    });
  }

  answer(i) {
    const b = this.state.board; const q = b && b.questions[i]; if (!q) return;
    const a = (q.draft || '').trim();
    if (!a) { this.setState({ board: Object.assign({}, b, { questions: b.questions.map((x, k) => k === i ? Object.assign({}, x, { needText: true }) : x) }) }); return; }
    const round = q.rounds.length; const lastQ = round ? q.rounds[round - 1].follow : q.q;
    const history = q.rounds.map((r, k) => 'Q' + (k + 1) + ': ' + (k ? q.rounds[k - 1].follow : q.q) + '\nA' + (k + 1) + ': ' + r.a + '\nBoard: ' + r.fb).join('\n');
    const prompt = this.boardRules() + '\n\n' + this.boardContext() + '\n\nYou are ' + q.member + ' on the board. ' + (history ? 'Earlier exchange on this question:\n' + history + '\n\n' : '') +
      'Your question: ' + lastQ + '\nThe architect answered: ' + a + '\n\n' +
      'Judge the answer against the design above. Credit specifics that match the design; call out claims that contradict it. ' +
      'This is round ' + (round + 1) + ' of at most 3 on this question. Stay in your own lens. ' +
      (round >= 2 ? 'This was the final round, so do not ask another follow-up. ' : 'If the answer is partial or weak, ask one sharper follow-up that pins down the missing trade-off or evidence; if it is strong, leave follow empty. ') +
      'Reply with only one JSON object: {"score": "strong|partial|weak", "feedback": "2 or 3 sentences, specific to their answer and the design", "follow": "one follow-up question or empty string"}';
    this.boardCall(prompt, q.member + ' is considering your answer...', r => {
      const score = ['strong', 'partial', 'weak'].indexOf(r.score) >= 0 ? r.score : 'partial';
      const follow = round >= 2 || score === 'strong' ? '' : String(r.follow || '').slice(0, 400);
      const nb = this.state.board;
      this.setState({ board: Object.assign({}, nb, { questions: nb.questions.map((x, k) => k === i ? Object.assign({}, x, { draft: '', needText: false, rounds: x.rounds.concat([{ a, score, fb: String(r.feedback || '').slice(0, 600), follow }]) }) : x) }) });
    });
  }

  askVerdict() {
    const b = this.state.board; if (!b) return;
    const transcript = b.questions.map((q, i) => (i + 1) + '. ' + q.member + ': ' + q.q + '\n' + q.rounds.map((r, k) => '   Answer: ' + r.a + '\n   Board (' + r.score + '): ' + r.fb + (r.follow ? '\n   Follow-up: ' + r.follow : '')).join('\n')).join('\n');
    const prompt = this.boardRules() + '\n\n' + this.boardContext() + '\n\nBOARD TRANSCRIPT:\n' + transcript + '\n\n' +
      'Give the board\'s decision. Each member\'s concern must be resolved in the answers or carried as a condition. Approve only if the design is sound and the answers held up. Use conditional approval when the design is sound but specific issues must be fixed. Reject if a core principle fails or answers did not hold up. ' +
      'Reply with only one JSON object: {"decision": "approve|conditional|reject", "summary": "2 or 3 sentences", "conditions": ["specific actions, max 4, empty if approve"], "strengths": ["max 3"], "risks": ["max 3"], "learn": "one sentence on what the architect should practise next"}';
    this.boardCall(prompt, 'The board is deciding...', r => {
      const list = v => (Array.isArray(v) ? v : []).map(x => String(x).slice(0, 300)).filter(Boolean).slice(0, 4);
      const decision = ['approve', 'conditional', 'reject'].indexOf(r.decision) >= 0 ? r.decision : 'conditional';
      const verdict = { decision, summary: String(r.summary || '').slice(0, 700), conditions: list(r.conditions), strengths: list(r.strengths).slice(0, 3), risks: list(r.risks).slice(0, 3), learn: String(r.learn || '').slice(0, 300), at: new Date().toISOString() };
      this.setState({ board: Object.assign({}, this.state.board, { verdict }), boardVerdict: verdict });
      if (this._db && this.state.savedId) this.saveDesign();
    });
  }

  boardVals() {
    const st = this.state; const b = st.board || { questions: [], verdict: null, opening: '', busy: '', err: '' };
    const sc = { strong: ['Strong', 'var(--good-soft)', 'var(--good)'], partial: ['Partial', 'var(--warn-soft)', 'var(--warn)'], weak: ['Weak', 'var(--bad-soft)', 'var(--bad)'] };
    const qs = b.questions.map((q, i) => {
      const last = q.rounds[q.rounds.length - 1]; const open = !q.rounds.length || (q.rounds.length < 3 && !!last.follow);
      return { n: i + 1, member: q.member, q: q.q, why: q.why, focus: q.focus, hasFocus: !!q.focus, id: 'board-a-' + i,
        rounds: q.rounds.map(r => ({ a: r.a, fb: r.fb, sl: sc[r.score][0], sbg: sc[r.score][1], sfg: sc[r.score][2], hasFollow: !!r.follow, follow: r.follow })),
        open: open && !b.verdict, draft: q.draft || '', prompt: q.rounds.length === 2 ? 'Answer the final follow-up' : q.rounds.length ? 'Answer the follow-up (round ' + (q.rounds.length + 1) + ' of 3)' : 'Your answer', needText: !!q.needText,
        onDraft: e => { const nb = this.state.board; this.setState({ board: Object.assign({}, nb, { questions: nb.questions.map((x, k) => k === i ? Object.assign({}, x, { draft: e.target.value, needText: false }) : x) }) }); },
        send: () => this.answer(i), done: !open };
    });
    const answered = b.questions.filter(q => q.rounds.length).length;
    const v = b.verdict;
    const dec = v ? { approve: ['Approved', 'var(--good)'], conditional: ['Approved with conditions', 'var(--warn)'], reject: ['Not approved', 'var(--bad)'] }[v.decision] : ['', ''];
    return { brd: { ready: !!this._sample, hasQs: qs.length > 0, qs, opening: b.opening || '', hasOpening: !!b.opening, busy: b.busy || '', isBusy: !!b.busy, err: b.err || '', hasErr: !!b.err,
      convene: () => this.convene(), conveneLabel: qs.length ? 'Convene a new board' : 'Convene the board', stop: () => { if (this._bctl) this._bctl.abort(); },
      progress: answered + ' of ' + qs.length + ' questions answered', canVerdict: answered === qs.length && qs.length > 0 && !v && !b.busy, verdictBtn: () => this.askVerdict(),
      hasVerdict: !!v, v: v ? { label: dec[0], c: dec[1], summary: v.summary, conditions: v.conditions.map(t => ({ t })), hasCond: v.conditions.length > 0, strengths: v.strengths.map(t => ({ t })), risks: v.risks.map(t => ({ t })), learn: v.learn, hasLearn: !!v.learn } : { label: '', c: '', summary: '', conditions: [], hasCond: false, strengths: [], risks: [], learn: '', hasLearn: false },
      panel: this.boardPanel().roles.map(r => ({ n: r[0], f: r[1], d: 'Probes ' + r[2] + '.' })).concat(this.boardPanel().stake ? [{ n: this.boardPanel().stake[0], f: 'Your most powerful stakeholder', d: 'Cares about ' + this.boardPanel().stake[1] + '.' }] : []),
      notReady: !this._sample, who: this.aiName(), canSetup: !this._host, setup: () => { this.setState({ showAI: true, aiTest: '' }); try { window.scrollTo({ top: 0 }); } catch (e) {} },
      notReadyLine: this._host ? 'The AI board needs this page opened in Claude, where it asks once for permission to use Claude. The simulated board in the Review step works anywhere.' : 'The AI board needs an AI model. Connect your own, or use the simulated board in the Review step, which works without one.',
      saveNote: v ? (this._db && st.savedId ? 'The verdict is saved with this design in your portfolio, ready to show a mentor or manager.' : 'Save the design to your portfolio to keep this verdict and show it to a mentor or manager.') : '' } };
  }

  // ---------- Persistence ----------
  async initStore() {
    try {
      let db = null, user = null;
      if (!window.claude || typeof window.claude.use !== 'function') { db = localStore(); this._local = true; }
      else [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      this._db = db || null; this._user = user || null;
      let uid = this._local ? 'local' : null, lead = true, canW = null;
      if (user) { uid = await user.id(); lead = await user.canEdit(); canW = await user.can('data.write'); }
      this.setState({ dbReady: !!db, uid, isLead: !!lead || !user, canWrite: canW !== false });
      if (!db) return;
      const err = () => {};
      this._unsubs = [
        db.collection('portfolio').orderBy('savedAt', 'desc').limit(300).onSnapshot(s => {
          const docs = s.docs.map(d => Object.assign({ id: d.id }, d.data()));
          this.setState({ portfolio: docs });
          const ids = docs.map(d => d.ownerId).filter((v, i, a) => v && a.indexOf(v) === i);
          if (this._user && ids.length) this._user.profiles(ids).then(ps => { const names = {}; ids.forEach(k => { names[k] = (ps[k] && ps[k].name) || ''; }); this.setState({ names }); }).catch(() => {});
        }, err),
        db.doc('team/standards').onSnapshot(s => { const d = s.exists ? s.data() : null; if (d && d.std) this.setState({ std: d.std }); }, err),
        db.doc('team/approvals').onSnapshot(s => { const d = s.exists ? s.data() : null; this.setState({ appr: (d && d.ids) || {} }); }, err)
      ];
    } catch (e) { /* the page works without a store */ }
  }

  dbErr(e) {
    const code = e && e.code;
    if (code === 'quota_exceeded') return this._local ? 'Browser storage is full. Delete old designs to save new ones.' : 'The shared store is full. Delete old designs to save new ones.';
    if (code === 'storage_unavailable') return 'This browser is blocking storage (private window or site data turned off), so designs cannot be saved here.';
    if (code === 'invalid_argument') return 'You can view this page but not save to it. Ask the owner for Contributor access.';
    if (code === 'resource_exhausted') return 'Too many saves in a short time. Wait a moment and try again.';
    return 'Could not save just now. Try again in a moment.';
  }

  async saveDesign(stageOverride) {
    const st = this.state; const db = this._db;
    if (!db) { this.setState({ portMsg: 'Saving works when this page is opened in Claude while signed in.', portErr: true }); return; }
    const ds = this.designState(); const A = this.getApp(); const sc = this.scen(); const r = this.checkDesign(ds.comps, c => ds.picks[c]);
    const mine = st.savedId ? (st.portfolio || []).find(d => d.id === st.savedId && d.ownerId === st.uid) : null;
    const now = new Date().toISOString();
    const canvas = st.canvas && st.canvas.app === st.app ? { nodes: st.canvas.nodes.map(n => ({ id: n.id, cid: n.cid, x: n.x, y: n.y, p: n.p == null ? null : n.p })), edges: st.canvas.edges.map(e => ({ a: e.a, b: e.b, t: e.t })) } : null;
    const picks = {}; Object.keys(ds.picks).forEach(k => { if (ds.picks[k] != null) picks[k] = ds.picks[k]; });
    const body = { ownerId: st.uid || null, title: sc ? sc.n : A.n, app: st.app, scenario: st.scenario || null, step: st.step, level: st.level,
      stage: stageOverride || (mine && mine.stage === 'review' ? 'review' : this.liveStage(r)), savedAt: now, createdAt: (mine && mine.createdAt) || now,
      settings: { ai: st.ai, reg: !!st.reg, field: st.field, scale: st.scale, cloud: st.cloud, avail: st.avail }, comps: ds.comps, picks, canvas,
      principles: this.prinOn(), contract: !!(st.contractSigned || stageOverride === 'review'), aiBoard: st.boardVerdict ? { decision: st.boardVerdict.decision, conditions: st.boardVerdict.conditions, summary: st.boardVerdict.summary, at: st.boardVerdict.at } : null, custom: st.app === 'custom' && st.custom ? st.custom : null };
    this.setState({ portMsg: 'Saving...', portErr: false });
    try {
      const ref = mine ? db.doc('portfolio/' + mine.id) : db.collection('portfolio').doc();
      await ref.set(body);
      this.setState({ savedId: ref.id, portMsg: (mine ? 'Updated' : 'Saved') + ' ' + body.title + ' in your portfolio.', portErr: false });
    } catch (e) { this.setState({ portMsg: this.dbErr(e), portErr: true }); }
  }

  openDesign(d) {
    const s = d.settings || {};
    const patch = { app: d.app, scenario: d.scenario || null, level: d.level || this.state.level, step: d.step || 'blueprint', mode: 'learn', showPort: false,
      outcomes: [{ picks: Object.assign({}, d.picks || {}) }], outcomesApp: d.app, active: 0, chosen: null, guided: false, focus: null, predict: {},
      canvas: d.canvas ? { app: d.app, nodes: d.canvas.nodes || [], edges: d.canvas.edges || [] } : null, canvasSel: null, linkFrom: null,
      principles: d.principles || null, contractSigned: !!d.contract, board: null, boardVerdict: d.aiBoard || null, savedId: d.ownerId && d.ownerId === this.state.uid ? d.id : null, openCard: null,
      portMsg: d.ownerId && d.ownerId === this.state.uid ? '' : 'Opened a copy. Saving creates a new design in your portfolio.', portErr: false };
    if (d.app === 'custom' && d.custom) patch.custom = d.custom;
    ['ai', 'field', 'scale', 'cloud', 'avail'].forEach(k => { if (s[k] != null) patch[k] = s[k]; }); if (s.reg != null) patch.reg = !!s.reg;
    this.setState(patch);
  }

  async deleteDesign(id) {
    if (!this._db) return;
    try { await this._db.doc('portfolio/' + id).delete(); this.setState({ confirmDel: null, portMsg: 'Deleted.', portErr: false, savedId: this.state.savedId === id ? null : this.state.savedId }); }
    catch (e) { this.setState({ confirmDel: null, portMsg: this.dbErr(e), portErr: true }); }
  }

  async writeTeam(path, body) {
    if (!this._db) return;
    try { await this._db.doc(path).set(body); } catch (e) { this.setState({ teamMsg: e && e.code === 'invalid_argument' ? 'Only editors of this page can change team standards and approvals.' : 'Could not save the change. Try again.' }); }
  }

  portVals() {
    const st = this.state; const D = this.data();
    const mine = (st.portfolio || []).filter(d => d.ownerId && d.ownerId === st.uid);
    const fmt = iso => { try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
    const stageName = { draft: 'Draft', sim: 'Simulated', review: 'Ready for review', approved: 'Approved' };
    const confC = c => c == null ? 'var(--ink-3)' : c >= 85 ? 'var(--good)' : c >= 70 ? 'var(--warn)' : 'var(--bad)';
    const myPort = mine.map(d => { const r = this.checkDesign(d.comps, c => (d.picks || {})[c]); const cur = st.savedId === d.id; const conf = st.confirmDel === d.id; const stg = (st.appr || {})[d.id] && d.stage === 'review' ? 'approved' : d.stage;
      return { title: d.title, meta: ((D.apps[d.app] && D.apps[d.app].n) || 'Custom design') + ' · ' + (stageName[stg] || 'Draft') + ' · saved ' + fmt(d.savedAt) + (cur ? ' · open now' : ''), confC: confC(r.conf), confLine: r.conf == null ? 'No products chosen' : r.conf + '% on enterprise standards',
        bd: cur ? 'var(--accent)' : 'var(--hair)', openLabel: cur ? 'Reload' : 'Open', open: () => this.openDesign(d), delLabel: conf ? 'Confirm delete' : 'Delete', delBg: conf ? 'var(--bad)' : 'var(--surface)', delFg: conf ? 'var(--on-accent)' : 'var(--bad)', delBd: conf ? 'var(--bad)' : 'var(--bad-line)',
        del: () => { if (conf) this.deleteDesign(d.id); else this.setState({ confirmDel: d.id }); } }; });
    const ready = !!this._db;
    return { showPort: !!st.showPort, togglePort: () => this.setState({ showPort: !st.showPort, portMsg: '' }), portExpanded: st.showPort ? 'true' : 'false', portCount: ready ? '· ' + mine.length : '',
      portBg: st.showPort ? 'var(--accent-soft)' : 'var(--surface)', portBd: st.showPort ? 'var(--accent)' : 'var(--hair)', portFg: st.showPort ? 'var(--accent-ink)' : 'var(--ink)',
      portNote: ready && this._local ? 'Designs are saved in this browser only. Clearing site data removes them.' : ready ? (st.canWrite ? 'Designs you save stay in your portfolio.' : 'You can view designs here. Saving needs Contributor access.') : 'Saving works when this page is opened in Claude while signed in.',
      canSave: ready && st.canWrite !== false, saveLabel: st.savedId ? 'Save changes' : 'Save current design', saveDesign: () => this.saveDesign(),
      hasPortMsg: !!st.portMsg, portMsg: st.portMsg || '', portMsgBg: st.portErr ? 'var(--bad-soft)' : 'var(--good-soft)', portMsgFg: st.portErr ? 'var(--bad)' : 'var(--good)',
      portEmpty: ready && !mine.length, myPort };
  }

  // ---------- Team mode ----------
  teamVals(qRight, qTotal) {
    const D = this.data(); const st = this.state; const std = this.stdMap(); const A = this.getApp(); const sc = this.scen();
    const ACC = 'var(--accent)', SOFT = 'var(--accent-soft)', LINE = 'var(--hair)', INK = 'var(--ink)', GOOD = 'var(--good)', WARN = 'var(--warn)', BAD = 'var(--bad)';
    const team = st.mode === 'team';
    const modes = [['learn', 'Learn', 'Build proficiency on realistic scenarios'], ['team', 'Team', 'See and steer the architecture work in flight']].map(([v, l, tip]) => ({
      l, tip, on: st.mode === v ? 'true' : 'false', pick: () => this.setState({ mode: v }),
      bg: st.mode === v ? 'var(--surface)' : 'transparent', fg: st.mode === v ? INK : 'var(--on-inverse-2)' }));
    const out = { modes, isLearnMode: !team, isTeamMode: team };
    if (!team) return out;
    const lead = st.isLead !== false; const appr = Object.assign({}, st.apprLocal || {}, st.appr || {});
    const DAY = 864e5; const now = Date.now();

    const ds = this.designState();
    const mineC = this.checkDesign(ds.comps, c => ds.picks[c]);
    const designs = [{ id: st.savedId || 'mine', title: sc ? sc.n : A.n, owner: 'You', tpl: 'Live from Learn', stage: this.liveStage(mineC), mine: true, r: mineC, created: null, ai: st.boardVerdict }];
    (st.portfolio || []).forEach(d => {
      if (d.id === st.savedId) return;
      const r = this.checkDesign(d.comps, c => (d.picks || {})[c]);
      const owner = d.ownerId && d.ownerId === st.uid ? 'You (saved)' : ((st.names || {})[d.ownerId] || 'A colleague');
      designs.push({ id: d.id, title: d.title, owner, tpl: (D.apps[d.app] && D.apps[d.app].n) || 'Custom design', stage: d.stage || 'draft', mine: false, r, ai: d.aiBoard || null, created: d.createdAt ? Date.parse(d.createdAt) : null, doc: d });
    });
    const samplesOn = st.showSamples !== false;
    if (samplesOn) {
      const S = [
        ['s1', 'Clinical trial data platform', 'A. Rao', 'Lakehouse and analytics', 'review', ['ui', 'gw', 'app', 'db', 'lake', 'catalog', 'idp', 'obs', 'mq'], ['mq'], 9],
        ['s2', 'Supplier onboarding on ERP', 'M. Chen', 'Procurement implementation', 'sim', ['ux', 'erpcore', 'p2p', 'ipaas', 'mdm', 'grc', 'idp'], ['ipaas', 'mdm'], 15],
        ['s3', 'Field sales copilot', 'J. Okafor', 'AI-enabled CRM', 'draft', ['ui', 'crmcore', 'orch', 'llm', 'vec', 'aigw', 'guard', 'idp'], ['guard'], 4],
        ['s4', 'Lab results patient app', 'S. Iyer', 'Consumer app', 'sim', ['ui', 'edge', 'gw', 'app', 'db', 'cache', 'idp', 'obs'], [], 11],
        ['s5', 'HR self-service portal', 'L. Novak', 'HR implementation', 'approved', ['ux', 'hcm', 'payroll', 'talent', 'ipaas', 'idp', 'grc'], [], 30],
        ['s6', 'Plant event streaming', 'R. Mensah', 'Event-driven platform', 'draft', ['ingest', 'stream', 'mq', 'tsdb', 'lake', 'obs'], ['stream', 'tsdb'], 6]
      ];
      S.forEach(([id, title, owner, tpl, stage, cids, dev, ago]) => {
        const r = this.checkDesign(cids, c => { const n = D.cat[c].o.length; const i = std[c].i >= 0 ? std[c].i : 0; return dev.indexOf(c) >= 0 && n > 1 ? (i + 1) % n : i; });
        designs.push({ id, title, owner, tpl, stage, mine: false, sample: true, r, created: now - ago * DAY, approvedDays: id === 's5' ? 12 : null });
      });
    }
    designs.forEach(d => { if (appr[d.id] && d.stage === 'review') { d.stage = 'approved'; const t = Date.parse(appr[d.id]); if (d.created && !isNaN(t)) d.approvedDays = Math.max(0, Math.round((t - d.created) / DAY)); } });

    const confC = c => c == null ? 'var(--ink-3)' : c >= 85 ? GOOD : c >= 70 ? WARN : BAD;
    const stageDef = [['draft', 'Draft', 'Being shaped'], ['sim', 'Simulated', 'Tested on load, failure and cost'], ['review', 'Ready for review', 'Contract signed, waiting for the board'], ['approved', 'Approved', 'Cleared to build']];
    const card = d => {
      const sel = st.openCard === d.id; const c = d.r.conf;
      return { title: d.title, owner: d.owner + (d.sample ? ' · sample' : ''), template: d.tpl, mine: d.mine,
        pct: (c || 0) + '%', barC: confC(c), confC: confC(c), confLine: c == null ? 'No choices yet' : c + '% on standards',
        devLine: d.r.devN ? d.r.devN + (d.r.devN === 1 ? ' issue' : ' issues') : (c == null ? '' : 'No issues'),
        hasAi: !!d.ai, aiLine: d.ai ? 'AI board: ' + ({ approve: 'approved', conditional: 'approved with ' + (d.ai.conditions || []).length + ' conditions', reject: 'not approved' }[d.ai.decision] || 'reviewed') : '', aiC: d.ai ? ({ approve: GOOD, conditional: WARN, reject: BAD }[d.ai.decision] || 'var(--ink-3)') : 'var(--ink-3)',
        canApprove: d.stage === 'review' && lead && !d.mine,
        approve: () => { const t = new Date().toISOString(); if (d.sample) { this.setState({ apprLocal: Object.assign({}, st.apprLocal || {}, { [d.id]: t }) }); return; } const next = Object.assign({}, st.appr || {}, { [d.id]: t }); this.setState({ appr: next }); if (this._db) this.writeTeam('team/approvals', { ids: next }); },
        open: () => this.setState({ openCard: sel ? null : d.id }), expanded: sel ? 'true' : 'false',
        bd: sel ? ACC : LINE, ring: sel ? '0 0 0 1px ' + ACC : 'none' };
    };
    const columns = stageDef.map(([k, l, s]) => { const items = designs.filter(d => d.stage === k).map(card); return { l, s, n: items.length, items, empty: !items.length }; });

    const od = designs.find(d => d.id === st.openCard);
    const markOf = { ok: ['Standard', GOOD, 'var(--good-soft)'], dev: ['Deviation', BAD, 'var(--bad-soft)'], review: ['Under review', WARN, 'var(--warn-soft)'], open: ['Open', 'var(--ink-3)', 'var(--fill-1)'], free: ['No standard', 'var(--accent-ink)', 'var(--accent-soft)'] };
    const order = { dev: 0, review: 1, open: 2, free: 3, ok: 4 };
    const detail = od ? {
      title: od.title, sub: od.owner + ' · ' + od.tpl + ' · ' + stageDef.find(x => x[0] === od.stage)[1], mine: od.mine || !!od.doc, openLabel: od.mine ? 'Continue in Learn' : 'Open in Learn',
      summary: od.r.conf == null ? 'No products chosen yet. Choices made in Learn appear here as they happen.'
        : od.r.conf + '% of chosen building blocks follow the enterprise standard. ' + (od.r.devN ? od.r.devN + ' to resolve before the review board.' : 'Nothing to resolve before the review board.'),
      checks: od.r.checks.slice().sort((a, b) => order[a.st] - order[b.st]).map(x => ({ c: x.c, t: x.t, mark: markOf[x.st][0], fg: markOf[x.st][1], bg: markOf[x.st][2] }))
    } : { title: '', sub: '', mine: false, openLabel: '', summary: '', checks: [] };

    const live = designs.filter(d => d.stage !== 'approved');
    const scored = designs.filter(d => d.r.conf != null);
    const avg = scored.length ? Math.round(scored.reduce((a, d) => a + d.r.conf, 0) / scored.length) : 0;
    const issues = live.reduce((a, d) => a + d.r.devN, 0);
    const days = designs.filter(d => d.stage === 'approved' && d.approvedDays != null).map(d => d.approvedDays).sort((a, b) => a - b);
    const med = days.length ? days[Math.floor((days.length - 1) / 2)] : null;

    // Bench
    const lvLabel = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
    const lvC = { beginner: ['var(--fill)', 'var(--ink-2)'], intermediate: [SOFT, 'var(--accent-ink)'], advanced: ['var(--good-soft)', GOOD] };
    const vis = this.visibleSteps(); const curStep = vis.find(s => s[0] === st.step) || vis[0];
    const bench = [{ n: 'You', role: 'Learning in ArchStudio', level: st.level, sc: (st.portfolio || []).filter(d => d.ownerId && d.ownerId === st.uid).length || (mineC.chosen ? 1 : 0), cp: qRight + ' / ' + qTotal, next: 'Now on: ' + curStep[1].toLowerCase(), you: true }];
    const byOwner = {};
    (st.portfolio || []).forEach(d => { if (!d.ownerId || d.ownerId === st.uid) return; const b = byOwner[d.ownerId] || (byOwner[d.ownerId] = { n: (st.names || {})[d.ownerId] || 'A colleague', role: 'Architect', level: d.level || 'beginner', sc: 0, cp: 'Not shared', next: 'Latest: ' + d.title }); b.sc++; });
    Object.keys(byOwner).forEach(k => bench.push(byOwner[k]));
    if (samplesOn) [
      ['L. Novak', 'Enterprise architect', 'advanced', 12, '19 / 20', 'Mentoring two learners'],
      ['A. Rao', 'Solution architect', 'advanced', 11, '18 / 20', 'Ready to lead a review'],
      ['M. Chen', 'Domain architect, ERP', 'intermediate', 7, '13 / 16', 'Next: gap analysis'],
      ['S. Iyer', 'Tech lead', 'intermediate', 6, '12 / 16', 'Next: decision records'],
      ['J. Okafor', 'Senior developer', 'beginner', 3, '6 / 10', 'Next: design canvas'],
      ['R. Mensah', 'Data engineer', 'beginner', 2, '5 / 10', 'Next: compare outcomes']
    ].forEach(([n, role, level, scn, cp, next]) => bench.push({ n: n + ' (sample)', role, level, sc: scn, cp, next }));
    const benchV = bench.map(b => ({ n: b.n, role: b.role, level: lvLabel[b.level] || 'Beginner', sc: b.sc, cp: b.cp, next: b.next, lbg: (lvC[b.level] || lvC.beginner)[0], lfg: (lvC[b.level] || lvC.beginner)[1], rowBg: b.you ? 'var(--accent-soft)' : 'var(--surface)' }));

    const kpis = [
      { l: 'Designs in flight', v: String(live.length), s: designs.filter(d => d.stage === 'review').length + ' waiting for the board' },
      { l: 'On enterprise standards', v: scored.length ? avg + '%' : 'Not measured', s: scored.length ? 'Average across designs with choices' : 'No pattern library set' },
      { l: 'Issues to resolve', v: String(issues), s: 'Deviations and patterns under review' },
      { l: 'Draft to approval', v: med == null ? 'None yet' : med + (med === 1 ? ' day' : ' days'), s: days.length ? 'Median of ' + days.length + ' approved' : 'Measured once designs are approved' }
    ];

    // Pattern library
    const usedBy = {}; designs.forEach(d => d.r.checks.forEach(x => { usedBy[x.c] = (usedBy[x.c] || 0) + 1; }));
    const setStd = (cid, patch) => { if (!lead) return; const cur = this.stdMap(); const next = Object.assign({}, cur, { [cid]: Object.assign({}, cur[cid], patch) }); this.setState({ std: next }); if (this._db) this.writeTeam('team/standards', { std: next }); };
    const library = ['exp', 'edge', 'app', 'data', 'x'].map(k => {
      const ids = Object.keys(D.cat).filter(c => D.cat[c].layer === k);
      const rows = ids.map(cid => {
        const cc = D.cat[cid]; const sd = std[cid]; const unset = sd.status === 'none' || sd.i < 0; const ok = !unset && sd.status === 'approved'; const n = usedBy[cc.l] || 0;
        return { l: cc.l, used: n ? 'Used in ' + n + (n === 1 ? ' design' : ' designs') + ' on the board' : 'Not used on the board yet',
          status: unset ? 'Not set' : ok ? 'Approved' : 'Under review', aria: cc.l + ': ' + (unset ? 'no standard set' : ok ? 'approved' : 'under review') + (lead ? ', select to change' : ''),
          sbg: unset ? 'var(--fill)' : ok ? 'var(--good-soft)' : 'var(--warn-soft)', sfg: unset ? 'var(--ink-2)' : ok ? GOOD : WARN, toggle: () => setStd(cid, unset ? { status: 'approved', i: 0 } : { status: ok ? 'review' : 'approved' }),
          opts: cc.o.map((o, j) => { const on = !unset && sd.i === j; return { n: o.n, on: on ? 'true' : 'false', pick: () => setStd(cid, { i: j, status: unset ? 'approved' : sd.status }), bg: on ? SOFT : 'var(--surface)', bd: on ? ACC : LINE, fg: on ? 'var(--accent-ink)' : INK }; }) };
      });
      return { name: D.layerNames[k] + ' · ' + { exp: 'Application', edge: 'Technology', app: 'Application', data: 'Data', x: 'Technology' }[k] + ' building blocks', count: rows.filter(r => r.status === 'Approved').length + ' of ' + rows.length + ' approved', rows };
    }).filter(g => g.rows.length);
    const approvedN = Object.keys(std).filter(c => std[c].status === 'approved').length;

    const tv = st.teamView;
    const teamTabs = [['flight', 'Work in flight', designs.length], ['library', 'Pattern library', approvedN + ' approved'], ['bench', 'Bench', benchV.length]].map(([v, l, n]) => ({
      l, n, on: tv === v ? 'true' : 'false', pick: () => this.setState({ teamView: v }), bd: tv === v ? ACC : 'transparent', fg: tv === v ? 'var(--accent-ink)' : 'var(--ink-2)' }));
    const realN = (st.portfolio || []).length;
    const teamNote = st.teamMsg ? st.teamMsg : this.libNone() ? 'No pattern library is set, so conformance is not measured. Load an example library on the Canvas, or set your own standards in the Pattern library tab.' : (this._db ? realN + (realN === 1 ? ' saved design' : ' saved designs') + ' from your team' + (samplesOn ? ', plus sample designs for illustration.' : '.') + (lead ? '' : ' Only editors of this page can approve or change standards.') : 'Showing your live design and sample designs. Open this page in Claude to share designs with your team.');

    return Object.assign(out, {
      briefLine: 'Team practice · ' + live.length + ' designs in flight · ' + avg + '% on standards',
      teamTitle: 'Architecture work in flight',
      teamIntro: 'Every design your architects are shaping, checked against your approved solution building blocks. Your own design is live from Learn; saved designs come from your team\'s portfolios.',
      kpis, teamTabs, isFlight: tv === 'flight', isLibrary: tv === 'library', isBench: tv === 'bench', teamNote,
      toggleSamples: () => this.setState({ showSamples: !samplesOn, openCard: null }), samplesOn: samplesOn ? 'true' : 'false', samplesLabel: samplesOn ? 'shown' : 'hidden',
      columns, hasDetail: !!od, detail, closeDetail: () => this.setState({ openCard: null }),
      openLearn: () => { if (od && od.doc) this.openDesign(od.doc); else this.setState({ mode: 'learn' }); },
      library, bench: benchV
    });
  }

  renderVals() {
    const D = this.data(); this.ensureAdm(D); const st = this.state; const A = this.getApp(); const C = D.cat; const comps = this.comps(); const ent = st.lens === 'enterprise';
    const ACC = 'var(--accent)', SOFT = 'var(--accent-soft)', LINE = 'var(--hair)', INK = 'var(--ink)';
    const sel = on => ({ bg: on ? SOFT : 'var(--surface)', fg: on ? 'var(--accent-ink)' : INK, bd: on ? ACC : LINE, ring: on ? '0 0 0 1px ' + ACC : 'none' });
    const go = id => () => { this.setState({ step: id, focus: null, showSide: false, showMenu: false }); try { window.scrollTo({ top: 0 }); setTimeout(() => { const el = document.querySelector('.as-chev[aria-current="step"]'); if (el) el.scrollIntoView({ block: 'nearest', inline: 'center' }); }, 60); } catch (e) {} };
    const vis = this.visibleSteps(); const visIds = vis.map(s => s[0]);
    const step = visIds.indexOf(st.step) >= 0 ? st.step : 'brief';
    const si = visIds.indexOf(step);
    const steps = vis.map((s, i) => { const cur = step === s[0]; const done = i < visIds.indexOf(step);
      return { label: s[1], go: go(s[0]), cur: cur ? 'step' : 'false', doneFlag: done ? 'true' : 'false', mark: done ? '\u2713' : String(i + 1), phase: s[3] || '', hasPhase: !!s[3], pbg: cur ? 'var(--surface)' : 'var(--fill)', pfg: 'var(--accent-ink)',
        bg: cur ? SOFT : 'var(--surface)', fg: cur ? 'var(--accent-ink)' : (done ? INK : 'var(--ink-2)'), bd: cur ? ACC : LINE,
        cbg: cur ? ACC : (done ? 'var(--good)' : 'var(--surface)'), cfg: cur || done ? 'var(--on-accent)' : 'var(--ink-2)', cbd: cur ? ACC : (done ? 'var(--good)' : 'var(--ink-4)') }; });
    const lockedN = this.allSteps().filter(x => x[0] !== 'tour').length - vis.filter(x => x[0] !== 'tour').length;
    const coaches = { workload: 'Numbers before boxes. Every building block should trace back to a number on this page; if it cannot, question whether you need it.', tour: 'Watch how each component earns its place. Notice that the reason always comes before the product.',
      brief: 'Seniors start from constraints, not technologies: scale, data sensitivity, availability and who will run it.',
      blueprint: 'Ask what you can leave out. Every box you add is something to run, secure and pay for. Switch one off and see.',
      outcomes: 'Predict before you pick. Making at least one choice you would not normally make sharpens why your favourite wins.',
      compare: 'No option wins on every quality. Name the trade-off you are accepting, out loud.',
      decisions: 'If a decision is not written down, it will be relitigated. Decision records are cheap insurance.',
      evolve: 'Design for the next 10x, not the final 1000x. Distributing too early is a common junior mistake.',
      enterprise: 'A good system in the wrong enterprise context is still a bad decision. Reuse standards first.',
      drill: 'Assume every component fails. The question is how fast you notice and how far the damage spreads.',
      review: 'Answer board questions with evidence: numbers, decision records and drill results.',
      principles: 'Principles settle arguments before they start. Adopt few, and make each one testable.',
      vision: 'Name the people with power first. A design they never asked for will not survive the review board.',
      canvas: 'Start from the standard block and deviate only with a reason you would defend at the board.',
      gap: 'Never jump from baseline to target in one step. Each plateau should be something the business can run on.',
      board: 'Answer with the specifics of your design: names, numbers and the trade-off you accepted. Boards distrust adjectives.',
      change: 'Most change is smaller than it looks. Reserve a new ADM cycle for changes to drivers, scope or strategy.' };
    if (st.track === 'interview') {
      coaches.brief = 'Interview habit: spend the first minutes asking, not drawing. Users, load, data size, and what an outage costs.';
      coaches.workload = 'Say the numbers out loud. Interviewers care less about the exact figure than whether your design follows from it.';
      coaches.blueprint = 'Draw the simplest thing that meets the numbers, then add parts only when a number forces you to.';
      coaches.drill = 'Expect "what happens when this fails?" Name how you would notice, how far it spreads and how you recover.';
    } else if (st.track === 'tradeoff') {
      coaches.outcomes = 'Make the two designs genuinely different: one open source and self-run, one managed. Similar options teach nothing.';
      coaches.compare = 'Finish by saying which design you would pick and the one quality you are giving up for it.';
    }
    if (ent) {
      coaches.brief = 'Portfolio first: start from the capability that must improve and the systems that serve it today. Technology comes later.';
      coaches.blueprint = 'Look outward first. A solution that fits its neighbours and lets old systems retire beats a clever one that adds to the estate.';
      coaches.compare = 'Weigh portfolio fit: reuse, retirement and lock-in matter more than a few points of performance.';
      coaches.enterprise = 'Find the weakest capability with the most duplicated systems. That is usually where the case for change is strongest.';
      coaches.workload = 'Optional here: a quick sanity check that the chosen platform can carry the load. Portfolio decisions rarely hinge on it.';
    }
    const levels = [['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced']].map(([v, l]) => ({ l, on: st.level === v ? 'true' : 'false', pick: () => this.setLevel(v), bg: st.level === v ? 'var(--surface)' : 'transparent', fg: st.level === v ? 'var(--accent-ink)' : 'var(--ink-2)' }));

    const isImplApp = A.kind === 'impl';
    const implTerms = { brief: ['gxp'], blueprint: ['cleancore','mdmg','fts'], outcomes: ['cleancore'], evolve: ['fts','cutover','gxp'], drill: ['cutover','sod'], review: ['sod'] };
    const aiOn = st.ai !== 'none';
    const aiTerms = { brief: ['agentic'], blueprint: ['aigw','agentic','hitl'], outcomes: ['aigw','evals'], compare: ['evals'], evolve: ['evals','hitl'], enterprise: ['euaiact'], drill: ['hitl','evals'], review: ['euaiact','evals'] };
    const termKeys = (D.stepTerms[step] || []).concat(isImplApp ? (implTerms[step] || []) : []).concat(aiOn ? (aiTerms[step] || []) : []).filter((k, i, a) => a.indexOf(k) === i);
    const terms = termKeys.map(k => Object.assign({ l: D.glossary[k][0], on: st.term === k ? 'true' : 'false', pick: () => this.setState({ term: st.term === k ? null : k }) }, sel(st.term === k)));
    const hasTerm = !!st.term && termKeys.indexOf(st.term) >= 0;
    const term = hasTerm ? { l: D.glossary[st.term][0], d: D.glossary[st.term][1], a: D.glossary[st.term][2] } : { l: '', d: '', a: '' };

    // Worked example: handcrafted for the shop, generated from the current model otherwise
    const aiLabel = { none: 'no AI', enabled: 'AI-enabled', native: 'AI-native' }[st.ai];
    let tourSteps;
    if (st.app === 'ecom') tourSteps = D.tour.slice();
    else {
      const layerT = { exp: isImplApp ? 'Where employees work' : 'Where people meet the system', edge: 'One controlled front door', app: isImplApp ? 'The core and what sits beside it' : 'Where the work happens', data: 'Where the truth lives', x: 'Services every part relies on' };
      const layerN = { exp: 'Design for the user\'s job, not the org chart. Fewer screens and fewer logins win adoption.',
        edge: 'Security, rate limits and routing in one place are easier to get right than in fifty places.',
        app: isImplApp ? 'Keep the core standard and put custom logic beside it, so upgrades stay routine.' : 'Start as a modular monolith; split services only when scale or team structure demands it.',
        data: isImplApp ? 'Master data quality decides go-live success more than any configuration choice.' : 'Choose stores from the shape of the data: relational for transactions, others for other shapes.',
        x: 'Identity, observability and governance are usually enterprise standards. Reuse them before choosing your own.' };
      const aiIds = ['aigw','llm','guard','aigov','agents','tools','mem','embai'];
      const core = comps.filter(c => aiOn ? aiIds.indexOf(c) < 0 : true);
      tourSteps = [['The brief', 'You are designing ' + A.n + '. ' + A.d + ' Before naming any product, a senior architect pins down the constraints: ' + st.scale + ' users, ' + (st.reg ? 'regulated data' : 'standard data') + ', ' + st.avail + '% availability, ' + aiLabel + ', ' + (st.field === 'brown' ? 'replacing an existing system' : 'a fresh start') + '.', [], 'Constraints decide trade-offs. Products come last.']];
      ['exp','edge','app','data','x'].forEach(k => {
        const cs = core.filter(c => C[c].layer === k); if (!cs.length) return;
        const shown = cs.slice(0, 3);
        tourSteps.push([layerT[k], shown.map(c => C[c].l + ': ' + C[c].need).join(' ') + (cs.length > 3 ? ' Plus ' + cs.slice(3).map(c => C[c].l.toLowerCase()).join(', ') + '.' : ''), cs.map(c => C[c].l), layerN[k]]);
      });
      if ((A.sig || []).length) tourSteps.push(['Patterns worth borrowing', A.sig.slice(0, 3).map(x => x[0] + ': ' + x[1]).join(' '), [], 'Borrow the pattern, not the product list. Ask which of their problems you actually have.']);
      tourSteps.push(isImplApp ? ['Run it as a programme', 'Implementations move through discover, explore, realize, then deploy and run. Fit-to-standard workshops shape the template, migration is rehearsed, cutover is planned hour by hour, and hypercare follows go-live.', [], 'Most implementation failures are programme failures: scope creep, heavy customisation and bad data, not technology.']
        : ['See and decide', 'Observability shows what is happening in production. Every choice gets a decision record naming the alternatives and the trade-off accepted.', comps.indexOf('obs') >= 0 ? [C.obs.l] : [], 'Every design accepts trade-offs. Name them and write them down.']);
    }
    if (aiOn) {
      const aiCs = comps.filter(c => ['aigw','llm','guard','aigov','agents','tools','mem','embai'].indexOf(c) >= 0);
      const step = st.ai === 'native'
        ? ['Where agents do the work', 'In an AI-native design, agents carry out the steps and people supervise. ' + aiCs.slice(0, 4).map(c => C[c].l + ': ' + C[c].need).join(' '), aiCs.map(c => C[c].l), 'Give every agent its own identity, narrow tools, a budget, and human approval for anything irreversible.']
        : ['Where AI assists', 'In an AI-enabled design, copilots help people inside existing steps. ' + aiCs.slice(0, 4).map(c => C[c].l + ': ' + C[c].need).join(' '), aiCs.map(c => C[c].l), 'AI-enabled features should degrade gracefully: if the model is down, the process still works.'];
      if (aiCs.length) tourSteps.splice(tourSteps.length - 1, 0, step);
    }
    const tIdx = Math.min(st.tourIdx, tourSteps.length - 1); const ts = tourSteps[tIdx];
    const tour = { pos: 'Part ' + (tIdx + 1) + ' of ' + tourSteps.length, t: ts[0], b: ts[1], note: ts[3], chips: ts[2].map(n => ({ n })), hasChips: ts[2].length > 0 };
    const tourMap = tourSteps.slice(1).map((s, i) => { const seen = i + 1 < tIdx; const cur = i + 1 === tIdx; return { n: s[2].length ? s[2].join(' + ') : s[0], state: cur ? 'now' : (seen ? 'done' : 'todo') }; });
    const tourSegs = tourSteps.map((s, i) => ({ state: i === tIdx ? 'now' : (i < tIdx ? 'done' : 'todo'), aria: 'Part ' + (i + 1) + ': ' + s[0], go: () => this.setState({ tourIdx: i }) }));
    const tourTitle = 'How a senior architect designs ' + (st.app === 'ecom' ? 'an online shop' : A.n) + (aiOn ? ' (' + aiLabel + ')' : '');
    const nums = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
    const tourIntro = (nums[tourSteps.length] || tourSteps.length) .toString().replace(/^./, ch => ch.toUpperCase()) + ' short steps through the model you have chosen. Pick a different template or describe your own in the Brief, and this walkthrough follows it.';

    const apps = D.baseKeys.map(k => Object.assign({ n: D.apps[k].n, d: D.apps[k].d, count: D.apps[k].c.length + ' components at Advanced', pick: () => this.setState({ app: k, active: 0, chosen: null, capMat: {}, time: {}, off: {}, reqStep: -1, predict: {}, focus: null }) }, sel(st.app === k)));
    const implApps = D.implKeys.map(k => Object.assign({ n: D.apps[k].n, d: D.apps[k].d, count: D.apps[k].c.length + ' components at Advanced', pick: () => this.setState({ app: k, active: 0, chosen: null, capMat: {}, time: {}, off: {}, reqStep: -1, predict: {}, focus: null }) }, sel(st.app === k)));
    const grp = (label, key, opts) => ({ label, opts: opts.map(([v, l]) => Object.assign({ l, pick: () => this.setState({ [key]: v }) }, sel(st[key] === v))) });
    const ctx = [
      grp('AI posture', 'ai', [['none','No AI'],['enabled','AI-enabled (copilots assist people)'],['native','AI-native (agents do the work, people supervise)']]),
      grp('Expected scale', 'scale', [['10k','10k users'],['1M','1M users'],['50M','50M users']]),
      grp('Data sensitivity', 'reg', [[false,'Standard'],[true,'Regulated (GxP, PII)']]),
      grp('Availability target', 'avail', [['99.9','99.9%'],['99.95','99.95%'],['99.99','99.99%']]),
      grp('Cloud posture', 'cloud', [['aws','AWS first'],['azure','Azure first'],['multi','Multi-cloud or hybrid']]),
      grp('Starting point', 'field', [['green','Greenfield'],['brown','Brownfield (replace or extend legacy)']])
    ];
    const rps = { '10k': '200', '1M': '8,000', '50M': '250,000' }[st.scale];
    const mins = Math.round((1 - parseFloat(st.avail) / 100) * 43800);
    const planning = 'Planning figures (illustrative): about ' + rps + ' requests per second at peak; ' + st.avail + '% allows roughly ' + mins + ' minutes of downtime a month.';
    const examples = (ent ? ['Consolidate two ERPs after an acquisition','Rationalise HR and payroll systems across 20 countries','Replace the legacy data warehouse with a governed lakehouse','Move IT service management onto one platform','AI-native procure to pay on SAP with agents'] : ['SAP S/4HANA brownfield rollout for a pharma company (GxP)','AI-native procure to pay on SAP with agents','Workday HR system design with payroll','ServiceNow ITSM for global IT','Netflix-style streaming','Multi-agent research assistant','Uber-style ride hailing']).map(l => ({ l, go: () => this.send(l) }));
    const lensOk = st.lens === 'enterprise' && visIds.indexOf('enterprise') >= 0;

    // Request flow
    const okHop = c => c === 'hitl' || (comps.indexOf(c) >= 0 && !!D.hopDef[c]);
    let basePath = (A.path || D.hopOrder).slice();
    const itsmAI = st.ai !== 'none' && comps.indexOf('itsm') >= 0 && comps.indexOf('aiops') >= 0;
    if (itsmAI) {
      basePath = st.ai === 'native' ? ['obs','aiops','agents','tools','aigw','llm','guard','hitl','runbook','itsm'] : ['obs','aiops','itsm','embai','aigw','guard','runbook'];
    } else if (st.ai === 'native') {
      basePath = ['agents','tools','aigw','llm','guard','hitl'].concat(basePath.filter(c => ['ui','ux','bi','edge','agents','tools','aigw','llm','guard','embai'].indexOf(c) < 0));
    } else if (st.ai === 'enabled' && A.path) {
      const at = basePath.indexOf('idp') >= 0 ? basePath.indexOf('idp') + 1 : 1;
      basePath.splice(at, 0, 'embai', 'aigw', 'guard');
    }
    const path = basePath.filter(okHop);
    const hasCache = path.indexOf('cache') >= 0;
    const cacheAt = path.indexOf('cache');
    let total = 0;
    const hops = path.map((c, i) => {
      const off = !!st.off[c];
      const skipped = !off && hasCache && st.reqHit && i > cacheAt && D.stores.indexOf(c) >= 0;
      const ms = Math.max(0, D.hopDef[c][1]);
      const reached = i <= st.reqStep; const cur = i === st.reqStep;
      if (reached && !off && !skipped) total += ms;
      let status = 'waiting', bg = 'var(--surface)', bd = LINE, tag = 'var(--ink-3)', fg = INK;
      if (off) { status = 'missing'; bg = 'var(--warn-soft)'; bd = 'var(--warn-line)'; tag = 'var(--warn)'; }
      else if (skipped) { status = 'not needed: cache hit'; bg = 'var(--fill)'; tag = 'var(--ink-3)'; fg = 'var(--ink-3)'; }
      else if (cur) { status = 'now'; bg = SOFT; bd = ACC; tag = 'var(--accent-ink)'; }
      else if (reached) { status = 'done'; bg = 'var(--good-soft)'; bd = 'var(--good-line)'; tag = 'var(--good)'; }
      return { num: String(i + 1), status, label: c === 'hitl' ? 'Human approval' : C[c].l, act: off ? 'Without it: ' + C[c].wo : D.hopDef[c][0], ms: off || skipped ? '0 ms' : c === 'hitl' ? 'waits for a person; not counted' : (ms === 0 ? 'async, not on the user\'s wait' : '+' + ms + ' ms'), bg, bd, tag, fg };
    });
    const baseReq = A.req || 'a user makes a request';
    const req = itsmAI ? (st.ai === 'native' ? 'an alert fires and an agent triages and fixes it' : 'an alert fires and a copilot helps the engineer') : st.ai === 'native' ? 'an agent handles the task (' + baseReq + ')' : (st.ai === 'enabled' ? baseReq + ', with AI assisting' : baseReq);
    const done = st.reqStep >= path.length - 1;
    const broken = path.filter(c => st.off[c]).map(c => C[c].l.toLowerCase());
    const reqSummary = st.reqStep < 0 ? 'Press Play to watch ' + req + ', hop by hop, with latency adding up.' :
      (done ? 'Response back to the user after about ' + total + ' ms.' + (total > 1000 ? ' Users notice waits above about a second, which is why AI answers are streamed word by word.' : ' Comfortably fast.') : 'Running total: ' + total + ' ms.') +
      (broken.length ? ' Broken: no ' + broken.join(', ') + '.' : '');
    const reqPlay = () => { if (this._t) clearInterval(this._t); const n = path.length; this.setState({ reqStep: 0 }); this._t = setInterval(() => { const s = this.state.reqStep + 1; if (s >= n) { clearInterval(this._t); this._t = null; return; } this.setState({ reqStep: s }); }, 850); };
    const reqNext = () => { if (this._t) { clearInterval(this._t); this._t = null; } this.setState({ reqStep: Math.min(this.state.reqStep + 1, path.length - 1) }); };
    const reqReset = () => { if (this._t) { clearInterval(this._t); this._t = null; } this.setState({ reqStep: -1 }); };

    const layerBg = { exp: 'var(--surface)', edge: 'var(--fill-1)', app: 'var(--fill-1)', data: 'var(--fill)', x: 'var(--warn-soft)' };
    let layers = ['exp','edge','app','data','x'].map(k => ({ k, comps: comps.filter(c => C[c].layer === k) })).filter(L => L.comps.length).map(L => ({
      name: D.layerNames[L.k], bg: layerBg[L.k], border: 'solid',
      comps: L.comps.map(c => { const off = !!st.off[c]; return { label: C[c].l, need: C[c].need, an: C[c].an, wo: C[c].wo, showAn: st.plain, isOff: off, canToggle: true, offPressed: off ? 'true' : 'false',
        toggleLabel: off ? 'Switch back on' : 'Switch off', toggle: () => this.setState({ off: Object.assign({}, st.off, { [c]: !off }) }),
        count: C[c].o.length + ' platform options', bg: off ? 'var(--warn-soft)' : 'var(--surface)', bd: off ? 'var(--warn-line)' : 'var(--hair-strong)', bstyle: off ? 'dashed' : 'solid', fg: off ? 'var(--warn)' : INK }; })
    }));
    if (st.field === 'brown') layers.push({ name: 'Existing estate', bg: 'var(--warn-soft)', border: 'dashed', comps: [{ label: 'Legacy core system', need: 'The monolith or package you are replacing or extending. Front it with the gateway and migrate in slices.', an: 'the old building you renovate room by room while people still work in it.', wo: '', showAn: st.plain, isOff: false, canToggle: false, offPressed: 'false', toggleLabel: '', toggle: () => {}, count: 'Strangler-fig migration', bg: 'var(--surface)', bd: 'var(--warn-line)', bstyle: 'dashed', fg: INK }] });
    layers = layers.map((L, i) => Object.assign(L, { notFirst: i > 0 }));
    const shelf = (A.shelf || []).concat(D.shelf).map(([t, k, u]) => ({ t, k, u }));
    const sig = (A.sig || []).map(([t, d, u]) => ({ t, d, u }));


    // Design lens, pattern library and landscape
    const lensOpts = [['system', 'System first', 'Solution architects and tech leads', 'Start from one system: its users, load and building blocks. Enterprise fit is checked near the end.', 'Brief › Workload › Blueprint › Canvas › Outcomes › Compare'],
      ['enterprise', 'Enterprise portfolio first', 'Enterprise architects and portfolio owners', 'Start from business capabilities and the existing estate. The solution is designed as one change in the portfolio.', 'Brief › Vision › Business › Blueprint › Compare › Gap and roadmap']]
      .map(([v, n, who, d, path]) => Object.assign({ n, who, d, path, on: (st.lens || 'system') === v ? 'true' : 'false', pick: () => this.setState({ lens: v }) }, sel((st.lens || 'system') === v)));
    const briefIntro = ent ? 'Describe the business change: the capability that must improve, the systems involved today, what should retire, and any standards or budget limits. You can keep refining in the conversation.' : 'Describe it the way you would to a colleague: the business problem, who uses it, the systems involved, any constraints. You can keep refining in the conversation.';
    const libCur = st.std ? 'team' : (st.stdLib || 'none');
    const libDefs = [['none', 'Neutral: no standards'], ['sapms', 'Example: SAP and Microsoft estate'], ['aws', 'Example: AWS-first estate'], ['oss', 'Example: open-source-first estate']].concat(st.std ? [['team', 'Your team library']] : []);
    const libOpts = libDefs.map(([k, l]) => Object.assign({ l, on: libCur === k ? 'true' : 'false', pick: () => { if (k !== 'team') this.setState({ stdLib: k, std: null }); } }, sel(libCur === k)));
    const libNote = { none: 'Every option is judged on its own trade-offs. Nothing is marked standard or deviation, and no product is filled in for you.',
      sapms: 'An illustrative standard set for an estate built on SAP and Microsoft. Use it to practise designing within standards.',
      aws: 'An illustrative standard set for an AWS-first estate. Use it to practise designing within standards.',
      oss: 'An illustrative standard set for an estate that prefers open source. Use it to practise designing within standards.',
      team: 'Your team\'s standards, set in Team mode.' }[libCur] + (libCur === 'none' || libCur === 'team' ? '' : ' The rule: prefer the estate\'s products, otherwise the best overall score, with ties broken alphabetically. Platform-bound blocks such as SAP Fiori or embedded AI only become standard when your design uses that platform.');
    const timeNm = ['Tolerate', 'Invest', 'Migrate', 'Eliminate']; const timeSt = [['var(--fill)', 'var(--ink-2)'], ['var(--good-soft)', 'var(--good)'], ['var(--accent-soft)', 'var(--accent-ink)'], ['var(--warn-soft)', 'var(--warn)']];
    const nbAll = (aiOn ? A.nb.concat([['AI platform and model providers', st.ai === 'native' ? 'Models, agent runtimes, evaluation' : 'Models and copilots', 'AI gateway']]) : A.nb).map(([n, d, p], i) => { const t = (st.time || {})[i] || 0; return { n, d, p, time: timeNm[t], tbg: timeSt[t][0], tfg: timeSt[t][1] }; });
    const half = Math.ceil(nbAll.length / 2);
    const retireN = nbAll.filter(x => x.time === 'Eliminate' || x.time === 'Migrate').length;
    const land = { left: nbAll.slice(0, half), right: nbAll.slice(half), caps: (A.caps || []).map(n => ({ n })),
      retire: retireN ? retireN + ' connected system' + (retireN === 1 ? ' is' : 's are') + ' marked to migrate or eliminate in the Business step.' : 'Rate the connected systems in the Business step to see what this lets you retire.' };

    // Workload (first principles)
    const wlKey = A.n;
    const wlSaved = st.wl && st.wl.key === wlKey ? st.wl.v : {};
    const W = Object.assign(this.wlDefaults(A), wlSaved);
    const setW = (k, v) => this.setState({ wl: { key: wlKey, v: Object.assign({}, wlSaved, { [k]: v }) } });
    const wq = (label, help, key, opts) => ({ label, help, opts: opts.map(([v, l]) => Object.assign({ l, on: W[key] === v ? 'true' : 'false', pick: () => setW(key, v) }, sel(W[key] === v))) });
    const wQs = [
      wq('Actions per active user per day', 'Page views, transactions or API calls. ' + (isImplApp ? 'Employees in a core system are heavy users.' : 'Most consumer users are light.'), 'actions', [[10,'10'],[40,'40'],[150,'150'],[500,'500']]),
      wq('Reads compared with writes', 'How often data is looked at versus changed.', 'ratio', [['1:10','Mostly writes'],['1:1','Even'],['10:1','10 reads per write'],['100:1','100 reads per write']]),
      wq('Latency budget', 'How long a user will wait for a typical response.', 'lat', [[200,'200 ms'],[1000,'1 second'],[5000,'5 seconds']]),
      wq('Consistency', 'Can someone see slightly old data for a few seconds?', 'cons', [['strong','No: always current'],['eventual','Yes: briefly stale is fine']]),
      wq('Peak versus average', 'Sale days, month-end close, outages, Monday log-ins.', 'peak', [[2,'2x'],[5,'5x'],[20,'20x']]),
      wq('New data per year', 'Records, documents, events and media.', 'growth', [[10,'10 GB'],[1000,'1 TB'],[100000,'100 TB']]),
      wq('Main work pattern', 'What most of the work looks like.', 'pattern', [['interactive','People waiting on screens'],['async','Background tasks'],['realtime','Continuous streams'],['batch','Scheduled bulk runs']])
    ];
    const wlN = workloadNumbers(A, st);
    const { users: usersN, activeShare, dau, avgRps, peakRps, rN, readRps, writeRps, store3, perInst, inst, inflight, bw, aiCallsDay } = wlN;
    const fmtN = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n >= 10 ? String(Math.round(n)) : n.toFixed(1);
    const fmtGB = g => g >= 1000 ? fmtN(g / 1000) + ' TB' : Math.round(g) + ' GB';
    const latS = W.lat >= 1000 ? (W.lat / 1000) + ' s' : W.lat + ' ms';
    const wFig = [
      { v: fmtN(peakRps) + '/s', l: 'Peak requests', n: 'Average ' + fmtN(avgRps) + '/s × ' + W.peak + ' peak factor' },
      { v: fmtN(readRps) + ' / ' + fmtN(writeRps), l: 'Reads / writes per second', n: 'At peak, split ' + W.ratio },
      { v: fmtN(inflight), l: 'Requests in flight', n: 'Little\'s law: rate × ' + latS },
      { v: fmtGB(store3), l: 'Storage after 3 years', n: fmtGB(W.growth) + ' a year × 3 years × 3 copies' },
      { v: isImplApp ? 'Vendor-run' : String(inst), l: isImplApp ? 'Compute' : 'App instances', n: isImplApp ? 'The SaaS vendor sizes compute' : 'Peak ÷ ' + perInst + ' per instance, + 1 spare' }
    ];
    if (aiOn) wFig.push({ v: fmtN(aiCallsDay * 3000), l: 'AI tokens per day', n: fmtN(aiCallsDay) + ' AI calls × about 3,000 tokens' });
    const wCalc = [
      { h: 'ACTIVE USERS', t: fmtN(usersN) + ' users × ' + Math.round(activeShare * 100) + '% active on a typical day = ' + fmtN(dau) },
      { h: 'AVERAGE LOAD', t: fmtN(dau) + ' × ' + W.actions + ' actions ÷ 86,400 seconds = ' + fmtN(avgRps) + ' requests/s' },
      { h: 'PEAK LOAD', t: fmtN(avgRps) + ' × ' + W.peak + ' = ' + fmtN(peakRps) + ' requests/s. Size for this, not the average.' },
      { h: 'BANDWIDTH', t: fmtN(peakRps) + ' × about 30 KB per response = ' + fmtN(bw) + ' MB/s at peak' }
    ];
    if (aiOn) wCalc.push({ h: 'AI CALLS', t: fmtN(dau) + ' active users × ' + (st.ai === 'native' ? 20 : 3) + ' AI calls each (' + (st.ai === 'native' ? 'agents take many steps' : 'occasional copilot use') + ') = ' + fmtN(aiCallsDay) + ' a day' });
    const wBasis = 'Assumptions: ' + Math.round(activeShare * 100) + '% of ' + fmtN(usersN) + ' users active on a typical day (scale is set in the Brief), 400 requests/s per app instance, 30 KB per response, 3,000 tokens per AI call. They are planning figures, not measurements.';
    const inBp = c => comps.indexOf(c) >= 0;
    const fullComps = this.comps(3); const inFull = c => fullComps.indexOf(c) >= 0;
    const derived = [];
    const der = (id, verdict, because) => { if (C[id]) derived.push({ id, verdict, because }); };
    if (!isImplApp) {
      der('cache', rN >= 10 && W.lat <= 1000 ? 'need' : rN >= 10 ? 'consider' : 'no', rN >= 10 ? (W.lat <= 1000 ? 'reads outnumber writes ' + W.ratio + ' and the budget is ' + latS + ', so serve hot reads from memory.' : 'reads dominate, but a ' + latS + ' budget is generous; a cache helps rather than being required.') : 'reads and writes are balanced, so a cache would rarely be hit.');
      der('lb', inst > 1 ? 'need' : 'no', inst > 1 ? 'the peak needs ' + inst + ' instances, so traffic must be spread and failed instances skipped.' : 'one instance handles the load.');
      der('edge', W.lat <= 200 && usersN >= 1e6 ? 'need' : 'consider', W.lat <= 200 && usersN >= 1e6 ? 'a 200 ms budget for ' + fmtN(usersN) + ' users means serving content close to them.' : 'it helps with static content and attack protection, but the numbers do not force it.');
      der('nosql', writeRps > 5000 || (W.cons === 'eventual' && usersN >= 5e7) ? 'need' : 'no', writeRps > 5000 ? fmtN(writeRps) + ' writes/s is beyond one relational primary; use a store that spreads writes.' : W.cons === 'eventual' && usersN >= 5e7 ? 'brief staleness is acceptable at 50M users, so a multi-region store fits.' : 'write volume fits a relational database.');
      der('db', W.cons === 'strong' ? 'need' : 'consider', W.cons === 'strong' ? 'records must always be current and never half-written, which needs transactions.' : 'other data can be stale, but money and orders still suit transactions.');
      der('mq', W.peak >= 5 || W.pattern === 'async' || W.pattern === 'realtime' ? 'need' : 'consider', W.peak >= 5 ? 'peaks are ' + W.peak + 'x average; a queue absorbs bursts so work is delayed, not lost.' : (W.pattern === 'async' || W.pattern === 'realtime') ? 'background and streaming work should not keep users waiting.' : 'it decouples services, but the numbers do not force it.');
    } else {
      der('ipaas', W.peak >= 5 ? 'need' : 'consider', W.peak >= 5 ? W.peak + 'x peaks across many connected systems go through the integration platform, which queues and retries so nothing is lost.' : 'connected systems still need one governed way to exchange data.');
      if (['erpcore','crmcore','p2p','hcm'].some(x => A.c.indexOf(x) >= 0)) der('mdm', 'need', 'every transaction depends on correct master data, and bad master data is a leading cause of go-live failure.');
    }
    der('stream', W.pattern === 'realtime' ? 'need' : 'no', W.pattern === 'realtime' ? 'continuous streams need processing on data in motion, not nightly jobs.' : 'there are no continuous streams to process.');
    der('lake', W.growth >= 100000 || W.pattern === 'batch' ? 'need' : 'consider', W.growth >= 1000 ? fmtGB(W.growth) + ' of new data a year belongs in cheap, open storage, not the transaction database.' : 'volumes are small, so the operational database can hold history for now.');
    if (A.c.indexOf('itsm') >= 0) der('aiops', W.peak >= 5 ? 'need' : 'consider', W.peak >= 5 ? 'a ' + W.peak + 'x surge in an outage means thousands of alerts; correlation turns them into a few incidents.' : 'alert volume is modest, but correlation still cuts noise.');
    if (aiOn) der('aigw', 'need', 'about ' + fmtN(aiCallsDay) + ' AI calls a day need one place for budgets, routing, fallbacks and logs.');
    const vStyle = { need: ['Needed', 'var(--good-soft)', 'var(--good)'], consider: ['Optional', 'var(--warn-soft)', 'var(--warn)'], no: ['Not needed', 'var(--fill)', 'var(--ink-2)'] };
    const lvlWord = { 2: 'Intermediate', 3: 'Advanced' };
    const wDerived = derived.map(x => {
      const ib = inBp(x.id); const hidden = !ib && inFull(x.id); const v = vStyle[x.verdict];
      const act = x.verdict === 'need' && !ib ? [hidden ? 'Show it now' : 'Add to blueprint', () => this.editComps(x.id, true)] : x.verdict === 'no' && (ib || hidden) ? ['Remove from blueprint', () => this.editComps(x.id, false)] : null;
      return { n: C[x.id].l, b: x.because, v: v[0], vbg: v[1], vfg: v[2], status: ib ? 'In your blueprint' : hidden ? 'In the full design; shown from ' + (lvlWord[D.lvlOf[x.id]] || 'a higher') + ' level' : 'Not in your blueprint',
        hasAct: !!act, actL: act ? act[0] : '', act: act ? act[1] : () => {}, flag: (x.verdict === 'need' && !ib && !hidden) || (x.verdict === 'no' && (ib || hidden)) };
    });
    const wMis = wDerived.filter(x => x.flag).length;
    const wDimN = ['Scale', 'Cost', 'Ops ease', 'Portability', 'Speed'];
    const wFit = [];
    comps.forEach(cid => this.fitOpts(cid).forEach(o => { if (o.fit) wFit.push({ n: o.n, blk: C[cid].l, up: o.fit.every(f => f.v > 0),
      chg: o.fit.map(f => wDimN[f.d] + ' ' + (f.v > 0 ? '+' : '−') + Math.abs(f.v)).filter((x, k, a) => a.indexOf(x) === k).join(' · '),
      why: o.fit.map(f => f.why).filter((x, k, a) => a.indexOf(x) === k).join(' '), cbg: o.fit.every(f => f.v > 0) ? 'var(--good-soft)' : 'var(--warn-soft)', cfg: o.fit.every(f => f.v > 0) ? 'var(--good)' : 'var(--warn)' }); }));
    const wFitNone = !wFit.length;
    const wSummary = wMis ? wMis + ' mismatch' + (wMis === 1 ? '' : 'es') + ' between the numbers and the blueprint' : 'The blueprint matches what the numbers need';
    const wLaws = [
      { t: 'Little\'s law', d: 'Requests in flight = arrival rate × time each takes: ' + fmtN(peakRps) + '/s × ' + latS + ' ≈ ' + fmtN(inflight) + '. Connection and worker pools need at least that many slots, plus headroom.' },
      { t: W.cons === 'strong' ? 'PACELC: you chose consistency' : 'PACELC: you chose availability and speed', d: W.cons === 'strong' ? 'If the network splits, strongly consistent data stops accepting writes rather than risk conflicts. Even when healthy, keeping copies in step adds latency.' : 'Copies answer locally and stay up during network splits, at the cost of readers sometimes seeing slightly old data.' },
      { t: 'Size for the peak', d: 'Average load is ' + fmtN(avgRps) + '/s but the peak is ' + fmtN(peakRps) + '/s. Systems fail at the peak, so capacity, queues and autoscaling are planned for it.' }
    ];

    // Journey chevrons: every step on the learner's path, plus what unlocks later
    const phaseTxt = p => !p ? '' : p === 'R' ? 'Requirements' : p === 'Prelim' ? 'Preliminary' : (p.indexOf(' ') >= 0 ? 'Phases ' + p.split(' ').join(' and ') : 'Phase ' + p);
    const trk = TRACKS[st.track] && TRACKS[st.track].steps ? TRACKS[st.track] : null; const tmin = {}; if (trk) trk.steps.forEach(x => { tmin[x[0]] = x[1]; });
    const journey = vis.map((x, i) => {
      const cur = x[0] === step; const dn = i < si; const ph = phaseTxt(x[3]);
      return { label: x[0] === 'tour' ? 'Start here' : x[1], state: cur ? 'now' : dn ? 'done' : 'next', first: i === 0 ? 'true' : 'false', cur: cur ? 'step' : 'false',
        sub: cur ? 'You are here' : dn ? '✓ ' + (trk && tmin[x[0]] ? 'Done' : (ph || 'Done')) : (trk && tmin[x[0]] ? 'About ' + tmin[x[0]] + ' min' : (ph || 'Step ' + (i + 1))),
        tip: 'Step ' + (i + 1) + ' of ' + vis.length + ': ' + x[1] + (ph ? ' (' + ph + ')' : ''), go: go(x[0]) };
    });
    const lockedSteps = this.allSteps().filter(x => x[0] !== 'tour' && visIds.indexOf(x[0]) < 0);
    const lockedLv = lockedSteps.map(x => x[2]).filter((v, i, a) => a.indexOf(v) === i).sort();
    const lockedNext = trk ? 'In the full journey' : lockedLv.length > 1 ? 'Intermediate and Advanced' : lockedLv[0] === 3 ? 'At Advanced level' : 'At Intermediate level';
    const lockedClick = trk ? () => this.pickTrack('full') : () => this.setState({ showMenu: !st.showMenu });
    const lockedTip = trk ? 'Switch to the full journey' : 'Steps unlock at higher levels. Change level in View.';

    // Flowchart: orthogonal routing through the gaps between cards
    const colOf = { exp: 0, edge: 1, app: 2, data: 3 };
    const NW = 188, NH = 64, CG = 128, RG = 44, PAD = 24, TOP = 60;
    const cols = [[], [], [], []]; const bottom = [];
    comps.forEach(c => { const L = C[c].layer; if (L === 'x') bottom.push(c); else cols[colOf[L]].push(c); });
    const colNames = ['Experience', 'Edge and access', 'Application and intelligence', 'Data and events'];
    const usedIdx = [0, 1, 2, 3].filter(i => cols[i].length);
    const node = {};
    usedIdx.forEach((ci, k) => cols[ci].forEach((c, r) => { node[c] = { x: PAD + k * (NW + CG), y: TOP + r * (NH + RG), col: k, row: r }; }));
    const nCols = usedIdx.length;
    const maxRows = Math.max(1, ...usedIdx.map(i => cols[i].length));
    const busTop = TOP + maxRows * (NH + RG) - RG + 22;
    const botY = busTop + 64;
    bottom.forEach((c, i) => { node[c] = { x: PAD + i * (NW + 48), y: botY, col: -1, row: -1 }; });
    const fw = Math.max(PAD * 2 + nCols * (NW + CG), PAD * 2 + bottom.length * (NW + 48), 400);
    const fh = (bottom.length ? botY + NH : TOP + maxRows * (NH + RG) - RG) + PAD;
    const gapX = k => PAD + k * (NW + CG) + NW;
    const laneN = {}; const lane = k => { const n = laneN[k] = (laneN[k] || 0) + 1; return gapX(k) + 14 + ((n - 1) % 11) * 9; };
    const rowN = {}; const rowLane = r => { const n = rowN[r] = (rowN[r] || 0) + 1; return TOP + r * (NH + RG) - RG / 2 + (((n - 1) % 5) - 2) * 6; };
    let busN = 0; const bus = () => { busN++; return busTop + ((busN - 1) % 6) * 7; };
    const allEdges = this.flowEdges(comps).filter(e => node[e.from] && node[e.to]);
    const plan = allEdges.map(e => {
      const a = node[e.from], b = node[e.to]; let sa, sb, kind;
      if (a.col >= 0 && b.col >= 0) {
        if (a.col < b.col) { sa = 'R'; sb = 'L'; kind = 'fwd'; } else if (a.col > b.col) { sa = 'L'; sb = 'R'; kind = 'back'; } else { sa = 'R'; sb = 'R'; kind = 'same'; }
      } else if (a.col >= 0) { sa = 'R'; sb = 'T'; kind = 'down'; } else if (b.col >= 0) { sa = 'T'; sb = 'R'; kind = 'up'; } else { sa = 'T'; sb = 'T'; kind = 'bus'; }
      return { e, a, b, sa, sb, kind };
    });
    const portsOf = {};
    plan.forEach((p, i) => {
      (portsOf[p.e.from + '|' + p.sa] = portsOf[p.e.from + '|' + p.sa] || []).push({ key: i + 'a', other: p.b });
      (portsOf[p.e.to + '|' + p.sb] = portsOf[p.e.to + '|' + p.sb] || []).push({ key: i + 'b', other: p.a });
    });
    const port = {};
    Object.keys(portsOf).forEach(k => {
      const parts = k.split('|'); const n = node[parts[0]]; const side = parts[1]; const list = portsOf[k];
      list.sort((u, v) => side === 'T' ? u.other.x - v.other.x : u.other.y - v.other.y);
      list.forEach((q, j) => {
        const f = (j + 1) / (list.length + 1);
        port[q.key] = side === 'R' ? { x: n.x + NW + 1, y: Math.round(n.y + NH * f) } : side === 'L' ? { x: n.x - 1, y: Math.round(n.y + NH * f) } : { x: Math.round(n.x + NW * f), y: n.y - 1 };
      });
    });
    const routes = plan.map((p, i) => {
      const A = port[i + 'a'], B = port[i + 'b']; const pts = [A];
      if (p.kind === 'fwd' || p.kind === 'back') {
        const gA = p.kind === 'fwd' ? p.a.col : p.a.col - 1; const gB = p.kind === 'fwd' ? p.b.col - 1 : p.b.col;
        const x1 = lane(gA);
        if (gA === gB) pts.push({ x: x1, y: A.y }, { x: x1, y: B.y });
        else { const ry = rowLane(p.b.row); const x2 = lane(gB); pts.push({ x: x1, y: A.y }, { x: x1, y: ry }, { x: x2, y: ry }, { x: x2, y: B.y }); }
      } else if (p.kind === 'same') { const x1 = lane(p.a.col); pts.push({ x: x1, y: A.y }, { x: x1, y: B.y }); }
      else if (p.kind === 'down') { const x1 = lane(p.a.col); const by = bus(); pts.push({ x: x1, y: A.y }, { x: x1, y: by }, { x: B.x, y: by }); }
      else if (p.kind === 'up') { const x1 = lane(p.b.col); const by = bus(); pts.push({ x: A.x, y: by }, { x: x1, y: by }, { x: x1, y: B.y }); }
      else { const by = bus(); pts.push({ x: A.x, y: by }, { x: B.x, y: by }); }
      pts.push(B);
      return pts;
    });
    const sel0 = st.flowSel && node[st.flowSel] ? st.flowSel : null;
    const typeStyle = { sync: ['var(--accent)', 1.8, 'none'], async: ['var(--orange)', 1.8, '6 4'], batch: ['var(--ink-3)', 2.2, '1 5'] };
    const edges = routes.map((pts, i) => {
      const e = plan[i].e; const ts = typeStyle[e.type] || typeStyle.sync;
      const xs = pts.map(q => q.x), ys = pts.map(q => q.y);
      const l = Math.min(...xs) - 10, t = Math.min(...ys) - 10;
      const d = pts.map((q, j) => (j ? 'L ' : 'M ') + (q.x - l) + ' ' + (q.y - t)).join(' ');
      const touch = !sel0 || e.from === sel0 || e.to === sel0; const mid = 'fa' + i;
      const m = Math.floor((pts.length - 1) / 2); const p1 = pts[m], p2 = pts[m + 1];
      return { l, t, w: Math.max(...xs) - l + 10, h: Math.max(...ys) - t + 10, d, color: ts[0], sw: touch && sel0 ? ts[1] + 0.8 : ts[1], dash: ts[2], mid,
        mEnd: 'url(#' + mid + ')', mStart: e.type === 'sync' ? 'url(#' + mid + ')' : '', op: touch ? 1 : 0.1,
        showLabel: !!sel0 && touch, lx: Math.round((p1.x + p2.x) / 2), ly: Math.round((p1.y + p2.y) / 2), label: e.label || '' };
    });
    const flowLabels = edges.filter(e => e.showLabel && e.label).map(e => ({ x: e.lx + 6, y: e.ly - 20, t: e.label, color: e.color }));
    const linked = {}; if (sel0) allEdges.forEach(e => { if (e.from === sel0) linked[e.to] = 1; if (e.to === sel0) linked[e.from] = 1; });
    const flowNodes = comps.filter(c => node[c]).map(c => { const on = sel0 === c; const lit = !sel0 || on || linked[c];
      return { label: C[c].l, x: node[c].x, y: node[c].y, on: on ? 'true' : 'false', pick: () => this.setState({ flowSel: on ? null : c }),
        border: on ? '2px solid ' + ACC : '1px solid ' + (C[c].layer === 'x' ? 'var(--warn-line)' : 'var(--hair-strong)'), bg: on ? SOFT : (C[c].layer === 'x' ? 'var(--warn-soft)' : 'var(--surface)'), op: lit ? 1 : 0.35 }; });
    const flowHeads = usedIdx.map((ci, k) => ({ n: colNames[ci], x: PAD + k * (NW + CG) }));
    const kindName = { sync: 'request and response', async: 'event, does not wait', batch: 'batch or scheduled' };
    const flowList = allEdges.filter(e => !sel0 || e.from === sel0 || e.to === sel0).map(e => ({ from: C[e.from].l, to: C[e.to].l, arrow: e.type === 'sync' ? '↔' : '→', label: e.label || 'interacts', kind: kindName[e.type], color: (typeStyle[e.type] || typeStyle.sync)[0] }));
    const flow = { w: fw, h: fh, edges, nodes: flowNodes, heads: flowHeads, labels: flowLabels, hasBottom: bottom.length > 0, busY: busTop - 18 };
    const flowListTitle = sel0 ? 'Connections of ' + C[sel0].l + ' (' + flowList.length + ')' : 'All interactions (' + flowList.length + '). Click a component to label its arrows.';

    // Brief chat
    const chatView = st.chat.map(m => {
      if (m.role === 'user') return { isUser: true, isStudio: false, isNote: false, text: m.text };
      if (m.role === 'note') return { isUser: false, isStudio: false, isNote: true, text: m.text };
      return { isUser: false, isStudio: true, isNote: false, title: m.title, understanding: m.understanding, base: m.base, comps: m.comps, applied: m.applied, mode: m.mode,
        assumptions: (m.assumptions || []).map(t => ({ t })), hasAssumptions: (m.assumptions || []).length > 0,
        gaps: (m.gaps || []).map(t => ({ t })), hasGaps: (m.gaps || []).length > 0,
        questions: (m.questions || []).map(q => ({ t: q, pick: () => { this.setState({ text: q.replace(/\?$/, '') + ': ' }); try { const el = document.getElementById('brief-input'); if (el) el.focus(); } catch (e) {} } })),
        hasQuestions: (m.questions || []).length > 0 };
    });
    const glance = [
      { l: 'Lens', v: ent ? 'Enterprise portfolio first' : 'System first' }, { l: 'Building', v: A.n }, { l: 'AI posture', v: { none: 'No AI', enabled: 'AI-enabled', native: 'AI-native' }[st.ai] }, { l: 'Scale', v: st.scale + ' users' },
      { l: 'Data', v: st.reg ? 'Regulated (GxP, PII)' : 'Standard' }, { l: 'Availability', v: st.avail + '%' },
      { l: 'Cloud', v: { aws: 'AWS first', azure: 'Azure first', multi: 'Multi-cloud or hybrid' }[st.cloud] }, { l: 'Starting point', v: st.field === 'brown' ? 'Brownfield' : 'Greenfield' }
    ];

    // Outcomes
    const outs = this.getOuts();
    const active = Math.min(st.active, outs.length - 1);
    const activeName = 'Outcome ' + (active + 1);
    const evals = outs.map(o => this.evalOut(o));
    const tabs = outs.map((o, i) => Object.assign({ name: 'Outcome ' + (i + 1) + ' · ' + evals[i].filled + '/' + evals[i].total, on: i === active ? 'true' : 'false', pick: () => this.setState({ active: i }) }, sel(i === active)));
    const addOutcome = () => { const n = this.cloneOuts(); n.push({ picks: {} }); this.setOuts(n, { active: n.length - 1 }); };
    const removeOutcome = () => { const n = this.cloneOuts().filter((_, i) => i !== active); this.setOuts(n, { active: 0, chosen: null, focus: null }); };
    const cname = { aws: 'AWS', azure: 'Azure', multi: 'any cloud' };
    const fills = [['Open source first','oss'],['Managed on ' + cname[st.cloud],'managed'],['Maximum scale','scale'],['Clear','clear']].map(([l, k]) => ({ l, go: () => { const n = this.cloneOuts(); n[active].picks = this.build(k); this.setOuts(n); } }));
    const dimNames = ['Scale','Cost','Ops ease','Portability','Speed'];
    const focus = st.focus && st.focus.outcome === active && comps.indexOf(st.focus.cid) >= 0 ? st.focus : null;
    const stdM = this.stdMap();
    const card = cid => {
      const cc = C[cid]; const cur = outs[active].picks[cid]; const isFocus = focus && focus.cid === cid;
      return { label: cc.l, layer: D.layerNames[cc.layer], need: cc.need, an: cc.an, showAn: st.plain, cardBorder: isFocus ? '2px solid var(--orange)' : '1px solid ' + LINE,
        opts: this.fitOpts(cid).map((o, j) => {
          const on = cur === j; const signal = D.signals[o.n] || '';
          const sd = stdM[cid]; const isStd = !!sd && sd.status !== 'none' && sd.i >= 0 && sd.i === j;
          return { n: o.n, k: o.k, w: o.w, u: o.u, sel: on, signal, hasSignal: !!signal, isStd, stdLabel: sd && sd.status === 'approved' ? 'Enterprise standard' : 'Proposed standard, under review', stdBg: sd && sd.status === 'approved' ? 'var(--good-soft)' : 'var(--warn-soft)', stdFg: sd && sd.status === 'approved' ? 'var(--good)' : 'var(--warn)', scoreLine: o.s.map((v, i) => dimNames[i] + ' ' + (o.s0 && o.s0[i] !== v ? o.s0[i] + '→' + v : v)).join(' · '), hasFit: !!o.fit, fitLine: o.fit ? o.fit.map(f => f.why).filter((x, i, a) => a.indexOf(x) === i).join(' ') : '', fitUp: !!o.fit && o.fit.every(f => f.v > 0),
            pick: () => { const n = this.cloneOuts(); if (n[active].picks[cid] === j) delete n[active].picks[cid]; else n[active].picks[cid] = j; this.setOuts(n); },
            bg: on ? SOFT : 'var(--surface)', bd: on ? ACC : LINE, ring: on ? '0 0 0 1px ' + ACC : 'none',
            kbg: o.k === 'OSS' ? 'var(--good-soft)' : 'var(--warn-soft)', kfg: o.k === 'OSS' ? 'var(--good)' : 'var(--warn)' };
        }) };
    };
    const guidedOn = st.guided && !focus;
    const nextCid = comps.find(c => outs[active].picks[c] == null);
    const gi = nextCid ? comps.indexOf(nextCid) : comps.length;
    const qd = [1, 0, 2, 3][gi % 4];
    const qLabel = { 0: 'scalability', 1: 'cost efficiency (cheapest to run)', 2: 'ease of operation', 3: 'portability (least lock-in)' }[qd];
    const qWhy = { 0: 'Managed and distributed designs usually stretch furthest.', 1: 'Open source avoids licence fees, though you pay in people time.', 2: 'Managed services remove patching, upgrades and on-call.', 3: 'Open standards run anywhere, so leaving stays cheap.' }[qd];
    const pkey = active + '-' + nextCid;
    const pAns = nextCid ? st.predict[pkey] : undefined;
    let g = { progress: '', pct: '0%', done: !nextCid, ask: false, label: '', need: '', q: '', qopts: [], answered: false, verdict: '', reveal: '', rbg: 'var(--good-soft)', rfg: 'var(--good)' };
    const filledN = comps.length - comps.filter(c => outs[active].picks[c] == null).length;
    g.progress = activeName + ': decision ' + Math.min(filledN + 1, comps.length) + ' of ' + comps.length;
    g.pct = Math.round(filledN / comps.length * 100) + '%';
    if (nextCid) {
      const opts = this.fitOpts(nextCid); const mx = Math.max.apply(null, opts.map(o => o.s[qd]));
      const bestNames = opts.filter(o => o.s[qd] === mx).map(o => o.n);
      const answered = pAns !== undefined; const right = answered && opts[pAns].s[qd] === mx;
      g = Object.assign(g, { ask: true, label: C[nextCid].l, need: C[nextCid].need, q: 'Before you choose: which option do you expect to score best on ' + qLabel + '?',
        qopts: opts.map((o, j) => { const chosen = pAns === j; const isBest = answered && o.s[qd] === mx;
          return { n: o.n, pick: () => this.setState({ predict: Object.assign({}, this.state.predict, { [pkey]: j }) }), bg: isBest ? 'var(--good-soft)' : (chosen ? 'var(--warn-soft)' : 'var(--surface)'), bd: isBest ? 'var(--good)' : (chosen ? 'var(--orange)' : LINE), fg: INK }; }),
        answered, verdict: right ? 'Correct.' : 'Not quite.', rbg: right ? 'var(--good-soft)' : 'var(--warn-soft)', rfg: right ? 'var(--good)' : 'var(--warn)',
        reveal: 'Best on ' + qLabel + ': ' + bestNames.join(' and ') + ' (' + mx + '/5). ' + qWhy + ' Now choose for your outcome below: the best on one quality is not always the right pick.' });
    }
    const builder = focus ? [card(focus.cid)] : (st.guided ? (nextCid && pAns !== undefined ? [card(nextCid)] : []) : comps.map(card));
    const outcomesIntro = st.guided ? 'Guided mode: one decision at a time. Predict first, then choose. Switch to free mode to see every component at once.' : 'Free mode: pick one platform per component. Create up to four outcomes, then compare their trade-offs.';

    // Compare
    let best = 0; evals.forEach((e, i) => { if (e.overall > evals[best].overall) best = i; });
    const fitOf = (e, i) => {
      const r = this.checkDesign(comps, c => outs[i].picks[c]); const interop = e.issues.filter(x => x.cat === 'Interoperability').length;
      const port = e.avg[3] * 20, cost = e.avg[1] * 20, clean = Math.max(0, 100 - 20 * interop);
      const fit = r.conf == null ? Math.round((0.25 * port + 0.25 * cost + 0.15 * clean) / 0.65) : Math.round(0.35 * r.conf + 0.25 * port + 0.25 * cost + 0.15 * clean);
      return { fit: Math.max(0, Math.min(100, fit)), conf: r.conf, interop, prop: e.picks.filter(q => q.p.k !== 'OSS').length, n: e.picks.length, port: e.avg[3], cost: e.avg[1] };
    };
    const fits = evals.map((e, i) => fitOf(e, i));
    if (ent) { best = 0; fits.forEach((f, i) => { if (f.fit > fits[best].fit) best = i; }); }
    const chosenIdx = st.chosen != null && st.chosen < outs.length ? st.chosen : best;
    const catStyle = { 'Interoperability': ['var(--accent-soft)','var(--accent-ink)'], 'Functional': ['var(--hair-soft)','var(--ink-2)'], 'Non-functional': ['var(--warn-soft)','var(--warn)'] };
    const dimLong = ['Scalability','Cost efficiency','Operability','Portability','Time to value'];
    const maxCost = [0,1,2].map(t => Math.max.apply(null, evals.map(e => e.cost[t]).concat([1])));
    const afterCompare = visIds[visIds.indexOf('compare') + 1];
    const cards = evals.map((e, i) => {
      const isChosen = st.chosen === i; const showWork = !!st.work[i];
      const work = [
        { h: 'WORKLOAD FIT', t: e.fitted.length ? e.fitted.map(q => q.p.n + ': ' + q.p.fit.map(f => dimNames[f.d] + ' ' + q.p.s0[f.d] + '→' + q.p.s[f.d]).filter((x, k, a) => a.indexOf(x) === k).join(', ') + '. ' + q.p.fit.map(f => f.why).filter((x, k, a) => a.indexOf(x) === k).join(' ')).join('\n') : 'Every chosen product is within its comfortable range at the Workload numbers, so no score was adjusted.' },
        { h: 'QUALITY AVERAGE', t: dimNames.map((n, d) => n + ' ' + e.avg[d].toFixed(1)).join(' + ') + '\n÷ 5 × 20 = ' + Math.round(e.base) + ' base points' },
        { h: 'PENALTIES', t: e.realIssues + ' shortcoming(s) × 4 = −' + (e.realIssues * 4) + '\n' + e.missing.length + ' unchosen component(s) × 6 = −' + (e.missing.length * 6) },
        { h: 'OVERALL', t: Math.round(e.base) + ' − ' + (e.realIssues * 4 + e.missing.length * 6) + ' = ' + e.overall + ' (capped 0 to 100)' },
        { h: 'AVAILABILITY CHAIN', t: (e.chain.join(' ×\n') || 'No critical components chosen') + '\n= ' + (e.avail * 100).toFixed(3) + '%' },
        { h: 'ASSUMED SLAS', t: 'Managed service 99.99%. Simple self-run 99.95%. Complex self-run 99.9%. Observability and analytics are left out because users do not wait on them.' + (st.ai === 'enabled' ? ' AI-enabled: AI features degrade gracefully, so they sit off the critical path unless AI is the product itself.' : st.ai === 'native' ? ' AI-native: agents are the path, so model, gateway and tool availability all count.' : '') },
        { h: 'COST INDEX', t: 'Per component: (6 − cost score), plus 1.5 for complex self-run. Managed scales with users (×1, ×10, ×60). Open source scales slower (tier^0.8) because you pay for infrastructure, not per use. Relative only.' }
      ];
      const F = fits[i];
      const fitLines = [{ l: 'On enterprise standards', v: F.conf == null ? 'Not measured' : F.conf + '%' }, { l: 'Portability', v: F.port.toFixed(1) + ' / 5' }, { l: 'Cost efficiency', v: F.cost.toFixed(1) + ' / 5' }, { l: 'Integration conflicts', v: String(F.interop) }, { l: 'Proprietary products', v: F.prop + ' of ' + F.n }];
      const fitHow = F.conf == null ? 'Portability 38%, cost 38%, clean integration 23%. Standards are not counted because no pattern library is set.' : 'Standards 35%, portability 25%, cost 25%, clean integration 15%.';
      return { showFit: ent, fit: F.fit, fitLines, fitHow, name: 'Outcome ' + (i + 1), overall: e.overall, isBest: i === best, filledLine: e.filled + ' of ' + e.total + ' components chosen',
        dims: dimLong.map((l, d) => ({ l, v: e.avg[d].toFixed(1) + ' / 5', pct: Math.round(e.avg[d] * 20) + '%' })),
        availPct: (e.avail * 100).toFixed(3) + '%', availLine: (e.meets ? 'Meets' : 'Misses') + ' the ' + st.avail + '% target · about ' + Math.round((1 - e.avail) * 43800) + ' min downtime a month',
        availBg: e.meets ? 'var(--good-soft)' : 'var(--warn-soft)', availFg: e.meets ? 'var(--good)' : 'var(--warn)',
        cost: ['10k','1M','50M'].map((l, t) => ({ l, v: e.cost[t], pct: Math.round(e.cost[t] / maxCost[t] * 100) + '%' })),
        showWork, work, workPressed: showWork ? 'true' : 'false', workLabel: showWork ? 'Hide the working' : 'Show the working', toggleWork: () => this.setState({ work: Object.assign({}, st.work, { [i]: !showWork }) }),
        issues: e.issues.map(x => ({ cat: x.cat, text: x.text, bg: catStyle[x.cat][0], fg: catStyle[x.cat][1], hasFix: !!x.cid, fixLabel: x.cid ? C[x.cid].l : '',
          fix: () => { if (!x.cid) return; const n = this.cloneOuts(); this.setOuts(n, { step: 'outcomes', active: i, focus: { cid: x.cid, tip: x.tip, outcome: i } }); } })),
        issueCount: e.issues.length, noIssues: e.issues.length === 0,
        bd: i === best ? ACC : LINE, ring: i === best ? '0 0 0 1px ' + ACC : 'none',
        btnBg: isChosen ? ACC : 'var(--surface)', btnFg: isChosen ? 'var(--on-accent)' : 'var(--accent-ink)', btnLabel: isChosen ? '\u2713 Selected' : 'Select Outcome ' + (i + 1), btnCls: isChosen ? 'as-chosen' : 'as-secondary', choose: () => this.setState({ chosen: i }) };
    });
    const be = evals[best];
    const bestName = 'Outcome ' + (best + 1) + (ent ? ' (portfolio fit ' + fits[best].fit + '/100)' : ' (' + be.overall + '/100)');
    const bestWhy = ent ? 'Best portfolio fit: reuse of standards, portability, cost and clean integration weigh most when you design portfolio first. It has ' + be.issues.length + ' open shortcoming' + (be.issues.length === 1 ? '' : 's') + '. Scores are directional: validate with a proof of concept.' : 'Strongest balance of scale, cost, operability and portability for a ' + st.scale + '-user, ' + (st.reg ? 'regulated' : 'standard-data') + ' brief at ' + st.avail + '% availability, with ' + be.issues.length + ' open shortcoming' + (be.issues.length === 1 ? '' : 's') + '. Scores are directional: validate with a proof of concept.';
    const gridCols = '200px repeat(' + outs.length + ', minmax(160px, 1fr))';
    const outNames = outs.map((_, i) => ({ n: 'Outcome ' + (i + 1) }));
    const rows = comps.map(cid => ({ label: C[cid].l, cells: outs.map(o => { const p = o.picks[cid] != null ? C[cid].o[o.picks[cid]] : null; return { n: p ? p.n : 'Not chosen', k: p ? p.k : '' }; }) }));

    // Decisions
    const ce = evals[chosenIdx];
    const eaName = 'Outcome ' + (chosenIdx + 1);
    const ctxLine = 'Brief: ' + A.n + ', ' + st.scale + ' users, ' + (st.reg ? 'regulated data' : 'standard data') + ', ' + st.avail + '% availability, ' + cname[st.cloud] + ' cloud posture, ' + { none: 'no AI', enabled: 'AI-enabled', native: 'AI-native' }[st.ai] + '.';
    const adrs = ce.picks.map((q, i) => {
      const alts = C[q.c].o.filter(x => x.n !== q.p.n);
      const weak = q.p.s.map((v, d) => v <= 2 ? dimNames[d] + ' ' + v + '/5' : null).filter(Boolean);
      return { id: 'ADR-' + String(i + 1).padStart(2, '0'), title: C[q.c].l + ': ' + q.p.n, ctx: C[q.c].need + ' ' + ctxLine,
        dec: 'Adopt ' + q.p.n + ' (' + q.p.k + ').', alts: alts.map(x => x.n + ' (' + x.k + ')').join('; ') + '.', plus: q.p.w,
        minus: (weak.length ? 'Weak on ' + weak.join(', ') + '. ' : '') + (q.p.k !== 'OSS' ? 'Needs an exit plan and contract review.' : 'Your team owns upgrades, patching and on-call.') };
    });
    const adrMd = adrs.map(a => '# ' + a.id + ' ' + a.title + '\n\nStatus: Proposed\n\n## Context\n' + a.ctx + '\n\n## Decision\n' + a.dec + '\n\n## Alternatives considered\n' + a.alts + '\n\n## Consequences\n+ ' + a.plus + '\n- ' + a.minus + '\n').join('\n---\n\n') || 'Choose components in Outcomes to generate decision records.';

    // Evolve
    const stageDefs = isImplApp ? D.implStages : [['MVP','up to 10k users'],['Growth','about 1M users'],['Scale','50M users'],['Global','multi-region']];
    const stg = st.stage;
    const stages = stageDefs.map(([l, sub], i) => ({ l, sub, on: stg === i ? 'true' : 'false', pick: () => this.setState({ stage: i }), bg: stg === i ? 'var(--surface)' : 'transparent', fg: INK }));
    const moves = [
      ['Modular monolith: one deployable with clear internal module boundaries','Managed database with automated backups','Single region, two availability zones','Basic dashboards, alerts and an on-call rota'],
      ['Cache hot reads; put events between modules','Split out the first one or two services where team or load demands it','Read replicas and connection pooling','Service level objectives per user journey'],
      ['Partition or shard the busiest data','Autoscaling per service; a platform team owns paved roads','Service mesh or equivalent for retries and mutual TLS','Capacity reviews before every peak'],
      ['Active-active regions with an explicit data replication strategy','Cell-based architecture to cap blast radius','Chaos testing in production','Follow-the-sun operations']
    ];
    const stageMoveList = isImplApp ? D.implMoves : moves;
    const evolveTitle = isImplApp ? 'How the ' + eaName + ' programme unfolds' : 'How ' + eaName + ' grows over time';
    const evolveIntro = isImplApp ? 'Enterprise implementations run in phases, broadly following SAP Activate: discover, explore, realize, then deploy and run. Move through them to see when each component comes into play.' : 'Real systems are not built at final scale on day one. Move through the stages to see what you build now and what you defer.';
    const evoRows = comps.map(cid => {
      const at = isImplApp ? (D.implIntro[cid] || 0) : (D.introAt[cid] || 0); const live = at <= stg;
      const p = outs[chosenIdx].picks[cid] != null ? C[cid].o[outs[chosenIdx].picks[cid]].n : 'Not chosen';
      return { n: p, c: C[cid].l, s: live ? (at === stg && stg > 0 ? 'Added now' : 'Live') : (isImplApp ? 'Starts in ' : 'Deferred to ') + stageDefs[at][0], live, bg: live ? 'var(--good-soft)' : 'var(--fill)', tag: live ? 'var(--good)' : 'var(--ink-2)', fg: live ? INK : 'var(--ink-3)' };
    });
    const stageSummary = stageDefs[stg][0] + ': ' + evoRows.filter(r => r.live).length + ' of ' + evoRows.length + ' components in play';
    const migration = [
      { n: '1', t: 'Front the legacy system', d: 'Route all traffic through the new API gateway so you can redirect one capability at a time.' },
      { n: '2', t: 'Carve out the first domain', d: 'Pick a capability with few dependencies and high change demand; build it new.' },
      { n: '3', t: 'Sync data both ways', d: 'Use change-data-capture or events to keep legacy and new stores consistent during transition.' },
      { n: '4', t: 'Switch, observe, retire', d: 'Shift traffic gradually, compare outcomes, then decommission the legacy module.' }
    ];

    // Enterprise
    const matNames = ['Basic','Developing','Advanced'];
    const matStyle = [['var(--warn-soft)','var(--warn-line)','var(--warn)'],['var(--warn-soft)','var(--warn-line)','var(--warn)'],['var(--good-soft)','var(--good-line)','var(--good)']];
    const eaCaps = A.caps.map((n, i) => { const m = st.capMat[i] || 0; return { n, lvl: matNames[m], bg: matStyle[m][0], bd: matStyle[m][1], fg: matStyle[m][2], cycle: () => this.setState({ capMat: Object.assign({}, st.capMat, { [i]: (m + 1) % 3 }) }) }; });
    const timeNames = ['Tolerate','Invest','Migrate','Eliminate'];
    const timeStyle = [['var(--hair-soft)','var(--hair-strong)','var(--ink-2)'],['var(--good-soft)','var(--good-line)','var(--good)'],['var(--accent-soft)','var(--accent-line)','var(--accent-ink)'],['var(--warn-soft)','var(--warn-line)','var(--warn)']];
    const nbList = aiOn ? A.nb.concat([['AI platform and model providers', st.ai === 'native' ? 'Models, agent runtimes, evaluation' : 'Models and copilots', 'AI gateway']]) : A.nb;
    const eaNb = nbList.map(([n, d, p], i) => { const t = st.time[i] || 0; return { n, d, p, time: timeNames[t], bg: timeStyle[t][0], bd: timeStyle[t][1], fg: timeStyle[t][2], cycle: () => this.setState({ time: Object.assign({}, st.time, { [i]: (t + 1) % 4 }) }) }; });
    const tc = [0,0,0,0]; nbList.forEach((_, i) => tc[st.time[i] || 0]++);
    const portfolioLine = 'Portfolio (TIME): ' + timeNames.map((n, i) => tc[i] + ' ' + n.toLowerCase()).join(', ') + '. Click a system to reclassify it; anything marked Migrate or Eliminate becomes a dependency on your roadmap.';
    const eaTech = ['exp','edge','app','data','x'].map(k => ({ layer: D.layerNames[k], items: ce.picks.filter(q => C[q.c].layer === k).map(q => ({ c: C[q.c].l, n: q.p.n, shared: D.shared.indexOf(q.c) >= 0 })) })).filter(gr => gr.items.length);
    const idp = ce.picks.find(q => q.c === 'idp');
    const prop = ce.picks.filter(q => q.p.k !== 'OSS').length;
    const eaGov = [
      { h: 'Principles', t: 'API-first contracts, events for cross-domain change, data kept in open formats where possible.' },
      { h: 'Identity', t: (idp ? idp.p.n : 'Identity provider not chosen') + ' for SSO and service identity, federated with the enterprise directory.' },
      { h: 'Compliance', t: st.reg ? 'Regulated data: validation plan, audit trail, residency controls and periodic access reviews.' : 'Standard data: privacy by design, retention policy, least-privilege access.' },
      { h: 'Review board will ask', t: 'One decision record per choice; exit plans for ' + prop + ' proprietary service' + (prop === 1 ? '' : 's') + '; a capacity model for ' + st.scale + ' users; a named owner and runbook per component.' },
      { h: 'Framework', t: 'TOGAF layers (business, application, data, technology). Exportable to ArchiMate in a full build.' }
    ];
    const govPick = ce.picks.find(q => q.c === 'aigov');
    if (aiOn) eaGov.splice(3, 0, { h: 'AI governance', t: 'Register every AI use case' + (govPick ? ' in ' + govPick.p.n : '') + ', classify its risk (EU AI Act, NIST AI RMF), keep evaluation evidence and human oversight, and align the management system to ISO/IEC 42001.' + (st.ai === 'native' ? ' Each agent has its own identity, scoped permissions, budget and kill switch.' : '') });

    // Drill
    const sc = {
      surge: { l: '10x traffic spike', advice: 'Load test at three times forecast, put a queue in front of writes, cache aggressively and set autoscaling limits before the event, not during it.',
        f: p => p.s[0] >= 4 ? [true, 'Holds', 'Scales horizontally (scale ' + p.s[0] + '/5).'] : [false, 'At risk', 'Limited headroom: add sharding, queueing or a managed tier.'] },
      outage: { l: 'Zone or region outage', advice: 'Set recovery time and recovery point objectives per component, then rehearse failover on a schedule. Untested recovery is a hope, not a plan.',
        f: p => p.k !== 'OSS' ? [true, 'Holds', 'Provider handles failover if multi-zone is enabled.'] : (p.s[2] >= 4 ? [true, 'Holds', 'Simple to run replicas across zones.'] : [false, 'At risk', 'You own replication and failover: design and test it.']) },
      audit: { l: 'Data residency audit', advice: 'Map every data flow to a region, keep a sub-processor register, and sign data processing agreements before go-live.',
        f: p => p.t.indexOf('saas') >= 0 ? [false, 'Review', 'Data leaves your boundary: confirm region and sub-processors.'] : (p.k !== 'OSS' ? [true, 'Holds', 'Holds if pinned to an approved region.'] : [true, 'Holds', 'Self-hosted inside your boundary.']) },
      price: { l: '40% vendor price rise', advice: 'Negotiate price caps and exit clauses up front, and keep data in open formats so switching stays a real option.',
        f: p => p.k === 'OSS' ? [true, 'Holds', 'No licence exposure; only infrastructure cost.'] : (p.s[1] <= 3 ? [false, 'Exposed', 'Already a large cost line; a rise hits the business case.'] : [true, 'Absorbable', 'Low current spend; impact is manageable.']) },
      cutover: { l: 'Cutover weekend overruns', advice: 'Rehearse cutover at least twice with real timings, set go/no-go criteria and a rollback point, freeze master data changes in the final days, and staff hypercare before go-live.',
        f: (p, c) => c === 'migr' ? (p.s[2] >= 4 ? [true, 'Holds', 'Proven tooling; still run at least three mock loads.'] : [false, 'At risk', 'Custom pipelines: reconciliation errors surface during cutover.']) :
          c === 'mdm' ? [false, 'Critical path', 'Master data must be cleansed and frozen before cutover starts.'] :
          c === 'erpcore' || c === 'hcm' || c === 'crmcore' || c === 'p2p' || c === 'itsm' ? [true, 'Go/no-go gate', 'Go live only when balances and records reconcile.'] :
          c === 'ipaas' ? (p.k === 'OSS' ? [false, 'At risk', 'Interfaces you run yourself need a tested switch-over runbook.'] : [true, 'Holds', 'Switch interfaces in a planned sequence with rollback.']) :
          c === 'payroll' ? [false, 'Critical path', 'Run parallel payroll and reconcile before the first live pay date.'] :
          [true, 'Holds', 'Not on the cutover critical path.'] },
      model: { l: 'Model outage or retirement', advice: 'Put every model behind a gateway, keep a tested fallback model with an evaluation set that proves it is good enough, and track provider retirement dates like any other end-of-life date.',
        f: (p, c) => c === 'llm' ? (p.k === 'OSS' ? [true, 'Holds', 'Self-hosted weights cannot be retired on you, but you own GPU capacity.'] : [false, 'At risk', 'Single provider: add a fallback model through the gateway and re-run evaluations.']) :
          c === 'aigw' ? [true, 'Holds', 'Routes traffic to a fallback model.'] :
          c === 'embai' ? [false, 'At risk', 'The vendor controls the model and when it changes.'] :
          c === 'agents' ? (p.k === 'OSS' ? [true, 'Holds', 'Model-agnostic, if prompts are tested on a second model.'] : [false, 'At risk', 'Tied to one model family.']) :
          (st.ai === 'native' && ['tools','mem','guard','vec'].indexOf(c) < 0 ? [true, 'Holds', 'Keeps running; work queues up until agents recover or people take over.'] : [true, 'Holds', 'Unaffected; AI features degrade gracefully.']) },
      inject: { l: 'Prompt injection or wrong answer', advice: 'Treat all retrieved and user content as untrusted, give agents least privilege, require human approval for irreversible actions, ground answers with sources, and red-team before every release.',
        f: (p, c) => c === 'guard' ? [true, 'Holds', 'Screens inputs and outputs, and logs evaluations.'] :
          c === 'agents' || c === 'tools' ? [false, 'At risk', 'Untrusted content can steer tool calls; scope permissions and require approval.'] :
          c === 'llm' || c === 'embai' ? [false, 'At risk', 'Can be manipulated or confidently wrong; ground answers and show sources.'] :
          c === 'vec' ? [false, 'At risk', 'Poisoned documents in the index become trusted context.'] :
          c === 'idp' ? [true, 'Holds', 'Agent identities limit what a hijacked agent can reach.'] :
          [true, 'Holds', 'Not directly exposed to model input.'] }
    };
    const govOn = ce.picks.some(q => q.c === 'aigov');
    sc.exit = { l: 'Vendor ends support for a core product', advice: 'Track end-of-support dates for every product in the portfolio, keep data and integrations in open formats, and record an exit plan in each decision record.',
      f: p => p.k === 'OSS' ? [true, 'Holds', 'Open source: community support, forks or self-support remain.'] : p.s[3] <= 1 ? [false, 'Exposed', 'Leaving means re-platforming: plan in years, not months.'] : p.s[3] <= 2 ? [false, 'At risk', 'A move is possible but costly; keep data in open formats.'] : [true, 'Holds', 'Comparable products exist and data moves cleanly.'] };
    sc.regulation = { l: 'New regulation reaches your AI and data', advice: 'Keep an inventory of AI use cases and data flows, classify each by risk, and make sure suppliers will pass on the evidence regulators ask for.',
      f: (p, c) => ['llm', 'agents', 'embai', 'orch', 'vec'].indexOf(c) >= 0 ? (govOn ? [true, 'Holds', 'Registered and risk-classified in AI governance.'] : [false, 'At risk', 'No AI governance block: classify the use and add human oversight.']) :
        c === 'aigov' ? [true, 'Holds', 'Holds the AI inventory and risk classes auditors ask for.'] :
        (st.reg && p.t.indexOf('saas') >= 0) ? [false, 'Review', 'Regulated data with a SaaS provider: check new duties reach them.'] : [true, 'Holds', 'Not directly affected.'] };
    sc.storm = { l: 'Alert storm in a major outage', advice: 'Declare one major incident and link child incidents to it, pause non-essential automation that could amplify the fault, and let agents summarise and route while a named incident commander owns decisions and communication.',
      f: (p, c) => c === 'aiops' ? [true, 'Holds', 'Groups thousands of alerts into a few incidents.'] :
        c === 'runbook' ? [false, 'At risk', 'Automated fixes can amplify a widespread fault; pause non-essential automation.'] :
        c === 'agents' ? [false, 'At risk', 'Agents must hand control to the incident commander and stop acting alone.'] :
        c === 'itsm' ? [true, 'Holds', 'One major incident record with linked child incidents.'] :
        c === 'obs' ? [true, 'Holds', 'The signals are there; the challenge is volume.'] :
        c === 'embai' ? [true, 'Holds', 'Summarises the flood for engineers and drafts status updates.'] :
        [true, 'Holds', 'Not directly affected.'] };
    const okScenario = k => (k !== 'cutover' || isImplApp) && ((k !== 'model' && k !== 'inject') || aiOn) && (k !== 'storm' || comps.indexOf('itsm') >= 0);
    const drillPref = st.drillSet ? st.drill : (ent ? 'exit' : 'surge');
    const drillKey = sc[drillPref] && okScenario(drillPref) ? drillPref : 'surge';
    const scOrder = ent ? ['exit', 'regulation'].concat(Object.keys(sc).filter(k => k !== 'exit' && k !== 'regulation')) : Object.keys(sc);
    const scenarios = scOrder.filter(okScenario).map(k => Object.assign({ l: sc[k].l, on: drillKey === k ? 'true' : 'false', pick: () => this.setState({ drill: k, drillSet: true }) }, sel(drillKey === k)));
    const S = sc[drillKey];
    const drillRows = ce.picks.map(q => { const r = S.f(q.p, q.c); return { n: q.p.n, c: C[q.c].l, s: r[1], why: r[2], bg: r[0] ? 'var(--good-soft)' : 'var(--warn-soft)', fg: r[0] ? 'var(--good)' : 'var(--warn)', ok: r[0] }; });
    const hold = drillRows.filter(r => r.ok).length;
    const drillSummary = drillRows.length ? S.l + ': ' + hold + ' hold, ' + (drillRows.length - hold) + ' need attention' : 'Choose components in Outcomes first.';
    const inc = D.incidents[drillKey]; const incident = { t: inc[0], d: inc[1], u: inc[2], k: inc[3] || 'Real incident' };
    const has = c => ce.picks.some(q => q.c === c);
    const nm = c => { const q = ce.picks.find(x => x.c === c); return q ? q.p.n : null; };
    const threats = [{ b: 'Internet to edge', th: 'Spoofing · Denial of service', m: 'WAF and rate limits at ' + (nm('edge') || nm('gw') || 'the entry point') + '; bot management; TLS everywhere.' },
      { b: 'Edge to services', th: 'Tampering · Elevation of privilege', m: 'Token validation at the gateway using ' + (nm('idp') || 'your identity provider') + '; mutual TLS between services' + (nm('mesh') ? ' via ' + nm('mesh') : '') + '.' },
      { b: 'Services to data', th: 'Information disclosure · Tampering', m: 'Encryption at rest with managed keys, least-privilege service accounts, immutable audit logs.' }];
    if (ce.saas.length) threats.push({ b: 'Services to third-party SaaS', th: 'Information disclosure · Repudiation', m: 'Data minimisation and processing agreements for ' + ce.saas.map(q => q.p.n).join(', ') + '; outbound egress allow-lists.' });
    if (has('agents') || has('tools')) threats.push({ b: 'Agents to tools', th: 'Prompt injection · Excessive agency', m: 'Scoped tool permissions per agent identity, human approval for irreversible actions, output guardrails.' });
    else if (has('llm')) threats.push({ b: 'Application to model', th: 'Prompt injection · Data leakage', m: 'Input and output guardrails, no secrets in prompts, retrieval filtered by user permissions.' });
    const llmPick = ce.picks.find(q => q.c === 'llm');
    if (llmPick && llmPick.p.t.indexOf('gpu') >= 0) threats.push({ b: 'Model supply chain', th: 'Tampering (poisoned or backdoored weights)', m: 'Pull open weights only from verified sources, pin hashes, scan and evaluate before promoting to production.' });
    if ((llmPick && llmPick.p.k !== 'OSS') || has('embai')) threats.push({ b: 'Prompts and data to model providers', th: 'Information disclosure', m: 'Zero-retention and no-training terms, regional endpoints, and masking of sensitive fields' + (nm('aigw') ? ' in ' + nm('aigw') : ' at an AI gateway') + '.' });
    if (st.ai === 'native') threats.push({ b: 'Agent identities and permissions', th: 'Spoofing · Elevation of privilege', m: 'Each agent gets its own identity' + (nm('idp') ? ' in ' + nm('idp') : '') + ', least-privilege scopes, spending limits, a kill switch, and a full action log.' });
    if (isImplApp) threats.push({ b: 'Business users to the core system', th: 'Elevation of privilege · Repudiation (fraud)', m: 'Role design with segregation-of-duties rules' + (nm('grc') ? ' enforced in ' + nm('grc') : '') + ', logged emergency access, and periodic access recertification.' });
    if (isImplApp && has('ipaas')) threats.push({ b: 'Integrations to banks, suppliers and authorities', th: 'Tampering · Information disclosure', m: 'Signed and encrypted payment and EDI files, partner certificates, and format validation before posting.' });
    if (has('ingest')) threats.push({ b: 'Devices to ingestion', th: 'Spoofed devices · Firmware tampering', m: 'Per-device certificates with rotation; anomaly detection on telemetry.' });

    // Review
    const checkList = [
      ['All components chosen', ce.missing.length === 0],
      ['No interoperability conflicts', !ce.issues.some(i => i.cat === 'Interoperability')],
      ['Availability chain meets ' + st.avail + '% target', ce.meets],
      ['Lock-in kept moderate (portability 3/5 or better)', ce.avg[3] >= 3],
      ['Operations load sustainable (fewer than three self-run platforms)', ce.heavy.length < 3],
      [st.reg ? 'Regulated data stays inside your boundary' : 'Data handling reviewed', st.reg ? ce.saas.length === 0 : true]
    ];
    if (aiOn) checkList.push(['AI guardrails and evaluation in place', ce.picks.some(q => q.c === 'guard')]);
    if (aiOn) checkList.push(['AI use cases registered and risk-classified', ce.picks.some(q => q.c === 'aigov')]);
    if (st.ai === 'native') checkList.push(['Agents reach systems through a standard tool protocol', ce.picks.some(q => q.c === 'tools' && q.p.n.indexOf('OpenAPI') < 0)]);
    const passed = checkList.filter(c => c[1]).length;
    const checks = checkList.map(([t, ok]) => ({ t, s: ok ? 'Pass' : 'Gap', bg: ok ? 'var(--good)' : 'var(--orange)' }));
    const ratio = passed / checkList.length;
    const lvl = ratio < 0.34 ? 'Sketch' : ratio < 0.67 ? 'Draft' : ratio < 1 ? 'Defensible' : 'Board-ready';
    const maturity = { score: passed + ' / ' + checkList.length, label: lvl + '. ' + (passed < checkList.length ? 'Close the gaps before your review.' : 'Ready to present.') };
    const costliest = ce.picks.slice().sort((a, b) => a.p.s[1] - b.p.s[1])[0];
    const heaviest = ce.picks.slice().sort((a, b) => a.p.s[2] - b.p.s[2])[0];
    const sharedPicks = ce.picks.filter(q => D.shared.indexOf(q.c) >= 0).map(q => q.p.n);
    const board = [
      { i: 'EA', role: 'Enterprise architect', q: 'Which of ' + (sharedPicks.join(', ') || 'your choices') + ' duplicate an existing enterprise standard, and why diverge?', hint: 'the reference catalogue and an ADR for each exception' },
      { i: 'CISO', role: 'Chief information security officer', q: 'How are human, service and agent identities managed and revoked with ' + (nm('idp') || 'your identity provider') + '?', hint: 'the threat model and secret rotation policy' },
      { i: 'FO', role: 'FinOps lead', q: 'What is the run cost at 50M users, and why is ' + (costliest ? costliest.p.n : 'the largest line') + ' worth it?', hint: 'the cost index curve and a unit cost per transaction' },
      { i: 'OPS', role: 'Head of operations', q: 'Who is on call for ' + (heaviest ? heaviest.p.n : 'each platform') + ', and what does the runbook say for its failure?', hint: 'drill results and named owners' }
    ];
    if (ent) board.unshift(
      { i: 'IC', role: 'Investment committee', q: 'Which capability gap does this close, and how will you measure the benefit?', hint: 'capability maturity before and after, and a named benefits owner' },
      { i: 'PO', role: 'Portfolio owner', q: 'Which applications does this let us retire, and when do their costs stop?', hint: 'the gap analysis and transition plateaus' },
      { i: 'CEA', role: 'Chief enterprise architect', q: 'How does this move us towards the target architecture, and which deviations from standards are you asking for?', hint: 'the architecture contract and the pattern library' });
    if (aiOn) board.push({ i: 'RAI', role: 'Responsible AI lead', q: st.ai === 'native' ? 'Which decisions can agents make alone, which need human approval, and how do you stop an agent that misbehaves?' : 'How is each AI use case risk-classified, evaluated before release, and overseen by a person?', hint: 'the AI register, evaluation results, approval thresholds and kill-switch tests' });
    if (aiOn) board.push({ i: 'FO', role: 'FinOps lead (AI spend)', q: 'What does one AI-assisted transaction cost in tokens, and what stops costs running away at scale?', hint: 'gateway budgets, caching and model routing data' });
    if (st.reg) board.push({ i: 'QA', role: 'Quality and compliance', q: 'How will this be validated, and how do you prove data never leaves approved regions?', hint: 'the validation plan and the residency drill' });
    ce.issues.filter(x => x.cat !== 'Functional').slice(0, 3).forEach(x => board.push({ i: 'ARB', role: 'Board challenge from your own analysis', q: x.text, hint: 'a mitigation recorded in the relevant ADR' }));

    // Checkpoints
    const qz = D.quizzes[step];
    const quiz = qz ? qz.qs.map((q, qi) => { const key = step + '-' + qi; const ans = st.quiz[key]; const answered = ans !== undefined; const right = answered && ans === q.a;
      return { q: q.q, answered, verdict: right ? 'Correct.' : 'Not quite.', vfg: right ? 'var(--good)' : 'var(--warn)', why: q.why,
        opts: q.o.map((t, oi) => { const isA = answered && oi === q.a; const isWrong = answered && oi === ans && ans !== q.a;
          return { t, pick: () => this.setState({ quiz: Object.assign({}, this.state.quiz, { [key]: oi }) }), bg: isA ? 'var(--good-soft)' : (isWrong ? 'var(--warn-soft)' : 'var(--surface)'), bd: isA ? 'var(--good)' : (isWrong ? 'var(--orange)' : LINE), fg: INK }; }) }; }) : [];
    const quizDone = qz ? qz.qs.every((_, qi) => st.quiz[step + '-' + qi] !== undefined) : false;
    let qTotal = 0, qRight = 0;
    vis.forEach(s => { const z = D.quizzes[s[0]]; if (z) z.qs.forEach((q, qi) => { qTotal++; if (st.quiz[s[0] + '-' + qi] === q.a) qRight++; }); });

    const nextLevel = { beginner: ['intermediate','Unlock Intermediate: decisions, evolution and drills'], intermediate: ['advanced','Unlock Advanced: enterprise view and review board'] }[st.level];
    const atEnd = si === vis.length - 1;
    const base = {
      journey, hasLockedChev: lockedSteps.length > 0, lockedNum: lockedSteps.length, lockedNext, lockedClick, lockedTip,
      lensOpts, briefIntro, libOpts, libNote, land, showLandscape: ent, guideStep: step === 'tour' ? 'Start here' : vis[si][1],
      flowHead: ent ? '2. Inside the solution: how the parts talk' : '1. How the parts talk to each other', reqHead: ent ? '3. Follow a request and inspect the structure' : '2. Follow a request and inspect the structure',
      wQs, wFig, wCalc, wLaws, wDerived, wFit, wFitNone, hasWFit: wFit.length > 0, wSummary, wSumFg: wMis ? 'var(--warn)' : 'var(--good)', wBasis, wImplNote: isImplApp,
      flow, flowList, flowListTitle, flowHasSel: !!sel0, flowClear: () => this.setState({ flowSel: null }),
      chat: chatView, chatEmpty: st.chat.length === 0, thinking: st.thinking, thinkingLabel: st.thinkStarted ? 'Writing the brief...' : 'Thinking about your brief...',
      stopThinking: () => { if (this._ctl) this._ctl.abort(); },
      composerHint: st.chat.length ? 'Refine it: "make it AI-native", "add payroll", "we are on Azure", "it is for 2,000 employees"...' : 'Describe what you want to build...',
      aiModeLine: st.aiSrc === 'byo' ? this.aiName() + ' (' + (st.aiCfg.model || '') + ') reads your brief and maps it to the studio catalogue. ' + (st.aiCfg.provider === 'ollama' ? 'It runs on your computer.' : 'Calls go from your browser to ' + AI_PROVIDERS[st.aiCfg.provider].n + ' using your key.') : st.aiReady ? 'Claude reads your brief and maps it to the studio catalogue. It uses your Claude usage, and asks permission the first time.' : this._host ? 'Using keyword matching here. Open this canvas in the Claude app or claude.ai to have Claude interpret free-form briefs.' : 'Using keyword matching. Connect an AI model to have any brief interpreted, not just keywords.',
      glance, showCtx: st.showCtx, ctxExpanded: st.showCtx ? 'true' : 'false', ctxLabel: st.showCtx ? 'Hide constraints' : 'Adjust constraints', toggleCtx: () => this.setState({ showCtx: !st.showCtx }),
      showTpl: st.showTpl, tplExpanded: st.showTpl ? 'true' : 'false', tplLabel: st.showTpl ? 'Hide templates' : 'Browse templates', toggleTpl: () => this.setState({ showTpl: !st.showTpl }),
      stepPos: 'Step ' + (si + 1) + ' of ' + vis.length + ': ' + vis[si][1],
      steps, coach: coaches[step], briefLine: A.n + ' · ' + { none: 'No AI', enabled: 'AI-enabled', native: 'AI-native' }[st.ai] + ' · ' + st.scale + ' · ' + st.avail + '%', levels,
      hasLocked: lockedN > 0, lockedLine: trk ? 'Levels change the detail on each step. Your practice track sets which steps you see.' : lockedN === 1 ? '1 more step unlocks at a higher level' : lockedN + ' more steps unlock at higher levels',
      plain: st.plain, togglePlain: () => this.setState({ plain: !st.plain }), plainPressed: st.plain ? 'true' : 'false', plainLabel: st.plain ? 'on' : 'off',
      plainBg: st.plain ? SOFT : 'var(--surface)', plainBd: st.plain ? ACC : LINE, plainFg: st.plain ? 'var(--accent-ink)' : INK,
      quizScore: qRight + ' / ' + qTotal, terms, hasTerm, term,
      tour, tourMap, tourTitle, tourIntro, tourSegs, tourHasPrev: tIdx > 0, tourNextLabel: tIdx === 0 ? 'Start the walkthrough' : 'Continue', tourMore: tIdx < tourSteps.length - 1, tourEnd: tIdx === tourSteps.length - 1,
      tourPrev: () => this.setState({ tourIdx: Math.max(0, tIdx - 1) }), tourNext: () => this.setState({ tourIdx: tIdx + 1, tourSeenEnd: tIdx + 1 === tourSteps.length - 1 || !!st.tourSeenEnd }), _tourLeft: tourSteps.length - 1 - tIdx, _tourDone: tIdx === tourSteps.length - 1 || !!st.tourSeenEnd,
      apps, ctx, planning, examples, text: st.text, onText: e => this.setState({ text: e.target.value, interpMiss: false }), onKey: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(e.target.value); } }, send: () => this.send(),
      interpret: () => this.interpret(st.text), hasInterp: st.app === 'custom' && !!st.interp,
      interp: st.interp || { title: '', base: '', added: '', unused: '', hasUnused: false, note: '' }, interpMiss: st.interpMiss,
      startLabel: lensOk ? 'Generate enterprise view' : 'Generate blueprint', goStart: go(lensOk ? 'enterprise' : 'blueprint'),
      req, reqSummary, hops, reqPlay, reqNext, reqReset, hasCache, toggleHit: () => this.setState({ reqHit: !st.reqHit }), hitPressed: st.reqHit ? 'true' : 'false', hitLabel: st.reqHit ? 'Cache: hit' : 'Cache: miss',
      layers, shelf, sig, hasSig: sig.length > 0,
      tabs, canAdd: outs.length < 4, canRemove: outs.length > 1, addOutcome, removeOutcome, activeName, fills, builder, outcomesIntro,
      guidedOn, freeOn: !st.guided, g, toggleGuided: () => this.setState({ guided: !st.guided, focus: null }), guidedSwitchLabel: st.guided ? 'Switch to free mode' : 'Switch to guided mode',
      hasFocus: !!focus, focus: focus ? { label: C[focus.cid].l, tip: focus.tip } : { label: '', tip: '' }, clearFocus: () => this.setState({ focus: null, step: 'compare' }),
      cards, bestName, bestWhy, selectBest: () => this.setState({ chosen: best }), bestOpen: st.chosen == null, bestTaken: st.chosen != null, gridCols, outNames, rows,
      adrs, adrMd, stages, stageSummary, stageMoves: stageMoveList[stg].concat(aiOn ? [D.aiMoves[isImplApp ? 'impl' : 'system'][st.ai][stg]] : []).map(t => ({ t })), evolveTitle, evolveIntro, implApps, evoRows, isBrown: st.field === 'brown', migration,
      eaName, eaDefaulted: st.chosen == null, eaPicks: ce.picks.map(q => ({ n: q.p.n })), eaCaps, eaNb, portfolioLine, eaDom: A.dom.map(n => ({ n })), eaTech, eaGov,
      scenarios, drillRows, drillSummary, drillAdvice: S.advice, incident, threats,
      checks, maturity, board,
      hasQuiz: !!qz, quiz, quizDone,
      quizOpen: !!qz && !quizDone, quizHead: qz ? (quizDone ? 'Checkpoint complete' : (qz.qs.length === 2 ? 'Two quick questions before you continue' : 'A quick question before you continue')) : '',
      toCheckpoint: () => { try { const el = document.getElementById('checkpoint'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }, quizTake: qz ? qz.take : '',
      hasPrev: si > 0, prevLabel: si > 0 ? vis[si - 1][1] : '', goPrev: si > 0 ? go(vis[si - 1][0]) : () => {},
      hasNext: !atEnd, nextLabel: !atEnd ? vis[si + 1][1] : '', goNext: !atEnd ? go(vis[si + 1][0]) : () => {}, _qLeft: qz ? qz.qs.filter((_, qi) => st.quiz[step + '-' + qi] === undefined).length : 0,
      atLevelEnd: atEnd && !!nextLevel, levelUpLabel: nextLevel ? nextLevel[1] : '', levelUp: () => { if (nextLevel) this.setLevel(nextLevel[0]); },
      appName: A.n,
      isTour: step === 'tour', isBrief: step === 'brief', isBlueprint: step === 'blueprint', isOutcomes: step === 'outcomes', isCompare: step === 'compare',
      isDecisions: step === 'decisions', isEvolve: step === 'evolve', isEnterprise: step === 'enterprise', isDrill: step === 'drill', isReview: step === 'review',
      isWorkload: step === 'workload', isPrinciples: step === 'principles', isVision: step === 'vision', isCanvas: step === 'canvas', isGap: step === 'gap', isChange: step === 'change', isBoard: step === 'board'
    };
    const stepNames = {}; this.allSteps().forEach(s => { stepNames[s[0]] = s[1]; });
    {
      const tourPending = base.isTour && !base._tourDone;
      const quizPending = base._qLeft > 0;
      base.showQuiz = base.hasQuiz && !tourPending;
      const ready = !tourPending && !quizPending;
      base.nextCls = ready ? 'as-float-1' : 'as-float-quiet';
      base.nextVerb = ready ? 'Continue to' : 'Skip to';
      base.hasTodo = !ready;
      base.todoLine = tourPending ? (base._tourLeft === 1 ? '1 part left' : base._tourLeft + ' parts left') : (base._qLeft === 1 ? '1 question left' : base._qLeft + ' questions left');
      base.todoGo = tourPending ? () => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} } : base.toCheckpoint;
      // Step work: the one thing to do before the checkpoint and Continue
      const toAction = () => { try { const el = document.getElementById('step-action'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {} };
      const stp = base.isPrinciples ? 'principles' : base.isBrief ? 'brief' : base.isVision ? 'vision' : base.isBlueprint ? 'blueprint' : base.isCanvas ? 'canvas' : base.isOutcomes ? 'outcomes' : base.isCompare ? 'compare' : base.isBoard ? 'board' : base.isReview ? 'review' : base.isChange ? 'change' : '';
      const scn = this.scen(); const nChanges = (scn ? scn.changes : this.admData().defaultChanges).length; const doneChanges = Object.keys(st.chg || {}).length;
      const briefDone = !!st.briefChosen || !!st.scenario || st.chat.length > 0;
      const work = { principles: !st.prinAgreed && 'Agree the principles', brief: !briefDone && 'Choose a scenario or describe yours', vision: !st.visionAgreed && 'Agree the vision', blueprint: st.reqStep < 0 && !st.reqPlayed && 'Follow a request',
        canvas: !st.canvasAgreed && 'Review the canvas and use it',
        outcomes: !(base.g && base.g.done) && 'Make every decision for this outcome',
        compare: st.chosen == null && 'Select an outcome',
        review: !st.contractSigned && (this._sample && !(st.boardVerdict && st.boardVerdict.decision !== 'reject') ? 'Get the AI board\'s approval, then sign the contract' : 'Sign the architecture contract'),
        change: doneChanges < nChanges && 'Classify every change',
        board: !!this._sample && !st.boardVerdict && (st.board && st.board.questions && st.board.questions.length ? 'Answer the board, then ask for its decision' : 'Convene the board') }[stp] || '';
      if (work) { base.showQuiz = false; base.nextCls = 'as-float-quiet'; base.nextVerb = 'Skip to'; base.hasTodo = true; base.todoLine = 'Left to do: ' + work.charAt(0).toLowerCase() + work.slice(1); base.todoGo = toAction; }
      // Principles
      const nOn = Object.keys(this.prinOn()).filter(k => this.prinOn()[k]).length;
      base.prinPending = !st.prinAgreed; base.prinAgreed = !!st.prinAgreed;
      base.prinAgreeLabel = 'Agree ' + nOn + (nOn === 1 ? ' principle' : ' principles');
      base.prinAgree = () => this.setState({ prinAgreed: true });
      // Brief
      base.sendReady = (st.text || '').trim() ? 'true' : 'false';
      if (Array.isArray(base.apps)) base.apps = base.apps.map(a => Object.assign({}, a, { pick: () => { a.pick(); this.setState({ briefChosen: true }); } }));
      if (Array.isArray(base.implApps)) base.implApps = base.implApps.map(a => Object.assign({}, a, { pick: () => { a.pick(); this.setState({ briefChosen: true }); } }));
      // Vision
      base.visionPending = !st.visionAgreed; base.visionAgreed = !!st.visionAgreed;
      base.visionAgree = () => this.setState({ visionAgreed: true });
      // Canvas
      base.canvasPending = !st.canvasAgreed; base.canvasAgreed = !!st.canvasAgreed;
      base.canvasAgree = () => this.setState({ canvasAgreed: true });
      // Finish: last step of the level, its work done
      const levelNames = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
      base.showFinish = !base.hasNext && !base.hasTodo;
      base.finishTitle = 'You have finished the ' + levelNames[st.level] + ' path';
      base.finishBody = 'Checkpoints: ' + base.quizScore + ' correct. ' + (base.atLevelEnd ? 'The next level adds steps senior architects use every week.' : 'You have taken a design through every TOGAF ADM phase in ArchStudio.') + ' Save this design to show a mentor or manager, or start another.';
      base.finishCanLevel = !!base.atLevelEnd; base.finishLevelLabel = base.levelUpLabel;
      base.finishCanSave = !!this._db;
      base.finishSaveCls = base.atLevelEnd ? 'as-secondary' : 'as-primary';
      base.finishNewCls = (base.atLevelEnd || this._db) ? 'as-secondary' : 'as-primary';
      base.startNew = () => { this.setState({ step: 'brief', scenario: null, briefChosen: false, visionAgreed: false, canvasAgreed: false, canvas: null, chosen: null, reqPlayed: false, reqStep: -1, contractSigned: false, chg: {}, board: null, boardVerdict: null, savedId: null, outcomes: [], outcomesApp: null, active: 0, predict: {} }); try { window.scrollTo({ top: 0 }); } catch (e) {} };
      if (trk && base.showFinish) {
        base.finishTitle = 'You have finished ' + (st.track === 'interview' ? 'the system design interview' : 'trade-off practice');
        base.finishBody = (st.track === 'interview' ? 'Run it again with a different template and keep to the time on each step. ' : 'Try the same system under a different constraint, such as Regulated or 99.99%, and see whether your pick changes. ') + 'The full journey adds principles, the business view, a roadmap and the review board.';
        base.finishCanLevel = true; base.finishLevelLabel = 'Continue in the full journey';
        base.levelUp = () => this.pickTrack('full');
        base.finishSaveCls = 'as-secondary'; base.finishNewCls = 'as-secondary';
      }
      if (base.showFinish) base.atLevelEnd = false;
      base.conveneCls = (st.board && st.board.questions && st.board.questions.length) ? 'as-secondary' : 'as-primary';
      // Blueprint
      const played = st.reqStep >= 0 || !!st.reqPlayed;
      base.playCls = played ? 'as-secondary' : 'as-primary'; base.playLabel = played ? 'Replay' : 'Play the request';
      if (st.reqStep >= 0 && !st.reqPlayed) setTimeout(() => this.setState({ reqPlayed: true }), 0);
    }
    return Object.assign(base, this.admVals(go, stepNames), this.fwVals(go), this.canvasVals(), this.portVals(), this.boardVals(), this.teamVals(qRight, qTotal), this.aiVals(), this.trackVals());
  }
}

