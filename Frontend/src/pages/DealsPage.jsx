import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  createDealInvite,
  generatePvaDealPlan,
  fetchPvaDealCandidates,
  assignDealPvaRoles,
  acceptDealPvaRole,
  fetchDealPvaNotificationQueue,
  updateDealPvaNotificationQueueStatus,
  fetchDealPvaPayoutPreview,
  fetchDeals,
  fetchDealById,
  generateDealFraudPacket,
  fetchDealResolutionCertificate,
  fetchDealExportBundle,
  mockFundDealEscrow,
  fetchDealDispute,
  addDealDisputeEvidence,
  fetchDealOutboundQueue,
  updateDealOutboundQueueStatus,
  autoAssignDealMediator,
  requestDealCustomMediator,
  approveDealMediator,
  openDealDispute,
  prepareDealEscrow,
  refundDealEscrow,
  releaseDealEscrow,
  resolveDealDispute,
  confirmDealReceipt,
} from '../lib/api';
import { buildDealMessageTypedData, buildDealEvidenceTypedData, signTypedData } from '../lib/eip712';
import { getErrorMessage, withRetry } from '../lib/errorUtils';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import HelpTip from '../components/HelpTip.jsx';
import AdminNav from '../components/AdminNav.jsx';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import './DealsPage.css';

export default function DealsPage() {
  const { darkMode, toggleTheme } = useArchiveTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSavedOk, setPrefsSavedOk] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftRestoreHint, setDraftRestoreHint] = useState('');

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    counterpartyName: '',
    counterpartyCountry: '',
    counterpartyWallet: '',
    totalAmount: '',
    currency: 'USD',
    payments: [
      { label: 'Deposit', amount: '', currency: 'USD', status: 'pending' },
      { label: 'Mid', amount: '', currency: 'USD', status: 'pending' },
      { label: 'Final', amount: '', currency: 'USD', status: 'pending' },
    ],
    milestones: [
      { title: 'Tracking number provided', evidenceType: 'tracking_number', status: 'pending' },
      { title: 'Delivery confirmed', evidenceType: 'message', status: 'pending' },
    ],
    pva: null,
  });

  const [pvaPlanLoading, setPvaPlanLoading] = useState(false);
  const [pvaPlan, setPvaPlan] = useState(null);
  const [pvaCandidatesLoading, setPvaCandidatesLoading] = useState(false);
  const [pvaPlanner, setPvaPlanner] = useState({
    requestTitle: '',
    buyerName: '',
    buyerUserId: '',
    buyerCountry: '',
    buyerCity: '',
    buyerWalletAddress: '',
    creatorName: '',
    creatorUserId: '',
    creatorCountry: '',
    creatorCity: '',
    creatorWalletAddress: '',
    shipperName: '',
    shipperUserId: '',
    shipperCountry: '',
    shipperCity: '',
    shipperWalletAddress: '',
    productionCost: '120',
    shippingCost: '55',
    platformFee: '20',
    routeKm: '850',
    estimatedProductionDays: '6',
    estimatedTransitDays: '4',
    reliability: '82',
    consolidation: '66',
    reputation: '79',
    creatorStakePct: '50',
    shipperStakePct: '50',
  });

  const [newMessage, setNewMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [evidenceDrafts, setEvidenceDrafts] = useState({});
  const [milestoneHashes, setMilestoneHashes] = useState({});
  const [escrowPrepare, setEscrowPrepare] = useState(null);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [wallet, setWallet] = useState({ address: '', chainId: '', connecting: false });
  const [requireSignature, setRequireSignature] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [reportPacket, setReportPacket] = useState(null);
  const [mockProofNote, setMockProofNote] = useState('Parties confirmed mock transfer via screenshots');
  const [mockProofUrl, setMockProofUrl] = useState('');
  const [disputeData, setDisputeData] = useState(null);
  const [disputeEvidenceNote, setDisputeEvidenceNote] = useState('');
  const [disputeEvidenceUrl, setDisputeEvidenceUrl] = useState('');
  const [resolutionCode, setResolutionCode] = useState('');
  const [resolutionCertificate, setResolutionCertificate] = useState(null);
  const [exportBundle, setExportBundle] = useState(null);
  const [workspaceCandidates, setWorkspaceCandidates] = useState({ creators: [], shippers: [] });
  const [workspaceCandidatesLoading, setWorkspaceCandidatesLoading] = useState(false);
  const [pvaRoleDraft, setPvaRoleDraft] = useState({ creatorUserId: '', shipperUserId: '' });
  const [pvaNotificationQueue, setPvaNotificationQueue] = useState([]);
  const [pvaNotificationStatusDrafts, setPvaNotificationStatusDrafts] = useState({});
  const [pvaNotificationFilter, setPvaNotificationFilter] = useState('all');
  const [pvaPayoutPreview, setPvaPayoutPreview] = useState([]);
  const [pvaRoleAcceptance, setPvaRoleAcceptance] = useState(null);
  const [pvaWorkflow, setPvaWorkflow] = useState(null);
  const [forfeitCreator, setForfeitCreator] = useState(true);
  const [forfeitShipper, setForfeitShipper] = useState(true);
  const [collateralResolutionNote, setCollateralResolutionNote] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState('all');
  const [outboundQueue, setOutboundQueue] = useState([]);
  const [queueStatusDrafts, setQueueStatusDrafts] = useState({});
  const [mediatorRequest, setMediatorRequest] = useState({ name: '', email: '', contact: '', notes: '' });
  const [mediatorApproval, setMediatorApproval] = useState({ mediatorUserId: '', note: '' });

  const viewerId = useMemo(() => String(profile?._id || profile?.id || ''), [profile?._id, profile?.id]);

  const viewerRole = useMemo(() => {
    if (!selected) return 'none';
    if (profile?.role === 'admin') return 'admin';
    if (!viewerId) return 'none';
    if (String(selected.ownerId || '') === viewerId) return 'seller';
    if (String(selected.counterparty?.userId || '') === viewerId) return 'buyer';
    const pvaParty = (selected?.pva?.parties || []).find((party) => String(party?.userId || '') === viewerId);
    if (pvaParty?.role === 'creator') return 'creator';
    if (pvaParty?.role === 'shipper') return 'shipper';
    if (pvaParty?.role === 'buyer') return 'buyer';
    if (String(selected.mediatorId || '') === viewerId) return 'mediator';
    return 'none';
  }, [selected, profile?.role, viewerId]);

  const escrowStatus = String(selected?.escrow?.status || 'draft');
  const disputeStatus = String(disputeData?.status || selected?.dispute?.status || 'none');
  const isEscrowFinalized = escrowStatus === 'released' || escrowStatus === 'refunded';

  const canMockFund = useMemo(() => {
    if (!selected) return false;
    if (isEscrowFinalized) return false;
    const roleAllowed = ['buyer', 'seller', 'creator', 'shipper', 'mediator', 'admin'].includes(viewerRole);
    const statusAllowed = ['draft', 'funded_mock', 'funded_live', 'awaiting_receipt', 'disputed'].includes(escrowStatus);
    return roleAllowed && statusAllowed;
  }, [selected, isEscrowFinalized, viewerRole, escrowStatus]);

  const canConfirmReceipt = useMemo(() => {
    if (!selected) return false;
    const roleAllowed = ['buyer', 'admin'].includes(viewerRole);
    const statusAllowed = ['funded_mock', 'funded_live', 'awaiting_receipt'].includes(escrowStatus);
    return roleAllowed && statusAllowed && disputeStatus !== 'open';
  }, [selected, viewerRole, escrowStatus, disputeStatus]);

  const canRelease = useMemo(() => {
    if (!selected || isEscrowFinalized) return false;
    const roleAllowed = ['seller', 'mediator', 'admin'].includes(viewerRole);
    const statusAllowed = ['buyer_confirmed', 'disputed', 'funded_mock', 'funded_live', 'awaiting_receipt'].includes(escrowStatus);
    if (!roleAllowed || !statusAllowed) return false;
    if (disputeStatus === 'open' && !['mediator', 'admin'].includes(viewerRole)) return false;
    return true;
  }, [selected, isEscrowFinalized, viewerRole, escrowStatus, disputeStatus]);

  const canRefund = useMemo(() => {
    if (!selected || isEscrowFinalized) return false;
    const roleAllowed = ['seller', 'mediator', 'admin'].includes(viewerRole);
    const statusAllowed = ['funded_mock', 'funded_live', 'awaiting_receipt', 'buyer_confirmed', 'disputed'].includes(escrowStatus);
    return roleAllowed && statusAllowed;
  }, [selected, isEscrowFinalized, viewerRole, escrowStatus]);

  const canOpenDispute = useMemo(() => {
    if (!selected) return false;
    const roleAllowed = ['buyer', 'seller', 'creator', 'shipper', 'mediator', 'admin'].includes(viewerRole);
    return roleAllowed && disputeStatus !== 'open' && escrowStatus !== 'draft';
  }, [selected, viewerRole, disputeStatus, escrowStatus]);

  const canResolveDisputeUi = useMemo(() => {
    if (!selected) return false;
    const roleAllowed = ['seller', 'mediator', 'admin'].includes(viewerRole);
    return roleAllowed && disputeStatus === 'open';
  }, [selected, viewerRole, disputeStatus]);

  const canAddDisputeEvidenceUi = useMemo(() => {
    if (!selected) return false;
    const roleAllowed = ['buyer', 'seller', 'creator', 'shipper', 'mediator', 'admin'].includes(viewerRole);
    return roleAllowed && disputeStatus === 'open';
  }, [selected, viewerRole, disputeStatus]);

  const canAssignPvaRoles = useMemo(() => {
    if (!selected) return false;
    return ['seller', 'mediator', 'admin'].includes(viewerRole);
  }, [selected, viewerRole]);

  const currentRoleAcceptance = pvaRoleAcceptance || selected?.pva?.roleAcceptance || {};
  const currentWorkflow = pvaWorkflow || selected?.pva?.workflow || null;

  const viewerPvaAssignedRole = useMemo(() => {
    if (!selected || !viewerId) return '';
    const party = (selected?.pva?.parties || []).find((p) => String(p?.userId || '') === viewerId);
    const role = String(party?.role || '');
    return ['creator', 'shipper', 'buyer'].includes(role) ? role : '';
  }, [selected, viewerId]);

  const viewerRoleAcceptanceStatus = useMemo(() => {
    if (!viewerPvaAssignedRole) return 'n/a';
    return String(currentRoleAcceptance?.[viewerPvaAssignedRole]?.status || 'pending');
  }, [viewerPvaAssignedRole, currentRoleAcceptance]);

  const roleMilestoneMap = useMemo(() => ({
    seller: 'seller',
    buyer: 'buyer',
    creator: 'creator',
    shipper: 'shipper',
    mediator: 'mediator',
    admin: 'any',
  }), []);

  const myTaskMilestones = useMemo(() => {
    const milestones = Array.isArray(selected?.milestones) ? selected.milestones : [];
    const myRole = roleMilestoneMap[viewerRole] || 'none';
    return milestones.filter((m) => {
      const assigned = String(m?.assignedRole || 'any');
      if (myRole === 'none') return false;
      if (myRole === 'any') return true;
      if (assigned === 'any') return true;
      if (assigned === 'creator' && myRole === 'seller') return true;
      return assigned === myRole;
    });
  }, [selected?.milestones, viewerRole, roleMilestoneMap]);

  const disputeImpactPreview = useMemo(() => {
    const total = Number(selected?.totalAmount || 0);
    const creatorPct = Number(selected?.pva?.collateral?.creatorStakePct || 0);
    const shipperPct = Number(selected?.pva?.collateral?.shipperStakePct || 0);
    return {
      total,
      creatorForfeit: Number(((total * creatorPct) / 100).toFixed(2)),
      shipperForfeit: Number(((total * shipperPct) / 100).toFixed(2)),
      currency: selected?.currency || 'USD',
    };
  }, [selected?.totalAmount, selected?.pva?.collateral?.creatorStakePct, selected?.pva?.collateral?.shipperStakePct, selected?.currency]);

  const canAssignPlatformMediator = useMemo(() => {
    if (!selected) return false;
    return ['seller', 'admin'].includes(viewerRole);
  }, [selected, viewerRole]);

  const canRequestCustomMediator = useMemo(() => {
    if (!selected) return false;
    return ['buyer', 'seller', 'mediator', 'admin'].includes(viewerRole);
  }, [selected, viewerRole]);

  const canApproveMediator = useMemo(() => {
    if (!selected) return false;
    return viewerRole === 'admin';
  }, [selected, viewerRole]);

  const visiblePvaNotificationQueue = useMemo(() => {
    const queue = Array.isArray(pvaNotificationQueue) ? [...pvaNotificationQueue] : [];
    const filtered = pvaNotificationFilter === 'all'
      ? queue
      : queue.filter((entry) => String(entry?.status || '') === pvaNotificationFilter);
    const notHidden = filtered.filter((entry) => !entry?.hiddenFromView);
    notHidden.sort((a, b) => {
      const at = new Date(a?.createdAt || 0).getTime();
      const bt = new Date(b?.createdAt || 0).getTime();
      return bt - at;
    });
    return notHidden;
  }, [pvaNotificationQueue, pvaNotificationFilter]);

  const displayedPvaNotificationQueue = useMemo(
    () => visiblePvaNotificationQueue.slice(0, 12),
    [visiblePvaNotificationQueue]
  );

  function getPvaPendingQueueCount(dealItem) {
    const queue = Array.isArray(dealItem?.pva?.notificationQueue) ? dealItem.pva.notificationQueue : [];
    return queue.filter((entry) => String(entry?.status || 'queued') === 'queued').length;
  }

  const RESOLUTION_REASON_CODES = {
    release: [
      'BUYER_CONFIRMED_AUTHENTIC',
      'MUTUAL_SETTLEMENT',
      'EVIDENCE_FAVORS_SELLER',
      'ADMIN_OVERRIDE_COMPLIANCE',
    ],
    refund: [
      'COUNTERFEIT_OR_MISREPRESENTED',
      'NON_DELIVERY',
      'MATERIAL_BREACH',
      'EVIDENCE_FAVORS_BUYER',
      'ADMIN_OVERRIDE_COMPLIANCE',
    ],
  };

  const CHAINS = [
    { id: 1, name: 'Ethereum', hex: '0x1' },
    { id: 137, name: 'Polygon', hex: '0x89' },
    { id: 8453, name: 'Base', hex: '0x2105' },
  ];

  function hasEthereum() {
    return typeof window !== 'undefined' && !!window.ethereum?.request;
  }

  async function connectWallet() {
    setError('');
    if (!hasEthereum()) {
      setError('No wallet detected. Install MetaMask or use a wallet-enabled browser.');
      return;
    }
    setWallet((w) => ({ ...w, connecting: true }));
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = Array.isArray(accounts) ? String(accounts[0] || '') : '';
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setWallet({ address, chainId: String(chainId || ''), connecting: false });

      // Best-effort: prefill default wallet if user hasn't set one yet.
      if (address && !profile?.preferences?.defaultWalletAddress) {
        setProfile((p) => ({
          ...(p || {}),
          preferences: { ...((p && p.preferences) || {}), defaultWalletAddress: address },
        }));
      }
    } catch (e) {
      setWallet((w) => ({ ...w, connecting: false }));
      setError(e?.message || 'Failed to connect wallet');
    }
  }

  async function switchChain(hexChainId) {
    setError('');
    if (!hasEthereum()) return;
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setWallet((w) => ({ ...w, chainId: String(chainId || '') }));
    } catch (e) {
      setError(e?.message || 'Failed to switch chain');
    }
  }

  async function personalSign(message) {
    if (!hasEthereum()) throw new Error('No wallet detected');
    if (!wallet.address) throw new Error('Wallet not connected');
    const sig = await window.ethereum.request({
      method: 'personal_sign',
      params: [String(message), String(wallet.address)],
    });
    return String(sig || '');
  }

  function parseChainId(cid) {
    if (cid == null || cid === '') return 8453;
    const n = typeof cid === 'string' && cid.startsWith('0x') ? parseInt(cid, 16) : Number(cid);
    return Number.isFinite(n) ? n : 8453;
  }

  async function sha256Hex(input) {
    try {
      if (!window.crypto?.subtle) return '';
      const bytes = new TextEncoder().encode(String(input));
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return '';
    }
  }

  async function loadDeals() {
    setLoading(true);
    setError('');
    try {
      const res = await withRetry(() => fetchDeals({ limit: 50 }));
      if (res?.ok && Array.isArray(res.items)) {
        setItems(res.items);
      } else {
        setItems([]);
        setError(res?.error || res?.message || 'Failed to load deals');
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load deals. Check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadDeal(id) {
    if (!id) return;
    setError('');
    setSelected(null);
    try {
      const res = await fetchDealById(id);
      if (res?.ok && res.item) setSelected(res.item);
      else setError(res?.error || res?.message || 'Failed to load deal');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load deal'));
    }
  }

  async function refreshPvaWorkspace(dealId) {
    if (!dealId) {
      setPvaNotificationQueue([]);
      setPvaPayoutPreview([]);
      setPvaRoleAcceptance(null);
      setPvaWorkflow(null);
      return;
    }

    try {
      const [queueRes, payoutRes] = await Promise.all([
        fetchDealPvaNotificationQueue(dealId),
        fetchDealPvaPayoutPreview(dealId),
      ]);

      if (queueRes?.ok && Array.isArray(queueRes.queue)) {
        setPvaNotificationQueue(queueRes.queue);
      }
      if (payoutRes?.ok) {
        setPvaPayoutPreview(Array.isArray(payoutRes.payoutPreview) ? payoutRes.payoutPreview : []);
        setPvaRoleAcceptance(payoutRes.roleAcceptance || null);
        setPvaWorkflow(payoutRes.workflow || null);
      }
    } catch {
      // Best effort; workspace can still function from selected deal payload.
    }
  }

  useEffect(() => {
    loadDeals();
  }, []);

  useEffect(() => {
    if (selectedId) loadDeal(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selected?._id) {
      setPvaNotificationQueue([]);
      setPvaPayoutPreview([]);
      setPvaRoleAcceptance(null);
      setPvaWorkflow(null);
      return;
    }
    refreshPvaWorkspace(selected._id).catch(() => {});
  }, [selected?._id]);

  useEffect(() => {
    if (!selected?._id) {
      setDisputeData(null);
      setOutboundQueue([]);
      return;
    }
    fetchDealDispute(selected._id)
      .then((res) => {
        if (res?.ok) setDisputeData(res.dispute || null);
      })
      .catch(() => {});

    fetchDealOutboundQueue(selected._id, queueStatusFilter && queueStatusFilter !== 'all' ? { status: queueStatusFilter } : {})
      .then((res) => {
        if (res?.ok && Array.isArray(res.queue)) setOutboundQueue(res.queue);
      })
      .catch(() => {});
  }, [selected?._id, selected?.dispute?.status, queueStatusFilter]);

  useEffect(() => {
    if (!selected?._id) return undefined;
    const timer = window.setInterval(() => {
      refreshSelected().catch(() => {});
    }, 20000);
    return () => window.clearInterval(timer);
  }, [selected?._id, queueStatusFilter]);

  useEffect(() => {
    const creatorParty = (selected?.pva?.parties || []).find((p) => p.role === 'creator');
    const shipperParty = (selected?.pva?.parties || []).find((p) => p.role === 'shipper');
    setPvaRoleDraft({
      creatorUserId: String(creatorParty?.userId || ''),
      shipperUserId: String(shipperParty?.userId || ''),
    });
  }, [selected?._id, selected?.pva?.parties]);

  useEffect(() => {
    // Derive milestone hashes for the "contract draft" section (best-effort).
    const ms = Array.isArray(selected?.milestones) ? selected.milestones : [];
    if (!selected?._id || ms.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ms.map(async (m) => {
          const base = `${selected._id}:${m._id || ''}:${m.title || ''}`;
          const h = await sha256Hex(base);
          return [String(m._id || m.title || ''), h];
        })
      );
      if (cancelled) return;
      setMilestoneHashes(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?._id, selected?.milestones]);

  useEffect(() => {
    // Load user defaults from Mongo so deals can auto-fill.
    apiGet('/users/profile')
      .then((res) => {
        if (res?.ok && res.user) {
          setProfile(res.user);
          // If draft is still blank, prefill with preferences (best effort).
          setDraft((prev) => {
            const next = { ...prev };
            const prefs = res.user?.preferences || {};
            if (!next.currency && prefs.defaultCurrency) next.currency = prefs.defaultCurrency;
            if (!next.counterpartyCountry && prefs.defaultCountry) next.counterpartyCountry = prefs.defaultCountry;
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hasEthereum()) return;
    const eth = window.ethereum;
    function onAccountsChanged(acc) {
      const next = Array.isArray(acc) ? String(acc[0] || '') : '';
      setWallet((w) => ({ ...w, address: next }));
    }
    function onChainChanged(next) {
      setWallet((w) => ({ ...w, chainId: String(next || '') }));
    }
    eth.on?.('accountsChanged', onAccountsChanged);
    eth.on?.('chainChanged', onChainChanged);
    return () => {
      eth.removeListener?.('accountsChanged', onAccountsChanged);
      eth.removeListener?.('chainChanged', onChainChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (draftLoaded) return;
    apiGet('/deals/drafts')
      .then((res) => {
        setDraftLoaded(true);
        const saved = res?.draft;
        if (!saved || typeof saved !== 'object') return;

        setDraft((prev) => {
          const pristine =
            !prev.title &&
            !prev.description &&
            !prev.counterpartyName &&
            !prev.counterpartyCountry &&
            !prev.counterpartyWallet &&
            !prev.totalAmount;
          if (!pristine) {
            setDraftRestoreHint('A previous draft exists (not auto-restored because you already started typing).');
            return prev;
          }
          setDraftRestoreHint('Restored your last saved deal draft.');
          return { ...prev, ...saved };
        });
      })
      .catch(() => setDraftLoaded(true));
  }, [draftLoaded]);

  useEffect(() => {
    if (!draftLoaded) return;

    const hasPayment = (draft.payments || []).some((p) => String(p?.amount || '').trim());
    const hasMilestone = (draft.milestones || []).some((m) => String(m?.title || '').trim());
    const hasMeaningful =
      !!draft.title ||
      !!draft.description ||
      !!draft.counterpartyName ||
      !!draft.counterpartyCountry ||
      !!draft.counterpartyWallet ||
      !!draft.totalAmount ||
      hasPayment ||
      hasMilestone;

    if (!hasMeaningful) return;

    const timer = setTimeout(async () => {
      setDraftSaving(true);
      try {
        await apiPut('/deals/drafts', { draft });
      } catch {
        // Best-effort: draft autosave should never block the user.
      } finally {
        setDraftSaving(false);
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [draft, draftLoaded]);

  async function clearDraft() {
    setDraftSaving(true);
    setError('');
    try {
      await apiDelete('/deals/drafts');
      setDraftRestoreHint('Draft cleared.');
      setDraft({
        title: '',
        description: '',
        counterpartyName: '',
        counterpartyCountry: profile?.preferences?.defaultCountry || '',
        counterpartyWallet: '',
        totalAmount: '',
        currency: profile?.preferences?.defaultCurrency || 'USD',
        payments: [
          { label: 'Deposit', amount: '', currency: profile?.preferences?.defaultCurrency || 'USD', status: 'pending' },
          { label: 'Mid', amount: '', currency: profile?.preferences?.defaultCurrency || 'USD', status: 'pending' },
          { label: 'Final', amount: '', currency: profile?.preferences?.defaultCurrency || 'USD', status: 'pending' },
        ],
        milestones: [
          { title: 'Tracking number provided', evidenceType: 'tracking_number', status: 'pending' },
          { title: 'Delivery confirmed', evidenceType: 'message', status: 'pending' },
        ],
      });
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to clear draft');
    } finally {
      setDraftSaving(false);
    }
  }

  const preferencesDraft = useMemo(() => {
    const prefs = profile?.preferences || {};
    return {
      defaultCountry: prefs.defaultCountry || '',
      defaultCurrency: prefs.defaultCurrency || 'USD',
      defaultWalletAddress: prefs.defaultWalletAddress || '',
    };
  }, [profile]);

  async function savePreferences(nextPrefs) {
    setPrefsSaving(true);
    setPrefsSavedOk(false);
    setError('');
    try {
      const res = await apiPut('/users/profile', { preferences: nextPrefs });
      if (!res?.ok || !res.user) throw new Error(res?.message || 'Failed to save defaults');
      setProfile(res.user);
      setPrefsSavedOk(true);
      setTimeout(() => setPrefsSavedOk(false), 2000);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to save defaults');
    } finally {
      setPrefsSaving(false);
    }
  }

  async function handleGeneratePvaPlan() {
    setPvaPlanLoading(true);
    setError('');
    try {
      const payload = {
        title: pvaPlanner.requestTitle?.trim() || 'PVA creator + shipper deal',
        currency: draft.currency || 'USD',
        buyer: {
          userId: pvaPlanner.buyerUserId,
          name: pvaPlanner.buyerName,
          country: pvaPlanner.buyerCountry,
          city: pvaPlanner.buyerCity,
          walletAddress: pvaPlanner.buyerWalletAddress,
        },
        creator: {
          userId: pvaPlanner.creatorUserId,
          name: pvaPlanner.creatorName,
          country: pvaPlanner.creatorCountry,
          city: pvaPlanner.creatorCity,
          walletAddress: pvaPlanner.creatorWalletAddress,
        },
        shipper: {
          userId: pvaPlanner.shipperUserId,
          name: pvaPlanner.shipperName,
          country: pvaPlanner.shipperCountry,
          city: pvaPlanner.shipperCity,
          walletAddress: pvaPlanner.shipperWalletAddress,
        },
        collateral: {
          creatorStakePct: Number(pvaPlanner.creatorStakePct || 50),
          shipperStakePct: Number(pvaPlanner.shipperStakePct || 50),
          stakeMode: 'escrow',
        },
        estimate: {
          productionCost: Number(pvaPlanner.productionCost || 0),
          shippingCost: Number(pvaPlanner.shippingCost || 0),
          platformFee: Number(pvaPlanner.platformFee || 0),
          routeKm: Number(pvaPlanner.routeKm || 0),
          estimatedProductionDays: Number(pvaPlanner.estimatedProductionDays || 0),
          estimatedTransitDays: Number(pvaPlanner.estimatedTransitDays || 0),
          reliability: Number(pvaPlanner.reliability || 0),
          consolidation: Number(pvaPlanner.consolidation || 0),
          reputation: Number(pvaPlanner.reputation || 0),
        },
      };

      const res = await generatePvaDealPlan(payload);
      if (!res?.ok || !res?.plan) throw new Error(res?.error || res?.message || 'Failed to generate PVA plan');
      setPvaPlan(res.plan);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to generate PVA plan');
    } finally {
      setPvaPlanLoading(false);
    }
  }

  async function handleLoadPvaCandidates() {
    setPvaCandidatesLoading(true);
    setError('');
    try {
      const params = {
        country: pvaPlanner.buyerCountry || profile?.preferences?.defaultCountry || '',
        city: pvaPlanner.buyerCity || '',
        limit: 10,
      };
      const res = await fetchPvaDealCandidates(params);
      if (!res?.ok) throw new Error(res?.error || res?.message || 'Failed to load candidates');

      const firstCreator = Array.isArray(res.creators) && res.creators.length ? res.creators[0] : null;
      const firstShipper = Array.isArray(res.shippers) && res.shippers.length ? res.shippers[0] : null;

      setPvaPlanner((prev) => ({
        ...prev,
        creatorName: firstCreator?.name || prev.creatorName,
        creatorUserId: firstCreator?.userId || prev.creatorUserId,
        creatorCountry: firstCreator?.country || prev.creatorCountry,
        creatorCity: firstCreator?.city || prev.creatorCity,
        creatorWalletAddress: firstCreator?.walletAddress || prev.creatorWalletAddress,
        shipperName: firstShipper?.name || prev.shipperName,
        shipperUserId: firstShipper?.userId || prev.shipperUserId,
        shipperCountry: firstShipper?.country || prev.shipperCountry,
        shipperCity: firstShipper?.city || prev.shipperCity,
        shipperWalletAddress: firstShipper?.walletAddress || prev.shipperWalletAddress,
        reliability: String(firstShipper?.reliability ?? prev.reliability),
        consolidation: String(firstShipper?.consolidation ?? prev.consolidation),
        reputation: String(firstCreator?.reputation ?? prev.reputation),
      }));
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to load candidates');
    } finally {
      setPvaCandidatesLoading(false);
    }
  }

  function handleApplyPvaPlanToDraft() {
    if (!pvaPlan) return;
    setDraft((prev) => ({
      ...prev,
      title: pvaPlan.title || prev.title,
      description: pvaPlan.description || prev.description,
      counterpartyName: pvaPlan?.pva?.parties?.find((p) => p.role === 'creator')?.name || prev.counterpartyName,
      counterpartyCountry: pvaPlan?.pva?.parties?.find((p) => p.role === 'creator')?.country || prev.counterpartyCountry,
      counterpartyWallet: pvaPlan?.pva?.parties?.find((p) => p.role === 'creator')?.walletAddress || prev.counterpartyWallet,
      totalAmount: String(pvaPlan.totalAmount || prev.totalAmount || ''),
      currency: pvaPlan.currency || prev.currency || 'USD',
      payments: Array.isArray(pvaPlan.payments) ? pvaPlan.payments : prev.payments,
      milestones: Array.isArray(pvaPlan.milestones) ? pvaPlan.milestones : prev.milestones,
      pva: pvaPlan.pva || null,
    }));
  }

  async function handleCreatePvaDealNow() {
    setPvaPlanLoading(true);
    setError('');
    try {
      const payload = {
        title: pvaPlanner.requestTitle?.trim() || 'PVA creator + shipper deal',
        currency: draft.currency || 'USD',
        buyer: {
          userId: pvaPlanner.buyerUserId,
          name: pvaPlanner.buyerName,
          country: pvaPlanner.buyerCountry,
          city: pvaPlanner.buyerCity,
          walletAddress: pvaPlanner.buyerWalletAddress,
        },
        creator: {
          userId: pvaPlanner.creatorUserId,
          name: pvaPlanner.creatorName,
          country: pvaPlanner.creatorCountry,
          city: pvaPlanner.creatorCity,
          walletAddress: pvaPlanner.creatorWalletAddress,
        },
        shipper: {
          userId: pvaPlanner.shipperUserId,
          name: pvaPlanner.shipperName,
          country: pvaPlanner.shipperCountry,
          city: pvaPlanner.shipperCity,
          walletAddress: pvaPlanner.shipperWalletAddress,
        },
        collateral: {
          creatorStakePct: Number(pvaPlanner.creatorStakePct || 50),
          shipperStakePct: Number(pvaPlanner.shipperStakePct || 50),
          stakeMode: 'escrow',
        },
        estimate: {
          productionCost: Number(pvaPlanner.productionCost || 0),
          shippingCost: Number(pvaPlanner.shippingCost || 0),
          platformFee: Number(pvaPlanner.platformFee || 0),
          routeKm: Number(pvaPlanner.routeKm || 0),
          estimatedProductionDays: Number(pvaPlanner.estimatedProductionDays || 0),
          estimatedTransitDays: Number(pvaPlanner.estimatedTransitDays || 0),
          reliability: Number(pvaPlanner.reliability || 0),
          consolidation: Number(pvaPlanner.consolidation || 0),
          reputation: Number(pvaPlanner.reputation || 0),
        },
        createDeal: true,
      };

      const res = await generatePvaDealPlan(payload);
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to create PVA deal');
      await loadDeals();
      setSelectedId(res.item._id);
      setPvaPlan(res.plan || null);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to create PVA deal');
    } finally {
      setPvaPlanLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const payments = Array.isArray(draft.payments) ? draft.payments : [];
      const milestones = Array.isArray(draft.milestones) ? draft.milestones : [];

      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        counterparty: {
          name: draft.counterpartyName.trim(),
          country: draft.counterpartyCountry.trim(),
          walletAddress: draft.counterpartyWallet.trim(),
        },
        totalAmount: Number(draft.totalAmount || 0),
        currency: draft.currency || 'USD',
        pva: draft.pva || undefined,
        payments: payments
          .filter((p) => p && typeof p === 'object')
          .map((p) => ({
            label: (p.label || '').trim(),
            amount: Number(p.amount || 0),
            currency: (p.currency || draft.currency || 'USD').trim(),
            status: p.status || 'pending',
          }))
          .filter((p) => Number.isFinite(p.amount) && p.amount > 0),
        milestones: milestones
          .filter((m) => m && typeof m === 'object')
          .map((m) => ({
            title: (m.title || '').trim(),
            evidenceType: m.evidenceType || 'none',
            assignedRole: m.assignedRole || 'any',
            status: m.status || 'pending',
          }))
          .filter((m) => m.title),
      };
      const res = await apiPost('/deals', payload);
      if (!res?.ok || !res.item) throw new Error(res?.error || res?.message || 'Create failed');
      if (res?.shareUrl) {
        setShareLink(res.shareUrl);
      } else if (res?.publicId) {
        setShareLink(`${globalThis.location?.origin || ''}/#/deal/${encodeURIComponent(res.publicId)}`);
      }
      // Clear Mongo-backed draft after a successful create.
      apiDelete('/deals/drafts').catch(() => {});
      await loadDeals();
      setSelectedId(res.item._id);
      setDraft((prev) => ({ ...prev, title: '', description: '' }));
    } catch (e2) {
      const serverMsg = e2?.response?.data?.error || e2?.response?.data?.message;
      setError(serverMsg || e2.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function handleAddMessage() {
    if (!selected?._id) return;
    const text = newMessage.trim();
    if (!text) return;
    setError('');
    try {
      let signature = '';
      let authorWallet = '';
      let typedData = null;
      if (wallet.address && requireSignature) {
        const ts = new Date().toISOString();
        typedData = buildDealMessageTypedData(parseChainId(wallet.chainId), selected._id, text, ts);
        signature = await signTypedData(typedData, wallet.address);
        authorWallet = wallet.address;
      }
      const res = await apiPost(`/deals/${selected._id}/messages`, { text, authorWallet, signature, typedData });
      if (!res?.ok || !res.item) throw new Error(res?.error || res?.message || 'Failed to add message');
      setSelected(res.item);
      setNewMessage('');
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to add message');
    }
  }

  async function handleGenerateInvite() {
    if (!selected?._id) return;
    setInviteLoading(true);
    setError('');
    try {
      const res = await createDealInvite(selected._id);
      if (!res?.ok || !res?.joinUrl) throw new Error(res?.error || res?.message || 'Failed to generate invite');
      setInviteLink(res.joinUrl);
      setInviteExpiresAt(res.expiresAt || '');
      try {
        await navigator.clipboard.writeText(res.joinUrl);
      } catch {
        // ignore clipboard errors
      }
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to generate invite');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleSubmitEvidence(milestoneId) {
    if (!selected?._id || !milestoneId) return;
    const evidenceValue = String(evidenceDrafts[milestoneId] || '').trim();
    if (!evidenceValue) return;
    setError('');
    try {
      let signature = '';
      let authorWallet = '';
      let typedData = null;
      if (wallet.address && requireSignature) {
        const ts = new Date().toISOString();
        typedData = buildDealEvidenceTypedData(parseChainId(wallet.chainId), selected._id, milestoneId, evidenceValue, ts);
        signature = await signTypedData(typedData, wallet.address);
        authorWallet = wallet.address;
      }
      const res = await apiPost(`/deals/${selected._id}/milestones/${milestoneId}/evidence`, {
        evidenceValue,
        authorWallet,
        signature,
        typedData,
      });
      if (!res?.ok || !res.item) throw new Error(res?.error || res?.message || 'Failed to submit evidence');
      setSelected(res.item);
      setEvidenceDrafts((prev) => ({ ...prev, [milestoneId]: '' }));
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to submit evidence');
    }
  }

  async function handleMarkMilestoneCompleted(idx) {
    if (!selected?._id) return;
    const next = { ...(selected || {}) };
    const milestones = Array.isArray(next.milestones) ? [...next.milestones] : [];
    const m = milestones[idx];
    if (!m) return;
    milestones[idx] = { ...m, status: 'completed', completedAt: new Date().toISOString() };
    try {
      const res = await apiPut(`/deals/${selected._id}`, { milestones });
      if (res?.ok && res.item) setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to update milestone');
    }
  }

  async function handlePrepareEscrow() {
    if (!selected?._id) return;
    setEscrowLoading(true);
    setError('');
    try {
      const res = await prepareDealEscrow(selected._id, { ownerWallet: wallet.address || '' });
      if (!res?.ok || !res.prepareEscrow) throw new Error(res?.error || res?.message || 'Failed to prepare escrow');
      setEscrowPrepare(res.prepareEscrow);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to prepare escrow');
    } finally {
      setEscrowLoading(false);
    }
  }

  async function handleLinkContract(contractAddress) {
    if (!selected?._id || !contractAddress) return;
    setActionBusy(true);
    setError('');
    try {
      const res = await apiPut(`/deals/${selected._id}`, { contractAddress });
      if (!res?.ok || !res.item) throw new Error(res?.error || res?.message || 'Failed to link contract');
      setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to link contract');
    } finally {
      setActionBusy(false);
    }
  }

  async function refreshSelected() {
    if (!selected?._id) return;
    const dealId = selected._id;
    const res = await fetchDealById(dealId);
    if (res?.ok && res?.item) setSelected(res.item);
    const q = await fetchDealOutboundQueue(dealId, queueStatusFilter && queueStatusFilter !== 'all' ? { status: queueStatusFilter } : {});
    if (q?.ok && Array.isArray(q.queue)) setOutboundQueue(q.queue);
    await refreshPvaWorkspace(dealId);
  }

  async function handlePvaRoleAction(role, action) {
    if (!selected?._id) return;
    setActionBusy(true);
    setError('');
    try {
      const res = await acceptDealPvaRole(selected._id, { role, action });
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to update role status');
      setSelected(res.item);
      await refreshPvaWorkspace(selected._id);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to update role status');
    } finally {
      setActionBusy(false);
    }
  }

  async function handlePvaQueueStatusUpdate(notificationId) {
    if (!selected?._id || !notificationId) return;
    if (!['seller', 'mediator', 'admin'].includes(viewerRole)) {
      setError('Only seller, mediator, or admin can update PVA queue status');
      return;
    }

    const status = String(pvaNotificationStatusDrafts[notificationId] || '').toLowerCase();
    if (!['queued', 'sent', 'failed'].includes(status)) {
      setError('Select a valid PVA queue status');
      return;
    }

    setActionBusy(true);
    setError('');
    try {
      const res = await updateDealPvaNotificationQueueStatus(selected._id, notificationId, { status });
      if (!res?.ok) throw new Error(res?.error || res?.message || 'Failed to update PVA queue status');
      if (Array.isArray(res.queue)) setPvaNotificationQueue(res.queue);
      if (res.item) setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to update PVA queue status');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleBulkPvaQueueStatusUpdate(nextStatus) {
    if (!selected?._id) return;
    if (!['seller', 'mediator', 'admin'].includes(viewerRole)) {
      setError('Only seller, mediator, or admin can update PVA queue status');
      return;
    }
    if (!['queued', 'sent', 'failed'].includes(String(nextStatus || '').toLowerCase())) {
      setError('Select a valid bulk queue status');
      return;
    }

    const targetRows = displayedPvaNotificationQueue.filter((note) => String(note?._id || ''));
    if (!targetRows.length) return;

    setActionBusy(true);
    setError('');
    try {
      await Promise.all(
        targetRows.map((note) =>
          updateDealPvaNotificationQueueStatus(selected._id, note._id, { status: nextStatus })
        )
      );
      await refreshPvaWorkspace(selected._id);
      await loadDeal(selected._id);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to apply bulk PVA queue update');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRetryFailedOnly() {
    if (!selected?._id) return;
    if (!['seller', 'mediator', 'admin'].includes(viewerRole)) {
      setError('Only seller, mediator, or admin can retry failed queue items');
      return;
    }

    const failedRows = displayedPvaNotificationQueue.filter((note) => String(note?.status || '') === 'failed' && String(note?._id || ''));
    if (!failedRows.length) return;

    setActionBusy(true);
    setError('');
    try {
      await Promise.all(
        failedRows.map((note) =>
          updateDealPvaNotificationQueueStatus(selected._id, note._id, { status: 'queued' })
        )
      );
      await refreshPvaWorkspace(selected._id);
      await loadDeal(selected._id);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to retry failed queue items');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleClearSentFromView() {
    const sentRows = displayedPvaNotificationQueue.filter((note) => String(note?.status || '') === 'sent' && String(note?._id || ''));
    if (!sentRows.length) return;
    setActionBusy(true);
    setError('');
    try {
      await Promise.all(
        sentRows.map((note) =>
          updateDealPvaNotificationQueueStatus(selected._id, note._id, { status: 'sent', hiddenFromView: true })
        )
      );
      await refreshPvaWorkspace(selected._id);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to clear sent queue rows');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUndoClearSentFromView() {
    if (!selected?._id) return;
    const hiddenRows = Array.isArray(pvaNotificationQueue)
      ? pvaNotificationQueue.filter((note) => String(note?.status || '') === 'sent' && note?.hiddenFromView)
      : [];
    if (!hiddenRows.length) return;
    setActionBusy(true);
    setError('');
    try {
      await Promise.all(
        hiddenRows.map((note) =>
          updateDealPvaNotificationQueueStatus(selected._id, note._id, { status: 'sent', hiddenFromView: false })
        )
      );
      await refreshPvaWorkspace(selected._id);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to undo clear');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleMockFundEscrow() {
    if (!selected?._id) return;
    if (!canMockFund) {
      setError('Mock funding is not allowed for your role or current escrow state');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const res = await mockFundDealEscrow(selected._id, {
        amount: Number(selected.totalAmount || 0),
        currency: selected.currency || 'USD',
        proofNote: mockProofNote,
        screenshotUrl: mockProofUrl,
      });
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to mock-fund escrow');
      setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to mock-fund escrow');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConfirmReceipt() {
    if (!selected?._id) return;
    if (!canConfirmReceipt) {
      setError('Receipt confirmation is not allowed for your role or current escrow state');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const res = await confirmDealReceipt(selected._id);
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to confirm receipt');
      setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to confirm receipt');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReleaseEscrow() {
    if (!selected?._id) return;
    if (!canRelease) {
      setError('Release is not allowed for your role or current escrow/dispute state');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const res = await releaseDealEscrow(selected._id);
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to release escrow');
      setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to release escrow');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRefundEscrow() {
    if (!selected?._id) return;
    if (!canRefund) {
      setError('Refund is not allowed for your role or current escrow state');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const res = await refundDealEscrow(selected._id);
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to refund escrow');
      setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to refund escrow');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleOpenDispute() {
    if (!selected?._id) return;
    if (!canOpenDispute) {
      setError('Dispute opening is not allowed for your role or current escrow/dispute state');
      return;
    }
    if (!disputeReason.trim()) {
      setError('Dispute reason is required');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const res = await openDealDispute(selected._id, {
        reason: disputeReason,
        details: disputeDetails,
      });
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to open dispute');
      setSelected(res.item);
      setDisputeData(res.item?.dispute || null);
      setDisputeReason('');
      setDisputeDetails('');
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to open dispute');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleResolveDispute(decision) {
    if (!selected?._id) return;
    if (!canResolveDisputeUi) {
      setError('Dispute resolution is not allowed for your role or current dispute state');
      return;
    }
    const validCodes = RESOLUTION_REASON_CODES[decision] || [];
    if (!resolutionCode || !validCodes.includes(resolutionCode)) {
      setError(`Pick a valid ${decision} reason code before resolving`);
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const forfeitedParties = [];
      if (decision === 'refund') {
        if (forfeitCreator) forfeitedParties.push('creator');
        if (forfeitShipper) forfeitedParties.push('shipper');
      }
      const res = await resolveDealDispute(selected._id, {
        decision,
        resolutionCode,
        note: 'Resolved from deals workspace',
        forfeitedParties,
        collateralNote: collateralResolutionNote,
      });
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to resolve dispute');
      setSelected(res.item);
      setDisputeData(res.item?.dispute || null);
      setResolutionCode('');
      setCollateralResolutionNote('');
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to resolve dispute');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleLoadWorkspaceCandidates() {
    if (!selected?._id) return;
    setWorkspaceCandidatesLoading(true);
    setError('');
    try {
      const buyerCountry = selected?.pva?.parties?.find((p) => p.role === 'buyer')?.country || selected?.counterparty?.country || '';
      const res = await fetchPvaDealCandidates({ country: buyerCountry, limit: 25 });
      if (!res?.ok) throw new Error(res?.error || res?.message || 'Failed to load network candidates');
      setWorkspaceCandidates({
        creators: Array.isArray(res.creators) ? res.creators : [],
        shippers: Array.isArray(res.shippers) ? res.shippers : [],
      });
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to load network candidates');
    } finally {
      setWorkspaceCandidatesLoading(false);
    }
  }

  async function handleApplyPvaAssignments() {
    if (!selected?._id) return;
    if (!canAssignPvaRoles) {
      setError('Only seller, mediator, or admin can assign creator/shipper roles');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const milestoneRoles = {};
      for (const milestone of selected?.milestones || []) {
        if (!milestone?._id) continue;
        if (milestone.key === 'creator_proof') milestoneRoles[String(milestone._id)] = 'creator';
        if (milestone.key === 'shipper_pickup') milestoneRoles[String(milestone._id)] = 'shipper';
        if (milestone.key === 'buyer_confirm') milestoneRoles[String(milestone._id)] = 'buyer';
      }

      const res = await assignDealPvaRoles(selected._id, {
        creatorUserId: pvaRoleDraft.creatorUserId,
        shipperUserId: pvaRoleDraft.shipperUserId,
        milestoneRoles,
      });
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to assign PVA roles');
      setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to assign PVA roles');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAddDisputeEvidence() {
    if (!selected?._id) return;
    if (!canAddDisputeEvidenceUi) {
      setError('Adding dispute evidence is not allowed right now');
      return;
    }
    if (!disputeEvidenceNote.trim() && !disputeEvidenceUrl.trim()) {
      setError('Add a dispute note or evidence URL first');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const res = await addDealDisputeEvidence(selected._id, {
        note: disputeEvidenceNote,
        attachmentUrl: disputeEvidenceUrl,
      });
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to add dispute evidence');
      setSelected(res.item);
      setDisputeData(res.dispute || res.item?.dispute || null);
      setDisputeEvidenceNote('');
      setDisputeEvidenceUrl('');
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to add dispute evidence');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAssignPlatformMediator() {
    if (!selected?._id) return;
    if (!canAssignPlatformMediator) {
      setError('Only seller/admin can assign platform mediator');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const res = await autoAssignDealMediator(selected._id, { note: 'Platform mediator assignment requested from workspace' });
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to assign mediator');
      setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to assign mediator');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRequestCustomMediator() {
    if (!selected?._id) return;
    if (!canRequestCustomMediator) {
      setError('You are not allowed to request a custom mediator on this deal');
      return;
    }
    if (!mediatorRequest.name.trim() && !mediatorRequest.email.trim() && !mediatorRequest.contact.trim()) {
      setError('Provide mediator name, email, or contact');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const res = await requestDealCustomMediator(selected._id, {
        name: mediatorRequest.name,
        email: mediatorRequest.email,
        contact: mediatorRequest.contact,
        notes: mediatorRequest.notes,
      });
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to request custom mediator');
      setSelected(res.item);
      setMediatorRequest({ name: '', email: '', contact: '', notes: '' });
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to request custom mediator');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleApproveMediator(action) {
    if (!selected?._id) return;
    if (!canApproveMediator) {
      setError('Only admin can approve or decline mediator requests');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const res = await approveDealMediator(selected._id, {
        action,
        mediatorUserId: mediatorApproval.mediatorUserId,
        note: mediatorApproval.note,
      });
      if (!res?.ok || !res?.item) throw new Error(res?.error || res?.message || 'Failed to process mediator approval');
      setSelected(res.item);
      setMediatorApproval({ mediatorUserId: '', note: '' });
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to process mediator approval');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleGenerateFraudPacket(sendRequested) {
    if (!selected?._id) return;
    setActionBusy(true);
    setError('');
    try {
      const res = await generateDealFraudPacket(selected._id, {
        outbound: {
          sendRequested,
          approvedByAdmin: viewerRole === 'admin',
          targets: ['FTC', 'FIA Pakistan', 'FBI IC3', 'PGMA Compliance Desk'],
        },
      });
      if (!res?.ok || !res?.packet) throw new Error(res?.error || res?.message || 'Failed to generate packet');
      setReportPacket(res.packet);
      await refreshSelected();
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to generate packet');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleGenerateResolutionCertificate() {
    if (!selected?._id) return;
    if (!['resolved_release', 'resolved_refund'].includes(disputeStatus)) {
      setError('Resolution certificate is only available after the dispute is resolved');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const res = await fetchDealResolutionCertificate(selected._id);
      if (!res?.ok || !res?.certificate) throw new Error(res?.error || res?.message || 'Failed to generate resolution certificate');
      setResolutionCertificate(res.certificate);
      await refreshSelected();
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to generate resolution certificate');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCopyResolutionCertificate() {
    if (!resolutionCertificate) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(resolutionCertificate, null, 2));
    } catch (e) {
      setError(e?.message || 'Failed to copy certificate');
    }
  }

  async function handleDownloadResolutionCertificate() {
    if (!resolutionCertificate) return;
    const blob = new Blob([JSON.stringify(resolutionCertificate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deal-resolution-certificate-${resolutionCertificate.certificateId || selected?._id || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleGenerateExportBundle() {
    if (!selected?._id) return;
    setActionBusy(true);
    setError('');
    try {
      const res = await fetchDealExportBundle(selected._id, queueStatusFilter && queueStatusFilter !== 'all' ? { queueStatus: queueStatusFilter } : {});
      if (!res?.ok || !res?.bundle) throw new Error(res?.error || res?.message || 'Failed to generate export bundle');
      setExportBundle(res.bundle);
      await refreshSelected();
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to generate export bundle');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleQueueStatusUpdate(packetId) {
    if (!selected?._id || !packetId) return;
    if (viewerRole !== 'admin') {
      setError('Only admin can update outbound queue status');
      return;
    }
    const draft = queueStatusDrafts[packetId] || { status: 'queued', lastError: '' };
    if (!draft?.status) {
      setError('Select a queue status first');
      return;
    }

    setActionBusy(true);
    setError('');
    try {
      const res = await updateDealOutboundQueueStatus(selected._id, packetId, {
        status: draft.status,
        lastError: draft.lastError,
      });
      if (!res?.ok) throw new Error(res?.error || res?.message || 'Failed to update outbound status');
      const q = await fetchDealOutboundQueue(selected._id, queueStatusFilter && queueStatusFilter !== 'all' ? { status: queueStatusFilter } : {});
      if (q?.ok && Array.isArray(q.queue)) setOutboundQueue(q.queue);
      if (res?.item) setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to update outbound status');
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className={`deals-shell admin-page authenticated ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <header className="admin-header deals-header">
        <div className="deals-header__row">
          <div>
            <h1>🤝 Deals (Smart Contract Foundation)</h1>
            <p className="muted">
              Draft real-world deals (parties, wallets, milestones, payment schedule) with an audit trail. On-chain contract deployment comes next.
            </p>
          </div>
            {shareLink ? (
              <div className="rounded-lg border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-zinc-100">Shareable public deal link</h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-zinc-100"
                    value={shareLink}
                    readOnly
                  />
                  <button
                    className="rounded-lg border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs text-amber-200"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareLink);
                      } catch (_err) {
                        // Clipboard access is best effort only.
                      }
                    }}
                  >
                    Copy link
                  </button>
                </div>
                <p className="text-xs text-zinc-500">Open this link publicly to review the proposal and verify with an authenticated session.</p>
              </div>
            ) : null}
          <div className="deals-actions">
            <Link to="/admin" className="btn ghost">← Admin</Link>
            <button className="btn ghost" onClick={loadDeals} disabled={loading}>Refresh</button>
            <button
              className="btn ghost"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <AdminNav />

      <main className="deals-main">
        {error ? <ErrorBanner message={error} onRetry={loadDeals} onDismiss={() => setError('')} /> : null}

        <section className="card">
          <h2>
            Wallet (real crypto)
            <HelpTip
              title="Why connect a wallet?"
              body="Connecting a wallet lets you sign deal messages and milestone evidence. This creates a verifiable trail (signatures) even before we deploy escrow contracts."
              example="Sign: “Tracking number provided: 12345”"
            />
          </h2>
          <div className="row rowWrap">
            <button className="btn primary" type="button" onClick={connectWallet} disabled={wallet.connecting}>
              {wallet.address ? 'Wallet connected' : wallet.connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
            {wallet.address ? <span className="muted small">Address: {wallet.address}</span> : null}
            {wallet.chainId ? <span className="muted small">Chain: {wallet.chainId}</span> : null}
          </div>
          <div className="row rowWrap" style={{ marginTop: '8px' }}>
            <span className="muted small">Switch chain:</span>
            {CHAINS.map((c) => (
              <button key={c.id} className="btn ghost" type="button" onClick={() => switchChain(c.hex)}>
                {c.name}
              </button>
            ))}
            <label className="check" style={{ marginLeft: 'auto' }}>
              <input
                type="checkbox"
                checked={requireSignature}
                onChange={(e) => setRequireSignature(e.target.checked)}
              />
              <span className="muted small">
                Require signature
                <HelpTip
                  title="Require signature"
                  body="If enabled, you’ll be prompted to sign messages/evidence from your wallet before they’re saved."
                  example="Turn off if you just want quick notes while testing"
                />
              </span>
            </label>
          </div>
        </section>

        <section className="card">
          <h2>
            PVA creator + shipper planner
            <HelpTip
              title="What this does"
              body="Builds a 3-party deal plan (buyer, creator, shipper), calculates cuts and collateral, and prepares milestone tasks for proof-driven fulfillment."
              example="Buyer request -> creator accepts -> shipper accepts -> auto split and escrow-ready checklist"
            />
          </h2>
          <div className="grid2">
            <label>
              <span className="labelRow">Request title</span>
              <input value={pvaPlanner.requestTitle} onChange={(e) => setPvaPlanner((s) => ({ ...s, requestTitle: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Buyer name</span>
              <input value={pvaPlanner.buyerName} onChange={(e) => setPvaPlanner((s) => ({ ...s, buyerName: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Buyer country</span>
              <input value={pvaPlanner.buyerCountry} onChange={(e) => setPvaPlanner((s) => ({ ...s, buyerCountry: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Buyer city</span>
              <input value={pvaPlanner.buyerCity} onChange={(e) => setPvaPlanner((s) => ({ ...s, buyerCity: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Creator name</span>
              <input value={pvaPlanner.creatorName} onChange={(e) => setPvaPlanner((s) => ({ ...s, creatorName: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Creator country</span>
              <input value={pvaPlanner.creatorCountry} onChange={(e) => setPvaPlanner((s) => ({ ...s, creatorCountry: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Shipper name</span>
              <input value={pvaPlanner.shipperName} onChange={(e) => setPvaPlanner((s) => ({ ...s, shipperName: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Shipper country</span>
              <input value={pvaPlanner.shipperCountry} onChange={(e) => setPvaPlanner((s) => ({ ...s, shipperCountry: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Production cost ({draft.currency || 'USD'})</span>
              <input type="number" min="0" value={pvaPlanner.productionCost} onChange={(e) => setPvaPlanner((s) => ({ ...s, productionCost: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Shipping cost ({draft.currency || 'USD'})</span>
              <input type="number" min="0" value={pvaPlanner.shippingCost} onChange={(e) => setPvaPlanner((s) => ({ ...s, shippingCost: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Platform fee ({draft.currency || 'USD'})</span>
              <input type="number" min="0" value={pvaPlanner.platformFee} onChange={(e) => setPvaPlanner((s) => ({ ...s, platformFee: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Route distance km</span>
              <input type="number" min="0" value={pvaPlanner.routeKm} onChange={(e) => setPvaPlanner((s) => ({ ...s, routeKm: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Reliability score (0-100)</span>
              <input type="number" min="0" max="100" value={pvaPlanner.reliability} onChange={(e) => setPvaPlanner((s) => ({ ...s, reliability: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Consolidation score (0-100)</span>
              <input type="number" min="0" max="100" value={pvaPlanner.consolidation} onChange={(e) => setPvaPlanner((s) => ({ ...s, consolidation: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Creator stake %</span>
              <input type="number" min="0" max="100" value={pvaPlanner.creatorStakePct} onChange={(e) => setPvaPlanner((s) => ({ ...s, creatorStakePct: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">Shipper stake %</span>
              <input type="number" min="0" max="100" value={pvaPlanner.shipperStakePct} onChange={(e) => setPvaPlanner((s) => ({ ...s, shipperStakePct: e.target.value }))} />
            </label>
          </div>

          <div className="row rowWrap" style={{ marginTop: '12px' }}>
            <button type="button" className="btn ghost" onClick={handleLoadPvaCandidates} disabled={pvaCandidatesLoading || pvaPlanLoading}>
              {pvaCandidatesLoading ? 'Finding candidates…' : 'Auto-fill from network'}
            </button>
            <button type="button" className="btn primary" onClick={handleGeneratePvaPlan} disabled={pvaPlanLoading}>
              {pvaPlanLoading ? 'Planning…' : 'Generate PVA plan'}
            </button>
            <button type="button" className="btn ghost" onClick={handleApplyPvaPlanToDraft} disabled={!pvaPlan || pvaPlanLoading}>
              Apply plan to create form
            </button>
            <button type="button" className="btn ghost" onClick={handleCreatePvaDealNow} disabled={pvaPlanLoading}>
              Create deal from planner
            </button>
          </div>

          {pvaPlan ? (
            <div className="muted" style={{ marginTop: '12px' }}>
              <div>
                Planned total: <strong>{pvaPlan.currency} {pvaPlan.totalAmount}</strong> | ETA: <strong>{pvaPlan.estimatedDays} days</strong> | Route score: <strong>{pvaPlan?.pva?.routeScore?.finalScore}</strong>
              </div>
              <div>
                Split: creator {pvaPlan?.split?.creatorPct}% | shipper {pvaPlan?.split?.shipperPct}% | platform {pvaPlan?.split?.platformPct}% | buffer {pvaPlan?.split?.bufferPct}%
              </div>
              {Array.isArray(pvaPlan.alternatives) && pvaPlan.alternatives.length ? (
                <div style={{ marginTop: '8px' }}>
                  Top routes: {pvaPlan.alternatives.map((alt, idx) => (
                    <span key={`${alt?.creator?.name || 'creator'}-${alt?.shipper?.name || 'shipper'}-${idx}`}>
                      {idx ? ' | ' : ''}
                      {alt?.creator?.name} + {alt?.shipper?.name} ({alt?.score}, {pvaPlan.currency} {alt?.totalAmount})
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="card">
          <h2>
            Create new deal
            <HelpTip
              title="What is a Deal?"
              body="A Deal is your off-chain workspace stored in MongoDB: parties, wallets, payment schedule, milestones, and notes. Later we can deploy an escrow smart contract and link it here."
              example="Import 1kg coffee beans from Kenya"
            />
          </h2>

          {profile?.preferences ? (
            <div className="defaults">
              <div className="defaults__title">
                Saved defaults
                <HelpTip
                  title="Saved defaults"
                  body="These defaults are stored in MongoDB for your account and will help auto-fill new deals."
                  example="Default currency: USD"
                />
              </div>
              <div className="grid2">
                <label>
                  <span className="labelRow">
                    Default country
                    <HelpTip title="Default country" body="Used to auto-fill the country field for new deals." example="Kenya" />
                  </span>
                  <input
                    value={preferencesDraft.defaultCountry}
                    onChange={(e) => setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultCountry: e.target.value } }))}
                  />
                </label>
                <label>
                  <span className="labelRow">
                    Default currency
                    <HelpTip title="Default currency" body="Used to auto-fill currency in new deals and payment schedule." example="USD" />
                  </span>
                  <input
                    value={preferencesDraft.defaultCurrency}
                    onChange={(e) => setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultCurrency: e.target.value } }))}
                  />
                </label>
              </div>
              <label>
                <span className="labelRow">
                  Default wallet (optional)
                  <HelpTip title="Default wallet" body="Optional. Your preferred wallet address for reference and future on-chain escrow." example="0xabc123..." />
                </span>
                <input
                  value={preferencesDraft.defaultWalletAddress}
                  onChange={(e) => setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultWalletAddress: e.target.value } }))}
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={prefsSaving}
                  onClick={() => savePreferences(preferencesDraft)}
                >
                  {prefsSaving ? 'Saving…' : 'Save defaults'}
                </button>
                {prefsSavedOk ? <span className="muted small">Saved</span> : null}
              </div>
            </div>
          ) : null}

          {draftRestoreHint ? <div className="muted small">{draftRestoreHint}</div> : null}
          {draftLoaded ? (
            <div className="row">
              <button type="button" className="btn ghost" disabled={draftSaving} onClick={clearDraft}>
                Clear draft
              </button>
              {draftSaving ? <span className="muted small">Saving draft…</span> : null}
            </div>
          ) : null}

          <form className="form" onSubmit={handleCreate}>
            <label>
              <span className="labelRow">
                Title *
                <HelpTip title="Deal title" body="Short name for this deal. Use something you’ll recognize later." example="Kenya coffee import (1kg)" />
              </span>
              <input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">
                Description
                <HelpTip title="Deal description" body="Optional context: product, quality specs, delivery method, and any important terms." example="AA grade, shipped via DHL" />
              </span>
              <textarea rows={3} value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
            </label>

            <div className="grid2">
              <label>
                <span className="labelRow">
                  Counterparty name
                  <HelpTip title="Who are you dealing with?" body="The person/company on the other side of the deal." example="Nairobi Coffee Co." />
                </span>
                <input value={draft.counterpartyName} onChange={(e) => setDraft((p) => ({ ...p, counterpartyName: e.target.value }))} />
              </label>
              <label>
                <span className="labelRow">
                  Country
                  <HelpTip title="Country" body="Where the counterparty is located (helps with logistics context)." example="Kenya" />
                </span>
                <input value={draft.counterpartyCountry} onChange={(e) => setDraft((p) => ({ ...p, counterpartyCountry: e.target.value }))} placeholder="Kenya" />
              </label>
            </div>
            <label>
              <span className="labelRow">
                Counterparty wallet (optional)
                <HelpTip title="Counterparty wallet" body="Optional for now. Later this becomes the receiving/signing address for the smart contract." example="0xdef456..." />
              </span>
              <input value={draft.counterpartyWallet} onChange={(e) => setDraft((p) => ({ ...p, counterpartyWallet: e.target.value }))} placeholder="0x..." />
            </label>

            <div className="grid2">
              <label>
                <span className="labelRow">
                  Total amount
                  <HelpTip title="Total amount" body="Total value of the deal (informational + future escrow amount)." example="1000" />
                </span>
                <input value={draft.totalAmount} onChange={(e) => setDraft((p) => ({ ...p, totalAmount: e.target.value }))} placeholder="1000" />
              </label>
              <label>
                <span className="labelRow">
                  Currency
                  <HelpTip title="Currency" body="Displayed currency for this deal (USD recommended while testing)." example="USD" />
                </span>
                <input value={draft.currency} onChange={(e) => setDraft((p) => ({ ...p, currency: e.target.value }))} placeholder="USD" />
              </label>
            </div>

            <div className="subcard">
              <div className="subcard__title">
                Payment schedule
                <HelpTip
                  title="Payment schedule"
                  body="Split the deal into 2–3 payments. Later we can enforce this on-chain with escrow releases tied to milestones."
                  example="Deposit 300, Mid 300, Final 400"
                />
              </div>
              <div className="stack">
                {(draft.payments || []).map((p, idx) => (
                  <div key={idx} className="row rowWrap">
                    <input
                      value={p.label}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          payments: prev.payments.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)),
                        }))
                      }
                      placeholder="Label"
                    />
                    <input
                      value={p.amount}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          payments: prev.payments.map((x, i) => (i === idx ? { ...x, amount: e.target.value } : x)),
                        }))
                      }
                      placeholder="Amount"
                    />
                    <input
                      value={p.currency}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          payments: prev.payments.map((x, i) => (i === idx ? { ...x, currency: e.target.value } : x)),
                        }))
                      }
                      placeholder="Currency"
                    />
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setDraft((prev) => ({ ...prev, payments: prev.payments.filter((_, i) => i !== idx) }))}
                      title="Remove payment"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      payments: [...prev.payments, { label: `Payment ${prev.payments.length + 1}`, amount: '', currency: prev.currency || 'USD', status: 'pending' }],
                    }))
                  }
                >
                  + Add payment
                </button>
              </div>
            </div>

            <div className="subcard">
              <div className="subcard__title">
                Milestones
                <HelpTip
                  title="Milestones"
                  body="Milestones are the checkpoints you want to track. Later the contract can require evidence (e.g., tracking number) before releasing payments."
                  example="Tracking number provided"
                />
              </div>
              <div className="stack">
                {(draft.milestones || []).map((m, idx) => (
                  <div key={idx} className="row rowWrap">
                    <input
                      value={m.title}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          milestones: prev.milestones.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)),
                        }))
                      }
                      placeholder="Milestone title"
                    />
                    <select
                      value={m.evidenceType || 'none'}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          milestones: prev.milestones.map((x, i) => (i === idx ? { ...x, evidenceType: e.target.value } : x)),
                        }))
                      }
                    >
                      <option value="none">none</option>
                      <option value="tracking_number">tracking number</option>
                      <option value="document">document</option>
                      <option value="message">message</option>
                    </select>
                    <select
                      value={m.assignedRole || 'any'}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          milestones: prev.milestones.map((x, i) => (i === idx ? { ...x, assignedRole: e.target.value } : x)),
                        }))
                      }
                    >
                      <option value="any">assigned: any</option>
                      <option value="buyer">assigned: buyer</option>
                      <option value="seller">assigned: seller</option>
                      <option value="creator">assigned: creator</option>
                      <option value="shipper">assigned: shipper</option>
                      <option value="mediator">assigned: mediator</option>
                    </select>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setDraft((prev) => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== idx) }))}
                      title="Remove milestone"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      milestones: [...prev.milestones, { title: `Milestone ${prev.milestones.length + 1}`, evidenceType: 'none', assignedRole: 'any', status: 'pending' }],
                    }))
                  }
                >
                  + Add milestone
                </button>
              </div>
            </div>

            <div className="row">
              <button className="btn primary" type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create deal'}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Your deals</h2>
          {loading ? <LoadingSpinner label="Loading deals…" /> : null}
          {!loading && items.length === 0 ? <div className="muted">No deals yet.</div> : null}
          <div className="deals-list">
            {items.map((d) => (
              <button
                key={d._id}
                className={`deal-item ${selectedId === d._id ? 'active' : ''}`}
                onClick={() => setSelectedId(d._id)}
              >
                <div className="deal-title">{d.title}</div>
                <div className="muted small">
                  {d.status || 'draft'}
                  {d?.pva?.workflow?.status ? ` · pva:${d.pva.workflow.status}` : ''}
                  {getPvaPendingQueueCount(d) > 0 ? ` · queue:${getPvaPendingQueueCount(d)}` : ''}
                  {' · '}
                  {d.counterparty?.country || '—'}
                  {' · '}
                  {d.currency || 'USD'} {d.totalAmount || 0}
                </div>
              </button>
            ))}
          </div>
        </section>

        {selected ? (
          <section className="card">
            <h2>Deal workspace</h2>
            {selected.counterpartyAccess?.joinedAt ? (
              <div className="counterparty-joined" role="status">
                ✓ Counterparty joined {new Date(selected.counterpartyAccess.joinedAt).toLocaleString()}
              </div>
            ) : null}
            <div className="workspace">
              <div className="workspace-col">
                <h3>
                  Counterparty join link{' '}
                  <HelpTip
                    title="Counterparty join link"
                    body="Generate a shareable link so the counterparty can view the deal, message, and submit milestone evidence without creating a full account yet."
                    example="Send link via email/Telegram"
                  />
                </h3>
                <div className="row">
                  <button className="btn ghost" type="button" disabled={inviteLoading} onClick={handleGenerateInvite}>
                    {inviteLoading ? 'Generating…' : 'Generate join link'}
                  </button>
                </div>
                {inviteLink ? (
                  <div className="subcard">
                    <div className="muted small">Join URL (copied to clipboard if supported):</div>
                    <div className="muted small" style={{ wordBreak: 'break-all' }}>
                      {inviteLink}
                    </div>
                    {inviteExpiresAt ? (
                      <div className="muted small">Expires: {new Date(inviteExpiresAt).toLocaleString()}</div>
                    ) : null}
                  </div>
                ) : null}

                <h3>PVA role assignment</h3>
                <div className="subcard">
                  <div className="muted small">
                    Workflow: <strong>{String(currentWorkflow?.status || 'draft')}</strong>
                    {currentWorkflow?.updatedAt ? ` · updated ${new Date(currentWorkflow.updatedAt).toLocaleString()}` : ''}
                  </div>
                  <div className="muted small" style={{ marginTop: '0.4rem' }}>
                    Creator: <strong>{String(currentRoleAcceptance?.creator?.status || 'pending')}</strong>
                    {' · '}
                    Shipper: <strong>{String(currentRoleAcceptance?.shipper?.status || 'pending')}</strong>
                    {' · '}
                    Buyer: <strong>{String(currentRoleAcceptance?.buyer?.status || 'pending')}</strong>
                  </div>
                  {viewerPvaAssignedRole ? (
                    <div className="row rowWrap" style={{ marginTop: '0.6rem' }}>
                      <span className="muted small">
                        Your role assignment: <strong>{viewerPvaAssignedRole}</strong> ({viewerRoleAcceptanceStatus})
                      </span>
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={actionBusy || viewerRoleAcceptanceStatus === 'accepted' || viewerRoleAcceptanceStatus === 'declined'}
                        onClick={() => handlePvaRoleAction(viewerPvaAssignedRole, 'accept')}
                      >
                        Accept role
                      </button>
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={actionBusy || viewerRoleAcceptanceStatus === 'declined' || viewerRoleAcceptanceStatus === 'accepted'}
                        onClick={() => handlePvaRoleAction(viewerPvaAssignedRole, 'decline')}
                      >
                        Decline role
                      </button>
                    </div>
                  ) : null}
                  <div className="row rowWrap">
                    <button className="btn ghost" type="button" disabled={workspaceCandidatesLoading || actionBusy} onClick={handleLoadWorkspaceCandidates}>
                      {workspaceCandidatesLoading ? 'Loading candidates…' : 'Load creator/shipper candidates'}
                    </button>
                    <button className="btn ghost" type="button" disabled={actionBusy} onClick={() => refreshPvaWorkspace(selected._id)}>
                      Refresh workflow
                    </button>
                  </div>
                  <div className="grid2" style={{ marginTop: '0.6rem' }}>
                    <label>
                      <span className="labelRow">Assign creator</span>
                      <select
                        value={pvaRoleDraft.creatorUserId}
                        onChange={(e) => setPvaRoleDraft((prev) => ({ ...prev, creatorUserId: e.target.value }))}
                      >
                        <option value="">Select creator</option>
                        {(workspaceCandidates.creators || []).map((c) => (
                          <option key={c.userId || c.name} value={c.userId || ''}>
                            {c.name} ({c.city || 'n/a'}, {c.country || 'n/a'})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="labelRow">Assign shipper</span>
                      <select
                        value={pvaRoleDraft.shipperUserId}
                        onChange={(e) => setPvaRoleDraft((prev) => ({ ...prev, shipperUserId: e.target.value }))}
                      >
                        <option value="">Select shipper</option>
                        {(workspaceCandidates.shippers || []).map((s) => (
                          <option key={s.userId || s.name} value={s.userId || ''}>
                            {s.name} ({s.city || 'n/a'}, {s.country || 'n/a'})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="row rowWrap" style={{ marginTop: '0.6rem' }}>
                    <button className="btn ghost" type="button" disabled={actionBusy || !canAssignPvaRoles} onClick={handleApplyPvaAssignments}>
                      Apply creator/shipper assignment
                    </button>
                  </div>

                  <div style={{ marginTop: '0.8rem' }}>
                    <div className="muted small"><strong>PVA notification queue</strong></div>
                    <div className="row rowWrap" style={{ marginTop: '0.35rem' }}>
                      <span className="muted small">Filter</span>
                      <select value={pvaNotificationFilter} onChange={(e) => setPvaNotificationFilter(e.target.value)}>
                        <option value="all">all</option>
                        <option value="queued">queued</option>
                        <option value="sent">sent</option>
                        <option value="failed">failed</option>
                      </select>
                      <span className="muted small">showing {displayedPvaNotificationQueue.length}</span>
                      {['seller', 'mediator', 'admin'].includes(viewerRole) ? (
                        <>
                          <button className="btn ghost" type="button" disabled={actionBusy || !displayedPvaNotificationQueue.length} onClick={() => handleBulkPvaQueueStatusUpdate('sent')}>
                            Mark visible sent
                          </button>
                          <button className="btn ghost" type="button" disabled={actionBusy || !displayedPvaNotificationQueue.length} onClick={() => handleBulkPvaQueueStatusUpdate('failed')}>
                            Mark visible failed
                          </button>
                          <button className="btn ghost" type="button" disabled={actionBusy || !displayedPvaNotificationQueue.some((note) => String(note?.status || '') === 'failed')} onClick={handleRetryFailedOnly}>
                            Retry failed only
                          </button>
                          <button className="btn ghost" type="button" disabled={actionBusy || !displayedPvaNotificationQueue.some((note) => String(note?.status || '') === 'sent')} onClick={handleClearSentFromView}>
                            Clear sent from view
                          </button>
                          <button className="btn ghost" type="button" disabled={actionBusy || !Object.keys(dismissedPvaSentIds).length} onClick={handleUndoClearSentFromView}>
                            Undo clear
                          </button>
                        </>
                      ) : null}
                    </div>
                    {displayedPvaNotificationQueue.length ? (
                      <div className="stack" style={{ marginTop: '0.4rem' }}>
                        {displayedPvaNotificationQueue.map((note, idx) => (
                          <div key={`${note?.targetRole || 'role'}-${note?.eventType || 'event'}-${idx}`} className="muted small">
                            <div>
                              {note?.eventType || 'event'} {' -> '} {note?.targetRole || 'party'}
                              {' '}
                              <span className={`pva-status-chip pva-status-chip--${String(note?.status || 'queued')}`}>{note?.status || 'queued'}</span>
                              {note?.createdAt ? ` @ ${new Date(note.createdAt).toLocaleString()}` : ''}
                            </div>
                            {['seller', 'mediator', 'admin'].includes(viewerRole) && note?._id ? (
                              <div className="row rowWrap" style={{ marginTop: '0.3rem' }}>
                                <select
                                  value={pvaNotificationStatusDrafts[note._id] || note?.status || 'queued'}
                                  onChange={(e) =>
                                    setPvaNotificationStatusDrafts((prev) => ({ ...prev, [note._id]: e.target.value }))
                                  }
                                >
                                  <option value="queued">queued</option>
                                  <option value="sent">sent</option>
                                  <option value="failed">failed</option>
                                </select>
                                <button
                                  className="btn ghost"
                                  type="button"
                                  disabled={actionBusy}
                                  onClick={() => handlePvaQueueStatusUpdate(note._id)}
                                >
                                  Update
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="muted small" style={{ marginTop: '0.4rem' }}>No queued workflow notifications.</div>
                    )}
                  </div>

                  <div style={{ marginTop: '0.8rem' }}>
                    <div className="muted small"><strong>Payout preview</strong></div>
                    {pvaPayoutPreview.length ? (
                      <div className="stack" style={{ marginTop: '0.4rem' }}>
                        {pvaPayoutPreview.map((line, idx) => (
                          <div key={`${line?.party || 'party'}-${idx}`} className="muted small">
                            {line?.party || 'party'}: {line?.currency || selected.currency || 'USD'} {line?.amount || 0}
                            {' · '}
                            {line?.status || 'pending'}
                            {line?.note ? ` · ${line.note}` : ''}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="muted small" style={{ marginTop: '0.4rem' }}>No payout preview available yet.</div>
                    )}
                  </div>
                </div>

                <h3>My task dashboard</h3>
                <div className="subcard">
                  <div className="muted small">Current role: <strong>{viewerRole}</strong></div>
                  {myTaskMilestones.length ? (
                    <div className="stack" style={{ marginTop: '0.5rem' }}>
                      {myTaskMilestones.map((m, idx) => (
                        <div key={m._id || idx} className="muted small">
                          <strong>{m.title}</strong> · assigned to {m.assignedRole || 'any'} · status {m.status || 'pending'}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="muted small" style={{ marginTop: '0.5rem' }}>No assigned tasks for your role yet.</div>
                  )}
                </div>

                <h3>Milestones</h3>
                {Array.isArray(selected.milestones) && selected.milestones.length ? (
                  <div className="milestones">
                    {selected.milestones.map((m, idx) => (
                      <div key={m._id || idx} className={`milestone ${m.status}`}>
                        <div className="milestone-title">{m.title}</div>
                        {m.description ? <div className="muted small">{m.description}</div> : null}
                        <div className="muted small">evidence: {m.evidenceType || 'none'}</div>
                        <div className="muted small">assigned role: {m.assignedRole || 'any'}</div>
                        {m.evidenceValue ? <div className="muted small">evidence value: {m.evidenceValue}</div> : null}
                        {m.evidenceType && m.evidenceType !== 'none' ? (
                          <div className="row">
                            <input
                              value={evidenceDrafts[m._id] ?? ''}
                              onChange={(e) => setEvidenceDrafts((prev) => ({ ...prev, [m._id]: e.target.value }))}
                              placeholder="Submit evidence (tracking number, link, etc.)"
                            />
                            <button
                              className="btn ghost"
                              type="button"
                              disabled={viewerRole !== 'admin' && !['any', viewerRole].includes(String(m.assignedRole || 'any')) && !(String(m.assignedRole || '') === 'creator' && viewerRole === 'seller')}
                              onClick={() => handleSubmitEvidence(m._id)}
                            >
                              Save evidence
                            </button>
                          </div>
                        ) : null}
                        {m.status !== 'completed' ? (
                          <button className="btn ghost" onClick={() => handleMarkMilestoneCompleted(idx)}>
                            Mark completed
                          </button>
                        ) : (
                          <div className="muted small">completed {m.completedAt ? new Date(m.completedAt).toLocaleString() : ''}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No milestones.</div>
                )}

                <h3>Payments</h3>
                {Array.isArray(selected.payments) && selected.payments.length ? (
                  <div className="payments">
                    {selected.payments.map((p, idx) => (
                      <div key={p._id || idx} className="payment">
                        <div className="payment-title">{p.label || `Payment ${idx + 1}`}</div>
                        <div className="muted small">
                          {p.currency || selected.currency || 'USD'} {p.amount} · {p.status || 'pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No payments.</div>
                )}

                <h3>Escrow controls (live API + mock transfer lane)</h3>
                <div className="subcard">
                  <div className="muted small">
                    Role: <strong>{viewerRole}</strong> · Escrow status: <strong>{selected.escrow?.status || 'draft'}</strong> · mode: <strong>{selected.escrow?.fundingMode || 'mock'}</strong>
                  </div>
                  <div className="row rowWrap" style={{ marginTop: '0.5rem' }}>
                    <input
                      value={mockProofNote}
                      onChange={(e) => setMockProofNote(e.target.value)}
                      placeholder="Mock transfer confirmation note"
                    />
                    <input
                      value={mockProofUrl}
                      onChange={(e) => setMockProofUrl(e.target.value)}
                      placeholder="Screenshot URL (optional)"
                    />
                  </div>
                  <div className="row rowWrap" style={{ marginTop: '0.5rem' }}>
                    <button className="btn primary" type="button" disabled={actionBusy || !canMockFund} onClick={handleMockFundEscrow}>
                      Mock fund escrow
                    </button>
                    <button className="btn ghost" type="button" disabled={actionBusy || !canConfirmReceipt} onClick={handleConfirmReceipt}>
                      Buyer confirms receipt
                    </button>
                    <button className="btn ghost" type="button" disabled={actionBusy || !canRelease} onClick={handleReleaseEscrow}>
                      Release funds
                    </button>
                    <button className="btn ghost" type="button" disabled={actionBusy || !canRefund} onClick={handleRefundEscrow}>
                      Refund buyer
                    </button>
                  </div>
                </div>

                <h3>Dispute desk</h3>
                <div className="subcard">
                  <div className="muted small">
                    Dispute status: <strong>{disputeStatus}</strong>
                  </div>
                  {disputeData?.resolutionCode ? (
                    <div className="muted small" style={{ marginTop: '0.35rem' }}>
                      Resolution code: <strong>{disputeData.resolutionCode}</strong>
                    </div>
                  ) : null}
                  {disputeData?.resolutionHash ? (
                    <div className="muted small" style={{ marginTop: '0.2rem', wordBreak: 'break-all' }}>
                      Decision hash: <strong>{disputeData.resolutionHash}</strong>
                    </div>
                  ) : null}
                  <div className="row rowWrap" style={{ marginTop: '0.5rem' }}>
                    <button
                      className="btn ghost"
                      type="button"
                      disabled={actionBusy || !['resolved_release', 'resolved_refund'].includes(disputeStatus)}
                      onClick={handleGenerateResolutionCertificate}
                    >
                      Generate resolution certificate
                    </button>
                  </div>
                  {resolutionCertificate ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div className="row rowWrap" style={{ marginBottom: '0.5rem' }}>
                        <button className="btn ghost" type="button" onClick={handleCopyResolutionCertificate}>
                          Copy certificate
                        </button>
                        <button className="btn ghost" type="button" onClick={handleDownloadResolutionCertificate}>
                          Download certificate
                        </button>
                      </div>
                      <pre className="json">{JSON.stringify(resolutionCertificate, null, 2)}</pre>
                    </div>
                  ) : null}
                  <div className="row rowWrap" style={{ marginTop: '0.5rem' }}>
                    <input
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Reason (required to open dispute)"
                    />
                    <input
                      value={disputeDetails}
                      onChange={(e) => setDisputeDetails(e.target.value)}
                      placeholder="Details"
                    />
                  </div>
                  <div className="row rowWrap" style={{ marginTop: '0.5rem' }}>
                    <select value={resolutionCode} onChange={(e) => setResolutionCode(e.target.value)}>
                      <option value="">Select resolution code</option>
                      {Object.entries(RESOLUTION_REASON_CODES).flatMap(([decision, codes]) =>
                        codes.map((code) => (
                          <option key={`${decision}-${code}`} value={code}>{decision}: {code}</option>
                        ))
                      )}
                    </select>
                    <button className="btn ghost" type="button" disabled={actionBusy || !canOpenDispute} onClick={handleOpenDispute}>
                      Open dispute
                    </button>
                    <button className="btn ghost" type="button" disabled={actionBusy || !canResolveDisputeUi} onClick={() => handleResolveDispute('release')}>
                      Resolve: release
                    </button>
                    <button className="btn ghost" type="button" disabled={actionBusy || !canResolveDisputeUi} onClick={() => handleResolveDispute('refund')}>
                      Resolve: refund
                    </button>
                  </div>
                  <div className="row rowWrap" style={{ marginTop: '0.5rem' }}>
                    <label className="check">
                      <input type="checkbox" checked={forfeitCreator} onChange={(e) => setForfeitCreator(e.target.checked)} />
                      <span>Forfeit creator collateral</span>
                    </label>
                    <label className="check">
                      <input type="checkbox" checked={forfeitShipper} onChange={(e) => setForfeitShipper(e.target.checked)} />
                      <span>Forfeit shipper collateral</span>
                    </label>
                    <input
                      value={collateralResolutionNote}
                      onChange={(e) => setCollateralResolutionNote(e.target.value)}
                      placeholder="Collateral resolution note"
                    />
                  </div>
                  <div className="muted small" style={{ marginTop: '0.35rem' }}>
                    Impact preview ({disputeImpactPreview.currency}): creator at risk {disputeImpactPreview.creatorForfeit} · shipper at risk {disputeImpactPreview.shipperForfeit}
                  </div>
                  <div className="row rowWrap" style={{ marginTop: '0.5rem' }}>
                    <input
                      value={disputeEvidenceNote}
                      onChange={(e) => setDisputeEvidenceNote(e.target.value)}
                      placeholder="Dispute evidence note"
                    />
                    <input
                      value={disputeEvidenceUrl}
                      onChange={(e) => setDisputeEvidenceUrl(e.target.value)}
                      placeholder="Attachment URL (optional)"
                    />
                    <button className="btn ghost" type="button" disabled={actionBusy || !canAddDisputeEvidenceUi} onClick={handleAddDisputeEvidence}>
                      Add evidence
                    </button>
                  </div>
                  {Array.isArray(disputeData?.evidence) && disputeData.evidence.length ? (
                    <div className="stack" style={{ marginTop: '0.5rem' }}>
                      {disputeData.evidence.slice(-10).map((ev) => (
                        <div key={ev._id || `${ev.createdAt}-${ev.note}`} className="muted small">
                          <strong>{ev.role || 'party'}</strong> · {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ''}
                          {ev.note ? ` · ${ev.note}` : ''}
                          {ev.attachmentUrl ? ` · ${ev.attachmentUrl}` : ''}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <h3>Mediator controls</h3>
                <div className="subcard">
                  <div className="muted small">
                    Mediator role: <strong>{viewerRole}</strong> · Current mediator: <strong>{selected.mediatorId || 'none'}</strong>
                  </div>
                  <div className="muted small" style={{ marginTop: '0.35rem' }}>
                    Mediation mode: <strong>{selected.mediation?.mode || 'none'}</strong> · status: <strong>{selected.mediation?.status || 'none'}</strong>
                  </div>

                  <div className="row rowWrap" style={{ marginTop: '0.6rem' }}>
                    <button className="btn ghost" type="button" disabled={actionBusy || !canAssignPlatformMediator} onClick={handleAssignPlatformMediator}>
                      Assign platform mediator (admin)
                    </button>
                  </div>

                  <div className="row rowWrap" style={{ marginTop: '0.6rem' }}>
                    <input
                      value={mediatorRequest.name}
                      onChange={(e) => setMediatorRequest((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Trusted mediator name"
                    />
                    <input
                      value={mediatorRequest.email}
                      onChange={(e) => setMediatorRequest((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Trusted mediator email"
                    />
                    <input
                      value={mediatorRequest.contact}
                      onChange={(e) => setMediatorRequest((p) => ({ ...p, contact: e.target.value }))}
                      placeholder="Contact/telegram/phone"
                    />
                    <input
                      value={mediatorRequest.notes}
                      onChange={(e) => setMediatorRequest((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Request notes"
                    />
                    <button className="btn ghost" type="button" disabled={actionBusy || !canRequestCustomMediator} onClick={handleRequestCustomMediator}>
                      Request trusted mediator
                    </button>
                  </div>

                  {canApproveMediator ? (
                    <div className="row rowWrap" style={{ marginTop: '0.6rem' }}>
                      <input
                        value={mediatorApproval.mediatorUserId}
                        onChange={(e) => setMediatorApproval((p) => ({ ...p, mediatorUserId: e.target.value }))}
                        placeholder="Optional approved mediator userId"
                      />
                      <input
                        value={mediatorApproval.note}
                        onChange={(e) => setMediatorApproval((p) => ({ ...p, note: e.target.value }))}
                        placeholder="Admin approval note"
                      />
                      <button className="btn ghost" type="button" disabled={actionBusy} onClick={() => handleApproveMediator('approve')}>
                        Approve mediator request
                      </button>
                      <button className="btn ghost" type="button" disabled={actionBusy} onClick={() => handleApproveMediator('decline')}>
                        Decline mediator request
                      </button>
                    </div>
                  ) : null}

                  {selected.mediation?.customRequest ? (
                    <div className="muted small" style={{ marginTop: '0.6rem' }}>
                      Custom request: {selected.mediation.customRequest.name || 'n/a'} · {selected.mediation.customRequest.email || 'n/a'} · {selected.mediation.customRequest.contact || 'n/a'}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="workspace-col">
                <h3>
                  Activity log
                  <HelpTip
                    title="Activity log"
                    body="All messages and system events (evidence, invites, status changes) appear here in order."
                    example="Owner: tracking number submitted"
                  />
                </h3>
                <div className="messages">
                  {(selected.messages || []).slice(-50).map((msg, idx) => (
                    <div key={msg._id || idx} className="message">
                      <div className="muted small">
                        {msg.author || 'owner'} · {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                      </div>
                      <div className="message-text">{msg.text}</div>
                    </div>
                  ))}
                </div>
                <div className="row">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Add a note / update..."
                  />
                  <button className="btn primary" type="button" onClick={handleAddMessage}>
                    Send
                  </button>
                </div>
                <p className="muted small">
                  Next step: allow counterparty to join via link + wallet signature, then deploy an escrow contract on Base.
                </p>

                <h3>
                  Escrow on Base{' '}
                  <HelpTip
                    title="Escrow deployment"
                    body="Prepare deployment params (payments, milestone hashes) for an escrow contract. Deploy via your wallet on Base (chainId 8453), then link the contract address here."
                    example="Use Prepare to fetch params, then deploy in Remix or another tool"
                  />
                </h3>
                {!escrowPrepare ? (
                  <div>
                    <p className="muted small">
                      Connect a wallet and ensure you're on Base (chain 8453) for deployment.
                    </p>
                    <button
                      className="btn primary"
                      type="button"
                      onClick={handlePrepareEscrow}
                      disabled={escrowLoading}
                    >
                      {escrowLoading ? 'Preparing…' : 'Prepare escrow params'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <pre className="json">{JSON.stringify(escrowPrepare, null, 2)}</pre>
                    {selected.contractAddress ? (
                      <p className="muted small">
                        Linked: <code>{selected.contractAddress}</code>
                      </p>
                    ) : (
                      <div className="row" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input
                          placeholder="0x… deployed contract address"
                          style={{ flex: 1 }}
                          onBlur={(e) => {
                            const v = e.target.value?.trim();
                            if (v) handleLinkContract(v);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const v = e.target.value?.trim();
                              if (v) handleLinkContract(v);
                            }
                          }}
                        />
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => setEscrowPrepare(null)}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <h3>Global fraud response packet</h3>
                <div className="subcard">
                  <div className="row rowWrap">
                    <button className="btn ghost" type="button" disabled={actionBusy} onClick={() => handleGenerateFraudPacket(false)}>
                      Generate packet (download mode)
                    </button>
                    <button className="btn ghost" type="button" disabled={actionBusy || viewerRole !== 'admin'} onClick={() => handleGenerateFraudPacket(true)}>
                      Generate + outbound request
                    </button>
                  </div>
                  <div className="muted small" style={{ marginTop: '0.4rem' }}>
                    Outbound dispatch enqueue is admin-only and tracked in queue states: queued, sent, failed.
                  </div>
                  <div className="row rowWrap" style={{ marginTop: '0.45rem' }}>
                    <select value={queueStatusFilter} onChange={(e) => setQueueStatusFilter(e.target.value)}>
                      <option value="all">All queue items</option>
                      <option value="queued">Queued</option>
                      <option value="sent">Sent</option>
                      <option value="failed">Dead letters</option>
                    </select>
                    <button className="btn ghost" type="button" disabled={actionBusy} onClick={handleGenerateExportBundle}>
                      Generate export bundle
                    </button>
                  </div>
                  {exportBundle ? <pre className="json" style={{ marginTop: '0.5rem' }}>{JSON.stringify(exportBundle, null, 2)}</pre> : null}
                  {reportPacket ? <pre className="json">{JSON.stringify(reportPacket, null, 2)}</pre> : null}
                  {Array.isArray(outboundQueue) && outboundQueue.length ? (
                    <div className="stack" style={{ marginTop: '0.7rem' }}>
                      {outboundQueue.slice().reverse().map((q) => {
                        const draftState = queueStatusDrafts[q.packetId] || { status: q.status || 'queued', lastError: q.lastError || '' };
                        return (
                          <div key={q._id || q.packetId} className="subcard">
                            <div className="muted small">
                              Packet <strong>{q.packetId}</strong> · status <strong>{q.status}</strong> · targets {Array.isArray(q.targets) ? q.targets.join(', ') : 'none'}
                            </div>
                            {q.status === 'failed' ? (
                              <div className="muted small" style={{ marginTop: '0.25rem' }}>
                                Dead letter · next attempt {q.nextAttemptAt ? new Date(q.nextAttemptAt).toLocaleString() : 'n/a'} · last error {q.lastError || 'n/a'}
                              </div>
                            ) : null}
                            {viewerRole === 'admin' ? (
                              <div className="row rowWrap" style={{ marginTop: '0.4rem' }}>
                                <select
                                  value={draftState.status}
                                  onChange={(e) => setQueueStatusDrafts((prev) => ({
                                    ...prev,
                                    [q.packetId]: {
                                      ...(prev[q.packetId] || draftState),
                                      status: e.target.value,
                                    },
                                  }))}
                                >
                                  <option value="queued">queued</option>
                                  <option value="sent">sent</option>
                                  <option value="failed">failed</option>
                                </select>
                                <input
                                  value={draftState.lastError || ''}
                                  onChange={(e) => setQueueStatusDrafts((prev) => ({
                                    ...prev,
                                    [q.packetId]: {
                                      ...(prev[q.packetId] || draftState),
                                      lastError: e.target.value,
                                    },
                                  }))}
                                  placeholder="Failure note (if failed)"
                                />
                                <button className="btn ghost" type="button" disabled={actionBusy} onClick={() => handleQueueStatusUpdate(q.packetId)}>
                                  Update queue status
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

