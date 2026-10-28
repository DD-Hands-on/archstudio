import { fmtW, fmtGBW } from './format.js';

// ---------- Workload fit: how a product's curated scores shift at the user's numbers ----------
// Each rule: building block, product name, test on workload numbers N, score changes and the reason shown to the learner.
// Dimensions: 0 Scale, 1 Cost, 2 Ops ease, 3 Portability, 4 Speed. Thresholds are rules of thumb, stated in the reason.
export const FIT_RULES = [
  ['db', 'PostgreSQL', N => N.writeRps > 20000, { 0: -2 }, N => 'One primary takes every write; ' + fmtW(N.writeRps) + ' writes/s means sharding (Citus or similar).'],
  ['db', 'PostgreSQL', N => N.writeRps > 5000 && N.writeRps <= 20000, { 0: -1 }, N => fmtW(N.writeRps) + ' writes/s is near what one primary handles comfortably (about 5k); plan partitioning early.'],
  ['db', 'PostgreSQL', N => N.store3 > 20000, { 2: -1 }, N => fmtGBW(N.store3) + ' to back up, vacuum and restore on servers you run.'],
  ['db', 'Amazon Aurora PostgreSQL', N => N.writeRps > 50000, { 0: -1 }, N => 'Still a single writer instance; beyond tens of thousands of writes/s (you have ' + fmtW(N.writeRps) + ') you shard.'],
  ['db', 'Amazon Aurora PostgreSQL', N => N.writeRps > 5000, { 1: -1 }, N => 'Standard tier charges per I/O; at ' + fmtW(N.writeRps) + ' writes/s choose I/O-Optimized or budget for it.'],
  ['db', 'MongoDB Atlas', N => N.store3 > 50000, { 1: -1 }, N => fmtGBW(N.store3) + ' needs a large cluster tier; Atlas pricing rises with storage and tier.'],
  ['nosql', 'Apache Cassandra', N => N.peakRps < 1000 && N.store3 < 1000, { 2: -1 }, N => 'At least three nodes to run for ' + fmtW(N.peakRps) + ' requests/s and ' + fmtGBW(N.store3) + ': more machinery than the load needs.'],
  ['nosql', 'Amazon DynamoDB', N => N.avgRps > 10000, { 1: -1 }, N => 'On-demand pricing at ' + fmtW(N.avgRps) + ' requests/s sustained; switch to provisioned capacity with reservations.'],
  ['nosql', 'Azure Cosmos DB', N => N.avgRps > 10000, { 1: -1 }, N => 'Request-unit cost at ' + fmtW(N.avgRps) + ' requests/s sustained; reserve capacity.'],
  ['search', 'Algolia', N => N.readRps > 1000, { 1: -2 }, N => 'Priced per search request; ' + fmtW(N.readRps) + ' reads/s at peak is expensive.'],
  ['search', 'Algolia', N => N.readRps > 100 && N.readRps <= 1000, { 1: -1 }, N => 'Priced per search request; ' + fmtW(N.readRps) + ' reads/s at peak adds up.'],
  ['search', 'Algolia', N => N.store3 > 1000, { 0: -1 }, N => 'Record limits and price climb with ' + fmtGBW(N.store3) + ' of data.'],
  ['search', 'OpenSearch', N => N.store3 > 20000, { 2: -1 }, N => 'Shard sizing, rebalancing and upgrades for ' + fmtGBW(N.store3) + ' on clusters you run.'],
  ['search', 'Elastic Cloud', N => N.store3 > 50000, { 1: -1 }, N => fmtGBW(N.store3) + ' of indexed data needs large deployments.'],
  ['mq', 'RabbitMQ', N => N.events > 50000, { 0: -2 }, N => 'Built for routing work, not firehoses; ' + fmtW(N.events) + ' events/s needs a partitioned log such as Kafka.'],
  ['mq', 'RabbitMQ', N => N.events > 10000 && N.events <= 50000, { 0: -1 }, N => fmtW(N.events) + ' events/s needs careful clustering and quorum queues.'],
  ['mq', 'Apache Kafka', N => N.events < 200, { 2: -1 }, N => 'A Kafka cluster is a lot to run for ' + fmtW(N.events) + ' events/s; a simpler broker or a managed service fits.'],
  ['mq', 'Confluent Cloud', N => N.events > 50000, { 1: -1 }, N => 'Throughput-based pricing at ' + fmtW(N.events) + ' events/s.'],
  ['gw', 'Amazon API Gateway', N => N.avgRps > 20000, { 1: -2 }, N => 'Charged per request: ' + fmtW(N.avgRps) + '/s on average is about ' + fmtW(N.avgRps * 86400) + ' requests a day.'],
  ['gw', 'Amazon API Gateway', N => N.avgRps > 2000 && N.avgRps <= 20000, { 1: -1 }, N => 'Charged per request: about ' + fmtW(N.avgRps * 86400) + ' requests a day.'],
  ['gw', 'Amazon API Gateway', N => N.peakRps > 10000, { 0: -1 }, N => 'Default account limit is 10,000 requests/s; raise it before ' + fmtW(N.peakRps) + '/s peaks.'],
  ['gw', 'Azure API Management', N => N.peakRps > 20000, { 1: -1 }, N => 'Throughput is bought in scale units; ' + fmtW(N.peakRps) + '/s needs several premium units.'],
  ['app', 'AWS Lambda', N => !N.impl && N.avgRps > 5000, { 1: -2 }, N => 'Steady ' + fmtW(N.avgRps) + ' requests/s costs more per invocation than always-on containers.'],
  ['app', 'AWS Lambda', N => !N.impl && N.avgRps > 500 && N.avgRps <= 5000, { 1: -1 }, N => 'At ' + fmtW(N.avgRps) + ' requests/s sustained, containers usually cost less.'],
  ['app', 'AWS Lambda', N => !N.impl && N.inflight > 1000, { 0: -1 }, N => fmtW(N.inflight) + ' requests in flight exceeds the default 1,000 concurrent executions; request a quota rise.'],
  ['app', 'AWS Lambda', N => !N.impl && N.lat <= 200 && N.pattern === 'interactive', { 2: -1 }, N => 'Cold starts can break a 200 ms budget; plan provisioned concurrency.'],
  ['app', 'Kubernetes', N => !N.impl && N.peakRps < 50, { 2: -1 }, N => 'A cluster to run for ' + fmtW(N.peakRps) + ' requests/s at peak; a managed container service is simpler.'],
  ['llm', 'vLLM', N => N.tokensDay > 0 && N.tokensDay < 20e6, { 1: -1 }, N => 'GPUs sit idle at ' + fmtW(N.tokensDay) + ' tokens a day; per-token APIs cost less.'],
  ['llm', 'vLLM', N => N.tokensDay > 2e9, { 1: +1 }, N => 'At ' + fmtW(N.tokensDay) + ' tokens a day, owned GPUs can beat per-token prices.'],
  ['llm', '*hosted', N => N.tokensDay > 2e9, { 1: -1 }, N => fmtW(N.tokensDay) + ' tokens a day: per-token spend dominates; negotiate committed throughput and route simple calls to smaller models.'],
  ['stream', 'Spark Structured Streaming', N => N.pattern === 'realtime' && N.lat <= 1000, { 0: -1 }, N => 'Micro-batches add delay; for a ' + (N.lat >= 1000 ? (N.lat / 1000) + ' s' : N.lat + ' ms') + ' budget, event-by-event processing fits better.'],
  ['lake', 'Apache Iceberg', N => N.store3 < 1000, { 2: -1 }, N => 'Spark and Iceberg are heavy for ' + fmtGBW(N.store3) + '; a warehouse or Postgres may do.'],
  ['lake', 'Snowflake', N => N.store3 > 100000, { 1: -1 }, N => 'Compute and storage spend at ' + fmtGBW(N.store3) + '; model it before committing.'],
  ['lake', 'Databricks', N => N.store3 > 100000, { 1: -1 }, N => 'Compute and storage spend at ' + fmtGBW(N.store3) + '; model it before committing.'],
  ['obs', 'Datadog', N => !N.impl && N.inst > 50, { 1: -2 }, N => 'Per-host and per-GB pricing across about ' + N.inst + ' instances adds up fast.'],
  ['obs', 'Datadog', N => !N.impl && N.inst > 10 && N.inst <= 50, { 1: -1 }, N => 'Per-host and per-GB pricing across about ' + N.inst + ' instances.'],
  ['idp', 'Okta', N => !N.impl && N.users >= 5e7, { 1: -2 }, N => 'Customer identity is priced per monthly active user; ' + fmtW(N.users) + ' users is a large bill.'],
  ['idp', 'Okta', N => !N.impl && N.users >= 1e6 && N.users < 5e7, { 1: -1 }, N => 'Customer identity is priced per monthly active user; budget for ' + fmtW(N.users) + ' users.'],
  ['idp', 'Microsoft Entra ID', N => !N.impl && N.users >= 5e7, { 1: -1 }, N => 'External ID is priced per monthly active user beyond the free tier; ' + fmtW(N.users) + ' users.'],
  ['idp', 'Keycloak', N => !N.impl && N.users >= 5e7, { 2: -1 }, N => 'Running identity for ' + fmtW(N.users) + ' users yourself needs a strong platform team and careful session scaling.'],
  ['geo', 'Amazon Location Service', N => N.peakRps > 1000, { 1: -1 }, N => 'Charged per request at ' + fmtW(N.peakRps) + '/s at peak.'],
  ['tsdb', 'TimescaleDB', N => N.writeRps > 50000, { 0: -1 }, N => 'Single-primary writes at ' + fmtW(N.writeRps) + '/s; consider multi-node or a purpose-built store.'],
  ['ingest', 'AWS IoT Core', N => N.writeRps > 50000, { 1: -1 }, N => 'Per-message pricing at ' + fmtW(N.writeRps) + ' messages/s.'],
  ['ingest', 'Azure IoT Hub', N => N.writeRps > 50000, { 1: -1 }, N => 'Priced in units of messages a day; ' + fmtW(N.writeRps) + ' messages/s needs many units.']
];

export function fitFor(cid, o, N) {
  const notes = [];
  if (!N) return notes;
  FIT_RULES.forEach(([c, name, test, d, why]) => {
    if (c !== cid) return;
    const hit = name === '*hosted' ? o.t.indexOf('gpu') < 0 : o.n.indexOf(name) === 0;
    if (!hit) return;
    let ok = false; try { ok = !!test(N); } catch (e) {}
    if (ok) Object.keys(d).forEach(k => notes.push({ d: +k, v: d[k], why: why(N) }));
  });
  return notes;
}

export function applyFit(o, notes) {
  if (!notes.length) return o;
  const s2 = o.s.slice(); notes.forEach(f => { s2[f.d] = Math.max(1, Math.min(5, s2[f.d] + f.v)); });
  return Object.assign({}, o, { s: s2, s0: o.s, fit: notes });
}
