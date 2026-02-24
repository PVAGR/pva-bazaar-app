import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import AdminNav from '../components/AdminNav.jsx';
import { getErrorMessage } from '../lib/errorUtils';
import '../styles/admin-common.css';
import './ContactsPage.css';

const TYPES = ['supplier', 'buyer', 'producer', 'distributor'];

export default function ContactsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [draft, setDraft] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    telegram: '',
    company: '',
    country: '',
    city: '',
    type: 'supplier',
    notes: '',
    commodities: [],
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    ashaDrujNotes: '',
    socraticPrompts: [],
  });
  const [commodities, setCommodities] = useState([]);
  const [vaultNotes, setVaultNotes] = useState([]);

  async function loadContacts() {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (filterType) params.type = filterType;
      const res = await apiGet('/contacts', { params });
      if (res?.ok && Array.isArray(res.items)) setItems(res.items);
      else setError(res?.error || 'Failed to load contacts');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load contacts'));
    } finally {
      setLoading(false);
    }
  }

  async function loadContact(id) {
    if (!id) return;
    setSelected(null);
    try {
      const res = await apiGet(`/contacts/${id}`);
      if (res?.ok && res.item) {
        setSelected(res.item);
        const bd = res.item.birthDate;
        setDraft({
          name: res.item.name || '',
          email: res.item.email || '',
          phone: res.item.phone || '',
          whatsapp: res.item.whatsapp || '',
          telegram: res.item.telegram || '',
          company: res.item.company || '',
          country: res.item.country || '',
          city: res.item.city || '',
          type: res.item.type || 'supplier',
          notes: res.item.notes || '',
          commodities: (res.item.commodities || []).map((c) => (typeof c === 'object' ? c._id : c)),
          birthDate: bd ? new Date(bd).toISOString().slice(0, 10) : '',
          birthTime: res.item.birthTime || '',
          birthPlace: res.item.birthPlace || '',
          ashaDrujNotes: res.item.ashaDrujNotes || '',
          socraticPrompts: Array.isArray(res.item.socraticPrompts) ? [...res.item.socraticPrompts] : [],
        });
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load contact'));
    }
  }

  useEffect(() => {
    loadContacts();
  }, [filterType]);
  useEffect(() => {
    apiGet('/commodities', { params: { limit: 100 } }).then((r) => r?.ok && Array.isArray(r.items) && setCommodities(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected?._id) return;
    apiGet('/vault-notes', { params: { recordType: 'contact', recordId: selected._id, limit: 20 } })
      .then((r) => r?.ok && Array.isArray(r.items) && setVaultNotes(r.items))
      .catch(() => setVaultNotes([]));
  }, [selected?._id]);

  useEffect(() => {
    if (selectedId) loadContact(selectedId);
  }, [selectedId]);

  async function handleCreate(e) {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setError('Name is required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await apiPost('/contacts', {
        name,
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        whatsapp: draft.whatsapp.trim(),
        telegram: draft.telegram.trim(),
        company: draft.company.trim(),
        country: draft.country.trim(),
        city: draft.city.trim(),
        type: draft.type,
        notes: draft.notes.trim(),
        commodities: draft.commodities || [],
        birthDate: draft.birthDate || undefined,
        birthTime: draft.birthTime.trim() || undefined,
        birthPlace: draft.birthPlace.trim() || undefined,
        ashaDrujNotes: draft.ashaDrujNotes.trim() || undefined,
        socraticPrompts: draft.socraticPrompts || [],
      });
      if (!res?.ok || !res.item) throw new Error(res?.error || 'Create failed');
      await loadContacts();
      setSelectedId(res.item._id);
      setDraft({ name: '', email: '', phone: '', whatsapp: '', telegram: '', company: '', country: '', city: '', type: 'supplier', notes: '', commodities: [], birthDate: '', birthTime: '', birthPlace: '', ashaDrujNotes: '', socraticPrompts: [] });
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
      const res = await apiPut(`/contacts/${selected._id}`, {
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        whatsapp: draft.whatsapp.trim(),
        telegram: draft.telegram.trim(),
        company: draft.company.trim(),
        country: draft.country.trim(),
        city: draft.city.trim(),
        type: draft.type,
        notes: draft.notes.trim(),
        commodities: draft.commodities || [],
        birthDate: draft.birthDate || undefined,
        birthTime: draft.birthTime.trim() || undefined,
        birthPlace: draft.birthPlace.trim() || undefined,
        ashaDrujNotes: draft.ashaDrujNotes.trim() || undefined,
        socraticPrompts: draft.socraticPrompts || [],
      });
      if (!res?.ok) throw new Error(res?.error || 'Save failed');
      setSelected(res.item);
      await loadContacts();
    } catch (e) {
      setError(getErrorMessage(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected?._id || !window.confirm('Delete this contact?')) return;
    setError('');
    try {
      await apiDelete(`/contacts/${selected._id}`);
      setSelectedId('');
      setSelected(null);
      await loadContacts();
    } catch (e) {
      setError(getErrorMessage(e, 'Delete failed'));
    }
  }

  return (
    <div className="contacts-shell admin-page authenticated">
      <header className="admin-header contacts-header">
        <div className="contacts-header__row">
          <div>
            <h1>Contacts (CRM)</h1>
            <p className="muted">Suppliers, buyers, producers, distributors—linked to commodities and deals.</p>
          </div>
          <div className="contacts-actions">
            <Link to="/broker" className="btn ghost">Hub</Link>
            <button className="btn ghost" onClick={loadContacts} disabled={loading}>Refresh</button>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="contacts-main">
        {error ? <ErrorBanner message={error} onRetry={loadContacts} onDismiss={() => setError('')} /> : null}

        <section className="card">
          <h2>New contact</h2>
          <form className="form" onSubmit={handleCreate}>
            <label>Name *</label>
            <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Supplier or buyer name" />
            <label>Type</label>
            <select value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="row">
              <button className="btn primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Your contacts</h2>
          <div className="row">
            <span className="muted small">Filter:</span>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {loading ? <LoadingSpinner label="Loading…" /> : null}
          {!loading && items.length === 0 ? <div className="muted">No contacts yet.</div> : null}
          <div className="contacts-list">
            {items.map((c) => (
              <button
                key={c._id}
                className={`contact-item ${selectedId === c._id ? 'active' : ''}`}
                onClick={() => setSelectedId(c._id)}
              >
                <div className="contact-title">{c.name}</div>
                <div className="muted small">{c.company || c.country || c.type || '—'}</div>
              </button>
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
              <label>Email</label>
              <input value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
              <label>Phone / WhatsApp / Telegram</label>
              <div className="row rowWrap">
                <input value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
                <input value={draft.whatsapp} onChange={(e) => setDraft((p) => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp" />
                <input value={draft.telegram} onChange={(e) => setDraft((p) => ({ ...p, telegram: e.target.value }))} placeholder="Telegram" />
              </div>
              <label>Company / Country / City</label>
              <div className="row rowWrap">
                <input value={draft.company} onChange={(e) => setDraft((p) => ({ ...p, company: e.target.value }))} placeholder="Company" />
                <input value={draft.country} onChange={(e) => setDraft((p) => ({ ...p, country: e.target.value }))} placeholder="Country" />
                <input value={draft.city} onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))} placeholder="City" />
              </div>
              <label>Notes</label>
              <textarea rows={4} value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} />
              <label>Commodities (they deal in)</label>
              <div className="row rowWrap">
                {commodities.map((c) => (
                  <label key={c._id} className="check">
                    <input
                      type="checkbox"
                      checked={(draft.commodities || []).includes(c._id)}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          commodities: e.target.checked ? [...(p.commodities || []), c._id] : (p.commodities || []).filter((id) => id !== c._id),
                        }))
                      }
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
              <div className="subcard hermeneutic">
                <div className="subcard__title">Hermeneutic (birth chart)</div>
                <p className="muted small">Birth date, time, place for chart interpretation.</p>
                <div className="form">
                  <label>Birth date</label>
                  <input
                    type="date"
                    value={draft.birthDate}
                    onChange={(e) => setDraft((p) => ({ ...p, birthDate: e.target.value }))}
                  />
                  <label>Birth time (e.g. 14:30)</label>
                  <input
                    type="text"
                    value={draft.birthTime}
                    onChange={(e) => setDraft((p) => ({ ...p, birthTime: e.target.value }))}
                    placeholder="HH:MM or leave blank"
                  />
                  <label>Birth place</label>
                  <input
                    type="text"
                    value={draft.birthPlace}
                    onChange={(e) => setDraft((p) => ({ ...p, birthPlace: e.target.value }))}
                    placeholder="City, country"
                  />
                  <label>Asha / Druj notes</label>
                  <textarea
                    rows={2}
                    value={draft.ashaDrujNotes}
                    onChange={(e) => setDraft((p) => ({ ...p, ashaDrujNotes: e.target.value }))}
                    placeholder="Truth vs. falsehood, alignment notes..."
                  />
                  <label>Socratic prompts</label>
                  <div className="muted small">One prompt per line</div>
                  <textarea
                    rows={3}
                    value={(draft.socraticPrompts || []).join('\n')}
                    onChange={(e) => setDraft((p) => ({ ...p, socraticPrompts: e.target.value.split('\n').filter(Boolean) }))}
                    placeholder="What do they truly want?
What assumptions underlie their position?"
                  />
                </div>
              </div>
              <div className="subcard">
                <div className="subcard__title">Vault notes</div>
                <Link to={`/vault?recordType=contact&recordId=${selected._id}`} className="btn ghost" style={{ marginBottom: 8 }}>
                  + Add vault note for this contact
                </Link>
                {vaultNotes.length === 0 ? <div className="muted small">No vault notes for this contact.</div> : null}
                {vaultNotes.slice(0, 5).map((n) => (
                  <div key={n._id} className="muted small" style={{ marginTop: 4 }}>
                    {n.title || 'Untitled'} — {n.content ? `${n.content.slice(0, 60)}${n.content.length > 60 ? '…' : ''}` : '—'}
                  </div>
                ))}
              </div>
              {selected.outreachLog?.length > 0 ? (
                <div className="subcard">
                  <div className="subcard__title">Outreach log</div>
                  <p className="muted small">Templates sent via WhatsApp or Email.</p>
                  {selected.outreachLog.slice(-5).reverse().map((o, i) => (
                    <div key={i} className="muted small" style={{ marginTop: 4 }}>
                      {o.date ? new Date(o.date).toLocaleDateString() : ''} · {o.status || 'sent'}
                      {o.response ? ` · ${o.response}` : ''}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="row">
                <button className="btn primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                <button className="btn ghost" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
