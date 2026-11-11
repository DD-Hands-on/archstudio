// @ts-check
// Gap analysis: compare a baseline estate with the target design, then group the work into
// transition architectures (TOGAF Phases E and F).

/** @typedef {import('./types.js').Catalogue} Catalogue */
/** @typedef {import('./types.js').Design} Design */
/** @typedef {import('./types.js').StandardsMap} StandardsMap */
/** @typedef {[string, string | null, 'keep' | 'replace' | 'retire']} BaselineItem name, block id, fate */
/** @typedef {'New' | 'Change' | 'Keep' | 'Retire'} GapKind */
/** @typedef {{ c: string, base: string, tgt: string, gap: GapKind, layer: string, wp: string }} GapRow */

/** Typical brownfield estate, used when no scenario supplies one. */
const TYPICAL_BROWNFIELD = /** @type {BaselineItem[]} */ ([['Legacy core system', 'app', 'replace'], ['On-premises database', 'db', 'replace'], ['Point-to-point integrations', null, 'retire'], ['Identity provider', 'idp', 'keep']]);

/** Transition architectures and the layers whose work lands in each. */
export const PLATEAUS = [
  { k: 'T1', n: 'Foundations', d: 'Identity, data, integration and shared services stand up alongside the baseline.', layers: ['x', 'data', 'edge'] },
  { k: 'T2', n: 'Core services', d: 'Core applications move onto the target while the baseline runs in parallel for cutover.', layers: ['app'] },
  { k: 'T3', n: 'Target and retirement', d: 'People move to the new experience and baseline systems are decommissioned.', layers: ['exp', 'retire'] }
];

/** @type {Record<GapKind, number>} */
const ORDER = { Retire: 0, Change: 1, New: 2, Keep: 3 };

/**
 * The baseline to compare against, and a sentence saying where it came from.
 * @param {{ base: BaselineItem[] } | null} scenario
 * @param {string} field 'brown' or 'green'
 * @returns {{ base: BaselineItem[], note: string }}
 */
export function baselineFor(scenario, field) {
  if (scenario) return { base: scenario.base, note: 'Baseline from the scenario: the estate as it runs today.' };
  if (field === 'brown') return { base: TYPICAL_BROWNFIELD, note: 'Brownfield: a typical baseline estate is assumed. Pick a scenario for a specific one.' };
  return { base: [], note: 'Greenfield: there is no baseline, so every building block is new.' };
}

/**
 * Rows of the gap table, sorted Retire, Change, New, Keep; counts per kind; and work packages
 * grouped by transition architecture.
 * @param {{ cat: Catalogue, design: Design, std: StandardsMap, base: BaselineItem[] }} input
 */
export function gapAnalysis({ cat, design, std, base }) {
  /** @type {Record<number, number>} */
  const used = {};
  /** @type {GapRow[]} */
  const rows = [];
  design.comps.forEach(c => {
    const cc = cat[c]; if (!cc) return; const p = design.picks[c];
    const tgt = p != null && cc.o[p] ? cc.o[p].n : (std[c] && std[c].i >= 0 ? cc.o[std[c].i].n + ' (standard)' : 'Product not chosen');
    const bi = base.findIndex(b => b[1] === c);
    if (bi >= 0) { used[bi] = 1; const b = base[bi]; rows.push(b[2] === 'keep' ? { c: cc.l, base: b[0], tgt, gap: 'Keep', layer: cc.layer, wp: 'No change' } : { c: cc.l, base: b[0], tgt, gap: 'Change', layer: cc.layer, wp: 'Replace ' + b[0] + ' with ' + tgt }); }
    else rows.push({ c: cc.l, base: 'Not in place', tgt, gap: 'New', layer: cc.layer, wp: 'Introduce ' + tgt });
  });
  base.forEach((b, i) => { if (!used[i]) rows.push({ c: b[1] && cat[b[1]] ? cat[b[1]].l : 'Baseline system', base: b[0], tgt: 'Removed', gap: 'Retire', layer: 'retire', wp: 'Decommission ' + b[0] }); });
  rows.sort((a, b) => ORDER[a.gap] - ORDER[b.gap]);
  const count = /** @type {Record<GapKind, number>} */ ({ New: 0, Change: 0, Keep: 0, Retire: 0 });
  rows.forEach(r => { count[r.gap]++; });
  const work = rows.filter(r => r.gap !== 'Keep');
  const plateaus = PLATEAUS.map(pl => ({ k: pl.k, n: pl.n, d: pl.d, items: work.filter(r => pl.layers.indexOf(r.layer) >= 0).map(r => r.wp) }));
  return { rows, count, plateaus };
}
