import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiPost } from '../lib/api';
import { setToken } from '../lib/auth';
import SectionIntro from '../components/SectionIntro.jsx';
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
          <SectionIntro
            badge="Join"
            title="Create your place in the network"
            promise="A working bridge between suppliers, artisans, and goods gathered through real relationships on the ground, and buyers who want trustworthy products with clear context. Choose your lane below."
            actions={(
              <>
                <Link className="pva-btn pva-btn--primary" to="/marketplace">Browse Marketplace</Link>
                <Link className="pva-btn pva-btn--ghost" to="/books">Read the Books</Link>
              </>
            )}
          />
        </div>

        <aside className="get-started__signup" aria-label="Quick signup">
          <h2>Create your account</h2>
          <p>Join first. Deeper verification and business details can be completed later when you are actively listing products or opening serious deals.</p>
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
              I am joining as
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

      <section className="get-started__section" aria-label="What PVA does">
        <div className="get-started__sectionHead">
          <h2>What PVA Bazaar does</h2>
          <p>Keep the business model simple before you commit time: this is not a generic social platform or a random seller marketplace.</p>
        </div>
        <div className="get-started__grid">
          <article className="get-started__card">
            <h3>For buyers</h3>
            <p>PVA helps buyers and retailers discover goods, evaluate sourcing opportunities, and move toward direct, trustworthy trade relationships.</p>
          </article>
          <article className="get-started__card">
            <h3>For suppliers</h3>
            <p>PVA gives suppliers and artisans a structured entry point to present what they can reliably make, source, or ship.</p>
          </article>
          <article className="get-started__card">
            <h3>For long-term continuity</h3>
            <p>The books and archive preserve the mission, context, and standards so the trade layer never becomes detached from meaning.</p>
          </article>
        </div>
      </section>

      <section className="get-started__section" aria-label="Who this is for">
        <div className="get-started__sectionHead">
          <h2>Who this is for</h2>
          <p>Use the platform differently depending on whether you are sourcing goods, supplying them, or preserving the larger vision.</p>
        </div>
        <div className="get-started__grid">
          <article className="get-started__card">
            <h3>Buyers and retailers</h3>
            <p>Start in the marketplace to browse goods, evaluate sourcing opportunities, and identify suppliers worth speaking with.</p>
            <ul className="get-started__detailList">
              <li>You do not need deep verification just to browse.</li>
              <li>Create an account when you want sourcing help, introductions, or deal tracking.</li>
              <li>Use the archive and books when you want the larger context behind the network.</li>
            </ul>
            <Link className="get-started__cardLink" to="/marketplace">Open Marketplace</Link>
          </article>
          <article className="get-started__card">
            <h3>Suppliers and artisans</h3>
            <p>Use the supplier portal to enter the network, submit products, and build the foundation for repeatable trade.</p>
            <ul className="get-started__detailList">
              <li>Prepare clear photos, pricing, origin details, and contact information.</li>
              <li>Do not assume instant publishing or automated payouts from the first submission.</li>
              <li>The portal is an intake and relationship-building surface first.</li>
            </ul>
            <Link className="get-started__cardLink" to="/creator">Open Supplier Portal</Link>
          </article>
          <article className="get-started__card">
            <h3>Researchers and storykeepers</h3>
            <p>The archive holds the context, essays, and long-form writing that explain what the network is trying to preserve.</p>
            <ul className="get-started__detailList">
              <li>Read the books first if you want the clearest overview.</li>
              <li>Use the archive to understand the why behind the trade layer.</li>
              <li>This side of the site gives the commercial system its long memory.</li>
            </ul>
            <Link className="get-started__cardLink" to="/archive">Open Archive</Link>
          </article>
        </div>
      </section>

      <section className="get-started__section" aria-label="What to expect">
        <div className="get-started__sectionHead">
          <h2>What to expect after signup</h2>
          <p>You do not need to do everything at once. The path is staged on purpose.</p>
        </div>
        <div className="get-started__grid">
          <article className="get-started__card">
            <h3>Buyers</h3>
            <p>Browse first, then create an account when you want to save your place, contact suppliers, or move into serious sourcing conversations.</p>
          </article>
          <article className="get-started__card">
            <h3>Suppliers</h3>
            <p>Create your account, prepare your product information, and submit only what you can honestly represent and reliably fulfill.</p>
          </article>
          <article className="get-started__card">
            <h3>Verification and deals</h3>
            <p>Deeper trust, compliance, or deal workflow steps come later when the activity actually requires them.</p>
          </article>
        </div>
      </section>

      <section className="get-started__section" aria-label="Professional flow">
        <div className="get-started__sectionHead">
          <h2>Professional flow</h2>
          <p>A clear sequence keeps the site usable without forcing everyone into the same process.</p>
        </div>
        <ol className="get-started__steps">
          <li>Create your account and make your role clear.</li>
          <li>Choose the public surface that matches your immediate need: books, archive, marketplace, or supplier portal.</li>
          <li>Prepare stronger business details only when you are moving into real submissions, sourcing, or deals.</li>
          <li>Use the platform as one connected system: trust, context, sourcing, and continuity together.</li>
        </ol>
      </section>
    </section>
  );
}
