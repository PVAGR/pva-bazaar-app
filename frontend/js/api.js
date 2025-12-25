const API_BASE = '/api';

async function getHealth() {
  const res = await fetch(`${API_BASE}/health`, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getArtifacts(limit = 4) {
  const res = await fetch(`${API_BASE}/artifacts`, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.artifacts || data.items || []);
  return limit ? list.slice(0, limit) : list;
}

async function getArtifact(id) {
  if (!id) throw new Error('Missing id');
  const res = await fetch(`${API_BASE}/artifacts/${encodeURIComponent(id)}`, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
export { getHealth, getArtifacts, getArtifact }; 