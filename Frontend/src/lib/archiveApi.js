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
