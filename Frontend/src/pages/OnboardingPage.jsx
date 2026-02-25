import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import AdminNav from '../components/AdminNav.jsx';
import HelpTip from '../components/HelpTip.jsx';
import { apiGet, apiPut } from '../lib/api';
import '../styles/admin-common.css';
import './OnboardingPage.css';

function yesNo(v) {
  return v ? '✅' : '⬜';
}

function hasEthereum() {
  return typeof window !== 'undefined' && !!window.ethereum?.request;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('archive-theme');
    return saved ? saved === 'dark' : true;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const [profile, setProfile] = useState(null);
  const [twitchStatus, setTwitchStatus] = useState(null);
  const [youtubeStatus, setYouTubeStatus] = useState(null);
  const [twitchLive, setTwitchLive] = useState(null);
  const [youtubeLive, setYouTubeLive] = useState(null);
  const [streamsCount, setStreamsCount] = useState(null);
  const [dealsCount, setDealsCount] = useState(null);

  const [wallet, setWallet] = useState({ address: '', connecting: false });

  const prefsDraft = useMemo(() => {
    const prefs = profile?.preferences || {};
    return {
      defaultCountry: prefs.defaultCountry || '',
      defaultCurrency: prefs.defaultCurrency || 'USD',
      defaultWalletAddress: prefs.defaultWalletAddress || '',
      defaultTags: prefs.defaultTags || '',
      defaultStreamPlatform: prefs.defaultStreamPlatform || 'none',
      defaultPublicVisibility: typeof prefs.defaultPublicVisibility === 'boolean' ? prefs.defaultPublicVisibility : true,
    };
  }, [profile]);

  const step = useMemo(() => {
    const emailOk = !!profile?.email;
    const defaultsOk = !!prefsDraft.defaultCurrency; // always has default, but keep for messaging
    const walletOk = !!(prefsDraft.defaultWalletAddress || wallet.address);
    const twitchConnected = !!profile?.twitch?.login;
    const youtubeConnected = !!youtubeLive?.connected;
    const hasStreams = typeof streamsCount === 'number' ? streamsCount > 0 : false;
    const hasDeals = typeof dealsCount === 'number' ? dealsCount > 0 : false;

    const all = emailOk && defaultsOk && (twitchConnected || youtubeConnected) && walletOk && hasStreams && hasDeals;
    return { emailOk, defaultsOk, walletOk, twitchConnected, youtubeConnected, hasStreams, hasDeals, all };
  }, [profile, prefsDraft, wallet.address, youtubeLive, streamsCount, dealsCount]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [p, tw, yt, s, d] = await Promise.allSettled([
        apiGet('/users/profile'),
        apiGet('/oauth/twitch/status'),
        apiGet('/oauth/youtube/status'),
        apiGet('/streams', { params: { limit: 1 } }),
        apiGet('/deals', { params: { limit: 1 } }),
      ]);

      if (p.status === 'fulfilled' && p.value?.ok && p.value.user) setProfile(p.value.user);
      if (tw.status === 'fulfilled' && tw.value?.ok) setTwitchStatus(tw.value);
      if (yt.status === 'fulfilled' && yt.value?.ok) setYouTubeStatus(yt.value);

      if (s.status === 'fulfilled' && s.value?.ok && Array.isArray(s.value.items)) setStreamsCount(s.value.items.length);
      if (d.status === 'fulfilled' && d.value?.ok && Array.isArray(d.value.items)) setDealsCount(d.value.items.length);
    } finally {
      setLoading(false);
    }
  }

  async function refreshLiveStatus() {
    try {
      const [tw, yt] = await Promise.allSettled([apiGet('/oauth/twitch/live-status'), apiGet('/oauth/youtube/live-status')]);
      if (tw.status === 'fulfilled' && tw.value?.ok) setTwitchLive(tw.value);
      if (yt.status === 'fulfilled' && yt.value?.ok) setYouTubeLive(yt.value);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadAll().catch(() => setLoading(false));
    refreshLiveStatus().catch(() => {});
  }, []);

  useEffect(() => {
    // Bump "last seen" in Mongo so onboarding feels alive across devices.
    apiPut('/users/profile', { preferences: { onboarding: { lastSeenAt: new Date().toISOString() } } }).catch(() => {});
  }, []);

  async function saveDefaults() {
    if (!profile) return;
    setSaving(true);
    setError('');
    setOkMsg('');
    try {
      const res = await apiPut('/users/profile', { preferences: prefsDraft });
      if (!res?.ok || !res.user) throw new Error(res?.message || 'Save failed');
      setProfile(res.user);
      setOkMsg('Saved.');
      setTimeout(() => setOkMsg(''), 1200);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function hideGuide() {
    setSaving(true);
    setError('');
    try {
      await apiPut('/users/profile', { preferences: { onboarding: { dismissedAt: new Date().toISOString() } } });
      navigate('/account', { replace: true });
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to hide guide');
    } finally {
      setSaving(false);
    }
  }

  async function markCompleted() {
    setSaving(true);
    setError('');
    try {
      await apiPut('/users/profile', { preferences: { onboarding: { completedAt: new Date().toISOString() } } });
      setOkMsg('Setup complete.');
      setTimeout(() => setOkMsg(''), 1200);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to mark complete');
    } finally {
      setSaving(false);
    }
  }

  async function connectWallet() {
    setError('');
    if (!hasEthereum()) {
      setError('No wallet detected. Install MetaMask or use a wallet-enabled browser.');
      return;
    }
    setWallet((w) => ({ ...w, connecting: true }));
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = Array.isArray(accounts) ? String(accounts[0] || '') : '';
      setWallet({ address, connecting: false });

      if (address && profile) {
        // Save as default so it appears everywhere.
        const res = await apiPut('/users/profile', { preferences: { defaultWalletAddress: address } });
        if (res?.ok && res.user) setProfile(res.user);
      }
    } catch (e) {
      setWallet((w) => ({ ...w, connecting: false }));
      setError(e?.message || 'Failed to connect wallet');
    }
  }

  async function handleConnectTwitch() {
    setError('');
    try {
      if (twitchStatus && twitchStatus.configured === false) {
        const missing = Array.isArray(twitchStatus.missing) ? twitchStatus.missing.join(', ') : 'missing env vars';
        throw new Error(`Twitch is not configured yet (${missing})`);
      }
      const res = await apiGet('/oauth/twitch/start', { params: { mode: 'json' } });
      if (!res?.ok || !res?.url) throw new Error(res?.message || res?.error || 'Failed to start Twitch connect');
      window.location.assign(res.url);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to start Twitch connect');
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
      if (!res?.ok || !res?.url) throw new Error(res?.message || res?.error || 'Failed to start YouTube connect');
      window.location.assign(res.url);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to start YouTube connect');
    }
  }

  return (
    <div className={`onboardingPage admin-page authenticated ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <Helmet><title>Guided setup | PVA Bazaar</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <header className="admin-header onboardingHeader">
        <div>
          <h1>🧭 Guided setup</h1>
          <p className="muted">
            A simple checklist so anyone can get set up. One step at a time.
            <HelpTip
              title="How to use this page"
              body="Start at the top and press the buttons. If you don’t know what something means, click the question-mark tips."
              example="Connect Twitch → Check live → Create your first stream"
            />
          </p>
        </div>
        <div className="onboardingActions">
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
          <button className="btn ghost" type="button" onClick={loadAll} disabled={loading}>
            Refresh
          </button>
          <button className="btn ghost" type="button" onClick={hideGuide} disabled={saving}>
            Hide guide
          </button>
        </div>
      </header>

      <AdminNav />

      <main className="onboardingMain">
        {loading ? <div className="muted">Loading…</div> : null}
        {error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : null}
        {okMsg ? <div className="notice">{okMsg}</div> : null}

        <section className="card">
          <h2>Checklist</h2>
          <div className="onboardingChecklist">
            <div className="onboardingItem">
              <div className="onboardingItem__title">{yesNo(step.emailOk)} 1) Account created</div>
              <div className="muted small">You’re signed in and your account exists in MongoDB.</div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">{yesNo(step.defaultsOk)} 2) Defaults saved</div>
              <div className="muted small">Country, currency, tags, and stream defaults help auto-fill forms.</div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">
                {yesNo(step.twitchConnected || step.youtubeConnected)} 3) Streaming connected
              </div>
              <div className="muted small">Connect Twitch and/or YouTube so “Go Live” feels real.</div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">{yesNo(step.walletOk)} 4) Wallet connected</div>
              <div className="muted small">Lets you sign deal messages/evidence (audit trail) before escrow contracts.</div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">{yesNo(step.hasStreams)} 5) First stream created</div>
              <div className="muted small">Creates a saved stream session in MongoDB.</div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">{yesNo(step.hasDeals)} 6) First deal created</div>
              <div className="muted small">Creates a deal workspace with milestones, payments, and messages.</div>
            </div>
          </div>
          <div className="row">
            <button className="btn primary" type="button" disabled={saving || !step.all} onClick={markCompleted}>
              Mark setup complete
            </button>
            <Link className="btn ghost" to="/account">
              Go to Account
            </Link>
            <Link className="btn ghost" to="/streams">
              Go to Streams
            </Link>
            <Link className="btn ghost" to="/deals">
              Go to Deals
            </Link>
          </div>
        </section>

        <section className="card">
          <h2>
            Step 2: Save your defaults
            <HelpTip
              title="Defaults"
              body="These are like “autofill settings.” Once saved, Streams and Deals will pre-fill the right fields automatically."
              example="Default currency: USD"
            />
          </h2>
          {profile ? (
            <div className="form">
              <label>
                Default country
                <HelpTip title="Default country" body="Used for deal drafts and logistics context." example="Kenya" />
                <input
                  value={prefsDraft.defaultCountry}
                  onChange={(e) => setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultCountry: e.target.value } }))}
                  placeholder="Kenya"
                />
              </label>
              <label>
                Default currency
                <HelpTip title="Default currency" body="Used across Deals and payments." example="USD" />
                <input
                  value={prefsDraft.defaultCurrency}
                  onChange={(e) => setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultCurrency: e.target.value } }))}
                  placeholder="USD"
                />
              </label>
              <label>
                Default tags (comma separated)
                <HelpTip title="Tags" body="Helps organize items and streams later." example="coffee, kenya, logistics" />
                <input
                  value={prefsDraft.defaultTags}
                  onChange={(e) => setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultTags: e.target.value } }))}
                  placeholder="coffee, kenya, logistics"
                />
              </label>
              <label>
                Default stream platform
                <HelpTip title="Stream platform" body="Auto-selects the platform when you create a stream session." example="twitch" />
                <input
                  value={prefsDraft.defaultStreamPlatform}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultStreamPlatform: e.target.value } }))
                  }
                  placeholder="twitch"
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!prefsDraft.defaultPublicVisibility}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultPublicVisibility: e.target.checked } }))
                  }
                />
                Default: Public visibility
              </label>
              <div className="row">
                <button className="btn primary" type="button" disabled={saving} onClick={saveDefaults}>
                  {saving ? 'Saving…' : 'Save defaults'}
                </button>
              </div>
            </div>
          ) : (
            <div className="muted">Profile not loaded yet.</div>
          )}
        </section>

        <section className="card">
          <h2>
            Step 3: Connect streaming
            <HelpTip
              title="Streaming connect"
              body="This lets the site talk to Twitch/YouTube using OAuth. We store tokens encrypted in MongoDB."
              example="Connect Twitch → Check live"
            />
          </h2>
          <div className="onboardingGrid">
            <div className="subcard">
              <div className="subcard__title">Twitch</div>
              <div className="muted small">
                Status: {profile?.twitch?.login ? <b>connected (@{profile.twitch.login})</b> : <b>not connected</b>}
              </div>
              <div className="muted small">
                Config: {twitchStatus?.configured ? <b>configured</b> : <b>missing {twitchStatus?.missing?.join(', ') || 'env vars'}</b>}
              </div>
              <div className="row rowWrap">
                <button className="btn primary" type="button" onClick={handleConnectTwitch}>
                  Connect Twitch
                </button>
                <button className="btn ghost" type="button" onClick={refreshLiveStatus}>
                  Check live
                </button>
              </div>
              <div className="muted small">
                Live: {twitchLive?.connected ? (twitchLive.live ? <b>LIVE</b> : <b>offline</b>) : <b>not connected</b>}
              </div>
            </div>

            <div className="subcard">
              <div className="subcard__title">YouTube</div>
              <div className="muted small">Status: {youtubeLive?.connected ? <b>connected</b> : <b>not connected</b>}</div>
              <div className="muted small">
                Config: {youtubeStatus?.configured ? <b>configured</b> : <b>missing {youtubeStatus?.missing?.join(', ') || 'env vars'}</b>}
              </div>
              <div className="row rowWrap">
                <button className="btn primary" type="button" onClick={handleConnectYouTube}>
                  Connect YouTube
                </button>
                <button className="btn ghost" type="button" onClick={refreshLiveStatus}>
                  Check
                </button>
                <a className="btn ghost" href="https://studio.youtube.com/" target="_blank" rel="noopener noreferrer">
                  Open YouTube Studio
                </a>
              </div>
              <div className="muted small">{youtubeLive?.channelTitle ? `Channel: ${youtubeLive.channelTitle}` : ''}</div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>
            Step 4: Connect wallet
            <HelpTip
              title="Wallet connect"
              body="This does not send money. It only lets you sign messages and evidence so they’re verifiable."
              example="Sign: “Tracking number 12345”"
            />
          </h2>
          <div className="row rowWrap">
            <button className="btn primary" type="button" onClick={connectWallet} disabled={wallet.connecting}>
              {wallet.address ? 'Wallet connected' : wallet.connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
            <div className="muted small">
              {wallet.address ? `Connected: ${wallet.address}` : prefsDraft.defaultWalletAddress ? `Saved default: ${prefsDraft.defaultWalletAddress}` : ''}
            </div>
            {!hasEthereum() ? <div className="muted small">Tip: install MetaMask to enable wallet connect.</div> : null}
          </div>
        </section>

        <section className="card">
          <h2>Steps 5–6: Create your first stream + deal</h2>
          <div className="row rowWrap">
            <Link className="btn primary" to="/streams">
              Create first stream
            </Link>
            <Link className="btn primary" to="/deals">
              Create first deal
            </Link>
            <div className="muted small">
              Streams created: {typeof streamsCount === 'number' ? streamsCount : '—'} · Deals created:{' '}
              {typeof dealsCount === 'number' ? dealsCount : '—'}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

