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
    standards.js    Example pattern libraries, conformance checks, platform detection, team standards storage
    principles.js   Architecture principle checks
    gap.js          Baseline, gap analysis and transition architectures
    types.js        Shared JSDoc types (no runtime code)
    provenance.js   Reads src/data/provenance.json; "as of" labels for screens
    sovereignty.js  Where data and models may run: options, wording, reading it from a brief
    agentic.js      Agent questions for the Workload step and the rules for agentic designs
  data/
    provenance.json         Source, as-of date, reviewer and review date for every product, fit rule, incident and reference model
    provenance.schema.json  JSON Schema for it
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

Standards conformance, principle checks and gap analysis moved into the engine in Stage 2; `component.js` now only calls them and adds colours and wording for the screen. Engine files marked `// @ts-check` are type checked with `npm run typecheck` (TypeScript, no build step, JSDoc types in `src/engine/types.js`). The older engine files (catalogue, evaluate, fit-rules, workload, adm-content) are not yet marked.

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
npm run check     # fail if the built files are out of date, or provenance is missing, invalid or does not match the catalogue
npm run provenance  # the provenance check alone (add --strict to fail on entries past their review date)
npm run e2e       # all browser suites (needs: pip install playwright==1.63.0 && python3 -m playwright install chromium)
npm run typecheck # type check engine files marked // @ts-check
npm run fingerprint         # fail if any screen, score or rule result differs from the committed baseline
npm run fingerprint:update  # after an intended change: rewrite the baseline and commit it
```

Browser tests live in `test/e2e/` (Python Playwright): `standalone.py`, `tracks.py`, `workload_fit.py`, `board.py`, `saves.py`, `sovereignty.py` and `agentic.py`. CI runs them all, then compares the fingerprint (702 evaluations, 1,053 step screens and 840 rules cases across every example library, team standards and scenario) with `test/e2e/fingerprint-baseline.json`. The fingerprint covers the main step screens, not side panels such as Frameworks, Portfolio or AI settings.

**Saved designs** carry `schemaVersion` (now 2) and `appVersion`. Products are stored by name as well as position (`pickNames`, and `pn` on canvas nodes), because positions shift when the catalogue changes. Every save passes through `migrateDesign()` when loaded; anything no longer in the catalogue is cleared and the learner sees a note. When the save format changes, raise `SAVE_VERSION`, extend `migrateDesign()` and add a fixture to `test/fixtures/saves/`. Team standards (`team/standards`) are stored with product names too (`standardsForStore` and `standardsFromStore` in `standards.js`); a standard whose product has gone becomes "no standard" and the Canvas says so. See [HANDOFF.md](HANDOFF.md) for project state, settled rules and the backlog.

Edit files in `src/`, never the built files. To add a product, add an option to its building block in `src/engine/catalogue.js` (name, kind, rationale, https link, five scores from 1 to 5, tags); the catalogue tests check its shape. To add a workload rule, add a line to `FIT_RULES` with the threshold stated in its reason.

**Every catalogue entry is dated.** Products, workload-fit rules, the incidents behind drills and reference models each have an entry in `src/data/provenance.json`: `source` (an https link, or `curated` for a judgement whose reason states its basis), `asOf`, `reviewedBy` (`unreviewed` until a person checks it) and `reviewBy`. Adding, renaming or removing a catalogue entry without its provenance fails `npm run check`; a product's source must equal its catalogue link. Entries past `reviewBy` print a warning and show "review due" on screen. The October 2026 entries were backfilled from git history (the date each line last changed); none has been reviewed by a person yet.

**Agentic designs** (any design with the `agents` block) get six Workload questions (agents, the most an agent can do, code, run length, who owns the agents and tools, tool count) and five rules in `agentic.js`: agent identity, sandbox for code, durable execution for long runs, approval tiers for irreversible actions, and a shared protocol when agents cross teams or vendors. Each names the block that fixes it. Blocks the learner's level hides (`deferredComps()`) are not asked for until the level shows them. MCP and A2A are separate blocks (agent-to-tool, agent-to-agent), and fit rules make each a trade-off rather than a default.

**Changing a product list** (reordering, removing or replacing a product): add the block's v2.1 order to `V1_PRODUCT_ORDER` in `design-save.js`. Saves and team standards from v2.1 hold positions only, and are read against that order. A unit test compares every list with `test/fixtures/v2.1-product-order.json` and fails if you forget.

**Sovereignty** (`st.sov`: any, region, sovereign, onprem) is a design setting. Its fit rules in `fit-rules.js` use `*` (any block) with `#hosted` or `#saas` tags. Tags record how a product is listed, not whether a self-managed edition exists, so every reason asks the learner to check.

## How the split was verified

Before splitting, the original single file was fingerprinted across 702 evaluation combinations (13 models x 3 scales x 3 AI postures x 3 clouds x 2 workloads, each with three quick-fills) and 1,053 rendered screens (every step, both lenses, all three levels, every model). The rebuilt files match on all of them, and the browser test suites for standalone mode, practice tracks, workload fit and the review board pass unchanged.
