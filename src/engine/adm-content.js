// TOGAF ADM content: principles, scenarios, change examples and the ADM glossary.
export function buildAdmContent() {
  const P = (id, cat, n, st, ra, im) => ({ id, cat, n, st, ra, im });
  const principles = [
    P('primacy', 'Business', 'Primacy of principles', 'These principles apply to every part of the enterprise and every design decision.', 'A consistent basis for decisions keeps the estate coherent as teams and vendors change.', 'Exceptions go through the architecture board, not individual projects.'),
    P('benefit', 'Business', 'Maximise benefit to the enterprise', 'Decisions favour the enterprise as a whole over any single unit.', 'Local optimisations multiply cost and complexity across the estate.', 'Some teams accept a less tailored solution so shared ones can be reused.'),
    P('continuity', 'Business', 'Business continuity', 'Operations keep running when systems fail.', 'Outages in regulated or customer-facing processes carry real cost and risk.', 'Designs state an availability target and include observability and recovery.'),
    P('compliance', 'Business', 'Compliance with law', 'Information management meets all relevant law, regulation and policy.', 'Breaches carry legal, financial and reputational consequences.', 'Regulated data needs access control, audit trails and governance built in.'),
    P('asset', 'Data', 'Data is an asset', 'Data has value to the enterprise and is managed as such.', 'Accurate, governed data drives decisions and AI.', 'Critical data has an owner, a catalogue entry and lineage.'),
    P('shared', 'Data', 'Data is shared', 'People reach the data they need through shared, governed sources.', 'Copies drift and multiply cost and risk.', 'Prefer master data and shared platforms over local extracts.'),
    P('security', 'Data', 'Data is secure', 'Data is protected from unauthorised use and disclosure.', 'Breaches destroy trust and break regulation.', 'Every design has identity and access control at its boundary.'),
    P('reuse', 'Application', 'Reuse before buy before build', 'Use approved enterprise patterns before buying or building new ones.', 'Reuse lowers cost, risk and time to value.', 'Choices follow the pattern library unless a deviation is approved.'),
    P('interop', 'Technology', 'Interoperability', 'Systems connect through standard, governed interfaces.', 'Point-to-point links make change slow and fragile.', 'Expose capabilities through an API gateway or integration platform.'),
    P('diversity', 'Technology', 'Control technical diversity', 'Keep the number of technologies in use small and deliberate.', 'Each extra product adds skills, support and licence cost.', 'Stay on enterprise standards and justify every exception.'),
    P('independence', 'Technology', 'Technology independence', 'Core applications do not depend on one vendor where it matters.', 'Lock-in removes negotiating power and options.', 'Prefer open standards and portable options for core components.'),
    P('rai', 'Technology', 'Responsible AI by design', 'AI components are governed, evaluated and overseen by people.', 'Ungoverned AI creates safety, legal and reputational risk.', 'AI designs include guardrails, evaluation and a model registry.')
  ];
  const S = (id, n, app, set, d, sit, drivers, goals, scopeIn, scopeOut, stake, base, changes) => ({ id, n, app, set, d, sit, drivers, goals, scopeIn, scopeOut, stake, base, changes });
  const scenarios = [
    S('merger', 'Post-merger ERP consolidation', 'sap', { field: 'brown', reg: true, scale: '10k', cloud: 'multi', ai: 'enabled', avail: '99.95' },
      'Two companies, two ERPs, one close in 18 months.',
      'Your company has acquired a competitor that runs its own ERP. Two finance closes, two supplier masters and overlapping applications must become one within 18 months.',
      ['Deliver merger synergy savings', 'Single financial close and reporting', 'Retire duplicate licences and data centres'],
      ['One ERP instance across both companies', 'Close the books in 5 days', 'Retire 30% of overlapping applications'],
      ['Finance, procurement and supply chain', 'Supplier, material and customer master data', 'Integration with retained systems'],
      ['HR and payroll consolidation (next wave)', 'Commercial and CRM systems'],
      [['CFO', 'h', 'h', 'Synergy savings and one clean financial close', 'Business capabilities and portfolio', 'enterprise'], ['Integration management office', 'h', 'h', 'Day-one readiness and the sequence of waves', 'Roadmap and transition plateaus', 'gap'], ['Regional operations leads', 'l', 'h', 'No disruption to shipping and invoicing', 'Failure drills', 'drill'], ['External auditors', 'h', 'l', 'Controls and segregation of duties survive cutover', 'Architecture contract', 'review'], ['Acquired company IT team', 'l', 'h', 'Which of their systems survive', 'Gap analysis', 'gap'], ['Security and privacy office', 'h', 'l', 'Access control across two identity estates', 'Design canvas, identity layer', 'canvas']],
      [['Acquired company ERP (Oracle E-Business Suite)', null, 'retire'], ['Existing ERP core', 'erpcore', 'replace'], ['Point-to-point interfaces between the two ERPs', null, 'retire'], ['Separate supplier and material masters', 'mdm', 'replace'], ['Identity provider', 'idp', 'keep'], ['Legacy data warehouse', null, 'retire']],
      [['Regulators require a new tax reporting format next year', 'simple', 'A report or interface change inside the existing architecture. Normal change management handles it.'], ['A second, smaller acquisition joins the programme', 'incremental', 'Same target architecture, more scope. Revisit phases E and F for a new wave rather than a full cycle.'], ['The board decides to divest the business unit you are integrating', 'rearch', 'Scope and drivers change fundamentally. Start a new ADM cycle from phase A.']]),
    S('migration', 'Data centre exit to cloud', 'data', { field: 'brown', reg: true, scale: '10k', cloud: 'azure', ai: 'enabled', avail: '99.9' },
      'Move the analytics estate before the lease ends, with no missed regulatory report.',
      'The on-premises data centre lease ends in two years. The analytics estate, an ageing warehouse and Hadoop cluster feeding clinical and commercial reporting, must move to a governed cloud platform without breaking regulatory reports.',
      ['Data centre lease ends', 'Warehouse and Hadoop at end of support', 'Demand for AI-ready data'],
      ['Exit the data centre with no missed regulatory report', 'Cut platform running cost by a quarter', 'Catalogue every critical data product'],
      ['Warehouse, data lake and ETL', 'BI and regulatory reporting', 'Data governance and lineage'],
      ['Operational source systems (they stay on-premises for now)', 'Network redesign'],
      [['CIO', 'h', 'h', 'Exit on time and on budget', 'Roadmap and transition plateaus', 'gap'], ['Head of regulatory reporting', 'h', 'h', 'Reports stay validated through the move', 'Architecture contract', 'review'], ['Data platform team', 'l', 'h', 'Skills, tooling and on-call', 'Design canvas', 'canvas'], ['Finance', 'h', 'l', 'Running cost and licence exit', 'Compare outcomes', 'compare'], ['Analysts and data scientists', 'l', 'h', 'Faster access to trusted data', 'Business capabilities and portfolio', 'enterprise'], ['Quality and validation', 'h', 'l', 'Computer system validation evidence', 'Principles', 'principles']],
      [['On-premises enterprise warehouse (Teradata)', null, 'retire'], ['Hadoop data lake', 'lake', 'replace'], ['Legacy ETL tool', 'integ', 'replace'], ['BI dashboards', 'bi', 'keep'], ['Identity provider', 'idp', 'keep'], ['Spreadsheet lineage records', null, 'retire']],
      [['A new dashboard is needed for a product launch', 'simple', 'Built on the existing platform and patterns. No architecture change.'], ['Cloud costs come in 40% above plan', 'incremental', 'Revisit options in phase E, such as storage tiers and compute choices, and adjust the roadmap.'], ['The company moves all workloads to a second cloud provider', 'rearch', 'A change of technology strategy that reaches every layer. Start a new ADM cycle.']]),
    S('regulation', 'Governing an AI assistant for regulation', 'genai', { field: 'brown', reg: true, scale: '10k', cloud: 'aws', ai: 'enabled', avail: '99.9' },
      'Make a popular pilot traceable, evaluated and overseen before wider rollout.',
      'An internal assistant answers questions on medical and regulatory documents. It calls one model directly with no evaluation or audit trail. AI regulation and data integrity expectations mean it must be governed before rollout to 20,000 people.',
      ['AI regulation obligations for high-risk uses', 'Data integrity expectations in regulated work', 'Rollout to 20,000 employees'],
      ['Every answer traceable to its sources', 'Evaluation before every model change', 'Human oversight for regulated use'],
      ['Assistant, retrieval and model access', 'AI governance and evaluation', 'Identity and audit'],
      ['Document management systems', 'New AI use cases'],
      [['Chief medical officer', 'h', 'h', 'Answers are safe and accurate', 'Design canvas, guardrails', 'canvas'], ['AI governance board', 'h', 'h', 'Risk classification, evaluation and registry', 'Principles', 'principles'], ['Employees using the assistant', 'l', 'h', 'Speed and usefulness', 'Blueprint and request flow', 'blueprint'], ['Data protection officer', 'h', 'l', 'Personal data in prompts and logs', 'Blueprint and request flow', 'blueprint'], ['Platform engineering', 'l', 'h', 'Running the model gateway', 'Design canvas', 'canvas'], ['Internal audit', 'h', 'l', 'Evidence of controls', 'Architecture contract', 'review']],
      [['Pilot assistant application', 'app', 'keep'], ['Direct calls to one model provider', 'llm', 'replace'], ['Unmanaged vector index', 'vec', 'replace'], ['No evaluation or guardrails', null, 'retire'], ['Identity provider', 'idp', 'keep']],
      [['The model provider releases a new version', 'simple', 'Swap it through the AI gateway once evaluation passes. Change management, not architecture.'], ['Legal classifies a new use case as high risk', 'incremental', 'Add controls and evaluation for that use with a partial pass through phases B to D.'], ['Regulation bars a model provider you depend on', 'rearch', 'A forced platform change with compliance impact across layers. Start a new ADM cycle.']]),
    S('ainative', 'AI-native IT service desk', 'itsm', { field: 'brown', reg: false, scale: '10k', cloud: 'azure', ai: 'native', avail: '99.95' },
      'Agents resolve routine tickets end to end while people supervise.',
      'The IT service desk handles 40,000 tickets a month, mostly password resets, access requests and how-to questions. Leadership wants agents to resolve routine work end to end, with people supervising.',
      ['Rising ticket volumes', 'Slow access requests block new joiners', 'Demand to adopt agentic AI safely'],
      ['Agents resolve half of routine tickets end to end', 'Access requests fulfilled within an hour', 'Every agent action logged and reversible'],
      ['Service desk, knowledge and access requests', 'Agent tools over ITSM and identity', 'AI governance'],
      ['Infrastructure monitoring', 'Change and release processes'],
      [['CIO', 'h', 'h', 'Service quality and cost', 'Business capabilities and portfolio', 'enterprise'], ['Service desk manager', 'l', 'h', 'Which work agents take on', 'Decision records', 'decisions'], ['Information security', 'h', 'l', 'Agents with access to identity systems', 'Design canvas, tools and guardrails', 'canvas'], ['Employees', 'l', 'h', 'Faster answers', 'Blueprint and request flow', 'blueprint'], ['Works council', 'h', 'l', 'Impact on roles and human oversight', 'Principles', 'principles'], ['ITSM platform team', 'l', 'h', 'Running agent tools on the platform', 'Design canvas', 'canvas']],
      [['ITSM platform', 'itsm', 'keep'], ['Scripted chatbot', null, 'retire'], ['Identity provider', 'idp', 'keep'], ['Manual access approvals by email', null, 'retire']],
      [['A new self-service form is requested', 'simple', 'A configuration change on the existing platform.'], ['Agents are extended to HR questions', 'incremental', 'Same patterns with new tools and data. A partial pass through phases B to D for the HR scope.'], ['The company replaces its ITSM vendor', 'rearch', 'The core platform changes. Start a new ADM cycle.']])
  ];
  const defaultChanges = [
    ['A security patch is released for a core component', 'simple', 'Normal operations and change management handle it. The architecture is unchanged.'],
    ['Usage grows tenfold within a year', 'incremental', 'The target holds, but scaling decisions in phases D and E need revisiting.'],
    ['A key vendor announces end of support for a core product', 'incremental', 'Choose a replacement in phase E and plan the migration in F. The target architecture stays.'],
    ['The business moves into a new regulated market', 'rearch', 'New drivers and constraints reshape the vision. Start a new ADM cycle from phase A.']
  ];
  const glossary = {
    adm: ['Architecture Development Method (ADM)', 'TOGAF\'s repeatable cycle: principles and vision, then business, data, application and technology architecture, then migration, governance and change.', 'a recipe you repeat each time the dish changes.'],
    principle: ['Architecture principle', 'A lasting rule with a statement, rationale and implications that every design decision is tested against.', 'a house rule everyone agrees before the arguments start.'],
    stakemap: ['Stakeholder map', 'Places each stakeholder by power and interest so you know whom to manage closely, keep satisfied, keep informed or monitor.', 'a seating plan for a difficult dinner.'],
    sbb: ['Building blocks (ABB and SBB)', 'An architecture building block names the capability needed; a solution building block is the product that delivers it. The pattern library holds your approved solution building blocks.', 'the ingredient in a recipe versus the brand you buy.'],
    gapan: ['Gap analysis', 'Compares the baseline estate with the target to find what is new, changed, kept and retired.', 'a packing list: what you have, what you need, what to leave behind.'],
    plateau: ['Transition architecture', 'A stable intermediate state, or plateau, the business can run on while it moves from baseline to target.', 'the landings on a staircase.'],
    contract: ['Architecture contract', 'The agreement between architecture and delivery on what will be built, the standards it meets and the deviations accepted.', 'the building permit and its conditions.'],
    chg: ['Architecture change management', 'Phase H: deciding whether a change is simple, incremental or needs a new ADM cycle.', 'deciding between a repair, an extension or a rebuild.']
  };
  return { principles, scenarios, defaultChanges, glossary, defaultOn: ['primacy', 'continuity', 'compliance', 'security', 'reuse', 'interop', 'diversity', 'rai'] };
}
