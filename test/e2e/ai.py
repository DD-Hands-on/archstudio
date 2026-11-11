"""AI in production in the browser: AI questions on Workload, the wait and real cost with working, rules that respond
to the answers, money on Compare, and the AI provider outage drill.
Usage: python3 test/e2e/ai.py"""
import os, sys, re, tempfile
from playwright.sync_api import sync_playwright

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
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
    go = lambda l: (pg.click('.as-chev:has-text("%s")' % l), pg.wait_for_timeout(300))
    txt = lambda: pg.inner_text('main')
    def level(l):
        pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(150)
        pg.click('[aria-label="Skill level"] button:has-text("%s")' % l); pg.wait_for_timeout(250)
        pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(150)
    def answer(label, opt):
        q = pg.locator('div:has(> span:text-is("%s"))' % label).first
        q.locator('button:text-is("%s")' % opt).click(); pg.wait_for_timeout(250)

    # --- Workload: AI questions, the wait and the spend
    go('Workload')
    t = txt()
    for q in ['Model tier for most calls', 'Calls routed to a small model', 'Length of a typical answer', 'Answers stream as they are written', 'Questions answered from a cache']:
        check(q in t, 'AI question: ' + q)
    check('Wait for an AI answer' in t and '0.8 s' in t, 'wait shows time to first token when streaming')
    check('AI model spend a month' in t and re.search(r'\$[0-9.,]+[kM]?', t) is not None, 'monthly AI spend in money')
    check('2,250 input tokens' in t, 'cost working shows the arithmetic')
    check('PLANNING PRICES' in t, 'prices are labelled as planning figures')
    check(pg.locator('button:has-text("Time to first token")').count() >= 1, 'time to first token is a glossary term')
    spend1 = re.search(r'AI model spend a month\s*\n?\s*(\$[0-9.,]+[kM]?)', t)

    answer('Answers stream as they are written', 'No')
    t = txt()
    check('Not streaming' in t and '0.8 s' not in t.split('Wait for an AI answer')[0][-40:], 'not streaming: the wait is the whole answer')
    answer('Calls routed to a small model', 'Most')
    spend2 = re.search(r'AI model spend a month\s*\n?\s*(\$[0-9.,]+[kM]?)', txt())
    check(spend1 and spend2 and spend1.group(1) != spend2.group(1), 'routing to a small model changes the spend (%s to %s)' % (spend1 and spend1.group(1), spend2 and spend2.group(1)))
    answer('Questions answered from a cache', 'Half')
    pg.screenshot(path=OUT + 'workload-ai.png', full_page=True)

    # --- Compare: money for the model, and rules that follow the answers
    go('Outcomes'); pg.click('button:has-text("Switch to free mode")'); pg.wait_for_timeout(300)
    go('Compare')
    t = txt()
    check('AI model spend' in t and 'planning prices' in t, 'Compare shows AI model spend in money')
    check('Users wait about' in t, 'latency over budget is flagged when not streaming')
    check('no semantic cache' in t, 'cache assumption without a semantic cache is flagged')
    for i in range(pg.locator('button:has-text("Show the working")').count()):
        pg.locator('button:has-text("Show the working")').first.click(); pg.wait_for_timeout(200)
    t = txt()
    check('AI MODEL SPEND' in t and 'left out here and costed in money' in t, 'working explains money versus the relative index (hosted model)')
    check('paid in GPU hours' in t, 'working explains GPU cost for a self-hosted model')
    check('nothing in the design routes them' not in t, 'routing not asked for while the gateway is hidden at this level')
    pg.screenshot(path=OUT + 'compare-ai.png', full_page=True)

    # --- Drill: AI provider outage
    level('Intermediate')
    go('Drill')
    pg.click('button:has-text("AI provider outage")'); pg.wait_for_timeout(300)
    t = txt()
    check('December 2024' in t and 'four hours' in t, 'provider outage drill tells the real incident')
    check(pg.locator('a[href*="status.openai.com"]').count() == 1, 'drill links to the postmortem')
    check('As of Nov 2026' in t, 'drill source is dated')
    check(pg.locator('button:has-text("Model retirement or change")').count() == 1, 'model drill renamed to retirement')

    # --- Without AI: no AI questions and no provider drill
    go('Brief'); pg.click('button:has-text("Adjust constraints")'); pg.wait_for_timeout(200)
    pg.click('button:text-is("No AI")'); pg.wait_for_timeout(300)
    go('Workload')
    check('Model tier for most calls' not in txt() and 'Wait for an AI answer' not in txt(), 'no AI questions without AI')
    go('Drill')
    check(pg.locator('button:has-text("AI provider outage")').count() == 0, 'provider drill not offered without AI')

    check(not errs, 'no page errors' + (': ' + errs[0] if errs else ''))
    b.close()
print('Screenshots in ' + OUT)
print('\n%d failures' % len(fails)); sys.exit(1 if fails else 0)
