import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import HelpTip from '../components/HelpTip.jsx';
import { apiPost } from '../lib/api';
import { setToken } from '../lib/auth';
import { registerLocalAccount } from '../lib/localAuthVault';
import useConnectionMode from '../hooks/useConnectionMode.js';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import '../styles/admin-common.css';
import './RegisterPage.css';

const ROLE_OPTIONS = [
  { value: 'seller', label: 'Seller' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'creator_artist', label: 'Creator/Artist' },
  { value: 'collector', label: 'Collector' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'federation_contributor', label: 'Federation Contributor' },
  { value: 'other', label: 'Other' },
];

const TRADING_ROLE_INTENTS = new Set([
  'seller',
  'creator_artist',
  'collector',
  'federation_contributor',
]);

export default function RegisterPage() {
  const { darkMode, toggleTheme } = useArchiveTheme();
  const connectionMode = useConnectionMode();
  const navigate = useNavigate();
  const location = useLocation();
  const next = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('next') || '/onboarding';
  }, [location.search]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    roleIntent: 'consumer',
    roleOther: '',
    legalIdType: '',
    legalIdNumber: '',
    addressLine1: '',
    city: '',
    postalCode: '',
    country: '',
    phone: '',
    identityAttested: false,
  });

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiPost(
        '/auth/register',
        {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          onboarding: {
            roleIntent: form.roleIntent,
            roleOther: form.roleIntent === 'other' ? form.roleOther : '',
            compliance: TRADING_ROLE_INTENTS.has(form.roleIntent)
              ? {
                  legalFullName: form.name,
                  legalIdType: form.legalIdType,
                  legalIdNumber: form.legalIdNumber,
                  addressLine1: form.addressLine1,
                  city: form.city,
                  postalCode: form.postalCode,
                  country: form.country,
                  phone: form.phone,
                  identityAttested: form.identityAttested,
                }
              : undefined,
          },
        },
        { timeout: 120_000 },
      );
      if (!res?.ok || !res?.token) throw new Error(res?.message || 'Registration failed');
      sessionStorage.removeItem('admin-auth');
      sessionStorage.removeItem('admin-auth-version');
      sessionStorage.removeItem('admin-login-time');
      setToken(res.token);
      navigate(next, { replace: true });
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      try {
        const local = await registerLocalAccount({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          onboarding: {
            roleIntent: form.roleIntent,
            roleOther: form.roleIntent === 'other' ? form.roleOther : '',
            appRole: 'consumer',
            compliance: TRADING_ROLE_INTENTS.has(form.roleIntent)
              ? {
                  legalFullName: form.name,
                  legalIdType: form.legalIdType,
                  legalIdNumber: form.legalIdNumber,
                  addressLine1: form.addressLine1,
                  city: form.city,
                  postalCode: form.postalCode,
                  country: form.country,
                  phone: form.phone,
                  identityAttested: form.identityAttested,
                }
              : undefined,
          },
        });
        setToken(local.token);
        navigate(next, { replace: true });
        return;
      } catch (localErr) {
        setError(localErr?.message || serverMsg || err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`registerPage admin-page authenticated ${darkMode ? 'dark-theme' : 'light-theme'}`}
    >
      <header className="admin-header registerHeader">
        <div>
          <h1>🧾 Create account</h1>
          <p className="muted">This creates a shared account for the PVA Bazaar login system.</p>
          <div
            className={`auth-connection auth-connection--${connectionMode.status}`}
            aria-live="polite"
          >
            <strong>{connectionMode.label}</strong>
            <span>{connectionMode.detail}</span>
          </div>
        </div>
        <div className="registerActions">
          <Link to="/login" className="btn ghost">
            ← Back to login
          </Link>
          <button
            className="btn ghost"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="registerMain">
        <section className="card">
          {error ? (
            <div className="error" role="alert">
              {error}
            </div>
          ) : null}

          <form className="form" onSubmit={handleRegister}>
            <label>
              <span>
                Name
                <HelpTip
                  title="Name"
                  body="Shown in your profile and used for ownership records later."
                  example="Your name"
                />
              </span>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label>
              <span>
                Email
                <HelpTip
                  title="Email"
                  body="Used for sign-in and notifications later."
                  example="you@example.com"
                />
              </span>
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </label>
            <label>
              <span>
                Password
                <HelpTip
                  title="Password"
                  body="Choose a strong password. You can change this later."
                  example="********"
                />
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
            <label>
              <span>
                Federation path
                <HelpTip
                  title="Federation path"
                  body="Choose how you want to participate first. You can refine this in onboarding."
                  example="Seller, Consumer, Researcher"
                />
              </span>
              <select
                value={form.roleIntent}
                onChange={(e) => setForm((p) => ({ ...p, roleIntent: e.target.value }))}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {form.roleIntent === 'other' ? (
              <label>
                <span>
                  Describe your path
                  <HelpTip
                    title="Custom role"
                    body="Give a short description of your path."
                    example="Community coordinator"
                  />
                </span>
                <input
                  value={form.roleOther}
                  maxLength={120}
                  onChange={(e) => setForm((p) => ({ ...p, roleOther: e.target.value }))}
                />
              </label>
            ) : null}
            {TRADING_ROLE_INTENTS.has(form.roleIntent) ? (
              <>
                <label>
                  <span>Government ID type</span>
                  <input
                    value={form.legalIdType}
                    onChange={(e) => setForm((p) => ({ ...p, legalIdType: e.target.value }))}
                    placeholder="Passport / National ID / Driver License"
                    required
                  />
                </label>
                <label>
                  <span>Government ID number</span>
                  <input
                    value={form.legalIdNumber}
                    onChange={(e) => setForm((p) => ({ ...p, legalIdNumber: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Address line 1</span>
                  <input
                    value={form.addressLine1}
                    onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>City</span>
                  <input
                    value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Postal code</span>
                  <input
                    value={form.postalCode}
                    onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Country</span>
                  <input
                    value={form.country}
                    onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    required
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.identityAttested}
                    onChange={(e) => setForm((p) => ({ ...p, identityAttested: e.target.checked }))}
                    required
                  />
                  I attest this legal identity information is accurate.
                </label>
              </>
            ) : null}
            <div className="row">
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create account'}
              </button>
              <Link to={`/login?next=${encodeURIComponent(next)}`} className="btn ghost">
                Sign in instead
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
