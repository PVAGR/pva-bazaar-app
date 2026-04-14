import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PUBLIC_ROUTES } from '../config/publicRoutes';
import { apiPost } from '../lib/api';
import { setToken } from '../lib/auth';
import './GetStartedPage.css';

const ROLE_OPTIONS = [
  { value: 'seller', label: 'Seller' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'creator_artist', label: 'Creator/Artist' },
  { value: 'collector', label: 'Collector' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'federation_contributor', label: 'Federation Contributor' },
  { value: 'other', label: 'Other' },
];

const TRADING_ROLE_INTENTS = new Set(['seller', 'creator_artist', 'collector', 'federation_contributor']);

function routeSummary(route) {
  if (!route?.description) {
    return 'Explore this federation surface.';
  }
  return route.description;
}

export default function GetStartedPage() {
  const navigate = useNavigate();
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

  const spotlightRoutes = useMemo(() => (
    PUBLIC_ROUTES.filter((route) => route.access === 'public').slice(0, 10)
  ), []);

  const coreRoutes = useMemo(() => (
    spotlightRoutes.filter((route) => route.group === 'core').slice(0, 5)
  ), [spotlightRoutes]);

  const supportRoutes = useMemo(() => (
    spotlightRoutes.filter((route) => route.group !== 'core').slice(0, 5)
  ), [spotlightRoutes]);

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/auth/register', {
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
      });

      if (!res?.ok || !res?.token) {
        throw new Error(res?.message || 'Registration failed');
      }

      setToken(res.token);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      setError(serverMsg || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-card get-started" aria-label="Federation onboarding entry">
      <header className="get-started__hero">
        <div>
          <p className="pill">Federation Entry</p>
          <h1>Begin your path in PVA Bazaar</h1>
          <p>
            This is your first-stop map and account gate in one view. Learn what each tab is for, then create your citizen
            profile to continue into wallet, DID, and community setup.
          </p>
          <div className="get-started__actions">
            <Link className="btn btn-secondary" to="/home">Explore home</Link>
            <Link className="btn btn-ghost" to="/about">Read manifesto context</Link>
          </div>
        </div>

        <aside className="get-started__signup" aria-label="Quick signup">
          <h2>Create your account</h2>
          <p>Balanced onboarding starts now: join first, then customize your identity path in the next step.</p>
          {error ? <div className="error" role="alert">{error}</div> : null}
          <form className="get-started__form" onSubmit={handleRegister}>
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                minLength={8}
                required
              />
            </label>
            <label>
              Federation path
              <select
                value={form.roleIntent}
                onChange={(e) => setForm((prev) => ({ ...prev, roleIntent: e.target.value }))}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {form.roleIntent === 'other' ? (
              <label>
                Describe your path
                <input
                  value={form.roleOther}
                  onChange={(e) => setForm((prev) => ({ ...prev, roleOther: e.target.value }))}
                  maxLength={120}
                  placeholder="Tell us your intended role"
                />
              </label>
            ) : null}
            {TRADING_ROLE_INTENTS.has(form.roleIntent) ? (
              <>
                <label>
                  Government ID type
                  <input
                    value={form.legalIdType}
                    onChange={(e) => setForm((prev) => ({ ...prev, legalIdType: e.target.value }))}
                    placeholder="Passport / National ID / Driver License"
                    required
                  />
                </label>
                <label>
                  Government ID number
                  <input
                    value={form.legalIdNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, legalIdNumber: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Address line 1
                  <input
                    value={form.addressLine1}
                    onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  City
                  <input
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Postal code
                  <input
                    value={form.postalCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Country
                  <input
                    value={form.country}
                    onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Phone
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.identityAttested}
                    onChange={(e) => setForm((prev) => ({ ...prev, identityAttested: e.target.checked }))}
                    required
                  />
                  I attest this legal identity information is accurate.
                </label>
              </>
            ) : null}
            <div className="get-started__actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
              <Link className="btn btn-ghost" to="/login?next=%2Fonboarding">Already have account</Link>
            </div>
          </form>
        </aside>
      </header>

      <section className="get-started__section" aria-label="Core tabs">
        <div className="get-started__sectionHead">
          <h2>Core tabs</h2>
          <p>These are your main federation surfaces for learning, trade, and civic participation.</p>
        </div>
        <div className="get-started__grid">
          {coreRoutes.map((route) => (
            <article key={route.key} className="get-started__card">
              <h3>{route.title}</h3>
              <p>{routeSummary(route)}</p>
              <Link to={route.to}>{route.navLabel || route.title}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="get-started__section" aria-label="Support tabs">
        <div className="get-started__sectionHead">
          <h2>Support tabs</h2>
          <p>Use these to deepen context, discover people, and move through specialized workflows.</p>
        </div>
        <div className="get-started__grid">
          {supportRoutes.map((route) => (
            <article key={route.key} className="get-started__card">
              <h3>{route.title}</h3>
              <p>{routeSummary(route)}</p>
              <Link to={route.to}>{route.navLabel || route.title}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="get-started__section" aria-label="What comes next">
        <div className="get-started__sectionHead">
          <h2>What comes next</h2>
        </div>
        <ol className="get-started__steps">
          <li>Create your account and enter your onboarding flow.</li>
          <li>Choose your federation role path and profile journey context.</li>
          <li>Attach identity options like wallet, DID, and storage preferences.</li>
          <li>Join the community layers for feed, messaging, and contribution.</li>
        </ol>
      </section>
    </section>
  );
}
