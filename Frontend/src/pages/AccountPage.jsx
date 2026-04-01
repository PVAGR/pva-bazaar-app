import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CreatorNav from '../components/CreatorNav.jsx';
import HelpTip from '../components/HelpTip.jsx';
import SetupReminder from '../components/SetupReminder.jsx';
import { apiGet, apiPut } from '../lib/api';
import { fetchMyMarketplaceItems } from '../lib/api';
import { clearToken } from '../lib/auth';
import { getMissingProfileSteps } from '../utils/sellerProfileUtils.js';
import '../styles/admin-common.css';
import './AccountPage.css';

const NEEDS_ATTENTION_STATUSES = new Set(['failed', 'manual_required']);

export default function AccountPage() {
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
  const [listingsHealth, setListingsHealth] = useState({
    loading: true,
    total: 0,
    needsAttention: 0,
    withSyndication: 0,
  });

  const preferencesDraft = useMemo(() => {
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

  useEffect(() => {
    setLoading(true);
    setError('');
    apiGet('/users/profile')
      .then((res) => {
        if (res?.ok && res.user) setProfile(res.user);
        else setError(res?.message || 'Failed to load profile');
      })
      .catch((e) => {
        const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
        setError(serverMsg || e.message || 'Failed to load profile');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadListingsHealth() {
      const result = await fetchMyMarketplaceItems();
      if (cancelled) return;
      if (!result.ok) {
        setListingsHealth({ loading: false, total: 0, needsAttention: 0, withSyndication: 0 });
        return;
      }

      const items = Array.isArray(result.items) ? result.items : [];
      let needsAttention = 0;
      let withSyndication = 0;
      for (const item of items) {
        const jobs = item?.syndication?.jobs || [];
        if (jobs.length > 0) withSyndication += 1;
        if (jobs.some((job) => NEEDS_ATTENTION_STATUSES.has(job.status))) {
          needsAttention += 1;
        }
      }
      setListingsHealth({
        loading: false,
        total: items.length,
        needsAttention,
        withSyndication,
      });
    }

    loadListingsHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setOkMsg('');
    try {
      const res = await apiPut('/users/profile', {
        name: profile?.name,
        email: profile?.email,
        preferences: preferencesDraft,
      });
      if (!res?.ok || !res.user) throw new Error(res?.message || 'Save failed');
      setProfile(res.user);
      setOkMsg('Saved.');
      setTimeout(() => setOkMsg(''), 1500);
    } catch (e) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setError(serverMsg || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    clearToken();
    sessionStorage.removeItem('admin-auth');
    sessionStorage.removeItem('admin-auth-version');
    navigate('/login', { replace: true });
  }

  return (
    <div className={`accountPage admin-page authenticated ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <header className="admin-header accountHeader">
        <div>
          <h1>👤 Account</h1>
          <p className="muted">Edit your saved defaults and profile info (stored in MongoDB).</p>
        </div>
        <div className="accountActions">
          <Link to="/" className="btn ghost">
            ← Home
          </Link>
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
          <button className="btn ghost" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <CreatorNav />

      <main className="accountMain">
        {loading ? <div className="muted">Loading…</div> : null}
        {error ? (
          <div className="error" role="alert">
            {error}
          </div>
        ) : null}
        {okMsg ? <div className="notice">{okMsg}</div> : null}

        {profile ? <SetupReminder missingSteps={getMissingProfileSteps(profile)} /> : null}

        {profile ? (
          <section className="card">
            <h2>
              Profile{' '}
              <HelpTip
                title="Profile"
                body="Basic account identity. This is separate from Admin login."
                example="you@example.com"
              />
            </h2>
            <div className="form">
              <label>
                Name
                <input value={profile.name || ''} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <label>
                Email
                <input
                  value={profile.email || ''}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  autoComplete="email"
                />
              </label>
            </div>
          </section>
        ) : null}

        {profile ? (
          <section className="card accountListingsHealth">
            <h2>
              Seller Syndication Health{' '}
              <HelpTip
                title="Syndication health"
                body="Shows how many of your listings need marketplace syndication follow-up."
                example="Retry failed channels"
              />
            </h2>
            {listingsHealth.loading ? (
              <div className="muted">Loading listing health...</div>
            ) : (
              <div className="accountListingsHealthGrid">
                <div className="healthTile">
                  <span>Total listings</span>
                  <strong>{listingsHealth.total}</strong>
                </div>
                <div className="healthTile">
                  <span>With syndication</span>
                  <strong>{listingsHealth.withSyndication}</strong>
                </div>
                <div className="healthTile warning">
                  <span>Need attention</span>
                  <strong>{listingsHealth.needsAttention}</strong>
                </div>
              </div>
            )}
            <div className="accountListingsHealthActions">
              <Link className="btn ghost" to="/items/mine">
                Open My Listings
              </Link>
              <Link className="btn primary" to="/items/mine?filter=attention">
                Review Attention Queue
              </Link>
            </div>
          </section>
        ) : null}

        {profile ? (
          <section className="card">
            <h2>
              Saved defaults{' '}
              <HelpTip
                title="Saved defaults"
                body="Defaults auto-fill Streams, Deals, and other guided forms."
                example="Default currency: USD"
              />
            </h2>
            <div className="form">
              <label>
                Default country
                <input
                  value={preferencesDraft.defaultCountry}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultCountry: e.target.value } }))
                  }
                />
              </label>
              <label>
                Default currency
                <input
                  value={preferencesDraft.defaultCurrency}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultCurrency: e.target.value } }))
                  }
                />
              </label>
              <label>
                Default wallet address (optional)
                <input
                  value={preferencesDraft.defaultWalletAddress}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      preferences: { ...(p?.preferences || {}), defaultWalletAddress: e.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Default tags (comma separated)
                <input
                  value={preferencesDraft.defaultTags}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, preferences: { ...(p?.preferences || {}), defaultTags: e.target.value } }))
                  }
                />
              </label>
              <label>
                Default stream platform
                <input
                  value={preferencesDraft.defaultStreamPlatform}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      preferences: { ...(p?.preferences || {}), defaultStreamPlatform: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!preferencesDraft.defaultPublicVisibility}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      preferences: { ...(p?.preferences || {}), defaultPublicVisibility: e.target.checked },
                    }))
                  }
                />
                Default: Public visibility
              </label>
              <div className="row">
                <button className="btn primary" type="button" disabled={saving} onClick={handleSave}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

