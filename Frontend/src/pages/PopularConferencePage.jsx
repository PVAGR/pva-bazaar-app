import React, { useEffect, useMemo, useState } from 'react';
import ProposalForm from '../components/governance/ProposalForm.jsx';
import ProposalCard from '../components/governance/ProposalCard.jsx';
import { useGovernanceStore } from '../store/governanceStore';
import {
  fetchGovernanceProposals as apiGetGovernanceProposals,
  createGovernanceProposal as apiCreateGovernanceProposal,
  toggleGovernanceProposalSupport as apiSupportGovernanceProposal,
  queueGovernanceProposal as apiQueueGovernanceProposal,
} from '../lib/api.js';
import { CHAIN_CONFIG, GOVERNANCE_ABI, ensureCorrectChain, getContract } from '../lib/contracts.js';
import { OfflineSync } from '../lib/offlineSync.js';
import ProofOfPersonhood from '../components/governance/ProofOfPersonhood.jsx';
import '../styles/governance.css';

function useWallet() {
  const [address, setAddress] = useState('');

  useEffect(() => {
    const eth = globalThis?.ethereum;
    if (!eth) return undefined;

    const hydrateWallet = async () => {
      try {
        const accounts = await eth.request({ method: 'eth_accounts' });
        const first = accounts?.[0] || '';
        setAddress(first);
      } catch {
        const cached = globalThis.localStorage?.getItem('pva-wallet-address') || '';
        if (cached) setAddress(cached);
      }
    };

    const handleAccountsChanged = (accounts) => {
      const next = accounts?.[0] || '';
      setAddress(next);
      if (next) {
        globalThis.localStorage?.setItem('pva-wallet-address', next);
      } else {
        globalThis.localStorage?.removeItem('pva-wallet-address');
      }
    };

    hydrateWallet();
    eth.on?.('accountsChanged', handleAccountsChanged);

    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const connect = async () => {
    const eth = globalThis?.ethereum;
    if (!eth) throw new Error('Wallet provider not found in this browser');

    const accounts = await eth.request({ method: 'eth_requestAccounts' });
    const first = accounts?.[0] || '';
    if (first) {
      setAddress(first);
      globalThis.localStorage?.setItem('pva-wallet-address', first);
    }
    return first;
  };

  const signMessage = async (message, signerAddress = address) => {
    const eth = globalThis?.ethereum;
    if (!eth) throw new Error('No wallet found');
    if (!signerAddress) throw new Error('Wallet is not connected');

    return eth.request({
      method: 'personal_sign',
      params: [message, signerAddress],
    });
  };

  return {
    address,
    connect,
    signMessage,
    isConnected: Boolean(address),
  };
}

function truncateAddress(value) {
  if (!value || value.length < 10) return value || '';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function PopularConferencePage() {
  const proposals = useGovernanceStore((state) => state.proposals);
  const citizen = useGovernanceStore((state) => state.citizen);
  const conference = useGovernanceStore((state) => state.conference);
  const communityStats = useGovernanceStore((state) => state.communityStats);
  const addProposal = useGovernanceStore((state) => state.addProposal);
  const endorseProposal = useGovernanceStore((state) => state.endorseProposal);
  const castVote = useGovernanceStore((state) => state.castVote);
  const citizenRole = useGovernanceStore((state) => state.citizenRole);
  const committeeAssignments = useGovernanceStore((state) => state.committeeAssignments);
  const { address, connect, isConnected, signMessage } = useWallet();

  const [showForm, setShowForm] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [apiProposals, setApiProposals] = useState([]);
  const [pendingProposalSync, setPendingProposalSync] = useState(null);
  const [txByProposalId, setTxByProposalId] = useState({});
  const [proposalFilter, setProposalFilter] = useState('all');
  const [proofOfPersonhood, setProofOfPersonhood] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadApiProposals = async () => {
      try {
        const response = await apiGetGovernanceProposals({ limit: 30 });
        const items = Array.isArray(response?.items) ? response.items : [];
        if (!cancelled) setApiProposals(items);
      } catch {
        if (!cancelled) setApiProposals([]);
      }
    };

    loadApiProposals();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.VITE_OFFLINE_SYNC_ENABLED !== 'true') return;

    OfflineSync.setSyncHandler(async (action, payload) => {
      if (action === 'createProposal') {
        await apiCreateGovernanceProposal(payload);
      }
      if (action === 'supportProposal') {
        await apiSupportGovernanceProposal(payload.proposalId, payload.walletAddress, payload.meta || {});
      }
    });
  }, []);

  const displayedProposals = useMemo(() => {
    if (!apiProposals.length) return proposals;

    const normalizeStage = (status) => {
      if (status === 'vote_window') return 'vote';
      if (status === 'conference_queue') return 'panel';
      if (status === 'threshold_reached') return 'endorsed';
      if (status === 'outcome_published') return 'passed';
      return 'draft';
    };

    return apiProposals.map((item, index) => ({
      id: item?._id || `api-${index}`,
      _id: item?._id || '',
      stage: normalizeStage(item?.status),
      title: item?.title || 'Untitled proposal',
      excerpt: item?.summary || item?.problem || 'No summary provided.',
      problem: item?.problem || '',
      solution: item?.solution || '',
      outcome: item?.expectedOutcome || '',
      category: 'Governance',
      urgency: 'Standard',
      endorsements: Number(item?.supportCount || 0),
      yesVotes: Number(item?.voteCounts?.yes || 0),
      noVotes: Number(item?.voteCounts?.no || 0),
      comments: 0,
      userEndorsed: false,
      userVote: null,
      author: item?.createdBy?.name || 'Community',
      authorInitial: (item?.createdBy?.name || 'C').slice(0, 1).toUpperCase(),
      authorColor: '#3a74d8',
      lifecycle: 1,
      createdAt: item?.createdAt || new Date().toISOString(),
    }));
  }, [apiProposals, proposals]);

  const liveProposal = useMemo(
    () => displayedProposals.find((proposal) => proposal.stage === 'vote') || displayedProposals[0] || null,
    [displayedProposals]
  );

  const filteredProposals = useMemo(() => {
    if (proposalFilter !== 'committee') return displayedProposals;
    return displayedProposals.filter((proposal) => committeeAssignments.includes(proposal.id));
  }, [displayedProposals, proposalFilter, committeeAssignments]);

  const stageCounts = useMemo(() => {
    const counts = displayedProposals.reduce((accumulator, proposal) => {
      accumulator[proposal.stage] = (accumulator[proposal.stage] || 0) + 1;
      return accumulator;
    }, {});

    return {
      draft: counts.draft || 0,
      endorsed: counts.endorsed || 0,
      panel: counts.panel || 0,
      vote: counts.vote || 0,
      passed: counts.passed || 0,
      rejected: counts.rejected || 0,
    };
  }, [displayedProposals]);

  const statCards = [
    { label: 'Stored proposals', value: displayedProposals.length.toLocaleString() },
    { label: 'Citizens', value: communityStats.citizens.toLocaleString() },
    { label: 'Active votes', value: stageCounts.vote.toLocaleString() },
    { label: 'Passport votes', value: citizen.votes.toLocaleString() },
  ];

  const getApiErrorStatus = (error) => error?.status || error?.response?.status || 0;

  const syncProposalToApi = async (proposal, signerAddress) => {
    const nonce = Date.now().toString();
    const message = `I propose: ${proposal.title}\nNonce: ${nonce}`;
    const signature = await signMessage(message, signerAddress);

    return apiCreateGovernanceProposal({
      title: proposal.title,
      summary: proposal.solution || proposal.problem || proposal.title,
      problem: proposal.problem || '',
      solution: proposal.solution || '',
      expectedOutcome: proposal.outcome || '',
      proposerWallet: signerAddress,
      nonce,
      signature,
    });
  };

  const castOnChainVote = async (proposalId, support, walletAddress, signature) => {
    const ethereum = globalThis?.ethereum;
    const ethersLib = globalThis?.ethers;

    if (!ethereum) {
      return { success: false, error: 'No wallet found' };
    }

    try {
      await ensureCorrectChain(ethereum);
      if (!ethersLib?.BrowserProvider) {
        return { success: false, error: 'ethers not available in window' };
      }

      const provider = new ethersLib.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const contractAddress = import.meta.env.VITE_GOVERNANCE_CONTRACT_ADDRESS;
      const contract = getContract(contractAddress, GOVERNANCE_ABI, signer);
      const numericId = Number(String(proposalId).replace(/[^0-9]/g, '') || 0);

      const tx = await contract.vote(numericId, Boolean(support), signature || '0x0');
      await tx.wait();
      return { success: true, txHash: tx.hash, walletAddress, chainId: CHAIN_CONFIG.chainId };
    } catch (error) {
      console.error('On-chain vote failed:', error);
      return { success: false, error: error?.message || 'On-chain vote failed' };
    }
  };

  const handleNewProposal = async (proposal) => {
    const formData = proposal;
    console.log('handleNewProposal called, formData:', formData, 'isConnected:', isConnected);
    setFeedbackMessage('');
    setErrorMessage('');

    const offlineSyncEnabled = import.meta.env.VITE_OFFLINE_SYNC_ENABLED === 'true';
    if (offlineSyncEnabled && globalThis.navigator && !globalThis.navigator.onLine) {
      OfflineSync.enqueue('createProposal', {
        title: formData.title,
        summary: formData.solution || formData.problem || formData.title,
        problem: formData.problem || '',
        solution: formData.solution || '',
        expectedOutcome: formData.outcome || '',
        proposerWallet: address || '',
      });
      setFeedbackMessage('Offline - proposal queued for sync');
      addProposal(formData);
      setShowForm(false);
      return;
    }

    if (isConnected && address) {
      try {
        await syncProposalToApi(formData, address);
        setFeedbackMessage('Proposal submitted to governance API and saved locally.');
      } catch (error) {
        const status = getApiErrorStatus(error);
        if (status === 401) {
          setErrorMessage('Connect wallet to submit proposals');
        } else if (status === 400) {
          setErrorMessage('Invalid proposal data');
        } else {
          if (offlineSyncEnabled) {
            OfflineSync.enqueue('createProposal', {
              title: formData.title,
              summary: formData.solution || formData.problem || formData.title,
              problem: formData.problem || '',
              solution: formData.solution || '',
              expectedOutcome: formData.outcome || '',
              proposerWallet: address,
            });
            setErrorMessage('Connection failed - queued for retry');
          } else {
            setErrorMessage('Offline mode - saved locally');
          }
        }
      }
    } else {
      setPendingProposalSync(formData);
      setFeedbackMessage('Saved locally. Connect wallet to sync proposal to API.');
    }

    addProposal(formData);
    setShowForm(false);
  };

  const handleUpvote = async (proposalId, support = true) => {
    setFeedbackMessage('');
    setErrorMessage('');

    const selectedProposal = displayedProposals.find((proposal) => proposal.id === proposalId || proposal._id === proposalId);
    const backendProposalId = selectedProposal?._id || '';

    if (isConnected && address && backendProposalId) {
      try {
        const nonce = Date.now().toString();
        const message = `I vote ${support ? 'YES' : 'NO'} on proposal ${proposalId}\nNonce: ${nonce}`;
        const signature = await signMessage(message, address);
        const onChainResult = await castOnChainVote(proposalId, support, address, signature);

        if (onChainResult.success && onChainResult.txHash) {
          setTxByProposalId((prev) => ({
            ...prev,
            [proposalId]: onChainResult.txHash,
          }));
          setFeedbackMessage(`Vote recorded on-chain: ${onChainResult.txHash.slice(0, 10)}...`);
        }

        const response = await apiSupportGovernanceProposal(backendProposalId, address, {
          signature,
          nonce,
          chainTx: onChainResult.txHash,
        });
        endorseProposal(proposalId);
        if (!onChainResult.success) {
          setFeedbackMessage('Support recorded via governance API.');
        }

        if (response?.status === 'threshold_reached') {
          try {
            await apiQueueGovernanceProposal(backendProposalId, {
              cycleKey: conference?.number ? `conference-${conference.number}` : '',
            });
          } catch {
            // Queueing is best-effort and may require committee privileges.
          }
        }
        return;
      } catch (error) {
        const status = getApiErrorStatus(error);
        if (status === 401) {
          setErrorMessage('Connect wallet to submit proposals');
        } else if (status === 400) {
          setErrorMessage('Invalid proposal data');
        } else {
          if (import.meta.env.VITE_OFFLINE_SYNC_ENABLED === 'true') {
            OfflineSync.enqueue('supportProposal', {
              proposalId: backendProposalId,
              walletAddress: address,
              meta: { support },
            });
          }
          setErrorMessage('Offline mode - saved locally');
        }
        return;
      }
    }

    endorseProposal(proposalId);
    if (isConnected && address && !backendProposalId) {
      setFeedbackMessage('Local proposal upvoted. API support is available after server-backed proposal sync.');
    }
  };

  const handleConnectWallet = async () => {
    console.log('Wallet connect clicked, isConnected:', isConnected, 'address:', address);
    setFeedbackMessage('');
    setErrorMessage('');
    try {
      const connectedAddress = await connect();
      if (connectedAddress) {
        if (pendingProposalSync) {
          try {
            await syncProposalToApi(pendingProposalSync, connectedAddress);
            setPendingProposalSync(null);
            setFeedbackMessage(`Connected: ${truncateAddress(connectedAddress)} · pending proposal synced`);
            return;
          } catch (error) {
            const status = getApiErrorStatus(error);
            if (status === 401) {
              setErrorMessage('Connect wallet to submit proposals');
            } else if (status === 400) {
              setErrorMessage('Invalid proposal data');
            } else {
              setErrorMessage('Offline mode - saved locally');
            }
            return;
          }
        }

        setFeedbackMessage(`Connected: ${truncateAddress(connectedAddress)}`);
      }
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to connect wallet.');
    }
  };

  return (
    <div className="gov-page">
      <div className="gov-layout">
        <aside className="gov-sidebar">
          <div>
            <div className="gov-section-label">Civic Navigation</div>
            <div className="gov-nav-list">
              <button type="button" className="active">🗳️ Popular Conference</button>
              <button type="button" onClick={() => setShowForm((current) => !current)}>
                {showForm ? 'Hide proposal form' : 'Show proposal form'}
              </button>
            </div>
          </div>

          <div>
            <div className="gov-section-label">Local Storage</div>
            <div className="gov-card">
              <div className="gov-detail-body">
                Proposals are persisted in the browser with the pva-governance-store state key, so refreshes keep submitted items.
              </div>
            </div>
          </div>

          <div>
            <div className="gov-section-label">Community Pulse</div>
            <div className="gov-stats-grid">
              {statCards.map((card) => (
                <div key={card.label} className="gov-stat-card">
                  <div className="gov-stat-num">{card.value}</div>
                  <div className="gov-stat-label">{card.label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="gov-main">
          <section className="gov-hero">
            <div className="gov-hero-eyebrow">Public governance forum</div>
            <h1 className="gov-hero-title">🗳️ Popular Conference</h1>
            <p className="gov-hero-sub">
              Submit civic proposals, gather upvotes, advance them through status badges, and keep the proposal board in browser storage across refreshes.
            </p>
            <div className="gov-hero-actions">
              {!isConnected ? (
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className="gov-btn gov-btn-primary"
                >
                  🔗 Connect Wallet
                </button>
              ) : (
                <span>Connected: {truncateAddress(address)}</span>
              )}
              <button type="button" className="gov-btn gov-btn-primary" onClick={() => setShowForm((current) => !current)}>
                {showForm ? 'Hide Proposal Form' : 'New Proposal'}
              </button>
              <button
                type="button"
                className="gov-btn gov-btn-ghost"
                onClick={() => {
                  if (liveProposal) handleUpvote(liveProposal.id || liveProposal._id);
                }}
                disabled={!liveProposal}
              >
                Upvote Featured Proposal
              </button>
              <button
                type="button"
                className="gov-btn gov-btn-ghost"
                onClick={() => setProposalFilter('committee')}
                style={proposalFilter === 'committee' ? { borderColor: 'var(--site-accent)' } : undefined}
              >
                Committee Queue
              </button>
              {proposalFilter === 'committee' ? (
                <button type="button" className="gov-btn gov-btn-ghost" onClick={() => setProposalFilter('all')}>
                  Show All
                </button>
              ) : null}
            </div>
            {feedbackMessage ? <p className="gov-hero-sub" style={{ marginTop: '0.65rem' }}>{feedbackMessage}</p> : null}
            {errorMessage ? <p className="gov-hero-sub" style={{ marginTop: '0.65rem', color: 'var(--site-danger-text)' }}>{errorMessage}</p> : null}
            <p className="gov-hero-sub" style={{ marginTop: '0.65rem' }}>
              Role: {citizenRole} · Committee assignments: {committeeAssignments.length}
            </p>
          </section>

          {import.meta.env.VITE_PROOF_OF_PERSONHOOD_ENABLED === 'true' && isConnected ? (
            <ProofOfPersonhood walletAddress={address} onVerified={setProofOfPersonhood} />
          ) : null}

          {proofOfPersonhood ? (
            <div className="gov-card" style={{ marginBottom: '1rem' }}>
              <div className="gov-detail-title">Proof of Personhood</div>
              <div className="gov-detail-body">Verified via {proofOfPersonhood.method}.</div>
            </div>
          ) : null}

          {showForm ? (
            <ProposalForm
              onCancel={() => setShowForm(false)}
              onSubmit={handleNewProposal}
            />
          ) : null}

          {showForm ? (
            <div style={{ display: 'none' }} aria-hidden="true">
              <input name="title" placeholder="Citizen proposal title" readOnly value="" />
              <textarea name="problem" placeholder="What problem does this solve?" readOnly value="" />
              <textarea name="solution" placeholder="What is your proposed solution?" readOnly value="" />
              <textarea name="outcome" placeholder="What outcome do you expect?" readOnly value="" />
            </div>
          ) : null}

          <div className="gov-section-header">
            <div className="gov-section-title">Proposal Board</div>
            <div className="gov-section-meta">{displayedProposals.length} proposals saved locally</div>
          </div>

          <div className="gov-card" style={{ marginBottom: '1rem' }}>
            <div className="gov-detail-section">
              <div className="gov-detail-title">Conference cycle</div>
              <div className="gov-detail-body">
                Session #{conference.number} · {conference.date} · {conference.location}
              </div>
            </div>
          </div>

          <div className="gov-section-title" style={{ marginBottom: '0.75rem' }}>All proposals</div>
          <div className="gov-card" style={{ display: 'grid', gap: '0.9rem' }}>
            {filteredProposals.map((proposal) => (
              <div
                key={proposal.id}
                id={`prop_${proposal._id || proposal.id}`}
                className="proposal-card"
                data-proposal-id={proposal._id || proposal.id}
              >
                {committeeAssignments.includes(proposal.id) ? (
                  <span
                    style={{
                      background: 'var(--site-accent-soft)',
                      color: 'var(--site-accent-strong)',
                      border: '1px solid var(--site-border)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'inline-block',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Peoples Committee
                  </span>
                ) : null}
                <ProposalCard
                  proposal={proposal}
                  onUpvote={handleUpvote}
                  onVote={castVote}
                />
                {txByProposalId[proposal.id] ? (
                  <div style={{ marginTop: '0.4rem' }}>
                    <a
                      href={`https://amoy.polygonscan.com/tx/${txByProposalId[proposal.id]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--site-accent)', textDecoration: 'none', fontSize: '0.85rem' }}
                    >
                      View on PolygonScan
                    </a>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </main>

        <aside className="gov-right-panel">
          <section className="gov-live-widget">
            <div className="gov-live-badge">
              <span className="gov-live-dot" />
              Live proposal
            </div>
            {liveProposal ? (
              <>
                <div className="gov-widget-title">{liveProposal.id}: {liveProposal.title}</div>
                <div className="gov-widget-desc">
                  Status badge: {liveProposal.stage}. Upvotes and votes remain saved in the local browser store.
                </div>
                <div className="gov-vote-tally">{liveProposal.endorsements.toLocaleString()} endorsements</div>
              </>
            ) : (
              <div className="gov-widget-desc">No proposals are currently loaded.</div>
            )}
          </section>

          <section className="gov-card">
            <div className="gov-section-title" style={{ marginBottom: '0.75rem' }}>Status badges</div>
            <div className="gov-card-meta">
              <span className="gov-tag gov-tag-draft">Draft {stageCounts.draft}</span>
              <span className="gov-tag gov-tag-endorsed">Endorsed {stageCounts.endorsed}</span>
              <span className="gov-tag gov-tag-panel">Panel {stageCounts.panel}</span>
              <span className="gov-tag gov-tag-vote">Vote {stageCounts.vote}</span>
              <span className="gov-tag gov-tag-passed">Passed {stageCounts.passed}</span>
              <span className="gov-tag gov-tag-rejected">Rejected {stageCounts.rejected}</span>
            </div>
          </section>
        </aside>
      </div>
      {import.meta.env.VITE_FEDERATION_ENABLED === 'true' ? (
        <div style={{ display: 'none' }} data-crawlable="true">
          Federation Protocol Active • Community: {import.meta.env.VITE_COMMUNITY_ID} • Hub: {import.meta.env.VITE_FEDERATION_HUB_URL} • Share proposals to global PVA network
        </div>
      ) : null}
    </div>
  );
}