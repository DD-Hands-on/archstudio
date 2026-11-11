// @ts-check
import { V1_PRODUCT_ORDER } from './design-save.js';
// Enterprise standards: example pattern libraries, conformance of a design, and storage of
// team standards. Plain functions with their inputs passed in; no screens, no browser APIs.

/** @typedef {import('./types.js').Catalogue} Catalogue */
/** @typedef {import('./types.js').Product} Product */
/** @typedef {import('./types.js').Standard} Standard */
/** @typedef {import('./types.js').StandardsMap} StandardsMap */
/** @typedef {import('./types.js').Picks} Picks */
/** @typedef {import('./types.js').Design} Design */
/** @typedef {import('./types.js').DesignCheck} DesignCheck */

/** Blocks whose pattern is still under review in every example library. */
const REVIEW_BLOCKS = ['agents', 'tools', 'mem', 'llm', 'vec', 'aigw', 'orch'];
/** Core business platforms: these follow a vendor named in the brief. */
const CORE_BLOCKS = ['erpcore', 'hcm', 'payroll', 'crmcore', 'itsm', 'p2p'];
const NAMED_VENDORS = ['SAP', 'Oracle', 'Workday', 'ServiceNow', 'Salesforce', 'Coupa', 'Jira', 'Microsoft'];
/** Blocks that follow the platform the design uses rather than the library rule. */
const PLATFORM_BOUND = ['ux', 'embai'];
/** SAP-tagged products in these blocks do not make a design an SAP platform. */
const SAP_NEUTRAL = ['ipaas', 'alm', 'migr', 'proc', 'mdm', 'grc', 'ext'];

/**
 * The business platform a set of picks commits to.
 * @param {Picks} picks
 * @param {Catalogue} cat
 * @returns {'servicenow'|'salesforce'|'sap'|'microsoft'|'other'}
 */
export function platformOf(picks, cat) {
  /** @type {Product[]} */
  const chosen = [];
  Object.keys(picks).forEach(c => { if (c !== 'embai' && c !== 'ux' && cat[c] && cat[c].o[picks[c]]) chosen.push(cat[c].o[picks[c]]); });
  if (chosen.some(p => p.n.indexOf('ServiceNow') >= 0)) return 'servicenow';
  if (chosen.some(p => p.n.indexOf('Salesforce') >= 0)) return 'salesforce';
  if (chosen.some(p => p.t.indexOf('sap') >= 0 && SAP_NEUTRAL.every(x => cat[x].o.indexOf(p) < 0))) return 'sap';
  if (chosen.some(p => p.t.indexOf('azure') >= 0)) return 'microsoft';
  return 'other';
}

/**
 * A map with no standard for any block: the neutral default.
 * @param {Catalogue} cat
 * @returns {StandardsMap}
 */
export function noStandards(cat) {
  /** @type {StandardsMap} */
  const m = {};
  Object.keys(cat).forEach(k => { m[k] = { i: -1, status: 'none' }; });
  return m;
}

/**
 * Standards from an example library. Nothing is preferred by default: libraries follow a
 * written rule (highest total score, then the library's lean), and ties break alphabetically.
 * @param {{ cat: Catalogue, lib: string, appName?: string, userText?: string, design: Design }} input
 *   design is the current design, used so platform-bound blocks follow the platform in use.
 * @returns {StandardsMap}
 */
export function exampleStandards({ cat, lib, appName = '', userText = '', design }) {
  if (lib === 'none') return noStandards(cat);
  /** @type {StandardsMap} */
  const m = {};
  /** @param {Product} o */
  const sum = o => o.s.reduce((x, y) => x + y, 0);
  /** @param {Product[]} opts @param {number[]} idx */
  const rank = (opts, idx) => idx.slice().sort((x, y) => sum(opts[y]) - sum(opts[x]) || opts[x].n.localeCompare(opts[y].n))[0];
  /** @type {Record<string, (o: Product) => number>} */
  const leans = { sapms: o => o.t.indexOf('sap') >= 0 ? 2 : o.t.indexOf('azure') >= 0 ? 1 : 0, aws: o => o.t.indexOf('aws') >= 0 ? 1 : 0, oss: o => o.k === 'OSS' ? 1 : 0 };
  const prefer = leans[lib] || (() => 0);
  const said = appName + ' ' + userText;
  const named = NAMED_VENDORS.filter(v => new RegExp('\\b' + v + '\\b', 'i').test(said));
  /** @param {string} k @param {string|null} plat */
  const pickFor = (k, plat) => {
    const opts = cat[k].o; let idx = opts.map((_, j) => j);
    if (CORE_BLOCKS.indexOf(k) >= 0) { const h = idx.filter(j => named.some(v => opts[j].n.toLowerCase().indexOf(v.toLowerCase()) >= 0)); if (h.length) idx = h; }
    if (k === 'ux') idx = idx.filter(j => opts[j].t.indexOf('sap') < 0 || plat === 'sap');
    if (k === 'embai') { const want = /** @type {Record<string, string>} */ ({ sap: 'Joule', salesforce: 'Agentforce', servicenow: 'Now Assist' })[plat || ''] || 'Copilot Studio'; idx = idx.filter(j => opts[j].n.indexOf(want) >= 0); }
    const top = Math.max.apply(null, idx.map(j => prefer(opts[j])));
    return rank(opts, idx.filter(j => prefer(opts[j]) === top));
  };
  Object.keys(cat).filter(k => PLATFORM_BOUND.indexOf(k) < 0).forEach(k => { m[k] = { i: pickFor(k, null), status: REVIEW_BLOCKS.indexOf(k) >= 0 ? 'review' : 'approved' }; });
  /** @type {Picks} */
  const core = {};
  design.comps.forEach(k => { if (PLATFORM_BOUND.indexOf(k) < 0 && m[k]) core[k] = design.picks[k] != null ? design.picks[k] : m[k].i; });
  const plat = platformOf(core, cat);
  PLATFORM_BOUND.forEach(k => { m[k] = { i: pickFor(k, plat), status: 'approved' }; });
  if (plat === 'other' && lib !== 'sapms') m.embai = { i: -1, status: 'none' };
  return m;
}

/**
 * Check each chosen product against the standards.
 * conf is the share of measured blocks on standard (null when nothing is measured).
 * @param {{ cat: Catalogue, std: StandardsMap, comps: string[] | undefined, pickOf: (cid: string) => number | null | undefined }} input
 * @returns {DesignCheck}
 */
export function checkDesign({ cat, std, comps, pickOf }) {
  const checks = (comps || []).filter(c => cat[c]).map(/** @returns {import('./types.js').BlockCheck} */ c => {
    const cc = cat[c]; const sd = std[c] || { i: -1, status: 'none' }; const p = pickOf(c);
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

/**
 * Team standards as stored: each entry also carries the product name (n), because positions
 * shift when the catalogue changes.
 * @param {StandardsMap} std
 * @param {Catalogue} cat
 * @returns {StandardsMap}
 */
export function standardsForStore(std, cat) {
  /** @type {StandardsMap} */
  const out = {};
  Object.keys(std).forEach(cid => {
    const sd = std[cid]; const p = cat[cid] && sd.i >= 0 ? cat[cid].o[sd.i] : null;
    out[cid] = p ? Object.assign({}, sd, { n: p.n }) : Object.assign({}, sd);
  });
  return out;
}

/**
 * Team standards as read: positions are re-resolved from names. A standard whose product is
 * no longer in the catalogue becomes "none" so it is never silently swapped.
 * Stores written before names were kept are read by position, against the v2.1 list where it has changed
 * since (V1_PRODUCT_ORDER). Blocks with no stored entry
 * (for example, added to the catalogue later) have no standard.
 * @param {StandardsMap} raw
 * @param {Catalogue} cat
 * @returns {{ std: StandardsMap, lost: string[] }} lost lists block ids whose standard was cleared
 */
export function standardsFromStore(raw, cat) {
  const std = noStandards(cat);
  /** @type {string[]} */
  const lost = [];
  Object.keys(raw || {}).forEach(cid => {
    const sd = raw[cid]; if (!sd || typeof sd !== 'object') return;
    const cc = cat[cid];
    if (!cc) { lost.push(cid); return; }
    const entry = { i: typeof sd.i === 'number' ? sd.i : -1, status: sd.status || 'none' };
    const legacy = sd.n == null && entry.i >= 0 && V1_PRODUCT_ORDER[cid] ? V1_PRODUCT_ORDER[cid][entry.i] || '' : null;
    const name = sd.n != null ? sd.n : legacy;
    if (name != null) {
      const i = cc.o.findIndex(o => o.n === name);
      if (i < 0) { lost.push(cid); std[cid] = { i: -1, status: 'none' }; return; }
      entry.i = i;
    } else if (entry.i >= 0 && !cc.o[entry.i]) { lost.push(cid); std[cid] = { i: -1, status: 'none' }; return; }
    std[cid] = entry;
  });
  return { std, lost };
}
