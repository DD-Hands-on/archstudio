import os, tempfile
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
import json, sys, re
from playwright.sync_api import sync_playwright
U = 'file://' + REPO + '/app/index.html'
OUT = tempfile.mkdtemp(prefix='archstudio-e2e-') + '/'
fails = []
def check(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

prompts = []
verdict_kind = {'v': 'conditional'}
def model(route):
    body = json.loads(route.request.post_data); pr = body['messages'][0]['content']; prompts.append(pr)
    if '"ok": true' in pr: out = {"ok": True}
    elif 'BOARD TRANSCRIPT' in pr:
        out = {"decision": verdict_kind['v'], "summary": "Sound core, cost risk.", "conditions": ["Move search off per-request pricing", "Add a write-rate alert"] if verdict_kind['v'] != 'approve' else [], "strengths": ["Clear layering"], "risks": ["Search cost"], "learn": "Practise cost modelling."}
    elif '"opening"' in pr:
        out = {"opening": "We will test four lenses.", "questions": [
            {"member": "SRE lead", "question": "What happens when the cache fails at 23k requests/s?", "why": "Resilience", "focus": "cache"},
            {"member": "CISO", "question": "Where is card data stored?", "why": "PCI scope", "focus": "db"},
            {"member": "FinOps lead", "question": "What does Algolia cost at 2k reads/s?", "why": "Run cost", "focus": "search"},
            {"member": "Enterprise architect", "question": "Which standard does Kong deviate from?", "why": "Standards", "focus": "gw"}]}
    else:
        a = re.search(r'The architect answered: (.*)', pr).group(1)
        out = {"score": "strong", "feedback": "Good, evidence given.", "follow": "unused"} if 'STRONG' in a else {"score": "partial", "feedback": "Name the trade-off.", "follow": "Which number drives that?"}
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'},
                  body=json.dumps({"content": [{"type": "text", "text": json.dumps(out)}]}))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}); ctx.route('**/fonts.g*/**', lambda r: r.abort())
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('https://api.anthropic.com/**', model)
    pg.goto(U); pg.wait_for_timeout(400)
    chev = lambda t: (pg.click('.as-chev:not([data-state="locked"]):has-text("%s")' % t), pg.wait_for_timeout(300))
    pg.click('button[aria-label="View options"]'); pg.click('[aria-label="Skill level"] button:has-text("Advanced")'); pg.wait_for_timeout(150)
    pg.click('.as-pop button:has-text("Connect an AI model")'); pg.wait_for_timeout(150)
    pg.fill('input[type=password]', 'sk-ant-test'); pg.click('button:has-text("Connect and test")'); pg.wait_for_timeout(500)
    pg.click('section[aria-label="AI model settings"] button:has-text("Close")')
    # Review before the board: locked
    chev('Review')
    check(pg.locator('text=Not yet given').count() == 1, 'contract shows no board decision yet')
    check(pg.locator('#step-action:has-text("Go to the AI board")').count() == 1, 'sign button locked')
    pg.click('#step-action'); pg.wait_for_timeout(300)
    check(pg.locator('.as-chev[aria-current="step"]:has-text("AI board")').count() == 1, 'locked button goes to the board')
    # Board panel
    panel = pg.locator('[aria-label="The board"] [role=listitem] > span:first-child').all_inner_texts()
    check(panel[:4] == ['SRE lead', 'CISO', 'FinOps lead', 'Enterprise architect'], 'panel shows four specialists: %s' % panel)
    pg.click('button:has-text("Convene the board")'); pg.wait_for_timeout(600)
    cp = [x for x in prompts if '"opening"' in x][-1]
    check('FinOps lead (Cost at your numbers)' in cp and 'WORKLOAD (from the Workload step)' in cp and 'WORKLOAD FIT FLAGS' in cp, 'convene prompt has roles, workload and fit flags')
    check(pg.locator('text=Question 3 · FinOps lead').count() == 1, 'questions attributed to roles')
    pg.screenshot(path=OUT + 'board-convened.png', full_page=True)
    # Q1: three rounds, all partial
    ta = lambda: pg.locator('#board-a-0')
    for rnd in range(3):
        check(ta().count() == 1, 'Q1 open for round %d' % (rnd + 1))
        if rnd == 1: check(pg.locator('text=round 2 of 3').count() == 1, 'round 2 label')
        if rnd == 2: check(pg.locator('text=Answer the final follow-up').count() == 1, 'final round label')
        ta().fill('We cache aggressively.'); ta().locator('xpath=../div/button').click(); pg.wait_for_timeout(500)
    check(ta().count() == 0, 'Q1 closed after three rounds')
    check('round 3 of at most 3' in prompts[-1] and 'final round' in prompts[-1], 'third prompt says final round')
    # Q2-4 strong
    for i in [1, 2, 3]:
        pg.locator('#board-a-%d' % i).fill('STRONG: we accept higher cost for 99.95%.'); pg.locator('#board-a-%d' % i).locator('xpath=../div/button').click(); pg.wait_for_timeout(450)
        check(pg.locator('#board-a-%d' % i).count() == 0, 'strong answer closes Q%d without follow-up' % (i + 1))
    pg.click('button:has-text("Ask the board for its decision")'); pg.wait_for_timeout(600)
    check(pg.locator('text=Approved with conditions').count() >= 1, 'conditional verdict shown')
    chev('Review')
    check(pg.locator('text=Approved with conditions (2 conditions)').count() == 1, 'contract shows board decision')
    check(pg.locator('text=Move search off per-request pricing').count() == 1, 'conditions carried into contract')
    pg.locator('text=Conditions carried into this contract').scroll_into_view_if_needed(); pg.screenshot(path=OUT + 'board-contract.png')
    pg.click('#step-action:has-text("Sign and submit for review")'); pg.wait_for_timeout(300)
    check(pg.locator('#step-action:has-text("Withdraw signature")').count() == 1, 'contract signs after approval')
    pg.click('#step-action'); pg.wait_for_timeout(200)
    # Reject path
    verdict_kind['v'] = 'reject'
    chev('AI board'); pg.click('button:has-text("Convene a new board")'); pg.wait_for_timeout(600)
    for i in range(4):
        pg.locator('#board-a-%d' % i).fill('STRONG answer'); pg.locator('#board-a-%d' % i).locator('xpath=../div/button').click(); pg.wait_for_timeout(400)
    pg.click('button:has-text("Ask the board for its decision")'); pg.wait_for_timeout(600)
    chev('Review')
    check(pg.locator('text=did not approve this design').count() == 1 and pg.locator('#step-action:has-text("Go to the AI board")').count() == 1, 'reject keeps contract locked')
    check(not errs, 'no page errors: %s' % errs[:3])

    # No model: signing allowed with honest note
    ctx2 = b.new_context(viewport={'width': 1440, 'height': 900}); ctx2.route('**/fonts.g*/**', lambda r: r.abort())
    pg2 = ctx2.new_page(); e2 = []; pg2.on('pageerror', lambda e: e2.append(str(e)))
    pg2.goto(U); pg2.wait_for_timeout(400)
    pg2.click('button[aria-label="View options"]'); pg2.click('[aria-label="Skill level"] button:has-text("Advanced")'); pg2.wait_for_timeout(150)
    pg2.click('button[aria-label="View options"]')
    pg2.click('.as-chev:has-text("Review")'); pg2.wait_for_timeout(300)
    check(pg2.locator('text=No AI board in this view').count() == 1 and pg2.locator('#step-action:has-text("Sign and submit for review")').count() == 1, 'no model: can sign, decision marked absent')
    check(not e2, 'no page errors without model')
    b.close()
print('\n%d failures' % len(fails)); sys.exit(1 if fails else 0)
