// Browser-storage stand-in for the Claude shared store (same small API), used outside Claude.
export function localStore() {
  const KEY = 'archstudio.store.v1';
  let data = { portfolio: {}, docs: {} };
  try { const raw = window.localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') data = { portfolio: p.portfolio || {}, docs: p.docs || {} }; } } catch (e) {}
  const subs = [];
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const persist = () => {
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { const er = new Error('storage'); er.code = /quota/i.test(String(e && (e.name || e.message))) ? 'quota_exceeded' : 'storage_unavailable'; throw er; }
  };
  const emit = () => subs.slice().forEach(f => { try { f(); } catch (e) {} });
  const sub = f => { subs.push(f); f(); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; };
  const docRef = path => {
    const parts = path.split('/'); const col = parts[0]; const id = parts[1];
    const get = () => col === 'portfolio' ? data.portfolio[id] : data.docs[path];
    const put = v => { if (col === 'portfolio') { if (v == null) delete data.portfolio[id]; else data.portfolio[id] = v; } else { if (v == null) delete data.docs[path]; else data.docs[path] = v; } };
    return { id,
      set: async body => { const prev = clone(get()); put(clone(body)); try { persist(); } catch (e) { put(prev); throw e; } emit(); },
      delete: async () => { const prev = clone(get()); put(null); try { persist(); } catch (e) { put(prev); throw e; } emit(); },
      onSnapshot: cb => sub(() => { const v = get(); cb({ exists: v != null, data: () => clone(v) }); }) };
  };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const snap = () => ({ docs: Object.keys(data.portfolio).map(id => ({ id, at: String(data.portfolio[id].savedAt || ''), data: () => clone(data.portfolio[id]) })).sort((a, b) => b.at.localeCompare(a.at)) });
  return { local: true, doc: docRef,
    collection: name => ({ doc: () => docRef(name + '/' + newId()), orderBy: () => ({ limit: () => ({ onSnapshot: cb => sub(() => cb(snap())) }) }) }) };
}
