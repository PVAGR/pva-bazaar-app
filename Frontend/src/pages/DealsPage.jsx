import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost, apiPut } from '../lib/api';
import './DealsPage.css';

function safeJsonParse(v, fallback) {
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export default function DealsPage() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('archive-theme');
    return saved ? saved === 'dark' : true;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState(null);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    counterpartyName: '',
    counterpartyCountry: '',
    counterpartyWallet: '',
    totalAmount: '',
    currency: 'USD',
    paymentsJson: safeJsonParse(
      JSON.stringify(
        [
          { label: 'Deposit', amount: 0, currency: 'USD', status: 'pending' },
          { label: 'Mid', amount: 0, currency: 'USD', status: 'pending' },
          { label: 'Final', amount: 0, currency: 'USD', status: 'pending' },
        ],
        null,
        2
      ),
      []
    ),
    milestonesJson: safeJsonParse(
      JSON.stringify(
        [
          { title: 'Tracking number provided', evidenceType: 'tracking_number', status: 'pending' },
          { title: 'Delivery confirmed', evidenceType: 'message', status: 'pending' },
        ],
        null,
        2
      ),
      []
    ),
  });

  const [newMessage, setNewMessage] = useState('');

  async function loadDeals() {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/deals', { params: { limit: 50 } });
      if (res?.ok && Array.isArray(res.items)) {
        setItems(res.items);
      } else {
        setItems([]);
        setError(res?.error || res?.message || 'Failed to load deals');
      }
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }

  async function loadDeal(id) {
    if (!id) return;
    setError('');
    setSelected(null);
    try {
      const res = await apiGet(`/deals/${id}`);
      if (res?.ok && res.item) setSelected(res.item);
      else setError(res?.error || res?.message || 'Failed to load deal');
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to load deal');
    }
  }

  useEffect(() => {
    loadDeals();
  }, []);

  useEffect(() => {
    if (selectedId) loadDeal(selectedId);
  }, [selectedId]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const payments = Array.isArray(draft.paymentsJson) ? draft.paymentsJson : [];
      const milestones = Array.isArray(draft.milestonesJson) ? draft.milestonesJson : [];

      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        counterparty: {
          name: draft.counterpartyName.trim(),
          country: draft.counterpartyCountry.trim(),
          walletAddress: draft.counterpartyWallet.trim(),
        },
        totalAmount: Number(draft.totalAmount || 0),
        currency: draft.currency || 'USD',
        payments,
        milestones,
      };
      const res = await apiPost('/deals', payload);
      if (!res?.ok || !res.item) throw new Error(res?.error || res?.message || 'Create failed');
      await loadDeals();
      setSelectedId(res.item._id);
      setDraft((prev) => ({ ...prev, title: '', description: '' }));
    } catch (e2) {
      const serverMsg = e2?.response?.data?.error || e2?.response?.data?.message;
      setError(serverMsg || e2.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function handleAddMessage() {
    if (!selected?._id) return;
    const text = newMessage.trim();
    if (!text) return;
    setError('');
    try {
      const res = await apiPost(`/deals/${selected._id}/messages`, { text });
      if (!res?.ok || !res.item) throw new Error(res?.error || res?.message || 'Failed to add message');
      setSelected(res.item);
      setNewMessage('');
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to add message');
    }
  }

  async function handleMarkMilestoneCompleted(idx) {
    if (!selected?._id) return;
    const next = { ...(selected || {}) };
    const milestones = Array.isArray(next.milestones) ? [...next.milestones] : [];
    const m = milestones[idx];
    if (!m) return;
    milestones[idx] = { ...m, status: 'completed', completedAt: new Date().toISOString() };
    try {
      const res = await apiPut(`/deals/${selected._id}`, { milestones });
      if (res?.ok && res.item) setSelected(res.item);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to update milestone');
    }
  }

  return (
    <div className={`deals-shell admin-page authenticated ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <header className="admin-header deals-header">
        <div className="deals-header__row">
          <div>
            <h1>🤝 Deals (Smart Contract Foundation)</h1>
            <p className="muted">
              Draft real-world deals (parties, wallets, milestones, payment schedule) with an audit trail. On-chain contract deployment comes next.
            </p>
          </div>
          <div className="deals-actions">
            <Link to="/admin" className="btn ghost">← Admin</Link>
            <button className="btn ghost" onClick={loadDeals} disabled={loading}>Refresh</button>
            <button
              className="btn ghost"
              onClick={() => {
                const next = !darkMode;
                setDarkMode(next);
                localStorage.setItem('archive-theme', next ? 'dark' : 'light');
              }}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="deals-main">
        {error ? <div className="error" role="alert">{error}</div> : null}

        <section className="card">
          <h2>Create new deal</h2>
          <form className="form" onSubmit={handleCreate}>
            <label>
              Title *
              <input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
            </label>
            <label>
              Description
              <textarea rows={3} value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
            </label>

            <div className="grid2">
              <label>
                Counterparty name
                <input value={draft.counterpartyName} onChange={(e) => setDraft((p) => ({ ...p, counterpartyName: e.target.value }))} />
              </label>
              <label>
                Country
                <input value={draft.counterpartyCountry} onChange={(e) => setDraft((p) => ({ ...p, counterpartyCountry: e.target.value }))} placeholder="Kenya" />
              </label>
            </div>
            <label>
              Counterparty wallet (optional)
              <input value={draft.counterpartyWallet} onChange={(e) => setDraft((p) => ({ ...p, counterpartyWallet: e.target.value }))} placeholder="0x..." />
            </label>

            <div className="grid2">
              <label>
                Total amount
                <input value={draft.totalAmount} onChange={(e) => setDraft((p) => ({ ...p, totalAmount: e.target.value }))} placeholder="1000" />
              </label>
              <label>
                Currency
                <input value={draft.currency} onChange={(e) => setDraft((p) => ({ ...p, currency: e.target.value }))} placeholder="USD" />
              </label>
            </div>

            <details>
              <summary>Payments (advanced)</summary>
              <textarea
                className="json"
                rows={8}
                value={JSON.stringify(draft.paymentsJson, null, 2)}
                onChange={(e) => setDraft((p) => ({ ...p, paymentsJson: safeJsonParse(e.target.value, p.paymentsJson) }))}
              />
            </details>

            <details>
              <summary>Milestones (advanced)</summary>
              <textarea
                className="json"
                rows={8}
                value={JSON.stringify(draft.milestonesJson, null, 2)}
                onChange={(e) => setDraft((p) => ({ ...p, milestonesJson: safeJsonParse(e.target.value, p.milestonesJson) }))}
              />
            </details>

            <div className="row">
              <button className="btn primary" type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create deal'}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Your deals</h2>
          {loading ? <div className="muted">Loading…</div> : null}
          {!loading && items.length === 0 ? <div className="muted">No deals yet.</div> : null}
          <div className="deals-list">
            {items.map((d) => (
              <button
                key={d._id}
                className={`deal-item ${selectedId === d._id ? 'active' : ''}`}
                onClick={() => setSelectedId(d._id)}
              >
                <div className="deal-title">{d.title}</div>
                <div className="muted small">{d.status || 'draft'} · {d.counterparty?.country || '—'} · {d.currency || 'USD'} {d.totalAmount || 0}</div>
              </button>
            ))}
          </div>
        </section>

        {selected ? (
          <section className="card">
            <h2>Deal workspace</h2>
            <div className="workspace">
              <div className="workspace-col">
                <h3>Milestones</h3>
                {Array.isArray(selected.milestones) && selected.milestones.length ? (
                  <div className="milestones">
                    {selected.milestones.map((m, idx) => (
                      <div key={m._id || idx} className={`milestone ${m.status}`}>
                        <div className="milestone-title">{m.title}</div>
                        {m.description ? <div className="muted small">{m.description}</div> : null}
                        <div className="muted small">evidence: {m.evidenceType || 'none'}</div>
                        {m.status !== 'completed' ? (
                          <button className="btn ghost" onClick={() => handleMarkMilestoneCompleted(idx)}>
                            Mark completed
                          </button>
                        ) : (
                          <div className="muted small">completed {m.completedAt ? new Date(m.completedAt).toLocaleString() : ''}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No milestones.</div>
                )}

                <h3>Payments</h3>
                {Array.isArray(selected.payments) && selected.payments.length ? (
                  <div className="payments">
                    {selected.payments.map((p, idx) => (
                      <div key={p._id || idx} className="payment">
                        <div className="payment-title">{p.label || `Payment ${idx + 1}`}</div>
                        <div className="muted small">
                          {p.currency || selected.currency || 'USD'} {p.amount} · {p.status || 'pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No payments.</div>
                )}
              </div>

              <div className="workspace-col">
                <h3>Notes / Messages</h3>
                <div className="messages">
                  {(selected.messages || []).slice(-50).map((msg, idx) => (
                    <div key={msg._id || idx} className="message">
                      <div className="muted small">
                        {msg.author || 'owner'} · {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                      </div>
                      <div className="message-text">{msg.text}</div>
                    </div>
                  ))}
                </div>
                <div className="row">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Add a note / update..."
                  />
                  <button className="btn primary" type="button" onClick={handleAddMessage}>
                    Send
                  </button>
                </div>
                <p className="muted small">
                  Next step: allow counterparty to join via link + wallet signature, then deploy an escrow contract on Base.
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

