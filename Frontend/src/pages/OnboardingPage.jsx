import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CreatorNav from '../components/CreatorNav.jsx';
import HelpTip from '../components/HelpTip.jsx';
import { apiGet, apiPut } from '../lib/api';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import '../styles/admin-common.css';
import './OnboardingPage.css';

function yesNo(v) {
  return v ? '✅' : '⬜';
}

function hasEthereum() {
  return typeof window !== 'undefined' && !!window.ethereum?.request;
}

function generatePseudoEvmAddress() {
  const bytes = new Uint8Array(20);
  if (globalThis?.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
}

const COMMUNITY_PATH_OPTIONS = [
  { value: 'marketplace', label: 'Marketplace trade' },
  { value: 'creator', label: 'Creator storytelling' },
  { value: 'governance', label: 'Governance and proposals' },
  { value: 'research', label: 'Research and archives' },
  { value: 'community', label: 'Community operations' },
];

const COMMUNITY_ROUTE_SUGGESTIONS = {
  marketplace: [
    { to: '/marketplace', label: 'Browse marketplace' },
    { to: '/deals', label: 'Open deals workspace' },
  ],
  creator: [
    { to: '/creator', label: 'Open creator portal' },
    { to: '/archive', label: 'Publish through archive context' },
  ],
  governance: [
    { to: '/forum', label: 'Enter forum' },
    { to: '/proposals/submit', label: 'Submit proposal' },
  ],
  research: [
    { to: '/archive', label: 'Search archive records' },
    { to: '/civilization-library', label: 'Open civilization library' },
  ],
  community: [
    { to: '/citizens', label: 'Open citizen directory' },
    { to: '/conference', label: 'Open conference' },
  ],
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useArchiveTheme();

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

  const [wallet, setWallet] = useState({ address: '', connecting: false, generating: false });

  const prefsDraft = useMemo(() => {
    const prefs = profile?.preferences || {};
    return {
      defaultCountry: prefs.defaultCountry || '',
      defaultCurrency: prefs.defaultCurrency || 'USD',
      defaultWalletAddress: prefs.defaultWalletAddress || '',
      defaultTags: prefs.defaultTags || '',
      defaultStreamPlatform: prefs.defaultStreamPlatform || 'none',
      defaultPublicVisibility:
        typeof prefs.defaultPublicVisibility === 'boolean' ? prefs.defaultPublicVisibility : true,
    };
  }, [profile]);

  const traderDraft = useMemo(() => {
    const onboarding = profile?.onboardingProfile || {};
    const compliance = onboarding.compliance || {};
    const links = onboarding.contactLinks || {};
    return {
      legalFullName: compliance.legalFullName || profile?.name || '',
      legalIdType: compliance.legalIdType || '',
      legalIdNumber: compliance.legalIdNumber || '',
      addressLine1: compliance.addressLine1 || '',
      addressLine2: compliance.addressLine2 || '',
      city: compliance.city || '',
      stateProvince: compliance.stateProvince || '',
      postalCode: compliance.postalCode || '',
      country: compliance.country || prefsDraft.defaultCountry || '',
      phone: compliance.phone || '',
      identityAttested: !!compliance.identityAttested,
      instagram: links.instagram || '',
      telegram: links.telegram || '',
      website: links.website || '',
      other: links.other || '',
    };
  }, [profile, prefsDraft.defaultCountry]);

  const identityDraft = useMemo(() => {
    const identity = profile?.onboardingProfile?.identity || {};
    return {
      walletMode: identity.walletMode || 'none',
      generatedWalletAddress: identity.generatedWalletAddress || '',
      didEnabled: !!identity.didEnabled,
      didMethod: identity.didMethod || 'did:key',
      ipfsEnabled: !!identity.ipfsEnabled,
      ipfsCid: identity.ipfsCid || '',
    };
  }, [profile]);

  const emailPrefsDraft = useMemo(() => {
    const prefs = profile?.onboardingProfile?.emailPreferences || {};
    return {
      digestOptIn: !!prefs.digestOptIn,
      roleTrackUpdates: prefs.roleTrackUpdates !== false,
    };
  }, [profile]);

  const communityDraft = useMemo(() => {
    const onboarding = profile?.onboardingProfile || {};
    return {
      personalJourney: onboarding.personalJourney || '',
      federationPathTags: Array.isArray(onboarding.federationPathTags)
        ? onboarding.federationPathTags
        : [],
    };
  }, [profile]);

  const communityEntryLinks = useMemo(() => {
    const tags = communityDraft.federationPathTags;
    const focus = tags[0] || '';
    const journey = communityDraft.personalJourney.trim();
    const tagsCsv = tags.join(',');
    const shortJourney = journey.slice(0, 240);
    const prompt = [
      'I am completing onboarding in PVA Bazaar.',
      tagsCsv ? `My federation path tags are: ${tagsCsv}.` : '',
      shortJourney ? `My journey summary: ${shortJourney}` : '',
      'Guide me to my best first contribution in this community.',
    ]
      .filter(Boolean)
      .join(' ');

    const forumParams = new URLSearchParams();
    forumParams.set('onboarding', '1');
    if (focus) forumParams.set('focus', focus);
    if (tagsCsv) forumParams.set('tags', tagsCsv);
    if (shortJourney) forumParams.set('journey', shortJourney);

    const citizensParams = new URLSearchParams();
    citizensParams.set('onboarding', '1');
    if (tagsCsv) citizensParams.set('tags', tagsCsv);

    const conferenceParams = new URLSearchParams();
    conferenceParams.set('onboarding', '1');
    if (focus) conferenceParams.set('focus', focus);

    const agentParams = new URLSearchParams();
    agentParams.set('onboarding', '1');
    if (focus) agentParams.set('focus', focus);
    if (tagsCsv) agentParams.set('tags', tagsCsv);
    if (shortJourney) agentParams.set('journey', shortJourney);
    agentParams.set('starter', prompt);

    return {
      forum: `/forum?${forumParams.toString()}`,
      citizens: `/citizens?${citizensParams.toString()}`,
      conference: `/conference?${conferenceParams.toString()}`,
      agent: `/agent?${agentParams.toString()}`,
    };
  }, [communityDraft.personalJourney, communityDraft.federationPathTags]);

  const suggestedRoutes = useMemo(() => {
    const deduped = new Map();
    for (const tag of communityDraft.federationPathTags) {
      const suggestions = COMMUNITY_ROUTE_SUGGESTIONS[tag] || [];
      for (const suggestion of suggestions) {
        if (!deduped.has(suggestion.to)) {
          deduped.set(suggestion.to, suggestion);
        }
      }
    }
    return Array.from(deduped.values()).slice(0, 6);
  }, [communityDraft.federationPathTags]);

  const step = useMemo(() => {
    const emailOk = !!profile?.email;
    const defaultsOk = !!prefsDraft.defaultCurrency; // always has default, but keep for messaging
    const walletOk = !!(
      prefsDraft.defaultWalletAddress ||
      wallet.address ||
      identityDraft.generatedWalletAddress
    );
    const twitchConnected = !!profile?.twitch?.login;
    const youtubeConnected = !!youtubeLive?.connected;
    const hasStreams = typeof streamsCount === 'number' ? streamsCount > 0 : false;
    const hasDeals = typeof dealsCount === 'number' ? dealsCount > 0 : false;
    const emailPrefsOk = Boolean(profile?.onboardingProfile?.emailPreferences);
    const communityProfileOk =
      Boolean(communityDraft.personalJourney.trim()) &&
      communityDraft.federationPathTags.length > 0;
    const traderIdentityOk = Boolean(
      traderDraft.legalFullName &&
        traderDraft.legalIdType &&
        traderDraft.legalIdNumber &&
        traderDraft.addressLine1 &&
        traderDraft.city &&
        traderDraft.postalCode &&
        traderDraft.country &&
        traderDraft.phone &&
        traderDraft.identityAttested,
    );

    const all =
      emailOk &&
      defaultsOk &&
      (twitchConnected || youtubeConnected) &&
      walletOk &&
      traderIdentityOk &&
      emailPrefsOk &&
      communityProfileOk &&
      hasStreams &&
      hasDeals;
    return {
      emailOk,
      defaultsOk,
      walletOk,
      traderIdentityOk,
      emailPrefsOk,
      communityProfileOk,
      twitchConnected,
      youtubeConnected,
      hasStreams,
      hasDeals,
      all,
    };
  }, [
    profile,
    prefsDraft,
    traderDraft,
    wallet.address,
    identityDraft.generatedWalletAddress,
    communityDraft.personalJourney,
    communityDraft.federationPathTags,
    youtubeLive,
    streamsCount,
    dealsCount,
  ]);

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

      if (s.status === 'fulfilled' && s.value?.ok && Array.isArray(s.value.items))
        setStreamsCount(s.value.items.length);
      if (d.status === 'fulfilled' && d.value?.ok && Array.isArray(d.value.items))
        setDealsCount(d.value.items.length);
    } finally {
      setLoading(false);
    }
  }

  async function refreshLiveStatus() {
    try {
      const [tw, yt] = await Promise.allSettled([
        apiGet('/oauth/twitch/live-status'),
        apiGet('/oauth/youtube/live-status'),
      ]);
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
    apiPut('/users/profile', {
      preferences: { onboarding: { lastSeenAt: new Date().toISOString() } },
    }).catch(() => {});
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
      await apiPut('/users/profile', {
        preferences: { onboarding: { dismissedAt: new Date().toISOString() } },
      });
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
      await apiPut('/users/profile', {
        preferences: { onboarding: { completedAt: new Date().toISOString() } },
      });
      setOkMsg('Setup complete.');
      setTimeout(() => setOkMsg(''), 1200);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to mark complete');
    } finally {
      setSaving(false);
    }
  }

  async function saveTraderIdentity() {
    setSaving(true);
    setError('');
    setOkMsg('');
    try {
      const payload = {
        onboardingProfile: {
          compliance: {
            legalFullName: traderDraft.legalFullName,
            legalIdType: traderDraft.legalIdType,
            legalIdNumber: traderDraft.legalIdNumber,
            addressLine1: traderDraft.addressLine1,
            addressLine2: traderDraft.addressLine2,
            city: traderDraft.city,
            stateProvince: traderDraft.stateProvince,
            postalCode: traderDraft.postalCode,
            country: traderDraft.country,
            phone: traderDraft.phone,
            identityAttested: traderDraft.identityAttested,
          },
          contactLinks: {
            instagram: traderDraft.instagram,
            telegram: traderDraft.telegram,
            website: traderDraft.website,
            other: traderDraft.other,
          },
        },
      };
      const res = await apiPut('/users/profile', payload);
      if (!res?.ok || !res.user) throw new Error(res?.message || 'Failed to save trader profile');
      setProfile(res.user);
      setOkMsg('Trader identity profile saved.');
      setTimeout(() => setOkMsg(''), 1500);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to save trader profile');
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
      setWallet((w) => ({ ...w, address, connecting: false }));

      if (address && profile) {
        // Save as default and mark identity rail as connected.
        const res = await apiPut('/users/profile', {
          preferences: { defaultWalletAddress: address },
          onboardingProfile: {
            identity: {
              walletMode: 'connected',
              generatedWalletAddress: '',
              generatedWalletAt: null,
            },
          },
        });
        if (res?.ok && res.user) setProfile(res.user);
      }
    } catch (e) {
      setWallet((w) => ({ ...w, connecting: false }));
      setError(e?.message || 'Failed to connect wallet');
    }
  }

  async function generateWallet() {
    setError('');
    setWallet((w) => ({ ...w, generating: true }));
    try {
      const address = generatePseudoEvmAddress();
      const res = await apiPut('/users/profile', {
        preferences: { defaultWalletAddress: address },
        onboardingProfile: {
          identity: {
            walletMode: 'generated',
            generatedWalletAddress: address,
            generatedWalletAt: new Date().toISOString(),
          },
        },
      });
      if (!res?.ok || !res?.user)
        throw new Error(res?.message || 'Failed to save generated wallet');
      setProfile(res.user);
      setWallet((w) => ({ ...w, address, generating: false }));
      setOkMsg('Wallet address generated and saved for onboarding intent.');
      setTimeout(() => setOkMsg(''), 1500);
    } catch (e) {
      setWallet((w) => ({ ...w, generating: false }));
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to generate wallet');
    }
  }

  async function saveIdentityOptions() {
    setSaving(true);
    setError('');
    setOkMsg('');
    try {
      const payload = {
        onboardingProfile: {
          identity: {
            didEnabled: identityDraft.didEnabled,
            didMethod: identityDraft.didMethod,
            ipfsEnabled: identityDraft.ipfsEnabled,
            ipfsCid: identityDraft.ipfsCid,
          },
        },
      };
      const res = await apiPut('/users/profile', payload);
      if (!res?.ok || !res?.user)
        throw new Error(res?.message || 'Failed to save identity options');
      setProfile(res.user);
      setOkMsg('Identity options saved.');
      setTimeout(() => setOkMsg(''), 1500);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to save identity options');
    } finally {
      setSaving(false);
    }
  }

  async function saveEmailPreferences() {
    setSaving(true);
    setError('');
    setOkMsg('');
    try {
      const payload = {
        onboardingProfile: {
          emailPreferences: {
            digestOptIn: emailPrefsDraft.digestOptIn,
            roleTrackUpdates: emailPrefsDraft.roleTrackUpdates,
          },
        },
      };
      const res = await apiPut('/users/profile', payload);
      if (!res?.ok || !res?.user)
        throw new Error(res?.message || 'Failed to save email preferences');
      setProfile(res.user);
      setOkMsg('Email preferences saved.');
      setTimeout(() => setOkMsg(''), 1500);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to save email preferences');
    } finally {
      setSaving(false);
    }
  }

  async function saveCommunityProfile() {
    setSaving(true);
    setError('');
    setOkMsg('');
    try {
      const payload = {
        onboardingProfile: {
          personalJourney: communityDraft.personalJourney,
          federationPathTags: communityDraft.federationPathTags,
        },
      };
      const res = await apiPut('/users/profile', payload);
      if (!res?.ok || !res?.user)
        throw new Error(res?.message || 'Failed to save community profile');
      setProfile(res.user);
      setOkMsg('Community journey saved.');
      setTimeout(() => setOkMsg(''), 1500);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to save community profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleConnectTwitch() {
    setError('');
    try {
      if (twitchStatus && twitchStatus.configured === false) {
        const missing = Array.isArray(twitchStatus.missing)
          ? twitchStatus.missing.join(', ')
          : 'missing env vars';
        throw new Error(`Twitch is not configured yet (${missing})`);
      }
      const res = await apiGet('/oauth/twitch/start', { params: { mode: 'json' } });
      if (!res?.ok || !res?.url)
        throw new Error(res?.message || res?.error || 'Failed to start Twitch connect');
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
        const missing = Array.isArray(youtubeStatus.missing)
          ? youtubeStatus.missing.join(', ')
          : 'missing env vars';
        throw new Error(`YouTube is not configured yet (${missing})`);
      }
      const res = await apiGet('/oauth/youtube/start', { params: { mode: 'json' } });
      if (!res?.ok || !res?.url)
        throw new Error(res?.message || res?.error || 'Failed to start YouTube connect');
      window.location.assign(res.url);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Failed to start YouTube connect');
    }
  }

  return (
    <div
      className={`onboardingPage admin-page authenticated ${darkMode ? 'dark-theme' : 'light-theme'}`}
    >
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
            onClick={toggleTheme}
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

      <CreatorNav />

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
              <div className="muted small">
                You’re signed in and your account exists in MongoDB.
              </div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">
                {yesNo(step.defaultsOk)} 2) Defaults saved
              </div>
              <div className="muted small">
                Country, currency, tags, and stream defaults help auto-fill forms.
              </div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">
                {yesNo(step.twitchConnected || step.youtubeConnected)} 3) Streaming connected
              </div>
              <div className="muted small">
                Connect Twitch and/or YouTube so “Go Live” feels real.
              </div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">
                {yesNo(step.walletOk)} 4) Wallet connected
              </div>
              <div className="muted small">
                Lets you sign deal messages/evidence (audit trail) before escrow contracts.
              </div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">
                {yesNo(step.traderIdentityOk)} 5) Trader identity complete
              </div>
              <div className="muted small">
                Required before you can register items for trade and business operations.
              </div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">
                {yesNo(step.hasStreams)} 6) First stream created
              </div>
              <div className="muted small">Creates a saved stream session in MongoDB.</div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">
                {yesNo(step.hasDeals)} 7) First deal created
              </div>
              <div className="muted small">
                Creates a deal workspace with milestones, payments, and messages.
              </div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">
                {yesNo(step.emailPrefsOk)} 8) Email preferences set
              </div>
              <div className="muted small">
                Controls digest subscription and role-track updates for your federation journey.
              </div>
            </div>
            <div className="onboardingItem">
              <div className="onboardingItem__title">
                {yesNo(step.communityProfileOk)} 9) Community journey mapped
              </div>
              <div className="muted small">
                Add your journey and path tags, then jump straight into community spaces.
              </div>
            </div>
          </div>
          <div className="row">
            <button
              className="btn primary"
              type="button"
              disabled={saving || !step.all}
              onClick={markCompleted}
            >
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
            Step 5: Trader identity and contact profile
            <HelpTip
              title="Trader identity"
              body="If you want to trade or do business, fill this legal profile first. Admin can review this in dashboard exports."
              example="Legal name + ID + address + phone + attestation"
            />
          </h2>
          {profile ? (
            <div className="form">
              <label>
                Legal full name (must match your ID)
                <input
                  value={traderDraft.legalFullName}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          legalFullName: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                ID type
                <input
                  value={traderDraft.legalIdType}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          legalIdType: e.target.value,
                        },
                      },
                    }))
                  }
                  placeholder="Passport, National ID, Driver License"
                />
              </label>
              <label>
                ID number
                <input
                  value={traderDraft.legalIdNumber}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          legalIdNumber: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                Address line 1
                <input
                  value={traderDraft.addressLine1}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          addressLine1: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                Address line 2 (optional)
                <input
                  value={traderDraft.addressLine2}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          addressLine2: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                City
                <input
                  value={traderDraft.city}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          city: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                State / province
                <input
                  value={traderDraft.stateProvince}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          stateProvince: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                Postal code
                <input
                  value={traderDraft.postalCode}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          postalCode: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                Country
                <input
                  value={traderDraft.country}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          country: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                Phone number
                <input
                  value={traderDraft.phone}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          phone: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>

              <h3>Contact links</h3>
              <label>
                Instagram
                <input
                  value={traderDraft.instagram}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        contactLinks: {
                          ...(p?.onboardingProfile?.contactLinks || {}),
                          instagram: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                Telegram
                <input
                  value={traderDraft.telegram}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        contactLinks: {
                          ...(p?.onboardingProfile?.contactLinks || {}),
                          telegram: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <label>
                Website
                <input
                  value={traderDraft.website}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        contactLinks: {
                          ...(p?.onboardingProfile?.contactLinks || {}),
                          website: e.target.value,
                        },
                      },
                    }))
                  }
                  placeholder="https://your-site.example"
                />
              </label>

              <label className="check">
                <input
                  type="checkbox"
                  checked={!!traderDraft.identityAttested}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      onboardingProfile: {
                        ...(p?.onboardingProfile || {}),
                        compliance: {
                          ...(p?.onboardingProfile?.compliance || {}),
                          identityAttested: e.target.checked,
                        },
                      },
                    }))
                  }
                />
                I attest this identity information is accurate and legally mine.
              </label>

              <div className="row">
                <button
                  className="btn primary"
                  type="button"
                  disabled={saving}
                  onClick={saveTraderIdentity}
                >
                  {saving ? 'Saving…' : 'Save trader identity'}
                </button>
              </div>
            </div>
          ) : (
            <div className="muted">Profile not loaded yet.</div>
          )}
        </section>

        <section className="card">
          <h2>
            Step 8: Email preferences
            <HelpTip
              title="Email preferences"
              body="Choose whether to receive platform digest emails and role-track update emails."
              example="Weekly digest on, role-track updates on"
            />
          </h2>
          <div className="form">
            <label className="check">
              <input
                type="checkbox"
                checked={emailPrefsDraft.digestOptIn}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    onboardingProfile: {
                      ...(p?.onboardingProfile || {}),
                      emailPreferences: {
                        ...(p?.onboardingProfile?.emailPreferences || {}),
                        digestOptIn: e.target.checked,
                      },
                    },
                  }))
                }
              />
              Receive digest emails
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={emailPrefsDraft.roleTrackUpdates}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    onboardingProfile: {
                      ...(p?.onboardingProfile || {}),
                      emailPreferences: {
                        ...(p?.onboardingProfile?.emailPreferences || {}),
                        roleTrackUpdates: e.target.checked,
                      },
                    },
                  }))
                }
              />
              Receive role-track updates
            </label>
            <div className="row">
              <button
                className="btn primary"
                type="button"
                disabled={saving}
                onClick={saveEmailPreferences}
              >
                {saving ? 'Saving…' : 'Save email preferences'}
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>
            Step 9: Community bridge
            <HelpTip
              title="Community bridge"
              body="Describe your journey, tag your path, then jump directly into forum and federation touchpoints."
              example="Journey: source artisan coffee from Kenya; Tags: Marketplace trade + Community operations"
            />
          </h2>
          <div className="form">
            <label>
              Personal journey
              <textarea
                value={communityDraft.personalJourney}
                maxLength={2000}
                rows={5}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    onboardingProfile: {
                      ...(p?.onboardingProfile || {}),
                      personalJourney: e.target.value,
                    },
                  }))
                }
                placeholder="Write 2-4 lines on your mission, what you want to build, and what kind of collaborators you seek."
              />
            </label>

            <label>
              Federation path tags
              <div className="chipRow" role="group" aria-label="Federation path tags">
                {COMMUNITY_PATH_OPTIONS.map((option) => {
                  const active = communityDraft.federationPathTags.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`chipBtn ${active ? 'is-active' : ''}`}
                      onClick={() => {
                        setProfile((p) => {
                          const current = Array.isArray(p?.onboardingProfile?.federationPathTags)
                            ? p.onboardingProfile.federationPathTags
                            : [];
                          const next = current.includes(option.value)
                            ? current.filter((item) => item !== option.value)
                            : [...current, option.value];
                          return {
                            ...p,
                            onboardingProfile: {
                              ...(p?.onboardingProfile || {}),
                              federationPathTags: next,
                            },
                          };
                        });
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </label>

            <div className="row">
              <button
                className="btn primary"
                type="button"
                disabled={saving}
                onClick={saveCommunityProfile}
              >
                {saving ? 'Saving…' : 'Save community journey'}
              </button>
            </div>

            <div className="row rowWrap">
              <Link className="btn ghost" to={communityEntryLinks.forum}>
                Open Forum
              </Link>
              <Link className="btn ghost" to={communityEntryLinks.citizens}>
                Open Citizen Directory
              </Link>
              <Link className="btn ghost" to={communityEntryLinks.conference}>
                Open Conference
              </Link>
              <Link className="btn ghost" to={communityEntryLinks.agent}>
                Open Agent Chat
              </Link>
            </div>

            {suggestedRoutes.length > 0 ? (
              <div className="onboardingSuggestedRoutes" aria-label="Suggested next routes">
                <div className="muted small">
                  <strong>Suggested next routes for your selected path tags:</strong>
                </div>
                <div className="row rowWrap">
                  {suggestedRoutes.map((route) => (
                    <Link key={route.to} className="btn ghost" to={route.to}>
                      {route.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
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
                <HelpTip
                  title="Default country"
                  body="Used for deal drafts and logistics context."
                  example="Kenya"
                />
                <input
                  value={prefsDraft.defaultCountry}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      preferences: { ...(p?.preferences || {}), defaultCountry: e.target.value },
                    }))
                  }
                  placeholder="Kenya"
                />
              </label>
              <label>
                Default currency
                <HelpTip
                  title="Default currency"
                  body="Used across Deals and payments."
                  example="USD"
                />
                <input
                  value={prefsDraft.defaultCurrency}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      preferences: { ...(p?.preferences || {}), defaultCurrency: e.target.value },
                    }))
                  }
                  placeholder="USD"
                />
              </label>
              <label>
                Default tags (comma separated)
                <HelpTip
                  title="Tags"
                  body="Helps organize items and streams later."
                  example="coffee, kenya, logistics"
                />
                <input
                  value={prefsDraft.defaultTags}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      preferences: { ...(p?.preferences || {}), defaultTags: e.target.value },
                    }))
                  }
                  placeholder="coffee, kenya, logistics"
                />
              </label>
              <label>
                Default stream platform
                <HelpTip
                  title="Stream platform"
                  body="Auto-selects the platform when you create a stream session."
                  example="twitch"
                />
                <input
                  value={prefsDraft.defaultStreamPlatform}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      preferences: {
                        ...(p?.preferences || {}),
                        defaultStreamPlatform: e.target.value,
                      },
                    }))
                  }
                  placeholder="twitch"
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!prefsDraft.defaultPublicVisibility}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      preferences: {
                        ...(p?.preferences || {}),
                        defaultPublicVisibility: e.target.checked,
                      },
                    }))
                  }
                />
                Default: Public visibility
              </label>
              <div className="row">
                <button
                  className="btn primary"
                  type="button"
                  disabled={saving}
                  onClick={saveDefaults}
                >
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
                Status:{' '}
                {profile?.twitch?.login ? (
                  <b>connected (@{profile.twitch.login})</b>
                ) : (
                  <b>not connected</b>
                )}
              </div>
              <div className="muted small">
                Config:{' '}
                {twitchStatus?.configured ? (
                  <b>configured</b>
                ) : (
                  <b>missing {twitchStatus?.missing?.join(', ') || 'env vars'}</b>
                )}
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
                Live:{' '}
                {twitchLive?.connected ? (
                  twitchLive.live ? (
                    <b>LIVE</b>
                  ) : (
                    <b>offline</b>
                  )
                ) : (
                  <b>not connected</b>
                )}
              </div>
            </div>

            <div className="subcard">
              <div className="subcard__title">YouTube</div>
              <div className="muted small">
                Status: {youtubeLive?.connected ? <b>connected</b> : <b>not connected</b>}
              </div>
              <div className="muted small">
                Config:{' '}
                {youtubeStatus?.configured ? (
                  <b>configured</b>
                ) : (
                  <b>missing {youtubeStatus?.missing?.join(', ') || 'env vars'}</b>
                )}
              </div>
              <div className="row rowWrap">
                <button className="btn primary" type="button" onClick={handleConnectYouTube}>
                  Connect YouTube
                </button>
                <button className="btn ghost" type="button" onClick={refreshLiveStatus}>
                  Check
                </button>
                <a
                  className="btn ghost"
                  href="https://studio.youtube.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open YouTube Studio
                </a>
              </div>
              <div className="muted small">
                {youtubeLive?.channelTitle ? `Channel: ${youtubeLive.channelTitle}` : ''}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <h2>
            Step 4: Wallet + DID/IPFS options
            <HelpTip
              title="Wallet connect"
              body="Choose connect existing wallet or generate onboarding wallet intent, then set optional DID/IPFS flags."
              example="Connect existing wallet, or generate one and save DID/IPFS preferences"
            />
          </h2>
          <div className="row rowWrap onboardingWalletActions">
            <button
              className="btn primary"
              type="button"
              onClick={connectWallet}
              disabled={wallet.connecting}
            >
              {wallet.address
                ? 'Wallet connected'
                : wallet.connecting
                  ? 'Connecting…'
                  : 'Connect wallet'}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={generateWallet}
              disabled={wallet.generating}
            >
              {wallet.generating ? 'Generating…' : 'Generate wallet'}
            </button>
            <div className="muted small">
              {wallet.address
                ? `Connected/generated: ${wallet.address}`
                : prefsDraft.defaultWalletAddress
                  ? `Saved default: ${prefsDraft.defaultWalletAddress}`
                  : ''}
            </div>
            {!hasEthereum() ? (
              <div className="muted small">Tip: install MetaMask to enable wallet connect.</div>
            ) : null}
          </div>
          <div className="muted small onboardingWalletMeta">
            Wallet mode: <b>{identityDraft.walletMode}</b>
            {identityDraft.generatedWalletAddress
              ? ` · Generated wallet: ${identityDraft.generatedWalletAddress}`
              : ''}
          </div>

          <div className="form onboardingIdentityForm">
            <label className="check">
              <input
                type="checkbox"
                checked={identityDraft.didEnabled}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    onboardingProfile: {
                      ...(p?.onboardingProfile || {}),
                      identity: {
                        ...(p?.onboardingProfile?.identity || {}),
                        didEnabled: e.target.checked,
                      },
                    },
                  }))
                }
              />
              Enable DID setup
            </label>
            <label>
              DID method
              <input
                value={identityDraft.didMethod}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    onboardingProfile: {
                      ...(p?.onboardingProfile || {}),
                      identity: {
                        ...(p?.onboardingProfile?.identity || {}),
                        didMethod: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="did:key"
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={identityDraft.ipfsEnabled}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    onboardingProfile: {
                      ...(p?.onboardingProfile || {}),
                      identity: {
                        ...(p?.onboardingProfile?.identity || {}),
                        ipfsEnabled: e.target.checked,
                      },
                    },
                  }))
                }
              />
              Enable IPFS profile storage
            </label>
            <label>
              IPFS CID (optional)
              <input
                value={identityDraft.ipfsCid}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    onboardingProfile: {
                      ...(p?.onboardingProfile || {}),
                      identity: {
                        ...(p?.onboardingProfile?.identity || {}),
                        ipfsCid: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="bafy..."
              />
            </label>
            <div className="row">
              <button
                className="btn primary"
                type="button"
                disabled={saving}
                onClick={saveIdentityOptions}
              >
                {saving ? 'Saving…' : 'Save identity options'}
              </button>
            </div>
          </div>
          <div className="muted small onboardingWalletNote">
            Generated wallet in this phase records onboarding intent only. Production key custody
            should use a secure wallet provider.
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
              Streams created: {typeof streamsCount === 'number' ? streamsCount : '—'} · Deals
              created: {typeof dealsCount === 'number' ? dealsCount : '—'}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
