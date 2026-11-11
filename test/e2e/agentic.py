"""Agentic design in the browser: agent questions on Workload, controls on the Blueprint, rules that respond to the
answers and to the learner's level, the destructive-action drill, and agent terms in the glossary.
Usage: python3 test/e2e/agentic.py"""
import os, sys, tempfile
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

    # --- A design without agents: no agent questions
    go('Workload')
    check('The most an agent can do' not in txt(), 'no agent questions for a design without agents')

    # --- Multi-agent template
    go('Brief'); pg.click('button:has-text("Multi-agent research assistant")'); pg.wait_for_timeout(600)
    if pg.locator('button:text-is("Send")').is_enabled(): pg.click('button:text-is("Send")'); pg.wait_for_timeout(800)
    check('Multi-agent' in pg.inner_text('body'), 'brief maps to the multi-agent pattern')
    go('Workload')
    t = txt()
    for q in ['Agents in the design', 'The most an agent can do', 'Agents run code or commands', 'How long one run takes', 'Who owns the agents and tools', 'Tools the agents call']:
        check(q in t, 'agent question: ' + q)

    # --- Blueprint shows the controls the beginner level includes; the request path shows the agent token hop
    go('Blueprint')
    t = txt()
    check('Agent identity' in t and 'Approval tiers' in t, 'beginner blueprint shows agent identity and approval tiers')
    check('Sandboxed execution' not in t, 'beginner blueprint does not yet show the sandbox')
    check('short-lived token' in t, 'request path includes the agent identity hop')
    check(pg.locator('button:has-text("Agent identity")').count() >= 1, 'agent identity is a glossary term on the Blueprint')

    # --- Rules respond to the answers and to the level
    go('Workload'); answer('Agents run code or commands', 'Yes'); answer('The most an agent can do', 'Pay, delete or message outside')
    go('Outcomes'); pg.click('button:has-text("Switch to free mode")'); pg.wait_for_timeout(300)
    pg.click('button:text-is("Clear")'); pg.wait_for_timeout(300)
    go('Compare')
    t = txt()
    check('shared service account' in t, 'missing agent identity is flagged')
    check('sign off' in t, 'irreversible actions without approval are flagged')
    check('Run them in a sandbox' not in t, 'sandbox not asked for at beginner, where it is hidden')
    pg.screenshot(path=OUT + 'compare-beginner.png', full_page=True)
    level('Intermediate')
    go('Compare')
    check('Run them in a sandbox' in txt(), 'sandbox asked for once the level shows it')

    # --- Picking the controls clears the issues
    go('Outcomes')
    pg.click('button:has-text("Open source first")'); pg.wait_for_timeout(400)
    pg.click('button:has-text("Outcome 2")'); pg.wait_for_timeout(300)
    pg.click('button:has-text("Open source first")'); pg.wait_for_timeout(400)
    go('Compare')
    t = txt()
    check('shared service account' not in t and 'sign off' not in t and 'Run them in a sandbox' not in t, 'issues clear once controls are chosen')

    # --- Protocol trade-off shows on Workload
    go('Workload'); answer('Tools the agents call', '3')
    check('direct typed calls or a CLI may do the job' in txt(), 'MCP for a few tools in one team is a trade-off, with a reason')

    # --- Drill: an agent takes a destructive action
    go('Drill')
    pg.click('button:has-text("An agent takes a destructive action")'); pg.wait_for_timeout(300)
    t = txt()
    check('Replit' in t and 'code freeze' in t, 'destructive-action drill tells the real incident')
    check('As of Nov 2026' in t, 'drill source is dated')
    check(pg.locator('a[href*="theregister.com"]').count() == 1, 'drill links to its source')
    pg.screenshot(path=OUT + 'drill-agentact.png', full_page=True)

    # --- The drill is offered only to agentic designs
    go('Brief')
    if pg.locator('button:has-text("Browse templates")').count(): pg.click('button:has-text("Browse templates")'); pg.wait_for_timeout(200)
    pg.click('button:has-text("E-commerce marketplace")'); pg.wait_for_timeout(300)
    go('Drill')
    check(pg.locator('button:has-text("An agent takes a destructive action")').count() == 0, 'drill not offered without agents')

    check(not errs, 'no page errors' + (': ' + errs[0] if errs else ''))
    b.close()
print('Screenshots in ' + OUT)
print('\n%d failures' % len(fails)); sys.exit(1 if fails else 0)
