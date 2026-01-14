import { apiFetch } from './api.js';

export async function fetchAdminStatus(token) {
  const res = await apiFetch('/api/admin/status', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Admin status failed');
  return json;
}

export async function requestAdminToken(secret) {
  const res = await apiFetch('/api/admin/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.token) throw new Error(json.message || 'Admin token failed');
  return json.token;
}

export async function requestDevToken(secret) {
  // Kept for backward compatibility, calls admin token endpoint
  return requestAdminToken(secret);
}

export async function createArchiveEntry(entry, token) {
  const res = await apiFetch('/api/archive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(entry),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Create failed');
  return json.entry || json;
}

/**
 * Fetch all archive entries from backend
 * @returns {Promise<Array>} Array of entry objects
 */
export async function fetchArchiveEntries() {
  const res = await apiFetch('/api/archive');
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Fetch entries failed');
  const entries = json.entries || [];
  return entries.map((e) => ({ ...e, id: e.id || e._id }));
}

/**
 * Fetch a single archive entry by ID
 * @param {string} id - The entry ID (_id or externalId)
 * @param {Object} opts - Optional fetch options
 * @param {AbortSignal} opts.signal - Optional abort signal
 * @returns {Promise<Object|null>} The entry object or null
 */
export async function fetchArchiveEntryById(id, opts = {}) {
  const res = await apiFetch(`/api/archive/${id}`, { signal: opts.signal });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Fetch entry failed');
  const entry = json.entry || null;
  return entry ? { ...entry, id: entry.id || entry._id } : null;
}
