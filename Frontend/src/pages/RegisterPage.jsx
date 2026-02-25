import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import HelpTip from '../components/HelpTip.jsx';
import { apiPost } from '../lib/api';
import { setToken } from '../lib/auth';
import '../styles/admin-common.css';
import './RegisterPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const next = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('next') || '/onboarding';
  }, [location.search]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      if (!res?.ok || !res?.token) throw new Error(res?.message || 'Registration failed');
      setToken(res.token);
      navigate(next, { replace: true });
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      setError(serverMsg || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="registerPage admin-page authenticated dark-theme">
      <Helmet><title>Create account | PVA Bazaar</title></Helmet>
      <header className="admin-header registerHeader">
        <div>
          <h1>🧾 Create account</h1>
          <p className="muted">This creates a MongoDB-backed user account (separate from Admin login).</p>
        </div>
        <div className="registerActions">
          <Link to="/" className="btn ghost">← Home</Link>
          <Link to="/login" className="btn ghost">Back to login</Link>
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
                <HelpTip title="Name" body="Shown in your profile and used for ownership records later." example="Your name" />
              </span>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label>
              <span>
                Email
                <HelpTip title="Email" body="Used for sign-in and notifications later." example="you@example.com" />
              </span>
              <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </label>
            <label>
              <span>
                Password
                <HelpTip title="Password" body="Choose a strong password. You can change this later." example="********" />
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
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

