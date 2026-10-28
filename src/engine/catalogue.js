// The catalogue: building blocks and product options, reference models, patterns, glossary, quizzes, incidents and drills.
// Product scores s = [Scale, Cost, Ops ease, Portability, Speed], 1 to 5, curated judgements.
export function buildCatalogue() {
  const o = (n, k, w, u, s, t) => ({ n, k, w, u, s, t: t || [] });
  const C = (l, layer, need, an, wo, opts) => ({ l, layer, need, an, wo, o: opts });
  const cat = {
    ui: C('Web and mobile front end', 'exp', 'Where users interact: renders screens, calls APIs, holds client session state.', 'the shop window and counter customers actually touch.', 'no way for people to use the system at all.', [
      o('Next.js (React)', 'OSS', 'Largest ecosystem, server rendering for speed and SEO, deep hiring pool.', 'https://nextjs.org/docs', [5,5,4,5,5]),
      o('Angular', 'OSS', 'Opinionated and complete; suits large enterprise teams that want consistency.', 'https://angular.dev', [4,5,4,5,3]),
      o('Flutter', 'OSS', 'One codebase for iOS, Android and web; best when mobile is primary.', 'https://docs.flutter.dev', [4,5,4,5,4])]),
    bi: C('Insight and BI', 'exp', 'Dashboards and self-service analysis for business users.', 'the dashboard in a car: raw readings turned into something you can act on.', 'analysts query raw tables by hand, and insight arrives late or not at all.', [
      o('Apache Superset', 'OSS', 'Open BI with SQL lab and rich charts; no per-seat licence.', 'https://superset.apache.org/docs/intro', [4,5,3,5,4]),
      o('Microsoft Power BI', 'Proprietary', 'Default in Microsoft estates; strong self-service and governance.', 'https://learn.microsoft.com/power-bi/', [5,4,5,2,5], ['azure','saas']),
      o('Tableau', 'Proprietary', 'Best-in-class visual exploration for analysts.', 'https://help.tableau.com', [5,2,5,3,4], ['saas'])]),
    edge: C('CDN and web firewall', 'edge', 'Caches content near users and blocks attacks before they reach you.', 'small warehouses near customers, so goods do not ship from one central depot.', 'every image and page travels from your servers, pages slow down far from your region, and attacks hit you directly.', [
      o('Cloudflare', 'Proprietary', 'Global edge, DDoS and WAF in one; switched on in hours.', 'https://developers.cloudflare.com', [5,4,5,3,5], ['saas']),
      o('AWS CloudFront + WAF', 'Proprietary', 'Native fit when the stack runs on AWS.', 'https://docs.aws.amazon.com/cloudfront/', [5,4,4,2,4], ['aws']),
      o('Azure Front Door', 'Proprietary', 'Native global entry point for Azure workloads.', 'https://learn.microsoft.com/azure/frontdoor/', [5,4,4,2,4], ['azure'])]),
    lb: C('Load balancer', 'edge', 'Spreads traffic across healthy instances and drains failing ones.', 'a restaurant host seating guests evenly across waiters.', 'one server takes all the traffic, and a single crash takes the site down.', [
      o('NGINX', 'OSS', 'Proven L7 proxy and balancer with a tiny footprint.', 'https://nginx.org/en/docs/', [4,5,3,5,4]),
      o('Envoy', 'OSS', 'Modern L7 proxy behind most service meshes; rich telemetry.', 'https://www.envoyproxy.io/docs', [5,5,3,5,3], ['k8s']),
      o('AWS Application Load Balancer', 'Proprietary', 'Fully managed, autoscaling, integrates with AWS target groups.', 'https://docs.aws.amazon.com/elasticloadbalancing/', [5,4,5,2,5], ['aws'])]),
    gw: C('API gateway', 'edge', 'Single front door for APIs: auth, rate limits, routing, versioning.', 'a reception desk that checks badges, limits visitors and sends them to the right floor.', 'every service re-implements login and rate limiting, inconsistently, and abuse goes unchecked.', [
      o('Kong Gateway', 'OSS', 'Plugin-rich, runs anywhere including Kubernetes; avoids cloud lock-in.', 'https://docs.konghq.com', [5,4,3,5,3], ['k8s']),
      o('Amazon API Gateway', 'Proprietary', 'Nothing to run; pairs naturally with Lambda.', 'https://docs.aws.amazon.com/apigateway/', [4,4,5,1,5], ['aws','serverless']),
      o('Azure API Management', 'Proprietary', 'Full API lifecycle with developer portal, inside Azure.', 'https://learn.microsoft.com/azure/api-management/', [5,3,4,2,4], ['azure'])]),
    app: C('Application services', 'app', 'Runs the business logic as services that scale independently.', 'the kitchen where orders are actually cooked.', 'no business logic runs, so nothing happens.', [
      o('Kubernetes', 'OSS', 'Portable standard for containers; scales to thousands of services.', 'https://kubernetes.io/docs/home/', [5,3,2,5,2], ['k8s']),
      o('AWS Lambda', 'Proprietary', 'Pay per request, no servers; ideal for spiky load.', 'https://docs.aws.amazon.com/lambda/', [4,4,5,1,5], ['aws','serverless']),
      o('Azure Container Apps', 'Proprietary', 'Managed containers on Kubernetes without running the cluster.', 'https://learn.microsoft.com/azure/container-apps/', [4,4,4,3,4], ['azure'])]),
    orch: C('Agent and RAG orchestration', 'app', 'Plans steps, retrieves context, calls tools and models in order.', 'a research assistant who gathers the right papers before writing an answer.', 'the model answers without your documents, so it guesses.', [
      o('LangGraph', 'OSS', 'Stateful agent graphs with human-in-the-loop checkpoints.', 'https://langchain-ai.github.io/langgraph/', [4,5,3,5,4]),
      o('LlamaIndex', 'OSS', 'Strong data connectors and retrieval pipelines for RAG.', 'https://docs.llamaindex.ai', [4,5,3,5,4]),
      o('Haystack', 'OSS', 'Production-minded pipelines with clear, testable components.', 'https://docs.haystack.deepset.ai', [4,5,3,5,3])]),
    agents: C('Multi-agent coordination', 'app', 'Splits work across specialised agents with a supervisor, shared state and hand-offs.', 'a project lead splitting work across specialists, then combining their output.', 'one agent does everything in sequence, which is slower and less reliable on complex tasks.', [
      o('LangGraph', 'OSS', 'Explicit graphs for supervisor and worker topologies with checkpoints.', 'https://langchain-ai.github.io/langgraph/', [4,5,3,5,4]),
      o('CrewAI', 'OSS', 'Role-based crews of agents; quick to prototype collaboration.', 'https://docs.crewai.com', [4,5,4,5,5]),
      o('Claude Agent SDK', 'Proprietary', 'Agent loop, sub-agents, tools and context management built in.', 'https://docs.claude.com/en/api/agent-sdk/overview', [5,3,4,3,5], ['saas'])]),
    tools: C('Tool and agent protocols', 'app', 'A standard way for agents to reach tools, data and each other.', 'a universal power adaptor between agents and every system they plug into.', 'custom glue for each system, so every new tool is a new integration project.', [
      o('Model Context Protocol (MCP)', 'OSS', 'Open standard for exposing tools and data to any agent.', 'https://modelcontextprotocol.io', [5,5,4,5,5]),
      o('Agent2Agent (A2A) protocol', 'OSS', 'Open protocol for agents from different vendors to delegate work.', 'https://github.com/a2aproject/A2A', [4,5,3,5,3]),
      o('OpenAPI tool adapters', 'OSS', 'Wrap existing REST APIs as tools; no new standard to adopt.', 'https://swagger.io/specification/', [3,4,3,4,3])]),
    llm: C('Model serving', 'app', 'Hosts or brokers the language models that generate answers.', 'the expert writer who drafts the answer.', 'nothing generates language, so the assistant cannot respond.', [
      o('vLLM + Hugging Face models', 'OSS', 'Serve open-weight models on your own GPUs; data never leaves.', 'https://docs.vllm.ai', [4,3,2,5,3], ['k8s','gpu']),
      o('Claude via API', 'Proprietary', 'Frontier reasoning and long context with no GPUs to run.', 'https://docs.claude.com', [5,3,5,3,5], ['saas']),
      o('Amazon Bedrock', 'Proprietary', 'Many models behind one AWS API with private networking.', 'https://docs.aws.amazon.com/bedrock/', [5,3,5,2,5], ['aws']),
      o('Azure OpenAI Service', 'Proprietary', 'OpenAI models inside Azure with private networking and regional deployment.', 'https://learn.microsoft.com/azure/ai-services/openai/', [5,3,5,2,5], ['azure']),
      o('Gemini on Vertex AI', 'Proprietary', 'Google models behind Google Cloud APIs with enterprise controls.', 'https://cloud.google.com/vertex-ai/generative-ai/docs', [5,3,5,2,5], ['gcp']),
      o('OpenAI API', 'Proprietary', 'Frontier models directly from OpenAI, usable from any cloud.', 'https://platform.openai.com/docs', [5,3,5,3,5], ['saas'])]),
    guard: C('Guardrails and evaluation', 'app', 'Filters unsafe input and output, traces runs, measures answer quality.', 'an editor and compliance check before anything is published.', 'harmful, wrong or leaked content reaches users unchecked, and you cannot measure quality.', [
      o('NeMo Guardrails', 'OSS', 'Programmable rails for safety, topics and jailbreak defence.', 'https://docs.nvidia.com/nemo/guardrails/', [4,5,3,5,3]),
      o('Langfuse', 'OSS', 'Tracing, prompt versions and evals for LLM apps.', 'https://langfuse.com/docs', [4,5,4,5,4]),
      o('Azure AI Content Safety', 'Proprietary', 'Managed harm and prompt-attack detection.', 'https://learn.microsoft.com/azure/ai-services/content-safety/', [5,4,5,2,5], ['azure'])]),
    media: C('Media processing and delivery', 'app', 'Transcodes, packages and protects video for every device and bandwidth.', 'a print shop producing the same film in every size a device needs.', 'videos fail on slow networks or some devices, and buffering is everywhere.', [
      o('FFmpeg + Shaka Packager', 'OSS', 'Industry-standard encoders and adaptive packaging you fully control.', 'https://ffmpeg.org/documentation.html', [4,4,2,5,2]),
      o('AWS Elemental MediaConvert', 'Proprietary', 'Broadcast-grade transcoding as a managed service.', 'https://docs.aws.amazon.com/mediaconvert/', [5,3,5,1,5], ['aws']),
      o('Mux', 'Proprietary', 'Video API: upload, encode, stream and measure quality.', 'https://docs.mux.com', [5,2,5,3,5], ['saas'])]),
    reco: C('Personalisation and ML features', 'app', 'Ranks content or products per user from behaviour signals.', 'a shop assistant who remembers what you like.', 'everyone sees the same list, and discovery drops.', [
      o('Feast + PyTorch', 'OSS', 'Open feature store with your own ranking models.', 'https://docs.feast.dev', [4,4,2,5,2]),
      o('Amazon Personalize', 'Proprietary', 'Managed recommendations from interaction data.', 'https://docs.aws.amazon.com/personalize/', [4,3,5,1,5], ['aws']),
      o('Google Vertex AI', 'Proprietary', 'End-to-end ML platform with feature store and serving.', 'https://cloud.google.com/vertex-ai/docs', [5,3,4,2,4], ['gcp'])]),
    ingest: C('Device ingestion', 'app', 'Authenticates devices and accepts high-volume telemetry over MQTT.', 'a security gate that checks every delivery truck before it unloads.', 'devices cannot connect at scale, and spoofed devices can inject false data.', [
      o('EMQX', 'OSS', 'MQTT broker built for millions of concurrent device connections.', 'https://docs.emqx.com', [5,4,3,5,3]),
      o('AWS IoT Core', 'Proprietary', 'Managed device registry, certificates and MQTT.', 'https://docs.aws.amazon.com/iot/', [5,3,5,1,5], ['aws']),
      o('Azure IoT Hub', 'Proprietary', 'Managed device identity and bi-directional messaging.', 'https://learn.microsoft.com/azure/iot-hub/', [5,3,5,1,5], ['azure'])]),
    stream: C('Stream processing', 'app', 'Computes windows, joins and alerts on data in motion.', 'an inspector checking items on the conveyor belt, not after they ship.', 'problems surface in tomorrow\'s batch report instead of seconds after they happen.', [
      o('Apache Flink', 'OSS', 'True event-time streaming with exactly-once state.', 'https://nightlies.apache.org/flink/flink-docs-stable/', [5,4,2,5,2], ['jvm']),
      o('Spark Structured Streaming', 'OSS', 'Reuse batch Spark skills for micro-batch streams.', 'https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html', [4,4,3,5,4], ['jvm']),
      o('Amazon Managed Flink', 'Proprietary', 'Flink without running clusters.', 'https://docs.aws.amazon.com/managed-flink/', [5,3,5,3,4], ['aws'])]),
    integ: C('Data integration', 'app', 'Moves data from source systems in batch or change-data-capture.', 'couriers moving records between departments on a schedule.', 'teams copy spreadsheets by hand, and numbers disagree across reports.', [
      o('Airbyte', 'OSS', '300+ connectors, self-host or cloud, extensible connector kit.', 'https://docs.airbyte.com', [4,5,3,5,4]),
      o('Fivetran', 'Proprietary', 'Fully managed pipelines that absorb schema drift.', 'https://fivetran.com/docs', [5,2,5,3,5], ['saas']),
      o('MuleSoft Anypoint', 'Proprietary', 'API-led integration across ERP, CRM and legacy apps.', 'https://docs.mulesoft.com', [5,1,4,2,3], ['saas'])]),
    db: C('Operational database', 'data', 'System of record for transactions; must be consistent and durable.', 'the ledger of record: what is written here is the truth.', 'orders, accounts and payments have nowhere durable to live.', [
      o('PostgreSQL', 'OSS', 'Reliable and extensible (JSON, pgvector, PostGIS); the default choice.', 'https://www.postgresql.org/docs/', [4,5,3,5,4], ['pg']),
      o('Amazon Aurora PostgreSQL', 'Proprietary', 'Postgres-compatible with managed failover and read replicas.', 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/', [5,3,5,3,5], ['aws','pg']),
      o('MongoDB Atlas', 'Proprietary', 'Flexible documents for fast-changing schemas, fully managed.', 'https://www.mongodb.com/docs/atlas/', [5,3,5,3,5], ['saas'])]),
    nosql: C('Wide-column store', 'data', 'Massive write throughput and multi-region replication for profiles, history and state.', 'a huge filing room built for millions of quick writes.', 'the relational database becomes the bottleneck for high-volume profile and history data.', [
      o('Apache Cassandra', 'OSS', 'Masterless, multi-region writes; proven at internet scale.', 'https://cassandra.apache.org/doc/latest/', [5,4,2,5,2]),
      o('Amazon DynamoDB', 'Proprietary', 'Serverless key-value at any scale with global tables.', 'https://docs.aws.amazon.com/dynamodb/', [5,3,5,1,5], ['aws']),
      o('Azure Cosmos DB', 'Proprietary', 'Multi-model, multi-region with tunable consistency.', 'https://learn.microsoft.com/azure/cosmos-db/', [5,3,5,2,5], ['azure'])]),
    cache: C('Cache', 'data', 'Serves hot reads in milliseconds and protects the database.', 'keeping popular items at the counter instead of fetching them from the stockroom.', 'every read hits the database, so at peak pages slow down and the database can fall over.', [
      o('Valkey (Redis-compatible)', 'OSS', 'Sub-millisecond reads, sessions, rate limits; open fork of Redis.', 'https://valkey.io/docs/', [5,5,4,5,5]),
      o('Amazon ElastiCache', 'Proprietary', 'Managed Valkey or Redis with automatic failover.', 'https://docs.aws.amazon.com/elasticache/', [5,4,5,2,5], ['aws']),
      o('Memcached', 'OSS', 'Simplest pure cache; no persistence or replication.', 'https://memcached.org', [4,5,4,5,4])]),
    geo: C('Geospatial indexing', 'data', 'Finds nearby drivers, couriers or stores in milliseconds.', 'a map with a grid, so you only search the nearby squares.', 'finding the nearest driver means scanning every driver, and matching slows as you grow.', [
      o('H3 + PostGIS', 'OSS', 'Hexagonal grid index with spatial SQL on Postgres.', 'https://h3geo.org/docs/', [5,5,3,5,3], ['pg']),
      o('Valkey geo commands', 'OSS', 'In-memory radius queries; simple and very fast.', 'https://valkey.io/commands/geoadd/', [4,5,4,5,5]),
      o('Amazon Location Service', 'Proprietary', 'Managed maps, geofences, tracking and routing.', 'https://docs.aws.amazon.com/location/', [4,3,5,1,5], ['aws'])]),
    search: C('Search', 'data', 'Full-text and faceted search over catalogue or content.', 'a library catalogue with a librarian who understands typos.', 'users search with slow database queries that miss synonyms and spelling errors.', [
      o('OpenSearch', 'OSS', 'Full-text and log search under Apache 2.0.', 'https://opensearch.org/docs/', [5,4,3,5,3]),
      o('Elastic Cloud', 'Proprietary', 'Mature relevance tuning as a managed service.', 'https://www.elastic.co/docs', [5,3,4,3,4], ['saas']),
      o('Algolia', 'Proprietary', 'Hosted search-as-you-type with minimal effort.', 'https://www.algolia.com/doc/', [4,2,5,2,5], ['saas'])]),
    mq: C('Events and messaging', 'data', 'Decouples services so one slow or failed part does not stop the rest.', 'an inbox between teams: drop work in, others pick it up when ready.', 'services call each other directly, and one slow service stalls the whole chain.', [
      o('Apache Kafka', 'OSS', 'Durable, replayable event log; backbone of event-driven systems.', 'https://kafka.apache.org/documentation/', [5,4,2,5,2], ['jvm']),
      o('RabbitMQ', 'OSS', 'Simple task queues and routing; lighter than Kafka.', 'https://www.rabbitmq.com/docs', [3,5,4,5,4]),
      o('Confluent Cloud', 'Proprietary', 'Managed Kafka with connectors and schema governance.', 'https://docs.confluent.io/cloud/', [5,2,5,4,5], ['saas'])]),
    vec: C('Vector store', 'data', 'Finds semantically similar chunks to ground model answers.', 'finding books by meaning, not exact title.', 'the assistant cannot find relevant passages, so answers lose grounding.', [
      o('pgvector', 'OSS', 'Vectors inside Postgres; one less system to run.', 'https://github.com/pgvector/pgvector', [3,5,4,5,5], ['pg']),
      o('Qdrant', 'OSS', 'Purpose-built, fast filtered search at scale; self-host or cloud.', 'https://qdrant.tech/documentation/', [5,4,3,5,4]),
      o('Pinecone', 'Proprietary', 'Serverless vector database, zero operations.', 'https://docs.pinecone.io', [5,3,5,2,5], ['saas'])]),
    mem: C('Agent memory and state', 'data', 'Short-term run state and long-term memory agents can recall.', 'a shared notebook the agents keep between conversations.', 'agents forget context mid-task and start over after any interruption.', [
      o('LangGraph checkpointer on Postgres', 'OSS', 'Durable run state; resume, replay and time-travel debugging.', 'https://langchain-ai.github.io/langgraph/concepts/persistence/', [4,5,3,5,4], ['pg']),
      o('Mem0', 'OSS', 'Long-term user and agent memory layer with retrieval.', 'https://docs.mem0.ai', [4,5,4,5,4]),
      o('Letta', 'OSS', 'Stateful agents with self-editing memory blocks.', 'https://docs.letta.com', [4,5,3,5,3])]),
    tsdb: C('Time-series store', 'data', 'Stores high-frequency readings for live and recent queries.', 'a logbook ruled for timestamps and built for fast writing.', 'a general database struggles with millions of readings a minute.', [
      o('TimescaleDB', 'OSS', 'Time-series on Postgres; SQL your team already knows.', 'https://docs.timescale.com', [4,5,4,5,4], ['pg']),
      o('InfluxDB', 'OSS', 'Purpose-built for high-ingest metrics.', 'https://docs.influxdata.com', [5,4,3,4,4]),
      o('Azure Data Explorer', 'Proprietary', 'Fast ad-hoc analytics on telemetry at scale.', 'https://learn.microsoft.com/azure/data-explorer/', [5,3,5,2,4], ['azure'])]),
    lake: C('Lakehouse and analytics', 'data', 'Cheap, open storage for history, analytics and model training.', 'an archive where every record is kept cheaply for later study.', 'history is lost or scattered, and analytics and AI training lack data.', [
      o('Apache Iceberg + Spark', 'OSS', 'Open table format any engine can read; no lock-in.', 'https://iceberg.apache.org/docs/latest/', [5,4,2,5,2], ['jvm']),
      o('Databricks', 'Proprietary', 'Unified data, ML and governance with Unity Catalog.', 'https://docs.databricks.com', [5,2,4,4,4], ['saas']),
      o('Snowflake', 'Proprietary', 'SQL-first, near-zero tuning, secure data sharing.', 'https://docs.snowflake.com', [5,2,5,3,5], ['saas'])]),
    catalog: C('Data catalogue and governance', 'data', 'Lineage, ownership, glossary and quality rules for every dataset.', 'the index card for every dataset: who owns it and where it came from.', 'nobody trusts the data because nobody knows its source or quality.', [
      o('OpenMetadata', 'OSS', 'Lineage, glossary and quality tests in one open platform.', 'https://docs.open-metadata.org', [4,5,3,5,4]),
      o('DataHub', 'OSS', 'Event-driven metadata graph proven at LinkedIn scale.', 'https://datahubproject.io/docs/', [5,5,3,5,3]),
      o('Collibra', 'Proprietary', 'Policy and stewardship workflows for regulated firms.', 'https://www.collibra.com', [4,2,4,2,3], ['saas'])]),
    mesh: C('Service mesh', 'x', 'Encrypts and routes service-to-service traffic with retries and circuit breaking.', 'armoured couriers with automatic retries between every office.', 'each service handles encryption and retries itself, inconsistently.', [
      o('Istio', 'OSS', 'Most complete mesh: mTLS, traffic shifting, policy.', 'https://istio.io/latest/docs/', [5,5,2,5,2], ['k8s']),
      o('Linkerd', 'OSS', 'Lightweight mesh, simpler to run than Istio.', 'https://linkerd.io/docs/', [4,5,3,5,4], ['k8s']),
      o('Google Cloud Service Mesh', 'Proprietary', 'Managed Istio-based mesh on Google Cloud.', 'https://cloud.google.com/service-mesh/docs', [5,3,4,2,4], ['gcp'])]),
    aigw: C('AI gateway and model routing', 'app', 'One controlled path to every model: keys, quotas, routing, fallbacks, caching, logging and cost tracking.', 'a switchboard operator who connects each call to the right expert and keeps the bill.', 'every team wires models directly, keys leak, spend is invisible, and switching models means code changes everywhere.', [
      o('LiteLLM', 'OSS', 'Open source proxy with one API for many model providers, budgets and fallbacks.', 'https://docs.litellm.ai', [4,5,3,5,4]),
      o('Portkey', 'Proprietary', 'Managed AI gateway with observability, guardrails and routing; core gateway is open source.', 'https://portkey.ai/docs', [5,3,5,3,5], ['saas']),
      o('Azure API Management AI gateway', 'Proprietary', 'Token limits, semantic caching and load balancing for models inside Azure.', 'https://learn.microsoft.com/azure/api-management/genai-gateway-capabilities', [5,3,4,2,4], ['azure'])]),
    aigov: C('AI governance and model registry', 'x', 'Inventory of AI use cases and models, risk classification, approvals, model cards and audit trail.', 'a register of every AI "employee": what it does, who approved it and how it is checked.', 'nobody can say which models touch which data or decisions, and auditors and regulators get no answer.', [
      o('MLflow', 'OSS', 'Open source model registry, lineage and evaluation tracking.', 'https://mlflow.org/docs/latest/', [4,5,3,5,4]),
      o('IBM watsonx.governance', 'Proprietary', 'AI lifecycle governance with risk and compliance workflows.', 'https://www.ibm.com/docs/en/watsonx/saas', [5,2,4,3,3], ['saas']),
      o('Credo AI', 'Proprietary', 'Governance platform mapping AI use cases to regulations and policies.', 'https://www.credo.ai', [4,3,5,3,4], ['saas'])]),
    embai: C('Embedded vendor AI', 'app', 'Copilots and agents that ship inside the enterprise suite, grounded in its data and permissions.', 'an assistant who already knows the building because the landlord trained them.', 'people copy business data into public chatbots, losing permissions, audit trail and context.', [
      o('SAP Joule', 'Proprietary', 'SAP copilot and agents across S/4HANA, SuccessFactors and Ariba.', 'https://learning.sap.com', [4,3,5,1,5], ['sap','saas']),
      o('Salesforce Agentforce', 'Proprietary', 'Agents that act on Salesforce data and workflows.', 'https://architect.salesforce.com', [5,2,5,1,5], ['saas']),
      o('ServiceNow Now Assist', 'Proprietary', 'Generative AI and agents inside ServiceNow workflows.', 'https://www.servicenow.com/docs/', [5,2,5,1,5], ['saas']),
      o('Microsoft Copilot Studio', 'Proprietary', 'Build copilots and agents across Microsoft 365 and connected systems.', 'https://learn.microsoft.com/microsoft-copilot-studio/', [5,3,5,2,5], ['azure','saas'])]),
    aiops: C('Event correlation (AIOps)', 'app', 'Groups related alerts, finds the probable cause and opens one incident instead of hundreds.', 'a dispatcher who hears a hundred emergency calls and sends one team to the one fire.', 'every alert becomes a ticket, engineers drown in noise and miss the real cause.', [
      o('ServiceNow Event Management', 'Proprietary', 'Alert correlation inside ServiceNow, linked to the CMDB and incidents.', 'https://www.servicenow.com/docs/', [5,2,5,1,4], ['saas']),
      o('BigPanda', 'Proprietary', 'Independent AIOps platform that correlates alerts across many monitoring tools.', 'https://docs.bigpanda.io', [5,2,5,3,4], ['saas']),
      o('Keep', 'OSS', 'Open source alert management and AIOps with workflows.', 'https://docs.keephq.dev', [4,5,3,5,4])]),
    runbook: C('Runbook automation', 'app', 'Runs approved fixes: restart, scale out, roll back, clear a queue.', 'a laminated checklist a trusted robot can follow, only for the steps you have signed off.', 'every fix is manual at 3am, slower and more error-prone.', [
      o('Ansible', 'OSS', 'Widely used open source automation with a large module library.', 'https://docs.ansible.com', [5,5,3,5,4]),
      o('Rundeck', 'OSS', 'Runbook automation with access control and audit; community and paid editions.', 'https://docs.rundeck.com', [4,5,3,5,4]),
      o('Azure Automation', 'Proprietary', 'Managed runbooks for Azure and hybrid machines.', 'https://learn.microsoft.com/azure/automation/', [4,4,5,2,4], ['azure']),
      o('AWS Systems Manager Automation', 'Proprietary', 'Managed runbooks for AWS resources.', 'https://docs.aws.amazon.com/systems-manager/', [4,4,5,1,4], ['aws'])]),
    ux: C('Enterprise user experience', 'exp', 'Where employees work: launchpad, tasks, approvals and mobile access.', 'the front office desk employees sit at every day.', 'users juggle many screens and logins, adoption drops and workarounds move into spreadsheets.', [
      o('SAP Fiori launchpad', 'Proprietary', 'Role-based apps and approvals designed for SAP back ends.', 'https://learning.sap.com', [4,4,5,2,5], ['sap']),
      o('Microsoft Teams apps', 'Proprietary', 'Bring approvals and tasks into the tool people already live in.', 'https://learn.microsoft.com/microsoftteams/platform/', [5,4,4,2,4], ['azure']),
      o('Custom React portal', 'OSS', 'Full control of the experience over published APIs; you build and run it.', 'https://react.dev', [5,5,3,5,2])]),
    erpcore: C('ERP core', 'app', 'System of record for finance, supply chain, manufacturing and sales processes.', 'the company\'s central ledger and rulebook in one.', 'every department keeps its own books, and month-end close becomes a reconciliation marathon.', [
      o('SAP S/4HANA Cloud, private edition (RISE)', 'Proprietary', 'Full S/4HANA scope hosted and run under one SAP contract; supports brownfield conversion from ECC.', 'https://learning.sap.com', [5,2,4,1,3], ['sap','saas']),
      o('SAP S/4HANA Cloud, public edition', 'Proprietary', 'Standardised SaaS with regular updates; fastest to adopt, least room to customise.', 'https://learning.sap.com', [4,3,5,1,4], ['sap','saas']),
      o('Oracle Fusion Cloud ERP', 'Proprietary', 'SaaS finance and supply chain with frequent updates; strong in finance.', 'https://docs.oracle.com/en/cloud/saas/', [5,2,5,1,4], ['saas']),
      o('Odoo', 'OSS', 'Modular open source ERP; suits smaller entities or subsidiaries.', 'https://www.odoo.com/documentation/', [3,5,3,5,4])]),
    ext: C('Extension platform', 'app', 'Builds custom apps and logic beside the ERP so the core stays standard.', 'an annex next to the main building, so you never knock down load-bearing walls.', 'custom code goes inside the ERP core, and every upgrade becomes a costly retest project.', [
      o('SAP BTP', 'Proprietary', 'SAP platform for side-by-side extensions, events and low-code.', 'https://discovery-center.cloud.sap', [5,3,4,2,4], ['sap']),
      o('Microsoft Power Platform', 'Proprietary', 'Low-code apps and workflows for business teams.', 'https://learn.microsoft.com/power-platform/', [4,3,5,2,5], ['azure']),
      o('Custom services on Kubernetes', 'OSS', 'Extensions as your own services calling ERP APIs; most freedom, most effort.', 'https://kubernetes.io/docs/home/', [5,4,2,5,2], ['k8s'])]),
    ipaas: C('Integration platform', 'app', 'Connects the core to every other system through APIs, events, files and EDI.', 'a switchboard translating between systems that speak different languages.', 'point-to-point interfaces multiply, and one change breaks systems nobody knew were connected.', [
      o('SAP Integration Suite', 'Proprietary', 'Prebuilt SAP content and adapters; natural fit for SAP-centric estates.', 'https://learning.sap.com', [5,3,4,2,4], ['sap']),
      o('MuleSoft Anypoint', 'Proprietary', 'API-led connectivity across SAP and non-SAP systems.', 'https://docs.mulesoft.com', [5,1,4,3,3], ['saas']),
      o('Apache Camel', 'OSS', 'Open integration framework with hundreds of connectors; you run and support it.', 'https://camel.apache.org/docs/', [4,5,2,5,2])]),
    mdm: C('Master data management', 'data', 'Keeps one golden record for materials, customers, vendors and employees.', 'one address book everyone copies from, instead of everyone keeping their own.', 'duplicate vendors, wrong prices and failed deliveries, and migration loads break on bad data.', [
      o('SAP Master Data Governance', 'Proprietary', 'Governed workflows for SAP master data inside the S/4HANA stack.', 'https://learning.sap.com', [4,3,4,2,4], ['sap']),
      o('Informatica MDM', 'Proprietary', 'Multi-domain master data across SAP and non-SAP systems.', 'https://docs.informatica.com', [5,2,4,3,3], ['saas']),
      o('Reltio', 'Proprietary', 'Cloud-native, API-first master data with real-time matching.', 'https://docs.reltio.com', [5,2,5,3,4], ['saas'])]),
    migr: C('Data migration', 'app', 'Extracts, cleanses, maps and loads legacy data, then proves it reconciles.', 'moving house: decide what to keep, pack carefully, check nothing broke on arrival.', 'go-live opens with wrong balances and missing records, and trust in the new system collapses.', [
      o('SAP S/4HANA Migration Cockpit', 'Proprietary', 'Included tool with predefined migration objects for S/4HANA.', 'https://learning.sap.com', [4,5,4,2,4], ['sap']),
      o('Syniti', 'Proprietary', 'Specialist migration and data quality platform for large ERP programmes.', 'https://www.syniti.com', [5,2,4,3,3], ['saas']),
      o('dbt + Python pipelines', 'OSS', 'Open tooling for transformation and reconciliation; most effort, full transparency.', 'https://docs.getdbt.com', [4,5,2,5,2])]),
    proc: C('Process design and mining', 'x', 'Shows how processes really run today and designs the future standard.', 'a satellite map of how work actually flows, not how the manual says it does.', 'you automate today\'s workarounds into the new system.', [
      o('SAP Signavio', 'Proprietary', 'Process mining and modelling tied to SAP best-practice content.', 'https://learning.sap.com', [5,3,4,2,4], ['sap','saas']),
      o('Celonis', 'Proprietary', 'Leading process mining across ERP and other systems.', 'https://docs.celonis.com', [5,2,5,3,4], ['saas']),
      o('PM4Py', 'OSS', 'Open source process mining library in Python.', 'https://pm4py.fit.fraunhofer.de', [3,5,2,5,2])]),
    alm: C('Lifecycle management and testing', 'x', 'Plans releases, tracks requirements and automates regression tests.', 'a pre-flight checklist run before every take-off.', 'each vendor update is tested by hand, so updates are delayed or break processes.', [
      o('SAP Cloud ALM', 'Proprietary', 'Implementation and operations management included with SAP cloud subscriptions.', 'https://learning.sap.com', [4,5,4,2,4], ['sap']),
      o('Tricentis Tosca', 'Proprietary', 'Model-based test automation widely used for ERP regression.', 'https://documentation.tricentis.com', [5,2,4,3,3], ['saas']),
      o('Playwright', 'OSS', 'Open source browser test automation; more scripting for ERP screens.', 'https://playwright.dev/docs/intro', [4,5,3,5,3])]),
    grc: C('Access control and compliance', 'x', 'Designs roles, enforces segregation of duties and evidences controls for auditors.', 'the rule that whoever orders goods cannot also approve paying for them.', 'one user can create a vendor and pay it, and audit findings and fraud risk follow.', [
      o('SAP GRC Access Control', 'Proprietary', 'Segregation-of-duties analysis and access requests for SAP.', 'https://learning.sap.com', [4,3,3,2,3], ['sap']),
      o('Saviynt', 'Proprietary', 'Cloud identity governance with SAP and non-SAP risk rules.', 'https://docs.saviyntcloud.com', [5,3,5,3,4], ['saas']),
      o('SailPoint', 'Proprietary', 'Identity governance and access certification at enterprise scale.', 'https://documentation.sailpoint.com', [5,2,5,3,4], ['saas'])]),
    hcm: C('HR core (HCM)', 'app', 'The employee record: organisation, positions, hires, moves and leavers.', 'the personnel file cabinet every other system asks first.', 'HR data lives in spreadsheets, and nobody knows who works where or reports to whom.', [
      o('Workday HCM', 'Proprietary', 'Unified SaaS HR with strong reporting and twice-yearly releases.', 'https://www.workday.com', [5,2,5,1,4], ['saas']),
      o('SAP SuccessFactors Employee Central', 'Proprietary', 'Cloud HR core that integrates natively with SAP payroll and finance.', 'https://learning.sap.com', [5,3,5,1,4], ['sap','saas']),
      o('OrangeHRM', 'OSS', 'Open source HR for smaller organisations.', 'https://www.orangehrm.com', [3,5,3,5,4])]),
    payroll: C('Payroll', 'app', 'Calculates pay, tax and deductions under each country\'s rules.', 'a specialist accountant per country who knows local tax law.', 'people are paid late or wrongly, the fastest way to lose trust in any HR programme.', [
      o('SAP SuccessFactors Employee Central Payroll', 'Proprietary', 'SAP payroll engine as a service, close to SAP finance.', 'https://learning.sap.com', [5,3,4,1,3], ['sap','saas']),
      o('Workday Payroll', 'Proprietary', 'Payroll inside Workday for supported countries.', 'https://www.workday.com', [4,3,5,1,4], ['saas']),
      o('ADP', 'Proprietary', 'Global payroll provider with local partners in many countries.', 'https://www.adp.com', [5,3,5,3,4], ['saas'])]),
    talent: C('Talent and learning', 'app', 'Recruiting, performance, goals and training records.', 'the career office and training academy.', 'compliance training goes untracked and skills stay invisible.', [
      o('Cornerstone', 'Proprietary', 'Learning and talent suite with strong compliance training.', 'https://www.cornerstoneondemand.com', [5,3,5,3,4], ['saas']),
      o('SAP SuccessFactors Learning', 'Proprietary', 'Learning management integrated with SAP HR.', 'https://learning.sap.com', [4,3,5,2,4], ['sap','saas']),
      o('Moodle', 'OSS', 'Open source learning platform; self-host or partner-hosted.', 'https://docs.moodle.org', [4,5,3,5,3])]),
    crmcore: C('CRM core', 'app', 'Accounts, contacts, opportunities and service cases in one place.', 'the shared memory of every customer conversation.', 'customer knowledge leaves when people do, and teams contradict each other.', [
      o('Salesforce Sales and Service Cloud', 'Proprietary', 'Market-leading CRM with a vast app ecosystem.', 'https://architect.salesforce.com', [5,2,5,2,5], ['saas']),
      o('Microsoft Dynamics 365', 'Proprietary', 'CRM tightly integrated with Microsoft 365 and Azure.', 'https://learn.microsoft.com/dynamics365/', [5,3,5,2,4], ['azure','saas']),
      o('SuiteCRM', 'OSS', 'Open source CRM you host and adapt.', 'https://docs.suitecrm.com', [3,5,3,5,3])]),
    itsm: C('IT service management', 'app', 'Incidents, requests, changes and the configuration database.', 'the IT front desk plus its record of every machine and service.', 'requests arrive by email, changes collide, and outages take longer to trace.', [
      o('ServiceNow ITSM', 'Proprietary', 'Enterprise standard for ITSM on a broad workflow platform.', 'https://www.servicenow.com/docs/', [5,2,5,2,4], ['saas']),
      o('Jira Service Management', 'Proprietary', 'Lighter ITSM that pairs with engineering teams already on Jira.', 'https://support.atlassian.com/jira-service-management-cloud/', [4,4,5,3,5], ['saas']),
      o('GLPI', 'OSS', 'Open source service desk and asset management.', 'https://glpi-project.org', [3,5,3,5,3])]),
    p2p: C('Procurement suite', 'app', 'Requisitions, catalogues, approvals, purchase orders and invoices.', 'a company shop with the spending rules built in.', 'buying happens off-contract by email, and spend stays invisible until invoices arrive.', [
      o('SAP Ariba', 'Proprietary', 'Procurement suite with a large supplier network.', 'https://learning.sap.com', [5,2,4,2,4], ['sap','saas']),
      o('Coupa', 'Proprietary', 'Spend management with strong user adoption and analytics.', 'https://compass.coupa.com', [5,2,5,3,4], ['saas']),
      o('Oracle Procurement Cloud', 'Proprietary', 'Procurement native to Oracle Fusion ERP.', 'https://docs.oracle.com/en/cloud/saas/', [5,2,5,2,4], ['saas'])]),
    idp: C('Identity and access', 'x', 'Single sign-on, roles and service-to-service trust.', 'a single badge office for the whole company.', 'separate logins per system, leavers keep access, and audits fail.', [
      o('Keycloak', 'OSS', 'Full OIDC and SAML server you control; no per-user fees.', 'https://www.keycloak.org/documentation', [4,5,2,5,3]),
      o('Okta', 'Proprietary', 'Workforce and customer identity as a service; fast SSO.', 'https://developer.okta.com/docs/', [5,2,5,3,5], ['saas']),
      o('Microsoft Entra ID', 'Proprietary', 'Default where Microsoft 365 already runs the workforce.', 'https://learn.microsoft.com/entra/', [5,3,5,2,5], ['azure','saas'])]),
    obs: C('Observability', 'x', 'Metrics, logs and traces to see and fix problems fast.', 'the instruments in a cockpit.', 'you learn about outages from customers and cannot find the cause.', [
      o('OpenTelemetry + Grafana', 'OSS', 'Vendor-neutral telemetry; swap back ends at will.', 'https://opentelemetry.io/docs/', [5,5,3,5,3]),
      o('Datadog', 'Proprietary', 'Unified metrics, logs and traces out of the box.', 'https://docs.datadoghq.com', [5,2,5,3,5], ['saas']),
      o('Azure Monitor', 'Proprietary', 'Native monitoring across Azure resources.', 'https://learn.microsoft.com/azure/azure-monitor/', [4,4,5,2,4], ['azure'])])
  };
  const signals = {
    'Valkey (Redis-compatible)': 'Linux Foundation fork created in 2024 after the Redis licence change.',
    'MongoDB Atlas': 'Server is SSPL-licensed; check your open source policy.',
    'Elastic Cloud': 'Elasticsearch added an AGPL option in 2024 alongside its own licences.',
    'Apache Kafka': 'KRaft mode has replaced ZooKeeper; plan upgrades accordingly.',
    'Kong Gateway': 'Some enterprise plugins need a paid licence.',
    'Apache Iceberg + Spark': 'Iceberg is now read and written by most major data platforms.',
    'Model Context Protocol (MCP)': 'Fast-moving specification; pin versions and track changes.',
    'Agent2Agent (A2A) protocol': 'Young protocol; expect breaking changes.',
    'CrewAI': 'Rapid release cadence; review changelogs before upgrades.',
    'Memcached': 'Mature and stable; few new features.',
    'SAP S/4HANA Cloud, private edition (RISE)': 'Mainstream maintenance for SAP ECC ends in 2027, which drives most current migrations.',
    'Odoo': 'Community edition is open source; many modules need the paid Enterprise edition.',
    'MuleSoft Anypoint': 'Capacity-based pricing; model cost as the number of integrations grows.'
  };
  const apps = {
    ecom: { n: 'E-commerce marketplace', d: 'Catalogue, cart, checkout and orders with seasonal peaks.', req: 'a customer opens a product page', c: ['ui','edge','lb','gw','idp','app','cache','db','search','mq','obs'],
      caps: ['Customer engagement','Catalogue and pricing','Order to cash','Fulfilment and returns'],
      nb: [['ERP','Finance and inventory','events and batch'],['CRM','Customer 360','REST API'],['Payment provider','Cards and wallets','REST API and webhooks'],['Warehouse system','Pick, pack, ship','events'],['Enterprise data platform','Analytics','change-data-capture']],
      dom: ['Customer','Product','Order','Inventory','Payment'],
      shelf: [['Building Microservices, Sam Newman','Book','https://samnewman.io/books/building_microservices_2nd_edition/'],['Microservice patterns catalogue','Patterns','https://microservices.io/patterns/']], sig: [] },
    genai: { n: 'GenAI knowledge assistant', d: 'Retrieval-augmented answers and agents over company documents.', req: 'an employee asks a question', c: ['ui','gw','idp','app','orch','vec','llm','guard','db','obs'],
      caps: ['Knowledge management','Employee service','Research insight','Regulatory writing support'],
      nb: [['Document management','SharePoint, wikis','connector sync'],['IT and HR service desk','Ticket actions','REST API as agent tools'],['Enterprise search','Existing index','federated query'],['AI governance','Approvals and evals','policy API'],['Enterprise data platform','Structured facts','SQL or API']],
      dom: ['Documents','Embeddings','Conversations','Feedback and evals'],
      shelf: [['Hugging Face model hub','Models','https://huggingface.co/models'],['Building effective agents','Article','https://www.anthropic.com/engineering/building-effective-agents']], sig: [] },
    iot: { n: 'Real-time IoT analytics', d: 'Ingest device telemetry, detect anomalies, serve live dashboards.', req: 'a sensor sends a reading', c: ['ui','ingest','gw','idp','stream','mq','tsdb','lake','obs'],
      caps: ['Asset performance','Predictive maintenance','Quality monitoring','Supply visibility'],
      nb: [['MES','Production orders','events'],['ERP maintenance','Work orders','REST API'],['OT historian','Plant data','OPC UA bridge'],['Digital twin','Asset models','API'],['Enterprise data platform','Long-term analytics','batch and stream']],
      dom: ['Device','Telemetry','Asset','Alert'],
      shelf: [['Azure IoT reference architecture','Reference','https://learn.microsoft.com/azure/architecture/reference-architectures/iot'],['Apache Flink use cases','Docs','https://flink.apache.org/what-is-flink/use-cases/']], sig: [] },
    data: { n: 'Enterprise data and analytics platform', d: 'Integrate source systems into governed data products for BI and AI.', req: 'an analyst opens a dashboard', c: ['bi','integ','gw','idp','lake','catalog','mq','obs'],
      caps: ['Clinical and R&D insight','Commercial analytics','Regulatory reporting','AI and ML enablement'],
      nb: [['Source systems','EDC, CTMS, LIMS','CDC and batch'],['ERP','Finance and supply','batch'],['CRM','Customer engagement','API'],['Master data management','Golden records','API and events'],['AI and ML platform','Feature use','table access']],
      dom: ['Study','Product','Customer','Site','Finance'],
      shelf: [['Data Mesh, Zhamak Dehghani','Book','https://www.oreilly.com/library/view/data-mesh/9781492092384/'],['Data Engineering Zoomcamp','GitHub course','https://github.com/DataTalksClub/data-engineering-zoomcamp']], sig: [] },
    stream: { n: 'Netflix-style streaming platform', d: 'Global video delivery with personalisation and extreme resilience.', req: 'a member presses play', c: ['ui','edge','gw','idp','app','mesh','media','reco','cache','nosql','mq','lake','obs'],
      caps: ['Content acquisition','Personalised discovery','Playback and delivery','Subscriptions and billing'],
      nb: [['Billing and payments','Subscriptions','REST API'],['Content rights system','Licences and windows','events'],['Studio production tools','Media assets','batch'],['Partner devices','TVs and consoles','device SDK'],['Enterprise data platform','Viewing analytics','event stream']],
      dom: ['Member','Title','Playback session','Rights','Recommendation'],
      shelf: [['Netflix Tech Blog','Engineering blog','https://netflixtechblog.com'],['Chaos Engineering, Rosenthal and Jones','Book','https://www.oreilly.com/library/view/chaos-engineering/9781492043850/']],
      sig: [['Own CDN at the edge','Netflix places Open Connect appliances inside ISP networks so most video bytes travel a short distance.','https://openconnect.netflix.com'],
        ['Chaos engineering','Failures are injected on purpose in production, starting with the open source Chaos Monkey.','https://github.com/Netflix/chaosmonkey'],
        ['Regional evacuation','Traffic can be shifted away from a failing cloud region to healthy ones.','https://netflixtechblog.com'],
        ['Event pipeline for personalisation','Viewing events stream through Kafka-based pipelines into analytics and ranking.','https://netflixtechblog.com']] },
    retail: { n: 'Walmart-style omnichannel retail', d: 'Stores, web and app on one inventory and order backbone at holiday peak.', req: 'a shopper checks stock at a nearby store', c: ['ui','edge','gw','idp','app','mesh','cache','db','search','mq','stream','lake','obs'],
      caps: ['Omnichannel commerce','Store operations','Supply chain and inventory','Pricing and promotions'],
      nb: [['Point of sale','Store checkout','events'],['Store edge systems','In-store compute','sync and events'],['Supplier portal','EDI and APIs','EDI and REST'],['ERP','Finance','batch'],['Logistics and fulfilment','DCs and last mile','events']],
      dom: ['Item','Inventory position','Order','Store','Customer'],
      shelf: [['Walmart Global Tech blog','Engineering blog','https://medium.com/walmartglobaltech'],['Enterprise Integration Patterns, Hohpe and Woolf','Book','https://www.enterpriseintegrationpatterns.com']],
      sig: [['Hybrid multi-cloud','Public engineering posts describe workloads spread across two public clouds and private data centres.','https://medium.com/walmartglobaltech'],
        ['Store as an edge node','Local compute in stores keeps checkout running if the network link drops.','https://medium.com/walmartglobaltech'],
        ['One inventory truth','Inventory changes stream to web, app and stores to support buy online, pick up in store.','https://www.enterpriseintegrationpatterns.com'],
        ['Peak readiness','Load tests, capacity reserves and change freezes ahead of holiday events.','https://aws.amazon.com/architecture/well-architected/']] },
    agents: { n: 'Multi-agent system', d: 'Specialised agents coordinated by a supervisor, using tools through standard protocols.', req: 'a user assigns a research task', c: ['ui','gw','idp','app','agents','tools','llm','mem','vec','guard','mq','obs'],
      caps: ['Research and analysis','Workflow automation','Decision support','Knowledge work'],
      nb: [['Enterprise systems as tools','ERP, CRM, ITSM','MCP servers'],['Document stores','Knowledge sources','connectors'],['Human approvers','Review queues','task inbox'],['AI governance','Policy and evals','policy API'],['Identity platform','Agent identities','OAuth scopes']],
      dom: ['Task','Agent run trace','Memory','Tool result','Evaluation'],
      shelf: [['How we built our multi-agent research system','Article','https://www.anthropic.com/engineering/multi-agent-research-system'],['Model Context Protocol','Specification','https://modelcontextprotocol.io']],
      sig: [['Orchestrator and workers','A lead agent plans, spawns sub-agents that work in parallel, then synthesises their findings.','https://www.anthropic.com/engineering/multi-agent-research-system'],
        ['Tools through MCP','Agents reach enterprise systems through standard servers rather than bespoke glue code.','https://modelcontextprotocol.io'],
        ['Human in the loop','Irreversible actions pause for approval at defined checkpoints.','https://langchain-ai.github.io/langgraph/'],
        ['Trace and budget every run','Each run is traced and evaluated, with token spend capped per task.','https://langfuse.com/docs']] },
    ride: { n: 'Uber-style real-time marketplace', d: 'Match riders and drivers in seconds with live location and dynamic pricing.', req: 'a rider requests a car', c: ['ui','edge','gw','idp','app','geo','stream','mq','cache','nosql','db','lake','obs'],
      caps: ['Rider experience','Dispatch and matching','Pricing','Driver operations'],
      nb: [['Payments','Fares and payouts','REST API'],['Maps provider','Routing and ETAs','API'],['Fraud and risk','Scoring','events'],['Customer support','Trips and refunds','API'],['Enterprise data platform','Marketplace analytics','event stream']],
      dom: ['Trip','Rider','Driver','Location ping','Fare'],
      shelf: [['Uber Engineering blog','Engineering blog','https://www.uber.com/blog/engineering/'],['H3 geospatial index','GitHub','https://github.com/uber/h3']],
      sig: [['Hexagonal geo index','Uber open-sourced H3 to bucket the world into hexagons for fast nearby search.','https://h3geo.org'],
        ['Domain-oriented microservices','Thousands of services grouped into domains with a gateway per domain.','https://www.uber.com/blog/microservice-architecture/'],
        ['Streams for matching and surge','Location pings flow through streams that feed dispatch and dynamic pricing.','https://www.uber.com/blog/engineering/']] },
    sap: { kind: 'impl', n: 'SAP S/4HANA ERP implementation', d: 'Global ERP template rolled out across regions, with clean core and governed master data.', req: 'a buyer posts a purchase order',
      c: ['ux','idp','erpcore','ext','ipaas','mdm','migr','bi','lake','proc','alm','grc','obs'], path: ['ux','idp','ext','erpcore','mdm','ipaas'],
      caps: ['Record to report','Procure to pay','Order to cash','Plan to produce','Quality and compliance'],
      nb: [['Manufacturing execution (MES)','Shop floor orders','events and APIs'],['Quality and LIMS','Batch release','API'],['CRM','Customer orders','API'],['HR system','Organisation and cost centres','API'],['Banks and tax authorities','Payments and e-invoicing','files and APIs'],['Suppliers and logistics','Trading partners','EDI']],
      dom: ['Material','Customer','Vendor','Batch','GL account','Cost centre'],
      shelf: [['SAP Learning: S/4HANA and SAP Activate','Course','https://learning.sap.com'],['SAP Discovery Center: BTP reference architectures','Reference','https://discovery-center.cloud.sap'],['ISPE GAMP 5 (validation of computerised systems)','Guidance','https://ispe.org/publications/guidance-documents/gamp-5-guide-2nd-edition']],
      sig: [['Clean core','Keep the standard system unmodified and build custom logic side-by-side, so upgrades stay routine.','https://learning.sap.com'],
        ['Global template, local rollouts','Design processes once, then roll out in waves by region or business unit with justified local variants.','https://learning.sap.com'],
        ['Choose the transition approach','Greenfield reimplementation, brownfield conversion from ECC, or selective data transition. The choice drives cost, risk and how much history moves.','https://learning.sap.com'],
        ['Master data first','Material, customer and vendor records are cleansed before migration; bad master data is a leading cause of go-live pain.','https://learning.sap.com'],
        ['The 2027 deadline','SAP set 2027 as the end of mainstream maintenance for ECC, with optional extended support to 2030.','https://news.sap.com/2020/02/sap-s4hana-maintenance-2040-clarity-choice-sap-business-suite-7/'],
        ['Validated for GxP','In life sciences, the system is validated against intended use, with risk-based testing and audit trails.','https://ispe.org/publications/guidance-documents/gamp-5-guide-2nd-edition']] },
    hr: { kind: 'impl', n: 'HR system (HCM) implementation', d: 'Core HR, payroll and talent for a global workforce, feeding identity and finance.', req: 'a manager approves a new hire',
      c: ['ux','idp','hcm','payroll','talent','ipaas','migr','bi','alm','grc','obs'], path: ['ux','idp','hcm','ipaas','payroll','talent'],
      caps: ['Hire to retire','Pay and benefits','Talent and learning','Workforce planning'],
      nb: [['ERP finance','Cost centres and postings','API'],['Identity platform','Joiner, mover, leaver','SCIM provisioning'],['Benefits and pension providers','Enrolment','files and APIs'],['Recruiting job boards','Candidates','API'],['Time and attendance','Clock data','API']],
      dom: ['Worker','Position','Organisation','Compensation','Absence'],
      shelf: [['SAP Learning: SuccessFactors','Course','https://learning.sap.com'],['SCIM provisioning standard (RFC 7644)','Standard','https://datatracker.ietf.org/doc/html/rfc7644'],['GDPR full text','Regulation','https://gdpr-info.eu']],
      sig: [['HR as the identity source','The HR record drives joiner, mover and leaver events that create and remove accounts everywhere.','https://datatracker.ietf.org/doc/html/rfc7644'],
        ['Country-by-country payroll','Payroll is local law; most global firms run one HR core with regional payroll engines or partners.','https://learning.sap.com'],
        ['Parallel payroll runs','Run old and new payroll side by side for several cycles and reconcile every difference before switching.','https://learning.sap.com'],
        ['Privacy by design','Employee data is sensitive; role-based access and regional residency are design inputs, not afterthoughts.','https://gdpr-info.eu']] },
    crm: { kind: 'impl', n: 'CRM implementation', d: 'Sales, service and marketing on one customer record, integrated with ERP.', req: 'a sales rep logs a customer meeting',
      c: ['ux','idp','crmcore','ipaas','mdm','migr','bi','lake','alm','grc','obs'], path: ['ux','idp','crmcore','mdm','ipaas'],
      caps: ['Lead to opportunity','Customer service','Marketing engagement','Account management'],
      nb: [['ERP','Orders and invoices','API'],['Marketing automation','Campaigns','API'],['Contact centre','Calls and chat','telephony integration'],['Enterprise data platform','Customer analytics','change-data-capture']],
      dom: ['Account','Contact','Opportunity','Case','Consent'],
      shelf: [['Salesforce Architects','Reference','https://architect.salesforce.com'],['GDPR full text','Regulation','https://gdpr-info.eu']],
      sig: [['Single customer view','Master data and matching give every team the same customer record.','https://architect.salesforce.com'],
        ['Consent as data','Marketing consent and preferences are stored and enforced as first-class data.','https://gdpr-info.eu']] },
    itsm: { kind: 'impl', n: 'IT service management platform', d: 'Incidents, requests, changes and the configuration database for enterprise IT.', req: 'an employee raises an IT ticket',
      c: ['ux','idp','itsm','aiops','runbook','ipaas','migr','bi','alm','obs'], path: ['ux','idp','itsm','ipaas'],
      caps: ['Incident management','Request fulfilment','Change management','Asset and configuration'],
      nb: [['Monitoring tools','Alerts to incidents','events'],['Identity platform','Access requests','SCIM and API'],['HR system','Onboarding tasks','API'],['Asset discovery','Configuration feed','API']],
      dom: ['Incident','Request','Change','Configuration item'],
      shelf: [['ServiceNow documentation','Docs','https://www.servicenow.com/docs/']],
      sig: [['Configuration database as backbone','A trusted CMDB links incidents and changes to the services they affect.','https://www.servicenow.com/docs/'],
        ['Shift left','Self-service and knowledge articles resolve common requests before they reach an agent.','https://www.servicenow.com/docs/'],
        ['Triage agent','An agent reads correlated alerts, checks recent changes and the CMDB, then sets priority, assignment group and a likely cause on the incident.','https://www.servicenow.com/docs/'],
        ['Auto-remediation with approval','Known fixes run from approved runbooks. Start with read-only diagnostics, then low-risk fixes, with a person approving anything with wider impact.','https://sre.google/sre-book/eliminating-toil/'],
        ['Change-risk scoring','Each change is scored from its size, the services it touches and past failures, so the change board spends its time on the risky few.','https://sre.google/workbook/canarying-releases/'],
        ['Answers grounded in the CMDB','Agents answer from the configuration database and knowledge base, and cite them, so advice matches the real estate.','https://www.servicenow.com/docs/']] },
    procure: { kind: 'impl', n: 'Procurement (source to pay) implementation', d: 'Guided buying, supplier collaboration and invoice matching on top of ERP.', req: 'a buyer raises a purchase requisition',
      c: ['ux','idp','p2p','erpcore','ipaas','mdm','bi','grc','obs'], path: ['ux','idp','p2p','erpcore','ipaas'],
      caps: ['Source to contract','Procure to pay','Supplier management','Spend analytics'],
      nb: [['Supplier network','Catalogues and invoices','EDI and portal'],['ERP finance','Postings and payments','API'],['Contract repository','Terms','API'],['Risk data providers','Supplier risk scores','API']],
      dom: ['Supplier','Contract','Requisition','Purchase order','Invoice'],
      shelf: [['SAP Learning: Ariba','Course','https://learning.sap.com'],['Coupa Compass','Docs','https://compass.coupa.com']],
      sig: [['Guided buying','Users buy from approved catalogues by default, so policy compliance is built in.','https://learning.sap.com'],
        ['Three-way match','Invoices are paid only when purchase order, goods receipt and invoice agree.','https://learning.sap.com']] }
  };
  const shelf = [
    ['Designing Data-Intensive Applications, Martin Kleppmann','Book','https://dataintensive.net'],
    ['Fundamentals of Software Architecture, Richards and Ford','Book','https://fundamentalsofsoftwarearchitecture.com'],
    ['System Design Primer','GitHub','https://github.com/donnemartin/system-design-primer'],
    ['AWS Well-Architected Framework','White paper','https://aws.amazon.com/architecture/well-architected/'],
    ['Azure Architecture Center','Reference','https://learn.microsoft.com/azure/architecture/'],
    ['TOGAF Standard, 10th Edition','Framework','https://www.opengroup.org/togaf'],
    ['ByteByteGo system design','Video','https://www.youtube.com/@ByteByteGo']
  ];
  const patterns = [
    { app: 'sap', keys: ['sap','s/4','s4hana','s/4hana','erp','ecc','rise with sap','oracle fusion','general ledger','finance system','record to report','order to cash'] },
    { app: 'hr', keys: ['hr','hcm','human resources','workday','successfactors','payroll','talent','recruit','onboarding','workforce'] },
    { app: 'crm', keys: ['crm','salesforce','dynamics 365','customer relationship','sales cloud','service cloud'] },
    { app: 'itsm', keys: ['itsm','servicenow','service desk','helpdesk','help desk','ticketing','itil'] },
    { app: 'procure', keys: ['procurement','ariba','coupa','source to pay','procure to pay','purchasing','supplier'] },
    { app: 'agents', keys: ['multi-agent','multiagent','multi agent','agentic','agents','agent swarm','crew'] },
    { app: 'stream', keys: ['netflix','spotify','youtube','disney','streaming','video on demand','ott','music'] },
    { app: 'retail', keys: ['walmart','tesco','omnichannel','amazon','retail','grocery','stores'] },
    { app: 'ride', keys: ['uber','lyft','doordash','ola','swiggy','zomato','ride','dispatch','courier','food delivery','hailing'] },
    { app: 'ecom', keys: ['e-commerce','ecommerce','marketplace','checkout','shop','etsy','shopify'] },
    { app: 'genai', keys: ['rag','chatbot','knowledge','assistant','copilot','llm','genai'] },
    { app: 'iot', keys: ['iot','sensor','device','telemetry','factory','plant'] },
    { app: 'data', keys: ['data platform','lakehouse','warehouse','analytics','data mesh','reporting'] }
  ];
  const traits = [
    [['video','media','streaming'], ['media','edge']], [['search'], ['search']], [['real-time','realtime'], ['stream','mq']],
    [['recommend','personalis','personaliz'], ['reco']], [['location','geo','nearby'], ['geo']], [['agent'], ['agents','tools','mem']],
    [['ai','llm','gpt','claude','genai'], ['llm','guard']], [['report','dashboard','analytics','bi'], ['lake','bi']],
    [['global','million','billion','scale'], ['edge','cache']], [['iot','device','sensor'], ['ingest','tsdb']], [['event'], ['mq']],
    [['microservice','mesh'], ['mesh']], [['document','knowledge'], ['vec']]
  ];
  const glossary = {
    cdn: ['CDN','Content delivery network: servers worldwide that keep copies of your content close to users.','small local warehouses so deliveries arrive faster.'],
    waf: ['WAF','Web application firewall: filters malicious web requests before they reach your code.','a bouncer who checks bags at the door.'],
    gateway: ['API gateway','One entry point for all API calls that handles login checks, rate limits and routing.','a reception desk for your services.'],
    lb: ['Load balancer','Spreads incoming requests across several servers and skips unhealthy ones.','a restaurant host seating guests across waiters.'],
    cache: ['Cache','A fast, in-memory copy of frequently read data.','keeping bestsellers at the counter instead of the stockroom.'],
    queue: ['Queue or event bus','A buffer where one service drops messages and others pick them up when ready.','an inbox between teams.'],
    monolith: ['Modular monolith','One deployable application with clean internal boundaries between modules.','one building with well-separated departments.'],
    micro: ['Microservices','Small, independently deployed services, each owning one business area.','separate shops in a mall, each with its own staff.'],
    k8s: ['Kubernetes','Open source system that runs, restarts and scales containers across machines.','a port crane system moving standard shipping containers.'],
    serverless: ['Serverless','You upload code; the provider runs it per request and bills per use.','a taxi instead of owning a car.'],
    oss: ['Open source (OSS)','Software whose code anyone can use and change; you run it yourself or pay someone to.','a public recipe: free to cook, but you do the cooking.'],
    lockin: ['Lock-in','The cost and effort of leaving a vendor once you depend on it.','a phone contract with a steep exit fee.'],
    sla: ['Availability and SLA','The share of time a service works. 99.9% allows about 43 minutes of downtime a month.','a shop\'s promised opening hours.'],
    latency: ['Latency','How long one request takes, in milliseconds. Users notice beyond about a second.','the wait between ordering and your coffee arriving.'],
    rps: ['Throughput (RPS)','Requests per second the system handles.','customers served per minute at a till.'],
    shard: ['Sharding','Splitting data across several databases by a key, so no single one holds everything.','splitting a phone book into A to M and N to Z.'],
    replica: ['Replica','A synchronised copy of a database, used for extra reads or for failover.','a backup generator that is always warm.'],
    sso: ['SSO and OIDC','One login for many apps. OIDC is the standard protocol behind most of them.','one staff badge that opens every door you are allowed through.'],
    mtls: ['mTLS','Both sides of a connection prove their identity with certificates.','two people showing each other ID before talking.'],
    cdc: ['CDC','Change-data-capture: every database change is streamed to other systems as it happens.','a live news feed of edits to a ledger.'],
    adr: ['ADR','Architecture decision record: a short note of the context, the decision, the alternatives and the consequences.','the minutes of the meeting that mattered.'],
    time: ['TIME model','Classifies applications as Tolerate, Invest, Migrate or Eliminate.','sorting a wardrobe into keep, upgrade, alter or donate.'],
    stride: ['STRIDE','Six threat types: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.','a checklist a security guard runs on every door.'],
    rpo: ['RPO and RTO','Recovery point objective: how much data you can lose. Recovery time objective: how long you can be down.','how many pages of notes you can afford to lose, and how fast you must be writing again.'],
    rag: ['RAG','Retrieval-augmented generation: find relevant documents first, then have the model answer from them.','an open-book exam rather than answering from memory.'],
    mcp: ['MCP','Model Context Protocol: an open standard for connecting AI agents to tools and data.','USB for AI tools.'],
    postmortem: ['Postmortem','A blameless write-up of an incident: what happened, why, and what will change.','an air accident report that fixes the system, not the pilot.'],
    capmap: ['Capability map','A map of what the business does, independent of which systems do it.','a job description for the whole company.'],
    togaf: ['TOGAF','A widely used enterprise architecture framework with business, data, application and technology layers.','a building code for enterprise technology.']
  };
  const stepTerms = { tour: ['monolith','cache','gateway','sla','adr'], brief: ['rps','sla','oss','monolith'], blueprint: ['cdn','waf','gateway','lb','cache','queue','latency','sso','rag'],
    outcomes: ['oss','lockin','k8s','serverless','sla'], compare: ['sla','latency','lockin','cdc'], decisions: ['adr','lockin'], evolve: ['monolith','micro','shard','replica','cdc'],
    enterprise: ['togaf','capmap','time','sso'], drill: ['rpo','postmortem','stride','mtls'], review: ['adr','stride','rpo'] };
  const hopDef = { ui: ['Browser or app sends the request', 20], edge: ['CDN checks for a cached copy and filters attacks', 10], lb: ['Load balancer picks a healthy instance', 1],
    gw: ['Gateway checks the token and rate limit, then routes', 5], mesh: ['Mesh adds mutual TLS and retries between services', 2], app: ['Service runs the business logic', 15],
    ingest: ['Broker authenticates the device and accepts the reading', 5], integ: ['Pipeline has already landed fresh source data', 0], agents: ['Supervisor agent plans and hands tasks to worker agents', 800],
    orch: ['Orchestrator builds the prompt and gathers context', 30], tools: ['Agents call enterprise tools through the protocol', 120], mem: ['Agent memory recalls prior context', 10],
    vec: ['Vector store finds the most relevant passages', 20], media: ['Media origin serves the right video segment', 40], reco: ['Ranking model orders titles for this user', 30],
    geo: ['Geo index finds nearby matches', 5], stream: ['Stream job updates windows and raises alerts', 20], cache: ['Cache is checked first', 1],
    db: ['Database reads or writes the record', 8], nosql: ['Wide-column store reads profile or history', 5], tsdb: ['Time-series store writes the reading', 5],
    search: ['Search engine returns ranked results', 25], lake: ['Lakehouse query scans the curated table', 900], bi: ['Dashboard renders the chart', 200],
    llm: ['Model generates the answer', 1500], guard: ['Guardrails check the answer before it is shown', 50], mq: ['Event published for other services (asynchronous)', 0],
    ux: ['User opens the task in the enterprise launchpad', 40], idp: ['Single sign-on confirms who the user is and their roles', 30], ext: ['Extension app applies custom rules outside the core', 50],
    erpcore: ['ERP checks budget and pricing, posts the document and updates the ledger', 300], mdm: ['Material and vendor are validated against golden records', 20],
    ipaas: ['Integration platform forwards the change to connected systems (asynchronous)', 0], hcm: ['HR core records the change and routes approvals', 250],
    payroll: ['Payroll picks up the change in the next pay run (batch)', 0], talent: ['Learning plan assigned to the new hire (asynchronous)', 0],
    crmcore: ['CRM saves the activity against the account', 200], itsm: ['ITSM creates the ticket and routes it to the right queue', 200],
    p2p: ['Procurement suite checks catalogue, budget and approval policy', 250],
    aigw: ['AI gateway checks quota, routes to the right model and logs the call', 15], embai: ['Embedded copilot drafts the next step from the user\'s context', 1200],
    hitl: ['A person reviews and approves before anything irreversible happens', -1],
    obs: ['Monitoring detects a problem and raises an alert', 5], aiops: ['Correlation groups related alerts into one incident with a likely cause', 30], runbook: ['Approved runbook runs the fix: restart, scale or roll back', 2000] };
  const hopOrder = ['ui','bi','edge','lb','gw','mesh','app','ingest','agents','orch','tools','mem','vec','media','reco','geo','stream','cache','db','nosql','tsdb','search','lake','aigw','llm','guard','mq'];
  const stores = ['db','nosql','tsdb','search'];
  const layerNames = { exp: 'Experience', edge: 'Edge and access', app: 'Application and intelligence', data: 'Data and events', x: 'Cross-cutting' };
  const shared = ['idp','obs','gw','edge','lake','catalog','integ','mesh','ipaas','mdm','grc','alm'];
  const introAt = { cache: 1, mq: 1, search: 1, vec: 1, guard: 0, edge: 1, mem: 1, tsdb: 1, media: 1, geo: 1, lb: 1, stream: 2, reco: 2, nosql: 2, catalog: 2, mesh: 2, lake: 2 };
  const implIntro = { proc: 0, mdm: 0, idp: 1, grc: 1, alm: 1, erpcore: 2, ext: 2, ipaas: 2, migr: 2, hcm: 2, payroll: 2, talent: 2, crmcore: 2, itsm: 2, p2p: 2, ux: 2, bi: 3, lake: 3, obs: 3, aigov: 0, embai: 2, aigw: 2, guard: 2, agents: 2, tools: 2, llm: 2 };
  const implStages = [['Discover','scope and approach'],['Explore','fit-to-standard'],['Realize','build and test'],['Deploy and run','cutover and hypercare']];
  const implMoves = [
    ['Business case, scope and transition approach (greenfield, brownfield or selective)','Process mining on the current system to see how work really flows','Data quality assessment of master data','Programme governance, design authority and partner selection'],
    ['Fit-to-standard workshops against best-practice processes','Global template defined; local variants justified case by case','Integration and extension inventory with clean-core decisions','Validation plan if the data or processes are regulated (GxP)'],
    ['Configure the core, build extensions beside it, build integrations','Migration rehearsals (mock loads) with reconciliation sign-off','Test cycles: integration, user acceptance, performance and regression','Role design with segregation-of-duties checks'],
    ['Rehearsed hour-by-hour cutover with go/no-go gates','Hypercare: heightened support for several weeks after go-live','Regional rollouts of the template in waves','Decommission legacy systems and archive history']
  ];
  const aiMoves = {
    system: { enabled: ['AI: one assistive use case with human review and an evaluation set','AI: gateway with budgets, caching and prompt versioning','AI: continuous evaluation and drift monitoring per use case','AI: regional model hosting for residency and multi-model routing'],
      native: ['AI: one agent with narrow tools, full tracing and human approval on every action','AI: agents gain scoped permissions as evaluations prove reliability','AI: multi-agent workflows with budgets, kill switches and audit','AI: agents operate across regions with policy enforced at the gateway'] },
    impl: { enabled: ['AI: use-case inventory and risk classification','AI: decide embedded vendor AI versus your own assistants; check data readiness','AI: ground copilots in governed master data; evaluation sets per use case','AI: monitor adoption, accuracy and cost after go-live'],
      native: ['AI: redesign processes around agents; decide which steps an agent can own end to end','AI: expose processes as governed tools (APIs or MCP) with agent roles and permissions','AI: agents run approved steps; people approve postings above thresholds','AI: review agent accuracy, cost and exceptions like any team\'s performance'] }
  };
  const lvlOf = { aiops: 2, runbook: 2, edge: 2, lb: 2, cache: 2, mq: 2, search: 2, mem: 2, aigw: 2, aigov: 3, stream: 2, nosql: 2, mesh: 3, catalog: 3, reco: 3, migr: 2, mdm: 2, ext: 2, alm: 2, talent: 2, proc: 3, grc: 3 };
  const nonCrit = ['obs','lake','bi','catalog','reco','search','guard','integ','media','mem','migr','proc','alm','grc','talent','payroll','ipaas'];
  const tour = [
    ['The brief', 'An online shop: 1M users, sales-day peaks, card payments. Before naming any product, a senior architect asks how many requests, how much data, how bad downtime is, and how sensitive the data is.', [], 'Constraints decide trade-offs. Products come last.'],
    ['Users arrive', 'Customers use a web front end. Static files such as images and scripts come from a CDN close to them, which also filters attacks.', ['Web and mobile front end','CDN and web firewall'], 'Most of a page is static. Serve it from the edge and your servers see far less traffic.'],
    ['One front door', 'Every API call passes an API gateway that checks who you are, limits abusive traffic and routes to the right service.', ['API gateway','Identity and access'], 'Security in one place is easier to get right than security in fifty places.'],
    ['The business logic', 'Application services run in managed containers. The team starts with a modular monolith and splits out services only when a part needs to scale or change on its own.', ['Application services'], 'Microservices solve team and scale problems. Without those problems they only add cost.'],
    ['The source of truth', 'Orders and payments go into PostgreSQL. Money needs strong consistency: a payment must never be half-recorded.', ['Operational database'], 'Choose the data store from the shape of the data: relational for transactions, others for other shapes.'],
    ['Speed for reads', 'Product pages are read about a hundred times for every change. A cache serves them from memory in about a millisecond and shields the database on sale days.', ['Cache'], 'Find the read-to-write ratio. It tells you where caching pays.'],
    ['Decouple the slow parts', 'When an order is placed, the service publishes an event. Warehouse, email and analytics react in their own time, so checkout stays fast.', ['Events and messaging'], 'If the user does not need to wait for it, do not make them.'],
    ['See and decide', 'Observability shows what is happening. Every choice gets a decision record. The team chose a managed database: it costs more, but nobody is woken at 3am to fail it over.', ['Observability'], 'Every design accepts trade-offs. Name them and write them down.']
  ];
  const Q = (q, o, a, why) => ({ q, o, a, why });
  const quizzes = {
    tour: { take: 'Constraints first, then components, then products. Every box exists because of a requirement.', qs: [
      Q('Why does the worked example start with constraints before technology?', ['Vendors require it','Constraints decide which trade-offs are acceptable','Technologies are interchangeable'], 1, 'Scale, data sensitivity and availability rule options in or out before any product is named.'),
      Q('Why does every component in the walkthrough come with a reason?', ['Vendors require a justification','So you can defend it, and remove it if the reason disappears','It makes the diagram complete'], 1, 'A component without a requirement behind it is cost and risk with no return.')] },
    blueprint: { take: 'Each layer has a job: experience, edge, application, data, plus cross-cutting services. Removing a box shows why it exists.', qs: [
      Q('What does an API gateway mainly give you?', ['Faster database queries','Cheaper hosting','One front door for auth, rate limits and routing'], 2, 'Centralising these concerns avoids every service re-implementing them inconsistently.'),
      Q('Why put a queue between services?', ['So a slow or failed service does not block the others','To encrypt traffic','To shrink the code base'], 0, 'The sender drops work in and moves on; the receiver catches up when it can.')] },
    outcomes: { take: 'Open source trades licence cost for operational effort; managed services trade effort for lock-in.', qs: [
      Q('Running open source yourself usually trades licence cost for…', ['Lower scalability','More operational effort','Weaker security'], 1, 'You own upgrades, patching, backups and on-call.'),
      Q('A managed proprietary service mainly buys you…', ['Less to run, at the price of lock-in','Unlimited scale at no cost','Zero vendor risk'], 0, 'The provider runs it, but leaving later costs effort and money.')] },
    compare: { take: 'Availability multiplies along the critical path, so every extra hop costs a little reliability.', qs: [
      Q('Three components at 99.9% each, in series, give roughly…', ['99.9%','99.99%','99.7%'], 2, '0.999 × 0.999 × 0.999 ≈ 0.997. A chain is weaker than its weakest link.'),
      Q('Two outcomes score 72 and 74. What matters more than the gap?', ['The shortcomings and trade-offs behind each score','The higher number, always','Which has more open source'], 0, 'Scores compress judgement. One blocking shortcoming outweighs two points.')] },
    decisions: { take: 'Write down context, decision, alternatives and consequences so choices survive people moving on.', qs: [
      Q('An architecture decision record captures…', ['Only the final product name','Context, decision, alternatives and consequences','Meeting attendance'], 1, 'The reasoning matters as much as the outcome; it lets others challenge or revisit it.'),
      Q('Why record the options you rejected?', ['So the same debate is not repeated later','For marketing','To make the document longer'], 0, 'New joiners will ask "why not X?". The record answers them.')] },
    evolve: { take: 'Start simple and add complexity when measured load demands it.', qs: [
      Q('A sensible starting shape for most new products is…', ['Hundreds of microservices','A modular monolith on managed services','Multi-region from day one'], 1, 'It keeps change cheap while you learn what users actually need.'),
      Q('When should you shard a database?', ['When measured load requires it','On day one, to be safe','Never'], 0, 'Sharding adds lasting complexity; replicas and caching usually come first.')] },
    enterprise: { take: 'A solution lives inside a portfolio: reuse standards and plan around systems being retired.', qs: [
      Q('In the TIME model, "Migrate" means…', ['Keep it as it is','Switch it off now','Move its function to a new platform'], 2, 'Tolerate keeps, Invest grows, Migrate moves, Eliminate retires.'),
      Q('Why reuse the enterprise identity standard?', ['One place to grant and revoke access','It is always cheapest','Regulators ban alternatives'], 0, 'Leavers lose access everywhere at once, and audits have one source of truth.')] },
    drill: { take: 'Everything fails eventually. Detect fast, limit the blast radius and learn without blame.', qs: [
      Q('What triggered the 2017 Amazon S3 outage?', ['A cyber attack','A mistyped command removed more servers than intended','A power cut'], 1, 'A routine debugging action had a wider effect than intended; AWS added safeguards afterwards.'),
      Q('What is the first move after an incident is resolved?', ['Find someone to blame','Buy more servers','A blameless postmortem with owned actions'], 2, 'Blame hides information; systems and processes are what you can fix.')] },
    review: { take: 'Defend designs with evidence: numbers, decision records and drill results.', qs: [
      Q('A strong answer to a review board cites…', ['Numbers, decision records and drill results','Vendor brochures','Personal preference'], 0, 'Evidence moves boards; opinion invites more questions.'),
      Q('A "Gap" in the maturity check means…', ['The design is invalid','Fix it, or justify accepting it, before the review','Ignore it'], 1, 'Some gaps are acceptable trade-offs, but they must be conscious and recorded.')] }
  };
  const incidents = {
    surge: ['Pokémon GO launch, 2016', 'Google Cloud reported that player traffic reached around 50 times the original launch target, and capacity had to be added while the game was live.', 'https://cloud.google.com/blog/products/containers-kubernetes/bringing-pokemon-go-to-life-on-google-cloud'],
    outage: ['Amazon S3 outage, February 2017', 'A mistyped command during debugging removed more servers than intended in one region. Many dependent websites and services failed for several hours.', 'https://aws.amazon.com/message/41926/'],
    audit: ['Schrems II ruling, July 2020', 'The EU Court of Justice struck down the EU-US Privacy Shield, forcing firms to re-examine every transatlantic data transfer.', 'https://curia.europa.eu/jcms/upload/docs/application/pdf/2020-07/cp200091en.pdf'],
    price: ['Redis licence change, March 2024', 'Redis moved away from its permissive open source licence. The Linux Foundation launched the Valkey fork in response.', 'https://redis.io/blog/redis-adopts-dual-source-available-licensing/'],
    cutover: ['Lidl SAP programme, 2018', 'After roughly seven years and about €500 million, Lidl stopped its SAP rollout. Reports point to the cost of bending standard software around its own long-established processes.', 'https://www.consultancy.uk/news/18243/lidl-cancels-sap-introduction-having-sunk-500-million-into-it']
  };
  incidents.model = ['Model retirements are routine', 'Model providers publish deprecation schedules and retire older models. Prompts and evaluations tuned to one model have to be re-tested on its successor before the cut-off date.', 'https://docs.claude.com/en/docs/about-claude/model-deprecations', 'Real pattern'];
  incidents.inject = ['Air Canada chatbot ruling, 2024', 'A Canadian tribunal held Air Canada liable after its website chatbot gave a customer wrong refund-policy information. The company could not disown what its own bot said.', 'https://aibusiness.com/nlp/air-canada-held-responsible-for-chatbot-s-hallucinations-', 'Real incident'];
  glossary.aigw = ['AI gateway','A single proxy in front of all models that handles keys, quotas, routing, fallbacks, caching and cost logs.','a switchboard with a meter on every line.'];
  glossary.agentic = ['AI-enabled vs AI-native','AI-enabled: copilots assist people inside existing processes. AI-native: agents do the work and people supervise, approve and handle exceptions.','a satnav that advises the driver, versus a self-driving car with a safety driver.'];
  glossary.evals = ['Evaluations (evals)','Test sets that score AI outputs for accuracy, safety and cost, run before every model or prompt change.','an exam the AI must pass before each promotion.'];
  glossary.hitl = ['Human in the loop','A person reviews or approves AI actions at defined points, especially irreversible ones.','a pilot who must confirm before the autopilot lands.'];
  glossary.euaiact = ['EU AI Act and AI risk frameworks','EU law that classifies AI uses by risk and sets duties for high-risk uses. NIST AI RMF and ISO/IEC 42001 are widely used frameworks for managing AI risk.','a safety rating system for AI uses.'];
  glossary.aiops = ['AIOps','Using data and machine learning to group alerts, find probable causes and suggest or run fixes.','a dispatcher who spots that a hundred calls are about one fire.'];
  glossary.littles = ['Little\'s law','Items in a system = arrival rate × time each spends there. It sizes queues, pools and concurrency.','people in a coffee shop = arrivals per minute × minutes each stays.'];
  glossary.pacelc = ['CAP and PACELC','When the network splits, choose consistency or availability; when it does not, choose consistency or low latency.','two branch tills that lose their phone line: stop selling, or sell and reconcile later.'];
  incidents.exit = ['SAP ECC end of mainstream maintenance', 'In 2020 SAP set 2027 as the end of mainstream maintenance for its ECC business suite, with optional extended maintenance to 2030. Thousands of firms now run their migrations against that fixed date.', 'https://news.sap.com/2020/02/sap-s4hana-maintenance-2040-clarity-choice-sap-business-suite-7/', 'Real deadline'];
  incidents.regulation = ['EU AI Act, in force August 2024', 'The EU AI Act entered into force on 1 August 2024, with obligations phasing in over the following years, including duties for high-risk AI uses and general-purpose models.', 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj', 'Real regulation'];
  incidents.storm = ['CrowdStrike update outage, July 2024', 'A faulty security software update crashed about 8.5 million Windows devices worldwide, according to Microsoft. Service desks were flooded, and many fixes needed hands-on work at each machine.', 'https://techcrunch.com/2024/07/20/microsoft-says-8-5m-windows-devices-were-affected-by-crowdstrike-outage/', 'Real incident'];
  stepTerms.workload = ['rps','latency','littles','pacelc','cache','queue','shard'];
  stepTerms.blueprint = stepTerms.blueprint.concat(['aiops']);
  quizzes.workload = { take: 'Numbers come before boxes: size for the peak, and let read ratio, latency and consistency choose the building blocks.', qs: [
    Q('A system averages 100 requests per second with a 5x peak. What do you size it for?', ['100 per second','500 per second','Whatever the cloud default is'], 1, 'Systems fail at the peak, so capacity, queues and autoscaling are planned for it.'),
    Q('Reads outnumber writes 100 to 1 and users expect 200 ms. What does that most strongly suggest?', ['A cache in front of the database','Only a bigger database server','A nightly batch job'], 0, 'Serving repeated reads from memory meets the budget and shields the database.')] };
  glossary.cleancore =['Clean core','Keep the vendor\'s standard software unmodified; put custom logic in extensions beside it.','renovating with furniture, not by moving walls.'];
  glossary.fts = ['Fit-to-standard','Workshops that adopt the software\'s best-practice process unless there is a real business reason not to.','buying a suit off the rack and only tailoring what truly does not fit.'];
  glossary.cutover = ['Cutover and hypercare','The planned switch from old system to new, then weeks of heightened support afterwards.','moving day, then the first weeks of fixing what the movers missed.'];
  glossary.mdmg = ['Master data','Core reference records such as materials, customers, vendors and employees that every transaction uses.','the contacts list behind every phone call.'];
  glossary.sod = ['Segregation of duties','No single person can complete a risky process end to end, such as creating and paying a vendor.','two keys to open the vault.'];
  glossary.gxp = ['GxP validation','Documented evidence that a system used in regulated life-science work does what it is meant to, reliably.','a safety certificate for software.'];
  signals['LiteLLM'] = 'Very fast release cadence; pin versions and test upgrades.';
  shared.push('aigw', 'aigov');
  return { cat, apps, shelf, patterns, traits, glossary, stepTerms, hopDef, hopOrder, stores, layerNames, shared, introAt, implIntro, implStages, implMoves, aiMoves, lvlOf, nonCrit, signals, tour, quizzes, incidents,
    baseKeys: ['ecom','genai','iot','data'], implKeys: ['sap','hr','crm','itsm','procure'] };
}
