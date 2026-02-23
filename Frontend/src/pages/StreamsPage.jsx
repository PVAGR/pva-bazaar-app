import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api';
import { ENV } from '../config/env';
import HelpTip from '../components/HelpTip.jsx';
import AdminNav from '../components/AdminNav.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { getErrorMessage, withRetry } from '../lib/errorUtils';
import { getToken } from '../lib/auth';
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
  const [twitchStatus, setTwitchStatus] = useState(null);
  const [youtubeStatus, setYouTubeStatus] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [twitchLive, setTwitchLive] = useState(null);
  const [youtubeLive, setYouTubeLive] = useState(null);

  const tokenPresent = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!getToken();
  }, []);
  const apiBase = ENV.API_URL.replace(/\/+$/, '');

  async function loadStreams() {
    setLoading(true);
    setError('');
    try {
      const res = await withRetry(() => apiGet('/streams', { params: { limit: 50 } }), {
        retries: 1,
        onRetry: () => {},
      });
      if (res && res.ok && Array.isArray(res.items)) {
        setItems(res.items);
      } else {
        setItems([]);
        setError(res?.error || res?.message || 'Failed to load streams');
      }
    } catch (e) {
      setItems([]);
      setError(getErrorMessage(e, 'Failed to load streams. Check your connection and try again.'));
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

  useEffect(() => {
    // Self-diagnose Twitch configuration (no secrets).
    apiGet('/oauth/twitch/status')
      .then((res) => {
        if (res?.ok) setTwitchStatus(res);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Self-diagnose YouTube configuration (no secrets).
    apiGet('/oauth/youtube/status')
      .then((res) => {
        if (res?.ok) setYouTubeStatus(res);
      })
      .catch(() => {});
  }, []);

  async function refreshLiveStatus() {
    if (!tokenPresent) return;
    setLiveLoading(true);
    try {
      const [tw, yt] = await Promise.allSettled([
        apiGet('/oauth/twitch/live-status'),
        apiGet('/oauth/youtube/live-status'),
      ]);
      if (tw.status === 'fulfilled' && tw.value?.ok) setTwitchLive(tw.value);
      if (yt.status === 'fulfilled' && yt.value?.ok) setYouTubeLive(yt.value);
    } finally {
      setLiveLoading(false);
    }
  }

  useEffect(() => {
    if (!tokenPresent) return;
    // Fetch once on load; user can refresh manually.
    refreshLiveStatus().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenPresent]);

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
      if (twitchStatus && twitchStatus.configured === false) {
        const missing = Array.isArray(twitchStatus.missing) ? twitchStatus.missing.join(', ') : 'missing env vars';
        throw new Error(`Twitch is not configured yet (${missing})`);
      }
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

  async function handleConnectYouTube() {
    setError('');
    try {
      if (youtubeStatus && youtubeStatus.configured === false) {
        const missing = Array.isArray(youtubeStatus.missing) ? youtubeStatus.missing.join(', ') : 'missing env vars';
        throw new Error(`YouTube is not configured yet (${missing})`);
      }
      const res = await apiGet('/oauth/youtube/start', { params: { mode: 'json' } });
      if (!res?.ok || !res?.url) {
        throw new Error(res?.message || res?.error || 'Failed to start YouTube connect');
      }
      window.location.assign(res.url);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || `Failed to start YouTube connect (apiBase=${apiBase})`);
    }
  }

  const twitchChannel = profile?.twitch?.login || '';
  const twitchParent = typeof window !== 'undefined' ? window.location.hostname : 'pvabazaar.org';
  const twitchPlayerUrl = twitchChannel
    ? `https://player.twitch.tv/?channel=${encodeURIComponent(twitchChannel)}&parent=${encodeURIComponent(twitchParent)}`
    : '';
  const twitchChatUrl = twitchChannel
    ? `https://www.twitch.tv/embed/${encodeURIComponent(twitchChannel)}/chat?parent=${encodeURIComponent(twitchParent)}`
    : '';

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
          <button className="btn ghost" type="button" onClick={refreshLiveStatus} disabled={liveLoading || !tokenPresent}>
            {liveLoading ? 'Checking live…' : 'Check live'}
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
            <div className="muted">
              YouTube: {youtubeLive?.connected ? <b>connected</b> : <b>not connected</b>}
            </div>
            {twitchStatus ? (
              <div className="muted small">
                Twitch config:{' '}
                {twitchStatus.configured ? (
                  <b>configured</b>
                ) : (
                  <b>
                    missing {Array.isArray(twitchStatus.missing) && twitchStatus.missing.length ? twitchStatus.missing.join(', ') : 'env vars'}
                  </b>
                )}{' '}
                <HelpTip
                  title="Twitch setup"
                  body="To enable Twitch connect, set TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, and a matching TWITCH_REDIRECT_URI in Vercel. This status check never shows secret values."
                  example="TWITCH_REDIRECT_URI=https://api.pvabazaar.org/api/oauth/twitch/callback"
                />
              </div>
            ) : null}
            {youtubeStatus ? (
              <div className="muted small">
                YouTube config:{' '}
                {youtubeStatus.configured ? (
                  <b>configured</b>
                ) : (
                  <b>
                    missing{' '}
                    {Array.isArray(youtubeStatus.missing) && youtubeStatus.missing.length
                      ? youtubeStatus.missing.join(', ')
                      : 'env vars'}
                  </b>
                )}{' '}
                <HelpTip
                  title="YouTube setup"
                  body="To enable YouTube connect, set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and a matching YOUTUBE_REDIRECT_URI in Vercel. This status check never shows secret values."
                  example="YOUTUBE_REDIRECT_URI=https://api.pvabazaar.org/api/oauth/youtube/callback"
                />
              </div>
            ) : null}

            <div className="row streaming-connectRow">
              <button className="btn primary" type="button" onClick={handleConnectTwitch} title="Connect Twitch (OAuth)">
                Connect Twitch
              </button>
              <button className="btn ghost" type="button" onClick={handleConnectYouTube} title="Connect YouTube (OAuth)">
                Connect YouTube
              </button>
              <a className="btn ghost" href="https://studio.youtube.com/channel/UC/livestreaming" target="_blank" rel="noreferrer">
                YouTube Studio
              </a>
              {twitchChannel ? (
                <a className="btn ghost" href="https://dashboard.twitch.tv/u/me/stream-manager" target="_blank" rel="noreferrer">
                  Twitch Stream Manager
                </a>
              ) : null}
            </div>

            <div className="streaming-status">
              <div className="muted small">
                Twitch live:{' '}
                {twitchLive?.connected ? (
                  twitchLive.live ? (
                    <b>
                      LIVE{typeof twitchLive.viewerCount === 'number' ? ` · ${twitchLive.viewerCount} viewers` : ''}
                    </b>
                  ) : (
                    <b>offline</b>
                  )
                ) : (
                  <b>not connected</b>
                )}
              </div>
              <div className="muted small">
                YouTube live:{' '}
                {youtubeLive?.connected ? (
                  youtubeLive.live ? (
                    <b>LIVE{youtubeLive.viewerCount ? ` · ${youtubeLive.viewerCount} viewers` : ''}</b>
                  ) : (
                    <b>offline</b>
                  )
                ) : (
                  <b>not connected</b>
                )}{' '}
                {youtubeLive?.channelTitle ? <span className="muted small">({youtubeLive.channelTitle})</span> : null}
              </div>
            </div>

            {(twitchChannel || youtubeLive?.connected) ? (
              <div className="goLive-cta">
                <h3 className="goLive-cta__title">Go live</h3>
                <p className="muted small">Start streaming on your platform, then create a session below to track it.</p>
                <div className="row rowWrap">
                  {twitchChannel ? (
                    <a className="btn primary" href="https://dashboard.twitch.tv/u/me/stream-manager" target="_blank" rel="noreferrer">
                      Open Twitch Stream Manager
                    </a>
                  ) : null}
                  {youtubeLive?.connected ? (
                    <a className="btn primary" href="https://studio.youtube.com/" target="_blank" rel="noreferrer">
                      Open YouTube Studio
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {twitchChannel ? (
              <div className="streaming-embeds">
                <div className="streaming-embed">
                  <div className="muted small">Player</div>
                  <iframe
                    title="Twitch player"
                    src={twitchPlayerUrl}
                    allowFullScreen
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
                <div className="streaming-embed">
                  <div className="muted small">Chat</div>
                  <iframe
                    title="Twitch chat"
                    src={twitchChatUrl}
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            ) : null}
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
            <b>Not authenticated for streams yet.</b> Login in <code>/login</code> first.
          </div>
        ) : null}

        {error ? (
          <ErrorBanner message={error} onRetry={loadStreams} onDismiss={() => setError('')} />
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
          {loading ? <LoadingSpinner label="Loading streams…" /> : null}
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
                  {((s.webhookEvents && s.webhookEvents.length) || s.startedAt || s.endedAt) ? (
                    <div className="stream-activity muted small">
                      <strong>Activity:</strong>{' '}
                      {s.startedAt ? `Went live ${formatDate(s.startedAt)}` : ''}
                      {s.endedAt ? ` · Ended ${formatDate(s.endedAt)}` : ''}
                      {s.webhookEvents?.length ? ` · ${s.webhookEvents.length} webhook event(s)` : ''}
                    </div>
                  ) : null}
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

