import os, tempfile
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
import sys
from playwright.sync_api import sync_playwright
U = 'file://' + REPO + '/app/index.html'
OUT = tempfile.mkdtemp(prefix='archstudio-e2e-') + '/'
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
    labels = lambda: pg.eval_on_selector_all('.as-chev:not([data-state="locked"]) .as-chev-l', 'e => e.map(x => x.textContent)')
    subs = lambda: pg.eval_on_selector_all('.as-chev .as-chev-s', 'e => e.map(x => x.textContent)')
    full_n = len(labels())
    check(pg.locator('main [aria-label="Practice track"] button').count() == 3, 'three track cards on Start here')
    pg.screenshot(path=OUT + 'tracks-start.png')

    pg.click('main [aria-label="Practice track"] button:has-text("System design interview")'); pg.wait_for_timeout(400)
    L = labels()
    check(L == ['Start here', 'Brief', 'Workload', 'Blueprint', 'Drill'], 'interview journey: %s' % L)
    check(pg.locator('.as-chev[aria-current="step"]:has-text("Brief")').count() == 1, 'interview opens on Brief')
    check(any('About 10 min' in x for x in subs()), 'chevrons show minutes')
    check(pg.locator('text=spend the first minutes asking').count() >= 1, 'interview coach on Brief')
    pg.screenshot(path=OUT + 'tracks-interview.png')
    for l in L:
        pg.click('.as-chev:has-text("%s")' % l); pg.wait_for_timeout(300)
    check(pg.locator('.as-chev[aria-current="step"]:has-text("Drill")').count() == 1, 'drill reachable at Beginner in a track')
    pg.screenshot(path=OUT + 'tracks-drill-end.png', full_page=True)
    fin = pg.locator('text=Continue in the full journey').count()
    print('  finish card shown on last step:', fin > 0)

    # Locked chevron returns to the full journey
    pg.click('.as-chev[data-state="locked"]'); pg.wait_for_timeout(300)
    check(len(labels()) == full_n, 'locked chevron restores full journey')

    # Trade-off track in enterprise lens, then every level
    for lens in ['system', 'enterprise']:
        for lvl in ['Beginner', 'Intermediate', 'Advanced']:
            pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(120)
            pg.click('[aria-label="Skill level"] button:has-text("%s")' % lvl); pg.wait_for_timeout(120)
            if pg.locator('.as-pop').count() == 0: pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(120)
            for tr in ['Trade-off practice', 'System design interview', 'Full journey']:
                if pg.locator('.as-pop').count() == 0: pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(120)
                pg.click('.as-pop [aria-label="Practice track"] button:has-text("%s")' % tr); pg.wait_for_timeout(250)
                if lens == 'enterprise' and tr != 'System design interview' and pg.locator('.as-chev:has-text("Brief")').count():
                    pg.click('.as-chev:has-text("Brief")'); pg.wait_for_timeout(150)
                    pg.click('text=Enterprise portfolio first'); pg.wait_for_timeout(150)
                ls = labels()
                if tr == 'Trade-off practice':
                    exp = (['Start here'] if lvl == 'Beginner' else []) + ['Brief', 'Canvas', 'Outcomes', 'Compare']
                    check(ls == exp, 'tradeoff %s %s: %s' % (lens, lvl, ls))
                for l in ls:
                    pg.click('.as-chev:not([data-state="locked"]):has-text("%s")' % l); pg.wait_for_timeout(150)
    check(not errs, 'no page errors: %s' % errs[:3])
    pg.set_viewport_size({'width': 390, 'height': 844})
    pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(120)
    pg.click('[aria-label="Skill level"] button:has-text("Beginner")'); pg.wait_for_timeout(120)
    pg.click('.as-chev:has-text("Start here")'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT + 'tracks-phone.png')
    b.close()
print('\n%d failures' % len(fails)); sys.exit(1 if fails else 0)
