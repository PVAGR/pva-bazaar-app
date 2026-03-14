import React, { useState, useEffect } from 'react';
import {
  apiGet,
  apiPost,
  fetchAdminRuntimeConfig,
  updatePayoutRuntimePolicy,
  requestSolanaTestPayout,
  confirmSolanaTestPayout,
  getDirectTransferReadiness,
  getHotWalletBalance,
  requestDevnetAirdropHotWallet,
  directSolanaTransfer,
} from '../lib/api';
import './PayoutTab.css';

export default function PayoutTab() {
  const [summary, setSummary] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('summary'); // summary, list, generate, creator-history, policy-test
  const [filter, setFilter] = useState({ status: 'all' });

  // For generating new payouts
  const [generateForm, setGenerateForm] = useState({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    creators: '',
  });

  const [creatorHandle, setCreatorHandle] = useState('');
  const [creatorPayouts, setCreatorPayouts] = useState([]);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');
  const [policyForm, setPolicyForm] = useState({
    minUsd: 5,
    maxUsd: 50000,
    minSol: 0.001,
    maxSol: 50,
    requireAllowlist: false,
    walletAllowlist: '',
    network: 'devnet',
    treasuryWallet: '',
    notes: '',
  });
  const [testForm, setTestForm] = useState({
    walletAddress: '',
    amountSol: '0.01',
    amountUsd: '5',
    artifactId: '',
    artifactTitle: '',
    ritualId: '',
  });
  const [testResult, setTestResult] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ payoutId: '', txSignature: '' });
  const [confirmResult, setConfirmResult] = useState(null);
  const [readiness, setReadiness] = useState({ loading: false, data: null, error: '' });
  const [hotWallet, setHotWallet] = useState({ loading: false, publicKey: null, balanceSol: null, error: null, notConfigured: false });
  const [airdrop, setAirdrop] = useState({ loading: false, result: null, error: '' });
  const [directForm, setDirectForm] = useState({ recipientAddress: '', amountSol: '0.01', amountUsd: '5', memo: '' });
  const [directResult, setDirectResult] = useState(null);
  const [directSending, setDirectSending] = useState(false);

  useEffect(() => {
    fetchSummary();
    fetchPayouts();
    loadRuntimePolicy();
  }, []);

  const loadRuntimePolicy = async () => {
    try {
      const data = await fetchAdminRuntimeConfig();
      const policy = data?.config?.payoutPolicy;
      if (data?.ok && policy) {
        setPolicyForm({
          minUsd: policy.minUsd ?? 5,
          maxUsd: policy.maxUsd ?? 50000,
          minSol: policy.minSol ?? 0.001,
          maxSol: policy.maxSol ?? 50,
          requireAllowlist: Boolean(policy.requireAllowlist),
          walletAllowlist: Array.isArray(policy.walletAllowlist) ? policy.walletAllowlist.join('\n') : '',
          network: policy.network || 'devnet',
          treasuryWallet: policy.treasuryWallet || '',
          notes: policy.notes || '',
        });
      }
    } catch (err) {
      console.error('Error loading runtime payout policy:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await apiGet('/payouts/summary');
      setSummary(data.summary);
    } catch (err) {
      console.error('Error fetching payout summary:', err);
      setError(err.message);
    }
  };

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const queryStatus = filter.status !== 'all' ? `?status=${filter.status}` : '';
      const data = await apiGet(`/payouts${queryStatus}`);
      setPayouts(data.payouts);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching payouts:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchCreatorPayouts = async (handle) => {
    try {
      const data = await apiGet(`/payouts/creator/${handle}`);
      setCreatorPayouts(data.payouts);
    } catch (err) {
      console.error('Error fetching creator payouts:', err);
      setError(err.message);
    }
  };

  const handleGeneratePayouts = async () => {
    try {
      const body = {
        startDate: generateForm.startDate,
        endDate: generateForm.endDate,
        creators: generateForm.creators
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c.length > 0),
      };
      const result = await apiPost('/payouts/generate', body);
      alert(`✅ Created ${result.payouts.length} payout records`);
      setTab('list');
      fetchPayouts();
      fetchSummary();
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleProcessPayout = async (payoutId, action) => {
    try {
      const result = await apiPost(`/payouts/${payoutId}/process`, { action });
      alert(`✅ Payout marked as ${action}`);
      fetchPayouts();
      fetchSummary();
      setSelectedPayout(null);
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleSearchCreator = () => {
    if (creatorHandle.trim()) {
      fetchCreatorPayouts(creatorHandle);
    }
  };

  const formatCurrency = (cents) => `$${(cents / 100).toFixed(2)}`;

  const handleSavePolicy = async () => {
    setPolicySaving(true);
    setPolicyMessage('');
    try {
      const payload = {
        minUsd: Number(policyForm.minUsd || 5),
        maxUsd: Number(policyForm.maxUsd || 50000),
        minSol: Number(policyForm.minSol || 0.001),
        maxSol: Number(policyForm.maxSol || 50),
        requireAllowlist: policyForm.requireAllowlist,
        walletAllowlist: policyForm.walletAllowlist
          .split(/\r?\n|,/)
          .map((v) => v.trim())
          .filter(Boolean),
        network: policyForm.network,
        treasuryWallet: policyForm.treasuryWallet,
        notes: policyForm.notes,
      };
      const data = await updatePayoutRuntimePolicy(payload);
      if (data?.ok) {
        setPolicyMessage('✅ Runtime payout policy saved.');
      } else {
        setPolicyMessage(`❌ ${data?.error || 'Failed to save payout policy.'}`);
      }
    } catch (err) {
      setPolicyMessage(`❌ ${err?.response?.data?.error || err.message || 'Failed to save payout policy.'}`);
    } finally {
      setPolicySaving(false);
    }
  };

  const handleRequestTestPayout = async () => {
    try {
      const payload = {
        walletAddress: testForm.walletAddress,
        amountSol: Number(testForm.amountSol),
        amountUsd: Number(testForm.amountUsd),
        artifactId: testForm.artifactId,
        artifactTitle: testForm.artifactTitle,
        ritualId: testForm.ritualId,
      };
      const data = await requestSolanaTestPayout(payload);
      if (data?.ok) {
        setTestResult(data);
        if (data?.payout?.id) {
          setConfirmForm((prev) => ({ ...prev, payoutId: data.payout.id }));
        }
      } else {
        setTestResult({ ok: false, error: data?.error || 'Request failed' });
      }
    } catch (err) {
      setTestResult({ ok: false, error: err?.response?.data?.error || err.message || 'Request failed' });
    }
  };

  const handleConfirmTestPayout = async () => {
    try {
      const payload = {
        payoutId: confirmForm.payoutId,
        txSignature: confirmForm.txSignature,
      };
      const data = await confirmSolanaTestPayout(payload);
      setConfirmResult(data);
    } catch (err) {
      setConfirmResult({ ok: false, error: err?.response?.data?.error || err.message || 'Confirmation failed' });
    }
  };

  const loadHotWalletBalance = async () => {
    setHotWallet((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getHotWalletBalance();
      if (data?.ok) {
        setHotWallet({ loading: false, publicKey: data.publicKey, balanceSol: data.balanceSol, network: data.network, error: null, notConfigured: false });
      } else {
        setHotWallet({ loading: false, publicKey: null, balanceSol: null, error: data?.error || 'Failed', notConfigured: Boolean(data?.notConfigured) });
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Failed';
      setHotWallet({ loading: false, publicKey: null, balanceSol: null, error: msg, notConfigured: Boolean(err?.response?.data?.notConfigured) });
    }
  };

  const runReadinessCheck = async () => {
    setReadiness({ loading: true, data: null, error: '' });
    try {
      const data = await getDirectTransferReadiness();
      if (data?.ok) {
        setReadiness({ loading: false, data, error: '' });
      } else {
        setReadiness({ loading: false, data: null, error: data?.error || 'Readiness check failed' });
      }
    } catch (err) {
      setReadiness({ loading: false, data: null, error: err?.response?.data?.error || err.message || 'Readiness check failed' });
    }
  };

  const requestDevnetAirdrop = async () => {
    setAirdrop({ loading: true, result: null, error: '' });
    try {
      const data = await requestDevnetAirdropHotWallet({ amountSol: 1 });
      if (data?.ok) {
        setAirdrop({ loading: false, result: data, error: '' });
        loadHotWalletBalance();
        runReadinessCheck();
      } else {
        setAirdrop({ loading: false, result: null, error: data?.error || 'Airdrop request failed' });
      }
    } catch (err) {
      setAirdrop({ loading: false, result: null, error: err?.response?.data?.error || err.message || 'Airdrop request failed' });
    }
  };

  const handleDirectTransfer = async () => {
    setDirectSending(true);
    setDirectResult(null);
    try {
      const payload = {
        recipientAddress: directForm.recipientAddress,
        amountSol: Number(directForm.amountSol),
        amountUsd: Number(directForm.amountUsd) || null,
        memo: directForm.memo,
      };
      const data = await directSolanaTransfer(payload);
      setDirectResult(data);
    } catch (err) {
      setDirectResult({ ok: false, error: err?.response?.data?.error || err.message || 'Transfer failed', notConfigured: Boolean(err?.response?.data?.notConfigured) });
    } finally {
      setDirectSending(false);
    }
  };

  if (loading && !summary) {
    return <div className="payout-tab loading">Loading payout data...</div>;
  }

  return (
    <div className="payout-tab">
      <header className="payout-header">
        <h2>Payout Operations</h2>
        <p>
          Manage creator commissions with a clear lifecycle from draft to completed while maintaining audit-ready records for both
          traditional and crypto-enabled settlements.
        </p>
      </header>

      <section className="payout-playbook" aria-label="Crypto transition playbook">
        <h3>Step-by-Step: Business to Crypto Consignment Splits</h3>
        <p className="playbook-intro">
          Use this sequence every cycle so new team members can run payouts safely without skipping controls.
        </p>
        <ol className="playbook-steps">
          <li>
            <strong>Step 1 - Confirm split rules</strong>
            <span>Verify creator handles, commission percentages, and settlement method before generating any payout batch.</span>
          </li>
          <li>
            <strong>Step 2 - Choose settlement rail</strong>
            <span>Decide per creator if this cycle is fiat, crypto wallet transfer, or hybrid. Keep one method per payout record.</span>
          </li>
          <li>
            <strong>Step 3 - Generate draft payouts</strong>
            <span>Run Generate Payouts for the target date window, then review totals and creator history before processing.</span>
          </li>
          <li>
            <strong>Step 4 - Validate transaction evidence</strong>
            <span>For crypto transfers, capture the chain transaction hash and store it in payout notes for downstream verification.</span>
          </li>
          <li>
            <strong>Step 5 - Process then complete</strong>
            <span>Move records from Ready to Processing only when payment execution starts, then mark Completed after confirmation.</span>
          </li>
          <li>
            <strong>Step 6 - Reconcile and communicate</strong>
            <span>Refresh creator history, reconcile totals with accounting, and share payout confirmations with creators.</span>
          </li>
        </ol>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <div className="payout-tabs">
        <button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>
          📊 Summary
        </button>
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>
          📋 Payout List
        </button>
        <button className={tab === 'generate' ? 'active' : ''} onClick={() => setTab('generate')}>
          ➕ Generate Payouts
        </button>
        <button className={tab === 'creator-history' ? 'active' : ''} onClick={() => setTab('creator-history')}>
          👤 Creator History
        </button>
        <button className={tab === 'policy-test' ? 'active' : ''} onClick={() => setTab('policy-test')}>
          🧪 Policy + Test Transfer
        </button>
      </div>

      {/* SUMMARY TAB */}
      {tab === 'summary' && summary && (
        <div className="payout-summary">
          <div className="metrics-grid">
            {summary.byStatus?.map((status) => (
              <div key={status._id} className="metric-card">
                <div className="metric-label">{status._id.toUpperCase()}</div>
                <div className="metric-value">{status.count} payouts</div>
                <div className="metric-amount">{formatCurrency(status.total)}</div>
              </div>
            ))}
            <div className="metric-card highlight">
              <div className="metric-label">PENDING</div>
              <div className="metric-value">
                {summary.totals.totalPendingCents > 0 ? formatCurrency(summary.totals.totalPendingCents) : 'None'}
              </div>
              <div className="metric-sublabel">Ready to payout</div>
            </div>
            <div className="metric-card highlight">
              <div className="metric-label">COMPLETED</div>
              <div className="metric-value">{formatCurrency(summary.totals.totalProcessedCents)}</div>
              <div className="metric-sublabel">Already paid</div>
            </div>
          </div>

          <div className="top-creators">
            <h3>Top Creators by Pending Payout</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.pendingByCreator?.map((creator) => (
                  <tr key={creator._id}>
                    <td>{creator._id}</td>
                    <td className="amount">{formatCurrency(creator.pendingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LIST TAB */}
      {tab === 'list' && (
        <div className="payout-list">
          <div className="filter-bar">
            <select value={filter.status} onChange={(e) => setFilter({ status: e.target.value })}>
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <button onClick={fetchPayouts} className="btn-secondary">
              Refresh
            </button>
          </div>

          <div className="payouts-container">
            {payouts.length === 0 ? (
              <div className="empty-state">No payouts found. Generate payouts from the "Generate Payouts" tab.</div>
            ) : (
              payouts.map((payout) => (
                <div
                  key={payout._id}
                  className={`payout-card ${payout.status}`}
                  onClick={() => setSelectedPayout(selectedPayout?._id === payout._id ? null : payout)}
                >
                  <div className="card-header">
                    <div className="creator-info">
                      <div className="creator-name">{payout.creatorHandle}</div>
                      <div className="card-meta">
                        Period: {new Date(payout.payoutPeriod.startDate).toLocaleDateString()} —{' '}
                        {new Date(payout.payoutPeriod.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="status-badge" data-status={payout.status}>
                      {payout.status.toUpperCase()}
                    </div>
                  </div>

                  <div className="card-amounts">
                    <div className="amount-item">
                      <span>Commission:</span>
                      <strong>{formatCurrency(payout.totalCommissionsCents)}</strong>
                    </div>
                    <div className="amount-item">
                      <span>Net Payout:</span>
                      <strong>{formatCurrency(payout.netPayoutCents)}</strong>
                    </div>
                    <div className="amount-item secondary">
                      <span>Orders:</span>
                      <strong>{payout.orderCount}</strong>
                    </div>
                  </div>

                  {selectedPayout?._id === payout._id && (
                    <div className="card-detail">
                      <div className="detail-section">
                        <label>Payment Method: </label>
                        <span>{payout.paymentMethod}</span>
                      </div>
                      {payout.transactionId && (
                        <div className="detail-section">
                          <label>Transaction ID:</label>
                          <code>{payout.transactionId}</code>
                        </div>
                      )}
                      {payout.adminNotes && (
                        <div className="detail-section">
                          <label>Notes:</label>
                          <p>{payout.adminNotes}</p>
                        </div>
                      )}

                      <div className="action-buttons">
                        {payout.status === 'ready' && (
                          <button
                            className="btn-action process"
                            onClick={() => handleProcessPayout(payout._id, 'process')}
                          >
                            Mark Processing
                          </button>
                        )}
                        {payout.status === 'processing' && (
                          <button
                            className="btn-action complete"
                            onClick={() => handleProcessPayout(payout._id, 'complete')}
                          >
                            Mark Completed
                          </button>
                        )}
                        {['draft', 'ready'].includes(payout.status) && (
                          <button
                            className="btn-action fail"
                            onClick={() => handleProcessPayout(payout._id, 'fail')}
                          >
                            Mark Failed
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* GENERATE TAB */}
      {tab === 'generate' && (
        <div className="payout-generate">
          <div className="form-section">
            <h3>Generate New Payout Batch</h3>
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={generateForm.startDate}
                onChange={(e) => setGenerateForm({ ...generateForm, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={generateForm.endDate}
                onChange={(e) => setGenerateForm({ ...generateForm, endDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Creators (optional, comma-separated handles)</label>
              <textarea
                value={generateForm.creators}
                onChange={(e) => setGenerateForm({ ...generateForm, creators: e.target.value })}
                placeholder="zara_hussein, pasha_vii, artist_name"
                rows="3"
              />
            </div>
            <button className="btn-primary" onClick={handleGeneratePayouts}>
              Generate Payouts
            </button>
            <p className="form-help">
              This will aggregate all commissioned orders from the date range and create payout records for each creator.
            </p>
          </div>
        </div>
      )}

      {/* CREATOR HISTORY TAB */}
      {tab === 'creator-history' && (
        <div className="creator-history">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Enter creator handle (e.g., zara_hussein)"
              value={creatorHandle}
              onChange={(e) => setCreatorHandle(e.target.value)}
            />
            <button onClick={handleSearchCreator} className="btn-secondary">
              Search
            </button>
          </div>

          {creatorPayouts.length > 0 && (
            <div className="creator-results">
              <h3>{creatorHandle}'s Payout History</h3>
              <div className="creator-stats">
                <div className="stat-box">
                  <div className="stat-label">Total Earned</div>
                  <div className="stat-value">{formatCurrency(creatorPayouts.reduce((sum, p) => sum + p.netPayoutCents, 0))}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Already Paid</div>
                  <div className="stat-value">
                    {formatCurrency(creatorPayouts.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.netPayoutCents, 0))}
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Pending</div>
                  <div className="stat-value">
                    {formatCurrency(creatorPayouts.filter((p) => ['draft', 'ready'].includes(p.status)).reduce((sum, p) => sum + p.netPayoutCents, 0))}
                  </div>
                </div>
              </div>

              <table className="data-table full-width">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Completed At</th>
                  </tr>
                </thead>
                <tbody>
                  {creatorPayouts.map((payout) => (
                    <tr key={payout._id}>
                      <td>
                        {new Date(payout.payoutPeriod.startDate).toLocaleDateString()} —{' '}
                        {new Date(payout.payoutPeriod.endDate).toLocaleDateString()}
                      </td>
                      <td className="amount">{formatCurrency(payout.netPayoutCents)}</td>
                      <td>
                        <span className={`status-badge ${payout.status}`}>{payout.status.toUpperCase()}</span>
                      </td>
                      <td>{payout.completedAt ? new Date(payout.completedAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'policy-test' && (
        <div className="payout-policy-test">
          <div className="policy-card">
            <h3>⚡ Launch Readiness Check</h3>
            <p>
              Run this before any one-click send. It verifies policy range, wallet key setup, wallet balance,
              and RPC connectivity from the live backend environment.
            </p>
            <div className="policy-actions">
              <button className="btn-secondary" onClick={handleSavePolicy} disabled={policySaving}>
                {policySaving ? 'Saving policy...' : 'Save Policy First'}
              </button>
              <button className="btn-primary" onClick={runReadinessCheck} disabled={readiness.loading}>
                {readiness.loading ? 'Running checks...' : 'Run Readiness Check'}
              </button>
              <button className="btn-secondary" onClick={loadHotWalletBalance} disabled={hotWallet.loading}>
                {hotWallet.loading ? 'Checking wallet...' : 'Check Wallet Balance'}
              </button>
              {policyForm.network === 'devnet' ? (
                <button className="btn-secondary" onClick={requestDevnetAirdrop} disabled={airdrop.loading}>
                  {airdrop.loading ? 'Requesting airdrop...' : 'Request Devnet Airdrop'}
                </button>
              ) : null}
            </div>

            {readiness.error ? (
              <div className="policy-msg">❌ {readiness.error}</div>
            ) : null}

            {readiness.data ? (
              <div className={`policy-msg ${readiness.data.ready ? 'direct-success' : ''}`}>
                <div>
                  {readiness.data.ready ? '✅ Ready for one-click sends' : '⚠️ Not ready yet'}
                </div>
                <div>Network: <strong>{readiness.data.network}</strong></div>
                <div>RPC: <span>{readiness.data.rpcUrl}</span></div>
                {Array.isArray(readiness.data.checks) && readiness.data.checks.map((check) => (
                  <div key={check.key} className="readiness-item">
                    <strong>{check.ok ? '✅' : '❌'} {check.label}</strong>
                    <div className="readiness-detail">{check.detail}</div>
                  </div>
                ))}
                {Array.isArray(readiness.data.notes) && readiness.data.notes.length > 0 && (
                  <div className="readiness-notes">
                    {readiness.data.notes.map((note) => (
                      <div key={note}>• {note}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {airdrop.error ? (
              <div className="policy-msg">❌ {airdrop.error}</div>
            ) : null}

            {airdrop.result?.ok ? (
              <div className="policy-msg direct-success">
                <div>✅ Devnet airdrop received: {airdrop.result.airdropAmountSol} SOL</div>
                <div>Wallet: <code>{airdrop.result.hotWalletPublicKey}</code></div>
                <div>Balance: <strong>{airdrop.result.balanceSol} SOL</strong></div>
                <div>
                  <a href={airdrop.result.explorerUrl} target="_blank" rel="noopener noreferrer" className="explorer-link">
                    View Airdrop Transaction ↗
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          <div className="policy-card">
            <h3>Runtime Payout Policy</h3>
            <p>
              Set the allowed transfer range. Current intended range can be configured from $5 up to $50,000,
              but transfers are only from funded treasury wallets and still require valid on-chain signatures.
            </p>
            <div className="policy-grid">
              <label>
                Min USD
                <input type="number" value={policyForm.minUsd} onChange={(e) => setPolicyForm((prev) => ({ ...prev, minUsd: e.target.value }))} />
              </label>
              <label>
                Max USD
                <input type="number" value={policyForm.maxUsd} onChange={(e) => setPolicyForm((prev) => ({ ...prev, maxUsd: e.target.value }))} />
              </label>
              <label>
                Min SOL
                <input type="number" step="0.000001" value={policyForm.minSol} onChange={(e) => setPolicyForm((prev) => ({ ...prev, minSol: e.target.value }))} />
              </label>
              <label>
                Max SOL
                <input type="number" step="0.000001" value={policyForm.maxSol} onChange={(e) => setPolicyForm((prev) => ({ ...prev, maxSol: e.target.value }))} />
              </label>
              <label>
                Network
                <select value={policyForm.network} onChange={(e) => setPolicyForm((prev) => ({ ...prev, network: e.target.value }))}>
                  <option value="devnet">devnet</option>
                  <option value="testnet">testnet</option>
                  <option value="mainnet-beta">mainnet-beta</option>
                </select>
              </label>
              <label>
                Treasury Wallet
                <input type="text" value={policyForm.treasuryWallet} onChange={(e) => setPolicyForm((prev) => ({ ...prev, treasuryWallet: e.target.value }))} />
              </label>
              <label className="policy-checkbox">
                <input
                  type="checkbox"
                  checked={policyForm.requireAllowlist}
                  onChange={(e) => setPolicyForm((prev) => ({ ...prev, requireAllowlist: e.target.checked }))}
                />
                Require allowlist
              </label>
              <label className="policy-span-2">
                Wallet Allowlist (comma or newline separated)
                <textarea rows="3" value={policyForm.walletAllowlist} onChange={(e) => setPolicyForm((prev) => ({ ...prev, walletAllowlist: e.target.value }))} />
              </label>
              <label className="policy-span-2">
                Notes
                <textarea rows="2" value={policyForm.notes} onChange={(e) => setPolicyForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </label>
            </div>
            <div className="policy-actions">
              <button className="btn-secondary" onClick={loadRuntimePolicy}>Reload Policy</button>
              <button className="btn-primary" onClick={handleSavePolicy} disabled={policySaving}>
                {policySaving ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
            {policyMessage ? <div className="policy-msg">{policyMessage}</div> : null}
          </div>

          <div className="policy-card">
            <h3>Request Test Transfer</h3>
            <p>Create a test payout request, then confirm it with the blockchain tx signature.</p>
            <div className="policy-grid">
              <label>
                Recipient Wallet
                <input type="text" value={testForm.walletAddress} onChange={(e) => setTestForm((prev) => ({ ...prev, walletAddress: e.target.value }))} />
              </label>
              <label>
                Amount USD
                <input type="number" value={testForm.amountUsd} onChange={(e) => setTestForm((prev) => ({ ...prev, amountUsd: e.target.value }))} />
              </label>
              <label>
                Amount SOL
                <input type="number" step="0.000001" value={testForm.amountSol} onChange={(e) => setTestForm((prev) => ({ ...prev, amountSol: e.target.value }))} />
              </label>
              <label>
                Artifact ID
                <input type="text" value={testForm.artifactId} onChange={(e) => setTestForm((prev) => ({ ...prev, artifactId: e.target.value }))} />
              </label>
              <label>
                Artifact Title
                <input type="text" value={testForm.artifactTitle} onChange={(e) => setTestForm((prev) => ({ ...prev, artifactTitle: e.target.value }))} />
              </label>
              <label>
                Ritual ID
                <input type="text" value={testForm.ritualId} onChange={(e) => setTestForm((prev) => ({ ...prev, ritualId: e.target.value }))} />
              </label>
            </div>
            <div className="policy-actions">
              <button className="btn-primary" onClick={handleRequestTestPayout}>Request Test Payout</button>
            </div>
            {testResult && (
              <div className="policy-msg">
                {testResult.ok
                  ? `✅ Requested. Payout ID: ${testResult?.payout?.id || 'n/a'}`
                  : `❌ ${testResult.error || 'Request failed'}`}
              </div>
            )}
          </div>

          <div className="policy-card">
            <h3>🔑 Hot Wallet Status</h3>
            <p>
              The server holds a Solana keypair whose private key you store as <strong>SOLANA_HOT_WALLET_PRIVATE_KEY</strong> in
              your Vercel environment variables. Once set and the wallet is funded, one click sends SOL directly to any address.
            </p>
            {hotWallet.notConfigured && (
              <div className="policy-msg">
                ⚠️ Hot wallet key not set. Add <strong>SOLANA_HOT_WALLET_PRIVATE_KEY</strong> to Vercel → Project → Settings → Environment Variables,
                then redeploy. Paste your Phantom JSON export array or base58 private key.
              </div>
            )}
            {hotWallet.publicKey && (
              <div className="direct-balance-row">
                <span className="direct-balance-label">Address:</span>
                <code className="direct-balance-val">{hotWallet.publicKey}</code>
                <span className="direct-balance-label">Balance:</span>
                <strong className="direct-balance-val">{hotWallet.balanceSol !== null ? `${hotWallet.balanceSol} SOL` : '—'}</strong>
                <span className="direct-balance-label">Network:</span>
                <span className="direct-balance-val">{hotWallet.network}</span>
              </div>
            )}
            {hotWallet.error && !hotWallet.notConfigured && (
              <div className="policy-msg">❌ {hotWallet.error}</div>
            )}
            <div className="policy-actions">
              <button className="btn-secondary" onClick={loadHotWalletBalance} disabled={hotWallet.loading}>
                {hotWallet.loading ? 'Checking...' : 'Check Wallet Balance'}
              </button>
            </div>
          </div>

          <div className="policy-card">
            <h3>🚀 Send SOL Directly to Wallet</h3>
            <p>
              Signs and broadcasts instantly from the server hot wallet — no manual wallet step needed.
              All policy limits apply. Start on <strong>devnet</strong> to test, then switch to <strong>mainnet-beta</strong>.
            </p>
            <div className="policy-grid">
              <label className="policy-span-2">
                Recipient Wallet Address (your Phantom)
                <input
                  type="text"
                  placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD..."
                  value={directForm.recipientAddress}
                  onChange={(e) => setDirectForm((prev) => ({ ...prev, recipientAddress: e.target.value }))}
                />
              </label>
              <label>
                Amount SOL
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={directForm.amountSol}
                  onChange={(e) => setDirectForm((prev) => ({ ...prev, amountSol: e.target.value }))}
                />
              </label>
              <label>
                Approx USD (for records)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={directForm.amountUsd}
                  onChange={(e) => setDirectForm((prev) => ({ ...prev, amountUsd: e.target.value }))}
                />
              </label>
              <label className="policy-span-2">
                Memo (optional)
                <input
                  type="text"
                  placeholder="e.g. PVA ritual payment"
                  value={directForm.memo}
                  onChange={(e) => setDirectForm((prev) => ({ ...prev, memo: e.target.value }))}
                />
              </label>
            </div>
            <div className="policy-actions">
              <button className="btn-primary btn-send" onClick={handleDirectTransfer} disabled={directSending || !directForm.recipientAddress}>
                {directSending ? '⏳ Sending...' : '🚀 Send SOL Now'}
              </button>
            </div>
            {directResult && directResult.ok && (
              <div className="policy-msg direct-success">
                <div>✅ Sent! Status: <strong>{directResult.confirmationStatus}</strong></div>
                <div>Signature: <code>{directResult.signature}</code></div>
                <div>
                  <a href={directResult.explorerUrl} target="_blank" rel="noopener noreferrer" className="explorer-link">
                    View on Solana Explorer ↗
                  </a>
                </div>
              </div>
            )}
            {directResult && !directResult.ok && (
              <div className="policy-msg">
                ❌ {directResult.error}
                {directResult.notConfigured && (
                  <span> — Add <strong>SOLANA_HOT_WALLET_PRIVATE_KEY</strong> to Vercel env vars and redeploy.</span>
                )}
              </div>
            )}
          </div>

          <div className="policy-card">
            <h3>Confirm Test Transfer</h3>
            <div className="policy-grid">
              <label>
                Payout ID
                <input type="text" value={confirmForm.payoutId} onChange={(e) => setConfirmForm((prev) => ({ ...prev, payoutId: e.target.value }))} />
              </label>
              <label className="policy-span-2">
                Transaction Signature
                <input type="text" value={confirmForm.txSignature} onChange={(e) => setConfirmForm((prev) => ({ ...prev, txSignature: e.target.value }))} />
              </label>
            </div>
            <div className="policy-actions">
              <button className="btn-primary" onClick={handleConfirmTestPayout}>Confirm On-Chain Status</button>
            </div>
            {confirmResult && (
              <div className="policy-msg">
                {confirmResult.ok
                  ? `✅ Status: ${confirmResult?.payout?.status || 'unknown'} (${confirmResult?.rpc?.confirmationStatus || 'n/a'})`
                  : `❌ ${confirmResult.error || 'Confirmation failed'}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
