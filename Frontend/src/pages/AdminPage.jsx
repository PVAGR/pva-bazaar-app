import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiFetch } from '../lib/api';
import { ENV } from '../config/env';
import { getErrorMessage } from '../lib/errorUtils';
import ErrorBanner from '../components/ErrorBanner.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import AdminNav from '../components/AdminNav.jsx';
import AdminTabs from '../components/AdminTabs.jsx';
import { clearToken, setToken } from '../lib/auth';
import { createLogger } from '../lib/logger';
import { LoadingDots } from '../components/LoadingSpinner.jsx';
import DashboardTab from '../components/DashboardTab.jsx';
import ArchiveTab from '../components/ArchiveTab.jsx';
import MarketplaceTab from '../components/MarketplaceTab.jsx';
import UsersTab from '../components/UsersTab.jsx';
import AttributionTab from '../components/AttributionTab.jsx';
import PayoutTab from '../components/PayoutTab.jsx';
import CloudStorageTab from '../components/CloudStorageTab.jsx';
import ApiDocsTab from '../components/ApiDocsTab.jsx';
import HealthTab from '../components/HealthTab.jsx';
import SettingsTab from '../components/SettingsTab.jsx';
import OpenClawTab from '../components/OpenClawTab.jsx';
import './AdminPage.css';

const logger = createLogger('AdminPage');

export default function AdminPage() {
  const staleThresholdMs = ENV.STATUS_STALE_MS || 120000;
  const staleThresholdMinutes = Math.round((staleThresholdMs / 60000) * 10) / 10;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
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
      const response = await apiFetch('/openclaw/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'pvabazaar.admin_test',
          message: 'Test dispatch from PVA Bazaar admin panel',
          metadata: {
            source: 'admin-panel',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
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
      const response = await apiFetch('/openclaw/recent-events?limit=30');
      const data = await response.json();
      
      if (response.ok && data.ok) {
        setRecentEvents({ loading: false, data: data.events || [], error: null });
      } else {
        setRecentEvents({ loading: false, data: null, error: data.message || 'Failed to fetch events' });
      }
    } catch (err) {
      setRecentEvents({ loading: false, data: null, error: err.message || 'Network error' });
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

      const tabs = ['dashboard', 'archive', 'marketplace', 'users', 'attribution', 'payouts', 'cloud', 'api', 'health', 'settings'];
      let key = parseInt(e.key);
      // Support Alt+0 for the last tab (settings)
      if (e.key === '0') key = 9;

      if (key >= 1 && key <= 9) {
        e.preventDefault();
        setActiveTab(tabs[key - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    // Trim whitespace from inputs
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
      setIsSubmitting(true);
      setError('');
      try {
        // Use regular auth login with email (username field is used as email)
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedUsername, password: trimmedPassword }),
          credentials: 'include',
        });
        if (res.ok) {
          // Admin login returns a JWT token. Store it so other protected pages (streams/items)
          // can call authenticated endpoints using the shared axios interceptor.
          const data = await res.json().catch(() => ({}));
          if (data && data.token) {
            setToken(data.token);
          }
          setIsAuthenticated(true);
          sessionStorage.setItem('admin-auth', 'authenticated');
          sessionStorage.setItem('admin-auth-version', 'v2');
          setUsername('');
          setPassword('');
          setError('');
        } else {
          const data = await res.json().catch(() => ({}));
          const msg = data.message || 'Invalid username or password. Access denied.';
          if (res.status === 503 && (msg === 'Database connection failed' || (data.error && String(data.error).toLowerCase().includes('mongo')))) {
            setError(
              'Database connection failed. The API cannot reach MongoDB. ' +
              'If you deploy: set MONGODB_URI in Vercel (Project → Settings → Environment Variables) and in MongoDB Atlas set Network Access to allow 0.0.0.0/0. Then retry.'
            );
          } else {
            setError(msg);
          }
          setPassword('');
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Network error. Check your connection and that the API is reachable, then try again.'));
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
            <p>Enter your credentials to access the admin panel</p>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="login-input"
                autoFocus
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="login-input"
                required
              />
              {error ? (
                <ErrorBanner
                  message={error}
                  onRetry={() => setError('')}
                  onDismiss={() => setError('')}
                />
              ) : null}
              <button type="submit" className="login-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Access Admin Panel'}
              </button>
            </form>
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
        </div>
        <AdminNav />
        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="admin-container">
          {/* Dashboard Tab - Overview */}
          {activeTab === 'dashboard' && (
            <ErrorBoundary>
              <DashboardTab onNavigateTab={setActiveTab} />
            </ErrorBoundary>
          )}

          {/* Archive Tab */}
          {activeTab === 'archive' && (
            <ErrorBoundary>
              <ArchiveTab />
            </ErrorBoundary>
          )}

          {/* Marketplace Tab */}
          {activeTab === 'marketplace' && (
            <ErrorBoundary>
              <MarketplaceTab />
            </ErrorBoundary>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <ErrorBoundary>
              <UsersTab />
            </ErrorBoundary>
          )}

          {/* Attribution Tab */}
          {activeTab === 'attribution' && (
            <ErrorBoundary>
              <AttributionTab />
            </ErrorBoundary>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <ErrorBoundary>
              <PayoutTab />
            </ErrorBoundary>
          )}

          {/* Cloud Storage Tab */}
          {activeTab === 'cloud' && (
            <ErrorBoundary>
              <CloudStorageTab />
            </ErrorBoundary>
          )}

          {/* API Documentation Tab */}
          {activeTab === 'api' && (
            <ErrorBoundary>
              <ApiDocsTab />
            </ErrorBoundary>
          )}

          {/* Health Tab */}
          {activeTab === 'health' && (
            <ErrorBoundary>
              <HealthTab />
            </ErrorBoundary>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <ErrorBoundary>
              <SettingsTab />
            </ErrorBoundary>
          )}

          {/* OpenClaw Tab */}
          {activeTab === 'openclaw' && (
            <ErrorBoundary>
              <OpenClawTab />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </>
  );
}
