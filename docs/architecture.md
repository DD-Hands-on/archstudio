# How ArchStudio Dojo is built

ArchStudio Dojo ships as one self-contained HTML file, so anyone can open it with nothing to install. The source is split into modules so it can be reviewed, tested and extended. A small build step puts the pieces back together.

```
src/
  engine/        Rules and data. No screens, no browser APIs. Unit tested.
    catalogue.js    Building blocks, product options and scores, reference models, glossary, quizzes, incidents
    adm-content.js  TOGAF ADM principles, scenarios and change examples
    workload.js     First-principles sizing: requests per second, reads and writes, storage, tokens
    fit-rules.js    44 rules of thumb that adjust product scores at the workload numbers
    evaluate.js     Scores an outcome: issues, availability chain, cost index, overall score
    design-save.js  Saved-design format version and migration, so older saves keep opening
    format.js       Number formatting
  app/           The app itself
    component.js    State, step logic and the view model the template renders
    tracks.js       Practice tracks
    board-roles.js  The AI review board's specialists
    main.js         Entry point
  standalone/    What makes the app work outside Claude
    local-store.js  Saves designs in the browser
    ai-providers.js Connects your own model (Anthropic, OpenAI, Gemini or Ollama)
  runtime/
    dc-runtime.js   A small template renderer: {{holes}}, <sc-for>, <sc-if>, escaping and a link guard
  page/
    head.html, styles.css
    template/       The screens, one file per step, joined in file-name order
build/build.mjs  Bundles src/ with esbuild and writes the single files
test/            Unit tests (node --test)
```

## The rule that matters

**The engine decides, the screens display.** Anything that produces a number, a score or an issue lives in `src/engine` as a plain function with its inputs passed in. That keeps the working visible, testable and repeatable, and it is the base for any future agents: they read the engine's results rather than computing their own.

Some logic still lives in `app/component.js` (standards conformance, principle checks, gap analysis). Moving it into the engine is the next refactoring step.

## Build outputs

| File | Use |
|---|---|
| `app/index.html` | GitHub Pages and local use. Loads morphdom from `app/vendor/`. |
| `dist/archstudio-claude.html` | Publishing inside Claude. No page skeleton; morphdom from a pinned CDN version. |

Both are committed, so the app works straight from the repository.

## Working on it

```
npm install
npm test          # unit tests for the engine, catalogue and renderer
npm run build     # rebuild app/index.html and dist/
npm run check     # fail if the built files are out of date
npm run e2e       # all browser suites (needs: pip install playwright==1.63.0 && python3 -m playwright install chromium)
npm run fingerprint         # fail if any screen or score differs from the committed baseline
npm run fingerprint:update  # after an intended change: rewrite the baseline and commit it
```

Browser tests live in `test/e2e/` (Python Playwright): `standalone.py`, `tracks.py`, `workload_fit.py`, `board.py` and `saves.py`. CI runs them all, then compares the fingerprint (702 evaluations and 1,053 step screens) with `test/e2e/fingerprint-baseline.json`. The fingerprint covers the main step screens, not side panels such as Frameworks, Portfolio or AI settings.

**Saved designs** carry `schemaVersion` (now 2) and `appVersion`. Products are stored by name as well as position (`pickNames`, and `pn` on canvas nodes), because positions shift when the catalogue changes. Every save passes through `migrateDesign()` when loaded; anything no longer in the catalogue is cleared and the learner sees a note. When the save format changes, raise `SAVE_VERSION`, extend `migrateDesign()` and add a fixture to `test/fixtures/saves/`. Team standards are still stored by position; fix that before changing product lists. See [HANDOFF.md](HANDOFF.md) for project state, settled rules and the backlog.

Edit files in `src/`, never the built files. To add a product, add an option to its building block in `src/engine/catalogue.js` (name, kind, rationale, https link, five scores from 1 to 5, tags); the catalogue tests check its shape. To add a workload rule, add a line to `FIT_RULES` with the threshold stated in its reason.

## How the split was verified

Before splitting, the original single file was fingerprinted across 702 evaluation combinations (13 models x 3 scales x 3 AI postures x 3 clouds x 2 workloads, each with three quick-fills) and 1,053 rendered screens (every step, both lenses, all three levels, every model). The rebuilt files match on all of them, and the browser test suites for standalone mode, practice tracks, workload fit and the review board pass unchanged.
