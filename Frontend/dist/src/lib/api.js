export function getApiBase() {
  // First check environment variable (build-time)
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) return envApiUrl;
  
  // Fallback to localStorage (runtime override)
  try {
    const stored = localStorage.getItem('api:base');
    if (stored) return stored.trim();
  } catch (err) {
    console.warn('api base read failed', err);
  }
  
  // Default fallback for development
  return '';
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
