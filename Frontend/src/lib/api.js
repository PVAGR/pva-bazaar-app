let cachedApiBase = null;
let cachePromise = null;

export function getApiBase() {
  // 1. First check build-time environment variable (highest priority)
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) return envApiUrl;
  
  // 2. Check localStorage for runtime override
  try {
    const stored = localStorage.getItem('api:base');
    if (stored) return stored.trim();
  } catch (err) {
    console.warn('[api] localStorage read failed', err);
  }
  
  // 3. Same-origin fallback (GitHub Pages + Vercel serverless default)
  return '';
}

export async function getApiBaseAsync() {
  // 1. Build-time env (immediate)
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) return envApiUrl;
  
  // 2. Runtime localStorage (immediate)
  try {
    const stored = localStorage.getItem('api:base');
    if (stored) return stored.trim();
  } catch {}
  
  // 3. Runtime config file /api-base.json (async)
  if (cachedApiBase !== null) return cachedApiBase;
  if (cachePromise) return cachePromise;
  
  cachePromise = (async () => {
    try {
      const res = await fetch('/api-base.json');
      const data = await res.json();
      cachedApiBase = data.apiUrl || data.base || '';
      console.log('[api] Loaded from api-base.json:', cachedApiBase);
      return cachedApiBase;
    } catch (e) {
      console.log('[api] api-base.json not found, using same-origin');
      cachedApiBase = '';
      return '';
    } finally {
      cachePromise = null;
    }
  })();
  
  return cachePromise;
}

export function setApiBase(base) {
  try {
    if (!base) {
      localStorage.removeItem('api:base');
      return;
    }
    localStorage.setItem('api:base', base.trim());
  } catch (err) {
    console.warn('api base write failed', err);
  }
}

export function apiFetch(path, options = {}) {
  const base = getApiBase();
  const clean = base ? base.replace(/\/+$/, '') : '';
  const url = clean ? `${clean}${path}` : path;
  return fetch(url, options);
}
