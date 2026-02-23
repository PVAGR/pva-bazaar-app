import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import HelpTip from '../components/HelpTip.jsx';
import { apiFetch } from '../lib/api';
import '../styles/admin-common.css';
import './DealJoinPage.css';

export default function DealJoinPage() {
  const location = useLocation();
  const token = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('token') || '';
  }, [location.search]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deal, setDeal] = useState(null);
  const [message, setMessage] = useState('');
  const [evidenceDrafts, setEvidenceDrafts] = useState({});

  async function authedFetch(path, options = {}) {
    return apiFetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Missing join token.');
      return;
    }
    setLoading(true);
    setError('');
    authedFetch('/deals/join', { method: 'GET' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok || !data?.item) throw new Error(data?.error || 'Failed to load deal');
        setDeal(data.item);
      })
      .catch((e) => setError(e.message || 'Failed to load deal'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function sendMessage() {
    const text = message.trim();
    if (!text || !deal?._id) return;
    setError('');
    try {
      const res = await authedFetch(`/deals/${deal._id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.item) throw new Error(data?.error || 'Failed to send message');
      setDeal(data.item);
      setMessage('');
    } catch (e) {
      setError(e.message || 'Failed to send message');
    }
  }

  async function submitEvidence(milestoneId) {
    if (!deal?._id || !milestoneId) return;
    const evidenceValue = String(evidenceDrafts[milestoneId] || '').trim();
    if (!evidenceValue) return;
    setError('');
    try {
      const res = await authedFetch(`/deals/${deal._id}/milestones/${milestoneId}/evidence`, {
        method: 'POST',
        body: JSON.stringify({ evidenceValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.item) throw new Error(data?.error || 'Failed to submit evidence');
      setDeal(data.item);
      setEvidenceDrafts((prev) => ({ ...prev, [milestoneId]: '' }));
    } catch (e) {
      setError(e.message || 'Failed to submit evidence');
    }
  }

  return (
    <div className="dealJoin admin-page authenticated dark-theme">
      <header className="admin-header dealJoinHeader">
        <div>
          <h1>🤝 Deal join</h1>
          <p className="muted">
            You can message and submit milestone evidence using this invite link.
            <HelpTip
              title="Privacy note"
              body="This link acts like a key. Don’t post it publicly."
              example="Send privately to the counterparty"
            />
          </p>
        </div>
        <div className="dealJoinActions">
          <Link to="/" className="btn ghost">
            Home
          </Link>
          <Link to="/login" className="btn ghost">
            Login
          </Link>
        </div>
      </header>

      <main className="dealJoinMain">
        {loading ? <div className="muted">Loading…</div> : null}
        {error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : null}

        {deal ? (
          <>
            <section className="card">
              <h2>{deal.title}</h2>
              {deal.description ? <div className="muted">{deal.description}</div> : null}
            </section>

            <section className="card">
              <h3>Milestones</h3>
              {(deal.milestones || []).length ? (
                <div className="milestones">
                  {deal.milestones.map((m) => (
                    <div key={m._id} className="milestone">
                      <div className="milestone-title">{m.title}</div>
                      <div className="muted small">evidence: {m.evidenceType || 'none'}</div>
                      {m.evidenceValue ? <div className="muted small">current: {m.evidenceValue}</div> : null}
                      {m.evidenceType && m.evidenceType !== 'none' ? (
                        <div className="row">
                          <input
                            value={evidenceDrafts[m._id] ?? ''}
                            onChange={(e) => setEvidenceDrafts((prev) => ({ ...prev, [m._id]: e.target.value }))}
                            placeholder="Evidence value"
                          />
                          <button className="btn ghost" type="button" onClick={() => submitEvidence(m._id)}>
                            Submit evidence
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">No milestones.</div>
              )}
            </section>

            <section className="card">
              <h3>Messages</h3>
              <div className="messages">
                {(deal.messages || []).slice(-50).map((msg, idx) => (
                  <div key={msg._id || idx} className="message">
                    <div className="muted small">
                      {msg.author || 'system'} · {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                    </div>
                    <div className="message-text">{msg.text}</div>
                  </div>
                ))}
              </div>
              <div className="row">
                <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a message..." />
                <button className="btn primary" type="button" onClick={sendMessage}>
                  Send
                </button>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

