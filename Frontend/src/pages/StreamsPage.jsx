import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api';
import './StreamsPage.css';

const PLATFORM_OPTIONS = ['none', 'youtube', 'twitch', 'kick', 'facebook', 'custom'];
const STATUS_OPTIONS = ['scheduled', 'live', 'ended'];

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function StreamsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    platform: 'none',
    platformStreamUrl: '',
    description: '',
    tags: '',
    isPublic: true,
  });

  const tokenPresent = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!(localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt'));
  }, []);

  async function loadStreams() {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/streams', { params: { limit: 50 } });
      if (res && res.ok && Array.isArray(res.items)) {
        setItems(res.items);
      } else {
        setItems([]);
        setError(res?.error || 'Failed to load streams');
      }
    } catch (e) {
      setItems([]);
      setError(e.message || 'Failed to load streams');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStreams();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim() || 'Untitled Stream',
        platform: form.platform,
        platformStreamUrl: form.platformStreamUrl.trim() || undefined,
        description: form.description.trim() || '',
        tags: form.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        isPublic: !!form.isPublic,
      };
      const res = await apiPost('/streams', payload);
      if (!res?.ok || !res.item) {
        throw new Error(res?.error || 'Create failed');
      }
      setForm({ title: '', platform: 'none', platformStreamUrl: '', description: '', tags: '', isPublic: true });
      await loadStreams();
    } catch (e2) {
      setError(e2.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id, patch) {
    setError('');
    try {
      const res = await apiPut(`/streams/${id}`, patch);
      if (!res?.ok || !res.item) {
        throw new Error(res?.error || 'Update failed');
      }
      setItems(prev => prev.map(s => (s._id === id ? res.item : s)));
    } catch (e) {
      setError(e.message || 'Update failed');
    }
  }

  async function handleDelete(id) {
    setError('');
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this stream session?')) return;
    try {
      const res = await apiDelete(`/streams/${id}`);
      if (!res?.ok) {
        throw new Error(res?.error || 'Delete failed');
      }
      setItems(prev => prev.filter(s => s._id !== id));
    } catch (e) {
      setError(e.message || 'Delete failed');
    }
  }

  return (
    <main className="streams-page">
      <header className="streams-header">
        <div>
          <h1>📺 Livestreams</h1>
          <p className="muted">
            Create and manage stream sessions. This uses the live API at <code>/api/streams</code>.
          </p>
        </div>
        <div className="streams-actions">
          <Link to="/admin" className="btn ghost">← Admin</Link>
          <button className="btn ghost" onClick={loadStreams} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {!tokenPresent ? (
        <div className="notice">
          <b>Not authenticated for streams yet.</b> Login in <code>/admin</code> first.
        </div>
      ) : null}

      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="card">
        <h2>Create stream session</h2>
        <form className="form" onSubmit={handleCreate}>
          <label>
            Title
            <input
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Friday Night Live"
            />
          </label>

          <label>
            Platform
            <select
              value={form.platform}
              onChange={e => setForm(prev => ({ ...prev, platform: e.target.value }))}
            >
              {PLATFORM_OPTIONS.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label>
            Platform stream URL (optional)
            <input
              value={form.platformStreamUrl}
              onChange={e => setForm(prev => ({ ...prev, platformStreamUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>

          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </label>

          <label>
            Tags (comma separated)
            <input
              value={form.tags}
              onChange={e => setForm(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="jewelry, auction, qna"
            />
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={e => setForm(prev => ({ ...prev, isPublic: e.target.checked }))}
            />
            Public
          </label>

          <div className="row">
            <button className="btn primary" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Your stream sessions</h2>
        {loading ? <div className="muted">Loading…</div> : null}
        {!loading && items.length === 0 ? <div className="muted">No stream sessions yet.</div> : null}
        <div className="streams-list">
          {items.map(s => (
            <div key={s._id} className="stream-row">
              <div className="stream-main">
                <div className="stream-title">{s.title}</div>
                <div className="muted">
                  {s.platform ? `${s.platform}` : 'none'}
                  {s.platformStreamUrl ? ` · ${s.platformStreamUrl}` : ''}
                </div>
                <div className="muted">
                  created {formatDate(s.createdAt)}{s.startedAt ? ` · started ${formatDate(s.startedAt)}` : ''}
                </div>
              </div>

              <div className="stream-controls">
                <select
                  value={s.status || 'scheduled'}
                  onChange={e => handleUpdate(s._id, { status: e.target.value })}
                >
                  {STATUS_OPTIONS.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <button className="btn ghost" onClick={() => handleDelete(s._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

