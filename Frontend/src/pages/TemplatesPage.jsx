import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import AdminNav from '../components/AdminNav.jsx';
import { getErrorMessage } from '../lib/errorUtils';
import '../styles/admin-common.css';
import './TemplatesPage.css';

const TYPES = ['vetting', 'intro', 'pitch'];

export default function TemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCommodity, setFilterCommodity] = useState('');
  const [draft, setDraft] = useState({ name: '', type: 'vetting', body: '' });
  const [copiedId, setCopiedId] = useState('');
  const [contacts, setContacts] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [useWithContactModal, setUseWithContactModal] = useState(null);

  async function loadTemplates() {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (filterType) params.type = filterType;
      if (filterCommodity) params.commodity = filterCommodity;
      const res = await apiGet('/templates', { params });
      if (res?.ok && Array.isArray(res.items)) setItems(res.items);
      else setError(res?.error || 'Failed to load templates');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load templates'));
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplate(id) {
    if (!id) return;
    setSelected(null);
    try {
      const res = await apiGet(`/templates/${id}`);
      if (res?.ok && res.item) {
        setSelected(res.item);
        setDraft({ name: res.item.name || '', type: res.item.type || 'vetting', body: res.item.body || '' });
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load template'));
    }
  }

  useEffect(() => {
    loadTemplates();
  }, [filterType, filterCommodity]);
  useEffect(() => {
    apiGet('/contacts', { params: { limit: 100 } }).then((r) => r?.ok && Array.isArray(r.items) && setContacts(r.items)).catch(() => {});
    apiGet('/commodities', { params: { limit: 100 } }).then((r) => r?.ok && Array.isArray(r.items) && setCommodities(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedId) loadTemplate(selectedId);
  }, [selectedId]);

  async function handleCreate(e) {
    e.preventDefault();
    const name = draft.name.trim();
    const body = draft.body.trim();
    if (!name || !body) {
      setError('Name and body are required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await apiPost('/templates', {
        name,
        type: draft.type,
        body,
      });
      if (!res?.ok || !res.item) throw new Error(res?.error || 'Create failed');
      await loadTemplates();
      setSelectedId(res.item._id);
      setDraft({ name: '', type: 'vetting', body: '' });
    } catch (e) {
      setError(getErrorMessage(e, 'Create failed'));
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!selected?._id) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiPut(`/templates/${selected._id}`, {
        name: draft.name.trim(),
        type: draft.type,
        body: draft.body.trim(),
      });
      if (!res?.ok) throw new Error(res?.error || 'Save failed');
      setSelected(res.item);
      await loadTemplates();
    } catch (e) {
      setError(getErrorMessage(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected?._id || !window.confirm('Delete this template?')) return;
    setError('');
    try {
      await apiDelete(`/templates/${selected._id}`);
      setSelectedId('');
      setSelected(null);
      await loadTemplates();
    } catch (e) {
      setError(getErrorMessage(e, 'Delete failed'));
    }
  }

  function useWithContact(template) {
    setUseWithContactModal({ template });
  }

  function sendViaWhatsApp(contact, body) {
    const phone = (contact?.whatsapp || contact?.phone || '').replace(/\D/g, '');
    if (!phone) {
      setError('Contact has no WhatsApp/phone');
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(body)}`, '_blank');
    setUseWithContactModal(null);
  }

  function sendViaEmail(contact, body) {
    const to = contact?.email || '';
    if (!to) {
      setError('Contact has no email');
      return;
    }
    window.open(`mailto:${to}?subject=${encodeURIComponent('Supply inquiry')}&body=${encodeURIComponent(body)}`, '_blank');
    setUseWithContactModal(null);
  }

  async function copyToClipboard(t) {
    const body = t?.body || '';
    try {
      await navigator.clipboard.writeText(body);
      setCopiedId(t._id);
      setTimeout(() => setCopiedId(''), 1500);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  return (
    <div className="templates-shell admin-page authenticated">
      <header className="admin-header templates-header">
        <div className="templates-header__row">
          <div>
            <h1>Templates (Vetting & Outreach)</h1>
            <p className="muted">Copy-paste vetting prompts, intro emails, and pitches. One-click copy or send via WhatsApp/Email.</p>
          </div>
          <div className="templates-actions">
            <Link to="/broker-hub" className="btn ghost">Hub</Link>
            <button className="btn ghost" onClick={loadTemplates} disabled={loading}>Refresh</button>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="templates-main">
        {error ? <ErrorBanner message={error} onRetry={loadTemplates} onDismiss={() => setError('')} /> : null}

        <section className="card">
          <h2>New template</h2>
          <form className="form" onSubmit={handleCreate}>
            <label>Name *</label>
            <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Universal Coffee Vetting" />
            <label>Type</label>
            <select value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label>Body *</label>
            <textarea rows={6} value={draft.body} onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))} placeholder="Full text (copy-paste content)..." />
            <div className="row">
              <button className="btn primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Your templates</h2>
          <div className="row rowWrap">
            <span className="muted small">Filter:</span>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={filterCommodity} onChange={(e) => setFilterCommodity(e.target.value)}>
              <option value="">All commodities</option>
              {commodities.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          {loading ? <LoadingSpinner label="Loading…" /> : null}
          {!loading && items.length === 0 ? <div className="muted">No templates yet. Run the seed script or create one.</div> : null}
          <div className="templates-list">
            {items.map((t) => (
              <div key={t._id} className={`template-item ${selectedId === t._id ? 'active' : ''}`}>
                <button
                  className="template-item__btn"
                  onClick={() => setSelectedId(t._id)}
                >
                  <div className="template-title">{t.name}</div>
                  <div className="muted small">{t.type}</div>
                </button>
                <button className="btn ghost template-copy" onClick={() => copyToClipboard(t)} title="Copy to clipboard">
                  {copiedId === t._id ? 'Copied!' : 'Copy'}
                </button>
                <button className="btn ghost" onClick={() => useWithContact(t)} title="Send via WhatsApp or email">
                  Use with contact
                </button>
              </div>
            ))}
          </div>
        </section>

        {selected ? (
          <section className="card">
            <h2>Edit: {selected.name}</h2>
            <div className="form">
              <label>Name</label>
              <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
              <label>Type</label>
              <select value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <label>Body</label>
              <textarea rows={12} value={draft.body} onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))} className="template-body" />
              <div className="row">
                <button className="btn primary" onClick={() => copyToClipboard({ _id: selected._id, body: draft.body })}>Copy to clipboard</button>
                <button className="btn primary" onClick={() => useWithContact({ _id: selected._id, body: draft.body })}>Use with contact</button>
                <button className="btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                <button className="btn ghost" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </section>
        ) : null}

        {useWithContactModal ? (
          <section className="card modal-overlay">
            <h2>Send template to contact</h2>
            <p className="muted small">Pick a contact to open WhatsApp or email with the template pre-filled.</p>
            <div className="templates-contact-picker">
              {contacts.map((c) => (
                <div key={c._id} className="row rowWrap">
                  <span>{c.name}</span>
                  {c.whatsapp || c.phone ? (
                    <button className="btn ghost" onClick={() => sendViaWhatsApp(c, useWithContactModal.template?.body || '')}>WhatsApp</button>
                  ) : null}
                  {c.email ? (
                    <button className="btn ghost" onClick={() => sendViaEmail(c, useWithContactModal.template?.body || '')}>Email</button>
                  ) : null}
                </div>
              ))}
            </div>
            <button className="btn ghost" onClick={() => setUseWithContactModal(null)}>Cancel</button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
