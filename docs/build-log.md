# Build log

How ArchStudio evolved, in the order changes were made.

## Foundations

- **First prototype.** Five steps: brief, technology-neutral blueprint, competing outcomes, comparison and an enterprise view. Each building block offered open source and commercial options with a short rationale and a link.
- **Senior-architect features.** Decision records with Markdown export, availability and cost modelling, an evolution timeline, brownfield migration, a STRIDE threat model, catalogue signals, a mentor layer and a simulated review board.
- **Free-text briefs.** Named styles such as Netflix, Walmart, Uber and multi-agent systems became reference models.

## Learning experience

- **Ten learning aids from an entry-level review:**
  - follow-a-request animation
  - "what breaks without it" toggles
  - plain-language glossary
  - visible working for every number
  - guided mode with predictions
  - fix-it links
  - skill levels
  - worked example
  - real incidents
  - checkpoints
- **Enterprise implementations.** SAP S/4HANA, HR, CRM, ITSM and procurement models, with programme phases, cutover drills and segregation-of-duties checks.
- **AI as a design dimension.** No AI, AI-enabled or AI-native posture changes the building blocks, request flow, rules, drills, governance and review.

## Interaction and accuracy

- **Platform-aware defaults.** Embedded AI and the user experience follow the design's core platform, after SAP tools appeared in a ServiceNow design.
- **UX review.** A chat-style brief interpreted by Claude, and a flowchart with typed arrows before the layered view.
- **Standalone app.** Moved out of the design canvas, which blocks Claude calls, so the brief could use Claude.

## Enterprise depth (v1.8)

- Steps aligned to the TOGAF ADM: principles, vision and stakeholders, a design canvas, gap analysis and roadmap, an architecture contract and change classification.
- An AI review board, a saved portfolio and a team mode.

## v1.9

- The whole journey shown as chevrons in the header.
- A first-principles Workload step: sizing, the working, and the building blocks the numbers require.
- Agentic ITSM: event correlation, runbook automation, triage and remediation patterns, and an alert-storm drill.

## v2.0

- **Design lens.** System first or enterprise portfolio first, which changes the path, the brief, the blueprint, the comparison, the drills and the review.
- **Neutral standards by default.** No products are pre-selected and no vendor is preferred. Labelled example libraries follow a written rule.
- More model providers, so no single vendor is the only managed option.
- A clearer Guide panel.

## v2.1

Changes made after an external review of the repository.

- **Works fully outside Claude.** Designs save to browser storage when Claude's shared store is not available.
- **Bring your own model.** Briefs and the AI review board can use Anthropic, OpenAI, Gemini or a local Ollama model, called directly from the browser. Keys are kept in memory unless the user chooses to remember them.
- **Practice tracks.** A 30-minute system design interview and a 20-minute trade-off practice sit alongside the full journey. Each track shows only its steps, with suggested minutes and its own coaching.
- **Product fit follows the workload.** 44 rules of thumb shift a product's curated scores at the learner's numbers: write rate, events per second, peak requests, data volume, latency budget, tokens per day and user count. Each change shows its reason on the Workload step, on the product card and in the Compare working. Examples: one Postgres primary at 20k writes/s, per-request API gateway pricing at high sustained load, Kafka for a trickle of events, self-hosted GPUs at low token volumes.
- **A tougher review board.** Four fixed specialists (SRE lead, CISO, FinOps lead, enterprise architect), plus the most powerful stakeholder when a scenario names one, each question from their own lens. The board sees the Workload numbers and workload fit flags. Up to three rounds per question; a strong answer must name the trade-off accepted and the evidence. The architecture contract stays locked until the board approves, and its conditions carry into the contract.
- **Safer links.** The renderer already escaped all text and attributes; links now must use https, http or mailto, or they are blocked.
