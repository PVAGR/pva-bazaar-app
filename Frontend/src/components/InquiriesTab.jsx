import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchItemInquiries,
  releaseItemInquiryReservation,
  updateItemInquiryStatus,
} from '../lib/api';
import { SkeletonList } from '../components/SkeletonLoader.jsx';

export default function InquiriesTab({ onNavigateTab }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    new: 0,
    contacted: 0,
    reserved: 0,
    closed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadInquiries = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const response = await fetchItemInquiries({
          limit: 100,
          status: statusFilter || '',
          q: query || '',
        });
        if (!response.ok) {
          if (!silent) setError(response.error || 'Failed to fetch inquiries');
          return;
        }
        setItems(Array.isArray(response.items) ? response.items : []);
        setSummary(response.summary || { new: 0, contacted: 0, reserved: 0, closed: 0, total: 0 });
        if (!silent) setError('');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [statusFilter, query],
  );

  useEffect(() => {
    loadInquiries();
    const timerApi = typeof globalThis !== 'undefined' ? globalThis : null;
    const id = timerApi?.setInterval
      ? timerApi.setInterval(() => loadInquiries({ silent: true }), 30000)
      : null;
    return () => {
      if (id && timerApi?.clearInterval) timerApi.clearInterval(id);
    };
  }, [loadInquiries]);

  const setFlash = (nextSuccess = '', nextError = '') => {
    setSuccess(nextSuccess);
    setError(nextError);
    const timerApi = typeof globalThis !== 'undefined' ? globalThis : null;
    if (timerApi?.setTimeout) {
      timerApi.setTimeout(() => {
        setSuccess('');
        setError('');
      }, 4000);
    }
  };

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    const response = await updateItemInquiryStatus(id, { status });
    setUpdatingId('');
    if (!response.ok) {
      setFlash('', response.error || 'Failed to update inquiry status');
      return;
    }
    setFlash(`Inquiry updated to ${status}.`, '');
    loadInquiries({ silent: true });
  };

  const handleRelease = async (id) => {
    setUpdatingId(id);
    const response = await releaseItemInquiryReservation(id);
    setUpdatingId('');
    if (!response.ok) {
      setFlash('', response.error || 'Failed to release reservation');
      return;
    }
    setFlash('Reservation released successfully.', '');
    loadInquiries({ silent: true });
  };

  return (
    <div className="inquiries-tab" role="tabpanel" id="inquiries-panel">
      <div className="tab-header">
        <h2>Inbox Inquiries</h2>
        <p className="tab-description">
          Manage incoming B2B requests, reservation states, and follow-up actions.
        </p>
      </div>

      <div className="inquiry-kpis">
        <div className="inquiry-kpi">
          <span>New</span>
          <strong>{summary.new || 0}</strong>
        </div>
        <div className="inquiry-kpi">
          <span>Contacted</span>
          <strong>{summary.contacted || 0}</strong>
        </div>
        <div className="inquiry-kpi">
          <span>Reserved</span>
          <strong>{summary.reserved || 0}</strong>
        </div>
        <div className="inquiry-kpi">
          <span>Total</span>
          <strong>{summary.total || 0}</strong>
        </div>
      </div>

      <div className="inquiry-toolbar">
        <input
          type="text"
          placeholder="Search email, SKU, item, message..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="new">new</option>
          <option value="contacted">contacted</option>
          <option value="reserved">reserved</option>
          <option value="closed">closed</option>
        </select>
        <button type="button" onClick={() => loadInquiries()} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="error-message">{error}</div> : null}
      {success ? <div className="success-message">{success}</div> : null}

      {loading ? <SkeletonList count={5} /> : null}

      {!loading && items.length === 0 ? <p className="empty-message">No inquiries found.</p> : null}

      {!loading && items.length > 0 ? (
        <div className="inquiry-grid">
          {items.map((row) => (
            <article className="inquiry-card" key={row.id}>
              <div className="inquiry-card-top">
                <strong>{row.itemName || 'Unnamed item'}</strong>
                <span className={`inquiry-status status-${row.status}`}>{row.status}</span>
              </div>
              <p className="inquiry-meta">
                {row.requesterName} ({row.requesterEmail})
                {row.requesterCompany ? ` - ${row.requesterCompany}` : ''}
              </p>
              <p className="inquiry-meta">
                SKU: {row.itemSku || 'n/a'} | Qty: {row.quantityRequested} | {row.requestType}
              </p>
              <p className="inquiry-message">{row.message}</p>
              <div className="inquiry-links">
                <a
                  href={`/#/marketplace/${encodeURIComponent(row.itemSlug || row.artifactId || '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View public item
                </a>
                <button type="button" onClick={() => onNavigateTab && onNavigateTab('marketplace')}>
                  Open marketplace tab
                </button>
              </div>
              <div className="inquiry-actions">
                <select
                  value={row.status}
                  onChange={(e) => handleStatusChange(row.id, e.target.value)}
                  disabled={updatingId === row.id}
                >
                  <option value="new">new</option>
                  <option value="contacted">contacted</option>
                  <option value="reserved">reserved</option>
                  <option value="closed">closed</option>
                </select>
                {row.reservationApplied ? (
                  <button
                    type="button"
                    onClick={() => handleRelease(row.id)}
                    disabled={updatingId === row.id}
                  >
                    Release reservation
                  </button>
                ) : null}
                <span className="inquiry-time">{new Date(row.createdAt).toLocaleString()}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
