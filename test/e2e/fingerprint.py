"""Capture a fingerprint of app behaviour: evalOut, build picks, workload numbers,
renderVals (functions stripped) and rendered HTML, across a matrix of states.
Usage: python3 test/e2e/fingerprint.py <file.html> <out.json>"""
import os, tempfile
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

import sys, json
from playwright.sync_api import sync_playwright

src, out = os.path.abspath(sys.argv[1]), sys.argv[2]
HOOK = """
(() => {
  let boot;
  Object.defineProperty(window, '__dcBoot', { configurable: true,
    set(f) { boot = f; },
    get() { return C => { const orig = C.prototype.componentDidMount; C.prototype.componentDidMount = function () { window.__inst = this; return orig.apply(this, arguments); }; return boot(C); }; } });
  // deterministic clock and randomness
  const fixed = new Date('2026-10-28T00:00:00Z').getTime(); const D = Date;
  window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  let seed = 1; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
})();
"""
RUN = """
async () => {
  const I = window.__inst; const tick = () => new Promise(r => setTimeout(r, 0));
  const strip = v => JSON.stringify(v, (k, x) => typeof x === 'function' ? undefined : x);
  const h = s => { let a = 5381; for (let i = 0; i < s.length; i++) a = ((a << 5) + a + s.charCodeAt(i)) | 0; return (a >>> 0).toString(36) + ':' + s.length; };
  const res = { evals: {}, vals: {}, html: {}, samples: {} };
  const D = I.data(); const apps = Object.keys(D.apps);
  const base = JSON.parse(JSON.stringify(Object.assign({}, I.state, { portfolio: [], names: {} })));
  const reset = extra => { I.state = Object.assign(JSON.parse(JSON.stringify(base)), extra || {}); I._fitCache = null; };
  // 1. evaluation matrix
  for (const app of apps) for (const scale of ['10k', '1M', '50M']) for (const ai of ['none', 'enabled', 'native']) for (const cloud of ['aws', 'azure', 'multi'])
    for (const wl of [null, { actions: 500, peak: 20, ratio: '1:10', growth: 100000 }]) {
      reset({ app, scale, ai, cloud, reg: scale === '50M', field: ai === 'native' ? 'brown' : 'green', guided: false });
      if (wl) I.state.wl = { key: I.getApp().n, v: wl };
      const key = [app, scale, ai, cloud, wl ? 'heavy' : 'default'].join('|');
      const r = {};
      for (const kind of ['oss', 'managed', 'scale']) { const picks = I.build(kind); const e = I.evalOut({ picks }); r[kind] = { picks, overall: e.overall, avail: e.avail, cost: e.cost, avg: e.avg, issues: e.issues.map(i => i.cat + ':' + i.cid + ':' + i.text) }; }
      const wlAll = I.wlNums ? I.wlNums() : null; r.wl = wlAll ? ['users','impl','avgRps','peakRps','readRps','writeRps','events','store3','lat','cons','pattern','inflight','inst','tokensDay','key'].reduce((m, k) => (m[k] = wlAll[k], m), {}) : null;
      const s = strip(r); res.evals[key] = h(s);
      if (Object.keys(res.samples).length < 6) res.samples[key] = r;
    }
  // 2. view model and rendered HTML for every step
  const allApps = apps;
  for (const lens of ['system', 'enterprise']) for (const level of ['beginner', 'intermediate', 'advanced']) for (const app of allApps) {
    reset({ lens, level, app, guided: false });
    const steps = I.visibleSteps().map(s => s[0]);
    for (const step of steps) {
      reset({ lens, level, app, step, guided: false });
      const key = [lens, level, app, step].join('|');
      let v; try { v = strip(I.renderVals()); } catch (e) { v = 'ERR ' + e.message; }
      res.vals[key] = h(v);
      I.setState({}); await tick(); await tick();
      const canon = n => n.nodeType === 3 ? n.nodeValue : n.nodeType !== 1 ? '' : '<' + n.localName + Array.from(n.attributes).map(a => a.name + '=' + a.value).sort().map(x => ' ' + x).join('') + '>' + Array.from(n.childNodes).map(canon).join('') + '</' + n.localName + '>'; res.html[key] = h(canon(document.getElementById('app')));
    }
  }
  // 3. rules: standards libraries, team standards, conformance, principles, gap analysis and contract
  res.rules = {};
  const ad = I.admData(); const prinIds = ad.principles.map(p => p.id);
  const teamStd = {}; Object.keys(D.cat).forEach((c, i) => { teamStd[c] = { i: i % 4 === 3 ? -1 : (i % D.cat[c].o.length), status: i % 5 === 0 ? 'review' : i % 4 === 3 ? 'none' : 'approved' }; });
  const cases = [];
  for (const app of apps) for (const field of ['green', 'brown']) for (const ai of ['none', 'native']) cases.push({ app, field, ai, scenario: null, reg: ai === 'native' });
  for (const sc of ad.scenarios) cases.push({ app: sc.app, field: sc.set.field, ai: sc.set.ai || 'none', scenario: sc.id, reg: !!sc.set.reg });
  for (const cs of cases) for (const lib of ['none', 'sapms', 'aws', 'oss', 'team']) for (const kind of ['oss', 'managed', 'scale']) {
    reset({ app: cs.app, field: cs.field, ai: cs.ai, reg: cs.reg, scenario: cs.scenario, lens: 'enterprise', level: 'advanced', guided: false, stdLib: lib === 'team' ? 'none' : lib, std: lib === 'team' ? JSON.parse(JSON.stringify(teamStd)) : null,
      chat: cs.app === 'erp' ? [{ role: 'user', text: 'Our ERP runs on SAP and ServiceNow' }] : [] });
    const picks = I.build(kind); const comps = I.comps();
    I.state.canvas = { app: cs.app, nodes: comps.map((cid, i) => ({ id: 'n' + i, cid, x: 0, y: 0, p: picks[cid] != null ? picks[cid] : null })), edges: [] };
    const key = [cs.scenario || cs.app, cs.field, cs.ai, lib, kind].join('|');
    let v;
    try {
      const ds = I.designState(); const adm = I.admVals(() => () => {}, {});
      v = strip({ std: I.stdMap(), plat: I.platformOf(ds.picks), check: I.checkDesign(ds.comps, c => ds.picks[c]), libNone: I.libNone(),
        prin: prinIds.map(id => I.principleCheck(id, ds)), gap: adm.gap, contract: adm.contract.facts, devs: adm.contract.devs, board: I.boardContext ? I.boardContext() : null });
    } catch (e) { v = 'ERR ' + e.message; }
    res.rules[key] = h(v);
  }
  return res;
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 800})
    pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.route('https://cdn.jsdelivr.net/npm/morphdom@2.7.4/dist/morphdom-umd.min.js', lambda r: r.fulfill(path=REPO + '/app/vendor/morphdom-umd.min.js', content_type='application/javascript'))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(HOOK)
    pg.goto('file://' + src); pg.wait_for_timeout(800)
    res = pg.evaluate(RUN)
    res['errors'] = errs
    json.dump(res, open(out, 'w'), indent=0, sort_keys=True)
    print('evals', len(res['evals']), 'vals', len(res['vals']), 'html', len(res['html']), 'rules', len(res['rules']), 'errors', errs[:3])
    b.close()
