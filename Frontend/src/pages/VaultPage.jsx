import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import AdminNav from '../components/AdminNav.jsx';
import { getErrorMessage } from '../lib/errorUtils';
import '../styles/admin-common.css';
import './VaultPage.css';

const RECORD_TYPES = ['general', 'contact', 'commodity', 'deal'];

export default function VaultPage() {
  const [searchParams] = useSearchParams();
  const urlRecordType = searchParams.get('recordType') || '';
  const urlRecordId = searchParams.get('recordId') || '';
  const urlSelected = searchParams.get('selected') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    recordType: urlRecordType && RECORD_TYPES.includes(urlRecordType) ? urlRecordType : 'general',
    recordId: urlRecordId,
    title: '',
    content: '',
  });

  useEffect(() => {
    if (urlRecordType && RECORD_TYPES.includes(urlRecordType) && urlRecordId) {
      setDraft((p) => ({ ...p, recordType: urlRecordType, recordId: urlRecordId }));
    }
  }, [urlRecordType, urlRecordId]);

  useEffect(() => {
    if (urlSelected) setSelectedId(urlSelected);
  }, [urlSelected]);

  async function loadNotes() {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (urlRecordType && RECORD_TYPES.includes(urlRecordType)) params.recordType = urlRecordType;
      if (urlRecordId) params.recordId = urlRecordId;
      const res = await apiGet('/vault-notes', { params });
      if (res?.ok && Array.isArray(res.items)) setItems(res.items);
      else setError(res?.error || 'Failed to load vault notes');
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load vault notes'));
    } finally {
      setLoading(false);
    }
  }

  async function loadNote(id) {
    if (!id) return;
    setSelected(null);
    try {
      const res = await apiGet(`/vault-notes/${id}`);
      if (res?.ok && res.item) {
        setSelected(res.item);
        setDraft({
          recordType: res.item.recordType || 'general',
          recordId: res.item.recordId || '',
          title: res.item.title || '',
          content: res.item.content || '',
        });
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load vault note'));
    }
  }

  useEffect(() => {
    loadNotes();
  }, [urlRecordType, urlRecordId]);

  useEffect(() => {
    if (selectedId) loadNote(selectedId);
  }, [selectedId]);

  async function handleCreate(e) {
    e.preventDefault();
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!title && !content) {
      setError('Title or content required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await apiPost('/vault-notes', {
        recordType: draft.recordType,
        recordId: draft.recordId || undefined,
        title: title || 'Untitled',
        content,
      });
      if (!res?.ok || !res.item) throw new Error(res?.error || 'Create failed');
      await loadNotes();
      setSelectedId(res.item._id);
      setDraft({ recordType: 'general', recordId: '', title: '', content: '' });
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
      const res = await apiPut(`/vault-notes/${selected._id}`, {
        recordType: draft.recordType,
        recordId: draft.recordId || undefined,
        title: draft.title.trim() || 'Untitled',
        content: draft.content.trim(),
      });
      if (!res?.ok) throw new Error(res?.error || 'Save failed');
      setSelected(res.item);
      await loadNotes();
    } catch (e) {
      setError(getErrorMessage(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected?._id || !window.confirm('Delete this vault note?')) return;
    setError('');
    try {
      await apiDelete(`/vault-notes/${selected._id}`);
      setSelectedId('');
      setSelected(null);
      await loadNotes();
    } catch (e) {
      setError(getErrorMessage(e, 'Delete failed'));
    }
  }

  return (
    <div className="vault-page admin-page authenticated">
      <header className="admin-header vault-header">
        <div className="vault-header__row">
          <div>
            <h1>My Record (Vault)</h1>
            <p className="muted">Private notes for contacts, commodities, deals—your personal Akashic layer.</p>
          </div>
          <div className="vault-actions">
            <Link to="/broker" className="btn ghost">Hub</Link>
            <button className="btn ghost" onClick={loadNotes} disabled={loading}>Refresh</button>
          </div>
        </div>
      </header>
      <AdminNav />

      <main className="vault-main">
        {error ? <ErrorBanner message={error} onRetry={loadNotes} onDismiss={() => setError('')} /> : null}

        <section className="card">
          <h2>New note</h2>
          <form className="form" onSubmit={handleCreate}>
            <label>Type</label>
            <select value={draft.recordType} onChange={(e) => setDraft((p) => ({ ...p, recordType: e.target.value }))}>
              {RECORD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label>Title</label>
            <input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} placeholder="Brief title" />
            <label>Content</label>
            <textarea rows={4} value={draft.content} onChange={(e) => setDraft((p) => ({ ...p, content: e.target.value }))} placeholder="Private note..." />
            <div className="row">
              <button className="btn primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Your vault notes</h2>
          {loading ? <LoadingSpinner label="Loading…" /> : null}
          {!loading && items.length === 0 ? <div className="muted">No vault notes yet.</div> : null}
          <div className="vault-list">
            {items.map((n) => (
              <button
                key={n._id}
                className={`vault-item ${selectedId === n._id ? 'active' : ''}`}
                onClick={() => setSelectedId(n._id)}
              >
                <div className="vault-item__title">{n.title || 'Untitled'}</div>
                <div className="muted small">{n.recordType} · {n.content ? `${n.content.slice(0, 40)}...` : '—'}</div>
              </button>
            ))}
          </div>
        </section>

        {selected ? (
          <section className="card">
            <h2>Edit: {selected.title || 'Untitled'}</h2>
            <div className="form">
              <label>Type</label>
              <select value={draft.recordType} onChange={(e) => setDraft((p) => ({ ...p, recordType: e.target.value }))}>
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <label>Title</label>
              <input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
              <label>Content</label>
              <textarea rows={12} value={draft.content} onChange={(e) => setDraft((p) => ({ ...p, content: e.target.value }))} className="vault-content" />
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
