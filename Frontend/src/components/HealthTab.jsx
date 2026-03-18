/**
 * HealthTab
 * 
 * PURPOSE: System health monitoring and OpenClaw integration
 * 
 * FEATURES:
 * - View system health status
 * - Monitor OpenClaw watchdog
 * - Check API connectivity
 * - View recent events
 * - Test event dispatch
 * - View connection metrics
 * 
 * API ENDPOINTS USED:
 * - GET /api/health - System health
 * - GET /api/openclaw/status - OpenClaw status
 * - GET /api/openclaw/recent-events - Recent events
 * - POST /api/openclaw/dispatch - Test event dispatch
 * - GET /api/openclaw/metrics - Prometheus metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { ENV } from '../config/env';
import { createLogger } from '../lib/logger';
import LoadingSpinner, { LoadingDots } from '../components/LoadingSpinner.jsx';
import HelpTip from './HelpTip.jsx';
import './HealthTab.css';

const logger = createLogger('HealthTab');
const BASE_CHAIN_ID_DEC = 8453;
const BASE_CHAIN_ID_HEX = '0x2105';

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

export default function HealthTab() {
  const [connectionStatus, setConnectionStatus] = useState({
    loading: true,
    checkedAt: null,
    results: {},
  });
  const [openclawStatus, setOpenclawStatus] = useState(null);
  const [recentEvents, setRecentEvents] = useState({ data: null, loading: false, error: null });
  const [dispatchTest, setDispatchTest] = useState({ loading: false, message: '' });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [blockchainRecords, setBlockchainRecords] = useState({ data: [], loading: false, error: null });
  const [recordingTransfer, setRecordingTransfer] = useState(false);
  const [reverifyId, setReverifyId] = useState('');
  const [wallet, setWallet] = useState({ address: '', chainId: '', connecting: false, sending: false });
  const [walletMessage, setWalletMessage] = useState('');
  const [transferForm, setTransferForm] = useState({
    network: 'base',
    txHash: '',
    recipientWallet: '',
    nativeAmount: '0.0003',
    amountUsd: '1.00',
    tokenSymbol: 'USDC',
    tokenAmount: '',
    artifactId: '',
    note: '',
    mediaUrl: '',
    referenceUrl: '',
  });

  const hasEthereum = () => typeof window !== 'undefined' && !!window.ethereum?.request;

  const connectWallet = async () => {
    setWalletMessage('');
    if (!hasEthereum()) {
      setWalletMessage('No wallet detected. Install MetaMask or use a wallet-enabled browser.');
      return;
    }

    setWallet((prev) => ({ ...prev, connecting: true }));
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const address = String(accounts?.[0] || '');
      setWallet({ address, chainId: String(chainId || ''), connecting: false, sending: false });
      setWalletMessage('Wallet connected.');
    } catch (err) {
      setWallet((prev) => ({ ...prev, connecting: false }));
      setWalletMessage(err?.message || 'Failed to connect wallet');
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
    if (!isBaseChain(chainId)) {
      throw new Error('Wallet is not on Base chain');
    }
  };

  const formatWatchdogMessage = useCallback((response) => {
    if (!response || response.ok === false) {
      return 'OpenClaw request failed';
    }
    // /status response shape: { configured, mode, message, queue }
    if (response.mode || response.queue !== undefined) {
      const mode = response.mode || 'queue-only';
      const pending = response.queue?.pending ?? '?';
      const stale = response.queue?.stale ?? 0;
      const detail = stale > 0 ? `, stale=${stale}` : '';
      return `${mode} — pending=${pending}${detail}${response.message ? ' · ' + response.message : ''}`;
    }
    // /watchdog-status response shape: { available, summary }
    if (!response.available) {
      return response.message || 'No watchdog logs found';
    }
    const summary = response.summary || {};
    const state = summary.state || 'unknown';
    const errors = Number.isFinite(summary.errorCountWindow) ? summary.errorCountWindow : 0;
    const alerts = Number.isFinite(summary.alertCountWindow) ? summary.alertCountWindow : 0;
    const lastEventAt = summary.lastEventAt || 'n/a';
    return `state=${state}, errors=${errors}, alerts=${alerts}, last=${lastEventAt}`;
  }, []);

  const runHealthCheck = useCallback(async () => {
    setConnectionStatus(prev => ({ ...prev, loading: true }));
    const results = {};
    const endpoints = [
      { key: 'health', url: '/health', label: 'Health Check' },
      { key: 'openclawStatus', url: '/openclaw/status', label: 'OpenClaw Status' },
      { key: 'openclawEvents', url: '/openclaw/recent-events?limit=5', label: 'OpenClaw Events' },
      { key: 'blockchain', url: '/blockchain/health', label: 'Blockchain Health' },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await apiGet(endpoint.url);
        const derivedMessage =
          endpoint.key === 'openclawStatus' ? formatWatchdogMessage(response) : 'Connected';
        results[endpoint.key] = {
          ok: response.ok !== false,
          status: response.ok !== false ? 'ok' : 'error',
          message: derivedMessage,
          label: endpoint.label,
        };
      } catch (err) {
        results[endpoint.key] = {
          ok: false,
          status: 'error',
          message: err.message || 'Request failed',
          label: endpoint.label,
        };
      }
    }

    setConnectionStatus({
      loading: false,
      checkedAt: new Date().toLocaleString(),
      results,
    });
  }, [formatWatchdogMessage]);

  const loadRecentEvents = async () => {
    setRecentEvents({ data: null, loading: true, error: null });
    try {
      const response = await apiGet('/openclaw/recent-events?limit=10');
      if (response.ok && Array.isArray(response.events)) {
        setRecentEvents({ data: response.events, loading: false, error: null });
      } else {
        setRecentEvents({
          data: null,
          loading: false,
          error: response.error || 'Failed to load events',
        });
      }
    } catch (err) {
      logger.error('Failed to load recent events', err);
      setRecentEvents({ data: null, loading: false, error: err.message });
    }
  };

  const handleTestDispatch = async () => {
    setDispatchTest({ loading: true, message: '' });
    try {
      const response = await apiPost('/openclaw/dispatch', {
        event: 'pvabazaar.test.manual',
        message: 'Manual test dispatch from admin panel',
        metadata: {
          source: 'admin-health-tab',
          timestamp: new Date().toISOString(),
        },
      });

      if (response.ok) {
        setDispatchTest({
          loading: false,
          message: '✅ Test event dispatched successfully!',
        });
        setTimeout(() => loadRecentEvents(), 1000); // Reload events after dispatch
      } else {
        setDispatchTest({
          loading: false,
          message: `❌ Dispatch failed: ${response.error || 'Unknown error'}`,
        });
      }
    } catch (err) {
      logger.error('Failed to dispatch test event', err);
      setDispatchTest({ loading: false, message: `❌ Error: ${err.message}` });
    }

    setTimeout(() => setDispatchTest({ loading: false, message: '' }), 5000);
  };

  const loadBlockchainTransfers = useCallback(async () => {
    setBlockchainRecords({ data: [], loading: true, error: null });
    try {
      const response = await apiGet('/blockchain/transfers?limit=20');
      if (response.ok && Array.isArray(response.items)) {
        setBlockchainRecords({ data: response.items, loading: false, error: null });
      } else {
        setBlockchainRecords({ data: [], loading: false, error: response.error || 'Failed to load transfers' });
      }
    } catch (err) {
      logger.error('Failed to load blockchain transfers', err);
      setBlockchainRecords({ data: [], loading: false, error: err.message || 'Failed to load transfers' });
    }
  }, []);

  const handleRecordTransfer = async (e) => {
    e.preventDefault();
    setRecordingTransfer(true);
    setDispatchTest({ loading: false, message: '' });

    try {
      const payload = {
        network: transferForm.network,
        txHash: transferForm.txHash.trim(),
        amountUsd: Number(transferForm.amountUsd || 0),
        tokenSymbol: transferForm.tokenSymbol.trim() || 'USDC',
        tokenAmount: transferForm.tokenAmount.trim(),
        artifactId: transferForm.artifactId.trim(),
        note: transferForm.note.trim(),
        mediaUrl: transferForm.mediaUrl.trim(),
        referenceUrl: transferForm.referenceUrl.trim(),
        toAddress: transferForm.recipientWallet.trim(),
      };

      const response = await apiPost('/blockchain/transfers/record', payload);
      if (!response?.ok) {
        setDispatchTest({ loading: false, message: `❌ ${response?.message || 'Failed to record transfer'}` });
        return;
      }

      setDispatchTest({ loading: false, message: '✅ Transfer recorded and verified against blockchain state' });
      setTransferForm((prev) => ({
        ...prev,
        txHash: '',
        tokenAmount: '',
        artifactId: '',
        note: '',
        mediaUrl: '',
        referenceUrl: '',
      }));
      await loadBlockchainTransfers();
    } catch (err) {
      logger.error('Failed to record blockchain transfer', err);
      setDispatchTest({ loading: false, message: `❌ ${err.message || 'Failed to record transfer'}` });
    } finally {
      setRecordingTransfer(false);
      setTimeout(() => setDispatchTest({ loading: false, message: '' }), 5000);
    }
  };

  const handleSendWalletTransfer = async () => {
    setWalletMessage('');
    setDispatchTest({ loading: false, message: '' });

    if (!hasEthereum()) {
      setWalletMessage('No wallet provider detected.');
      return;
    }
    if (!wallet.address) {
      setWalletMessage('Connect wallet first.');
      return;
    }
    if (!isWalletAddress(transferForm.recipientWallet)) {
      setWalletMessage('Enter a valid recipient wallet address.');
      return;
    }

    try {
      setWallet((prev) => ({ ...prev, sending: true }));
      await ensureBaseChain();
      const value = toWeiHex(transferForm.nativeAmount);
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet.address,
          to: transferForm.recipientWallet.trim(),
          value,
        }],
      });

      setTransferForm((prev) => ({ ...prev, txHash: txHash || '' }));

      const payload = {
        network: 'base',
        txHash: String(txHash || '').trim(),
        amountUsd: Number(transferForm.amountUsd || 0),
        tokenSymbol: transferForm.tokenSymbol.trim() || 'ETH',
        tokenAmount: transferForm.tokenAmount.trim() || transferForm.nativeAmount.trim(),
        artifactId: transferForm.artifactId.trim(),
        note: transferForm.note.trim(),
        mediaUrl: transferForm.mediaUrl.trim(),
        referenceUrl: transferForm.referenceUrl.trim(),
        toAddress: transferForm.recipientWallet.trim(),
      };

      const response = await apiPost('/blockchain/transfers/record', payload);
      if (!response?.ok) {
        setDispatchTest({ loading: false, message: `⚠️ Wallet transfer sent, but record failed: ${response?.message || 'unknown error'}` });
      } else {
        setDispatchTest({ loading: false, message: '✅ Wallet transfer sent and recorded with on-chain tracking' });
      }
      await loadBlockchainTransfers();
    } catch (err) {
      logger.error('Wallet transfer failed', err);
      setWalletMessage(err?.message || 'Wallet transfer failed');
    } finally {
      setWallet((prev) => ({ ...prev, sending: false }));
    }
  };

  const handleReverifyTransfer = async (id) => {
    setReverifyId(id);
    try {
      const response = await apiPost(`/blockchain/transfers/${id}/reverify`, {});
      if (!response?.ok) {
        setDispatchTest({ loading: false, message: `❌ ${response?.message || 'Re-verify failed'}` });
      } else {
        setDispatchTest({ loading: false, message: '✅ Transfer status refreshed from chain data' });
      }
      await loadBlockchainTransfers();
    } catch (err) {
      logger.error('Failed to re-verify transfer', err);
      setDispatchTest({ loading: false, message: `❌ ${err.message || 'Re-verify failed'}` });
    } finally {
      setReverifyId('');
      setTimeout(() => setDispatchTest({ loading: false, message: '' }), 4000);
    }
  };

  const handleViewContract = async (id, autoPrint = false) => {
    try {
      const response = await apiGet(`/blockchain/transfers/${id}/contract/render`);
      if (!response?.ok || !response?.html) {
        setDispatchTest({ loading: false, message: `❌ ${response?.message || 'Failed to render contract'}` });
        return;
      }

      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!printWindow) {
        setDispatchTest({ loading: false, message: '❌ Pop-up blocked. Allow pop-ups to view/print contract.' });
        return;
      }
      printWindow.document.open();
      printWindow.document.write(response.html);
      printWindow.document.close();
      if (autoPrint) {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 400);
      }
    } catch (err) {
      logger.error('Contract render failed', err);
      setDispatchTest({ loading: false, message: `❌ ${err.message || 'Failed to render contract'}` });
    }
  };

  const handleExportContractJson = async (id) => {
    try {
      const response = await apiGet(`/blockchain/transfers/${id}/contract`);
      if (!response?.ok || !response?.contract) {
        setDispatchTest({ loading: false, message: `❌ ${response?.message || 'Failed to export contract'}` });
        return;
      }
      const blob = new Blob([JSON.stringify(response.contract, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement-contract-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Contract export failed', err);
      setDispatchTest({ loading: false, message: `❌ ${err.message || 'Failed to export contract'}` });
    }
  };

  useEffect(() => {
    runHealthCheck();
    loadRecentEvents();
    loadBlockchainTransfers();
  }, [runHealthCheck, loadBlockchainTransfers]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      runHealthCheck();
      loadRecentEvents();
      loadBlockchainTransfers();
    }, 60000); // Auto-refresh every 60 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, runHealthCheck, loadBlockchainTransfers]);

  const getOverallStatus = () => {
    if (connectionStatus.loading) return 'loading';
    const results = Object.values(connectionStatus.results || {});
    if (!results.length) return 'unknown';
    const failedCount = results.filter((r) => !r.ok).length;
    if (failedCount === 0) return 'healthy';
    if (failedCount === results.length) return 'error';
    return 'degraded';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="health-tab" role="tabpanel" id="health-panel">
      <div className="tab-header">
        <h2>💚 System Health</h2>
        <p className="tab-description">
          Monitor system health, API connectivity, and OpenClaw event dispatching.
        </p>
      </div>

      <div className="health-controls">
        <button onClick={runHealthCheck} className="refresh-btn" disabled={connectionStatus.loading}>
          {connectionStatus.loading ? '⏳ Checking...' : '🔄 Refresh'}
        </button>
        <label className="auto-refresh-toggle">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <span>Auto-refresh (60s)</span>
        </label>
      </div>

      <div className={`health-overview status-${overallStatus}`}>
        <div className="health-icon">
          {overallStatus === 'healthy' && '✅'}
          {overallStatus === 'degraded' && '⚠️'}
          {overallStatus === 'error' && '❌'}
          {overallStatus === 'loading' && '⏳'}
          {overallStatus === 'unknown' && '❓'}
        </div>
        <div className="health-status">
          <h3>
            {overallStatus === 'healthy' && 'All Systems Operational'}
            {overallStatus === 'degraded' && 'Some Systems Degraded'}
            {overallStatus === 'error' && 'System Error'}
            {overallStatus === 'loading' && 'Checking...'}
            {overallStatus === 'unknown' && 'Status Unknown'}
          </h3>
          {connectionStatus.checkedAt && (
            <p className="last-check">Last checked: {connectionStatus.checkedAt}</p>
          )}
        </div>
      </div>

      <div className="health-grid">
        <div className="health-card">
          <h3>🔗 API Endpoints</h3>
          <div className="endpoint-list">
            {Object.entries(connectionStatus.results).map(([key, result]) => (
              <div key={key} className={`endpoint-item status-${result.ok ? 'ok' : 'error'}`}>
                <span className="endpoint-dot"></span>
                <div className="endpoint-info">
                  <strong>{result.label}</strong>
                  <span className="endpoint-message">{result.message}</span>
                </div>
                <span className={`endpoint-badge ${result.ok ? 'ok' : 'error'}`}>
                  {result.ok ? 'OK' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="health-card">
          <h3>🧪 Test Dispatch</h3>
          <p className="card-description">
            Manually dispatch a test event to OpenClaw to verify event processing.
          </p>
          <button
            onClick={handleTestDispatch}
            className="test-dispatch-btn"
            disabled={dispatchTest.loading}
          >
            {dispatchTest.loading ? <LoadingDots inline={true} label="Dispatching..." /> : '🚀 Dispatch Test Event'}
          </button>
          {dispatchTest.message && (
            <div className={`dispatch-message ${dispatchTest.message.includes('✅') ? 'success' : 'error'}`}>
              {dispatchTest.message}
            </div>
          )}
        </div>

        <div className="health-card events-card">
          <h3>📜 Recent Events</h3>
          {recentEvents.loading ? (
            <LoadingSpinner size="small" />
          ) : recentEvents.error ? (
            <div className="error-message">{recentEvents.error}</div>
          ) : recentEvents.data && recentEvents.data.length > 0 ? (
            <div className="events-list">
              {recentEvents.data.map((event, index) => (
                <div key={index} className="event-item">
                  <div className="event-header">
                    <span className={`event-level level-${event.level || 'info'}`}>
                      {event.level || 'info'}
                    </span>
                    <span className="event-time">
                      {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'Unknown'}
                    </span>
                  </div>
                  <div className="event-message">{event.message || event.event}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">No recent events.</p>
          )}
        </div>
      </div>

      <div className="health-card blockchain-tracker-card">
        <div className="section-heading-row">
          <h3>⛓️ Blockchain Transfer Tracker</h3>
          <HelpTip
            title="What this tracker does"
            body="Record a real transaction hash with amount, note, and media/reference links. The system fetches chain status and keeps a searchable settlement record for audit and customer proof."
            example="$1.00 USDC transfer with an attached certificate image URL and a note like 'pilot payout round 1'."
          />
        </div>

        <form className="blockchain-form" onSubmit={handleRecordTransfer}>
          <div className="wallet-row full-row">
            <button type="button" className="refresh-btn" onClick={connectWallet} disabled={wallet.connecting || wallet.sending}>
              {wallet.connecting ? 'Connecting...' : wallet.address ? 'Wallet Connected' : 'Connect Wallet'}
            </button>
            <button type="button" className="test-dispatch-btn wallet-send-btn" onClick={handleSendWalletTransfer} disabled={wallet.sending || !wallet.address}>
              {wallet.sending ? 'Sending...' : 'Send On Base + Auto Record'}
            </button>
            {wallet.address ? <span className="wallet-chip">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} {wallet.chainId ? `· ${wallet.chainId}` : ''}</span> : null}
          </div>
          {walletMessage ? <div className="wallet-message full-row">{walletMessage}</div> : null}

          <label>
            Network
            <select
              value={transferForm.network}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, network: e.target.value }))}
            >
              <option value="base">Base</option>
              <option value="base-sepolia">Base Sepolia</option>
              <option value="ethereum">Ethereum</option>
              <option value="sepolia">Sepolia</option>
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
            </select>
          </label>

          <label className="full-row">
            Transaction Hash
            <input
              type="text"
              placeholder="0x..."
              value={transferForm.txHash}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, txHash: e.target.value }))}
              required
            />
          </label>

          <label>
            Recipient Wallet
            <input
              type="text"
              placeholder="0x..."
              value={transferForm.recipientWallet}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, recipientWallet: e.target.value }))}
            />
          </label>

          <label>
            Native Amount (ETH)
            <input
              type="text"
              placeholder="0.0003"
              value={transferForm.nativeAmount}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, nativeAmount: e.target.value }))}
            />
          </label>

          <label>
            USD Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={transferForm.amountUsd}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, amountUsd: e.target.value }))}
            />
          </label>

          <label>
            Token Symbol
            <input
              type="text"
              value={transferForm.tokenSymbol}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, tokenSymbol: e.target.value }))}
            />
          </label>

          <label>
            Token Amount
            <input
              type="text"
              placeholder="1.0"
              value={transferForm.tokenAmount}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, tokenAmount: e.target.value }))}
            />
          </label>

          <label>
            Artifact ID (optional)
            <input
              type="text"
              placeholder="Mongo ObjectId"
              value={transferForm.artifactId}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, artifactId: e.target.value }))}
            />
          </label>

          <label className="full-row">
            Settlement Note
            <textarea
              rows="2"
              placeholder="What this transfer is for"
              value={transferForm.note}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </label>

          <label className="full-row">
            Media URL (optional)
            <input
              type="url"
              placeholder="https://..."
              value={transferForm.mediaUrl}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, mediaUrl: e.target.value }))}
            />
          </label>

          <label className="full-row">
            Reference URL (optional)
            <input
              type="url"
              placeholder="https://..."
              value={transferForm.referenceUrl}
              onChange={(e) => setTransferForm((prev) => ({ ...prev, referenceUrl: e.target.value }))}
            />
          </label>

          <button type="submit" className="test-dispatch-btn" disabled={recordingTransfer}>
            {recordingTransfer ? <LoadingDots inline={true} label="Recording transfer..." /> : 'Record & Verify Transfer'}
          </button>
        </form>

        {blockchainRecords.loading ? (
          <LoadingSpinner size="small" />
        ) : blockchainRecords.error ? (
          <div className="error-message">{blockchainRecords.error}</div>
        ) : blockchainRecords.data.length === 0 ? (
          <p className="empty-message">No blockchain transfer records yet.</p>
        ) : (
          <div className="transfer-list">
            {blockchainRecords.data.map((item) => (
              <div key={item.id} className="transfer-item">
                <div className="transfer-head">
                  <span className={`transfer-status status-${item.status}`}>{item.status}</span>
                  <span className="transfer-network">{item.network}</span>
                  <button
                    type="button"
                    className="btn-reverify"
                    onClick={() => handleReverifyTransfer(item.id)}
                    disabled={reverifyId === item.id}
                  >
                    {reverifyId === item.id ? 'Checking...' : 'Re-verify'}
                  </button>
                </div>

                <div className="transfer-meta">
                  <span><strong>Amount:</strong> ${Number(item.amountUsd || 0).toFixed(2)} {item.tokenSymbol}</span>
                  {item.tokenAmount ? <span><strong>Token Qty:</strong> {item.tokenAmount}</span> : null}
                  {item.blockNumber ? <span><strong>Block:</strong> {item.blockNumber}</span> : null}
                  {item.artifactTitle ? <span><strong>Artifact:</strong> {item.artifactTitle}</span> : null}
                </div>

                <div className="transfer-links">
                  {item.explorerUrl ? (
                    <a href={item.explorerUrl} target="_blank" rel="noopener noreferrer">
                      View On Explorer
                    </a>
                  ) : null}
                  {item.mediaUrl ? (
                    <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer">
                      Media Link
                    </a>
                  ) : null}
                  {item.referenceUrl ? (
                    <a href={item.referenceUrl} target="_blank" rel="noopener noreferrer">
                      Reference Link
                    </a>
                  ) : null}
                  <button type="button" className="link-btn" onClick={() => handleViewContract(item.id, false)}>
                    View Contract
                  </button>
                  <button type="button" className="link-btn" onClick={() => handleViewContract(item.id, true)}>
                    Print / Save PDF
                  </button>
                  <button type="button" className="link-btn" onClick={() => handleExportContractJson(item.id)}>
                    Export JSON
                  </button>
                </div>

                {item.note ? <p className="transfer-note">{item.note}</p> : null}
                <p className="transfer-hash">{item.txHash}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="info-box">
        <h3>📖 About Health Monitoring</h3>
        <p>
          This tab monitors system health and OpenClaw event dispatching. OpenClaw is a watchdog
          system that monitors events, logs alerts, and provides automation hooks.
        </p>
        <ul className="info-list">
          <li><strong>Health Check</strong>: Verifies API connectivity and database status</li>
          <li><strong>OpenClaw Status</strong>: Shows watchdog state, errors, and alerts</li>
          <li><strong>Recent Events</strong>: Displays last 10 dispatched events</li>
          <li><strong>Test Dispatch</strong>: Manually trigger a test event</li>
        </ul>
      </div>
    </div>
  );
}
