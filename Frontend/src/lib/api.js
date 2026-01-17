

import api from "./axios";

export const apiGet = (path, config) => api.get(path, config).then(r => r.data);
export const apiPost = (path, body, config) => api.post(path, body, config).then(r => r.data);
export const apiPut = (path, body, config) => api.put(path, body, config).then(r => r.data);
export const apiDelete = (path, config) => api.delete(path, config).then(r => r.data);
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

export async function deleteArchiveEntry(id, adminCode) {
  try {
    const response = await apiFetch(`/api/archive/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Code': adminCode || '',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }
    
    return { ok: true, message: data.message };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
