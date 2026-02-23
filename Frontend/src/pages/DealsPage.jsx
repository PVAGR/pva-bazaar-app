import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api';
import HelpTip from '../components/HelpTip.jsx';
import AdminNav from '../components/AdminNav.jsx';
import './DealsPage.css';

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
  const [profile, setProfile] = useState(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSavedOk, setPrefsSavedOk] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftRestoreHint, setDraftRestoreHint] = useState('');

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    counterpartyName: '',
    counterpartyCountry: '',
    counterpartyWallet: '',
    totalAmount: '',
    currency: 'USD',
    payments: [
      { label: 'Deposit', amount: '', currency: 'USD', status: 'pending' },
      { label: 'Mid', amount: '', currency: 'USD', status: 'pending' },
      { label: 'Final', amount: '', currency: 'USD', status: 'pending' },
    ],
    milestones: [
      { title: 'Tracking number provided', evidenceType: 'tracking_number', status: 'pending' },
      { title: 'Delivery confirmed', evidenceType: 'message', status: 'pending' },
    ],
  });

  const [newMessage, setNewMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [evidenceDrafts, setEvidenceDrafts] = useState({});
  const [milestoneHashes, setMilestoneHashes] = useState({});

  async function sha256Hex(input) {
    try {
      if (!window.crypto?.subtle) return '';
      const bytes = new TextEncoder().encode(String(input));
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return '';
    }
  }

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

  useEffect(() => {
    // Derive milestone hashes for the "contract draft" section (best-effort).
    const ms = Array.isArray(selected?.milestones) ? selected.milestones : [];
    if (!selected?._id || ms.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ms.map(async (m) => {
          const base = `${selected._id}:${m._id || ''}:${m.title || ''}`;
          const h = await sha256Hex(base);
          return [String(m._id || m.title || ''), h];
        })
      );
      if (cancelled) return;
      setMilestoneHashes(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?._id, selected?.milestones]);

  useEffect(() => {
    // Load user defaults from Mongo so deals can auto-fill.
    apiGet('/users/profile')
      .then((res) => {
        if (res?.ok && res.user) {
          setProfile(res.user);
          // If draft is still blank, prefill with preferences (best effort).
          setDraft((prev) => {
            const next = { ...prev };
            const prefs = res.user?.preferences || {};
            if (!next.currency && prefs.defaultCurrency) next.currency = prefs.defaultCurrency;
            if (!next.counterpartyCountry && prefs.defaultCountry) next.counterpartyCountry = prefs.defaultCountry;
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (draftLoaded) return;
    apiGet('/deals/drafts')
      .then((res) => {
        setDraftLoaded(true);
        const saved = res?.draft;
        if (!saved || typeof saved !== 'object') return;

        setDraft((prev) => {
          const pristine =
            !prev.title &&
            !prev.description &&
            !prev.counterpartyName &&
            !prev.counterpartyCountry &&
            !prev.counterpartyWallet &&
            !prev.totalAmount;
          if (!pristine) {
            setDraftRestoreHint('A previous draft exists (not auto-restored because you already started typing).');
            return prev;
          }
          setDraftRestoreHint('Restored your last saved deal draft.');
          return { ...prev, ...saved };
        });
      })
      .catch(() => setDraftLoaded(true));
  }, [draftLoaded]);

  useEffect(() => {
    if (!draftLoaded) return;

    const hasPayment = (draft.payments || []).some((p) => String(p?.amount || '').trim());
    const hasMilestone = (draft.milestones || []).some((m) => String(m?.title || '').trim());
    const hasMeaningful =
      !!draft.title ||
      !!draft.description ||
      !!draft.counterpartyName ||
      !!draft.counterpartyCountry ||
      !!draft.counterpartyWallet ||
      !!draft.totalAmount ||
      hasPayment ||
      hasMilestone;

    if (!hasMeaningful) return;

    const timer = setTimeout(async () => {
      setDraftSaving(true);
      try {
        await apiPut('/deals/drafts', { draft });
      } catch {
        // Best-effort: draft autosave should never block the user.
      } finally {
        setDraftSaving(false);
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [draft, draftLoaded]);

  async function clearDraft() {
    setDraftSaving(true);
    setError('');
    try {
      await apiDelete('/deals/drafts');
      setDraftRestoreHint('Draft cleared.');
      setDraft({
        title: '',
        description: '',
        counterpartyName: '',
        counterpartyCountry: profile?.preferences?.defaultCountry || '',
        counterpartyWallet: '',
        totalAmount: '',
        currency: profile?.preferences?.defaultCurrency || 'USD',
        payments: [
          { label: 'Deposit', amount: '', currency: profile?.preferences?.defaultCurrency || 'USD', status: 'pending' },
          { label: 'Mid', amount: '', currency: profile?.preferences?.defaultCurrency || 'USD', status: 'pending' },
          { label: 'Final', amount: '', currency: profile?.preferences?.defaultCurrency || 'USD', status: 'pending' },
        ],
        milestones: [
          { title: 'Tracking number provided', evidenceType: 'tracking_number', status: 'pending' },
          { title: 'Delivery confirmed', evidenceType: 'message', status: 'pending' },
        ],
      });
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to clear draft');
    } finally {
      setDraftSaving(false);
    }
  }

  const preferencesDraft = useMemo(() => {
    const prefs = profile?.preferences || {};
    return {
      defaultCountry: prefs.defaultCountry || '',
      defaultCurrency: prefs.defaultCurrency || 'USD',
      defaultWalletAddress: prefs.defaultWalletAddress || '',
    };
  }, [profile]);

  async function savePreferences(nextPrefs) {
    setPrefsSaving(true);
    setPrefsSavedOk(false);
    setError('');
    try {
      const res = await apiPut('/users/profile', { preferences: nextPrefs });
      if (!res?.ok || !res.user) throw new Error(res?.message || 'Failed to save defaults');
      setProfile(res.user);
      setPrefsSavedOk(true);
      setTimeout(() => setPrefsSavedOk(false), 2000);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to save defaults');
    } finally {
      setPrefsSaving(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const payments = Array.isArray(draft.payments) ? draft.payments : [];
      const milestones = Array.isArray(draft.milestones) ? draft.milestones : [];

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
        payments: payments
          .filter((p) => p && typeof p === 'object')
          .map((p) => ({
            label: (p.label || '').trim(),
            amount: Number(p.amount || 0),
            currency: (p.currency || draft.currency || 'USD').trim(),
            status: p.status || 'pending',
          }))
          .filter((p) => Number.isFinite(p.amount) && p.amount > 0),
        milestones: milestones
          .filter((m) => m && typeof m === 'object')
          .map((m) => ({
            title: (m.title || '').trim(),
            evidenceType: m.evidenceType || 'none',
            status: m.status || 'pending',
          }))
          .filter((m) => m.title),
      };
      const res = await apiPost('/deals', payload);
      if (!res?.ok || !res.item) throw new Error(res?.error || res?.message || 'Create failed');
      // Clear Mongo-backed draft after a successful create.
      apiDelete('/deals/drafts').catch(() => {});
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

  async function handleGenerateInvite() {
    if (!selected?._id) return;
    setInviteLoading(true);
    setError('');
    try {
      const res = await apiPost(`/deals/${selected._id}/invite`, {});
      if (!res?.ok || !res?.joinUrl) throw new Error(res?.error || res?.message || 'Failed to generate invite');
      setInviteLink(res.joinUrl);
      setInviteExpiresAt(res.expiresAt || '');
      try {
        await navigator.clipboard.writeText(res.joinUrl);
      } catch {
        // ignore clipboard errors
      }
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to generate invite');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleSubmitEvidence(milestoneId) {
    if (!selected?._id || !milestoneId) return;
    const evidenceValue = String(evidenceDrafts[milestoneId] || '').trim();
    if (!evidenceValue) return;
    setError('');
    try {
      const res = await apiPost(`/deals/${selected._id}/milestones/${milestoneId}/evidence`, { evidenceValue });
      if (!res?.ok || !res.item) throw new Error(res?.error || res?.message || 'Failed to submit evidence');
      setSelected(res.item);
      setEvidenceDrafts((prev) => ({ ...prev, [milestoneId]: '' }));
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to submit evidence');
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

      <AdminNav />

      <main className="deals-main">
        {error ? <div className="error" role="alert">{error}</div> : null}

        <section className="card">
          <h2>
            Create new deal
            <HelpTip
              title="What is a Deal?"
              body="A Deal is your off-chain workspace stored in MongoDB: parties, wallets, payment schedule, milestones, and notes. Later we can deploy an escrow smart contract and link it here."
              example="Import 1kg coffee beans from Kenya"
            />
          </h2>

          {profile?.preferences ? (
            <div className="defaults">
              <div className="defaults__title">
                Saved defaults
                <HelpTip
                  title="Saved defaults"
                  body="These defaults are stored in MongoDB for your account and will help auto-fill new deals."
                  example="Default currency: USD"
                />
              </div>
              <div className="grid2">
                <label>
                  <span className="labelRow">
                    Default country
                    <HelpTip title="Default country" body="Used to auto-fill the country field for new deals." example="Kenya" />
                  </span>
                  <input
                    value={preferencesDraft.defaultCountry}
                    onChange={(e) => setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultCountry: e.target.value } }))}
                  />
                </label>
                <label>
                  <span className="labelRow">
                    Default currency
                    <HelpTip title="Default currency" body="Used to auto-fill currency in new deals and payment schedule." example="USD" />
                  </span>
                  <input
                    value={preferencesDraft.defaultCurrency}
                    onChange={(e) => setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultCurrency: e.target.value } }))}
                  />
                </label>
              </div>
              <label>
                <span className="labelRow">
                  Default wallet (optional)
                  <HelpTip title="Default wallet" body="Optional. Your preferred wallet address for reference and future on-chain escrow." example="0xabc123..." />
                </span>
                <input
                  value={preferencesDraft.defaultWalletAddress}
                  onChange={(e) => setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultWalletAddress: e.target.value } }))}
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={prefsSaving}
                  onClick={() => savePreferences(preferencesDraft)}
                >
                  {prefsSaving ? 'Saving…' : 'Save defaults'}
                </button>
                {prefsSavedOk ? <span className="muted small">Saved</span> : null}
              </div>
            </div>
          ) : null}

          {draftRestoreHint ? <div className="muted small">{draftRestoreHint}</div> : null}
          {draftLoaded ? (
            <div className="row">
              <button type="button" className="btn ghost" disabled={draftSaving} onClick={clearDraft}>
                Clear draft
              </button>
              {draftSaving ? <span className="muted small">Saving draft…</span> : null}
            </div>
          ) : null}

          <form className="form" onSubmit={handleCreate}>
            <label>
              <span className="labelRow">
                Title *
                <HelpTip title="Deal title" body="Short name for this deal. Use something you’ll recognize later." example="Kenya coffee import (1kg)" />
              </span>
              <input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
            </label>
            <label>
              <span className="labelRow">
                Description
                <HelpTip title="Deal description" body="Optional context: product, quality specs, delivery method, and any important terms." example="AA grade, shipped via DHL" />
              </span>
              <textarea rows={3} value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
            </label>

            <div className="grid2">
              <label>
                <span className="labelRow">
                  Counterparty name
                  <HelpTip title="Who are you dealing with?" body="The person/company on the other side of the deal." example="Nairobi Coffee Co." />
                </span>
                <input value={draft.counterpartyName} onChange={(e) => setDraft((p) => ({ ...p, counterpartyName: e.target.value }))} />
              </label>
              <label>
                <span className="labelRow">
                  Country
                  <HelpTip title="Country" body="Where the counterparty is located (helps with logistics context)." example="Kenya" />
                </span>
                <input value={draft.counterpartyCountry} onChange={(e) => setDraft((p) => ({ ...p, counterpartyCountry: e.target.value }))} placeholder="Kenya" />
              </label>
            </div>
            <label>
              <span className="labelRow">
                Counterparty wallet (optional)
                <HelpTip title="Counterparty wallet" body="Optional for now. Later this becomes the receiving/signing address for the smart contract." example="0xdef456..." />
              </span>
              <input value={draft.counterpartyWallet} onChange={(e) => setDraft((p) => ({ ...p, counterpartyWallet: e.target.value }))} placeholder="0x..." />
            </label>

            <div className="grid2">
              <label>
                <span className="labelRow">
                  Total amount
                  <HelpTip title="Total amount" body="Total value of the deal (informational + future escrow amount)." example="1000" />
                </span>
                <input value={draft.totalAmount} onChange={(e) => setDraft((p) => ({ ...p, totalAmount: e.target.value }))} placeholder="1000" />
              </label>
              <label>
                <span className="labelRow">
                  Currency
                  <HelpTip title="Currency" body="Displayed currency for this deal (USD recommended while testing)." example="USD" />
                </span>
                <input value={draft.currency} onChange={(e) => setDraft((p) => ({ ...p, currency: e.target.value }))} placeholder="USD" />
              </label>
            </div>

            <div className="subcard">
              <div className="subcard__title">
                Payment schedule
                <HelpTip
                  title="Payment schedule"
                  body="Split the deal into 2–3 payments. Later we can enforce this on-chain with escrow releases tied to milestones."
                  example="Deposit 300, Mid 300, Final 400"
                />
              </div>
              <div className="stack">
                {(draft.payments || []).map((p, idx) => (
                  <div key={idx} className="row rowWrap">
                    <input
                      value={p.label}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          payments: prev.payments.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)),
                        }))
                      }
                      placeholder="Label"
                    />
                    <input
                      value={p.amount}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          payments: prev.payments.map((x, i) => (i === idx ? { ...x, amount: e.target.value } : x)),
                        }))
                      }
                      placeholder="Amount"
                    />
                    <input
                      value={p.currency}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          payments: prev.payments.map((x, i) => (i === idx ? { ...x, currency: e.target.value } : x)),
                        }))
                      }
                      placeholder="Currency"
                    />
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setDraft((prev) => ({ ...prev, payments: prev.payments.filter((_, i) => i !== idx) }))}
                      title="Remove payment"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      payments: [...prev.payments, { label: `Payment ${prev.payments.length + 1}`, amount: '', currency: prev.currency || 'USD', status: 'pending' }],
                    }))
                  }
                >
                  + Add payment
                </button>
              </div>
            </div>

            <div className="subcard">
              <div className="subcard__title">
                Milestones
                <HelpTip
                  title="Milestones"
                  body="Milestones are the checkpoints you want to track. Later the contract can require evidence (e.g., tracking number) before releasing payments."
                  example="Tracking number provided"
                />
              </div>
              <div className="stack">
                {(draft.milestones || []).map((m, idx) => (
                  <div key={idx} className="row rowWrap">
                    <input
                      value={m.title}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          milestones: prev.milestones.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)),
                        }))
                      }
                      placeholder="Milestone title"
                    />
                    <select
                      value={m.evidenceType || 'none'}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          milestones: prev.milestones.map((x, i) => (i === idx ? { ...x, evidenceType: e.target.value } : x)),
                        }))
                      }
                    >
                      <option value="none">none</option>
                      <option value="tracking_number">tracking number</option>
                      <option value="document">document</option>
                      <option value="message">message</option>
                    </select>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setDraft((prev) => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== idx) }))}
                      title="Remove milestone"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      milestones: [...prev.milestones, { title: `Milestone ${prev.milestones.length + 1}`, evidenceType: 'none', status: 'pending' }],
                    }))
                  }
                >
                  + Add milestone
                </button>
              </div>
            </div>

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
                <h3>
                  Counterparty join link{' '}
                  <HelpTip
                    title="Counterparty join link"
                    body="Generate a shareable link so the counterparty can view the deal, message, and submit milestone evidence without creating a full account yet."
                    example="Send link via email/Telegram"
                  />
                </h3>
                <div className="row">
                  <button className="btn ghost" type="button" disabled={inviteLoading} onClick={handleGenerateInvite}>
                    {inviteLoading ? 'Generating…' : 'Generate join link'}
                  </button>
                </div>
                {inviteLink ? (
                  <div className="subcard">
                    <div className="muted small">Join URL (copied to clipboard if supported):</div>
                    <div className="muted small" style={{ wordBreak: 'break-all' }}>
                      {inviteLink}
                    </div>
                    {inviteExpiresAt ? (
                      <div className="muted small">Expires: {new Date(inviteExpiresAt).toLocaleString()}</div>
                    ) : null}
                  </div>
                ) : null}

                <h3>Milestones</h3>
                {Array.isArray(selected.milestones) && selected.milestones.length ? (
                  <div className="milestones">
                    {selected.milestones.map((m, idx) => (
                      <div key={m._id || idx} className={`milestone ${m.status}`}>
                        <div className="milestone-title">{m.title}</div>
                        {m.description ? <div className="muted small">{m.description}</div> : null}
                        <div className="muted small">evidence: {m.evidenceType || 'none'}</div>
                        {m.evidenceValue ? <div className="muted small">evidence value: {m.evidenceValue}</div> : null}
                        {m.evidenceType && m.evidenceType !== 'none' ? (
                          <div className="row">
                            <input
                              value={evidenceDrafts[m._id] ?? ''}
                              onChange={(e) => setEvidenceDrafts((prev) => ({ ...prev, [m._id]: e.target.value }))}
                              placeholder="Submit evidence (tracking number, link, etc.)"
                            />
                            <button className="btn ghost" type="button" onClick={() => handleSubmitEvidence(m._id)}>
                              Save evidence
                            </button>
                          </div>
                        ) : null}
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

                <h3>
                  Escrow contract draft (foundation){' '}
                  <HelpTip
                    title="Contract draft"
                    body="This is a structured draft of what an escrow smart contract would need (payments + milestone hashes). It does not deploy anything yet."
                    example="Base chainId 8453"
                  />
                </h3>
                <pre className="json">
                  {JSON.stringify(
                    {
                      chainId: selected.chainId || 8453,
                      tokenAddress: selected.tokenAddress || '',
                      totalAmount: selected.totalAmount || 0,
                      currency: selected.currency || 'USD',
                      parties: {
                        ownerId: selected.ownerId || '',
                        mediatorId: selected.mediatorId || '',
                        counterpartyWallet: selected.counterparty?.walletAddress || '',
                      },
                      payments: (selected.payments || []).map((p) => ({
                        label: p.label || '',
                        amount: p.amount || 0,
                        currency: p.currency || selected.currency || 'USD',
                        status: p.status || 'pending',
                      })),
                      milestones: (selected.milestones || []).map((m) => ({
                        id: m._id || '',
                        title: m.title || '',
                        evidenceType: m.evidenceType || 'none',
                        evidenceValue: m.evidenceValue || '',
                        status: m.status || 'pending',
                        sha256: milestoneHashes[String(m._id || m.title || '')] || '',
                      })),
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

