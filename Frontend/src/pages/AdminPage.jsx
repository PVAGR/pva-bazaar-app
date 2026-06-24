import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, fetchItemInquiries } from '../lib/api';
import { ENV } from '../config/env';
import { getErrorMessage } from '../lib/errorUtils';
import ErrorBanner from '../components/ErrorBanner.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import AdminNav from '../components/AdminNav.jsx';
import AdminTabs from '../components/AdminTabs.jsx';
import { clearToken, setToken } from '../lib/auth';
import { createLogger } from '../lib/logger';
import { LoadingDots } from '../components/LoadingSpinner.jsx';
import MakeOrderModal from '../components/MakeOrderModal.jsx';
import './AdminPage.css';

const logger = createLogger('AdminPage');
const DashboardTab = lazy(() => import('../components/DashboardTab.jsx'));
const ArchiveTab = lazy(() => import('../components/ArchiveTab.jsx'));
const MarketplaceTab = lazy(() => import('../components/MarketplaceTab.jsx'));
const InquiriesTab = lazy(() => import('../components/InquiriesTab.jsx'));
const UsersTab = lazy(() => import('../components/UsersTab.jsx'));
const AttributionTab = lazy(() => import('../components/AttributionTab.jsx'));
const PayoutTab = lazy(() => import('../components/PayoutTab.jsx'));
const SettlementContractsTab = lazy(() => import('../components/SettlementContractsTab.jsx'));
const CloudStorageTab = lazy(() => import('../components/CloudStorageTab.jsx'));
const LibraryTab = lazy(() => import('../components/LibraryTab.jsx'));
const ApiDocsTab = lazy(() => import('../components/ApiDocsTab.jsx'));
const HealthTab = lazy(() => import('../components/HealthTab.jsx'));
const SettingsTab = lazy(() => import('../components/SettingsTab.jsx'));
const OpenClawTab = lazy(() => import('../components/OpenClawTab.jsx'));
const BountyHunterTab = lazy(() => import('../components/BountyHunterTab.jsx'));
const RoyaltyAnalyticsTab = lazy(() => import('../components/RoyaltyAnalyticsTab.jsx'));
const OverviewTab = lazy(() => import('../components/OverviewTab.jsx'));
const TransactionsTab = lazy(() => import('../components/TransactionsTab.jsx'));
const AdminOrdersPage = lazy(() => import('./AdminOrdersPage.jsx'));

const ADMIN_ATLAS_LINKS = [
  { key: 'home', label: 'Home', to: '/' },
  { key: 'archive', label: 'Archive', to: '/archive' },
  { key: 'recovery', label: 'Recovery', to: '/recovery' },
  { key: 'marketplace', label: 'Marketplace', to: '/marketplace' },
  { key: 'dashboard', label: 'Command Center', to: '/dashboard' },
  { key: 'account', label: 'Account', to: '/account' },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const availableTabs = new Set([
    'dashboard', 'orders', 'transactions', 'archive', 'marketplace', 'inquiries',
    'users', 'attribution', 'payouts', 'settlements', 'cloud', 'library', 'api',
    'health', 'settings', 'openclaw', 'bounty-hunter', 'royalty-analytics', 'overview',
  ]);
  const staleThresholdMs = ENV.STATUS_STALE_MS || 120000;
  const staleThresholdMinutes = Math.round((staleThresholdMs / 60000) * 10) / 10;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [bootstrapCode, setBootstrapCode] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bootstrapStatus, setBootstrapStatus] = useState({
    loading: false,
    needsBootstrap: false,
    signupAllowed: true,
    selfSignupEnabled: true,
    bootstrapCodeRequired: false,
    githubOAuthEnabled: false,
  });
  const [githubAuthConfigured, setGithubAuthConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('admin-active-tab');
    if (savedTab && availableTabs.has(savedTab)) {
      return savedTab;
    }
    return 'dashboard';
  });
  // Use global theme system
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved ? saved === 'dark' : false;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    return isDark;
  });
  
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  const [dispatchTestState, setDispatchTestState] = useState({ loading: false, message: '' });
  const [showRecentEvents, setShowRecentEvents] = useState(false);
  const [recentEvents, setRecentEvents] = useState({ loading: false, data: null, error: null });
  const [connectionStatus, setConnectionStatus] = useState({
    loading: true,
    checkedAt: null,
    checkedAtMs: null,
    apiBase: ENV.API_URL,
    results: {},
  });
  const [inquiryCounts, setInquiryCounts] = useState({ new: 0, contacted: 0, reserved: 0, closed: 0, total: 0 });
  const [makeOrderModalOpen, setMakeOrderModalOpen] = useState(false);

  const tabLoadingFallback = (
    <div className="admin-status-card" role="status" aria-live="polite">
      <LoadingDots label="Loading admin tab..." />
    </div>
  );

  const renderTab = useCallback((content) => (
    <ErrorBoundary>
      <Suspense fallback={tabLoadingFallback}>{content}</Suspense>
    </ErrorBoundary>
  ), [tabLoadingFallback]);

  const nextPath = useCallback(() => {
    const params = new URLSearchParams(location.search || '');
    const next = params.get('next') || '';

    // Only allow internal admin sub-route redirects.
    if (next.startsWith('/admin/') && !next.startsWith('/admin?')) {
      return next;
    }

    return '';
  }, [location.search]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search || '');
    const hash = window.location.hash || '';
    const hashQuery = hash.includes('?') ? hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashQuery);

    const oauthToken = searchParams.get('oauth_admin_token') || hashParams.get('oauth_admin_token');
    const oauthError = searchParams.get('oauth_admin_error') || hashParams.get('oauth_admin_error');
    const hasOauthParams = Boolean(oauthToken || oauthError);

    if (!hasOauthParams) {
      return;
    }

    if (oauthToken) {
      setToken(oauthToken);
      setIsAuthenticated(true);
      sessionStorage.setItem('admin-auth', 'authenticated');
      sessionStorage.setItem('admin-auth-version', 'v2');
      setError('');
    } else if (oauthError) {
      setError(oauthError);
    }

    if (hash.includes('?')) {
      const hashPath = hash.split('?')[0];
      const cleanedParams = new URLSearchParams(hashQuery);
      cleanedParams.delete('oauth_admin_token');
      cleanedParams.delete('oauth_admin_error');
      cleanedParams.delete('oauth_provider');
      const nextHash = cleanedParams.toString() ? `${hashPath}?${cleanedParams.toString()}` : hashPath;
      window.history.replaceState(null, '', nextHash);
    } else if (location.search) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  // Check if already authenticated with NEW credentials system
  useEffect(() => {
    const auth = sessionStorage.getItem('admin-auth');
    const authVersion = sessionStorage.getItem('admin-auth-version');
    
    // Only accept sessions with v2 (username+password) - invalidate old password-only sessions
    if (auth === 'authenticated' && authVersion === 'v2') {
      setIsAuthenticated(true);
    } else {
      // Clear old sessions
      sessionStorage.removeItem('admin-auth');
      sessionStorage.removeItem('admin-auth-version');
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setIsAuthenticated(false);
      setUsername('');
      setEmail('');
      setFullName('');
      setBootstrapCode('');
      setPassword('');
      setError('Your admin session expired. Please sign in again.');
      sessionStorage.removeItem('admin-auth');
      sessionStorage.removeItem('admin-auth-version');
    };

    window.addEventListener('admin-session-expired', handleSessionExpired);
    return () => window.removeEventListener('admin-session-expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    localStorage.setItem('admin-active-tab', activeTab);
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const target = nextPath();
    if (!target) return;
    navigate(target, { replace: true });
  }, [isAuthenticated, navigate, nextPath]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let validating = false;

    const validateSession = async () => {
      if (validating) return;
      validating = true;
      try {
        await apiGet('/admin/status');
      } catch (err) {
        const statusCode = err?.response?.status;
        if (statusCode === 401 || statusCode === 403) {
          window.dispatchEvent(new CustomEvent('admin-session-expired'));
        }
      } finally {
        validating = false;
      }
    };

    // Only validate on initial mount, not on focus/visibility changes
    // This prevents frequent logouts when switching tabs
    validateSession();

    // Optional: periodic validation every 5 minutes instead of on every focus
    const intervalId = setInterval(validateSession, 300000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) return;

    let cancelled = false;
    const loadBootstrapStatus = async () => {
      setBootstrapStatus((prev) => ({ ...prev, loading: true }));
      try {
        const data = await apiGet('/admin/bootstrap-status');
        if (!cancelled && data?.ok) {
          const nextStatus = {
            loading: false,
            needsBootstrap: Boolean(data.needsBootstrap),
            signupAllowed: data.signupAllowed !== false,
            selfSignupEnabled: data.selfSignupEnabled !== false,
            bootstrapCodeRequired: Boolean(data.bootstrapCodeRequired),
            githubOAuthEnabled: Boolean(data.githubOAuthEnabled),
          };

          setBootstrapStatus(nextStatus);
          if (nextStatus.needsBootstrap) {
            setAuthMode('signup');
          } else {
            setAuthMode('login');
          }
        }
      } catch (_err) {
        if (!cancelled) {
          setBootstrapStatus((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    const loadGithubOAuthStatus = async () => {
      try {
        const data = await apiGet('/admin/oauth/github/status');
        if (!cancelled && data?.ok) {
          setGithubAuthConfigured(Boolean(data.configured));
        }
      } catch (_err) {
        if (!cancelled) {
          setGithubAuthConfigured(false);
        }
      }
    };

    loadBootstrapStatus();
    loadGithubOAuthStatus();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleGithubLogin = useCallback(() => {
    setError('');
    const apiBase = String(ENV.API_URL || '').replace(/\/+$/, '');
    if (!apiBase) {
      setError('API base URL is not configured');
      return;
    }
    window.location.assign(`${apiBase}/admin/oauth/github/start`);
  }, []);

  const formatWatchdogMessage = useCallback((response) => {
    if (!response || response.ok === false) {
      return 'Watchdog request failed';
    }

    if (!response.available) {
      return response.message || 'No watchdog logs found';
    }

    const summary = response.summary || {};
    const state = summary.state || 'unknown';
    const errors = Number.isFinite(summary.errorCountWindow) ? summary.errorCountWindow : 0;
    const alerts = Number.isFinite(summary.alertCountWindow) ? summary.alertCountWindow : 0;
    const lastEventAt = summary.lastEventAt || 'n/a';

    return `state=${state}, errors=${errors}, alerts=${alerts}, last=${lastEventAt}`;
  }, []);

  const handleTestDispatch = useCallback(async () => {
    setDispatchTestState({ loading: true, message: '' });
    try {
      const data = await apiPost('/openclaw/dispatch', {
        event: 'pvabazaar.admin_test',
        message: 'Test dispatch from PVA Bazaar admin panel',
        metadata: {
          source: 'admin-panel',
          timestamp: new Date().toISOString(),
        },
      });

      if (data.ok) {
        setDispatchTestState({ loading: false, message: '✅ Dispatch successful' });
      } else {
        setDispatchTestState({ loading: false, message: `❌ ${data.message || 'Dispatch failed'}` });
      }
    } catch (err) {
      setDispatchTestState({ loading: false, message: `❌ ${err.message || 'Network error'}` });
    }

    setTimeout(() => {
      setDispatchTestState({ loading: false, message: '' });
    }, 5000);
  }, []);

  const fetchRecentEvents = useCallback(async () => {
    setRecentEvents({ loading: true, data: null, error: null });
    try {
      const data = await apiGet('/openclaw/recent-events?limit=30');
      if (data.ok) {
        setRecentEvents({ loading: false, data: data.events || [], error: null });
      } else {
        setRecentEvents({ loading: false, data: null, error: data.message || 'Failed to fetch events' });
      }
    } catch (err) {
      setRecentEvents({ loading: false, data: null, error: err?.response?.data?.message || err.message || 'Network error' });
    }
  }, []);

  const toggleRecentEvents = useCallback(() => {
    const newState = !showRecentEvents;
    setShowRecentEvents(newState);
    
    // Fetch events when opening
    if (newState && !recentEvents.data) {
      fetchRecentEvents();
    }
  }, [showRecentEvents, recentEvents.data, fetchRecentEvents]);

  const runConnectionCheck = useCallback(async () => {
    const endpoints = [
      { key: 'health', path: '/health', label: '/api/health' },
      { key: 'ping', path: '/ping', label: '/api/ping' },
      { key: 'version', path: '/version', label: '/api/version' },
      { key: 'archive', path: '/archive', label: '/api/archive' },
      { key: 'items', path: '/items', label: '/api/items' },
      {
        key: 'openclawWatchdog',
        path: '/openclaw/watchdog-status',
        label: '/api/openclaw/watchdog-status',
        deriveOk: (response) => Boolean(response?.available) && response?.summary?.state !== 'degraded',
        deriveMessage: formatWatchdogMessage,
      },
    ];

    setConnectionStatus((prev) => ({
      ...prev,
      loading: true,
      apiBase: ENV.API_URL,
    }));

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const res = await apiGet(endpoint.path);
        const derivedOk = typeof endpoint.deriveOk === 'function'
          ? endpoint.deriveOk(res)
          : res.ok !== false;
        const derivedMessage = typeof endpoint.deriveMessage === 'function'
          ? endpoint.deriveMessage(res)
          : (res.message || res.status || res.error || '');

        results[endpoint.key] = {
          ok: derivedOk,
          status: res.status || 200,
          message: derivedMessage,
          label: endpoint.label,
        };
      } catch (err) {
        results[endpoint.key] = {
          ok: false,
          status: 'error',
          message: err.message || 'Request failed',
          label: endpoint.label,
        };
      }
    }

    const now = Date.now();
    setConnectionStatus({
      loading: false,
      checkedAt: new Date(now).toLocaleString(),
      checkedAtMs: now,
      apiBase: ENV.API_URL,
      results,
    });
  }, [formatWatchdogMessage]);

  const isConnectionStatusStale =
    Boolean(connectionStatus.checkedAtMs) &&
    Date.now() - connectionStatus.checkedAtMs > staleThresholdMs;

  const getOverallHealthStatus = () => {
    if (connectionStatus.loading) return 'loading';
    if (!connectionStatus.checkedAtMs) return 'unknown';
    if (isConnectionStatusStale) return 'stale';
    
    const results = Object.values(connectionStatus.results || {});
    if (!results.length) return 'unknown';
    
    const failedCount = results.filter(r => !r.ok).length;
    const totalCount = results.length;
    
    if (failedCount === 0) return 'healthy';
    if (failedCount === totalCount) return 'error';
    return 'degraded';
  };

  const overallHealth = getOverallHealthStatus();

  const getHealthTooltip = () => {
    const baseText = 'Connection status';
    const statusMap = {
      healthy: '✅ All systems healthy',
      degraded: '⚠️ Some endpoints failing',
      error: '❌ All endpoints failing',
      stale: '⏳ Data is stale',
      loading: '⏳ Checking...',
      unknown: '❓ Status unknown'
    };
    return `${baseText} • ${statusMap[overallHealth] || statusMap.unknown}`;
  };

  useEffect(() => {
    runConnectionCheck();
  }, [runConnectionCheck]);

  useEffect(() => {
    if (!showConnectionStatus) {
      return undefined;
    }

    runConnectionCheck();
    const intervalId = setInterval(() => {
      runConnectionCheck();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [showConnectionStatus, runConnectionCheck]);

  // Keyboard shortcuts for tab navigation (Alt+1 through Alt+8)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleKeyDown = (e) => {
      // Only trigger if Alt key is pressed (without Ctrl or Shift to avoid conflicts)
      if (!e.altKey || e.ctrlKey || e.shiftKey) return;

      const shortcutTabs = {
        1: 'dashboard',
        2: 'orders',
        3: 'transactions',
        4: 'archive',
        5: 'marketplace',
        6: 'users',
        7: 'attribution',
        8: 'payouts',
        9: 'cloud',
        0: 'settings',
      };

      const nextTab = shortcutTabs[e.key];
      if (nextTab) {
        e.preventDefault();
        setActiveTab(nextTab);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  useEffect(() => {
    const applyTabFromHash = () => {
      const hash = window.location.hash || '';
      const query = hash.includes('?') ? hash.split('?')[1] : '';
      const params = new URLSearchParams(query);
      const tab = params.get('tab');
      if (tab && availableTabs.has(tab)) {
        setActiveTab(tab);
      }
    };

    applyTabFromHash();
    window.addEventListener('hashchange', applyTabFromHash);
    return () => window.removeEventListener('hashchange', applyTabFromHash);
  }, []);

  const handleTabChange = useCallback((nextTab) => {
    setActiveTab(nextTab);
    const hash = window.location.hash || '#/admin';
    const base = hash.split('?')[0] || '#/admin';
    const nextHash = `${base}?tab=${encodeURIComponent(nextTab)}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let cancelled = false;
    const pullInquiryCounts = async () => {
      const response = await fetchItemInquiries({ limit: 1 });
      if (!cancelled && response?.ok && response?.summary) {
        setInquiryCounts(response.summary);
      }
    };

    pullInquiryCounts();
    const timerApi = typeof globalThis !== 'undefined' ? globalThis : null;
    const id = timerApi?.setInterval ? timerApi.setInterval(pullInquiryCounts, 30000) : null;
    return () => {
      cancelled = true;
      if (id && timerApi?.clearInterval) timerApi.clearInterval(id);
    };
  }, [isAuthenticated]);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = fullName.trim();
    const trimmedBootstrapCode = bootstrapCode.trim();

    setIsSubmitting(true);
    setError('');

    try {
      let data;

      if (authMode === 'signup') {
        if (!bootstrapStatus.signupAllowed) {
          throw new Error('Admin signup is currently disabled. Use login or contact an existing admin.');
        }

        data = await apiPost('/admin/signup', {
          name: trimmedName,
          username: trimmedUsername,
          email: trimmedEmail,
          password: trimmedPassword,
          bootstrapCode: trimmedBootstrapCode,
        });
      } else {
        data = await apiPost('/admin/login', {
          username: trimmedUsername || trimmedEmail,
          email: trimmedEmail,
          password: trimmedPassword,
        });
      }

      if (!data?.ok || !data?.token) {
        throw new Error(data?.message || 'Authentication failed');
      }

      setToken(data.token);
      setIsAuthenticated(true);
      sessionStorage.setItem('admin-auth', 'authenticated');
      sessionStorage.setItem('admin-auth-version', 'v2');
      setUsername('');
      setEmail('');
      setFullName('');
      setBootstrapCode('');
      setPassword('');
      setError('');

      const target = nextPath();
      if (target) {
        navigate(target, { replace: true });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Authentication failed.';
      const statusCode = err?.response?.status;
      const maybeCapacityIssue = /quota|capacity|storage|space quota|disk full|enospc/i.test(String(msg || ''));
      const isSignupCapacityFailure = authMode === 'signup' && (statusCode === 507 || maybeCapacityIssue);

      if (isSignupCapacityFailure) {
        setError('Admin self-signup is temporarily unavailable due to backend storage capacity. Existing admins can sign in now. Use "Create Admin Account" again later when capacity is restored.');
        setAuthMode('login');
      } else {
        setError(msg);
      }
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin-auth');
    sessionStorage.removeItem('admin-auth-version');
    clearToken();
    setUsername('');
    setPassword('');
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="admin-page">
        <button 
          className="theme-toggle login-theme-toggle" 
          onClick={() => {
            const newMode = !darkMode;
            setDarkMode(newMode);
            localStorage.setItem('theme', newMode ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
          }}
          aria-label="Toggle theme"
          title="Toggle light/dark theme"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        <div className="admin-login">
          <div className="login-card">
            <h1>🔒 Admin Access</h1>
            <p>
              {authMode === 'signup'
                ? 'Create your admin account to initialize the panel.'
                : 'Enter your credentials to access the admin panel.'}
            </p>
            <div style={{ marginBottom: '12px' }}>
              <button
                type="button"
                className="login-btn"
                onClick={() => {
                  setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                  setError('');
                }}
                disabled={
                  isSubmitting ||
                  bootstrapStatus.loading ||
                  (authMode !== 'signup' && !bootstrapStatus.signupAllowed)
                }
              >
                {authMode === 'signup' ? 'Switch to Login' : 'Create Admin Account'}
              </button>
            </div>
            {authMode === 'signup' && (
              <p className="auth-hint" style={{ marginBottom: '10px' }}>
                {bootstrapStatus.signupAllowed
                  ? bootstrapStatus.bootstrapCodeRequired
                    ? 'Signup is enabled with bootstrap code verification.'
                    : bootstrapStatus.selfSignupEnabled
                      ? 'Self-signup is enabled for admin onboarding.'
                      : 'Signup is enabled.'
                  : 'Signup is disabled. Use login or contact an existing admin.'}
              </p>
            )}
            <form onSubmit={handleLogin}>
              {authMode === 'signup' && (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="login-input"
                  required
                />
              )}
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={authMode === 'signup' ? 'Username (optional)' : 'Username or Email'}
                className="login-input"
                autoFocus
                required={authMode !== 'signup'}
              />
              {authMode === 'signup' && (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="login-input"
                  required
                />
              )}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === 'signup' ? 'Password (min 8 chars)' : 'Password'}
                className="login-input"
                required
              />
              {authMode === 'signup' && bootstrapStatus.bootstrapCodeRequired && (
                <input
                  type="password"
                  value={bootstrapCode}
                  onChange={(e) => setBootstrapCode(e.target.value)}
                  placeholder="Bootstrap Code"
                  className="login-input"
                  required
                />
              )}
              {error ? (
                <ErrorBanner
                  message={error}
                  onRetry={() => setError('')}
                  onDismiss={() => setError('')}
                />
              ) : null}
              <button
                type="submit"
                className="login-btn"
                disabled={isSubmitting || (authMode === 'signup' && !bootstrapStatus.signupAllowed)}
              >
                {isSubmitting
                  ? authMode === 'signup'
                    ? 'Creating account...'
                    : 'Signing in...'
                  : authMode === 'signup'
                    ? 'Create Admin Account'
                    : 'Access Admin Panel'}
              </button>
            </form>
            {authMode === 'login' && (
              <>
                <div className="oauth-divider" aria-hidden="true">
                  <span>or</span>
                </div>
                <button
                  type="button"
                  className="login-btn github-login-btn"
                  disabled={isSubmitting || !githubAuthConfigured}
                  onClick={handleGithubLogin}
                >
                  {githubAuthConfigured ? 'Continue with GitHub' : 'GitHub Login Unavailable'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin panel
  return (
    <>
      <div className="admin-page authenticated">
        <div className="admin-header">
          <div className="header-content">
            <h1>⚙️ Archive Admin Panel</h1>
            <div className="header-actions">
              <Link to="/" className="home-btn">
                🏠 Home
              </Link>
              <Link to="/streams" className="header-btn" title="Livestreams">
                📺 Streams
              </Link>
              <Link to="/deals" className="header-btn" title="Deals">
                🤝 Deals
              </Link>
              <button 
                className="header-btn refresh-btn"
                onClick={runConnectionCheck}
                disabled={connectionStatus.loading}
                aria-label="Refresh connection status"
                title="Refresh connection status"
              >
                {connectionStatus.loading ? '⏳' : '🔄'}
              </button>
              <button 
                className="header-btn logout-header-btn"
                onClick={handleLogout}
                aria-label="Logout"
                title="Logout"
              >
                🚪
              </button>
              <button 
                className="theme-toggle" 
                onClick={() => {
                  const newMode = !darkMode;
                  setDarkMode(newMode);
                  localStorage.setItem('theme', newMode ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
                }}
                aria-label="Toggle theme"
                title="Toggle light/dark theme"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button 
                className="connection-status-toggle" 
                onClick={() => setShowConnectionStatus(!showConnectionStatus)}
                aria-label="Toggle connection status"
                title={getHealthTooltip()}
              >
                🔌
                <span className={`health-indicator health-indicator--${overallHealth}`} aria-hidden="true"></span>
              </button>
            </div>
            {/* Connection Status Dropdown */}
            {showConnectionStatus && (
              <div className="connection-status-dropdown">
                <div className="sidebar-section connection-panel">
                  <div className="connection-header">
                    <h2>Connection Status</h2>
                  </div>
                  <div className="connection-base">
                    API: <span>{connectionStatus.apiBase}</span>
                  </div>
                  {connectionStatus.checkedAt && (
                    <div className="connection-updated">
                      Last check: {connectionStatus.checkedAt}
                    </div>
                  )}
                  {isConnectionStatusStale && (
                    <div className="connection-updated" role="status" aria-live="polite">
                      ⚠️ Data may be stale (older than {staleThresholdMinutes} min)
                    </div>
                  )}
                  <div className="connection-updated">
                    Auto-refresh: every 60s while open
                  </div>
                  <div className="connection-token">
                    <label htmlFor="adminToken">Admin token (optional)</label>
                    <input
                      id="adminToken"
                      type="password"
                      value={adminTokenInput}
                      onChange={(e) => setAdminTokenInput(e.target.value)}
                      placeholder="Paste admin JWT token"
                    />
                    <small>Used only for /api/admin/status check.</small>
                  </div>

                  {/* OpenClaw Summary Section */}
                  {connectionStatus.results?.openclawWatchdog && (
                    <div className="openclaw-summary">
                      <div className="openclaw-summary__header">
                        <h3>🔗 OpenClaw Gateway</h3>
                        <span className={`openclaw-summary__status ${connectionStatus.results.openclawWatchdog.ok ? 'ok' : 'bad'}`}>
                          {connectionStatus.results.openclawWatchdog.ok ? '✓ Active' : '✗ Issue'}
                        </span>
                      </div>
                      <div className="openclaw-summary__details">
                        {connectionStatus.results.openclawWatchdog.message && (
                          <p className="openclaw-summary__message">
                            {connectionStatus.results.openclawWatchdog.message}
                          </p>
                        )}
                        {connectionStatus.results.openclawWatchdog.data?.summary && (
                          <div className="openclaw-summary__metrics">
                            <div className="openclaw-metric">
                              <span className="openclaw-metric__label">State:</span>
                              <span className="openclaw-metric__value">
                                {connectionStatus.results.openclawWatchdog.data.summary.state || 'unknown'}
                              </span>
                            </div>
                            <div className="openclaw-metric">
                              <span className="openclaw-metric__label">Errors:</span>
                              <span className="openclaw-metric__value">
                                {connectionStatus.results.openclawWatchdog.data.summary.errorCountWindow ?? 0}
                              </span>
                            </div>
                            <div className="openclaw-metric">
                              <span className="openclaw-metric__label">Alerts:</span>
                              <span className="openclaw-metric__value">
                                {connectionStatus.results.openclawWatchdog.data.summary.alertCountWindow ?? 0}
                              </span>
                            </div>
                            {connectionStatus.results.openclawWatchdog.data.summary.lastEventAt && (
                              <div className="openclaw-metric">
                                <span className="openclaw-metric__label">Last Event:</span>
                                <span className="openclaw-metric__value">
                                  {connectionStatus.results.openclawWatchdog.data.summary.lastEventAt}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="openclaw-summary__actions">
                        <button
                          className="openclaw-test-button"
                          onClick={handleTestDispatch}
                          disabled={dispatchTestState.loading}
                        >
                          {dispatchTestState.loading ? 'Testing...' : 'Test Dispatch'}
                        </button>
                        <button
                          className="openclaw-test-button openclaw-test-button--secondary"
                          onClick={toggleRecentEvents}
                        >
                          {showRecentEvents ? '📋 Hide Activity' : '📋 View Activity'}
                        </button>
                        {dispatchTestState.message && (
                          <span className="openclaw-test-message">{dispatchTestState.message}</span>
                        )}
                      </div>

                      {/* Recent Events Viewer */}
                      {showRecentEvents && (
                        <div className="openclaw-events">
                          <div className="openclaw-events__header">
                            <h4>Recent Activity</h4>
                            <button 
                              className="openclaw-events__refresh"
                              onClick={fetchRecentEvents}
                              disabled={recentEvents.loading}
                              title="Refresh events"
                            >
                              🔄
                            </button>
                          </div>
                          
                          {recentEvents.loading && (
                            <div className="openclaw-events__loading">
                              <LoadingDots size="small" label="Loading events..." />
                            </div>
                          )}
                          
                          {recentEvents.error && (
                            <div className="openclaw-events__error">
                              ⚠️ {recentEvents.error}
                            </div>
                          )}
                          
                          {recentEvents.data && recentEvents.data.length === 0 && (
                            <div className="openclaw-events__empty">
                              No recent events found
                            </div>
                          )}
                          
                          {recentEvents.data && recentEvents.data.length > 0 && (
                            <div className="openclaw-events__list">
                              {recentEvents.data.slice(0, 15).map((event) => (
                                <div 
                                  key={event.id} 
                                  className={`openclaw-event openclaw-event--${event.level.toLowerCase()}`}
                                >
                                  <div className="openclaw-event__meta">
                                    <span className="openclaw-event__level">{event.level}</span>
                                    <span className="openclaw-event__time">
                                      {event.timestamp || 'n/a'}
                                    </span>
                                  </div>
                                  <div className="openclaw-event__message">
                                    {event.message}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <ul className="connection-list">
                    {['health', 'ping', 'version', 'archive', 'items'].map((key) => {
                      const item = connectionStatus.results[key];
                      return (
                        <li key={key} className={`connection-item ${item?.ok ? 'ok' : 'bad'}`}>
                          <div className="connection-item__row">
                            <span className="connection-item__status-dot" aria-hidden="true"></span>
                            <span className="connection-item__name">{item?.label || `/api/${key}`}</span>
                            <span className="connection-item__status">
                              {item ? (item.ok ? 'OK' : `Fail (${item.status})`) : '—'}
                            </span>
                          </div>
                          {item?.message && (
                            <div className="connection-item__message">{item.message}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <section className="admin-atlas" aria-label="Admin atlas">
            <h2>Atlas</h2>
            <p className="admin-atlas__copy">
              Keep the control panel tied to the same paths as the public site and the personal workspace.
            </p>
            <div className="admin-atlas__links">
              {ADMIN_ATLAS_LINKS.map((link) => (
                <Link key={link.key} to={link.to} className="admin-atlas__link">
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
        <AdminNav />
        <AdminTabs activeTab={activeTab} onTabChange={handleTabChange} inquiryCounts={inquiryCounts} />
        <div className="admin-container">
          {/* Dashboard Tab - Overview */}
          {activeTab === 'dashboard' && (
            renderTab(
              <DashboardTab onNavigateTab={handleTabChange} onMakeOrder={() => setMakeOrderModalOpen(true)} />
            )
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            renderTab(<AdminOrdersPage />)
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            renderTab(<TransactionsTab />)
          )}

          {/* Archive Tab */}
          {activeTab === 'archive' && (
            renderTab(<ArchiveTab />)
          )}

          {/* Marketplace Tab */}
          {activeTab === 'marketplace' && (
            renderTab(<MarketplaceTab />)
          )}

          {/* Inquiries Tab */}
          {activeTab === 'inquiries' && (
            renderTab(<InquiriesTab onNavigateTab={handleTabChange} />)
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            renderTab(<UsersTab />)
          )}

          {/* Attribution Tab */}
          {activeTab === 'attribution' && (
            renderTab(<AttributionTab />)
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            renderTab(<PayoutTab />)
          )}

          {/* Settlement Contracts Tab */}
          {activeTab === 'settlements' && (
            renderTab(<SettlementContractsTab />)
          )}

          {/* Cloud Storage Tab */}
          {activeTab === 'cloud' && (
            renderTab(<CloudStorageTab />)
          )}

          {/* Library Tab */}
          {activeTab === 'library' && (
            renderTab(<LibraryTab />)
          )}

          {/* API Documentation Tab */}
          {activeTab === 'api' && (
            renderTab(<ApiDocsTab />)
          )}

          {/* Health Tab */}
          {activeTab === 'health' && (
            renderTab(<HealthTab />)
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            renderTab(<SettingsTab />)
          )}

          {/* OpenClaw Tab */}
          {activeTab === 'openclaw' && (
            renderTab(<OpenClawTab />)
          )}

          {/* Bounty Hunter Tab */}
          {activeTab === 'bounty-hunter' && (
            renderTab(<BountyHunterTab />)
          )}

          {/* Royalty Analytics Tab */}
          {activeTab === 'royalty-analytics' && (
            renderTab(<RoyaltyAnalyticsTab />)
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            renderTab(<OverviewTab onNavigateTab={handleTabChange} />)
          )}
        </div>

        {/* Make Order Modal */}
        <MakeOrderModal
          isOpen={makeOrderModalOpen}
          onClose={() => setMakeOrderModalOpen(false)}
          onSuccess={(dealId, deal) => {
            console.log('Order created:', dealId);
            // Could optionally navigate to deals tab or show notification
          }}
        />
      </div>
    </>
  );
}
