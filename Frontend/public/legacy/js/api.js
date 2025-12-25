const CANDIDATE_BASES = [
  typeof window !== 'undefined' && window.API_BASE ? window.API_BASE : null,
  '/api',
  'https://api.pvabazaar.org',
].filter(Boolean);

let resolvedBase = null;

async function tryFetch(base, path, options) {
  const url = `${base}${path}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }, ...options });
  return res;
}

async function resolveBase() {
  if (resolvedBase) return resolvedBase;
  const cached = typeof window !== 'undefined' ? window.localStorage.getItem('API_BASE') : null;
  if (cached) { resolvedBase = cached; return resolvedBase; }
  for (const base of CANDIDATE_BASES) {
    try {
      const r = await tryFetch(base, '/health');
      if (r.ok) { resolvedBase = base; if (typeof window !== 'undefined') window.localStorage.setItem('API_BASE', base); return resolvedBase; }
    } catch (_) {}
  }
  resolvedBase = '/api';
  return resolvedBase;
}

async function getHealth() {
  const base = await resolveBase();
  const res = await tryFetch(base, '/health');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getArtifacts(limit = 4) {
  const base = await resolveBase();
  const res = await tryFetch(base, '/artifacts');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.artifacts || data.items || []);
  return limit ? list.slice(0, limit) : list;
}

async function getArtifact(id) {
  if (!id) throw new Error('Missing id');
  const base = await resolveBase();
  const res = await tryFetch(base, `/artifacts/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
export { getHealth, getArtifacts, getArtifact, resolveBase }; 