import os, tempfile
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
import json, sys, threading, http.server, functools
from playwright.sync_api import sync_playwright

ROOT = REPO
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8765/app/index.html'

fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: fails.append(msg)

BRIEF = {"title": "Agentic ITSM on ServiceNow", "understanding": "An IT service platform where agents triage incidents.", "base": "itsm",
         "components": ["web", "api", "auth", "db"], "settings": {"ai": "native"}, "request": "an employee raises an incident",
         "flows": [], "assumptions": ["Runs on ServiceNow"], "notCovered": [], "questions": ["How many tickets a day?"]}
BOARD = {"opening": "The board will test resilience.", "questions": [{"member": "Security office", "question": "How do you stop prompt injection reaching the runbook tool?", "why": "Agent safety", "focus": "runbooks"}]}
ANSWER = {"score": "partial", "feedback": "Reasonable but name the control.", "follow": "Which control?"}
seen = {'headers': None, 'calls': 0}

def anthropic(route):
    req = route.request
    seen['headers'] = req.headers; seen['calls'] += 1
    body = json.loads(req.post_data)
    prompt = body['messages'][0]['content']
    if '"ok": true' in prompt: out = {"ok": True}
    elif 'brief interpreter' in prompt: out = BRIEF
    elif '"opening"' in prompt: out = BOARD
    else: out = ANSWER
    route.fulfill(status=200, content_type='application/json',
                  headers={'access-control-allow-origin': '*'},
                  body=json.dumps({"content": [{"type": "text", "text": "```json\n" + json.dumps(out) + "\n```"}]}))

def bad_key(route):
    route.fulfill(status=401, content_type='application/json', headers={'access-control-allow-origin': '*'},
                  body=json.dumps({"error": {"type": "authentication_error", "message": "invalid x-api-key"}}))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.route('**/fonts.googleapis.com/**', lambda r: r.abort()); ctx.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    chev = lambda t: (pg.click('.as-chev:has-text("%s")' % t), pg.wait_for_timeout(300))

    # --- Brief without a model
    chev('Brief')
    check(pg.locator('text=Using keyword matching. Connect an AI model').count() == 1, 'standalone brief shows keyword line')
    # --- Bad key path
    pg.route('https://api.anthropic.com/**', bad_key)
    pg.click('button:has-text("Connect an AI model")'); pg.wait_for_timeout(200)
    check(pg.locator('section[aria-label="AI model settings"]').count() == 1, 'settings panel opens')
    pg.click('button:has-text("Connect and test")'); pg.wait_for_timeout(200)
    check(pg.locator('text=Paste an API key first.').count() == 1, 'empty key is caught')
    pg.fill('input[type=password]', 'sk-ant-test')
    pg.click('button:has-text("Connect and test")'); pg.wait_for_timeout(600)
    check(pg.locator('text=did not accept the API key').count() == 1, 'bad key message shown')
    pg.unroute('https://api.anthropic.com/**', bad_key)
    # --- Good key
    pg.route('https://api.anthropic.com/**', anthropic)
    pg.click('button:has-text("Connect and test")'); pg.wait_for_timeout(600)
    check(pg.locator('text=Connected to Anthropic').count() == 1, 'connect succeeds')
    h = seen['headers'] or {}
    check(h.get('x-api-key') == 'sk-ant-test' and h.get('anthropic-dangerous-direct-browser-access') == 'true', 'anthropic headers correct')
    stored = pg.evaluate("localStorage.getItem('archstudio.ai')")
    check('sk-ant-test' not in (stored or ''), 'key not stored when remember is off')
    # provider switch changes model default
    pg.click('button[aria-pressed]:has-text("OpenAI")'); pg.wait_for_timeout(150)
    check(pg.input_value('section[aria-label="AI model settings"] label:has-text("Model") input') == 'gpt-5-mini', 'provider switch sets default model')
    pg.click('button[aria-pressed]:has-text("Ollama")'); pg.wait_for_timeout(150)
    check(pg.locator('text=Ollama address').count() == 1 and pg.locator('input[type=password]').count() == 0, 'ollama shows address, no key')
    pg.click('button[aria-pressed]:has-text("Anthropic")'); pg.wait_for_timeout(150)
    pg.fill('input[type=password]', 'sk-ant-test')
    pg.click('section[aria-label="AI model settings"] button:has-text("Close")'); pg.wait_for_timeout(150)
    # --- Brief through the model
    pg.fill('#brief-input', 'Agentic ITSM for our ServiceNow estate'); pg.click('button.as-send'); pg.wait_for_timeout(900)
    check(pg.locator('text=Interpreted by Claude').count() >= 1, 'brief interpreted by BYO model')
    check(pg.locator('text=reads your brief and maps it').count() == 1, 'mode line shows connected model')

    # --- Portfolio save in browser storage
    pg.click('button:has-text("Portfolio")'); pg.wait_for_timeout(200)
    check(pg.locator('text=Designs are saved in this browser only').count() == 1, 'local portfolio note')
    pg.click('button:has-text("Save current design")'); pg.wait_for_timeout(300)
    check(pg.locator('text=in your portfolio.').count() >= 1, 'design saved locally')

    # --- AI board
    for lvl in ['Advanced', 'Expert', 'Practitioner']:
        if pg.locator('.as-chev:has-text("AI board")').count(): break
        pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(150)
        if pg.locator('[aria-label="Skill level"] button:has-text("%s")' % lvl).count():
            pg.click('[aria-label="Skill level"] button:has-text("%s")' % lvl); pg.wait_for_timeout(200)
        pg.keyboard.press('Escape'); pg.click('body', position={'x': 5, 'y': 400}); pg.wait_for_timeout(150)
    if pg.locator('.as-chev:has-text("AI board")').count():
        chev('AI board')
        check(pg.locator('text=Claude plays the board below').count() == 1, 'board names the connected model')
        pg.click('button:has-text("Convene the board")'); pg.wait_for_timeout(700)
        check(pg.locator('text=prompt injection').count() >= 1, 'board question rendered')
        ta = pg.locator('textarea[id^="board-a-"]').first
        ta.fill('We sandbox tool calls and require approval for write actions.')
        pg.click('button:has-text("Send"):visible >> nth=-1'); pg.wait_for_timeout(700)
        check(pg.locator('text=name the control').count() >= 1, 'board feedback rendered')
    else:
        check(False, 'AI board step reachable')

    # --- Reload: key forgotten, design kept
    pg.reload(); pg.wait_for_timeout(500)
    chev('Brief')
    check(pg.locator('text=Using keyword matching. Connect an AI model').count() == 1, 'key forgotten after reload when not remembered')
    pg.click('button:has-text("Portfolio")'); pg.wait_for_timeout(200)
    check(pg.locator('button:has-text("Open")').count() + pg.locator('button:has-text("Reload")').count() >= 1, 'saved design survives reload')
    # --- Remember on
    pg.click('button:has-text("Connect an AI model")'); pg.wait_for_timeout(150)
    pg.fill('input[type=password]', 'sk-ant-test'); pg.click('button[aria-label="Remember the key on this device"]')
    pg.click('button:has-text("Connect and test")'); pg.wait_for_timeout(600)
    pg.reload(); pg.wait_for_timeout(500); chev('Brief')
    check(pg.locator('text=reads your brief and maps it').count() == 1, 'remembered key reconnects after reload')
    pg.click('button[aria-label="View options"]'); pg.wait_for_timeout(150)
    check(pg.locator('text=Anthropic · claude-sonnet-5-5').count() == 1, 'menu shows model status')
    pg.click('.as-pop button:has-text("Change AI model")'); pg.wait_for_timeout(150)
    pg.click('button:has-text("Disconnect")'); pg.wait_for_timeout(150)
    check('sk-ant' not in (pg.evaluate("localStorage.getItem('archstudio.ai')") or ''), 'disconnect removes key')

    # --- Every step renders without errors
    pg.click('section[aria-label="AI model settings"] button:has-text("Close")')
    labels = pg.eval_on_selector_all('.as-chev .as-chev-l', 'els => els.map(e => e.textContent)')
    for l in labels:
        try: chev(l)
        except Exception as e: check(False, 'step %s clickable' % l)
    check(not errs, 'no page errors in standalone (%s)' % errs[:3])

    # --- Hosted in Claude: no BYO controls
    ctx2 = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx2.route('**/fonts.googleapis.com/**', lambda r: r.abort()); ctx2.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    ctx2.add_init_script("""window.claude = { use: async (n) => n === 'sample' ? { json: async () => ({}) } : null };""")
    pg2 = ctx2.new_page(); errs2 = []; pg2.on('pageerror', lambda e: errs2.append(str(e)))
    pg2.goto(URL); pg2.wait_for_timeout(500)
    pg2.click('.as-chev:has-text("Brief")'); pg2.wait_for_timeout(300)
    check(pg2.locator('text=It uses your Claude usage').count() == 1, 'hosted: Claude line')
    check(pg2.locator('button:has-text("Connect an AI model")').count() == 0, 'hosted: no BYO button')
    check(not errs2, 'no page errors hosted')
    b.close()

srv.shutdown()
print('\n%d failures' % len(fails)); sys.exit(1 if fails else 0)
