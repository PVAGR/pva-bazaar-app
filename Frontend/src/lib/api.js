import api from "./axios";
import { ENV } from "../config/env";
import { getToken } from "./auth";

export const apiGet = (path, config) => api.get(path, config).then(r => r.data);
export const apiPost = (path, body, config) => api.post(path, body, config).then(r => r.data);
export const apiPut = (path, body, config) => api.put(path, body, config).then(r => r.data);
export const apiDelete = (path, config) => api.delete(path, config).then(r => r.data);

export const fetchAdminRuntimeConfig = () => apiGet('/admin/runtime-config');
export const updateOpenClawRuntimeConfig = (payload) => apiPut('/admin/runtime-config/openclaw', payload);
export const updatePayoutRuntimePolicy = (payload) => apiPut('/admin/runtime-config/payout-policy', payload);
export const requestSolanaTestPayout = (payload) => apiPost('/solana/test-payout', payload);
export const confirmSolanaTestPayout = (payload) => apiPost('/solana/confirm-test-payout', payload);
export const getDirectTransferReadiness = () => apiGet('/solana/direct-transfer-readiness');
export const getHotWalletBalance = () => apiGet('/solana/hot-wallet-balance');
export const requestDevnetAirdropHotWallet = (payload) => apiPost('/solana/devnet-airdrop-hot-wallet', payload);
export const directSolanaTransfer = (payload) => apiPost('/solana/direct-transfer', payload);

/**
 * Upload a FormData payload (multipart/form-data).
 * Uses native fetch so the browser can set the correct Content-Type boundary.
 * Attaches the auth token automatically.
 */
export async function apiUpload(path, formData) {
  const API_BASE = ENV.API_URL.replace(/\/+$/, '');
  const normalizedPath = API_BASE.endsWith('/api') && path.startsWith('/api/')
    ? path.slice(4)
    : path;
  const url = normalizedPath.startsWith('http') ? normalizedPath : `${API_BASE}${normalizedPath}`;

  const headers = {};
  const token = getToken();
  if (token) {
    headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  // Do NOT set Content-Type — browser sets it with the boundary for multipart

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'omit',
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.error || data?.message || `Upload failed (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Helper for native fetch (with proper base URL handling)
export async function apiFetch(path, options = {}) {
  const API_BASE = ENV.API_URL.replace(/\/+$/, '');
  const normalizedPath = (() => {
    if (!path || path.startsWith('http')) return path;
    // Allow both '/items' and '/api/items' call styles when API_BASE already includes '/api'.
    if (API_BASE.endsWith('/api') && path.startsWith('/api/')) {
      return path.slice(4);
    }
    return path;
  })();
  const url = normalizedPath.startsWith('http') ? normalizedPath : `${API_BASE}${normalizedPath}`;
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
// --- AI-Verified Artifact Verification (for VerificationBadge) ---
export async function fetchVerificationByArtifact(idOrSlug) {
  if (!idOrSlug) return { ok: false, verification: null };
  try {
    const response = await apiGet(`/verification/artifact/${encodeURIComponent(idOrSlug)}`);
    if (response && response.ok) {
      return { ok: true, verification: response.verification };
    }
    return { ok: false, verification: null };
  } catch (err) {
    return { ok: false, verification: null };
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

export async function fetchMyMarketplaceItems() {
  try {
    const response = await apiGet('/items/mine');
    if (response && response.ok && Array.isArray(response.items)) {
      return { ok: true, items: response.items };
    }
    return { ok: false, items: [], error: response?.error || response?.message || 'Failed to fetch your listings' };
  } catch (err) {
    return { ok: false, items: [], error: err.message };
  }
}

// Create a new marketplace item (authenticated user flow)
export async function createMarketplaceItem(payload) {
  try {
    const response = await apiPost('/items/register', payload);
    if (response && response.ok && response.item) {
      return {
        ok: true,
        item: response.item,
        message: response.message || 'Item created',
        syndication: response.syndication || null,
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to create item' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function retryMarketplaceSyndication(itemId, channels = []) {
  if (!itemId) return { ok: false, error: 'Missing item id' };
  try {
    const response = await apiPost(`/items/${encodeURIComponent(itemId)}/syndication/retry`, {
      channels,
    });
    if (response && response.ok) {
      return {
        ok: true,
        item: response.item || null,
        syndication: response.syndication || null,
        message: response.message || 'Syndication retry completed',
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to retry syndication' };
  } catch (err) {
    return { ok: false, error: err.message };
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
    const url = `/archive?${params.toString()}`;
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
    const response = await apiPost('/archive', entry);
    if (response && response.ok && response.item) {
      return { ok: true, item: response.item };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to create entry' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function deleteArchiveEntry(id) {
  try {
    const response = await apiDelete(`/archive/${id}`);
    return { ok: true, message: response?.message || 'Deleted' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
