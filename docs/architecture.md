# How ArchStudio is built

ArchStudio ships as one self-contained HTML file, so anyone can open it with nothing to install. The source is split into modules so it can be reviewed, tested and extended. A small build step puts the pieces back together.

```
src/
  engine/        Rules and data. No screens, no browser APIs. Unit tested.
    catalogue.js    Building blocks, product options and scores, reference models, glossary, quizzes, incidents
    adm-content.js  TOGAF ADM principles, scenarios and change examples
    workload.js     First-principles sizing: requests per second, reads and writes, storage, tokens
    fit-rules.js    44 rules of thumb that adjust product scores at the workload numbers
    evaluate.js     Scores an outcome: issues, availability chain, cost index, overall score
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
```

Edit files in `src/`, never the built files. To add a product, add an option to its building block in `src/engine/catalogue.js` (name, kind, rationale, https link, five scores from 1 to 5, tags); the catalogue tests check its shape. To add a workload rule, add a line to `FIT_RULES` with the threshold stated in its reason.

## How the split was verified

Before splitting, the original single file was fingerprinted across 702 evaluation combinations (13 models x 3 scales x 3 AI postures x 3 clouds x 2 workloads, each with three quick-fills) and 1,053 rendered screens (every step, both lenses, all three levels, every model). The rebuilt files match on all of them, and the browser test suites for standalone mode, practice tracks, workload fit and the review board pass unchanged.
