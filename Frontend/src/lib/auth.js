export function getToken() {
  if (typeof window === 'undefined') return '';
  const token =
    localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt') || '';

  // Migrate older keys to the canonical key.
  if (token && !localStorage.getItem('token')) {
    localStorage.setItem('token', token);
  }

  return token;
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (!token) return;
  localStorage.setItem('token', token);
  localStorage.removeItem('authToken');
  localStorage.removeItem('jwt');
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('jwt');
}

