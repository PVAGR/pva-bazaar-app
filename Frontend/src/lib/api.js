import api from "./axios";

export const apiGet = (path, config) => api.get(path, config).then(r => r.data);
export const apiPost = (path, body, config) => api.post(path, body, config).then(r => r.data);
export const apiPut = (path, body, config) => api.put(path, body, config).then(r => r.data);
export const apiDelete = (path, config) => api.delete(path, config).then(r => r.data);

// Helper for native fetch (with proper base URL handling)
export async function apiFetch(path, options = {}) {
  const { ENV } = await import('../config/env');
  const API_BASE = ENV.API_URL.replace(/\/+$/, '');
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// API base URL management (for AdminDashboard)
export function getApiBase() {
  return localStorage.getItem('api-base-url') || '';
}

export function setApiBase(url) {
  if (url) {
    localStorage.setItem('api-base-url', url);
  } else {
    localStorage.removeItem('api-base-url');
  }
}

// Update order (admin-only)
export async function updateOrder(id, patch) {
  try {
    const response = await apiPut(`/orders/${id}`, patch);
    return response;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
// Admin Orders API helpers
export async function fetchOrders({ limit = 25, cursor = null } = {}) {
  try {
    const response = await apiGet("/orders", { params: { limit, cursor } });
    if (response && response.ok && Array.isArray(response.items)) {
      return { ok: true, items: response.items, nextCursor: response.nextCursor || null };
    }
    return { ok: false, items: [], nextCursor: null };
  } catch (err) {
    return { ok: false, items: [], nextCursor: null, error: err.message };
  }
}

export async function fetchOrder(id) {
  try {
    const response = await apiGet(`/orders/${id}`);
    if (response && response.ok && response.item) {
      return { ok: true, item: response.item };
    }
    return { ok: false, item: null };
  } catch (err) {
    return { ok: false, item: null, error: err.message };
  }
}

export async function refundOrder(id, { amountCents, reason } = {}) {
  try {
    const response = await apiPost(`/orders/${id}/refund`, { amountCents, reason });
    if (response && response.ok && response.refundId) {
      return { ok: true, refundId: response.refundId, status: response.status };
    }
    return { ok: false, error: response?.error || "Refund failed" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
// Create Stripe Checkout Session
export async function createCheckoutSession(itemId) {
  try {
    const response = await apiPost("/checkout/create-session", { itemId });
    if (response && response.ok && response.url) {
      return { ok: true, url: response.url };
    }
    return { ok: false, error: response?.error || "Failed to create session" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Fetch Stripe Checkout Session details
export async function fetchCheckoutSession(sessionId) {
  try {
    const response = await apiGet("/checkout/session", { params: { session_id: sessionId } });
    if (response && response.ok && response.session) {
      return { ok: true, session: response.session };
    }
    return { ok: false, error: response?.error || "Session not found" };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
// fetchMarketplaceItem(slugOrId): fetches a single marketplace item by slug or id
export async function fetchMarketplaceItem(slugOrId) {
  if (!slugOrId) return { ok: false, item: null, error: "Missing slug or id" };
  try {
    const url = `/items/${encodeURIComponent(slugOrId)}`;
    const response = await apiGet(url);
    if (response && response.ok && response.item) {
      return { ok: true, item: response.item };
    }
    return { ok: false, item: null };
  } catch (err) {
    return { ok: false, item: null, error: err.message };
  }
}
// Marketplace API functions
// fetchMarketplaceItems({ limit=12, cursor=null, category=null, q=null, signal=null })
export async function fetchMarketplaceItems({ limit = 12, cursor = null, category = null, q = null, signal = null } = {}) {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (cursor) params.append('cursor', cursor);
    if (category) params.append('category', category);
    if (q) params.append('q', q);
    const url = `/items?${params.toString()}`;
    const config = signal ? { signal } : undefined;
    const response = await apiGet(url, config);
    if (response && response.ok && Array.isArray(response.items)) {
      return {
        ok: true,
        items: response.items,
        nextCursor: response.nextCursor || null,
        categories: response.categories || [],
      };
    }
    return { ok: false, items: [], nextCursor: null, categories: [] };
  } catch (err) {
    return { ok: false, items: [], nextCursor: null, categories: [], error: err.message };
  }
}


// Archive API functions
// fetchArchiveEntries({ limit=12, cursor=null, category=null, tag=null, q=null, sort="new" })
export async function fetchArchiveEntries({ limit = 12, cursor = null, category = null, tag = null, q = null, sort = "new" } = {}) {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (cursor) params.append('cursor', cursor);
    if (category) params.append('category', category);
    if (tag) params.append('tag', tag);
    if (q) params.append('q', q);
    if (sort) params.append('sort', sort);
    const url = `/api/archive?${params.toString()}`;
    const response = await apiGet(url);
    if (response && response.ok && Array.isArray(response.items)) {
      return { ok: true, items: response.items, nextCursor: response.nextCursor || null };
    }
    return { ok: false, items: [], nextCursor: null };
  } catch (err) {
    return { ok: false, items: [], nextCursor: null, error: err.message };
  }
}

export async function createArchiveEntry(entry) {
  try {
    const response = await apiFetch('/api/archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

export async function deleteArchiveEntry(id) {
  try {
    const response = await apiFetch(`/api/archive/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
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
