import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';
import './ReferralTab.css';

/**
 * ReferralTab
 * Admin surface for the automatic referral / kickback program:
 * list codes, search, suspend/reactivate, and adjust commission rates.
 * Backed by GET /api/referrals, POST /api/referrals/:id/status, POST /api/referrals/:id/rate.
 */
export default function ReferralTab() {
  const [filter, setFilter] = useState({ status: 'all', q: '' });
  const [referrals, setReferrals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null); // _id in rate-edit mode

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status !== 'all') params.set('status', filter.status);
      if (filter.q.trim()) params.set('q', filter.q.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiGet(`/referrals${query}`);
      setReferrals(Array.isArray(data.referrals) ? data.referrals : []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeStatus = async (id, status) => {
    setMessage('');
    try {
      const data = await apiPost(`/referrals/${id}/status`, { status });
      setMessage(data?.ok ? `Referral ${status}.` : data?.error || 'Update failed');
      fetchReferrals();
    } catch (err) {
      setMessage(`Error: ${err?.message || 'Request failed'}`);
    }
  };

  const saveRate = async (id) => {
    setMessage('');
    try {
      const data = await apiPost(`/referrals/${id}/rate`, { commissionRate: Number(editing?.rate) });
      setMessage(data?.ok ? 'Commission rate updated.' : data?.error || 'Update failed');
      setEditing(null);
      fetchReferrals();
    } catch (err) {
      setMessage(`Error: ${err?.message || 'Request failed'}`);
    }
  };

  const formatCents = (cents) => `$${(Number(cents) / 100).toFixed(2)}`;
  const percent = (rate) => `${Math.round(Number(rate || 0) * 100)}%`;

  return (
    <div className="referral-tab" role="tabpanel" id="referrals-panel">
      <header className="referral-header">
        <h2>Referral Program</h2>
        <p>
          Automatic kickbacks: every paid order attributed to a referral code accrues a commission on the
          code's record and creates a Payout row for settlement in the Payouts tab.
        </p>
      </header>

      {message ? <div className="referral-message">{message}</div> : null}
      {error ? <div className="referral-error">{error}</div> : null}

      <div className="referral-filterbar">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <input
          type="search"
          placeholder="Search email, code, or name"
          value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
        />
        <button className="referral-btn secondary" onClick={fetchReferrals}>
          Refresh
        </button>
        <span className="referral-count">{total} code{total === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <div className="referral-loading">Loading referral codes...</div>
      ) : referrals.length === 0 ? (
        <div className="referral-empty">No referral codes found. Codes are created when someone registers on /referral.</div>
      ) : (
        <table className="referral-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Email / Name</th>
              <th>Rate</th>
              <th>Sales</th>
              <th>Pending</th>
              <th>Lifetime</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((r) => (
              <tr key={r._id}>
                <td className="referral-code-cell">
                  <strong>{r.code}</strong>
                </td>
                <td>
                  <div>{r.email}</div>
                  {r.name ? <div className="referral-sub">{r.name}</div> : null}
                </td>
                <td>
                  {editing?._id === r._id ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="0.5"
                      value={editing.rate}
                      onChange={(e) => setEditing({ _id: r._id, rate: e.target.value })}
                      aria-label={`Commission rate for ${r.code}`}
                    />
                  ) : (
                    percent(r.commissionRate)
                  )}
                </td>
                <td>{r.sales || 0}</td>
                <td className="referral-amount">{formatCents(r.pendingCents)}</td>
                <td className="referral-amount">{formatCents(r.totalCommissionsCents)}</td>
                <td>
                  <span className={`referral-status ${r.status}`}>{r.status.toUpperCase()}</span>
                </td>
                <td>
                  <div className="referral-actions">
                    {editing?._id === r._id ? (
                      <>
                        <button className="referral-btn primary" onClick={() => saveRate(r._id)}>
                          Save
                        </button>
                        <button className="referral-btn" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="referral-btn" onClick={() => setEditing({ _id: r._id, rate: r.commissionRate ?? 0.1 })}>
                          Set rate
                        </button>
                        {r.status === 'active' ? (
                          <button className="referral-btn warn" onClick={() => changeStatus(r._id, 'suspended')}>
                            Suspend
                          </button>
                        ) : (
                          <button className="referral-btn primary" onClick={() => changeStatus(r._id, 'active')}>
                            Reactivate
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}