import os, tempfile
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
import sys, re
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
    chev = lambda t: (pg.click('.as-chev:not([data-state="locked"]):has-text("%s")' % t), pg.wait_for_timeout(300))
    # Intermediate so every block is visible
    pg.click('button[aria-label="View options"]'); pg.click('[aria-label="Skill level"] button:has-text("Intermediate")'); pg.wait_for_timeout(200)
    pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(100)
    chev('Workload')
    sec = pg.locator('div:has(> h2:text("What these numbers mean for products"))')
    check(sec.count() == 1, 'workload fit section present')
    rows1 = sec.locator('span[style*="font-weight: 600; font-size: 14px"]').all_inner_texts()
    print('  default rows:', rows1)
    check('Algolia' in rows1 and 'Apache Kafka' in rows1, 'default ecom flags Algolia and Kafka')
    pg.screenshot(path=OUT + 'fit-workload-default.png', full_page=True)
    # Push the numbers: 500 actions, 20x peak, mostly writes
    for q, v in [('Actions per active user per day', '500'), ('Peak versus average', '20x'), ('Reads compared with writes', 'Mostly writes')]:
        pg.locator('div:has(> span:text("%s"))' % q).first.locator('xpath=..').locator('button:has-text("%s")' % v).first.click(); pg.wait_for_timeout(200)
    rows2 = sec.locator('span[style*="font-weight: 600; font-size: 14px"]').all_inner_texts()
    print('  heavy rows:', rows2)
    check('PostgreSQL' in rows2 and 'RabbitMQ' in rows2 and 'Amazon API Gateway' in rows2, 'heavy workload flags Postgres, RabbitMQ, API Gateway')
    check('Apache Kafka' not in rows2, 'Kafka no longer flagged as overkill at high event rate')
    sec.screenshot(path=OUT + 'fit-workload-heavy.png')
    # Outcomes: card shows fitted scores
    chev('Outcomes')
    if pg.locator('button:has-text("Switch to free mode")').count(): pg.click('button:has-text("Switch to free mode")'); pg.wait_for_timeout(300)
    check(pg.locator('text=At your workload:').count() >= 1, 'outcome cards show workload notes')
    check(pg.locator('text=/Scale 4→2/').count() >= 1, 'outcome card shows adjusted score with arrow')
    pg.locator('text=At your workload:').first.scroll_into_view_if_needed(); pg.screenshot(path=OUT + 'fit-outcomes.png')
    chev('Compare')
    pg.locator('button:has-text("Show the working")').first.click(); pg.wait_for_timeout(200)
    check(pg.locator('text=WORKLOAD FIT').count() >= 1, 'compare working has workload fit row')
    heavy_scores = pg.eval_on_selector_all('main', 'e => e[0].innerText')
    # Back to light load: scores should differ
    chev('Workload')
    for q, v in [('Actions per active user per day', '10'), ('Peak versus average', '2x'), ('Reads compared with writes', '100 reads per write')]:
        pg.locator('div:has(> span:text("%s"))' % q).first.locator('xpath=..').locator('button:has-text("%s")' % v).first.click(); pg.wait_for_timeout(200)
    chev('Compare')
    light_scores = pg.eval_on_selector_all('main', 'e => e[0].innerText')
    nums = lambda t: re.findall(r'\b(\d{1,3})\s*/\s*100\b|\boverall\D{0,20}(\d{1,3})', t)
    check(heavy_scores != light_scores, 'compare changes with workload')
    # Walk every step at each level for errors
    for lvl in ['Beginner', 'Intermediate', 'Advanced']:
        pg.click('button[aria-label="View options"]'); pg.click('[aria-label="Skill level"] button:has-text("%s")' % lvl); pg.wait_for_timeout(150)
        pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(100)
        for l in pg.eval_on_selector_all('.as-chev:not([data-state="locked"]) .as-chev-l', 'e => e.map(x => x.textContent)'):
            chev(l)
    check(not errs, 'no page errors: %s' % errs[:3])
    b.close()
print('\n%d failures' % len(fails)); sys.exit(1 if fails else 0)
