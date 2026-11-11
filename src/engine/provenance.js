// @ts-check
// Provenance of catalogue entries: source, "as of" date, reviewer and review date.
// Data lives in src/data/provenance.json and is validated by `npm run check`.
import data from '../data/provenance.json' with { type: 'json' };

/** @typedef {{ source: string, asOf: string, reviewedBy: string, reviewBy: string, note?: string }} Provenance */
/** @typedef {'products' | 'fitRules' | 'incidents' | 'referenceModels'} Section */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Look up one entry.
 * @param {Section} section
 * @param {string} key
 * @returns {Provenance | null}
 */
export function provenanceOf(section, key) {
  const s = /** @type {Record<string, Provenance>} */ (data[section]);
  return (s && s[key]) || null;
}

/**
 * "Oct 2026" from "2026-10-23".
 * @param {string} iso
 */
export function monthYear(iso) {
  const [y, m] = iso.split('-');
  return MONTHS[Number(m) - 1] + ' ' + y;
}

/**
 * Short label for screens: "As of Oct 2026", plus "review due" when past its review date.
 * @param {Provenance | null} p
 * @param {string} today YYYY-MM-DD
 */
export function asOfLabel(p, today) {
  if (!p) return '';
  return 'As of ' + monthYear(p.asOf) + (p.reviewBy < today ? ' · review due' : '');
}
