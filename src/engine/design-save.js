// @ts-check
// Saved designs: a format version and a migration step, so older saves keep opening
// as the catalogue changes.
//
// Version 1 (v2.1 and earlier): no schemaVersion. Picks are positions in a
// component's product list, so they are read against the current catalogue.
// Version 2: adds schemaVersion, appVersion and pickNames (product name per component,
// and per canvas node as pn). Product names are stable; positions are not.

/** @typedef {import('./types.js').Catalogue} Catalogue */
/** @typedef {import('./types.js').Block} Block */
/** @typedef {import('./types.js').Picks} Picks */
/** @typedef {{ id: string, cid: string, x: number, y: number, p: number | null, pn?: string | null }} CanvasNode */
/** @typedef {{ a: string, b: string, t?: string }} CanvasEdge */

export const SAVE_VERSION = 2;
// Kept equal to package.json "version" by a unit test.
export const APP_VERSION = '2.1.0';

/** @param {unknown} v @returns {v is number} */
const isPos = v => Number.isInteger(v) && /** @type {number} */ (v) >= 0;

/**
 * Product name for each pick, for storing alongside the positions.
 * @param {Picks} picks
 * @param {Catalogue} cat
 * @returns {Record<string, string>}
 */
export function pickNamesFor(picks, cat) {
  /** @type {Record<string, string>} */
  const out = {};
  Object.keys(picks || {}).forEach(cid => {
    const p = picks[cid]; const cc = cat[cid];
    if (cc && isPos(p) && cc.o[p]) out[cid] = cc.o[p].n;
  });
  return out;
}

// Resolve one pick: by name when the save has one, otherwise by position.
// Returns { p } with p a position or null, and gone = true when a choice was lost.
/** @param {Block} cc @param {unknown} pos @param {unknown} name @returns {{ p: number | null, gone: boolean }} */
function resolvePick(cc, pos, name) {
  if (name != null) {
    const i = cc.o.findIndex(o => o.n === name);
    return i >= 0 ? { p: i, gone: false } : { p: null, gone: true };
  }
  if (pos == null) return { p: null, gone: false };
  return isPos(pos) && cc.o[pos] ? { p: pos, gone: false } : { p: null, gone: true };
}

// Bring a saved design up to the current format and catalogue.
// Never throws on bad input; returns the design plus plain-language notes for the learner.
/**
 * @param {unknown} raw a stored design, any version
 * @param {Catalogue} cat
 * @returns {{ design: Record<string, any>, notes: string[], fromVersion: number }}
 */
export function migrateDesign(raw, cat) {
  /** @type {Record<string, any>} */
  const d = raw && typeof raw === 'object' ? JSON.parse(JSON.stringify(raw)) : {};
  const from = Number.isInteger(d.schemaVersion) && d.schemaVersion > 0 ? d.schemaVersion : 1;
  /** @type {string[]} */
  const notes = [];
  if (from > SAVE_VERSION) notes.push('This design was saved by a newer version of ArchStudio Dojo. Some details may not show.');

  if (!d.settings || typeof d.settings !== 'object') d.settings = {};
  if (!d.step) d.step = 'blueprint';

  const comps = Array.isArray(d.comps) ? d.comps : [];
  d.comps = comps.filter((/** @type {string} */ c) => cat[c]);
  let lostComps = comps.length - d.comps.length;

  const names = d.pickNames && typeof d.pickNames === 'object' ? d.pickNames : {};
  const srcPicks = d.picks && typeof d.picks === 'object' ? d.picks : {};
  /** @type {Picks} */
  const picks = {}; let lostPicks = 0;
  Object.keys(Object.assign({}, srcPicks, names)).forEach(cid => {
    if (!cat[cid]) { lostPicks++; return; }
    const r = resolvePick(cat[cid], srcPicks[cid], names[cid]);
    if (r.gone) lostPicks++;
    if (r.p != null) picks[cid] = r.p;
  });
  d.picks = picks;

  if (d.canvas && typeof d.canvas === 'object') {
    /** @type {CanvasNode[]} */
    const nodes = Array.isArray(d.canvas.nodes) ? d.canvas.nodes : [];
    const kept = nodes.filter(n => n && cat[n.cid]);
    lostComps += nodes.length - kept.length;
    const ids = new Set(kept.map(n => n.id));
    d.canvas = {
      nodes: kept.map(n => {
        const r = resolvePick(cat[n.cid], n.p, n.pn);
        if (r.gone) lostPicks++;
        const out = Object.assign({}, n, { p: r.p }); delete out.pn; return out;
      }),
      edges: (Array.isArray(d.canvas.edges) ? d.canvas.edges : []).filter((/** @type {CanvasEdge} */ e) => e && ids.has(e.a) && ids.has(e.b))
    };
  } else d.canvas = null;

  /** @param {number} k @param {string} one @param {string} many */
  const n = (k, one, many) => k + ' ' + (k === 1 ? one : many);
  if (lostComps) notes.push(n(lostComps, 'component in this save is', 'components in this save are') + ' no longer in the catalogue, so ' + (lostComps === 1 ? 'it was' : 'they were') + ' left out.');
  if (lostPicks) notes.push(n(lostPicks, 'product in this save is', 'products in this save are') + ' no longer in the catalogue, so ' + (lostPicks === 1 ? 'that choice was' : 'those choices were') + ' cleared.');

  delete d.pickNames; d.schemaVersion = SAVE_VERSION;
  return { design: d, notes, fromVersion: from };
}
