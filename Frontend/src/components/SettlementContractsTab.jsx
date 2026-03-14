import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { createLogger } from '../lib/logger';
import HelpTip from './HelpTip.jsx';
import LoadingSpinner, { LoadingDots } from './LoadingSpinner.jsx';
import './SettlementContractsTab.css';

const logger = createLogger('SettlementContractsTab');
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

export default function SettlementContractsTab() {
  const [wallet, setWallet] = useState({ address: '', chainId: '', connecting: false, sending: false });
  const [message, setMessage] = useState('');
  const [records, setRecords] = useState({ loading: true, data: [], error: null });
  const [artifacts, setArtifacts] = useState({ loading: false, data: [], error: null });
  const [artifactQuery, setArtifactQuery] = useState('');
  const [reverifyId, setReverifyId] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
  });

  const selectedArtifact = useMemo(
    () => artifacts.data.find((item) => String(item._id) === String(form.artifactId)),
    [artifacts.data, form.artifactId]
  );

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

  useEffect(() => {
    loadTransfers();
    loadArtifacts();
  }, [loadTransfers, loadArtifacts]);

  useEffect(() => {
    const id = setTimeout(() => {
      loadArtifacts(artifactQuery);
    }, 250);
    return () => clearTimeout(id);
  }, [artifactQuery, loadArtifacts]);

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
  });

  const submitRecord = async (txHashOverride = '') => {
    setSubmitting(true);
    try {
      const response = await apiPost('/blockchain/transfers/record', buildRecordPayload(txHashOverride));
      if (!response?.ok) {
        setMessage(`Failed to record transfer: ${response?.message || 'unknown error'}`);
      } else {
        setMessage('Transfer recorded and verified. Contract links are ready.');
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
    } catch (err) {
      setMessage(err.message || 'Failed to export contract JSON');
    }
  };

  return (
    <div className="settlement-contracts-tab" role="tabpanel" id="settlements-panel">
      <div className="tab-header">
        <h2>📜 Settlement Contracts</h2>
        <p className="tab-description">
          Execute wallet transfers, link them to artifacts, and generate printable contract receipts for online, PDF, or physical storage.
        </p>
      </div>

      <div className="settlements-help-row">
        <HelpTip
          title="Workflow"
          body="1) Connect wallet and send transfer on Base. 2) Record with metadata and artifact linkage. 3) Open contract and print/save PDF. 4) Re-verify anytime from chain."
          example="Pilot payout: $1.00, media proof URL, artifact linked, signed print copy in operations binder."
        />
      </div>

      <div className="settlement-form-card">
        <div className="wallet-actions-row">
          <button className="btn primary" type="button" onClick={connectWallet} disabled={wallet.connecting || wallet.sending}>
            {wallet.connecting ? 'Connecting...' : wallet.address ? 'Wallet Connected' : 'Connect Wallet'}
          </button>
          <button className="btn accent" type="button" onClick={handleWalletSendAndRecord} disabled={wallet.sending || !wallet.address}>
            {wallet.sending ? 'Sending...' : 'Send On Base + Record'}
          </button>
          {wallet.address ? <span className="wallet-chip">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} {wallet.chainId ? `· ${wallet.chainId}` : ''}</span> : null}
        </div>

        <div className="settlement-grid">
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

          <label>
            Recipient Wallet
            <input value={form.recipientWallet} onChange={(e) => setForm((prev) => ({ ...prev, recipientWallet: e.target.value }))} placeholder="0x..." />
          </label>

          <label>
            Native Amount (ETH)
            <input value={form.nativeAmount} onChange={(e) => setForm((prev) => ({ ...prev, nativeAmount: e.target.value }))} placeholder="0.0003" />
          </label>

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

          <label className="full-row">
            Tx Hash (manual or auto from wallet send)
            <input value={form.txHash} onChange={(e) => setForm((prev) => ({ ...prev, txHash: e.target.value }))} placeholder="0x..." />
          </label>

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

          <label>
            Party One Name
            <input value={form.partyOneName} onChange={(e) => setForm((prev) => ({ ...prev, partyOneName: e.target.value }))} placeholder="PVA Bazaar" />
          </label>

          <label>
            Party One Role
            <input value={form.partyOneRole} onChange={(e) => setForm((prev) => ({ ...prev, partyOneRole: e.target.value }))} placeholder="Operator" />
          </label>

          <label>
            Party Two Name
            <input value={form.partyTwoName} onChange={(e) => setForm((prev) => ({ ...prev, partyTwoName: e.target.value }))} placeholder="Counterparty Name" />
          </label>

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
        </div>

        <div className="manual-submit-row">
          <button className="btn secondary" type="button" onClick={() => submitRecord()} disabled={submitting}>
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
                  <button className="btn ghost tiny" type="button" onClick={() => handleReverify(item.id)} disabled={reverifyId === item.id}>
                    {reverifyId === item.id ? 'Checking...' : 'Re-verify'}
                  </button>
                </div>

                <div className="record-meta">
                  <span><strong>USD:</strong> ${Number(item.amountUsd || 0).toFixed(2)}</span>
                  <span><strong>Token:</strong> {item.tokenSymbol} {item.tokenAmount || ''}</span>
                  {item.artifactTitle ? <span><strong>Artifact:</strong> {item.artifactTitle}</span> : null}
                </div>

                <div className="record-links">
                  {item.explorerUrl ? <a href={item.explorerUrl} target="_blank" rel="noopener noreferrer">Explorer</a> : null}
                  {item.mediaUrl ? <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer">Media</a> : null}
                  {item.referenceUrl ? <a href={item.referenceUrl} target="_blank" rel="noopener noreferrer">Reference</a> : null}
                  <button className="btn ghost tiny" type="button" onClick={() => openContract(item.id, false)}>View Contract</button>
                  <button className="btn ghost tiny" type="button" onClick={() => openContract(item.id, true)}>Print / Save PDF</button>
                  <button className="btn ghost tiny" type="button" onClick={() => exportContractJson(item.id)}>Export JSON</button>
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
