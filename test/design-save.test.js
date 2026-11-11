// Saved designs must keep opening as the catalogue changes. Fixtures are real save shapes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCatalogue } from '../src/engine/catalogue.js';
import { SAVE_VERSION, APP_VERSION, V1_PRODUCT_ORDER, pickNamesFor, migrateDesign } from '../src/engine/design-save.js';

const cat = buildCatalogue().cat;
const fx = name => JSON.parse(readFileSync(new URL('./fixtures/saves/' + name, import.meta.url), 'utf8'));
const name = (cid, p) => cat[cid].o[p].n;

test('app version in the engine matches package.json', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(APP_VERSION, pkg.version);
});

test('a v2.1 save opens unchanged', () => {
  const raw = fx('v2.1-save.json');
  const { design, notes, fromVersion } = migrateDesign(raw, cat);
  assert.equal(fromVersion, 1);
  assert.deepEqual(notes, []);
  assert.equal(design.schemaVersion, SAVE_VERSION);
  assert.deepEqual(design.comps, raw.comps);
  assert.deepEqual(design.picks, raw.picks);
  assert.deepEqual(design.canvas, raw.canvas);
  assert.deepEqual(design.settings, raw.settings);
  assert.equal(design.step, raw.step);
});

test('removed products and components are cleared with a note', () => {
  const { design, notes } = migrateDesign(fx('v2.1-removed-product.json'), cat);
  assert.deepEqual(design.comps, ['ui', 'db']);
  assert.deepEqual(design.picks, { ui: 0 });
  assert.equal(design.canvas.nodes.length, 1);
  assert.equal(design.canvas.nodes[0].p, null);
  assert.deepEqual(design.canvas.edges, [], 'edges to a removed node are dropped');
  assert.ok(notes.some(n => /^2 components in this save are no longer in the catalogue/.test(n)), notes.join(' | '));
  assert.ok(notes.some(n => /^3 products in this save are no longer in the catalogue/.test(n)), notes.join(' | '));
});

test('a save missing settings gets safe defaults', () => {
  const { design, notes } = migrateDesign(fx('v2.1-missing-settings.json'), cat);
  assert.deepEqual(design.settings, {});
  assert.deepEqual(design.comps, []);
  assert.deepEqual(design.picks, {});
  assert.equal(design.canvas, null);
  assert.equal(design.step, 'blueprint');
  assert.deepEqual(notes, []);
});

test('v2 saves match products by name, not position', () => {
  const { design, notes } = migrateDesign(fx('v2-names.json'), cat);
  assert.equal(name('ui', design.picks.ui), 'Flutter');
  assert.equal(design.picks.db, undefined, 'a renamed or removed product is cleared, not swapped');
  assert.equal(name('ui', design.canvas.nodes[0].p), 'Angular');
  assert.equal('pn' in design.canvas.nodes[0], false);
  assert.equal('pickNames' in design, false);
  assert.ok(notes.some(n => /^1 product in this save is/.test(n)));
});

test('names survive a reordered product list', () => {
  const moved = JSON.parse(JSON.stringify(cat));
  moved.ui.o.reverse();
  const saved = { comps: ['ui'], picks: { ui: 0 }, pickNames: pickNamesFor({ ui: 0 }, cat), schemaVersion: 2 };
  const { design } = migrateDesign(saved, moved);
  assert.equal(moved.ui.o[design.picks.ui].n, name('ui', 0));
});

test('a save from a newer version opens with a warning and keeps unknown fields', () => {
  const { design, notes, fromVersion } = migrateDesign(fx('future-save.json'), cat);
  assert.equal(fromVersion, 9);
  assert.ok(notes[0].includes('newer version'));
  assert.equal(name('ui', design.picks.ui), 'Angular');
  assert.deepEqual(design.somethingNew, { x: 1 });
});

test('bad input never throws', () => {
  for (const raw of [null, undefined, 'x', 42, [], { comps: 'x', picks: 'y', canvas: 'z' }, { picks: { ui: -1, db: 1.5 } }]) {
    const { design } = migrateDesign(raw, cat);
    assert.ok(Array.isArray(design.comps));
  }
});

test('pickNamesFor stores names only for valid picks', () => {
  assert.deepEqual(pickNamesFor({ ui: 1, db: 99, nope: 0 }, cat), { ui: name('ui', 1) });
});

test('position-only saves are read against the v2.1 list where it has changed', () => {
  // In v2.1 the tools list was MCP, A2A, OpenAPI. A2A has since moved to its own block.
  const { design, notes } = migrateDesign({ comps: ['tools'], picks: { tools: 1 }, canvas: { nodes: [{ id: 'n1', cid: 'tools', x: 0, y: 0, p: 2 }], edges: [] } }, cat);
  assert.equal(design.picks.tools, undefined, 'A2A is not silently swapped for another tool interface');
  assert.equal(name('tools', design.canvas.nodes[0].p), 'OpenAPI tool adapters');
  assert.ok(notes.some(n => /^1 product in this save is/.test(n)));
  const kept = migrateDesign({ comps: ['tools'], picks: { tools: 0 } }, cat).design;
  assert.equal(name('tools', kept.picks.tools), 'Model Context Protocol (MCP)');
  const named = migrateDesign({ schemaVersion: 2, comps: ['tools'], picks: { tools: 1 }, pickNames: { tools: 'Direct tool calls and CLIs' } }, cat).design;
  assert.equal(name('tools', named.picks.tools), 'Direct tool calls and CLIs', 'version 2 saves use their names');
});

test('every product list changed since v2.1 has its v2.1 order recorded for old saves', () => {
  // Saves and team standards from v2.1 store positions only. If a list is reordered or loses a product,
  // its v2.1 order must be in V1_PRODUCT_ORDER, or old saves would silently point at the wrong product.
  const v21 = fx('../v2.1-product-order.json');
  for (const [cid, names] of Object.entries(v21)) {
    const now = cat[cid] ? cat[cid].o.map(o => o.n) : [];
    const samePositions = names.every((n, i) => now[i] === n);
    if (!samePositions) assert.deepEqual(V1_PRODUCT_ORDER[cid], names, cid + ' changed since v2.1: add its v2.1 order to V1_PRODUCT_ORDER');
  }
});
