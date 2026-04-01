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
export const executeSolanaTestFlow = (payload) => apiPost('/solana/execute-test-flow', payload);
export const directSolanaTransfer = (payload) => apiPost('/solana/direct-transfer', payload);
export const fetchAutopilotRuns = (limit = 30) => apiGet(`/solana/autopilot-runs?limit=${limit}`);

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
  // Do NOT set Content-Type â€” browser sets it with the boundary for multipart

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
export async function fetchOrders({ limit = 25, cursor = null, signal = null } = {}) {
  try {
    const config = { params: { limit, cursor } };
    if (signal) config.signal = signal;
    const response = await apiGet("/orders", config);
    if (response && response.ok && Array.isArray(response.items)) {
      return { ok: true, items: response.items, nextCursor: response.nextCursor || null };
    }
    return { ok: false, items: [], nextCursor: null };
  } catch (err) {
    return { ok: false, items: [], nextCursor: null, error: err.message };
  }
}

export async function fetchOmnichannelOpsSnapshot({ limit = 25, source = '' } = {}) {
  try {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (source) params.append('source', source);
    const response = await apiGet(`/orders/ops/omnichannel?${params.toString()}`);
    if (response && response.ok) {
      return {
        ok: true,
        summary: response.summary || {},
        sales: Array.isArray(response.sales) ? response.sales : [],
        pendingCryptoOrders: Array.isArray(response.pendingCryptoOrders) ? response.pendingCryptoOrders : [],
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to load ops snapshot' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function fetchProvenanceOpsSnapshot({ limit = 20 } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  try {
    const response = await apiGet(`/orders/ops/provenance?${params.toString()}`);
    if (response && response.ok) {
      return {
        ok: true,
        summary: response.summary || {},
        duplicateFingerprintRows: Array.isArray(response.duplicateFingerprintRows)
          ? response.duplicateFingerprintRows
          : [],
        recentReverseImageRisks: Array.isArray(response.recentReverseImageRisks)
          ? response.recentReverseImageRisks
          : [],
        recentRoyaltySales: Array.isArray(response.recentRoyaltySales)
          ? response.recentRoyaltySales
          : [],
        recentReviewLogs: Array.isArray(response.recentReviewLogs)
          ? response.recentReviewLogs
          : [],
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to load provenance ops snapshot' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function updateItemProvenanceReview(itemId, { verificationStatus, reviewNotes = '' } = {}) {
  if (!itemId) return { ok: false, error: 'Missing item id' };
  try {
    const response = await apiPost(`/items/${encodeURIComponent(itemId)}/provenance/review`, {
      verificationStatus,
      reviewNotes,
    });
    if (response && response.ok) {
      return {
        ok: true,
        item: response.item || null,
        message: response.message || 'Provenance review updated',
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to update provenance review' };
  } catch (err) {
    return { ok: false, error: err.message };
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

export async function prepareCryptoCheckout({ itemId, buyerWallet = '', buyerEmail = '' } = {}) {
  if (!itemId) return { ok: false, error: 'Missing item id' };
  try {
    const response = await apiPost('/checkout/crypto/prepare', {
      itemId,
      buyerWallet,
      buyerEmail,
    });
    if (response && response.ok) {
      return {
        ok: true,
        orderId: response.orderId,
        network: response.network,
        chainId: response.chainId,
        recipientAddress: response.recipientAddress,
        amountWei: response.amountWei,
        quoteUsdPerEth: response.quoteUsdPerEth,
        quoteGeneratedAt: response.quoteGeneratedAt,
        memo: response.memo,
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to prepare crypto checkout' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function confirmCryptoCheckoutPayment({ orderId, txHash, buyerWallet = '' } = {}) {
  if (!orderId || !txHash) return { ok: false, error: 'Missing order id or tx hash' };
  try {
    const response = await apiPost('/checkout/crypto/confirm', {
      orderId,
      txHash,
      buyerWallet,
    });
    if (response && response.ok) {
      return {
        ok: true,
        orderId: response.orderId,
        txHash: response.txHash,
        explorerUrl: response.explorerUrl,
        blockchainReceipt: response.blockchainReceipt || null,
        delistResults: Array.isArray(response.delistResults) ? response.delistResults : [],
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to confirm crypto checkout' };
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

export async function finalizeCheckoutSession(sessionId) {
  if (!sessionId) return { ok: false, error: 'Missing session id' };
  try {
    const response = await apiPost('/checkout/finalize-session', { session_id: sessionId });
    if (response && response.ok) {
      return {
        ok: true,
        pending: Boolean(response.pending),
        finalized: Boolean(response.finalized),
        orderId: response.orderId || '',
        paymentStatus: response.paymentStatus || '',
        certificateId: response.certificateId || '',
        downloadUrl: response.downloadUrl || '',
        blockchainReceipt: response.blockchainReceipt || null,
        delistResults: Array.isArray(response.delistResults) ? response.delistResults : [],
        duplicate: Boolean(response.duplicate),
      };
    }
    return { ok: false, error: response?.error || 'Failed to finalize checkout session' };
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

export async function fetchItemProvenanceFeed(slugOrId) {
  if (!slugOrId) return { ok: false, error: 'Missing item id' };
  try {
    const response = await apiGet(`/items/${encodeURIComponent(slugOrId)}/provenance-feed`);
    if (response && response.ok) {
      return {
        ok: true,
        payload: response.payload || null,
        signature: response.signature || '',
        algorithm: response.algorithm || 'none',
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to fetch provenance feed' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function fetchItemProvenanceVerification(slugOrId, { live = true } = {}) {
  if (!slugOrId) return { ok: false, error: 'Missing item id' };
  try {
    const params = new URLSearchParams();
    params.set('live', live ? 'true' : 'false');
    const response = await apiGet(`/items/${encodeURIComponent(slugOrId)}/provenance/verify?${params.toString()}`);
    if (response && response.ok) {
      return {
        ok: true,
        itemId: response.itemId || '',
        slug: response.slug || '',
        verification: response.verification || null,
        onChain: response?.verification?.onChain || null,
        payload: response.payload || null,
        signature: response.signature || '',
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to verify provenance' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
// Marketplace API functions
// fetchMarketplaceItems({ limit=12, cursor=null, category=null, q=null, signal=null, availabilityStatus=null, isUnique=null, originCountry=null, color=null })
export async function fetchMarketplaceItems({
  limit = 12,
  cursor = null,
  category = null,
  q = null,
  signal = null,
  availabilityStatus = null,
  isUnique = null,
  originCountry = null,
  color = null,
} = {}) {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (cursor) params.append('cursor', cursor);
    if (category) params.append('category', category);
    if (q) params.append('q', q);
    if (availabilityStatus) params.append('availabilityStatus', availabilityStatus);
    if (isUnique === true || isUnique === false) params.append('isUnique', String(isUnique));
    if (originCountry) params.append('originCountry', originCountry);
    if (color) params.append('color', color);
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

export async function createMarketplaceInquiry(payload) {
  try {
    const response = await apiPost('/item-inquiries', payload);
    if (response && response.ok && response.inquiry) {
      return {
        ok: true,
        inquiry: response.inquiry,
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to send inquiry' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function checkMarketplaceItemProvenance(payload) {
  try {
    const response = await apiPost('/items/provenance/check', payload);
    if (response && response.ok) {
      return {
        ok: true,
        candidate: response.candidate || null,
        duplicates: Array.isArray(response.duplicates) ? response.duplicates : [],
        reverseImage: response.reverseImage || null,
        isDuplicateLikely: Boolean(response.isDuplicateLikely),
      };
    }
    return {
      ok: false,
      candidate: null,
      duplicates: [],
      reverseImage: null,
      isDuplicateLikely: false,
      error: response?.error || response?.message || 'Failed to run provenance check',
    };
  } catch (err) {
    return {
      ok: false,
      candidate: null,
      duplicates: [],
      reverseImage: null,
      isDuplicateLikely: false,
      error: err.message,
    };
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

export async function fetchOmnichannelStatus(itemId) {
  if (!itemId) return { ok: false, error: 'Missing item id' };
  try {
    const response = await apiGet(`/omnichannel/${encodeURIComponent(itemId)}`);
    if (response && response.ok) {
      return {
        ok: true,
        itemId: response.itemId,
        soldState: response.soldState || { isSold: false },
        channels: Array.isArray(response.channels) ? response.channels : [],
        lastSyncAt: response.lastSyncAt || null,
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to fetch omnichannel status' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function fetchOmnichannelSaleHistory(itemId, { limit = 10 } = {}) {
  if (!itemId) return { ok: false, error: 'Missing item id', sales: [] };
  try {
    const response = await apiGet(`/omnichannel/${encodeURIComponent(itemId)}/sales?limit=${encodeURIComponent(limit)}`);
    if (response && response.ok) {
      return {
        ok: true,
        itemId: response.itemId,
        sales: Array.isArray(response.sales) ? response.sales : [],
      };
    }
    return { ok: false, sales: [], error: response?.error || response?.message || 'Failed to fetch sale history' };
  } catch (err) {
    return { ok: false, sales: [], error: err.message };
  }
}

export async function saveOmnichannelListings(itemId, channels = []) {
  if (!itemId) return { ok: false, error: 'Missing item id' };
  try {
    const response = await apiPut(`/omnichannel/${encodeURIComponent(itemId)}/listings`, { channels });
    if (response && response.ok) {
      return {
        ok: true,
        channels: Array.isArray(response.channels) ? response.channels : [],
        soldState: response.soldState || { isSold: false },
        message: response.message || 'Marketplace listings saved',
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to save marketplace listings' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function completeOmnichannelSale(payload = {}) {
  try {
    const response = await apiPost('/omnichannel/sales/complete', payload);
    if (response && response.ok) {
      return {
        ok: true,
        duplicate: !!response.duplicate,
        alreadySold: !!response.alreadySold,
        soldState: response.soldState || { isSold: false },
        delistResults: Array.isArray(response.delistResults) ? response.delistResults : [],
        blockchainReceipt: response.blockchainReceipt || null,
        saleId: response.saleId || null,
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to complete sale sync' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function markListingSoldManually(itemId, payload = {}) {
  if (!itemId) return { ok: false, error: 'Missing item id' };
  try {
    const response = await apiPost(`/omnichannel/${encodeURIComponent(itemId)}/mark-sold`, payload);
    if (response && response.ok) {
      return {
        ok: true,
        duplicate: !!response.duplicate,
        alreadySold: !!response.alreadySold,
        soldState: response.soldState || { isSold: false },
        delistResults: Array.isArray(response.delistResults) ? response.delistResults : [],
        blockchainReceipt: response.blockchainReceipt || null,
        saleId: response.saleId || null,
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to mark listing sold' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function triggerOmnichannelPollingRun({ limit = 25 } = {}) {
  try {
    const response = await apiPost('/omnichannel/sync/poll-run', { limit });
    if (response && response.ok) {
      return {
        ok: true,
        summary: response.summary || {},
        results: Array.isArray(response.results) ? response.results : [],
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to run polling sync' };
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

export async function fetchCreatorRoyaltyDashboard(creatorAddress, { days = 365 } = {}) {
  if (!creatorAddress) return { ok: false, error: 'Missing creator address' };
  try {
    const response = await apiGet(`/analytics/dashboard/${encodeURIComponent(creatorAddress)}?days=${encodeURIComponent(days)}`);
    if (response && response.ok && response.dashboard) {
      return { ok: true, dashboard: response.dashboard };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to load dashboard' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function fetchCreatorRoyaltyHistory(creatorAddress, { limit = 100, offset = 0 } = {}) {
  if (!creatorAddress) return { ok: false, error: 'Missing creator address', history: null };
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    const response = await apiGet(`/analytics/royalty-history/${encodeURIComponent(creatorAddress)}?${params.toString()}`);
    if (response && response.ok && response.history) {
      return { ok: true, history: response.history };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to load royalty history', history: null };
  } catch (err) {
    return { ok: false, error: err.message, history: null };
  }
}

export async function recordRoyaltySale(payload = {}) {
  try {
    const response = await apiPost('/analytics/record-sale', payload);
    if (response && response.ok) {
      return { ok: true, event: response.event || null };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to record sale' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function exportCreatorRoyaltyCsv(creatorAddress) {
  if (!creatorAddress) return { ok: false, error: 'Missing creator address', csv: '' };
  try {
    const response = await api.get(`/analytics/export/${encodeURIComponent(creatorAddress)}`, {
      responseType: 'text',
      headers: { Accept: 'text/csv' },
    });

    return { ok: true, csv: String(response?.data || '') };
  } catch (err) {
    return { ok: false, error: err.message, csv: '' };
  }
}


export async function fetchAllRoyaltyEvents({ limit = 200, offset = 0, platform = '' } = {}) {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    if (platform) params.set('platform', String(platform));
    const response = await apiGet(`/analytics/all-events?${params.toString()}`);
    if (response && response.ok && response.data) {
      return { ok: true, events: response.data.events || [], total: response.data.total || 0 };
    }
    return { ok: false, error: response?.error || 'Failed to load events', events: [], total: 0 };
  } catch (err) {
    return { ok: false, error: err.message, events: [], total: 0 };
  }
}

// --- Notification helpers ---

export async function fetchNotificationBadge(recipientAddress) {
  try {
    const response = await apiGet(`/notifications/badge?recipientAddress=${encodeURIComponent(recipientAddress)}`);
    return { ok: true, unreadCount: response?.unreadCount ?? 0 };
  } catch (err) {
    return { ok: false, unreadCount: 0, error: err.message };
  }
}

export async function fetchNotifications(recipientAddress, { limit = 50, offset = 0, unreadOnly = false } = {}) {
  try {
    const params = new URLSearchParams();
    params.set('recipientAddress', recipientAddress);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    if (unreadOnly) params.set('unreadOnly', '1');
    const response = await apiGet(`/notifications?${params.toString()}`);
    if (response && response.ok) {
      return { ok: true, notifications: response.notifications || [], total: response.total || 0, unreadCount: response.unreadCount ?? 0 };
    }
    return { ok: false, notifications: [], total: 0, unreadCount: 0, error: response?.error };
  } catch (err) {
    return { ok: false, notifications: [], total: 0, unreadCount: 0, error: err.message };
  }
}

export async function markNotificationsRead(recipientAddress, ids = []) {
  try {
    await apiPost('/notifications/mark-read', { recipientAddress, ids });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function markAllNotificationsRead(recipientAddress) {
  try {
    await apiPost('/notifications/mark-all-read', { recipientAddress });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function deleteNotification(recipientAddress, id) {
  try {
    await apiDelete(`/notifications/${encodeURIComponent(id)}?recipientAddress=${encodeURIComponent(recipientAddress)}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// --- Search helpers ---

export async function searchArchiveText(q, { limit = 10 } = {}) {
  try {
    const params = new URLSearchParams();
    params.set('q', String(q || ''));
    params.set('limit', String(limit));
    const response = await apiGet(`/search/text?${params.toString()}`);
    if (response && response.success) {
      return { ok: true, results: response.results || [], count: response.count || 0 };
    }
    return { ok: false, error: response?.error || 'Search failed', results: [], count: 0 };
  } catch (err) {
    return { ok: false, error: err.message, results: [], count: 0 };
  }
}

export async function searchArtifacts(q, { limit = 10 } = {}) {
  try {
    const params = new URLSearchParams();
    params.set('q', String(q || ''));
    params.set('limit', String(limit));
    const response = await apiGet(`/search/artifacts?${params.toString()}`);
    if (response && response.success) {
      return { ok: true, results: response.results || [], count: response.count || 0 };
    }
    return { ok: false, error: response?.error || 'Artifact search failed', results: [], count: 0 };
  } catch (err) {
    return { ok: false, error: err.message, results: [], count: 0 };
  }
}

export async function searchAll(q, { limit = 12 } = {}) {
  try {
    const params = new URLSearchParams();
    params.set('q', String(q || ''));
    params.set('limit', String(limit));
    const response = await apiGet(`/search/all?${params.toString()}`);
    if (response && response.success) {
      return {
        ok: true,
        results: response.results || [],
        count: response.count || 0,
        breakdown: response.breakdown || { entries: 0, artifacts: 0 },
      };
    }
    return {
      ok: false,
      error: response?.error || 'Combined search failed',
      results: [],
      count: 0,
      breakdown: { entries: 0, artifacts: 0 },
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      results: [],
      count: 0,
      breakdown: { entries: 0, artifacts: 0 },
    };
  }
}
