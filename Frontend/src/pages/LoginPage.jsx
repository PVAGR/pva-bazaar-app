import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import HelpTip from '../components/HelpTip.jsx';
import { apiFetch, apiGet, apiPost } from '../lib/api';
import { setToken } from '../lib/auth';
import '../styles/admin-common.css';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const nextFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('next') || '';
  }, [location.search]);

  const [mode, setMode] = useState('admin'); // 'admin' | 'user'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [adminCreds, setAdminCreds] = useState({ username: '', password: '' });
  const [userCreds, setUserCreds] = useState({ usernameOrEmail: '', password: '' });

  async function handleAdminLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: adminCreds.username.trim(),
          password: adminCreds.password.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) throw new Error(data?.message || 'Invalid username or password');
      setToken(data.token);
      sessionStorage.setItem('admin-auth', 'authenticated');
      sessionStorage.setItem('admin-auth-version', 'v2');
      navigate(nextFromUrl || '/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleUserLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loginId = userCreds.usernameOrEmail.trim();
      const res = await apiPost('/auth/login', loginId.includes('@')
        ? { email: loginId, password: userCreds.password }
        : { username: loginId, password: userCreds.password });
      if (!res?.ok || !res?.token) throw new Error(res?.message || 'Invalid username or password');
      setToken(res.token);
      if (nextFromUrl) {
        navigate(nextFromUrl, { replace: true });
        return;
      }

      // If the user already dismissed/completed onboarding, don't force them through it every time.
      try {
        const prof = await apiGet('/users/profile');
        const ob = prof?.user?.preferences?.onboarding || {};
        if (ob?.dismissedAt || ob?.completedAt) {
          navigate('/account', { replace: true });
          return;
        }
      } catch {
        // ignore and fall back to onboarding
      }
      navigate('/onboarding', { replace: true });
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      setError(serverMsg || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage admin-page authenticated dark-theme">
      <header className="admin-header loginHeader">
        <div>
          <h1>🔐 Sign in</h1>
          <p className="muted">
            Use Admin login for private playtesting, or User login for your personal account.
          </p>
        </div>
        <div className="loginActions">
          <Link to="/" className="btn ghost">
            ← Home
          </Link>
          <Link to="/admin" className="btn ghost">
            Archive Admin
          </Link>
        </div>
      </header>

      <main className="loginMain">
        <section className="card">
          <div className="loginTabs" role="tablist" aria-label="Login type">
            <button
              type="button"
              className={`btn ghost ${mode === 'admin' ? 'active' : ''}`}
              onClick={() => setMode('admin')}
            >
              Admin login
            </button>
            <button
              type="button"
              className={`btn ghost ${mode === 'user' ? 'active' : ''}`}
              onClick={() => setMode('user')}
            >
              User login
            </button>
          </div>

          {error ? (
            <div className="error" role="alert">
              {error}
            </div>
          ) : null}

          {mode === 'admin' ? (
            <form className="form" onSubmit={handleAdminLogin}>
              <label>
                <span>
                  Username
                  <HelpTip title="Admin username" body="Your private admin username (from env)." example="admin" />
                </span>
                <input
                  value={adminCreds.username}
                  onChange={(e) => setAdminCreds((p) => ({ ...p, username: e.target.value }))}
                  autoComplete="username"
                />
              </label>
              <label>
                <span>
                  Password
                  <HelpTip title="Admin password" body="Your private admin password (from env)." example="********" />
                </span>
                <input
                  type="password"
                  value={adminCreds.password}
                  onChange={(e) => setAdminCreds((p) => ({ ...p, password: e.target.value }))}
                  autoComplete="current-password"
                />
              </label>
              <div className="row">
                <button className="btn primary" type="submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in (Admin)'}
                </button>
              </div>
            </form>
          ) : (
            <form className="form" onSubmit={handleUserLogin}>
              <label>
                <span>
                  Username or email
                  <HelpTip title="Username or email" body="Your username (e.g. richyrichaii) or the email you registered with." example="richyrichaii" />
                </span>
                <input
                  value={userCreds.usernameOrEmail}
                  onChange={(e) => setUserCreds((p) => ({ ...p, usernameOrEmail: e.target.value }))}
                  autoComplete="username"
                />
              </label>
              <label>
                <span>
                  Password
                  <HelpTip title="Password" body="Your user account password." example="********" />
                </span>
                <input
                  type="password"
                  value={userCreds.password}
                  onChange={(e) => setUserCreds((p) => ({ ...p, password: e.target.value }))}
                  autoComplete="current-password"
                />
              </label>
              <div className="row">
                <button className="btn primary" type="submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in (User)'}
                </button>
                <Link to={`/register?next=${encodeURIComponent(nextFromUrl || '/onboarding')}`} className="btn ghost">
                  Create account
                </Link>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

