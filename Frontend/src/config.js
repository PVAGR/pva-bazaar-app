export const API_BASE = '/api';

export const apiFetch = (path, options = {}) => fetch(`${API_BASE}${path}`, options);
