# ArchStudio

A practice studio for designing system and enterprise architectures, from a plain-language brief to a design you can defend at a review board.

**Read the [case study](CASE_STUDY.md)** for the problem, the decisions behind the design and what I learned building it.

![The Brief step](docs/screenshots/02-brief.png)

## Try it

Open [`app/index.html`](app/index.html) in any modern browser. Nothing to install.

Running the file directly, ArchStudio reads briefs with keyword matching and keeps your work in the page only. Inside Claude, two more features switch on:

- Claude interprets free-form briefs and sits as the AI review board.
- Designs can be saved to a shared portfolio.

## What it covers

| Step | What you do |
|---|---|
| Principles and Vision | Agree architecture principles, stakeholders, drivers and scope |
| Brief | Describe the system or business change; choose system-first or portfolio-first |
| Workload | Size the system from first principles and see which building blocks the numbers require |
| Business | Rate capability maturity and classify the application portfolio (TIME) |
| Blueprint | See how the parts interact, follow a request, switch parts off |
| Canvas | Assemble the design from building blocks and choose products |
| Outcomes and Compare | Build competing designs and compare their trade-offs |
| Gap and roadmap | Plan transition architectures from baseline to target |
| Drill | Run failure scenarios tied to real incidents, and a STRIDE threat model |
| AI board and Review | Defend the design and sign the architecture contract |

## Screenshots

| | |
|---|---|
| ![Workload](docs/screenshots/03-workload.png) | ![Compare](docs/screenshots/05-compare.png) |
| Workload: first-principles sizing | Compare: trade-offs with visible working |
| ![Canvas](docs/screenshots/06-canvas.png) | ![Portfolio landscape](docs/screenshots/07-portfolio-landscape.png) |
| Canvas: building blocks and products | Portfolio-first lens: the solution in its landscape |

## Frameworks it draws on

TOGAF Standard (10th Edition), ArchiMate, ISO/IEC/IEEE 42010, architecture decision records, the Gartner TIME model, the AWS, Azure and Google Cloud Well-Architected frameworks, the strangler fig pattern, STRIDE, the EU AI Act, NIST AI RMF and ISO/IEC 42001, GAMP 5 and the FinOps Framework. The Frameworks panel in the app links to each official source.

## Repository contents

- `app/index.html`: the complete app in one file
- `app/vendor/`: morphdom 2.7.4 (MIT licence), the one library the app uses
- `CASE_STUDY.md`: one-page case study
- `docs/build-log.md`: how the app evolved, version by version
- `docs/screenshots/`: screenshots of key steps

## Notes

Product scores are curated judgements to support learning, not benchmarks. Product names belong to their owners; no vendor endorses this project.
