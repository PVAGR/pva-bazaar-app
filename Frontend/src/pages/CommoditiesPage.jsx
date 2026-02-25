import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import AdminNav from '../components/AdminNav.jsx';
import { getErrorMessage } from '../lib/errorUtils';
import '../styles/admin-common.css';
import './CommoditiesPage.css';

export default function CommoditiesPage() {
  const [searchParams] = useSearchParams();
  const urlSelected = searchParams.get('selected') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    category: '',
    notes: '',
    marketData: { fobRange: '', sampleCostMax: '', certificationsNeeded: '', exportDocs: '' },
    redFlags: [],
    greenFlags: [],
    linkedTemplateIds: [],
    linkedContactIds: [],
  });
  const [newFlag, setNewFlag] = useState({ red: '', green: '' });
  const [searchCommodity, setSearchCommodity] = useState('');
  const searchRef = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [vaultNotes, setVaultNotes] = useState([]);

  async function loadCommodities() {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/commodities', { params: { limit: 100 } });
      if (res?.ok && Array.isArray(res.items)) setItems(res.items);
      else setError(res?.error || 'Failed to load commodities');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load commodities'));
    } finally {
      setLoading(false);
    }
  }

  async function loadCommodity(id) {
    if (!id) return;
    setSelected(null);
    try {
      const res = await apiGet(`/commodities/${id}`);
      if (res?.ok && res.item) {
        setSelected(res.item);
        setDraft({
          name: res.item.name || '',
          category: res.item.category || '',
          notes: res.item.notes || '',
          marketData: {
            fobRange: res.item.marketData?.fobRange || '',
            sampleCostMax: res.item.marketData?.sampleCostMax ?? '',
            certificationsNeeded: res.item.marketData?.certificationsNeeded || '',
            exportDocs: res.item.marketData?.exportDocs || '',
          },
          redFlags: Array.isArray(res.item.redFlags) ? [...res.item.redFlags] : [],
          greenFlags: Array.isArray(res.item.greenFlags) ? [...res.item.greenFlags] : [],
          linkedTemplateIds: (res.item.linkedTemplateIds || []).map((t) => (typeof t === 'object' ? t._id : t)),
          linkedContactIds: (res.item.linkedContactIds || []).map((c) => (typeof c === 'object' ? c._id : c)),
        });
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load commodity'));
    }
  }

  useEffect(() => {
    loadCommodities();
  }, []);
  useEffect(() => {
    if (urlSelected) setSelectedId(urlSelected);
  }, [urlSelected]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    apiGet('/contacts', { params: { limit: 100 } }).then((r) => r?.ok && Array.isArray(r.items) && setContacts(r.items)).catch(() => {});
    apiGet('/templates', { params: { limit: 100 } }).then((r) => r?.ok && Array.isArray(r.items) && setTemplates(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedId) loadCommodity(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selected?._id) return;
    apiGet('/vault-notes', { params: { recordType: 'commodity', recordId: selected._id, limit: 20 } })
      .then((r) => r?.ok && Array.isArray(r.items) && setVaultNotes(r.items))
      .catch(() => setVaultNotes([]));
  }, [selected?._id]);

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
      const res = await apiPost('/commodities', {
        name,
        category: draft.category.trim(),
        notes: draft.notes.trim(),
        marketData: {
          fobRange: draft.marketData.fobRange.trim(),
          sampleCostMax: draft.marketData.sampleCostMax ? Number(draft.marketData.sampleCostMax) : undefined,
          certificationsNeeded: draft.marketData.certificationsNeeded.trim(),
          exportDocs: draft.marketData.exportDocs.trim(),
        },
        redFlags: draft.redFlags,
        greenFlags: draft.greenFlags,
      });
      if (!res?.ok || !res.item) throw new Error(res?.error || 'Create failed');
      await loadCommodities();
      setSelectedId(res.item._id);
      setDraft({ name: '', category: '', notes: '', marketData: { fobRange: '', sampleCostMax: '', certificationsNeeded: '', exportDocs: '' }, redFlags: [], greenFlags: [], linkedTemplateIds: [], linkedContactIds: [] });
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
      const res = await apiPut(`/commodities/${selected._id}`, {
        name: draft.name.trim(),
        category: draft.category.trim(),
        notes: draft.notes.trim(),
        marketData: {
          fobRange: draft.marketData.fobRange.trim(),
          sampleCostMax: draft.marketData.sampleCostMax ? Number(draft.marketData.sampleCostMax) : undefined,
          certificationsNeeded: draft.marketData.certificationsNeeded.trim(),
          exportDocs: draft.marketData.exportDocs.trim(),
        },
        redFlags: draft.redFlags,
        greenFlags: draft.greenFlags,
        linkedTemplateIds: draft.linkedTemplateIds || [],
        linkedContactIds: draft.linkedContactIds || [],
      });
      if (!res?.ok) throw new Error(res?.error || 'Save failed');
      setSelected(res.item);
      await loadCommodities();
    } catch (e) {
      setError(getErrorMessage(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected?._id || !window.confirm('Delete this commodity?')) return;
    setError('');
    try {
      await apiDelete(`/commodities/${selected._id}`);
      setSelectedId('');
      setSelected(null);
      await loadCommodities();
    } catch (e) {
      setError(getErrorMessage(e, 'Delete failed'));
    }
  }

  function addFlag(type) {
    const val = type === 'red' ? newFlag.red.trim() : newFlag.green.trim();
    if (!val) return;
    if (type === 'red') {
      setDraft((p) => ({ ...p, redFlags: [...p.redFlags, val] }));
      setNewFlag((n) => ({ ...n, red: '' }));
    } else {
      setDraft((p) => ({ ...p, greenFlags: [...p.greenFlags, val] }));
      setNewFlag((n) => ({ ...n, green: '' }));
    }
  }

  function removeFlag(type, idx) {
    if (type === 'red') setDraft((p) => ({ ...p, redFlags: p.redFlags.filter((_, i) => i !== idx) }));
    else setDraft((p) => ({ ...p, greenFlags: p.greenFlags.filter((_, i) => i !== idx) }));
  }

  const searchLower = searchCommodity.toLowerCase().trim();
  const filteredCommodities = searchLower
    ? items.filter((c) => (c.name || '').toLowerCase().includes(searchLower) || (c.category || '').toLowerCase().includes(searchLower))
    : items;

  return (
    <div className="commodities-shell admin-page authenticated">
      <Helmet><title>Commodities | PVA Bazaar</title></Helmet>
      <header className="admin-header commodities-header">
        <div className="commodities-header__row">
          <div>
            <h1>Commodities (Research Hub)</h1>
            <p className="muted">Build intelligence dossiers for any commodity: coffee, gemstones, soapstone, malachite, etc.</p>
          </div>
          <div className="commodities-actions">
            <Link to="/broker" className="btn ghost">Hub</Link>
            <button className="btn ghost" onClick={loadCommodities} disabled={loading}>Refresh</button>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="commodities-main">
        {error ? <ErrorBanner message={error} onRetry={loadCommodities} onDismiss={() => setError('')} /> : null}

        <section className="card">
          <h2>New commodity</h2>
          <form className="form" onSubmit={handleCreate}>
            <label>Name *</label>
            <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Vietnamese Arabica" />
            <label>Category</label>
            <input value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} placeholder="coffee, gemstones, soapstone" />
            <div className="row">
              <button className="btn primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Your commodities</h2>
          <input
            ref={searchRef}
            type="search"
            value={searchCommodity}
            onChange={(e) => setSearchCommodity(e.target.value)}
            placeholder="Search by name or category... (/)"
            className="search-input"
            style={{ marginBottom: 8, maxWidth: 280 }}
            aria-label="Search commodities by name or category"
          />
          {loading ? <LoadingSpinner label="Loading…" /> : null}
          {!loading && items.length === 0 ? <div className="muted">No commodities yet.</div> : null}
          {!loading && items.length > 0 && searchLower && filteredCommodities.length === 0 ? (
            <div className="muted">No commodities match &quot;{searchCommodity}&quot;.</div>
          ) : null}
          <div className="commodities-list">
            {filteredCommodities.map((c) => (
              <button
                key={c._id}
                className={`commodity-item ${selectedId === c._id ? 'active' : ''}`}
                onClick={() => setSelectedId(c._id)}
              >
                <div className="commodity-title">{c.name}</div>
                <div className="muted small">{c.category || '—'}</div>
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
              <label>Category</label>
              <input value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} />
              <label>Notes</label>
              <textarea rows={4} value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} placeholder="Market observations, landed-cost math..." />
              <div className="subcard">
                <div className="subcard__title">Market data</div>
                <label>FOB range</label>
                <input value={draft.marketData.fobRange} onChange={(e) => setDraft((p) => ({ ...p, marketData: { ...p.marketData, fobRange: e.target.value } }))} placeholder="e.g. $3–4/kg" />
                <label>Sample cost max (USD)</label>
                <input type="number" value={draft.marketData.sampleCostMax} onChange={(e) => setDraft((p) => ({ ...p, marketData: { ...p.marketData, sampleCostMax: e.target.value } }))} placeholder="30" />
                <label>Certifications needed</label>
                <input value={draft.marketData.certificationsNeeded} onChange={(e) => setDraft((p) => ({ ...p, marketData: { ...p.marketData, certificationsNeeded: e.target.value } }))} />
                <label>Export docs</label>
                <input value={draft.marketData.exportDocs} onChange={(e) => setDraft((p) => ({ ...p, marketData: { ...p.marketData, exportDocs: e.target.value } }))} />
              </div>
              <div className="subcard">
                <div className="subcard__title">Red flags</div>
                {draft.redFlags.map((f, i) => (
                  <div key={i} className="row rowWrap">
                    <span className="flag-badge red">{f}</span>
                    <button type="button" className="btn ghost" onClick={() => removeFlag('red', i)}>Remove</button>
                  </div>
                ))}
                <div className="row">
                  <input value={newFlag.red} onChange={(e) => setNewFlag((n) => ({ ...n, red: e.target.value }))} placeholder="Add red flag" />
                  <button type="button" className="btn ghost" onClick={() => addFlag('red')}>Add</button>
                </div>
              </div>
              <div className="subcard">
                <div className="subcard__title">Linked contacts</div>
                {(draft.linkedContactIds || []).map((id) => {
                  const c = contacts.find((x) => x._id === id) || selected?.linkedContactIds?.find((x) => (x?._id || x) === id);
                  return (
                    <div key={id} className="row rowWrap">
                      <Link to={`/contacts?selected=${id}`} className="muted">{typeof c === 'object' ? c?.name : id}</Link>
                      <button type="button" className="btn ghost" onClick={() => setDraft((p) => ({ ...p, linkedContactIds: (p.linkedContactIds || []).filter((x) => x !== id) }))}>Remove</button>
                    </div>
                  );
                })}
                <select value="" onChange={(e) => { const v = e.target.value; if (v) setDraft((p) => ({ ...p, linkedContactIds: [...(p.linkedContactIds || []), v] })); e.target.value = ''; }}>
                  <option value="">+ Link contact</option>
                  {contacts.filter((c) => !(draft.linkedContactIds || []).includes(c._id)).map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="subcard">
                <div className="subcard__title">Linked templates</div>
                {(draft.linkedTemplateIds || []).map((id) => {
                  const t = templates.find((x) => x._id === id) || selected?.linkedTemplateIds?.find((x) => (x?._id || x) === id);
                  return (
                    <div key={id} className="row rowWrap">
                      <Link to={`/templates?selected=${id}`} className="muted">{typeof t === 'object' ? t?.name : id}</Link>
                      <button type="button" className="btn ghost" onClick={() => setDraft((p) => ({ ...p, linkedTemplateIds: (p.linkedTemplateIds || []).filter((x) => x !== id) }))}>Remove</button>
                    </div>
                  );
                })}
                <select value="" onChange={(e) => { const v = e.target.value; if (v) setDraft((p) => ({ ...p, linkedTemplateIds: [...(p.linkedTemplateIds || []), v] })); e.target.value = ''; }}>
                  <option value="">+ Link template</option>
                  {templates.filter((t) => !(draft.linkedTemplateIds || []).includes(t._id)).map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="subcard">
                <div className="subcard__title">Green flags</div>
                {draft.greenFlags.map((f, i) => (
                  <div key={i} className="row rowWrap">
                    <span className="flag-badge green">{f}</span>
                    <button type="button" className="btn ghost" onClick={() => removeFlag('green', i)}>Remove</button>
                  </div>
                ))}
                <div className="row">
                  <input value={newFlag.green} onChange={(e) => setNewFlag((n) => ({ ...n, green: e.target.value }))} placeholder="Add green flag" />
                  <button type="button" className="btn ghost" onClick={() => addFlag('green')}>Add</button>
                </div>
              </div>
              <div className="subcard">
                <div className="subcard__title">Vault notes</div>
                <Link to={`/vault?recordType=commodity&recordId=${selected._id}`} className="btn ghost" style={{ marginBottom: 8 }}>
                  + Add vault note for this commodity
                </Link>
                {vaultNotes.length === 0 ? <div className="muted small">No vault notes for this commodity.</div> : null}
                {vaultNotes.slice(0, 5).map((n) => (
                  <div key={n._id} className="muted small" style={{ marginTop: 4 }}>
                    <Link to={`/vault?selected=${n._id}`}>{n.title || 'Untitled'}</Link>
                    {' — '}{n.content ? `${n.content.slice(0, 60)}${n.content.length > 60 ? '…' : ''}` : '—'}
                  </div>
                ))}
                {vaultNotes.length > 5 ? (
                  <Link to={`/vault?recordType=commodity&recordId=${selected._id}`} className="muted small" style={{ display: 'inline-block', marginTop: 8 }}>
                    View all {vaultNotes.length} in Vault →
                  </Link>
                ) : null}
              </div>
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
