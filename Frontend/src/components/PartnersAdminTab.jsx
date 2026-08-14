import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';
import './PartnersAdminTab.css';

/**
 * PartnersAdminTab
 * Admin surface for the partners directory:
 *  - review partner applications (approve / reject)
 *  - see the live approved directory
 * Backed by GET /api/partners/submissions, POST /api/partners/submissions/:id/approve,
 * POST /api/partners/submissions/:id/reject, and GET /api/partners/profiles.
 */
export default function PartnersAdminTab() {
  const [filter, setFilter] = useState({ status: 'all', q: '' });
  const [submissions, setSubmissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status !== 'all') params.set('status', filter.status);
      if (filter.q.trim()) params.set('q', filter.q.trim());
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiGet(`/partners/submissions${query}`);
      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load partner applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const data = await apiGet('/partners/profiles');
      setProfiles(Array.isArray(data.partners) ? data.partners : []);
    } catch (_err) {
      // Profile list is supplementary; do not block the applications panel.
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (id, action) => {
    setMessage('');
    setBusyId(id);
    try {
      const data = await apiPost(`/partners/submissions/${id}/${action}`, {});
      if (data?.ok) {
        if (data?.pageUrl) {
          setMessage(
            `${action === 'approve' ? 'Approved' : 'Rejected'}. ${action === 'approve' ? `Their page is live: ${data.pageUrl}` : 'Application closed.'}`,
          );
        } else {
          setMessage(data?.message || `Application ${action}d.`);
        }
        fetchSubmissions();
        fetchProfiles();
      } else {
        setMessage(data?.error || data?.message || `${action} failed`);
      }
    } catch (err) {
      setMessage(`Error: ${err?.message || 'Request failed'}`);
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="partners-tab" role="tabpanel" id="partners-panel">
      <header className="partners-header">
        <h2>Partners Directory</h2>
        <p>
          Applications land here from the apply form. Approve to instantly publish a live
          MySpace-style page and email the owner their private edit link.
        </p>
      </header>

      {message ? <div className="partners-message">{message}</div> : null}
      {error ? <div className="partners-error">{error}</div> : null}

      <div className="partners-filterbar">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="search"
          placeholder="Search name, email, or company"
          value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
        />
        <button className="partners-btn secondary" onClick={fetchSubmissions}>
          Refresh
        </button>
        <span className="partners-count">{total} application{total === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <div className="partners-loading">Loading applications...</div>
      ) : submissions.length === 0 ? (
        <div className="partners-empty">No applications found. New ones appear here instantly.</div>
      ) : (
        <table className="partners-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Type</th>
              <th>Website</th>
              <th>Message</th>
              <th>Received</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s._id}>
                <td>
                  <div>{s.company || s.name}</div>
                  <div className="partners-sub">{s.name} · {s.email}</div>
                </td>
                <td>{s.businessType || '—'}</td>
                <td>
                  {s.website ? (
                    <a href={s.website} target="_blank" rel="noopener noreferrer" className="partners-link">
                      {s.website.replace(/^https?:\/\//, '').slice(0, 30)}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="partners-msg" title={s.message}>
                  {String(s.message || '').slice(0, 80) || '—'}
                </td>
                <td>{formatDate(s.createdAt)}</td>
                <td>
                  <span className={`partners-status ${s.status}`}>{s.status.toUpperCase()}</span>
                </td>
                <td>
                  <div className="partners-actions">
                    {s.status === 'approved' ? (
                      <span className="partners-done">Live</span>
                    ) : (
                      <>
                        <button
                          className="partners-btn primary"
                          disabled={busyId === s._id}
                          onClick={() => act(s._id, 'approve')}
                        >
                          {busyId === s._id ? 'Working…' : 'Approve'}
                        </button>
                        {s.status !== 'rejected' ? (
                          <button
                            className="partners-btn warn"
                            disabled={busyId === s._id}
                            onClick={() => act(s._id, 'reject')}
                          >
                            Reject
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="partners-live">
        <h3>Live directory ({profiles.length})</h3>
        {profiles.length === 0 ? (
          <p className="partners-empty">No approved partner pages yet.</p>
        ) : (
          <ul className="partners-live-list">
            {profiles.map((p) => (
              <li key={p.slug}>
                <a
                  href={`/partners/${p.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="partners-link"
                >
                  {p.businessName}
                </a>
                <span className="partners-sub">· {p.slug}</span>
                <span className={`partners-status ${p.status}`}>{p.status.toUpperCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
