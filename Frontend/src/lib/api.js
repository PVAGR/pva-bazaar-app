let cachedApiBase = null;
let cachePromise = null;

export function getApiBase() {
  // 1. First check build-time environment variable (highest priority)
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) return envApiUrl;
  
  // 2. Fallback to production backend
  return 'https://pva-backend-api.vercel.app';
}

export async function getApiBaseAsync() {
  // Use same logic as getApiBase
  return getApiBase();
}

export function apiFetch(path, options = {}) {
  const base = getApiBase();
  const clean = base ? base.replace(/\/+$/, '') : '';
  const url = clean ? `${clean}${path}` : path;
  return fetch(url, options);
}

// Archive API functions
export async function fetchArchiveEntries() {
  try {
    const response = await apiFetch('/api/archive');
    const data = await response.json();
    if (data.ok && Array.isArray(data.items)) {
      return data.items;
    }
    console.warn('Unexpected archive response:', data);
    return [];
  } catch (err) {
    console.error('Failed to fetch archive entries:', err);
    return [];
  }
}

export async function createArchiveEntry(entry, adminCode) {
  try {
    const response = await apiFetch('/api/archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Code': adminCode || '',
      },
      body: JSON.stringify(entry),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return { ok: true, item: data.item };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
