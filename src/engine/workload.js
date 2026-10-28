// Workload sizing from first principles: users, requests per second, reads and writes, storage, concurrency and AI tokens.
// Pure functions: the same inputs always give the same numbers, so they can be unit tested.

// Starting assumptions for a reference model (A): actions per user, read/write ratio, latency budget and so on.
export function wlDefaults(A) {
  const c = A.c; const impl = A.kind === 'impl';
  const d = { actions: impl ? 150 : 40, ratio: impl ? '10:1' : '100:1', lat: impl ? 1000 : 200, cons: 'strong', peak: 5, growth: 1000, pattern: 'interactive' };
  if (c.indexOf('llm') >= 0 || c.indexOf('agents') >= 0) { d.lat = 5000; if (c.indexOf('agents') >= 0) d.pattern = 'async'; }
  if (c.indexOf('ingest') >= 0) { d.ratio = '1:10'; d.pattern = 'realtime'; d.cons = 'eventual'; d.growth = 100000; }
  if (c.indexOf('geo') >= 0) { d.ratio = '1:1'; d.pattern = 'realtime'; }
  if (c.indexOf('media') >= 0) { d.cons = 'eventual'; d.growth = 100000; d.peak = 2; }
  if (c.indexOf('integ') >= 0 && c.indexOf('lake') >= 0) { d.pattern = 'batch'; d.growth = 100000; d.lat = 5000; }
  if (c.indexOf('itsm') >= 0) d.peak = 20;
  return d;
}

// app: the reference model; st: settings (app, scale, ai, wl); returns every derived number the screens and rules use.
export function workloadNumbers(A, st) {
  const impl = A.kind === 'impl';
  const saved = st.wl && st.wl.key === A.n ? st.wl.v : {};
  const W = Object.assign(wlDefaults(A), saved);
  const users = { '10k': 1e4, '1M': 1e6, '50M': 5e7 }[st.scale] || 1e6;
  const activeShare = impl ? 0.7 : 0.2; const dau = users * activeShare;
  const avgRps = dau * W.actions / 86400; const peakRps = avgRps * W.peak;
  const rN = { '1:10': 0.1, '1:1': 1, '10:1': 10, '100:1': 100 }[W.ratio] || 10;
  const writeRps = peakRps / (rN + 1); const readRps = peakRps * rN / (rN + 1);
  const tokensDay = st.ai !== 'none' ? dau * (st.ai === 'native' ? 20 : 3) * 3000 : 0;
  return { W, users, impl, activeShare, dau, rN, perInst: 400, bw: peakRps * 30 / 1000, aiCallsDay: st.ai !== 'none' ? dau * (st.ai === 'native' ? 20 : 3) : 0, avgRps, peakRps, readRps, writeRps, events: W.pattern === 'realtime' ? peakRps : writeRps, store3: W.growth * 9, lat: W.lat, cons: W.cons, pattern: W.pattern,
    inflight: peakRps * W.lat / 1000, inst: Math.ceil(peakRps / 400) + 1, tokensDay,
    key: [st.app, st.scale, st.ai, W.actions, W.ratio, W.lat, W.cons, W.peak, W.growth, W.pattern].join('|') };
}
