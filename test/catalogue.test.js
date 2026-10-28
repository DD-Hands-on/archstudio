// The catalogue is the ground truth every score and rule depends on, so its shape is checked here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../src/engine/catalogue.js';
import { buildAdmContent } from '../src/engine/adm-content.js';

const D = buildCatalogue();
const ids = Object.keys(D.cat);
const options = ids.flatMap(c => D.cat[c].o.map(o => ({ c, o })));

test('catalogue size matches what the case study states', () => {
  assert.equal(ids.length, 50, 'building blocks');
  assert.equal(options.length, 156, 'product options');
  assert.equal(options.filter(x => x.o.k === 'OSS').length, 64, 'open source options');
  assert.equal(options.filter(x => x.o.k === 'Proprietary').length, 92, 'commercial options');
  assert.equal(Object.keys(D.apps).length, 13, 'reference models');
  assert.equal(Object.keys(D.quizzes).length, 10, 'checkpoint quizzes');
  assert.equal(Object.keys(D.incidents).length, 10, 'incidents');
  assert.equal(Object.keys(D.glossary).length + Object.keys(buildAdmContent().glossary).length, 51, 'glossary terms (studio + ADM)');
});

test('every building block is well formed', () => {
  for (const c of ids) {
    const b = D.cat[c];
    for (const f of ['l', 'need', 'an', 'wo']) assert.ok(typeof b[f] === 'string' && b[f].length > 0, c + '.' + f);
    assert.ok(['exp', 'edge', 'app', 'data', 'x'].includes(b.layer), c + ' layer');
    assert.ok(b.o.length >= 2, c + ' offers at least two options');
    const names = b.o.map(o => o.n);
    assert.equal(new Set(names).size, names.length, c + ' option names are unique');
  }
});

test('every product option is well formed', () => {
  for (const { c, o } of options) {
    const where = c + ': ' + o.n;
    assert.ok(['OSS', 'Proprietary'].includes(o.k), where + ' kind');
    assert.ok(typeof o.w === 'string' && o.w.length > 10, where + ' rationale');
    assert.match(o.u, /^https:\/\//, where + ' link is https');
    assert.equal(o.s.length, 5, where + ' has five scores');
    for (const v of o.s) assert.ok(Number.isInteger(v) && v >= 1 && v <= 5, where + ' scores are 1 to 5');
    assert.ok(Array.isArray(o.t), where + ' tags');
  }
});

test('reference models only use blocks that exist', () => {
  for (const [k, a] of Object.entries(D.apps)) {
    for (const c of a.c) assert.ok(D.cat[c], k + ' uses unknown block ' + c);
    for (const c of a.forced || []) assert.ok(D.cat[c], k + ' forces unknown block ' + c);
  }
  for (const c of D.nonCrit) assert.ok(D.cat[c], 'nonCrit lists unknown block ' + c);
});

test('incidents cite a public https source', () => {
  for (const [k, v] of Object.entries(D.incidents)) {
    assert.ok(v[0] && v[1], k + ' has a title and summary');
    assert.match(v[2], /^https:\/\//, k + ' source link');
  }
});

test('house style: no em dashes in user-facing catalogue text', () => {
  const text = JSON.stringify(D) + JSON.stringify(buildAdmContent());
  assert.ok(!text.includes('—'), 'found an em dash');
});
