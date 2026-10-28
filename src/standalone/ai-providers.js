// Bring-your-own model: provider settings and a browser client that matches the Claude sample API (json(prompt, opts)).
export const AI_PROVIDERS = {
  anthropic: { n: 'Anthropic', s: 'Claude', model: 'claude-sonnet-5-5', key: true, link: 'https://console.anthropic.com/settings/keys',
    help: 'Uses Claude through the Anthropic API. You need an API key from the Anthropic Console; API usage is billed by Anthropic.' },
  openai: { n: 'OpenAI', s: 'OpenAI', model: 'gpt-5-mini', key: true, link: 'https://platform.openai.com/api-keys',
    help: 'Uses the OpenAI API. You need an API key from the OpenAI platform; usage is billed by OpenAI.' },
  gemini: { n: 'Google Gemini', s: 'Gemini', model: 'gemini-2.5-flash', key: true, link: 'https://aistudio.google.com/apikey',
    help: 'Uses the Gemini API. You can create a key in Google AI Studio; usage follows your Google plan.' },
  ollama: { n: 'Ollama (local)', s: 'Ollama', model: 'llama3.1', key: false, url: 'http://localhost:11434', link: 'https://ollama.com/download',
    help: 'Runs an open model on your own computer, so nothing leaves it. Start Ollama with OLLAMA_ORIGINS set to this site\'s address, otherwise the browser blocks the call. Smaller models follow the format less reliably.' }
};

export function aiErr(code, detail) { const e = new Error(detail || code); e.code = code; e.detail = detail || ''; return e; }

export function parseModelJSON(t) {
  let s = String(t || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(s); } catch (e) {}
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch (e) {} }
  throw aiErr('bad_json');
}

export function makeLLM(cfg) {
  const p = cfg.provider; const model = cfg.model; const key = String(cfg.key || '').trim();
  return { provider: p, json: async (prompt, opts) => {
    opts = opts || {};
    const hd = { 'content-type': 'application/json' }; let url, body, pick;
    if (p === 'anthropic') {
      url = 'https://api.anthropic.com/v1/messages';
      Object.assign(hd, { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
      body = { model, max_tokens: 8000, messages: [{ role: 'user', content: prompt }] };
      pick = j => (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    } else if (p === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions'; hd.authorization = 'Bearer ' + key;
      body = { model, messages: [{ role: 'system', content: 'Reply with one JSON object only.' }, { role: 'user', content: prompt }], response_format: { type: 'json_object' } };
      pick = j => (((j.choices || [])[0] || {}).message || {}).content || '';
    } else if (p === 'gemini') {
      url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent'; hd['x-goog-api-key'] = key;
      body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } };
      pick = j => ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(x => x.text || '').join('');
    } else {
      url = String(cfg.url || 'http://localhost:11434').replace(/\/+$/, '') + '/api/chat';
      body = { model, messages: [{ role: 'user', content: prompt }], stream: false, format: 'json' };
      pick = j => (j.message && j.message.content) || '';
    }
    let r;
    try { r = await fetch(url, { method: 'POST', headers: hd, body: JSON.stringify(body), signal: opts.signal }); }
    catch (e) { if (e && e.name === 'AbortError') throw aiErr('cancelled'); throw aiErr('network'); }
    if (!r.ok) {
      let d = '';
      try { const j = await r.json(); d = (j.error && (j.error.message || (typeof j.error === 'string' ? j.error : ''))) || j.message || ''; } catch (e) {}
      throw aiErr(r.status === 401 || r.status === 403 ? 'bad_key' : r.status === 429 ? 'rate_limited' : 'provider_error', String(d).slice(0, 200));
    }
    let j;
    try { j = await r.json(); } catch (e) { if (e && e.name === 'AbortError') throw aiErr('cancelled'); throw aiErr('bad_json'); }
    if (typeof opts.onText === 'function') { try { opts.onText(''); } catch (e) {} }
    return parseModelJSON(pick(j));
  } };
}

export function loadAICfg() { try { const raw = window.localStorage.getItem('archstudio.ai'); const c = raw ? JSON.parse(raw) : null; return c && AI_PROVIDERS[c.provider] ? c : null; } catch (e) { return null; } }
export function saveAICfg(c) {
  try {
    const keep = { provider: c.provider, model: c.model, url: c.url || '', remember: !!c.remember, connected: !!c.connected };
    if (c.remember && c.key) keep.key = c.key;
    window.localStorage.setItem('archstudio.ai', JSON.stringify(keep));
  } catch (e) {}
}
