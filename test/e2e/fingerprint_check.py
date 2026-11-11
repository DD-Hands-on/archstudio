"""Compare the built app's behaviour fingerprint with the committed baseline.

  python3 test/e2e/fingerprint_check.py            check app/index.html against the baseline
  python3 test/e2e/fingerprint_check.py --update   rewrite the baseline after an intended change

Fails, listing what changed, when any evaluation, view value or rendered screen differs."""
import os, sys, json, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
BASELINE = os.path.join(HERE, 'fingerprint-baseline.json')
BUILT = os.path.join(REPO, 'app', 'index.html')
SHOW = 15

def capture(out):
    subprocess.run([sys.executable, os.path.join(HERE, 'fingerprint.py'), BUILT, out], check=True)
    return json.load(open(out))

update = '--update' in sys.argv
out = BASELINE if update else os.path.join(tempfile.mkdtemp(prefix='archstudio-fp-'), 'current.json')
cur = capture(out)
if cur.get('errors'):
    print('FAIL page errors while fingerprinting:', cur['errors'][:3]); sys.exit(1)
if update:
    print('Baseline updated: %s. Commit it with the change that caused it.' % os.path.relpath(BASELINE, REPO)); sys.exit(0)
if not os.path.exists(BASELINE):
    print('FAIL no baseline. Run: npm run fingerprint:update'); sys.exit(1)

base = json.load(open(BASELINE))
changed = 0
for section, label in (('evals', 'evaluations'), ('vals', 'view values'), ('html', 'rendered screens'), ('samples', 'samples')):
    a, b = base.get(section, {}), cur.get(section, {})
    keys = sorted(set(a) | set(b))
    diff = [k for k in keys if a.get(k) != b.get(k)]
    if not diff:
        print('PASS %s: %d unchanged' % (label, len(keys))); continue
    changed += len(diff)
    print('FAIL %s: %d of %d changed' % (label, len(diff), len(keys)))
    for k in diff[:SHOW]:
        print('     ' + ('added   ' if k not in a else 'removed ' if k not in b else 'changed ') + k)
    if len(diff) > SHOW: print('     ... and %d more' % (len(diff) - SHOW))

if changed:
    print('\nScreens or scores changed. If that was intended, run `npm run fingerprint:update` and commit the baseline.')
    sys.exit(1)
print('\nFingerprint matches the baseline.')
