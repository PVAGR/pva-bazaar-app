import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api';
import { ENV } from '../config/env';
import HelpTip from '../components/HelpTip.jsx';
import AdminNav from '../components/AdminNav.jsx';
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
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('archive-theme');
    return saved ? saved === 'dark' : true;
  });

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    platform: 'none',
    platformStreamUrl: '',
    description: '',
    tags: '',
    isPublic: true,
  });
  const [profile, setProfile] = useState(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSavedOk, setPrefsSavedOk] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftRestoreHint, setDraftRestoreHint] = useState('');

  const tokenPresent = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!(localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt'));
  }, []);
  const apiBase = ENV.API_URL.replace(/\/+$/, '');

  async function loadStreams() {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/streams', { params: { limit: 50 } });
      if (res && res.ok && Array.isArray(res.items)) {
        setItems(res.items);
      } else {
        setItems([]);
        setError(res?.error || res?.message || 'Failed to load streams');
      }
    } catch (e) {
      setItems([]);
      // Axios errors often have server response payload in e.response.data
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to load streams');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStreams();
  }, []);

  useEffect(() => {
    // Best-effort: show who is signed in + connected services.
    apiGet('/users/profile')
      .then((res) => {
        if (res?.ok && res.user) {
          setProfile(res.user);

          const prefs = res.user?.preferences || {};
          // Prefill defaults if the user hasn't typed anything yet.
          setForm((prev) => {
            const pristine =
              !prev.title &&
              !prev.platformStreamUrl &&
              !prev.description &&
              !prev.tags &&
              (prev.platform === 'none' || !prev.platform);
            if (!pristine) return prev;
            return {
              ...prev,
              platform: prefs.defaultStreamPlatform || prev.platform,
              tags: prefs.defaultTags || prev.tags,
              isPublic:
                typeof prefs.defaultPublicVisibility === 'boolean' ? prefs.defaultPublicVisibility : prev.isPublic,
            };
          });
        }
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    if (!tokenPresent) return;
    if (draftLoaded) return;
    apiGet('/streams/drafts')
      .then((res) => {
        setDraftLoaded(true);
        const draft = res?.draft;
        if (!draft || typeof draft !== 'object') return;

        setForm((prev) => {
          const pristine =
            !prev.title &&
            !prev.platformStreamUrl &&
            !prev.description &&
            !prev.tags &&
            (prev.platform === 'none' || !prev.platform);
          if (!pristine) {
            setDraftRestoreHint('A previous draft exists (not auto-restored because you already started typing).');
            return prev;
          }
          setDraftRestoreHint('Restored your last saved stream draft.');
          return { ...prev, ...draft };
        });
      })
      .catch(() => setDraftLoaded(true));
  }, [draftLoaded, tokenPresent]);

  useEffect(() => {
    if (!tokenPresent) return;
    if (!draftLoaded) return; // avoid saving before we had a chance to restore

    const empty =
      !form.title &&
      !form.platformStreamUrl &&
      !form.description &&
      !form.tags &&
      (form.platform === 'none' || !form.platform) &&
      form.isPublic === true;
    if (empty) return;

    const timer = setTimeout(async () => {
      setDraftSaving(true);
      try {
        await apiPut('/streams/drafts', { draft: form });
      } catch {
        // Best-effort: draft autosave should never block the user.
      } finally {
        setDraftSaving(false);
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [draftLoaded, form, tokenPresent]);

  async function clearDraft() {
    setDraftSaving(true);
    setError('');
    try {
      await apiDelete('/streams/drafts');
      setDraftRestoreHint('Draft cleared.');
      setForm({ title: '', platform: 'none', platformStreamUrl: '', description: '', tags: '', isPublic: true });
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to clear draft');
    } finally {
      setDraftSaving(false);
    }
  }

  async function handleConnectTwitch() {
    setError('');
    try {
      // Must be an authenticated API call (Authorization header) so the backend can
      // bind the OAuth state to your user id.
      const res = await apiGet('/oauth/twitch/start', { params: { mode: 'json' } });
      if (!res?.ok || !res?.url) {
        throw new Error(res?.message || res?.error || 'Failed to start Twitch connect');
      }
      window.location.assign(res.url);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || `Failed to start Twitch connect (apiBase=${apiBase})`);
    }
  }

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
        throw new Error(res?.error || res?.message || 'Create failed');
      }
      // Clear Mongo-backed draft after a successful create.
      apiDelete('/streams/drafts').catch(() => {});
      setForm({ title: '', platform: 'none', platformStreamUrl: '', description: '', tags: '', isPublic: true });
      await loadStreams();
    } catch (e2) {
      const serverMsg = e2?.response?.data?.error || e2?.response?.data?.message;
      setError(serverMsg || e2.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id, patch) {
    setError('');
    try {
      const res = await apiPut(`/streams/${id}`, patch);
      if (!res?.ok || !res.item) {
        throw new Error(res?.error || res?.message || 'Update failed');
      }
      setItems(prev => prev.map(s => (s._id === id ? res.item : s)));
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Update failed');
    }
  }

  async function handleDelete(id) {
    setError('');
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this stream session?')) return;
    try {
      const res = await apiDelete(`/streams/${id}`);
      if (!res?.ok) {
        throw new Error(res?.error || res?.message || 'Delete failed');
      }
      setItems(prev => prev.filter(s => s._id !== id));
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Delete failed');
    }
  }

  return (
    <div className={`streams-shell admin-page authenticated ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <header className="streams-header admin-header">
        <div>
          <h1>📺 Livestreams</h1>
          <p className="muted">
            Create and manage stream sessions. This uses the live API at <code>/api/streams</code>.
          </p>
        </div>
        <div className="streams-actions">
          <Link to="/admin" className="btn ghost">← Admin</Link>
          <Link to="/deals" className="btn ghost">🤝 Deals</Link>
          <Link to="/items/new" className="btn ghost">📦 Sell</Link>
          <button className="btn ghost" onClick={loadStreams} disabled={loading}>
            Refresh
          </button>
          <button
            className="btn primary"
            type="button"
            onClick={handleConnectTwitch}
            title="Connect Twitch (OAuth)"
          >
            Connect Twitch
          </button>
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
      </header>

      <AdminNav />

      <main className="streams-main">
        {profile?.email ? (
          <section className="card streams-card--compact">
            <h2>
              Your account
              <HelpTip
                title="Why this matters"
                body="Streams and deals are saved to your account in MongoDB, so you can come back later and everything is still here."
                example="Signed in as you@example.com"
              />
            </h2>
            <div className="muted">Signed in as <b>{profile.email}</b></div>
            <div className="muted">
              Twitch: {profile.twitch?.login ? <b>connected (@{profile.twitch.login})</b> : <b>not connected</b>}
            </div>
            {profile?.preferences ? (
              <div className="streams-defaults">
                <div className="muted">
                  Defaults (saved to Mongo){' '}
                  <HelpTip
                    title="Saved defaults"
                    body="These defaults auto-fill new stream sessions and persist across refreshes."
                    example="Default platform: twitch"
                  />
                </div>
                <div className="row streams-defaults__row">
                  <label className="streams-defaults__field">
                    Platform
                    <select
                      value={profile.preferences.defaultStreamPlatform || 'none'}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          preferences: { ...(p?.preferences || {}), defaultStreamPlatform: e.target.value },
                        }))
                      }
                    >
                      {PLATFORM_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="streams-defaults__field">
                    Tags
                    <input
                      value={profile.preferences.defaultTags || ''}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          preferences: { ...(p?.preferences || {}), defaultTags: e.target.value },
                        }))
                      }
                      placeholder="coffee, kenya, logistics"
                    />
                  </label>
                </div>
                <label className="streams-defaults__check">
                  <input
                    type="checkbox"
                    checked={
                      typeof profile.preferences.defaultPublicVisibility === 'boolean'
                        ? profile.preferences.defaultPublicVisibility
                        : true
                    }
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        preferences: { ...(p?.preferences || {}), defaultPublicVisibility: e.target.checked },
                      }))
                    }
                  />
                  Default: Public
                </label>
                <div className="row">
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={prefsSaving}
                    onClick={() =>
                      savePreferences({
                        defaultStreamPlatform: profile.preferences.defaultStreamPlatform || 'none',
                        defaultTags: profile.preferences.defaultTags || '',
                        defaultPublicVisibility:
                          typeof profile.preferences.defaultPublicVisibility === 'boolean'
                            ? profile.preferences.defaultPublicVisibility
                            : true,
                      })
                    }
                  >
                    {prefsSaving ? 'Saving…' : 'Save defaults'}
                  </button>
                  {prefsSavedOk ? <span className="muted small">Saved</span> : null}
                  {draftSaving ? <span className="muted small">Saving draft…</span> : null}
                </div>
              </div>
            ) : null}
            {draftRestoreHint ? <div className="muted small">{draftRestoreHint}</div> : null}
            {tokenPresent ? (
              <div className="row">
                <button type="button" className="btn ghost" disabled={draftSaving} onClick={clearDraft}>
                  Clear draft
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

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
            <span>
              Title
              <HelpTip
                title="Stream title"
                body="A human-friendly name for your livestream session. This is what you’ll search/filter by later."
                example="Friday Night Live: Coffee Auction"
              />
            </span>
            <input
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Friday Night Live"
            />
          </label>

          <label>
            <span>
              Platform
              <HelpTip
                title="Streaming platform"
                body="Where your stream is hosted. If you connect Twitch, we can use your Twitch identity for automations later."
                example="twitch"
              />
            </span>
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
            <span>
              Platform stream URL (optional)
              <HelpTip
                title="Stream URL"
                body="Link to the public stream page. Useful for sharing and for verifying you’re live."
                example="https://twitch.tv/yourchannel"
              />
            </span>
            <input
              value={form.platformStreamUrl}
              onChange={e => setForm(prev => ({ ...prev, platformStreamUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>

          <label>
            <span>
              Description
              <HelpTip
                title="What is this stream about?"
                body="Optional notes: what you’re selling, what viewers can expect, and any rules or disclaimers."
                example="Live sourcing update + Q&A"
              />
            </span>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </label>

          <label>
            <span>
              Tags (comma separated)
              <HelpTip
                title="Tags"
                body="Helps you organize and search streams later. Separate tags with commas."
                example="coffee, kenya, logistics"
              />
            </span>
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
            <span>
              Public
              <HelpTip
                title="Public visibility"
                body="If unchecked, this stream session is private to your account (useful while testing)."
                example="Public = on"
              />
            </span>
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
    </div>
  );
}

