# ArchStudio Dojo: handoff for a new working session

Last updated 11 November 2026. Read this first, then `docs/architecture.md`. Together they replace the earlier conversation.

## What ArchStudio Dojo is

A practice studio for designing system and enterprise architectures, from a plain-language brief to a design defended at a review board. Built for aspiring architects. Owner: Divya Dubey (GitHub `DD-Hands-on/archstudio`).

- **Live in Claude:** artifact https://claude.ai/artifact/LmKbPeUoes71xpNkKZpAD4, published from `dist/archstudio-claude.html`. It uses three Claude capabilities (`sample`, `db`, `user`); keep them when republishing by not passing new ones.
- **Live on the web:** GitHub Pages serves `app/index.html` at https://dd-hands-on.github.io/archstudio/app/
- **Version:** v2.1.

## How to work on it

1. Edit `src/` only. Never edit `app/index.html` or `dist/` by hand.
2. `npm install`, `npm test` (60 unit tests), `npm run typecheck`, `npm run build`, `npm run check`.
3. `npm run e2e` runs the five browser suites (standalone, tracks, workload fit, board, saves; Python Playwright 1.63.0, Chromium).
4. `npm run fingerprint` compares 702 evaluations and 1,053 step screens with the committed baseline. After an intended screen or score change, run `npm run fingerprint:update` and commit the baseline in the same commit.
5. Commit, push to `main` (CI runs unit tests, the build check, all browser suites and the fingerprint), then republish the Claude artifact from `dist/archstudio-claude.html`.

## Rules that are settled

- **The engine decides, the screens display.** Anything that produces a number, score or issue is a plain function in `src/engine` with tests. AI never computes scores.
- **Show the working.** Every score, cost and availability figure can be expanded into its arithmetic and its reason.
- **Neutral by default.** No product is pre-selected and no vendor is preferred. Core platforms follow the vendor named in the brief. Example standards libraries are labelled and follow a written rule.
- **Learn mode:** AI challenges and explains; it does not design for the learner.
- **Must work in both places:** inside Claude and as a static page with no backend (browser storage, optional bring-your-own model).
- **Writing style:** lean copy, no em dashes, no "productivity" language, sentence case.
- Every change ends with passing tests, a push and a republished artifact.

## What exists (v2.1)

Journey with chevrons; two lenses (system first, enterprise portfolio first); three skill levels; three practice tracks (interview, trade-off, full); brief read by Claude or a connected model, with keyword fallback; first-principles Workload step; blueprint flowchart and layered view; canvas; outcomes and compare with visible working; 44 workload-fit rules that shift product scores; gap and roadmap; 10 drills tied to real incidents; AI review board with four specialists (SRE lead, CISO, FinOps lead, enterprise architect) plus the top stakeholder, up to three rounds, and an architecture contract locked until the board approves; portfolio and team mode. Catalogue: 50 blocks, 156 products (64 open source, 92 commercial), 13 reference models.

## Decisions taken, not yet built

### Multi-agent review board (agreed blueprint)
"Rules decide, agents reason, the learner decides."
1. Rules engine builds an **evidence pack** per specialist (SRE: availability chain, drills, load; CISO: STRIDE, regulated data, AI guardrails; FinOps: cost, workload-fit flags, tokens a day; enterprise architect: standards, deviations, gap, principles).
2. Four specialist agents run in parallel, one AI call each, each returning findings as claim, evidence cited, severity, confidence.
3. An **evidence check in code** drops any claim that cites evidence not in its pack.
4. A chair agent runs the rounds and gives the decision; the contract gate stays.
5. Keep a single-call "quick board" and show expected AI usage before convening.
- **Memory:** agents hold none. Working memory is the single call; the design session (with a change log) and learner history live in the portfolio; knowledge is the versioned catalogue. No vector database at this size.
- **Prerequisite (done in Stage 2):** standards checks, principle checks and gap analysis now live in `src/engine`.
- Rejected: a general orchestrator, event bus, long-term memory layer, and AI versions of validation or visualisation.

## Backlog from the expert review (11 Nov 2026), in priority order

**Functionality**
1. Agentic systems as a first-class design area: agent identity and least privilege, sandboxing, durable execution, approval tiers, MCP and A2A as choices with trade-offs.
2. AI production patterns: gateway with model routing and tiered fallbacks, semantic cache, time to first token and streaming, AI monitoring, golden-set evaluation, knowledge-graph block, an "AI provider outage" drill. Detail is in the Project doc `reference-system-design-llm-era-alignment.md`.
3. Real AI cost: cost per query and per user from tokens a day.
4. Regulation: the EU AI Act drill likely still teaches August 2026 for high-risk duties. A May 2026 provisional deal moves this to December 2027 (August 2028 for AI in products). Confirm final adoption, then update. Date-stamp regulatory content. Add a sovereignty option.
5. New steps: API contracts and data model.
6. Exports: C4 or Structurizr, ArchiMate exchange, decision records, fitness functions.
7. Platform engineering and supply-chain blocks.

**App architecture**
1. Split `component.js` per step (Stage 7). Done: rules moved into the engine and type checks added (Stage 2), save versioning (Stage 1). Still to type: catalogue, evaluate, fit-rules, workload, adm-content.
2. Done in Stage 1: browser tests and fingerprint run in CI.
2a. Done in Stage 2: team standards stored by product name.
2b. **Team mode has no screen.** Its view model (work in flight, pattern library, bench) is computed in `teamVals()` but no template renders it, since the first commit. Team standards can only come from stored data. Decide: build the screen or remove the code (ties to the product decision).
3. Catalogue as dated data: source, "as of" date and reviewer per entry.
4. Practise the AI patterns taught: versioned prompts, schema-checked replies, golden-set tests for the brief reader and board, a usage meter.
5. One engine, three shells: web app, command line, MCP server.
6. Decide: static learning tool or team product (accounts, shared storage, opt-in usage data).

## Open items for the owner

- **Name:** renamed to ArchStudio Dojo on 11 Nov 2026 to set it apart from UC Irvine's ArchStudio. Repository name and both live links unchanged on purpose. A "not affiliated" note sits in the README and on the Frameworks page.
- GitHub "About" box: description, website and topics.
- Bring-your-own model has been tested with a simulated provider only, not a live key.
- The app has not been tested with learners.
- `CASE_STUDY.md` is in the owner's voice; she prefers to rewrite prose herself.

## Suggested way to continue

One backlog item per session, on Opus 5.5 (it built everything to v2.1). Use a stronger model only for the multi-agent board design and the product decision.
