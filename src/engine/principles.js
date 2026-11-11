// @ts-check
// Architecture principle checks: whether a design meets each adopted principle, and why.

/** @typedef {import('./types.js').Catalogue} Catalogue */
/** @typedef {import('./types.js').Design} Design */
/** @typedef {import('./types.js').DesignCheck} DesignCheck */
/** @typedef {{ state: 'met' | 'risk' | 'open', t: string }} PrincipleResult */

/** Principles measured against the pattern library; not measurable without one. */
const NEEDS_LIBRARY = ['benefit', 'reuse', 'diversity'];

/**
 * Check one principle against a design.
 * @param {string} id principle id
 * @param {{ cat: Catalogue, design: Design, check: DesignCheck, libNone: boolean,
 *   settings: { avail: string | number, reg: boolean, ai: string } }} input
 *   check is checkDesign() for the same design; libNone is true when no pattern library is set.
 * @returns {PrincipleResult}
 */
export function principleCheck(id, { cat, design, check, libNone, settings }) {
  const ds = design; const r = check; const has = (/** @type {string} */ c) => ds.comps.indexOf(c) >= 0;
  /** @returns {PrincipleResult} */
  const R = (/** @type {boolean} */ ok, /** @type {string} */ t) => ({ state: ok ? 'met' : 'risk', t });
  if (libNone && NEEDS_LIBRARY.indexOf(id) >= 0) return { state: 'open', t: 'No pattern library is set, so reuse of standards is not measured. Choose one on the Canvas.' };
  switch (id) {
    case 'primacy': return R(true, 'Applied through every check on this page.');
    case 'benefit': return r.conf == null ? { state: 'open', t: 'Choose products to check reuse of shared standards.' } : R(r.conf >= 70, r.conf + '% of chosen blocks are shared enterprise standards.');
    case 'continuity': return R(has('obs') && Number(settings.avail) >= 99.9, (has('obs') ? 'Observability in place' : 'No observability block') + ', ' + settings.avail + '% availability target.');
    case 'compliance': return !settings.reg ? R(true, 'No regulated data in scope.') : R(has('idp') && (has('grc') || has('aigov') || has('catalog') || has('guard')), has('idp') ? 'Regulated data: identity in place; governance block ' + ((has('grc') || has('aigov') || has('catalog') || has('guard')) ? 'present.' : 'missing.') : 'Regulated data with no identity and access block.');
    case 'asset': return R(has('catalog') || has('mdm'), has('catalog') || has('mdm') ? 'Catalogue or master data block present.' : 'No data catalogue or master data block.');
    case 'shared': return R(has('mdm') || has('lake') || has('catalog'), has('mdm') || has('lake') || has('catalog') ? 'Shared data platform or master data in the design.' : 'No shared data platform or master data.');
    case 'security': return R(has('idp'), has('idp') ? 'Identity and access at the boundary.' : 'No identity and access block.');
    case 'reuse': return r.conf == null ? { state: 'open', t: 'Choose products to check against the pattern library.' } : R(r.conf >= 80, r.conf + '% follow the pattern library.');
    case 'interop': return R(has('gw') || has('ipaas'), has('gw') || has('ipaas') ? 'API gateway or integration platform present.' : 'No API gateway or integration platform.');
    case 'diversity': return r.conf == null ? { state: 'open', t: 'Choose products to count deviations.' } : R(r.devN <= 2, r.devN + (r.devN === 1 ? ' block' : ' blocks') + ' off standard or under review.');
    case 'independence': {
      const ps = ds.comps.filter(c => ds.picks[c] != null && cat[c]).map(c => cat[c].o[ds.picks[c]].s[3]);
      if (!ps.length) return { state: 'open', t: 'Choose products to score portability.' };
      const avg = ps.reduce((a, b) => a + b, 0) / ps.length;
      return R(avg >= 3.5, 'Average portability ' + avg.toFixed(1) + ' out of 5.');
    }
    case 'rai': return settings.ai === 'none' ? R(true, 'No AI in scope.') : R(has('guard') && has('aigov'), (has('guard') ? 'Guardrails present' : 'No guardrails') + '; ' + (has('aigov') ? 'model registry present.' : 'no AI governance block.'));
    default: return { state: 'open', t: '' };
  }
}
