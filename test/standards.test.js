// Standards: example libraries follow written rules, conformance is measured honestly,
// and team standards survive changes to the product lists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogue } from '../src/engine/catalogue.js';
import { platformOf, noStandards, exampleStandards, checkDesign, standardsForStore, standardsFromStore } from '../src/engine/standards.js';

const cat = buildCatalogue().cat;
const empty = { comps: [], picks: {} };
const nameOf = (cid, i) => cat[cid].o[i].n;

test('platformOf reads the business platform from the picks', () => {
  assert.equal(platformOf({ itsm: 0 }, cat), 'servicenow');
  assert.equal(platformOf({ erpcore: 0 }, cat), 'sap');
  assert.equal(platformOf({ idp: 2 }, cat), 'microsoft');
  assert.equal(platformOf({ db: 0 }, cat), 'other');
  assert.equal(platformOf({ embai: 0, ux: 0 }, cat), 'other', 'platform-bound blocks do not decide the platform');
});

test('neutral default: no block has a standard', () => {
  const m = exampleStandards({ cat, lib: 'none', design: empty });
  assert.deepEqual(m, noStandards(cat));
  assert.ok(Object.values(m).every(s => s.i === -1 && s.status === 'none'));
});

test('a library lean decides first, then total score', () => {
  const oss = exampleStandards({ cat, lib: 'oss', design: empty });
  assert.equal(nameOf('erpcore', oss.erpcore.i), 'Odoo');
  assert.equal(nameOf('ux', oss.ux.i), 'Custom React portal');
  const aws = exampleStandards({ cat, lib: 'aws', design: empty });
  assert.equal(nameOf('db', aws.db.i), 'Amazon Aurora PostgreSQL');
});

test('ties on score break alphabetically', () => {
  // idp under the AWS library: no AWS product, Okta and Entra ID tie on total score
  const aws = exampleStandards({ cat, lib: 'aws', design: empty });
  assert.equal(nameOf('idp', aws.idp.i), 'Microsoft Entra ID');
});

test('core platforms follow a vendor named in the brief', () => {
  const m = exampleStandards({ cat, lib: 'oss', userText: 'We run SAP today', design: empty });
  assert.equal(nameOf('erpcore', m.erpcore.i), 'SAP S/4HANA Cloud, public edition');
});

test('AI and agent blocks stay under review', () => {
  const m = exampleStandards({ cat, lib: 'aws', design: empty });
  assert.equal(m.agents.status, 'review');
  assert.equal(m.db.status, 'approved');
});

test('embedded AI follows the platform the design uses', () => {
  const sn = exampleStandards({ cat, lib: 'oss', design: { comps: ['itsm'], picks: { itsm: 0 } } });
  assert.equal(nameOf('embai', sn.embai.i), 'ServiceNow Now Assist');
  const other = exampleStandards({ cat, lib: 'oss', design: empty });
  assert.deepEqual(other.embai, { i: -1, status: 'none' });
  const sapms = exampleStandards({ cat, lib: 'sapms', design: empty });
  assert.ok(sapms.embai.i >= 0, 'the SAP and Microsoft library always sets embedded AI');
});

test('checkDesign marks each block and measures conformance', () => {
  const std = { db: { i: 0, status: 'approved' }, idp: { i: 1, status: 'review' }, obs: { i: -1, status: 'none' } };
  const picks = { db: 1, idp: 0, obs: 0 };
  const r = checkDesign({ cat, std, comps: ['db', 'idp', 'obs', 'app', 'not-a-block'], pickOf: c => picks[c] });
  assert.deepEqual(r.checks.map(x => x.st), ['dev', 'review', 'free', 'open']);
  assert.equal(r.checks[0].t, 'Amazon Aurora PostgreSQL. The standard is PostgreSQL.');
  assert.equal(r.conf, 0);
  assert.equal(r.devN, 2);
  assert.equal(r.chosen, 3);
  const onStd = checkDesign({ cat, std, comps: ['db', 'idp'], pickOf: c => ({ db: 0, idp: 0 })[c] });
  assert.equal(onStd.conf, 50);
  assert.equal(checkDesign({ cat, std, comps: undefined, pickOf: () => null }).conf, null);
});

test('team standards are stored with product names', () => {
  const stored = standardsForStore({ db: { i: 1, status: 'approved' }, obs: { i: -1, status: 'none' } }, cat);
  assert.deepEqual(stored.db, { i: 1, status: 'approved', n: 'Amazon Aurora PostgreSQL' });
  assert.deepEqual(stored.obs, { i: -1, status: 'none' });
});

test('stored team standards survive a reordered product list', () => {
  const moved = JSON.parse(JSON.stringify(cat)); moved.db.o.reverse();
  const { std, lost } = standardsFromStore(standardsForStore({ db: { i: 0, status: 'approved' } }, cat), moved);
  assert.equal(moved.db.o[std.db.i].n, 'PostgreSQL');
  assert.deepEqual(lost, []);
});

test('a removed product clears that standard instead of swapping it', () => {
  const { std, lost } = standardsFromStore({ db: { i: 0, status: 'approved', n: 'Retired Database' }, gone: { i: 0, status: 'approved' } }, cat);
  assert.deepEqual(std.db, { i: -1, status: 'none' });
  assert.equal('gone' in std, false);
  assert.deepEqual(lost.sort(), ['db', 'gone']);
});

test('older team standards without names are read by position', () => {
  const { std, lost } = standardsFromStore({ db: { i: 1, status: 'approved' }, idp: { i: 9, status: 'approved' } }, cat);
  assert.deepEqual(std.db, { i: 1, status: 'approved' });
  assert.deepEqual(std.idp, { i: -1, status: 'none' });
  assert.deepEqual(lost, ['idp']);
  assert.deepEqual(std.obs, { i: -1, status: 'none' }, 'blocks with no stored entry have no standard');
});

test('older team standards for a changed list are read against the v2.1 order', () => {
  const { std, lost } = standardsFromStore({ tools: { i: 1, status: 'approved' }, db: { i: 1, status: 'approved' } }, cat);
  assert.deepEqual(std.tools, { i: -1, status: 'none' }, 'the A2A standard is cleared, not swapped');
  assert.deepEqual(lost, ['tools']);
  assert.equal(nameOf('db', std.db.i), 'Amazon Aurora PostgreSQL', 'unchanged lists still read by position');
  const mcp = standardsFromStore({ tools: { i: 2, status: 'approved' } }, cat).std.tools;
  assert.equal(nameOf('tools', mcp.i), 'OpenAPI tool adapters');
});
