import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiPost } from '../lib/api';
import { setToken } from '../lib/auth';
import './GetStartedPage.css';

const ROLE_OPTIONS = [
  { value: 'seller', label: 'Supplier / Seller' },
  { value: 'consumer', label: 'Buyer / Consumer' },
  { value: 'creator_artist', label: 'Creator / Artisan' },
  { value: 'collector', label: 'Collector' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'federation_contributor', label: 'Platform Contributor' },
  { value: 'other', label: 'Other' },
];

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
  });

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
        },
      }, { timeout: 120_000 });

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
        <div className="get-started__heroIntro">
          <p className="pill">Start here</p>
          <h1>Create your place in the network</h1>
          <p>
            Start as a buyer, supplier, artisan, or partner. Create your account first, then complete the deeper
            verification and profile steps only when you are ready to list products or open serious deals.
          </p>
          <div className="get-started__actions">
            <Link className="btn btn-secondary" to="/marketplace">Browse Marketplace</Link>
            <Link className="btn btn-ghost" to="/about">Read About</Link>
          </div>
        </div>

        <aside className="get-started__signup" aria-label="Quick signup">
          <h2>Create your account</h2>
          <p>Join first. Detailed verification can be completed later when you are actively listing products or closing deals.</p>
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
            <div className="get-started__actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
              <Link className="btn btn-ghost" to="/login?next=%2Fonboarding">Already have account</Link>
            </div>
          </form>
        </aside>
      </header>

      <section className="get-started__section" aria-label="Who this is for">
        <div className="get-started__sectionHead">
          <h2>Who this is for</h2>
          <p>Use the platform differently depending on whether you are sourcing goods, supplying them, or preserving the larger vision.</p>
        </div>
        <div className="get-started__grid">
          <article className="get-started__card">
            <h3>Buyers and retailers</h3>
            <p>Start in the marketplace to browse goods, evaluate sourcing opportunities, and identify suppliers worth speaking with.</p>
            <Link className="get-started__cardLink" to="/marketplace">Open Marketplace</Link>
          </article>
          <article className="get-started__card">
            <h3>Suppliers and artisans</h3>
            <p>Use the supplier portal to enter the network, submit products, and build the foundation for repeatable trade.</p>
            <Link className="get-started__cardLink" to="/creator">Open Supplier Portal</Link>
          </article>
          <article className="get-started__card">
            <h3>Researchers and storykeepers</h3>
            <p>The archive holds the context, essays, and long-form writing that explain what the network is trying to preserve.</p>
            <Link className="get-started__cardLink" to="/archive">Open Archive</Link>
          </article>
        </div>
      </section>

      <section className="get-started__section" aria-label="What happens next">
        <div className="get-started__sectionHead">
          <h2>What happens after signup</h2>
          <p>You do not need to do everything at once. The professional path is staged.</p>
        </div>
        <div className="get-started__grid">
          <article className="get-started__card">
            <h3>Build your profile</h3>
            <p>Choose your role, refine your presence, and make it clear how you participate in the network.</p>
          </article>
          <article className="get-started__card">
            <h3>Verify when needed</h3>
            <p>Complete deeper compliance and trust steps when you begin listing products or entering serious deals.</p>
          </article>
          <article className="get-started__card">
            <h3>Start moving goods</h3>
            <p>Use the platform as a working bridge between relationships on the ground and buyers who need confidence.</p>
          </article>
        </div>
      </section>

      <section className="get-started__section" aria-label="What comes next">
        <div className="get-started__sectionHead">
          <h2>What comes next</h2>
        </div>
        <ol className="get-started__steps">
          <li>Create your account and enter the onboarding flow.</li>
          <li>Choose your role and make your business or sourcing intent clear.</li>
          <li>Complete verification only when your trade activity requires it.</li>
          <li>Use the marketplace, supplier portal, showroom, and archive as one connected system.</li>
        </ol>
      </section>
    </section>
  );
}
