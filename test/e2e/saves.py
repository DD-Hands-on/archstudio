"""Saved designs in the browser: old saves open, removed products are reported, new saves carry a version.
Usage: python3 test/e2e/saves.py"""
import os, sys, json, threading, http.server, functools
from playwright.sync_api import sync_playwright

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FIX = os.path.join(REPO, 'test', 'fixtures', 'saves')
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=REPO)
http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8766), Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8766/app/index.html'
KEY = 'archstudio.store.v1'

fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

def fx(name, **over):
    d = json.load(open(os.path.join(FIX, name))); d.update(ownerId='local'); d.update(over); return d

store = {'portfolio': {
    'old': fx('v2.1-save.json', title='Old good save', savedAt='2026-10-28T10:00:00.000Z'),
    'gone': fx('v2.1-removed-product.json', title='Old save with a gap', savedAt='2026-10-27T10:00:00.000Z'),
}, 'docs': {}}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort()); ctx.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    ctx.add_init_script('if (!localStorage.getItem(%s)) localStorage.setItem(%s, %s);' % (json.dumps(KEY), json.dumps(KEY), json.dumps(json.dumps(store))))
    pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    port = lambda: (pg.click('button:has-text("Portfolio")'), pg.wait_for_timeout(200))
    card = lambda t: pg.locator('div:has(> span:text-is("%s"))' % t)

    # --- Both old saves are listed
    port()
    check(card('Old good save').count() == 1 and card('Old save with a gap').count() == 1, 'v2.1 saves listed')

    stored = lambda: json.loads(pg.evaluate('localStorage.getItem(%s)' % json.dumps(KEY)))['portfolio']
    save = lambda: (pg.click('button:has-text("Save changes"), button:has-text("Save current design")'), pg.wait_for_timeout(300))

    # --- A clean old save opens with no note, and re-saves with version and product names
    card('Old good save').locator('button:has-text("Open")').click(); pg.wait_for_timeout(300)
    check(pg.locator('text=no longer in the catalogue').count() == 0, 'clean save opens without a note')
    port(); save()
    good = stored()['old']
    check(good.get('schemaVersion') == 2, 'save records schemaVersion 2')
    check(good.get('appVersion') == json.load(open(os.path.join(REPO, 'package.json')))['version'], 'save records appVersion')
    check(good.get('pickNames', {}).get('ui') == 'Angular', 'save records product names')
    check([n.get('pn') for n in good['canvas']['nodes']] == ['Angular', None], 'canvas nodes record product names')

    # --- A save with removed products opens and says so
    card('Old save with a gap').locator('button:has-text("Open")').click(); pg.wait_for_timeout(300)
    check(pg.locator('text=3 products in this save are no longer in the catalogue').count() == 1, 'removed products reported')
    check(pg.locator('text=2 components in this save are no longer in the catalogue').count() == 1, 'removed components reported')
    save()
    check('retired-block' not in stored()['gone'].get('comps', []), 'removed component not written back')

    # --- Both re-saved designs open cleanly after reload
    pg.reload(); pg.wait_for_timeout(500); port()
    btns = pg.locator('button:has-text("Open"), button:has-text("Reload")')
    check(btns.count() == 2, 'two designs listed after reload')
    for i in range(btns.count()):
        port() if i else None
        pg.locator('button:has-text("Open"), button:has-text("Reload")').nth(i).click(); pg.wait_for_timeout(300)
        check(pg.locator('text=no longer in the catalogue').count() == 0, 're-saved design %d opens without a note' % (i + 1))

    check(not errs, 'no page errors' + (': ' + errs[0] if errs else ''))
    b.close()
print('\n%d failures' % len(fails)); sys.exit(1 if fails else 0)
