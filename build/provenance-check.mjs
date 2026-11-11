// Validates src/data/provenance.json: the JSON Schema, then that it matches the catalogue exactly.
// Errors fail the check. Entries past their reviewBy date are warnings, so a stale entry is visible
// without blocking unrelated work.
// Usage: node build/provenance-check.mjs [--today=YYYY-MM-DD] [--strict]   (--strict turns warnings into errors)
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = p => JSON.parse(readFileSync(join(root, p), 'utf8'));

/** Keys every section must have, from the catalogue itself. */
export function expectedKeys({ cat, fitRules, incidents, apps, tiers = {} }) {
  const products = {}; Object.keys(cat).forEach(c => cat[c].o.forEach(o => { products[c + '/' + o.n] = o.u; }));
  const fit = {}; const seen = {};
  fitRules.forEach(r => { const b = r[0] + '/' + r[1]; seen[b] = (seen[b] || 0) + 1; fit[b + '#' + seen[b]] = 'curated'; });
  const inc = {}; Object.keys(incidents).forEach(k => { inc[k] = incidents[k][2]; });
  const models = {}; Object.keys(apps).forEach(k => { models[k] = null; });
  const prices = {}; Object.keys(tiers).forEach(k => { prices[k] = null; });
  return { products, fitRules: fit, incidents: inc, referenceModels: models, prices };
}

/**
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkProvenance(data, schema, catalogue, today) {
  const errors = []; const warnings = [];
  const ajv = new Ajv({ allErrors: true, strict: true }); addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(data)) validate.errors.forEach(e => errors.push('schema: ' + (e.instancePath || '/') + ' ' + e.message));
  if (errors.length) return { errors, warnings };
  const want = expectedKeys(catalogue);
  for (const section of Object.keys(want)) {
    const have = data[section]; const need = want[section];
    Object.keys(need).forEach(k => { if (!have[k]) errors.push(section + ': no entry for "' + k + '"'); });
    Object.keys(have).forEach(k => { if (!(k in need)) errors.push(section + ': "' + k + '" is not in the catalogue'); });
    Object.keys(have).forEach(k => {
      const e = have[k]; if (!(k in need)) return;
      if (need[k] && e.source !== need[k]) errors.push(section + ': "' + k + '" source ' + e.source + ' does not match the catalogue link ' + need[k]);
      if (e.asOf > today) errors.push(section + ': "' + k + '" asOf ' + e.asOf + ' is in the future');
      if (e.reviewBy < e.asOf) errors.push(section + ': "' + k + '" reviewBy is before asOf');
      if (e.reviewBy < today) warnings.push(section + ': "' + k + '" was due for review on ' + e.reviewBy);
    });
  }
  return { errors, warnings };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv.find(a => a.startsWith('--today='));
  const today = arg ? arg.slice(8) : new Date().toISOString().slice(0, 10);
  const strict = process.argv.includes('--strict');
  const { buildCatalogue } = await import(pathToFileURL(join(root, 'src/engine/catalogue.js')).href);
  const { FIT_RULES } = await import(pathToFileURL(join(root, 'src/engine/fit-rules.js')).href);
  const { AI_TIERS } = await import(pathToFileURL(join(root, 'src/engine/ai.js')).href);
  const D = buildCatalogue();
  const { errors, warnings } = checkProvenance(readJson('src/data/provenance.json'), readJson('src/data/provenance.schema.json'),
    { cat: D.cat, fitRules: FIT_RULES, incidents: D.incidents, apps: D.apps, tiers: AI_TIERS }, today);
  warnings.forEach(w => console.log('WARN ' + w));
  errors.forEach(e => console.log('FAIL ' + e));
  const fail = errors.length || (strict && warnings.length);
  const n = Object.values(readJson('src/data/provenance.json')).filter(v => typeof v === 'object').reduce((a, s) => a + Object.keys(s).length, 0);
  console.log(fail ? 'Provenance check failed.' : 'Provenance: ' + n + ' entries valid' + (warnings.length ? ', ' + warnings.length + ' due for review' : '') + '.');
  process.exit(fail ? 1 : 0);
}
