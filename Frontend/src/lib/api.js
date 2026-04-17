import api from "./axios";
import { ENV } from "../config/env";
import { getToken } from "./auth";
import { FEATURED_INVENTORY, findFeaturedItem } from "./featuredInventory";

function normalizeApiBaseUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  let next = value.replace(/\/+$/, '');
  // Ensure callers can provide either host root or full /api base.
  if (!/\/api$/i.test(next)) {
    next = `${next}/api`;
  }
  return next;
}

function resolveApiBaseUrl() {
  try {
    const localOverride = localStorage.getItem('api-base-url');
    if (localOverride) {
      const normalizedOverride = normalizeApiBaseUrl(localOverride);
      if (normalizedOverride) return normalizedOverride;
    }
  } catch (_err) {
    // Ignore localStorage read errors and continue with environment fallback.
  }
  return normalizeApiBaseUrl(ENV.API_URL);
}

export const apiGet = (path, config) => api.get(path, config).then(r => r.data);
export const apiPost = (path, body, config) => api.post(path, body, config).then(r => r.data);
export const apiPut = (path, body, config) => api.put(path, body, config).then(r => r.data);
export const apiPatch = (path, body, config) => api.patch(path, body, config).then(r => r.data);
export const apiDelete = (path, config) => api.delete(path, config).then(r => r.data);

export const fetchDeals = (params = {}) => apiGet('/deals', { params });
export const fetchDealById = (dealId) => apiGet(`/deals/${encodeURIComponent(dealId)}`);
export const createDeal = (payload) => apiPost('/deals', payload);
export const generatePvaDealPlan = (payload) => apiPost('/deals/pva/plan', payload);
export const fetchPvaDealCandidates = (params = {}) => apiGet('/deals/pva/candidates', { params });
export const assignDealPvaRoles = (dealId, payload) => apiPut(`/deals/${encodeURIComponent(dealId)}/pva/assign`, payload);
export const acceptDealPvaRole = (dealId, payload) => apiPost(`/deals/${encodeURIComponent(dealId)}/pva/accept-role`, payload);
export const fetchDealPvaNotificationQueue = (dealId) => apiGet(`/deals/${encodeURIComponent(dealId)}/pva/notification-queue`);
export const updateDealPvaNotificationQueueStatus = (dealId, notificationId, payload) =>
  apiPut(`/deals/${encodeURIComponent(dealId)}/pva/notification-queue/${encodeURIComponent(notificationId)}/status`, payload);
export const fetchDealPvaPayoutPreview = (dealId) => apiGet(`/deals/${encodeURIComponent(dealId)}/pva/payout-preview`);
export const createDealInvite = (dealId) => apiPost(`/deals/${encodeURIComponent(dealId)}/invite`, {});
export const joinDealAuthenticated = (inviteToken) => apiPost('/deals/join-authenticated', { inviteToken });
export const postDealMessage = (dealId, payload) => apiPost(`/deals/${encodeURIComponent(dealId)}/messages`, payload);
export const submitDealEvidence = (dealId, milestoneId, payload) =>
  apiPost(`/deals/${encodeURIComponent(dealId)}/milestones/${encodeURIComponent(milestoneId)}/evidence`, payload);
export const prepareDealEscrow = (dealId, payload = {}) => apiPost(`/deals/${encodeURIComponent(dealId)}/prepare-escrow`, payload);
export const mockFundDealEscrow = (dealId, payload) => apiPost(`/deals/${encodeURIComponent(dealId)}/escrow/mock-fund`, payload);
export const confirmDealReceipt = (dealId) => apiPost(`/deals/${encodeURIComponent(dealId)}/escrow/confirm-receipt`, {});
export const releaseDealEscrow = (dealId) => apiPost(`/deals/${encodeURIComponent(dealId)}/escrow/release`, {});
export const refundDealEscrow = (dealId) => apiPost(`/deals/${encodeURIComponent(dealId)}/escrow/refund`, {});
export const openDealDispute = (dealId, payload) => apiPost(`/deals/${encodeURIComponent(dealId)}/dispute`, payload);
export const fetchDealDispute = (dealId) => apiGet(`/deals/${encodeURIComponent(dealId)}/dispute`);
export const addDealDisputeEvidence = (dealId, payload) => apiPost(`/deals/${encodeURIComponent(dealId)}/dispute/evidence`, payload);
export const resolveDealDispute = (dealId, payload) => apiPut(`/deals/${encodeURIComponent(dealId)}/dispute/resolve`, payload);
export const autoAssignDealMediator = (dealId, payload = {}) => apiPost(`/deals/${encodeURIComponent(dealId)}/mediator/auto-assign`, payload);
export const requestDealCustomMediator = (dealId, payload) => apiPost(`/deals/${encodeURIComponent(dealId)}/mediator/request-custom`, payload);
export const approveDealMediator = (dealId, payload) => apiPut(`/deals/${encodeURIComponent(dealId)}/mediator/approve`, payload);
export const generateDealFraudPacket = (dealId, payload) => apiPost(`/deals/${encodeURIComponent(dealId)}/reports/fraud-packet`, payload);
export const fetchDealResolutionCertificate = (dealId) => apiGet(`/deals/${encodeURIComponent(dealId)}/reports/resolution-certificate`);
export const fetchDealExportBundle = (dealId, params = {}) => apiGet(`/deals/${encodeURIComponent(dealId)}/reports/export-bundle`, { params });
export const fetchDealOutboundQueue = (dealId, params = {}) => apiGet(`/deals/${encodeURIComponent(dealId)}/reports/outbound-queue`, { params });
export const updateDealOutboundQueueStatus = (dealId, packetId, payload) =>
  apiPut(`/deals/${encodeURIComponent(dealId)}/reports/outbound/${encodeURIComponent(packetId)}/status`, payload);

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
export const fetchTransactions = async (limit = 10) => {
  const boundedLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
  try {
    const [ordersResponse, escrowResponse] = await Promise.all([
      apiGet('/orders/mine', { params: { limit: boundedLimit } }).catch(() => ({ ok: false, items: [] })),
      apiGet('/orders/escrow', { params: { limit: boundedLimit } }).catch(() => ({ ok: false, items: [] })),
    ]);

    const orderItems = Array.isArray(ordersResponse?.items) ? ordersResponse.items : [];
    const escrowItems = Array.isArray(escrowResponse?.items) ? escrowResponse.items : [];

    const normalized = [
      ...orderItems.map((order) => ({
        _id: order?._id,
        type: 'buy',
        title: order?.itemSnapshot?.name || order?.itemName || 'Order',
        amount: Number(order?.amountTotal || 0) / 100,
        currency: order?.currency || 'USD',
        date: order?.createdAt || order?.updatedAt,
        status: order?.paymentStatus || order?.status || 'pending',
      })),
      ...escrowItems
        .filter((escrow) => Boolean(escrow?.isSeller))
        .map((escrow) => ({
          _id: escrow?.orderId,
          type: 'sale',
          title: escrow?.itemName || 'Escrow Sale',
          amount: Number(escrow?.amount || 0) / 100,
          currency: escrow?.currency || 'USD',
          date: escrow?.createdAt || escrow?.updatedAt,
          status: escrow?.status || 'held',
        })),
    ]
      .sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0))
      .slice(0, boundedLimit);

    return normalized;
  } catch (_err) {
    return [];
  }
};
export const fetchAdminTransactions = (limit = 25) =>
  apiGet('/admin/transactions/recent', { params: { limit } });

export const fetchGovernanceProposals = (params = {}) => apiGet('/governance/proposals', { params });
export const fetchGovernanceProposalById = (proposalId) =>
  apiGet(`/governance/proposals/${encodeURIComponent(proposalId)}`);
export const createGovernanceProposal = (payload) => apiPost('/governance/proposals', payload);
export const toggleGovernanceProposalSupport = (proposalId) =>
  apiPost(`/governance/proposals/${encodeURIComponent(proposalId)}/support`, {});
export const queueGovernanceProposal = (proposalId, payload) =>
  apiPost(`/governance/proposals/${encodeURIComponent(proposalId)}/queue`, payload);
export const updateGovernanceProposalLifecycleStatus = (proposalId, payload) =>
  apiPost(`/governance/proposals/${encodeURIComponent(proposalId)}/status`, payload);
export const publishGovernanceProposalOutcome = (proposalId, payload) =>
  apiPost(`/governance/proposals/${encodeURIComponent(proposalId)}/outcome`, payload);
export const createGovernanceWalletChallenge = (walletAddress) =>
  apiPost('/governance/wallet/challenge', { walletAddress });
export const verifyGovernanceWalletChallenge = (payload) =>
  apiPost('/governance/wallet/verify', payload);
export const submitGovernanceOnChainVote = (proposalId, payload) =>
  apiPost(`/governance/proposals/${encodeURIComponent(proposalId)}/votes/onchain`, payload);
export const fetchGovernanceVoteSummary = (proposalId) =>
  apiGet(`/governance/proposals/${encodeURIComponent(proposalId)}/votes/summary`);
export const fetchGovernanceAdminResponses = () => apiGet('/governance/admin-responses');
export const fetchGovernanceAdminSyncHealth = () => apiGet('/governance/admin-responses/sync-health');
export const repairGovernanceAdminLifecycleSync = (proposalId) =>
  apiPost(`/governance/admin-responses/${encodeURIComponent(proposalId)}/repair-lifecycle`, {});
export const upsertGovernanceAdminResponse = (proposalId, payload) =>
  apiPut(`/governance/admin-responses/${encodeURIComponent(proposalId)}`, payload);
export const fetchGovernanceExecutionTimeline = (proposalId) =>
  apiGet(`/governance/proposals/${encodeURIComponent(proposalId)}/execution/timeline`);
export const postGovernanceExecutionUpdate = (proposalId, payload) =>
  apiPost(`/governance/proposals/${encodeURIComponent(proposalId)}/execution/updates`, payload);
export const fetchGovernanceDraft = () => apiGet('/governance/drafts');
export const saveGovernanceDraft = (draft) => apiPut('/governance/drafts', { draft });
export const clearGovernanceDraft = () => apiDelete('/governance/drafts');

export const fetchCurrentUser = () => apiGet('/auth/me');
export const fetchProposals = (params = {}) => apiGet('/proposals', { params });
export const fetchProposalById = (proposalId) => apiGet(`/proposals/${encodeURIComponent(proposalId)}`);
export const createProposal = (payload) => apiPost('/proposals', payload);
export const publishProposal = (proposalId) => apiPost(`/proposals/${encodeURIComponent(proposalId)}/publish`, {});
export const endorseProposal = (proposalId) => apiPost(`/proposals/${encodeURIComponent(proposalId)}/endorse`, {});
export const unendorseProposal = (proposalId) => apiDelete(`/proposals/${encodeURIComponent(proposalId)}/endorse`);
export const fetchMyProposals = () => apiGet('/proposals/my/submissions');
export const fetchAdminEndorsedProposals = () => apiGet('/admin/proposals/endorsed');
export const respondToProposal = (proposalId, payload) => apiPost(`/admin/proposals/${encodeURIComponent(proposalId)}/respond`, payload);
export const setProposalStatus = (proposalId, payload) => apiPut(`/admin/proposals/${encodeURIComponent(proposalId)}/status`, payload);
export const setProposalExecutionProject = (proposalId, payload) => apiPost(`/admin/proposals/${encodeURIComponent(proposalId)}/execution`, payload);

export const fetchMyPassport = () => apiGet('/passport/me');
export const fetchPassportByUserId = (userId) => apiGet(`/passport/${encodeURIComponent(userId)}`);
export const updatePassportProfile = (payload) => apiPut('/passport/profile', payload);
export const requestPassportVerification = () => apiPost('/passport/verify-request', {});
export const requestPassportWalletChallenge = () => apiPost('/passport/challenge/request', {});
export const verifyPassportWalletChallenge = (payload) => apiPost('/passport/challenge/verify', payload);
export const verifyPassportCredential = (params = {}) => apiGet('/passport/verify', { params });
export const fetchPassportAudit = (userId) => apiGet(`/passport/audit/${encodeURIComponent(userId)}`);
export const fetchCitizenDirectory = (params = {}) => apiGet('/passport/citizens', { params });
export const fetchPendingPassports = () => apiGet('/admin/passport/pending');
export const approvePassport = (userId) => apiPost(`/admin/passport/approve/${encodeURIComponent(userId)}`, {});
export const issuePassportCredential = (userId, payload = {}) =>
  apiPost(`/admin/passport/credential/issue/${encodeURIComponent(userId)}`, payload);
export const refreshPassportCredential = (userId) =>
  apiPost(`/admin/passport/credential/refresh/${encodeURIComponent(userId)}`, {});
export const updatePassportClaims = (userId, payload = {}) =>
  apiPost(`/admin/passport/claims/${encodeURIComponent(userId)}`, payload);

/**
 * Upload a FormData payload (multipart/form-data).
 * Uses native fetch so the browser can set the correct Content-Type boundary.
 * Attaches the auth token automatically.
 */
export async function apiUpload(path, formData) {
  const API_BASE = resolveApiBaseUrl();
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
  const API_BASE = resolveApiBaseUrl();
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
  return resolveApiBaseUrl();
}

export function setApiBase(url) {
  if (url) {
    localStorage.setItem('api-base-url', normalizeApiBaseUrl(url));
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

export async function fetchCryptoCheckoutConfig() {
  try {
    const response = await apiGet('/checkout/crypto/config');
    if (response && response.ok) {
      return {
        ok: true,
        available: Boolean(response.available),
        recipientAddress: response.recipientAddress || '',
        network: response.network || 'base',
        chainId: Number(response.chainId || 8453),
        quoteUsdPerEth: Number(response.quoteUsdPerEth || 0),
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to load crypto checkout config' };
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

export async function cancelCheckoutSession(sessionId) {
  if (!sessionId) return { ok: false, error: 'Missing session id' };
  try {
    const response = await apiPost('/checkout/cancel-session', { session_id: sessionId });
    if (response && response.ok) {
      return {
        ok: true,
        cancelled: Boolean(response.cancelled),
        released: Boolean(response.released),
        alreadyFinalized: Boolean(response.alreadyFinalized),
        orderId: response.orderId || '',
      };
    }
    return { ok: false, error: response?.error || 'Failed to cancel checkout session' };
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
    const fallbackItem = findFeaturedItem(slugOrId);
    if (fallbackItem) {
      return { ok: true, item: fallbackItem, fallback: true };
    }
    return { ok: false, item: null };
  } catch (err) {
    const fallbackItem = findFeaturedItem(slugOrId);
    if (fallbackItem) {
      return { ok: true, item: fallbackItem, fallback: true };
    }
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
      const hasFilters = Boolean(category || q || availabilityStatus || isUnique === true || isUnique === false || originCountry || color);
      if (!hasFilters && response.items.length === 0) {
        return {
          ok: true,
          items: FEATURED_INVENTORY.slice(0, limit),
          nextCursor: null,
          categories: [...new Set(FEATURED_INVENTORY.map((item) => item.category).filter(Boolean))],
          fallback: true,
        };
      }
      return {
        ok: true,
        items: response.items,
        nextCursor: response.nextCursor || null,
        categories: response.categories || [],
      };
    }
    const hasFilters = Boolean(category || q || availabilityStatus || isUnique === true || isUnique === false || originCountry || color);
    if (!hasFilters) {
      return {
        ok: true,
        items: FEATURED_INVENTORY.slice(0, limit),
        nextCursor: null,
        categories: [...new Set(FEATURED_INVENTORY.map((item) => item.category).filter(Boolean))],
        fallback: true,
      };
    }
    return { ok: false, items: [], nextCursor: null, categories: [] };
  } catch (err) {
    const hasFilters = Boolean(category || q || availabilityStatus || isUnique === true || isUnique === false || originCountry || color);
    if (!hasFilters) {
      return {
        ok: true,
        items: FEATURED_INVENTORY.slice(0, limit),
        nextCursor: null,
        categories: [...new Set(FEATURED_INVENTORY.map((item) => item.category).filter(Boolean))],
        fallback: true,
      };
    }
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
    return {
      ok: false,
      error: response?.error || response?.message || 'Failed to create item',
      code: response?.code || '',
      missingFields: Array.isArray(response?.missingFields) ? response.missingFields : [],
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.response?.data?.error || err?.response?.data?.message || err.message,
      code: err?.response?.data?.code || '',
      missingFields: Array.isArray(err?.response?.data?.missingFields) ? err.response.data.missingFields : [],
    };
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

export async function fetchItemInquiries({ limit = 30, status = '', q = '' } = {}) {
  try {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (status) params.append('status', status);
    if (q) params.append('q', q);
    const response = await apiGet(`/item-inquiries?${params.toString()}`);
    if (response && response.ok && Array.isArray(response.items)) {
      return {
        ok: true,
        items: response.items,
        summary: response.summary || { new: 0, contacted: 0, reserved: 0, closed: 0, total: 0 },
      };
    }
    return {
      ok: false,
      items: [],
      summary: { new: 0, contacted: 0, reserved: 0, closed: 0, total: 0 },
      error: response?.error || response?.message || 'Failed to fetch inquiries',
    };
  } catch (err) {
    return {
      ok: false,
      items: [],
      summary: { new: 0, contacted: 0, reserved: 0, closed: 0, total: 0 },
      error: err.message,
    };
  }
}

export async function updateItemInquiryStatus(inquiryId, { status, notes = '' } = {}) {
  if (!inquiryId) return { ok: false, error: 'Missing inquiry id' };
  try {
    const response = await apiPatch(`/item-inquiries/${encodeURIComponent(inquiryId)}/status`, {
      status,
      notes,
    });
    if (response && response.ok) {
      return { ok: true, inquiry: response.inquiry || null };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to update inquiry' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function releaseItemInquiryReservation(inquiryId) {
  if (!inquiryId) return { ok: false, error: 'Missing inquiry id' };
  try {
    const response = await apiPost(`/item-inquiries/${encodeURIComponent(inquiryId)}/release-reservation`, {});
    if (response && response.ok) {
      return {
        ok: true,
        inquiry: response.inquiry || null,
        artifact: response.artifact || null,
      };
    }
    return { ok: false, error: response?.error || response?.message || 'Failed to release reservation' };
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
    const status = err?.response?.status;
    if (status === 404 || status === 410) {
      return { ok: true, unreadCount: 0 };
    }
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
    const status = err?.response?.status;
    if (status === 404 || status === 410) {
      return { ok: true, notifications: [], total: 0, unreadCount: 0 };
    }
    return { ok: false, notifications: [], total: 0, unreadCount: 0, error: err.message };
  }
}

export async function markNotificationsRead(recipientAddress, ids = []) {
  try {
    await apiPost('/notifications/mark-read', { recipientAddress, ids });
    return { ok: true };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404 || status === 410) {
      return { ok: true };
    }
    return { ok: false, error: err.message };
  }
}

export async function markAllNotificationsRead(recipientAddress) {
  try {
    await apiPost('/notifications/mark-all-read', { recipientAddress });
    return { ok: true };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404 || status === 410) {
      return { ok: true };
    }
    return { ok: false, error: err.message };
  }
}

export async function deleteNotification(recipientAddress, id) {
  try {
    await apiDelete(`/notifications/${encodeURIComponent(id)}?recipientAddress=${encodeURIComponent(recipientAddress)}`);
    return { ok: true };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404 || status === 410) {
      return { ok: true };
    }
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
