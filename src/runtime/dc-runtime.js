// Mini runtime: renders <template id="tpl"> with {{holes}}, <sc-for> and <sc-if>, diffs with morphdom and dispatches events.
// Loaded as a classic script before the app bundle; it defines window.DCLogic and window.__dcBoot.
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; }
    setState(patch, cb) {
      const p = typeof patch === 'function' ? patch(this.state, this.props) : patch;
      this.state = Object.assign({}, this.state, p || {});
      schedule();
      if (typeof cb === 'function') cb();
    }
    forceUpdate() { schedule(); }
  }
  window.DCLogic = DCLogic;

  const VOID = { input: 1, br: 1, img: 1, meta: 1, link: 1, hr: 1, source: 1, wbr: 1 };
  const EVENTS = { onclick: 'click', onchange: 'input', oninput: 'input', onkeydown: 'keydown' };
  const escT = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escA = s => escT(s).replace(/"/g, '&quot;');
  let handlers = [];

  function lookup(expr, scope) {
    const e = expr.trim();
    if (e === 'true') return true;
    if (e === 'false') return false;
    if (e === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(e)) return Number(e);
    let v = scope;
    for (const part of e.split('.')) { if (v == null) return undefined; v = v[part]; }
    return v;
  }
  const interp = (str, scope) => str.replace(/\{\{([^}]+)\}\}/g, (_, x) => { const v = lookup(x, scope); return v == null ? '' : String(v); });
  const whole = str => { const mm = /^\s*\{\{([^}]+)\}\}\s*$/.exec(str); return mm ? mm[1] : null; };

  function renderNodes(nodes, scope) { let h = ''; for (const n of nodes) h += renderNode(n, scope); return h; }
  function renderNode(n, scope) {
    if (n.nodeType === 3) return escT(interp(n.nodeValue, scope));
    if (n.nodeType !== 1) return '';
    const tag = n.localName;
    const kids = n.content ? Array.from(n.content.childNodes) : Array.from(n.childNodes);
    if (tag === 'sc-for') {
      const list = lookup(whole(n.getAttribute('list')) || '', scope) || [];
      const as = n.getAttribute('as') || 'item';
      let h = '';
      list.forEach((it, i) => { const s2 = Object.create(scope); s2[as] = it; s2.$index = i; h += renderNodes(kids, s2); });
      return h;
    }
    if (tag === 'sc-if') { return lookup(whole(n.getAttribute('value')) || 'false', scope) ? renderNodes(kids, scope) : ''; }
    if (tag === 'helmet') return '';
    let attrs = ''; let textareaValue = null;
    for (const a of Array.from(n.attributes)) {
      const name = a.name; const low = name.toLowerCase();
      if (low.indexOf('hint-') === 0) continue;
      if (EVENTS[low]) {
        const w = whole(a.value); const fn = w ? lookup(w, scope) : null;
        if (typeof fn === 'function') { handlers.push(fn); attrs += ' data-h-' + EVENTS[low] + '="' + (handlers.length - 1) + '"'; }
        continue;
      }
      const raw = interp(a.value, scope);
      const val = (low === 'href' || low === 'src') && raw && !/^(https?:|mailto:|#)/i.test(raw.trim()) ? '#' : raw;
      if (tag === 'textarea' && low === 'value') { textareaValue = val; continue; }
      if ((low === 'marker-start' || low === 'marker-end') && !val) continue;
      attrs += ' ' + name + '="' + escA(val) + '"';
    }
    if (VOID[tag]) return '<' + tag + attrs + '>';
    const inner = tag === 'textarea' ? escT(textareaValue || '') : renderNodes(kids, scope);
    return '<' + tag + attrs + '>' + inner + '</' + tag + '>';
  }

  let comp, root, tplNodes, pending = false, mounted = false;
  function schedule() { if (pending) return; pending = true; Promise.resolve().then(render); }
  function render() {
    pending = false;
    handlers = [];
    let vals;
    try { vals = comp.renderVals(); } catch (e) { console.error(e); return; }
    const html = '<div id="app">' + renderNodes(tplNodes, vals) + '</div>';
    if (window.morphdom) window.morphdom(root, html, {
      onBeforeElUpdated: (from, to) => {
        if (from === document.activeElement && from.localName === 'textarea' && from.value !== to.textContent) { from.value = to.textContent; }
        return true;
      }
    });
    else root.innerHTML = html.slice('<div id="app">'.length, -6);
    if (!mounted) { mounted = true; if (typeof comp.componentDidMount === 'function') comp.componentDidMount(); }
  }
  function dispatch(type, ev) {
    let el = ev.target;
    while (el && el !== root) {
      if (el.getAttribute && el.hasAttribute('data-h-' + type)) {
        const fn = handlers[Number(el.getAttribute('data-h-' + type))];
        if (fn) fn(ev);
        return;
      }
      el = el.parentNode;
    }
  }
  // Exposed for unit tests (test/runtime.test.js); the app does not use it.
  window.DCRuntime = { escT, escA, renderNodes, takeHandlers: () => handlers.splice(0) };
  window.__dcBoot = function (Component) {
    root = document.getElementById('app');
    tplNodes = Array.from(document.getElementById('tpl').content.childNodes);
    comp = new Component({});
    ['click', 'input', 'keydown'].forEach(t => root.addEventListener(t, ev => dispatch(t, ev)));
    render();
  };
})();
