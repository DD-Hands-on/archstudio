// The template renderer: escaping, the link guard, loops, conditions and event wiring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../src/runtime/dc-runtime.js', import.meta.url), 'utf8');
const ctx = { window: {}, document: {}, Promise, console };
vm.runInNewContext(code, ctx);
const R = ctx.window.DCRuntime;

// Minimal stand-ins for template DOM nodes
const text = v => ({ nodeType: 3, nodeValue: v });
const el = (tag, attrs = {}, kids = []) => ({ nodeType: 1, localName: tag, attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })), childNodes: kids, getAttribute: n => attrs[n] });
const render = (nodes, scope) => { R.takeHandlers(); return R.renderNodes(nodes, scope); };

test('text holes are escaped', () => {
  assert.equal(render([el('p', {}, [text('{{x}}')])], { x: '<img src=x onerror=alert(1)>' }), '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
});

test('attribute holes cannot break out of the attribute', () => {
  const html = render([el('span', { title: '{{x}}' })], { x: '" onmouseover="alert(1)' });
  assert.equal(html, '<span title="&quot; onmouseover=&quot;alert(1)"></span>');
});

test('links must be https, http, mailto or an in-page anchor', () => {
  const a = u => render([el('a', { href: '{{u}}' })], { u });
  assert.equal(a('https://example.com'), '<a href="https://example.com"></a>');
  assert.equal(a('mailto:a@b.c'), '<a href="mailto:a@b.c"></a>');
  assert.equal(a('#top'), '<a href="#top"></a>');
  for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x']) assert.equal(a(bad), '<a href="#"></a>', bad);
});

test('sc-for repeats and sc-if switches', () => {
  const tpl = [el('sc-for', { list: '{{items}}', as: 'it' }, [el('li', {}, [text('{{it.n}}')])]), el('sc-if', { value: '{{show}}' }, [el('b', {}, [text('yes')])])];
  assert.equal(render(tpl, { items: [{ n: 'a' }, { n: 'b' }], show: true }), '<li>a</li><li>b</li><b>yes</b>');
  assert.equal(render(tpl, { items: [], show: false }), '');
});

test('event attributes become handler references, never inline code', () => {
  const fn = () => 1;
  const html = render([el('button', { onclick: '{{go}}' }, [text('Go')])], { go: fn });
  assert.equal(html, '<button data-h-click="0">Go</button>');
  assert.ok(!html.includes('=>'));
});
