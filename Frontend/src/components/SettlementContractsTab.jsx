import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { createLogger } from '../lib/logger';
import HelpTip from './HelpTip.jsx';
import LoadingSpinner, { LoadingDots } from './LoadingSpinner.jsx';
import './SettlementContractsTab.css';

const logger = createLogger('SettlementContractsTab');
const BASE_CHAIN_ID_DEC = 8453;
const BASE_CHAIN_ID_HEX = '0x2105';
const DRAFT_STORAGE_KEY = 'pva:settlement:draft:v1';
const AUDIT_EVENT_LABELS = {
  'transfer-recorded': 'Transfer recorded',
  'transfer-record-updated': 'Transfer record updated',
  'transfer-finalized': 'Settlement finalized',
  'contract-finalized': 'Settlement finalized',
  'contract-exported': 'Contract JSON exported',
  'contract-exported-json': 'Contract JSON exported',
  'contract-rendered': 'Contract print rendered',
  'contract-rendered-print': 'Contract print rendered',
  'integrity-verified': 'Integrity verified',
  'verification-report-exported': 'Verification report JSON exported',
  'verification-report-exported-json': 'Verification report JSON exported',
  'verification-report-rendered': 'Verification report print rendered',
  'verification-report-rendered-print': 'Verification report print rendered',
  'transfer-reverified': 'Re-verified on chain',
  'reverified-on-chain': 'Re-verified on chain',
  'handoff-summary-copied': 'Handoff summary copied',
  'audit-event': 'Audit event',
};

function isWalletAddress(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(addr || '').trim());
}

function isBaseChain(chainId) {
  if (!chainId) return false;
  const value = String(chainId).toLowerCase();
  return value === BASE_CHAIN_ID_HEX || value === String(BASE_CHAIN_ID_DEC);
}

function toWeiHex(nativeAmount) {
  const input = String(nativeAmount || '').trim();
  if (!input || Number(input) <= 0) {
    throw new Error('Native amount must be greater than zero');
  }
  const [wholeRaw, fractionRaw = ''] = input.split('.');
  const whole = wholeRaw.replace(/[^\d]/g, '') || '0';
  const fraction = fractionRaw.replace(/[^\d]/g, '').slice(0, 18).padEnd(18, '0');
  const wei = (BigInt(whole) * (10n ** 18n)) + BigInt(fraction || '0');
  if (wei <= 0n) {
    throw new Error('Native amount is too small');
  }
  return `0x${wei.toString(16)}`;
}

export default function SettlementContractsTab() {
  const [wallet, setWallet] = useState({ address: '', chainId: '', connecting: false, sending: false });
  const [message, setMessage] = useState('');
  const [records, setRecords] = useState({ loading: true, data: [], error: null });
  const [templates, setTemplates] = useState({ loading: false, data: [], error: null });
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [artifacts, setArtifacts] = useState({ loading: false, data: [], error: null });
  const [artifactQuery, setArtifactQuery] = useState('');
  const [reverifyId, setReverifyId] = useState('');
  const [finalizingId, setFinalizingId] = useState('');
  const [verifyingId, setVerifyingId] = useState('');
  const [integrityStatusById, setIntegrityStatusById] = useState({});
  const [requiredErrors, setRequiredErrors] = useState({});
  const [beginnerMode, setBeginnerMode] = useState(true);
  const [wizardMode, setWizardMode] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [operationRole, setOperationRole] = useState('operator');
  const [pendingDraft, setPendingDraft] = useState(null);
  const [draftDecisionMade, setDraftDecisionMade] = useState(false);
  const [auditLog, setAuditLog] = useState({ loading: false, targetId: '', events: [] });
  const [timelineRoleFilter, setTimelineRoleFilter] = useState('all');
  const [timelineTypeFilter, setTimelineTypeFilter] = useState('all');
  const [signingRole, setSigningRole] = useState('partyOne');
  const [signingWallet, setSigningWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const txHashRef = useRef(null);
  const partyOneSignerNameRef = useRef(null);
  const partyTwoSignerNameRef = useRef(null);

  const [form, setForm] = useState({
    network: 'base',
    recipientWallet: '',
    nativeAmount: '0.0003',
    amountUsd: '1.00',
    tokenSymbol: 'USDC',
    tokenAmount: '',
    txHash: '',
    artifactId: '',
    note: '',
    mediaUrl: '',
    referenceUrl: '',
    partyOneName: '',
    partyOneRole: 'Operator',
    partyTwoName: '',
    partyTwoRole: 'Counterparty',
    additionalClauses: '',
    partyOneSignerName: '',
    partyOneSignedAt: '',
    partyTwoSignerName: '',
    partyTwoSignedAt: '',
    witnessName: '',
    witnessSignedAt: '',
    finalizationNote: '',
    partyOneSignerWallet: '',
    partyTwoSignerWallet: '',
    witnessWallet: '',
    attestationMessage: '',
    partyOneSignature: '',
    partyTwoSignature: '',
    witnessSignature: '',
  });

  const selectedArtifact = useMemo(
    () => artifacts.data.find((item) => String(item._id) === String(form.artifactId)),
    [artifacts.data, form.artifactId]
  );
  const showAdvanced = !beginnerMode;
  const hasConnectedWallet = !!wallet.address;
  const hasTxHash = String(form.txHash || '').trim().startsWith('0x') && String(form.txHash || '').trim().length >= 10;
  const hasRequiredSignerNames =
    String(form.partyOneSignerName || '').trim().length > 0 && String(form.partyTwoSignerName || '').trim().length > 0;
  const anyFinalizedRecord = records.data.some((item) => !!item.isFinalized);
  const anyVerifiedDigest = Object.values(integrityStatusById).some((status) => status === 'verified');

  const checklist = [
    {
      id: 'connect',
      label: 'Connect wallet',
      done: hasConnectedWallet,
      hint: 'Use Connect Wallet to enable chain send/sign actions.',
    },
    {
      id: 'tx',
      label: 'Provide tx hash',
      done: hasTxHash,
      hint: 'Send on Base or paste an existing 0x transaction hash.',
    },
    {
      id: 'signers',
      label: 'Fill required signer names',
      done: hasRequiredSignerNames,
      hint: 'Party One and Party Two signer names are mandatory for finalization.',
    },
    {
      id: 'finalize',
      label: 'Finalize and lock a settlement',
      done: anyFinalizedRecord,
      hint: 'Click Finalize & Lock on a tracked record once required fields are complete.',
    },
    {
      id: 'verify',
      label: 'Verify integrity digest',
      done: anyVerifiedDigest,
      hint: 'Click Verify Digest and confirm status is verified before audit export.',
    },
  ];

  const nextChecklistItem = checklist.find((item) => !item.done);
  const latestRecord = records.data[0] || null;
  const timelineEntries = useMemo(() => {
    if (!latestRecord) return [];
    const events = Array.isArray(auditLog.events) ? [...auditLog.events] : [];
    if (!events.length) {
      return [
        {
          key: `recorded-${latestRecord.id}`,
          title: 'Transfer recorded',
          when: latestRecord.createdAt,
          details: null,
        },
      ];
    }
    return events
      .slice()
      .sort((a, b) => new Date(b.eventAt || 0).getTime() - new Date(a.eventAt || 0).getTime())
      .map((event, index) => ({
        key: `${event.eventType || 'event'}-${event.eventAt || index}`,
        eventType: event.eventType || 'audit-event',
        actorRole: String(event.actorRole || '').trim().toLowerCase() || 'system',
        title: AUDIT_EVENT_LABELS[event.eventType] || event.eventType || 'Audit event',
        when: event.eventAt,
        details: event.details || null,
      }));
  }, [auditLog.events, latestRecord]);
  const timelineRoleOptions = useMemo(() => {
    const set = new Set();
    timelineEntries.forEach((entry) => {
      set.add(entry.actorRole || 'system');
    });
    return Array.from(set).sort();
  }, [timelineEntries]);
  const timelineTypeOptions = useMemo(() => {
    const set = new Set();
    timelineEntries.forEach((entry) => {
      set.add(entry.eventType || 'audit-event');
    });
    return Array.from(set).sort();
  }, [timelineEntries]);
  const filteredTimelineEntries = useMemo(
    () => timelineEntries.filter((entry) => {
      const rolePass = timelineRoleFilter === 'all' || entry.actorRole === timelineRoleFilter;
      const typePass = timelineTypeFilter === 'all' || entry.eventType === timelineTypeFilter;
      return rolePass && typePass;
    }),
    [timelineEntries, timelineRoleFilter, timelineTypeFilter]
  );
  const showWizardStep = (step) => !wizardMode || wizardStep === step;
  const wizardSteps = [
    {
      id: 'tx',
      title: 'Step 1: Tx Setup',
      description: 'Capture chain transaction details and payout amount.',
    },
    {
      id: 'signers',
      title: 'Step 2: Required Signers',
      description: 'Collect the mandatory signer identities.',
    },
    {
      id: 'context',
      title: 'Step 3: Optional Context',
      description: 'Add evidence links, clauses, and attestation data if available.',
    },
    {
      id: 'finalize',
      title: 'Step 4: Lock + Verify',
      description: 'Finalize settlement then verify digest before report export.',
    },
  ];
  const roleCapabilities = {
    operator: {
      canWalletSend: true,
      canRecord: true,
      canFinalize: true,
      canVerify: true,
      label: 'Operator',
    },
    reviewer: {
      canWalletSend: false,
      canRecord: false,
      canFinalize: false,
      canVerify: true,
      label: 'Reviewer',
    },
    auditor: {
      canWalletSend: false,
      canRecord: false,
      canFinalize: false,
      canVerify: true,
      label: 'Auditor',
    },
  };
  const activeRole = roleCapabilities[operationRole] || roleCapabilities.operator;

  const focusRequiredField = (fieldKey, messageText) => {
    setRequiredErrors((prev) => ({ ...prev, [fieldKey]: true }));
    const refMap = {
      txHash: txHashRef,
      partyOneSignerName: partyOneSignerNameRef,
      partyTwoSignerName: partyTwoSignerNameRef,
    };
    const target = refMap[fieldKey]?.current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => target.focus(), 120);
    }
    setMessage(messageText);
  };

  const validateCoreRequired = ({ requireTxHash = false } = {}) => {
    const txHash = String(form.txHash || '').trim();
    if (requireTxHash && (!txHash || !txHash.startsWith('0x'))) {
      return {
        ok: false,
        fieldKey: 'txHash',
        message: 'Tx Hash is required and should start with 0x.',
      };
    }

    if (!String(form.partyOneSignerName || '').trim()) {
      return {
        ok: false,
        fieldKey: 'partyOneSignerName',
        message: 'Party One Signer Name is required for contract finalization.',
      };
    }

    if (!String(form.partyTwoSignerName || '').trim()) {
      return {
        ok: false,
        fieldKey: 'partyTwoSignerName',
        message: 'Party Two Signer Name is required for contract finalization.',
      };
    }

    return { ok: true };
  };

  const canCompleteStep = (stepIndex) => {
    if (stepIndex === 0) {
      return String(form.txHash || '').trim().startsWith('0x');
    }
    if (stepIndex === 1) {
      return (
        String(form.partyOneSignerName || '').trim().length > 0
        && String(form.partyTwoSignerName || '').trim().length > 0
      );
    }
    if (stepIndex === 2) {
      return true;
    }
    if (stepIndex === 3) {
      return anyFinalizedRecord;
    }
    return true;
  };

  const goWizardNext = () => {
    if (!canCompleteStep(wizardStep)) {
      if (wizardStep === 0) {
        focusRequiredField('txHash', 'Complete tx hash in Step 1 before continuing.');
      } else if (wizardStep === 1) {
        if (!String(form.partyOneSignerName || '').trim()) {
          focusRequiredField('partyOneSignerName', 'Complete Party One signer name before continuing.');
        } else {
          focusRequiredField('partyTwoSignerName', 'Complete Party Two signer name before continuing.');
        }
      } else {
        setMessage('Complete this step before continuing.');
      }
      return;
    }
    setWizardStep((prev) => Math.min(prev + 1, wizardSteps.length - 1));
  };

  const goWizardBack = () => {
    setWizardStep((prev) => Math.max(prev - 1, 0));
  };

  const hasEthereum = () => typeof window !== 'undefined' && !!window.ethereum?.request;

  const loadTransfers = useCallback(async () => {
    setRecords({ loading: true, data: [], error: null });
    try {
      const response = await apiGet('/blockchain/transfers?limit=40');
      if (response.ok && Array.isArray(response.items)) {
        setRecords({ loading: false, data: response.items, error: null });
      } else {
        setRecords({ loading: false, data: [], error: response.message || 'Failed to load records' });
      }
    } catch (err) {
      logger.error('Failed to load transfers', err);
      setRecords({ loading: false, data: [], error: err.message || 'Failed to load records' });
    }
  }, []);

  const loadArtifacts = useCallback(async (query = '') => {
    setArtifacts((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const q = String(query || '').trim();
      const path = q ? `/items?limit=60&q=${encodeURIComponent(q)}` : '/items?limit=60';
      const response = await apiGet(path);
      const items = Array.isArray(response?.items) ? response.items : [];
      setArtifacts({ loading: false, data: items, error: null });
    } catch (err) {
      logger.error('Failed to load artifacts', err);
      setArtifacts({ loading: false, data: [], error: err.message || 'Failed to load artifacts' });
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplates({ loading: true, data: [], error: null });
    try {
      const response = await apiGet('/blockchain/settlement-templates?limit=20');
      if (response?.ok && Array.isArray(response.templates)) {
        setTemplates({ loading: false, data: response.templates, error: null });
      } else {
        setTemplates({ loading: false, data: [], error: response?.message || 'Failed to load templates' });
      }
    } catch (err) {
      logger.error('Failed to load templates', err);
      setTemplates({ loading: false, data: [], error: err.message || 'Failed to load templates' });
    }
  }, []);

  const loadAuditLog = useCallback(async (transferId) => {
    const id = String(transferId || '').trim();
    if (!id) {
      setAuditLog({ loading: false, targetId: '', events: [] });
      return;
    }
    setAuditLog((prev) => ({ ...prev, loading: true, targetId: id }));
    try {
      const response = await apiGet(`/blockchain/transfers/${id}/audit-log`);
      if (response?.ok) {
        setAuditLog({ loading: false, targetId: id, events: Array.isArray(response.events) ? response.events : [] });
      } else {
        setAuditLog({ loading: false, targetId: id, events: [] });
      }
    } catch {
      setAuditLog({ loading: false, targetId: id, events: [] });
    }
  }, []);

  const appendAuditEvent = useCallback(async (transferId, eventType, details = null) => {
    const id = String(transferId || '').trim();
    if (!id || !eventType) return;
    try {
      await apiPost(`/blockchain/transfers/${id}/audit-log`, {
        eventType,
        actorRole: operationRole,
        details,
      });
      await loadAuditLog(id);
    } catch {
      // Ignore non-critical logging failures so core workflow is not blocked.
    }
  }, [loadAuditLog, operationRole]);

  useEffect(() => {
    loadTransfers();
    loadArtifacts();
    loadTemplates();
  }, [loadTransfers, loadArtifacts, loadTemplates]);

  useEffect(() => {
    if (!records.data?.length) return;
    loadAuditLog(records.data[0].id);
  }, [records.data, loadAuditLog]);

  useEffect(() => {
    setTimelineRoleFilter('all');
    setTimelineTypeFilter('all');
  }, [latestRecord?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) {
        setDraftDecisionMade(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setPendingDraft(parsed);
      } else {
        setDraftDecisionMade(true);
      }
    } catch {
      setDraftDecisionMade(true);
    }
  }, []);

  useEffect(() => {
    if (!draftDecisionMade) return;
    const payload = {
      updatedAt: new Date().toISOString(),
      form,
      beginnerMode,
      wizardMode,
      wizardStep,
      operationRole,
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors and continue without blocking workflow.
    }
  }, [form, beginnerMode, wizardMode, wizardStep, operationRole, draftDecisionMade]);

  useEffect(() => {
    const id = setTimeout(() => {
      loadArtifacts(artifactQuery);
    }, 250);
    return () => clearTimeout(id);
  }, [artifactQuery, loadArtifacts]);

  const restoreDraft = () => {
    if (!pendingDraft?.form) {
      setDraftDecisionMade(true);
      setPendingDraft(null);
      return;
    }
    setForm((prev) => ({ ...prev, ...pendingDraft.form }));
    setBeginnerMode(typeof pendingDraft.beginnerMode === 'boolean' ? pendingDraft.beginnerMode : true);
    setWizardMode(!!pendingDraft.wizardMode);
    setWizardStep(Number.isInteger(pendingDraft.wizardStep) ? pendingDraft.wizardStep : 0);
    setOperationRole(typeof pendingDraft.operationRole === 'string' ? pendingDraft.operationRole : 'operator');
    setDraftDecisionMade(true);
    setPendingDraft(null);
    setMessage('Draft restored. Continue from your last saved state.');
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
    setPendingDraft(null);
    setDraftDecisionMade(true);
    setMessage('Saved draft discarded.');
  };

  const connectWallet = async () => {
    setMessage('');
    if (!hasEthereum()) {
      setMessage('No wallet detected. Install MetaMask or use a wallet-enabled browser.');
      return;
    }

    setWallet((prev) => ({ ...prev, connecting: true }));
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setWallet({
        address: String(accounts?.[0] || ''),
        chainId: String(chainId || ''),
        connecting: false,
        sending: false,
      });
      setMessage('Wallet connected.');
    } catch (err) {
      setWallet((prev) => ({ ...prev, connecting: false }));
      setMessage(err?.message || 'Failed to connect wallet');
    }
  };

  const ensureBaseChain = async () => {
    if (!hasEthereum()) throw new Error('No wallet provider found');
    if (isBaseChain(wallet.chainId)) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
    } catch (switchErr) {
      if (switchErr?.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: BASE_CHAIN_ID_HEX,
            chainName: 'Base',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          }],
        });
      } else {
        throw switchErr;
      }
    }

    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    setWallet((prev) => ({ ...prev, chainId: String(chainId || '') }));
    if (!isBaseChain(chainId)) throw new Error('Wallet is not on Base chain');
  };

  const buildRecordPayload = (txHash) => ({
    network: form.network,
    txHash: String(txHash || form.txHash || '').trim(),
    amountUsd: Number(form.amountUsd || 0),
    tokenSymbol: form.tokenSymbol.trim() || 'USDC',
    tokenAmount: form.tokenAmount.trim(),
    artifactId: form.artifactId.trim(),
    note: form.note.trim(),
    mediaUrl: form.mediaUrl.trim(),
    referenceUrl: form.referenceUrl.trim(),
    toAddress: form.recipientWallet.trim(),
    contractTerms: {
      partyOneName: form.partyOneName.trim(),
      partyOneRole: form.partyOneRole.trim() || 'Operator',
      partyTwoName: form.partyTwoName.trim(),
      partyTwoRole: form.partyTwoRole.trim() || 'Counterparty',
      additionalClauses: form.additionalClauses.trim(),
    },
    signatures: {
      partyOneSignerName: form.partyOneSignerName.trim(),
      partyOneSignerWallet: form.partyOneSignerWallet.trim(),
      partyOneSignedAt: form.partyOneSignedAt || '',
      partyTwoSignerName: form.partyTwoSignerName.trim(),
      partyTwoSignerWallet: form.partyTwoSignerWallet.trim(),
      partyTwoSignedAt: form.partyTwoSignedAt || '',
      witnessName: form.witnessName.trim(),
      witnessWallet: form.witnessWallet.trim(),
      witnessSignedAt: form.witnessSignedAt || '',
    },
    attestation: {
      message: form.attestationMessage.trim(),
      partyOneSignature: form.partyOneSignature.trim(),
      partyTwoSignature: form.partyTwoSignature.trim(),
      witnessSignature: form.witnessSignature.trim(),
    },
  });

  const buildDefaultAttestationMessage = useCallback(() => {
    const hash = String(form.txHash || '').trim() || '<pending-tx-hash>';
    return [
      'PVA Bazaar Settlement Attestation',
      `TxHash: ${hash}`,
      `Network: ${form.network}`,
      `Artifact: ${selectedArtifact?.title || selectedArtifact?.name || 'Unlinked'}`,
      `USD: ${Number(form.amountUsd || 0).toFixed(2)}`,
    ].join('\n');
  }, [form.txHash, form.network, form.amountUsd, selectedArtifact]);

  const ensureAttestationMessage = () => {
    if (form.attestationMessage.trim()) return form.attestationMessage.trim();
    const generated = buildDefaultAttestationMessage();
    setForm((prev) => ({ ...prev, attestationMessage: generated }));
    return generated;
  };

  const signConnectedWallet = async () => {
    if (!wallet.address) {
      setMessage('Connect wallet first to sign attestation.');
      return;
    }
    if (!hasEthereum()) {
      setMessage('No wallet provider found.');
      return;
    }

    const msg = ensureAttestationMessage();
    try {
      setSigningWallet(true);
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [msg, wallet.address],
      });

      setForm((prev) => {
        if (signingRole === 'partyTwo') {
          return {
            ...prev,
            partyTwoSignerWallet: wallet.address,
            partyTwoSignature: signature || '',
          };
        }
        if (signingRole === 'witness') {
          return {
            ...prev,
            witnessWallet: wallet.address,
            witnessSignature: signature || '',
          };
        }
        return {
          ...prev,
          partyOneSignerWallet: wallet.address,
          partyOneSignature: signature || '',
        };
      });
      setMessage('Attestation signature captured from connected wallet.');
    } catch (err) {
      setMessage(err?.message || 'Failed to sign attestation message');
    } finally {
      setSigningWallet(false);
    }
  };

  const applyTemplate = () => {
    const selected = templates.data.find((item) => String(item.id) === String(selectedTemplateId));
    if (!selected?.terms) {
      setMessage('Pick a template before applying.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      partyOneName: selected.terms.partyOneName || prev.partyOneName,
      partyOneRole: selected.terms.partyOneRole || prev.partyOneRole,
      partyTwoName: selected.terms.partyTwoName || prev.partyTwoName,
      partyTwoRole: selected.terms.partyTwoRole || prev.partyTwoRole,
      additionalClauses: selected.terms.additionalClauses || prev.additionalClauses,
    }));
    setMessage('Template applied to contract terms.');
  };

  const submitRecord = async (txHashOverride = '') => {
    if (!activeRole.canRecord) {
      setMessage(`${activeRole.label} role is read-only for recording. Switch to Operator to record transfers.`);
      return;
    }
    if (wizardMode && wizardStep < 1) {
      setMessage('Wizard lock: complete Step 1 and Step 2 before recording transfer.');
      return;
    }

    const validation = validateCoreRequired({ requireTxHash: true });
    if (!validation.ok) {
      focusRequiredField(validation.fieldKey, validation.message);
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiPost('/blockchain/transfers/record', buildRecordPayload(txHashOverride));
      if (!response?.ok) {
        setMessage(`Failed to record transfer: ${response?.message || 'unknown error'}`);
      } else {
        setMessage('Transfer recorded and verified. Contract links are ready.');
        if (response?.item?.id) {
          await loadAuditLog(response.item.id);
        }
        await loadTransfers();
      }
    } catch (err) {
      logger.error('Record transfer failed', err);
      setMessage(err.message || 'Failed to record transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWalletSendAndRecord = async () => {
    setMessage('');
    if (!activeRole.canWalletSend) {
      setMessage(`${activeRole.label} role cannot send wallet transactions.`);
      return;
    }
    if (!wallet.address) {
      setMessage('Connect wallet first.');
      return;
    }
    if (!isWalletAddress(form.recipientWallet)) {
      setMessage('Enter a valid recipient wallet address.');
      return;
    }

    try {
      setWallet((prev) => ({ ...prev, sending: true }));
      await ensureBaseChain();
      const value = toWeiHex(form.nativeAmount);
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: wallet.address, to: form.recipientWallet.trim(), value }],
      });
      setForm((prev) => ({
        ...prev,
        txHash: txHash || '',
        tokenAmount: prev.tokenAmount || prev.nativeAmount,
      }));
      await submitRecord(txHash);
    } catch (err) {
      logger.error('Wallet send failed', err);
      setMessage(err?.message || 'Wallet send failed');
    } finally {
      setWallet((prev) => ({ ...prev, sending: false }));
    }
  };

  const handleReverify = async (id) => {
    setReverifyId(id);
    try {
      const response = await apiPost(`/blockchain/transfers/${id}/reverify`, {});
      setMessage(response?.ok ? 'Transfer refreshed from chain.' : `Failed to refresh: ${response?.message || 'Unknown error'}`);
      await loadTransfers();
    } catch (err) {
      setMessage(err.message || 'Failed to refresh transfer');
    } finally {
      setReverifyId('');
    }
  };

  const finalizeTransfer = async (id) => {
    if (!activeRole.canFinalize) {
      setMessage(`${activeRole.label} role is read-only for finalization. Switch to Operator.`);
      return;
    }
    if (wizardMode && wizardStep < 3) {
      setMessage('Wizard lock: move to Step 4 before finalization.');
      return;
    }

    const validation = validateCoreRequired({ requireTxHash: false });
    if (!validation.ok) {
      focusRequiredField(validation.fieldKey, validation.message);
      return;
    }

    setFinalizingId(id);
    try {
      const response = await apiPost(`/blockchain/transfers/${id}/finalize`, {
        signatures: {
          partyOneSignerName: form.partyOneSignerName.trim(),
          partyOneSignerWallet: form.partyOneSignerWallet.trim(),
          partyOneSignedAt: form.partyOneSignedAt || '',
          partyTwoSignerName: form.partyTwoSignerName.trim(),
          partyTwoSignerWallet: form.partyTwoSignerWallet.trim(),
          partyTwoSignedAt: form.partyTwoSignedAt || '',
          witnessName: form.witnessName.trim(),
          witnessWallet: form.witnessWallet.trim(),
          witnessSignedAt: form.witnessSignedAt || '',
        },
        attestation: {
          message: ensureAttestationMessage(),
          partyOneSignature: form.partyOneSignature.trim(),
          partyTwoSignature: form.partyTwoSignature.trim(),
          witnessSignature: form.witnessSignature.trim(),
        },
        finalizationNote: form.finalizationNote.trim(),
      });
      if (!response?.ok) {
        setMessage(response?.message || 'Failed to finalize settlement');
      } else {
        setMessage('Settlement finalized and locked. Future edits are blocked for this transfer.');
        await loadAuditLog(id);
        await loadTransfers();
      }
    } catch (err) {
      setMessage(err.message || 'Failed to finalize settlement');
    } finally {
      setFinalizingId('');
    }
  };

  const verifyIntegrity = async (id) => {
    if (!activeRole.canVerify) {
      setMessage(`${activeRole.label} role cannot verify digest integrity.`);
      return;
    }
    setVerifyingId(id);
    try {
      const response = await apiGet(`/blockchain/transfers/${id}/verify-integrity`);
      if (!response?.ok) {
        setMessage(response?.message || 'Failed to verify digest integrity');
        return;
      }
      const status = response.integrity?.status || 'unknown';
      setIntegrityStatusById((prev) => ({ ...prev, [id]: status }));
      await loadAuditLog(id);
      setMessage(`Integrity check complete: ${status}.`);
      await loadTransfers();
    } catch (err) {
      setMessage(err.message || 'Failed to verify digest integrity');
    } finally {
      setVerifyingId('');
    }
  };

  const openContract = async (id, autoPrint = false) => {
    try {
      const response = await apiGet(`/blockchain/transfers/${id}/contract/render`);
      if (!response?.ok || !response?.html) {
        setMessage(response?.message || 'Failed to render contract');
        return;
      }
      const child = window.open('', '_blank', 'noopener,noreferrer');
      if (!child) {
        setMessage('Pop-up blocked. Allow pop-ups to view/print contract.');
        return;
      }
      child.document.open();
      child.document.write(response.html);
      child.document.close();
      if (autoPrint) {
        setTimeout(() => {
          child.focus();
          child.print();
        }, 350);
      }
      await loadAuditLog(id);
    } catch (err) {
      setMessage(err.message || 'Failed to render contract');
    }
  };

  const exportContractJson = async (id) => {
    try {
      const response = await apiGet(`/blockchain/transfers/${id}/contract`);
      if (!response?.ok || !response?.contract) {
        setMessage(response?.message || 'Failed to export contract JSON');
        return;
      }
      const blob = new Blob([JSON.stringify(response.contract, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement-contract-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await loadAuditLog(id);
    } catch (err) {
      setMessage(err.message || 'Failed to export contract JSON');
    }
  };

  const exportVerificationReportJson = async (id) => {
    try {
      const response = await apiGet(`/blockchain/transfers/${id}/verification-report`);
      if (!response?.ok || !response?.report) {
        setMessage(response?.message || 'Failed to export verification report');
        return;
      }
      const blob = new Blob([JSON.stringify(response.report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement-verification-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await loadAuditLog(id);
    } catch (err) {
      setMessage(err.message || 'Failed to export verification report');
    }
  };

  const openVerificationReport = async (id, autoPrint = false) => {
    try {
      const response = await apiGet(`/blockchain/transfers/${id}/verification-report/render`);
      if (!response?.ok || !response?.html) {
        setMessage(response?.message || 'Failed to render verification report');
        return;
      }
      const child = window.open('', '_blank', 'noopener,noreferrer');
      if (!child) {
        setMessage('Pop-up blocked. Allow pop-ups to view report.');
        return;
      }
      child.document.open();
      child.document.write(response.html);
      child.document.close();
      if (autoPrint) {
        setTimeout(() => {
          child.focus();
          child.print();
        }, 350);
      }
      await loadAuditLog(id);
    } catch (err) {
      setMessage(err.message || 'Failed to render verification report');
    }
  };

  const copyDigest = async (digest) => {
    const value = String(digest || '').trim();
    if (!value) {
      setMessage('No digest available to copy for this settlement.');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Finalization digest copied.');
    } catch {
      setMessage('Could not copy digest. Please copy manually.');
    }
  };

  const applyQuickFillDemo = () => {
    setForm((prev) => ({
      ...prev,
      txHash: prev.txHash || '0xDEMO_SETTLEMENT_HASH_REPLACE_WITH_REAL_TX',
      amountUsd: prev.amountUsd || '1.00',
      partyOneName: prev.partyOneName || 'PVA Bazaar',
      partyOneSignerName: prev.partyOneSignerName || 'Operator Signer',
      partyTwoName: prev.partyTwoName || 'Counterparty',
      partyTwoSignerName: prev.partyTwoSignerName || 'Counterparty Signer',
      note: prev.note || 'Demo settlement workflow record',
      finalizationNote: prev.finalizationNote || 'Demo finalization note for training.',
    }));
    setMessage('Demo values applied. Replace tx hash and names with real values before production finalization.');
  };

  const copyHandoffSummary = async (item) => {
    const integrityStatus = integrityStatusById[item.id] || (item.finalizedAt ? 'not-verified-yet' : 'not-finalized');
    const lines = [
      'PVA Bazaar Settlement Handoff Summary',
      `Transfer ID: ${item.id}`,
      `Status: ${item.status}`,
      `Network: ${item.network}`,
      `Transaction: ${item.txHash}`,
      `Finalized: ${item.finalizedAt ? new Date(item.finalizedAt).toLocaleString() : 'No'}`,
      `Integrity: ${integrityStatus}`,
      `USD Amount: ${Number(item.amountUsd || 0).toFixed(2)}`,
      `Token: ${item.tokenSymbol || ''} ${item.tokenAmount || ''}`,
      `Artifact: ${item.artifactTitle || 'Not linked'}`,
      `Explorer: ${item.explorerUrl || 'N/A'}`,
      'Operator Next Steps: 1) Verify digest. 2) Print contract/report. 3) Archive JSON + signed PDF.',
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      await appendAuditEvent(item.id, 'handoff-summary-copied', {
        status: item.status,
        finalizedAt: item.finalizedAt || null,
      });
      setMessage('Handoff summary copied for ops team.');
    } catch {
      setMessage('Could not copy handoff summary. Please copy manually.');
    }
  };

  const openRunbookCard = () => {
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>PVA Operator Runbook Card</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; color: #102028; padding: 28px; }
      h1 { margin: 0 0 8px; }
      .meta { color: #4c616d; margin-bottom: 12px; font-size: 13px; }
      .panel { border: 1px solid #cfd8dc; border-radius: 8px; padding: 12px; margin-top: 10px; }
      ol, ul { margin: 8px 0 0 20px; }
      li { margin: 4px 0; }
      @media print { body { padding: 16px; } }
    </style>
  </head>
  <body>
    <h1>PVA Bazaar Settlement Runbook Card</h1>
    <div class="meta">Generated ${new Date().toISOString()}</div>

    <div class="panel req">
      <strong>Mandatory Inputs</strong>
      <ul>
        <li>Transaction Hash (0x...)</li>
        <li>Party One Signer Name</li>
        <li>Party Two Signer Name</li>
      </ul>
      <div>Why mandatory: These anchor legal accountability to the on-chain settlement evidence.</div>
    </div>

    <div class="panel opt">
      <strong>Optional But Recommended</strong>
      <ul>
        <li>Signer Wallet Addresses + EIP-191 Signatures</li>
        <li>Artifact linkage, media, reference URL</li>
        <li>Witness details and finalization note</li>
      </ul>
      <div>Why optional: Improves audit confidence and documentation quality but does not block lock.</div>
    </div>

    <div class="panel">
      <strong>Execution Steps</strong>
      <ol>
        <li>Connect wallet and submit/send transaction.</li>
        <li>Record settlement with mandatory fields.</li>
        <li>Finalize and lock record.</li>
        <li>Verify digest integrity.</li>
        <li>Export verification JSON + print report for archive binder.</li>
      </ol>
    </div>
  </body>
</html>`;

    const child = window.open('', '_blank', 'noopener,noreferrer');
    if (!child) {
      setMessage('Pop-up blocked. Allow pop-ups to open runbook card.');
      return;
    }
    child.document.open();
    child.document.write(html);
    child.document.close();
  };

  return (
    <div className="settlement-contracts-tab" role="tabpanel" id="settlements-panel">
      <div className="tab-header">
        <h2>📜 Settlement Contracts</h2>
        <p className="tab-description">
          Execute wallet transfers, link them to artifacts, and generate printable contract receipts for online, PDF, or physical storage.
        </p>
      </div>

      {pendingDraft && !draftDecisionMade ? (
        <div className="draft-banner" role="alert">
          <div>
            Found a saved draft from {pendingDraft.updatedAt ? new Date(pendingDraft.updatedAt).toLocaleString() : 'earlier session'}.
          </div>
          <div className="draft-actions">
            <button className="btn ghost tiny" type="button" onClick={restoreDraft}>Restore Draft</button>
            <button className="btn ghost tiny" type="button" onClick={discardDraft}>Discard Draft</button>
          </div>
        </div>
      ) : null}

      <div className="settlements-help-row">
        <HelpTip
          title="Workflow"
          body="1) Connect wallet and send transfer on Base. 2) Reuse a previous terms template or enter new terms. 3) Record with metadata and artifact linkage. 4) Finalize to lock signer details. 5) Print/save PDF with QR trace links."
          example="Pilot payout: $1.00, artifact linked, finalize with both signer names, print a QR-enabled contract for archive binder."
        />
      </div>

      <div className="workflow-card" role="note" aria-label="Required and optional fields">
        <h4>Before You Submit</h4>
        <p><strong>Required now:</strong> Tx Hash, Party One Signer Name, Party Two Signer Name. These lock legal intent and chain evidence.</p>
        <p><strong>Optional but recommended:</strong> signer wallets + EIP-191 signatures. These prove a wallet attested the text message.</p>
        <p><strong>Optional context:</strong> artifact link, media URL, reference URL, witness info. These improve audit readability but do not block settlement lock.</p>
      </div>

      <div className="mode-toggle-row" role="group" aria-label="Entry mode">
        <button
          className={`btn tiny ${beginnerMode ? 'accent' : 'ghost'}`}
          type="button"
          onClick={() => setBeginnerMode(true)}
        >
          Beginner Mode
        </button>
        <button
          className={`btn tiny ${showAdvanced ? 'accent' : 'ghost'}`}
          type="button"
          onClick={() => setBeginnerMode(false)}
        >
          Advanced Mode
        </button>
        <span className="mode-hint">
          {beginnerMode ? 'Showing only core required inputs + wallet send basics.' : 'Showing full optional legal and attestation controls.'}
        </span>
        <button className="btn ghost tiny" type="button" onClick={applyQuickFillDemo}>Quick Fill Demo</button>
        <button className={`btn tiny ${wizardMode ? 'accent' : 'ghost'}`} type="button" onClick={() => setWizardMode((prev) => !prev)}>
          {wizardMode ? 'Wizard On' : 'Wizard Off'}
        </button>
        <button className="btn ghost tiny" type="button" onClick={openRunbookCard}>Print Runbook Card</button>
        <button className="btn ghost tiny" type="button" onClick={discardDraft}>Clear Saved Draft</button>
        <label className="role-picker">
          Role
          <select value={operationRole} onChange={(e) => setOperationRole(e.target.value)}>
            <option value="operator">Operator</option>
            <option value="reviewer">Reviewer</option>
            <option value="auditor">Auditor</option>
          </select>
        </label>
        <span className="mode-hint">Active role: {activeRole.label}</span>
      </div>

      {wizardMode ? (
        <div className="wizard-card" role="region" aria-label="Guided wizard mode">
          <div className="wizard-header">
            <h4>{wizardSteps[wizardStep].title}</h4>
            <span className={`check-badge ${canCompleteStep(wizardStep) ? 'done' : 'pending'}`}>
              {canCompleteStep(wizardStep) ? 'Ready' : 'Needs Input'}
            </span>
          </div>
          <p>{wizardSteps[wizardStep].description}</p>
          <div className="wizard-actions">
            <button className="btn ghost tiny" type="button" onClick={goWizardBack} disabled={wizardStep === 0}>Back</button>
            <button className="btn ghost tiny" type="button" onClick={goWizardNext} disabled={wizardStep === wizardSteps.length - 1}>Next</button>
          </div>
        </div>
      ) : null}

      <div className="checklist-card" role="region" aria-label="Live settlement checklist">
        <h4>Live Checklist</h4>
        <div className="checklist-items">
          {checklist.map((item, index) => (
            <div key={item.id} className={`checklist-item ${item.done ? 'done' : 'pending'}`}>
              <span className={`check-badge ${item.done ? 'done' : 'pending'}`}>{item.done ? 'Done' : 'Pending'}</span>
              <span className="check-step">Step {index + 1}: {item.label}</span>
            </div>
          ))}
        </div>
        <p className="checklist-next">
          <strong>Next action:</strong> {nextChecklistItem ? nextChecklistItem.hint : 'All steps complete. Export/print verification reports for archive.'}
        </p>
      </div>

      {latestRecord ? (
        <div className="timeline-card" role="region" aria-label="Settlement audit timeline">
          <h4>Audit Timeline</h4>
          <div className="timeline-grid">
            <div><strong>Recorded:</strong> {latestRecord?.createdAt ? new Date(latestRecord.createdAt).toLocaleString() : 'N/A'}</div>
            <div><strong>Finalized:</strong> {latestRecord?.finalizedAt ? new Date(latestRecord.finalizedAt).toLocaleString() : 'Not finalized'}</div>
            <div><strong>Chain Refresh:</strong> {latestRecord?.lastCheckedAt ? new Date(latestRecord.lastCheckedAt).toLocaleString() : 'N/A'}</div>
            <div><strong>Audit Feed:</strong> {auditLog.loading ? 'Refreshing...' : `${filteredTimelineEntries.length}/${timelineEntries.length} events`}</div>
          </div>
          <div className="timeline-filters" aria-label="Audit timeline filters">
            <label>
              Role
              <select value={timelineRoleFilter} onChange={(e) => setTimelineRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                {timelineRoleOptions.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
            <label>
              Event Type
              <select value={timelineTypeFilter} onChange={(e) => setTimelineTypeFilter(e.target.value)}>
                <option value="all">All event types</option>
                {timelineTypeOptions.map((type) => (
                  <option key={type} value={type}>{AUDIT_EVENT_LABELS[type] || type}</option>
                ))}
              </select>
            </label>
            <button
              className="btn ghost tiny"
              type="button"
              onClick={() => {
                setTimelineRoleFilter('all');
                setTimelineTypeFilter('all');
              }}
            >
              Clear Filters
            </button>
          </div>
          <div className="timeline-list" role="list" aria-label="Settlement audit events">
            {filteredTimelineEntries.slice(0, 8).map((entry) => (
              <div key={entry.key} className="timeline-item" role="listitem">
                <div className="timeline-item-head">
                  <strong>{entry.title}</strong>
                  <span>{entry.when ? new Date(entry.when).toLocaleString() : 'No timestamp'}</span>
                </div>
                <div className="timeline-item-role">Role: {entry.actorRole || 'system'}</div>
                {entry.details && typeof entry.details === 'object' ? (
                  <div className="timeline-item-meta">
                    {Object.entries(entry.details)
                      .slice(0, 3)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(' | ')}
                  </div>
                ) : null}
              </div>
            ))}
            {!auditLog.loading && filteredTimelineEntries.length === 0 ? (
              <div className="timeline-empty">No events match current filters.</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="settlement-form-card">
        <div className="wallet-actions-row">
          <button className="btn primary" type="button" onClick={connectWallet} disabled={wallet.connecting || wallet.sending}>
            {wallet.connecting ? 'Connecting...' : wallet.address ? 'Wallet Connected' : 'Connect Wallet'}
          </button>
          <button className="btn accent" type="button" onClick={handleWalletSendAndRecord} disabled={wallet.sending || !wallet.address || !activeRole.canWalletSend}>
            {wallet.sending ? 'Sending...' : 'Send On Base + Record'}
          </button>
          {wallet.address ? <span className="wallet-chip">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} {wallet.chainId ? `· ${wallet.chainId}` : ''}</span> : null}
        </div>

        <div className="settlement-grid">
          <label className="full-row">
            Reuse Prior Terms Template
            <div className="template-row">
              <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                <option value="">Select template</option>
                {templates.data.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button className="btn ghost tiny" type="button" onClick={applyTemplate} disabled={!selectedTemplateId || templates.loading}>
                Apply
              </button>
              <button className="btn ghost tiny" type="button" onClick={loadTemplates} disabled={templates.loading}>
                {templates.loading ? 'Loading...' : 'Refresh Templates'}
              </button>
            </div>
            {templates.error ? <small className="error-text">{templates.error}</small> : null}
          </label>

          {showWizardStep(0) ? (
            <label>
              Network
              <select value={form.network} onChange={(e) => setForm((prev) => ({ ...prev, network: e.target.value }))}>
                <option value="base">Base</option>
                <option value="base-sepolia">Base Sepolia</option>
                <option value="ethereum">Ethereum</option>
                <option value="sepolia">Sepolia</option>
                <option value="polygon">Polygon</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="optimism">Optimism</option>
              </select>
            </label>
          ) : null}

          {showWizardStep(0) ? (
            <label>
              Recipient Wallet
              <input value={form.recipientWallet} onChange={(e) => setForm((prev) => ({ ...prev, recipientWallet: e.target.value }))} placeholder="0x..." />
            </label>
          ) : null}

          {showWizardStep(0) ? (
            <label>
              Native Amount (ETH)
              <input value={form.nativeAmount} onChange={(e) => setForm((prev) => ({ ...prev, nativeAmount: e.target.value }))} placeholder="0.0003" />
            </label>
          ) : null}

          {showAdvanced && showWizardStep(0) ? (
            <>
              <label>
                USD Amount
                <input type="number" min="0" step="0.01" value={form.amountUsd} onChange={(e) => setForm((prev) => ({ ...prev, amountUsd: e.target.value }))} />
              </label>

              <label>
                Token Symbol
                <input value={form.tokenSymbol} onChange={(e) => setForm((prev) => ({ ...prev, tokenSymbol: e.target.value }))} />
              </label>

              <label>
                Token Amount
                <input value={form.tokenAmount} onChange={(e) => setForm((prev) => ({ ...prev, tokenAmount: e.target.value }))} placeholder="1.0" />
              </label>
            </>
          ) : null}

          {showWizardStep(0) ? (
            <label className="full-row">
            Tx Hash <span className="required-badge">Required</span>
            <input
              ref={txHashRef}
              className={requiredErrors.txHash ? 'field-required-error' : ''}
              value={form.txHash}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, txHash: value }));
                if (requiredErrors.txHash && String(value || '').trim()) {
                  setRequiredErrors((prev) => ({ ...prev, txHash: false }));
                }
              }}
              placeholder="0x..."
            />
            <small>Why required: anchors the settlement to a specific on-chain transaction for traceability.</small>
            </label>
          ) : null}

          {showAdvanced && showWizardStep(2) ? (
            <>
              <label className="full-row">
                Artifact Search
                <input value={artifactQuery} onChange={(e) => setArtifactQuery(e.target.value)} placeholder="Search artifact by title/slug" />
              </label>

              <label className="full-row">
                Link Artifact
                <select value={form.artifactId} onChange={(e) => setForm((prev) => ({ ...prev, artifactId: e.target.value }))}>
                  <option value="">No artifact linked</option>
                  {artifacts.data.map((item) => (
                    <option key={item._id} value={item._id}>{item.title || item.name} {item.slug ? `(${item.slug})` : ''}</option>
                  ))}
                </select>
                {artifacts.loading ? <small>Loading artifacts...</small> : null}
                {selectedArtifact ? <small>Linked: {selectedArtifact.title || selectedArtifact.name}</small> : null}
              </label>

              <label className="full-row">
                Settlement Note
                <textarea rows="2" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Describe what this settlement covers" />
              </label>

              <label className="full-row">
                Media URL
                <input value={form.mediaUrl} onChange={(e) => setForm((prev) => ({ ...prev, mediaUrl: e.target.value }))} placeholder="https://..." />
              </label>

              <label className="full-row">
                Reference URL
                <input value={form.referenceUrl} onChange={(e) => setForm((prev) => ({ ...prev, referenceUrl: e.target.value }))} placeholder="https://..." />
              </label>
            </>
          ) : null}

          {showWizardStep(1) ? (
            <label>
            Party One Name
            <input value={form.partyOneName} onChange={(e) => setForm((prev) => ({ ...prev, partyOneName: e.target.value }))} placeholder="PVA Bazaar" />
            </label>
          ) : null}

          {showAdvanced && showWizardStep(2) ? (
            <label>
              Party One Role
              <input value={form.partyOneRole} onChange={(e) => setForm((prev) => ({ ...prev, partyOneRole: e.target.value }))} placeholder="Operator" />
            </label>
          ) : null}

          {showWizardStep(1) ? (
            <label>
            Party Two Name
            <input value={form.partyTwoName} onChange={(e) => setForm((prev) => ({ ...prev, partyTwoName: e.target.value }))} placeholder="Counterparty Name" />
            </label>
          ) : null}

          {showAdvanced && showWizardStep(2) ? (
            <>
              <label>
                Party Two Role
                <input value={form.partyTwoRole} onChange={(e) => setForm((prev) => ({ ...prev, partyTwoRole: e.target.value }))} placeholder="Creator / Buyer / Seller" />
              </label>

              <label className="full-row">
                Additional Clauses (Contract v2)
                <textarea
                  rows="4"
                  value={form.additionalClauses}
                  onChange={(e) => setForm((prev) => ({ ...prev, additionalClauses: e.target.value }))}
                  placeholder="Write any additional terms to appear on the printable contract"
                />
              </label>
            </>
          ) : null}

          {showWizardStep(1) ? (
            <label>
            Party One Signer Name <span className="required-badge">Required</span>
            <input
              ref={partyOneSignerNameRef}
              className={requiredErrors.partyOneSignerName ? 'field-required-error' : ''}
              value={form.partyOneSignerName}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, partyOneSignerName: value }));
                if (requiredErrors.partyOneSignerName && String(value || '').trim()) {
                  setRequiredErrors((prev) => ({ ...prev, partyOneSignerName: false }));
                }
              }}
              placeholder="Signer full name"
            />
            <small>Why required: identifies who approved terms for party one.</small>
            </label>
          ) : null}

          {showAdvanced && showWizardStep(2) ? (
            <label>
              Party One Signer Wallet (Optional)
              <input value={form.partyOneSignerWallet} onChange={(e) => setForm((prev) => ({ ...prev, partyOneSignerWallet: e.target.value }))} placeholder="0x..." />
            </label>
          ) : null}

          {showAdvanced && showWizardStep(2) ? (
            <label>
              Party One Signed At
              <input type="datetime-local" value={form.partyOneSignedAt} onChange={(e) => setForm((prev) => ({ ...prev, partyOneSignedAt: e.target.value }))} />
            </label>
          ) : null}

          {showWizardStep(1) ? (
            <label>
            Party Two Signer Name <span className="required-badge">Required</span>
            <input
              ref={partyTwoSignerNameRef}
              className={requiredErrors.partyTwoSignerName ? 'field-required-error' : ''}
              value={form.partyTwoSignerName}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, partyTwoSignerName: value }));
                if (requiredErrors.partyTwoSignerName && String(value || '').trim()) {
                  setRequiredErrors((prev) => ({ ...prev, partyTwoSignerName: false }));
                }
              }}
              placeholder="Signer full name"
            />
            <small>Why required: identifies who approved terms for party two.</small>
            </label>
          ) : null}

          {showAdvanced && showWizardStep(2) ? (
            <>
              <label>
                Party Two Signer Wallet (Optional)
                <input value={form.partyTwoSignerWallet} onChange={(e) => setForm((prev) => ({ ...prev, partyTwoSignerWallet: e.target.value }))} placeholder="0x..." />
              </label>

              <label>
                Party Two Signed At
                <input type="datetime-local" value={form.partyTwoSignedAt} onChange={(e) => setForm((prev) => ({ ...prev, partyTwoSignedAt: e.target.value }))} />
              </label>

              <label>
                Witness Name (optional)
                <input value={form.witnessName} onChange={(e) => setForm((prev) => ({ ...prev, witnessName: e.target.value }))} placeholder="Witness full name" />
              </label>

              <label>
                Witness Wallet (Optional)
                <input value={form.witnessWallet} onChange={(e) => setForm((prev) => ({ ...prev, witnessWallet: e.target.value }))} placeholder="0x..." />
              </label>

              <label>
                Witness Signed At (optional)
                <input type="datetime-local" value={form.witnessSignedAt} onChange={(e) => setForm((prev) => ({ ...prev, witnessSignedAt: e.target.value }))} />
              </label>

              <label className="full-row">
                Finalization Note
                <textarea
                  rows="2"
                  value={form.finalizationNote}
                  onChange={(e) => setForm((prev) => ({ ...prev, finalizationNote: e.target.value }))}
                  placeholder="Optional note recorded when contract is finalized"
                />
              </label>

              <label className="full-row">
                EIP-191 Attestation Message (Optional but recommended)
                <textarea
                  rows="3"
                  value={form.attestationMessage}
                  onChange={(e) => setForm((prev) => ({ ...prev, attestationMessage: e.target.value }))}
                  placeholder="If empty, the app auto-generates a standard message during finalization"
                />
              </label>

              <label className="full-row">
                Wallet Attestation Signatures (Optional)
                <div className="attestation-actions">
                  <select value={signingRole} onChange={(e) => setSigningRole(e.target.value)}>
                    <option value="partyOne">Sign as Party One</option>
                    <option value="partyTwo">Sign as Party Two</option>
                    <option value="witness">Sign as Witness</option>
                  </select>
                  <button className="btn ghost tiny" type="button" onClick={() => setForm((prev) => ({ ...prev, attestationMessage: buildDefaultAttestationMessage() }))}>
                    Generate Suggested Message
                  </button>
                  <button className="btn ghost tiny" type="button" onClick={signConnectedWallet} disabled={!wallet.address || signingWallet}>
                    {signingWallet ? 'Signing...' : 'Sign With Connected Wallet'}
                  </button>
                </div>
                <small>Why this helps: signatures let auditors cryptographically verify wallet-holder consent, not just typed names.</small>
              </label>

              <label className="full-row">
                Party One EIP-191 Signature (Optional)
                <textarea rows="2" value={form.partyOneSignature} onChange={(e) => setForm((prev) => ({ ...prev, partyOneSignature: e.target.value }))} placeholder="0x..." />
              </label>

              <label className="full-row">
                Party Two EIP-191 Signature (Optional)
                <textarea rows="2" value={form.partyTwoSignature} onChange={(e) => setForm((prev) => ({ ...prev, partyTwoSignature: e.target.value }))} placeholder="0x..." />
              </label>

              <label className="full-row">
                Witness EIP-191 Signature (Optional)
                <textarea rows="2" value={form.witnessSignature} onChange={(e) => setForm((prev) => ({ ...prev, witnessSignature: e.target.value }))} placeholder="0x..." />
              </label>
            </>
          ) : null}
        </div>

        <div className="manual-submit-row">
          <button className="btn secondary" type="button" onClick={() => submitRecord()} disabled={submitting || !activeRole.canRecord || (wizardMode && wizardStep < 1)}>
            {submitting ? <LoadingDots inline={true} label="Recording..." /> : 'Record Existing Tx Hash'}
          </button>
        </div>
      </div>

      {message ? <div className="status-message">{message}</div> : null}
      {records.error ? <div className="status-message error">{records.error}</div> : null}

      <div className="records-card">
        <div className="records-header">
          <h3>Tracked Settlements</h3>
          <button className="btn ghost" type="button" onClick={loadTransfers}>Refresh</button>
        </div>

        {records.loading ? (
          <LoadingSpinner size="small" />
        ) : records.data.length === 0 ? (
          <p className="empty">No settlement records yet.</p>
        ) : (
          <div className="records-list">
            {records.data.map((item) => (
              <div key={item.id} className="record-item">
                <div className="record-top">
                  <span className={`chip status-${item.status}`}>{item.status}</span>
                  <span className="chip network">{item.network}</span>
                  {item.isFinalized ? <span className="chip finalized">Finalized</span> : null}
                  {integrityStatusById[item.id] ? <span className={`chip integrity-${integrityStatusById[item.id]}`}>Digest: {integrityStatusById[item.id]}</span> : null}
                  <button className="btn ghost tiny" type="button" onClick={() => handleReverify(item.id)} disabled={reverifyId === item.id}>
                    {reverifyId === item.id ? 'Checking...' : 'Re-verify'}
                  </button>
                  <button className="btn ghost tiny" type="button" onClick={() => verifyIntegrity(item.id)} disabled={verifyingId === item.id}>
                    {verifyingId === item.id ? 'Verifying...' : 'Verify Digest'}
                  </button>
                  <button
                    className="btn ghost tiny"
                    type="button"
                    onClick={() => finalizeTransfer(item.id)}
                    disabled={item.isFinalized || finalizingId === item.id || !activeRole.canFinalize || (wizardMode && wizardStep < 3)}
                  >
                    {item.isFinalized ? 'Locked' : finalizingId === item.id ? 'Finalizing...' : 'Finalize & Lock'}
                  </button>
                </div>

                <div className="record-meta">
                  <span><strong>USD:</strong> ${Number(item.amountUsd || 0).toFixed(2)}</span>
                  <span><strong>Token:</strong> {item.tokenSymbol} {item.tokenAmount || ''}</span>
                  {item.artifactTitle ? <span><strong>Artifact:</strong> {item.artifactTitle}</span> : null}
                  {item.finalizedAt ? <span><strong>Finalized:</strong> {new Date(item.finalizedAt).toLocaleString()}</span> : null}
                </div>

                {item.finalizationDigest ? (
                  <div className="digest-row">
                    <span className="digest-text"><strong>Digest:</strong> {item.finalizationDigest}</span>
                    <button className="btn ghost tiny" type="button" onClick={() => copyDigest(item.finalizationDigest)}>Copy Digest</button>
                  </div>
                ) : null}

                <div className="record-links">
                  {item.explorerUrl ? <a href={item.explorerUrl} target="_blank" rel="noopener noreferrer">Explorer</a> : null}
                  {item.mediaUrl ? <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer">Media</a> : null}
                  {item.referenceUrl ? <a href={item.referenceUrl} target="_blank" rel="noopener noreferrer">Reference</a> : null}
                  <button className="btn ghost tiny" type="button" onClick={() => openContract(item.id, false)}>View Contract</button>
                  <button className="btn ghost tiny" type="button" onClick={() => openContract(item.id, true)}>Print / Save PDF</button>
                  <button className="btn ghost tiny" type="button" onClick={() => exportContractJson(item.id)}>Export JSON</button>
                  <button className="btn ghost tiny" type="button" onClick={() => exportVerificationReportJson(item.id)}>Export Verification JSON</button>
                  <button className="btn ghost tiny" type="button" onClick={() => openVerificationReport(item.id, true)}>Print Verification Report</button>
                  <button className="btn ghost tiny" type="button" onClick={() => copyHandoffSummary(item)}>Copy Handoff Summary</button>
                </div>

                {item.note ? <p className="record-note">{item.note}</p> : null}
                <p className="hash">{item.txHash}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
