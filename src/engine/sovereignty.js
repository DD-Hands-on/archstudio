// @ts-check
// Sovereignty: where data may be stored and where models may run. A design setting that shifts
// product fit (see the sovereignty rules in fit-rules.js) and is read from the brief.

/** @typedef {'any' | 'region' | 'sovereign' | 'onprem'} Sov */

/** @type {[Sov, string][]} value and label, in the order shown */
export const SOV_OPTIONS = [['any', 'Anywhere'], ['region', 'In our region'], ['sovereign', 'Sovereign cloud'], ['onprem', 'On premises']];

/** How each setting reads inside a sentence. */
export const SOV_PHRASE = /** @type {Record<Sov, string>} */ ({ any: 'anywhere', region: 'in our region', sovereign: 'in a sovereign cloud', onprem: 'on premises' });

/**
 * @param {unknown} v
 * @returns {Sov}
 */
export function sovOf(v) {
  return v === 'region' || v === 'sovereign' || v === 'onprem' ? v : 'any';
}

/**
 * Read the setting from a brief. The strictest one mentioned wins. Returns null when the brief says nothing.
 * @param {string} text
 * @returns {Sov | null}
 */
export function sovFromText(text) {
  const t = ' ' + String(text || '').toLowerCase() + ' ';
  if (/on-prem|on prem|own data ?cent(?:re|er)|air-gapped|air gapped/.test(t)) return 'onprem';
  if (/sovereign/.test(t)) return 'sovereign';
  if (/data residency|in-region|in region|data localisation|data localization|(?:stay|remain|kept|keep it|stored) (?:with)?in (?:the )?(?:eu|uk|us|india|country|region)\b/.test(t)) return 'region';
  return null;
}
