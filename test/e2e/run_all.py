"""Run every browser suite against the built app. Exits non-zero if any suite fails.
Usage: python3 test/e2e/run_all.py   (build first: npm run build)"""
import os, sys, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SUITES = ['standalone', 'tracks', 'workload_fit', 'board', 'saves']
failed = []
for s in SUITES:
    print('\n== %s' % s, flush=True)
    if subprocess.run([sys.executable, os.path.join(HERE, s + '.py')]).returncode != 0:
        failed.append(s)
print('\nBrowser suites: %d of %d passed%s' % (len(SUITES) - len(failed), len(SUITES), (', failed: ' + ', '.join(failed)) if failed else ''))
sys.exit(1 if failed else 0)
