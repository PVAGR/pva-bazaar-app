export function getApiBase() {
  try {
    return (localStorage.getItem('api:base') || '').trim();
  } catch (err) {
    console.warn('api base read failed', err);
    return '';
  }
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
