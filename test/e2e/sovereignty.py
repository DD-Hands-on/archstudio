"""Sovereignty and dated content in the browser: the setting changes product fit with reasons, dates show on
products, fit notes and drills, the regulation drill teaches the amended dates, and saves keep the setting.
Usage: python3 test/e2e/sovereignty.py"""
import os, sys, json, tempfile
from playwright.sync_api import sync_playwright

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
U = 'file://' + REPO + '/app/index.html'
OUT = tempfile.mkdtemp(prefix='archstudio-e2e-') + '/'
KEY = 'archstudio.store.v1'
fails = []
def check(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    pg.route('**/fonts.g*/**', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(U); pg.wait_for_timeout(500)
    go = lambda l: (pg.click('.as-chev:has-text("%s")' % l), pg.wait_for_timeout(300))
    txt = lambda: pg.inner_text('main')

    # --- Brief: the option exists, defaults to Anywhere, and can be set
    go('Brief')
    check('Data and models' in txt() and 'Anywhere' in txt(), 'brief summary shows Data and models: Anywhere')
    pg.click('button:has-text("Adjust constraints")'); pg.wait_for_timeout(300)
    grp = pg.locator('text=Where data and models may run')
    check(grp.count() == 1, 'sovereignty option on the Brief')
    for l in ['Anywhere', 'In our region', 'Sovereign cloud', 'On premises']:
        check(pg.locator('button:has-text("%s")' % l).count() >= 1, 'option: ' + l)
    check(pg.locator('button[aria-pressed="true"]:text-is("Anywhere")').count() == 1, 'Anywhere is the default and marked selected')

    # --- Workload before: no sovereignty notes
    go('Workload')
    check('does not run in your own data centre' not in txt(), 'no sovereignty notes by default')

    # --- On premises: hosted products get a stated reason and a dated rule
    go('Brief'); pg.click('button:has-text("On premises")'); pg.wait_for_timeout(300)
    check(pg.locator('button[aria-pressed="true"]:text-is("On premises")').count() == 1, 'On premises marked selected')
    go('Workload')
    t = txt()
    check('does not run in your own data centre as listed' in t, 'on premises: hosted products flagged with a reason')
    check('Check whether a self-managed edition exists' in t, 'reason asks the learner to check')
    check('Rule as of Nov 2026' in t, 'sovereignty rule shows its date')
    check('Rule as of Oct 2026' in t or 'Rule as of' in t, 'fit rules show a date')
    pg.screenshot(path=OUT + 'workload-onprem.png', full_page=True)

    # --- Outcomes: products show their as-of date
    go('Outcomes'); pg.click('button:has-text("Switch to free mode")'); pg.wait_for_timeout(300)
    check(pg.locator('text=As of Oct 2026').count() > 5, 'products show an as-of date')

    # --- Drill: the regulation drill teaches the amended dates, with its date
    pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(200)
    pg.click('[aria-label="Skill level"] button:has-text("Advanced")'); pg.wait_for_timeout(300)
    pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(200)
    go('Drill')
    pg.click('button:has-text("New regulation reaches your AI and data")'); pg.wait_for_timeout(300)
    t = txt()
    check('2 December 2027' in t and '2 August 2028' in t, 'regulation drill shows the amended high-risk dates')
    check('2026/1744' in t, 'regulation drill names the amending regulation')
    check('As of Nov 2026' in t, 'regulation drill shows its as-of date')
    check(pg.locator('a[href*="OJ:L_202601744"]').count() == 1, 'regulation drill links to the Official Journal')
    pg.screenshot(path=OUT + 'drill-regulation.png', full_page=True)

    # --- Save keeps the setting; opening an older save resets it to Anywhere
    pg.click('button:has-text("Portfolio")'); pg.wait_for_timeout(200)
    pg.click('button:has-text("Save current design")'); pg.wait_for_timeout(300)
    store = json.loads(pg.evaluate('localStorage.getItem(%s)' % json.dumps(KEY)))
    saved = list(store['portfolio'].values())[0]
    check(saved['settings'].get('sov') == 'onprem', 'save records sovereignty')

    old = json.load(open(os.path.join(REPO, 'test', 'fixtures', 'saves', 'v2.1-save.json'))); old.update(ownerId='local', title='Old save')
    store['portfolio']['old'] = old
    pg.evaluate('localStorage.setItem(%s, %s)' % (json.dumps(KEY), json.dumps(json.dumps(store))))
    pg.reload(); pg.wait_for_timeout(500)
    pg.click('button:has-text("Portfolio")'); pg.wait_for_timeout(200)
    pg.locator('div:has(> span:text-is("Old save"))').locator('button:has-text("Open")').click(); pg.wait_for_timeout(300)
    go('Workload')
    check('does not run in your own data centre' not in txt(), 'older save opens with Anywhere')

    check(not errs, 'no page errors' + (': ' + errs[0] if errs else ''))
    b.close()
print('Screenshots in ' + OUT)
print('\n%d failures' % len(fails)); sys.exit(1 if fails else 0)
