import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import HelpTip from '../components/HelpTip.jsx';
import { apiGet, apiPost } from '../lib/api';
import { setToken } from '../lib/auth';
import { loginOrProvisionLocalAccount } from '../lib/localAuthVault';
import useConnectionMode from '../hooks/useConnectionMode.js';
import useArchiveTheme from '../hooks/useArchiveTheme.js';
import '../styles/admin-common.css';
import './LoginPage.css';

export default function LoginPage() {
  const { darkMode, toggleTheme } = useArchiveTheme();
  const connectionMode = useConnectionMode();
  const navigate = useNavigate();
  const location = useLocation();
  const nextFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('next') || '';
  }, [location.search]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [userCreds, setUserCreds] = useState({ usernameOrEmail: '', password: '' });

  async function handleUserLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loginId = userCreds.usernameOrEmail.trim();
      const res = await apiPost(
        '/auth/login',
        loginId.includes('@')
          ? { email: loginId, password: userCreds.password }
          : { username: loginId, password: userCreds.password },
        { timeout: 120_000 },
      );
      if (!res?.ok || !res?.token) throw new Error(res?.message || 'Invalid username or password');
      sessionStorage.removeItem('admin-auth');
      sessionStorage.removeItem('admin-auth-version');
      sessionStorage.removeItem('admin-login-time');
      setToken(res.token);
      if (String(res?.user?.role || '').toLowerCase() === 'admin') {
        sessionStorage.setItem('admin-auth', 'authenticated');
        sessionStorage.setItem('admin-auth-version', 'v2');
        sessionStorage.setItem('admin-login-time', new Date().toISOString());
        navigate(nextFromUrl || '/admin', { replace: true });
        return;
      }
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
      try {
        const local = await loginOrProvisionLocalAccount({
          usernameOrEmail: userCreds.usernameOrEmail.trim(),
          password: userCreds.password,
        });
        setToken(local.token);
        if (nextFromUrl) {
          navigate(nextFromUrl, { replace: true });
          return;
        }
        navigate('/onboarding', { replace: true });
        return;
      } catch (localErr) {
        const isNetworkIssue =
          !err?.response || /network|failed to fetch|fetch/i.test(String(err?.message || ''));
        setError(
          localErr?.message ||
            serverMsg ||
            (isNetworkIssue
              ? 'Connection is down right now. Free local sign-in is unavailable on this device until you create one.'
              : err.message) ||
            'Login failed',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`loginPage admin-page authenticated ${darkMode ? 'dark-theme' : 'light-theme'}`}
    >
      <header className="admin-header loginHeader">
        <div>
          <h1>🔐 Sign in</h1>
          <p className="muted">
            Enter the same pure-life knowledge system through your personal account.
          </p>
          <div
            className={`auth-connection auth-connection--${connectionMode.status}`}
            aria-live="polite"
          >
            <strong>{connectionMode.label}</strong>
            <span>{connectionMode.detail}</span>
          </div>
        </div>
        <div className="loginActions">
          <Link to="/" className="btn ghost">
            ← Home
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

      <main className="loginMain">
        <section className="card">
          <h2>Quick paths</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Go straight to the part of the site you want to use, or return to the public front door.
          </p>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <Link to="/" className="btn ghost">
              Home
            </Link>
            <Link to="/archive" className="btn ghost">
              Archive
            </Link>
            <Link to="/recovery" className="btn ghost">
              Recovery
            </Link>
            <Link to="/register" className="btn ghost">
              Register
            </Link>
            <Link to="/dashboard" className="btn ghost">
              Command Center
            </Link>
          </div>
        </section>

        <section className="card">
          {error ? (
            <div className="error" role="alert">
              {error}
            </div>
          ) : null}
          <p className="muted" style={{ marginTop: '-0.25rem', marginBottom: '0.5rem' }}>
            Buttons are now high-contrast white. If the hosted backend is unreachable, the login
            will create or use a free shared account store on this device.
          </p>

          <form className="form" onSubmit={handleUserLogin}>
            <label>
              <span>
                Username or email
                <HelpTip
                  title="Username or email"
                  body="Your username (e.g. richyrichaii) or the email you registered with."
                  example="richyrichaii"
                />
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
                <HelpTip title="Password" body="Your account password." example="********" />
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
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <Link
                to={`/register?next=${encodeURIComponent(nextFromUrl || '/onboarding')}`}
                className="btn ghost"
              >
                Create account
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
