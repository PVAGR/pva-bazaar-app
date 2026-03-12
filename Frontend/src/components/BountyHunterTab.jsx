import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { createLogger } from '../lib/logger';
import { LoadingDots } from '../components/LoadingSpinner.jsx';
import './BountyHunterTab.css';

const logger = createLogger('BountyHunterTab');

const STATUS_LABELS = {
  discovered: '🔍 Discovered',
  draft_ready: '✍️ Draft Ready',
  pending_review: '⏳ Pending Review',
  approved: '✅ Approved',
  submitted: '📤 Submitted',
  won: '🏆 Won',
  lost: '❌ Lost',
  skipped: '⏭️ Skipped',
};

const STATUS_CLASS = {
  discovered: 'status-discovered',
  draft_ready: 'status-draft',
  pending_review: 'status-pending',
  approved: 'status-approved',
  submitted: 'status-submitted',
  won: 'status-won',
  lost: 'status-lost',
  skipped: 'status-skipped',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function BountyHunterTab() {
  const [bounties, setBounties] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null); // bounty detail view
  const [reviewNotes, setReviewNotes] = useState('');
  const [editingDraft, setEditingDraft] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [payoutTxHash, setPayoutTxHash] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [rankedMode, setRankedMode] = useState(false);
  const [dispatchingTop, setDispatchingTop] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [moneyRunning, setMoneyRunning] = useState(false);
  const [moneyResult, setMoneyResult] = useState(null);
  const [minRewardRaw, setMinRewardRaw] = useState('0');
  const [wallet, setWallet] = useState({ address: '', chainId: '', connecting: false });
  const [walletError, setWalletError] = useState('');
  const [payoutNativeAmount, setPayoutNativeAmount] = useState('');
  const [payingWithWallet, setPayingWithWallet] = useState(false);
  const scanResultTimer = useRef(null);
  const BASE_CHAIN_ID_DEC = 8453;
  const BASE_CHAIN_ID_HEX = '0x2105';

  const PER_PAGE = 20;

  const loadBounties = useCallback(async (pg = 1, statusF = filterStatus, platformF = filterPlatform) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: PER_PAGE });
      if (statusF) params.set('status', statusF);
      if (platformF) params.set('platform', platformF);
      const data = await apiGet(`/bounties?${params}`);
      if (data.ok) {
        setBounties(data.bounties || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      logger.error('Failed to load bounties', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPlatform]);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiGet('/bounties/stats');
      if (data.ok) {
        setStats(data);
        if (!walletAddress && data.defaultPayoutWallet) {
          setWalletAddress(data.defaultPayoutWallet);
        }
      }
    } catch (err) {
      logger.error('Failed to load stats', err);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadBounties(1, filterStatus, filterPlatform);
    loadStats();
    setPage(1);
  }, [filterStatus, filterPlatform]);

  useEffect(() => {
    loadBounties(page, filterStatus, filterPlatform);
  }, [page]);

  useEffect(() => {
    const eth = typeof window !== 'undefined' ? window.ethereum : null;
    if (!eth?.on) return undefined;

    const onAccountsChanged = (accounts) => {
      const next = String(accounts?.[0] || '');
      setWallet((w) => ({ ...w, address: next }));
      if (next) setWalletAddress(next);
    };
    const onChainChanged = (nextChainId) => {
      setWallet((w) => ({ ...w, chainId: String(nextChainId || '') }));
    };

    eth.on('accountsChanged', onAccountsChanged);
    eth.on('chainChanged', onChainChanged);

    return () => {
      if (eth.removeListener) {
        eth.removeListener('accountsChanged', onAccountsChanged);
        eth.removeListener('chainChanged', onChainChanged);
      }
    };
  }, []);

  const hasEthereum = () => typeof window !== 'undefined' && !!window.ethereum?.request;

  const isBaseChain = (chainId) => {
    const chain = String(chainId || '').toLowerCase();
    return chain === String(BASE_CHAIN_ID_DEC) || chain === BASE_CHAIN_ID_HEX;
  };

  const isWalletAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(String(addr || '').trim());

  const toWeiHex = (amount) => {
    const input = String(amount || '').trim();
    if (!/^\d+(\.\d{1,18})?$/.test(input)) {
      throw new Error('Enter amount like 0.01 (up to 18 decimals)');
    }
    const [whole, fraction = ''] = input.split('.');
    const wei = BigInt(whole) * 10n ** 18n + BigInt((fraction + '0'.repeat(18)).slice(0, 18));
    if (wei <= 0n) throw new Error('Amount must be greater than 0');
    return `0x${wei.toString(16)}`;
  };

  const connectWallet = async () => {
    setWalletError('');
    if (!hasEthereum()) {
      setWalletError('No wallet detected. Install MetaMask or use a wallet-enabled browser.');
      return;
    }

    setWallet((w) => ({ ...w, connecting: true }));
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = String(accounts?.[0] || '');
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setWallet({ address, chainId: String(chainId || ''), connecting: false });
      if (address) setWalletAddress(address);
    } catch (err) {
      setWallet((w) => ({ ...w, connecting: false }));
      setWalletError(err?.message || 'Failed to connect wallet');
    }
  };

  const switchToBase = async () => {
    setWalletError('');
    if (!hasEthereum()) {
      const msg = 'No wallet detected. Install MetaMask first.';
      setWalletError(msg);
      throw new Error(msg);
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setWallet((w) => ({ ...w, chainId: String(chainId || '') }));
      if (!isBaseChain(chainId)) {
        throw new Error('Wallet is not on Base chain after switch');
      }
    } catch (err) {
      // If Base is not present, ask wallet to add it.
      if (err?.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: BASE_CHAIN_ID_HEX,
            chainName: 'Base Mainnet',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          }],
        });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setWallet((w) => ({ ...w, chainId: String(chainId || '') }));
        if (!isBaseChain(chainId)) {
          throw new Error('Wallet is not on Base chain after adding network');
        }
        return;
      }
      const message = err?.message || 'Failed to switch to Base';
      setWalletError(message);
      throw err;
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const data = await apiPost('/bounties/scan', {});
      setScanResult(data.results);
      await loadBounties(1, filterStatus, filterPlatform);
      await loadStats();
      setPage(1);
    } catch (err) {
      setScanResult({ error: err.message });
    } finally {
      setScanning(false);
      clearTimeout(scanResultTimer.current);
      scanResultTimer.current = setTimeout(() => setScanResult(null), 8000);
    }
  };

  const openDetail = (b) => {
    setSelected(b);
    setEditingDraft(b.draftContent || '');
    setReviewNotes(b.reviewNotes || '');
    setPayoutTxHash('');
  };

  const closeDetail = () => setSelected(null);

  const handleReview = async (action) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const data = await apiPut(`/bounties/${selected._id}/review`, {
        action,
        draftContent: editingDraft,
        reviewNotes,
      });
      if (data.ok) {
        setSelected(data.bounty);
        await loadBounties(page, filterStatus, filterPlatform);
        await loadStats();
      }
    } catch (err) {
      logger.error('Review action failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenDraft = async () => {
    if (!selected) return;
    setRegenerating(true);
    try {
      const data = await apiPut(`/bounties/${selected._id}/draft`, {});
      if (data.ok) {
        setSelected(data.bounty);
        setEditingDraft(data.bounty.draftContent || '');
      }
    } catch (err) {
      logger.error('Draft regen failed', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const data = await apiPost(`/bounties/${selected._id}/submit`, {
        submissionPayload: { content: editingDraft },
      });
      if (data.ok) {
        setSelected(data.bounty);
        await loadBounties(page, filterStatus, filterPlatform);
      }
    } catch (err) {
      logger.error('Submit failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayout = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const data = await apiPost(`/bounties/${selected._id}/payout`, {
        txHash: payoutTxHash,
        amount: selected.rewardAmount,
        wallet: walletAddress,
      });
      if (data.ok) {
        setSelected(data.bounty);
        await loadBounties(page, filterStatus, filterPlatform);
        await loadStats();
      }
    } catch (err) {
      logger.error('Payout record failed', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMetaMaskPayout = async () => {
    if (!selected) return;
    setWalletError('');
    if (!hasEthereum()) {
      setWalletError('No wallet detected. Install MetaMask first.');
      return;
    }
    if (!wallet.address) {
      setWalletError('Connect MetaMask first.');
      return;
    }
    if (!isWalletAddress(walletAddress)) {
      setWalletError('Enter a valid recipient wallet address (0x...).');
      return;
    }

    setPayingWithWallet(true);
    try {
      if (!isBaseChain(wallet.chainId)) {
        await switchToBase();
      }

      const activeChain = await window.ethereum.request({ method: 'eth_chainId' });
      if (!isBaseChain(activeChain)) {
        throw new Error('Please switch MetaMask to Base before paying.');
      }

      const value = toWeiHex(payoutNativeAmount);
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet.address,
          to: walletAddress,
          value,
        }],
      });

      const data = await apiPost(`/bounties/${selected._id}/payout`, {
        txHash,
        amount: selected.rewardAmount,
        wallet: walletAddress,
      });

      if (data.ok) {
        setPayoutTxHash(txHash);
        setSelected(data.bounty);
        await loadBounties(page, filterStatus, filterPlatform);
        await loadStats();
      }
    } catch (err) {
      setWalletError(err?.message || 'MetaMask payout failed');
      logger.error('MetaMask payout failed', err);
    } finally {
      setPayingWithWallet(false);
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);
  const displayBounties = rankedMode
    ? [...bounties].sort((a, b) => {
      const scoreA = (Array.isArray(a.keywords) ? a.keywords.length : 0) * 2 + (a.rewardRaw || 0) / 25;
      const scoreB = (Array.isArray(b.keywords) ? b.keywords.length : 0) * 2 + (b.rewardRaw || 0) / 25;
      return scoreB - scoreA;
    })
    : bounties;

  const handleDispatchTop = async () => {
    setDispatchingTop(true);
    setDispatchResult(null);
    try {
      const data = await apiPost('/bounties/dispatch-top', {
        limit: 10,
        walletAddress,
        minRewardRaw: Number(minRewardRaw) || 0,
      });
      if (data.ok) {
        setDispatchResult(data);
      } else {
        setDispatchResult({ ok: false, message: data.message || 'Dispatch failed' });
      }
    } catch (err) {
      setDispatchResult({ ok: false, message: err.message || 'Dispatch failed' });
      logger.error('Dispatch top bounties failed', err);
    } finally {
      setDispatchingTop(false);
    }
  };

  const handleMoneyRun = async () => {
    setMoneyRunning(true);
    setMoneyResult(null);
    setScanResult(null);
    setDispatchResult(null);
    try {
      const data = await apiPost('/bounties/money-run', {
        limit: 10,
        walletAddress,
        minRewardRaw: Number(minRewardRaw) || 0,
      });
      setMoneyResult(data);
      await loadBounties(1, filterStatus, filterPlatform);
      await loadStats();
      setPage(1);
      if (data?.scanResults) {
        setScanResult(data.scanResults);
      }
      if (data?.queued) {
        setDispatchResult(data);
      }
    } catch (err) {
      setMoneyResult({ ok: false, message: err.message || 'Money run failed' });
      logger.error('Money run failed', err);
    } finally {
      setMoneyRunning(false);
    }
  };

  return (
    <div className="bh-tab">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bh-header">
        <div className="bh-header-left">
          <h2 className="bh-title">🤖 Bounty Hunter</h2>
          <p className="bh-subtitle">AI-powered crypto task discovery · HITL review · 24/7 scanning</p>
        </div>
        <button
          className={`bh-scan-btn ${scanning ? 'scanning' : ''}`}
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? <><LoadingDots />Scanning…</> : '⚡ Scan Now'}
        </button>
      </div>

      <div className="bh-controls-row">
        <button
          className="bh-wallet-connect-btn"
          onClick={connectWallet}
          disabled={wallet.connecting}
        >
          {wallet.address ? 'Wallet connected' : wallet.connecting ? 'Connecting…' : 'Connect MetaMask'}
        </button>

        {wallet.address && !isBaseChain(wallet.chainId) && (
          <button className="bh-base-btn" onClick={switchToBase}>
            Switch to Base
          </button>
        )}

        <button
          className={`bh-rank-btn ${rankedMode ? 'active' : ''}`}
          onClick={() => setRankedMode(v => !v)}
        >
          {rankedMode ? '🏅 Ranked View On' : '🏅 Rank Best'}
        </button>

        <input
          className="bh-wallet-input"
          value={walletAddress}
          onChange={e => setWalletAddress(e.target.value)}
          placeholder="Base wallet address for OpenClaw context"
        />

        <input
          className="bh-min-reward-input"
          type="number"
          min="0"
          step="1"
          value={minRewardRaw}
          onChange={e => setMinRewardRaw(e.target.value)}
          placeholder="Min reward"
          title="Minimum numeric reward to include in dispatch"
        />

        <button
          className="bh-money-btn"
          onClick={handleMoneyRun}
          disabled={moneyRunning}
          title="Scan + rank + dispatch top bounties in one step"
        >
          {moneyRunning ? 'Running…' : '💸 Money Run'}
        </button>

        <button
          className="bh-openclaw-btn"
          onClick={handleDispatchTop}
          disabled={dispatchingTop}
        >
          {dispatchingTop ? 'Dispatching…' : '🤖 Send Top 10 to OpenClaw'}
        </button>

        {wallet.address && (
          <span className="bh-wallet-chip">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} {wallet.chainId ? `· ${isBaseChain(wallet.chainId) ? 'Base' : wallet.chainId}` : ''}
          </span>
        )}
      </div>

      {walletError ? <div className="bh-scan-result error">❌ {walletError}</div> : null}

      {moneyResult && (
        <div className={`bh-scan-result ${moneyResult.ok ? 'ok' : 'error'}`}>
          {moneyResult.ok
            ? `✅ Money run: ${moneyResult.scanResults?.discovered || 0} discovered, ${moneyResult.rankedCount || 0} queued to OpenClaw`
            : `❌ ${moneyResult.message || 'Money run failed'}`}
        </div>
      )}

      {dispatchResult && (
        <div className={`bh-scan-result ${dispatchResult.ok ? 'ok' : 'error'}`}>
          {dispatchResult.ok
            ? `✅ OpenClaw queued (${dispatchResult.rankedCount || 0} opportunities) · Wallet: ${dispatchResult.walletAddress || 'n/a'}`
            : `❌ ${dispatchResult.message || 'OpenClaw dispatch failed'}`}
        </div>
      )}

      {/* ── Scan result banner ─────────────────────────────────── */}
      {scanResult && (
        <div className={`bh-scan-result ${scanResult.error ? 'error' : 'ok'}`}>
          {scanResult.error
            ? `❌ Scan error: ${scanResult.error}`
            : `✅ Scan complete: ${scanResult.discovered} new bounties discovered, ${scanResult.skipped} already known`
          }
          {scanResult.errors?.length > 0 && (
            <span className="bh-scan-warnings"> · {scanResult.errors.length} platform warnings</span>
          )}
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────── */}
      {stats && (
        <div className="bh-stats">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            stats.stats[key] > 0 && (
              <button
                key={key}
                className={`bh-stat-chip ${filterStatus === key ? 'active' : ''}`}
                onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
              >
                <span className={`bh-stat-dot ${STATUS_CLASS[key]}`} />
                {label} <strong>{stats.stats[key]}</strong>
              </button>
            )
          ))}
          {stats.wonCount > 0 && (
            <div className="bh-stat-earned">💰 Total earned: <strong>{stats.totalEarned.toFixed(2)}</strong></div>
          )}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="bh-filters">
        <select
          className="bh-select"
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="bh-select"
          value={filterPlatform}
          onChange={e => { setFilterPlatform(e.target.value); setPage(1); }}
        >
          <option value="">All platforms</option>
          <option value="dework">Dework</option>
          <option value="github">GitHub</option>
          <option value="reddit">Reddit</option>
          <option value="manual">Manual</option>
        </select>
        {(filterStatus || filterPlatform) && (
          <button className="bh-clear-btn" onClick={() => { setFilterStatus(''); setFilterPlatform(''); setPage(1); }}>
            ✕ Clear filters
          </button>
        )}
        <span className="bh-total">{total} bounties</span>
      </div>

      {/* ── Bounty list ────────────────────────────────────────── */}
      {loading ? (
        <div className="bh-loading"><LoadingDots /> Loading bounties…</div>
      ) : bounties.length === 0 ? (
        <div className="bh-empty">
          <p>No bounties found. Click <strong>⚡ Scan Now</strong> to discover opportunities.</p>
          <p className="bh-empty-note">
            The scanner checks Dework, GitHub, and more for tasks matching your keyword profile.
            Results are stored here for your review.
          </p>
        </div>
      ) : (
        <div className="bh-list">
          {displayBounties.map(b => (
            <div
              key={b._id}
              className={`bh-card ${STATUS_CLASS[b.status]}`}
              onClick={() => openDetail(b)}
            >
              <div className="bh-card-header">
                <span className={`bh-badge ${STATUS_CLASS[b.status]}`}>{STATUS_LABELS[b.status]}</span>
                <span className="bh-platform">{b.platform}</span>
                {b.rewardAmount && <span className="bh-reward">💎 {b.rewardAmount}</span>}
                <span className="bh-time">{timeAgo(b.createdAt)}</span>
              </div>
              <div className="bh-card-title">{b.title}</div>
              {b.keywords?.length > 0 && (
                <div className="bh-keywords">
                  {b.keywords.slice(0, 6).map(kw => (
                    <span key={kw} className="bh-kw">{kw}</span>
                  ))}
                </div>
              )}
              {b.draftContent && (
                <div className="bh-draft-indicator">✍️ AI draft ready</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="bh-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
        </div>
      )}

      {/* ── Detail / Review Modal ──────────────────────────────── */}
      {selected && (
        <div className="bh-modal-backdrop" onClick={e => e.target === e.currentTarget && closeDetail()}>
          <div className="bh-modal">
            <div className="bh-modal-header">
              <div>
                <span className={`bh-badge ${STATUS_CLASS[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
                <span className="bh-platform bh-platform-lg">{selected.platform}</span>
                {selected.rewardAmount && <span className="bh-reward">&nbsp;💎 {selected.rewardAmount}</span>}
              </div>
              <button className="bh-modal-close" onClick={closeDetail}>✕</button>
            </div>

            <h3 className="bh-modal-title">{selected.title}</h3>

            {selected.platformUrl && (
              <a className="bh-ext-link" href={selected.platformUrl} target="_blank" rel="noopener noreferrer">
                🔗 View on {selected.platform}
              </a>
            )}

            {selected.description && (
              <div className="bh-section">
                <div className="bh-section-label">Task Description</div>
                <div className="bh-description">{selected.description}</div>
              </div>
            )}

            {selected.keywords?.length > 0 && (
              <div className="bh-keywords bh-keywords-lg">
                {selected.keywords.map(kw => <span key={kw} className="bh-kw">{kw}</span>)}
              </div>
            )}

            {/* Draft editor */}
            <div className="bh-section">
              <div className="bh-section-label">
                AI-Generated Draft
                <button
                  className="bh-regen-btn"
                  onClick={handleRegenDraft}
                  disabled={regenerating}
                  title="Regenerate draft using AI"
                >
                  {regenerating ? '↻ Regenerating…' : '↻ Regen'}
                </button>
              </div>
              {editingDraft ? (
                <textarea
                  className="bh-draft-editor"
                  value={editingDraft}
                  onChange={e => setEditingDraft(e.target.value)}
                  rows={14}
                  placeholder="AI-generated draft will appear here. Edit before submitting."
                />
              ) : (
                <div className="bh-draft-empty">
                  No draft yet. Click <strong>↻ Regen</strong> to generate one with AI.
                  <br /><small>Requires OPENAI_API_KEY in backend env.</small>
                </div>
              )}
            </div>

            {/* Review notes */}
            <div className="bh-section">
              <div className="bh-section-label">Review Notes</div>
              <input
                className="bh-notes-input"
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Optional notes for this bounty…"
              />
            </div>

            {/* Action buttons */}
            <div className="bh-modal-actions">
              <button
                className="bh-action-btn approve"
                onClick={() => handleReview('approve')}
                disabled={actionLoading || selected.status === 'approved'}
              >
                ✅ Approve
              </button>
              <button
                className="bh-action-btn submit"
                onClick={handleSubmit}
                disabled={actionLoading || !editingDraft || selected.status === 'submitted'}
              >
                📤 Mark Submitted
              </button>
              <button
                className="bh-action-btn skip"
                onClick={() => handleReview('skip')}
                disabled={actionLoading || selected.status === 'skipped'}
              >
                ⏭️ Skip
              </button>
              <button
                className="bh-action-btn reject"
                onClick={() => handleReview('reject')}
                disabled={actionLoading}
              >
                ✕ Reset
              </button>
            </div>

            {/* Won / Payout recording */}
            {(selected.status === 'submitted' || selected.status === 'won') && (
              <div className="bh-payout-section">
                <div className="bh-section-label">Record Payout (when you win)</div>
                <div className="bh-payout-row">
                  <input
                    className="bh-notes-input"
                    value={walletAddress}
                    onChange={e => setWalletAddress(e.target.value)}
                    placeholder="Recipient wallet (0x...)"
                  />
                </div>
                <div className="bh-payout-row">
                  <input
                    className="bh-notes-input bh-amount-input"
                    value={payoutNativeAmount}
                    onChange={e => setPayoutNativeAmount(e.target.value)}
                    placeholder="Amount in ETH on Base (e.g. 0.01)"
                  />
                  <button
                    className="bh-action-btn submit"
                    onClick={handleMetaMaskPayout}
                    disabled={payingWithWallet || !wallet.address}
                    title="Send payout on Base with MetaMask and auto-mark won"
                  >
                    {payingWithWallet ? 'Paying…' : 'Pay with MetaMask + Mark Won'}
                  </button>
                </div>
                <div className="bh-payout-row">
                  <input
                    className="bh-notes-input"
                    value={payoutTxHash}
                    onChange={e => setPayoutTxHash(e.target.value)}
                    placeholder="Transaction hash (optional)"
                  />
                  <button
                    className="bh-action-btn won"
                    onClick={handlePayout}
                    disabled={actionLoading || selected.status === 'won'}
                  >
                    🏆 Mark Won
                  </button>
                </div>
                {selected.payoutTxHash && (
                  <div className="bh-tx">
                    TX: <a
                      href={`https://basescan.org/tx/${selected.payoutTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >{selected.payoutTxHash.slice(0, 18)}…</a>
                  </div>
                )}
              </div>
            )}

            {actionLoading && <div className="bh-action-loading"><LoadingDots /> Working…</div>}
          </div>
        </div>
      )}
    </div>
  );
}
