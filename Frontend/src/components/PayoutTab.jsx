import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';
import './PayoutTab.css';

export default function PayoutTab() {
  const [summary, setSummary] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('summary'); // summary, list, generate, creator-history
  const [filter, setFilter] = useState({ status: 'all' });

  // For generating new payouts
  const [generateForm, setGenerateForm] = useState({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    creators: '',
  });

  const [creatorHandle, setCreatorHandle] = useState('');
  const [creatorPayouts, setCreatorPayouts] = useState([]);

  useEffect(() => {
    fetchSummary();
    fetchPayouts();
  }, []);

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

  if (loading && !summary) {
    return <div className="payout-tab loading">Loading payout data...</div>;
  }

  return (
    <div className="payout-tab">
      <style>{`
        .payout-tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 2px solid var(--border-color); }
        .payout-tabs button { padding: 10px 16px; background: none; border: none; color: var(--text-secondary); cursor: pointer; font-weight: 500; }
        .payout-tabs button.active { color: var(--accent-color); border-bottom: 3px solid var(--accent-color); }
      `}</style>

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
    </div>
  );
}
