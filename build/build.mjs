// Builds ArchStudio from src/ into single self-contained HTML files.
//   app/index.html            for GitHub Pages and local use (loads morphdom from app/vendor)
//   dist/archstudio-claude.html  for publishing inside Claude (no page skeleton; morphdom from a pinned CDN)
// Usage: npm run build        (or: node build/build.mjs --check to fail if the committed output is stale)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = p => join(root, 'src', p);
const read = p => readFileSync(p, 'utf8');
const body = p => { const t = read(p); return t.endsWith('\n') ? t.slice(0, -1) : t; };

const head = body(src('page/head.html'));
const css = body(src('page/styles.css'));
const tplDir = src('page/template');
const template = readdirSync(tplDir).filter(f => f.endsWith('.html')).sort().map(f => body(join(tplDir, f))).join('\n');
const runtime = body(src('runtime/dc-runtime.js')).split('\n').filter((l, i) => !(i < 2 && l.startsWith('//'))).join('\n');

const bundle = await build({
  entryPoints: [src('app/main.js')], bundle: true, write: false, format: 'iife', target: 'es2022',
  minify: false, legalComments: 'none', charset: 'utf8'
});
const js = bundle.outputFiles[0].text.trimEnd();

const page = morphdomTag => [head, '<style>', css, '</style>', '<div id="app"></div>', '<template id="tpl">', template, '</template>',
  morphdomTag, '<script>', runtime, '</script>', '<script>', js, '</script>'].join('\n');

const SKELETON = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
const outputs = {
  'app/index.html': SKELETON + '\n' + page('<script src="vendor/morphdom-umd.min.js"></script>') + '\n</body></html>\n',
  'dist/archstudio-claude.html': page('<script src="https://cdn.jsdelivr.net/npm/morphdom@2.7.4/dist/morphdom-umd.min.js"></script>') + '\n'
};

const check = process.argv.includes('--check');
let stale = [];
for (const [rel, html] of Object.entries(outputs)) {
  const p = join(root, rel);
  if (check) { if (!existsSync(p) || read(p) !== html) stale.push(rel); continue; }
  mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, html);
  console.log('built', rel, Math.round(html.length / 1024) + ' KB');
}
if (check) {
  if (stale.length) { console.error('Out of date, run npm run build: ' + stale.join(', ')); process.exit(1); }
  console.log('Build output is up to date.');
}
