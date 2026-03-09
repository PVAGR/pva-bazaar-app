import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createArchiveEntry, fetchArchiveEntries, deleteArchiveEntry, apiGet, apiFetch } from '../lib/api';
import { ENV } from '../config/env';
import { getErrorMessage } from '../lib/errorUtils';
import ErrorBanner from '../components/ErrorBanner.jsx';
import AdminNav from '../components/AdminNav.jsx';
import AdminTabs from '../components/AdminTabs.jsx';
import HelpTip from '../components/HelpTip.jsx';
import { clearToken, setToken } from '../lib/auth';
import { createLogger } from '../lib/logger';
import { SkeletonList } from '../components/SkeletonLoader.jsx';
import { LoadingDots } from '../components/LoadingSpinner.jsx';
import DashboardTab from '../components/DashboardTab.jsx';
import MarketplaceTab from '../components/MarketplaceTab.jsx';
import UsersTab from '../components/UsersTab.jsx';
import CloudStorageTab from '../components/CloudStorageTab.jsx';
import ApiDocsTab from '../components/ApiDocsTab.jsx';
import HealthTab from '../components/HealthTab.jsx';
import SettingsTab from '../components/SettingsTab.jsx';
import './AdminPage.css';

const logger = createLogger('AdminPage');

export default function AdminPage() {
  const navigate = useNavigate();
  const staleThresholdMs = ENV.STATUS_STALE_MS || 120000;
  const staleThresholdMinutes = Math.round((staleThresholdMs / 60000) * 10) / 10;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
    // Admin code state removed: now session-based only
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  // Use global theme system
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved ? saved === 'dark' : false;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    return isDark;
  });
  
  // Form state for new archive entry
  const [formData, setFormData] = useState({
    title: '',
    category: 'Personal',
    description: '',
    content: '',
    wordCount: '0',
    mediaUrls: ''
  });
  
  const [savedEntries, setSavedEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // {id, title} for confirmation modal
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState('');
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
    
    // Load saved entries from server
    loadEntriesFromServer();
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
  const loadEntriesFromServer = async () => {
    setEntriesLoading(true);
    try {
      const response = await fetchArchiveEntries({ limit: 100 });
      if (response.ok && Array.isArray(response.items)) {
        setSavedEntries(response.items);
      } else {
        setSavedEntries([]);
      }
    } catch (err) {
      logger.error('Failed to load entries from server', err);
      setSavedEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };
  const handleLogin = async (e) => {
    e.preventDefault();
    // Trim whitespace from inputs
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
      setIsSubmitting(true);
      setError('');
      try {
        const res = await apiFetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-calculate word count for content
      ...(name === 'content' ? { wordCount: value.trim().split(/\s+/).length.toString() } : {})
    }));
  };

  const parseMediaUrls = (value) =>
    value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const getCloudinaryConfig = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    return { cloudName, uploadPreset };
  };

  const uploadMediaFiles = async (files) => {
    const { cloudName, uploadPreset } = getCloudinaryConfig();
    if (!cloudName || !uploadPreset) {
      setMediaError('Missing Cloudinary config. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
      return;
    }
    if (!files?.length) return;

    setMediaError('');
    setUploadingMedia(true);

    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          const form = new FormData();
          form.append('file', file);
          form.append('upload_preset', uploadPreset);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: 'POST',
            body: form,
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error?.message || 'Upload failed');
          }
          return data.secure_url;
        })
      );

      setFormData((prev) => {
        const existing = prev.mediaUrls ? `${prev.mediaUrls}\n` : '';
        return { ...prev, mediaUrls: `${existing}${uploads.join('\n')}`.trim() };
      });
    } catch (err) {
      setMediaError(err.message || 'Upload failed');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setIsSubmitting(true);
    
    try {
      if (editingEntry) {
        // For now, editing is not supported via API - show message
        setApiError('Editing existing entries is not yet supported. Please create a new entry.');
        setIsSubmitting(false);
        return;
      } else {
        // Create new entry via API
        const entryData = {
          title: formData.title,
          category: formData.category,
          description: formData.description,
          content: formData.content,
          wordCount: formData.wordCount,
          media: parseMediaUrls(formData.mediaUrls),
        };

        const result = await createArchiveEntry(entryData);
        
        if (!result.ok) {
          setApiError(`Failed to create entry: ${result.error}`);
          setIsSubmitting(false);
          return;
        }

        // Success - refresh entries
        await loadEntriesFromServer();
      }

      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Reset form
      setFormData({
        title: '',
        category: 'Personal',
        description: '',
        content: '',
        wordCount: '0',
        mediaUrls: ''
      });
      setApiError('');
    } catch (err) {
      setApiError(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      category: entry.category,
      description: entry.description,
      content: entry.content,
      wordCount: entry.wordCount,
      mediaUrls: Array.isArray(entry.media) ? entry.media.join('\n') : ''
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setFormData({
      title: '',
      category: 'Personal',
      description: '',
      content: '',
      wordCount: '0',
      mediaUrls: ''
    });
  };

  const handleDelete = async (id, title) => {
    // Show custom confirmation modal
    setDeleteConfirm({ id, title });
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm) return;
    
    const { id } = deleteConfirm;
    
    try {
      setIsSubmitting(true);
      const result = await deleteArchiveEntry(id);
      
      if (result.ok) {
        setSavedEntries(prev => prev.filter(entry => entry._id !== id && entry.id !== id));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setDeleteConfirm(null);
      } else {
        setApiError(result.error || 'Failed to delete entry');
        setTimeout(() => setApiError(''), 5000);
        setDeleteConfirm(null);
      }
    } catch (err) {
      setApiError(err.message || 'Error deleting entry');
      setTimeout(() => setApiError(''), 5000);
      setDeleteConfirm(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
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
          {activeTab === 'dashboard' && <DashboardTab onNavigateTab={setActiveTab} />}

          {/* Archive Tab - Original functionality */}
          {activeTab === 'archive' && (
            <>
              <div className="admin-sidebar">
                <div className="sidebar-section">
                  <h2>📊 Statistics</h2>
                  <div className="stat-item">
                    <span>Original Entries:</span>
                    <strong>17</strong>
                  </div>
                  <div className="stat-item">
                    <span>Custom Entries:</span>
                    <strong>{savedEntries.length}</strong>
                  </div>
                  <div className="stat-item">
                    <span>Total Entries:</span>
                    <strong>{17 + savedEntries.length}</strong>
                  </div>
                </div>
                <div className="sidebar-section">
                  <h2>📝 Your Entries</h2>
              {entriesLoading ? (
                <SkeletonList count={5} />
              ) : savedEntries.length === 0 ? (
                <p className="empty-message">No custom entries yet</p>
              ) : (
                <div className="entries-list">
                  {savedEntries.map(entry => (
                    <div 
                      key={entry.id} 
                      className={`entry-preview ${editingEntry?.id === entry.id ? 'active' : ''}`}
                      onClick={() => handleEdit(entry)}
                    >
                      <div className="entry-preview-header">
                        <strong>{entry.title}</strong>
                        <div className="entry-actions">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(entry._id || entry.id, entry.title);
                            }}
                            className="delete-btn"
                            title="Delete entry"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <span className="entry-category">{entry.category}</span>
                      <span className="entry-words">{entry.wordCount} words</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="admin-main">
            <div className="form-card">
              <h2>{editingEntry ? '✏️ Edit Archive Entry' : '✍️ Create New Archive Entry'}</h2>
              {editingEntry && (
                <div className="info-message">
                  📝 Editing: <strong>{editingEntry.title}</strong>
                  <button onClick={handleCancelEdit} className="cancel-edit-btn">✕ Cancel</button>
                </div>
              )}
              {showSuccess && (
                <div className="success-message">
                  ✅ Entry {editingEntry ? 'updated' : 'saved'} successfully! It will appear in the archive library.
                </div>
              )}
              {apiError && (
                <div className="error-message api-error-message">
                  ❌ {apiError}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                {/* Admin code input removed: session-based auth only */}
                <div className="form-group">
                  <label htmlFor="title">
                    Title *{' '}
                    <HelpTip
                      title="Title"
                      body="A clear name for this archive entry. It will be shown in the library list."
                      example="Archive Entry 018: My New Story"
                    />
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Archive Entry 018: My New Story"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="category">
                    Category *{' '}
                    <HelpTip
                      title="Category"
                      body="Used to organize entries and filter the library."
                      example="Technology"
                    />
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Fiction">Fiction</option>
                    <option value="Spiritual">Spiritual</option>
                    <option value="Technology">Technology</option>
                    <option value="Business">Business</option>
                    <option value="Personal">Personal</option>
                    <option value="Philosophy">Philosophy</option>
                    <option value="Wisdom">Wisdom</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Strategic">Strategic</option>
                    <option value="Index">Index</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="description">
                    Description *{' '}
                    <HelpTip
                      title="Description"
                      body="A short summary shown in the list preview."
                      example="A brief description of this archive entry..."
                    />
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="A brief description of this archive entry..."
                    rows="2"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="mediaUrls">
                    Media URLs (optional){' '}
                    <HelpTip
                      title="Media URLs"
                      body="Optional links to images/video/audio that will be shown under the entry. You can also drag & drop files to upload."
                      example="https://example.com/photo.jpg"
                    />
                  </label>
                  <textarea
                    id="mediaUrls"
                    name="mediaUrls"
                    value={formData.mediaUrls}
                    onChange={handleInputChange}
                    placeholder="https://example.com/photo.jpg\nhttps://example.com/video.mp4"
                    rows="3"
                  />
                  <small className="media-url-help">
                    Add one URL per line or separate with commas.
                  </small>
                  <div
                    className="media-uploader"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      uploadMediaFiles(e.dataTransfer.files);
                    }}
                  >
                    <div className="media-uploader__text">
                      Drag & drop files here, or select files to upload
                    </div>
                    <label className="media-uploader__button">
                      {uploadingMedia ? 'Uploading…' : 'Choose files'}
                      <input
                        type="file"
                        accept="image/*,video/*,audio/*"
                        multiple
                        disabled={uploadingMedia}
                        onChange={(e) => uploadMediaFiles(e.target.files)}
                      />
                    </label>
                    {mediaError && <div className="media-uploader__error">{mediaError}</div>}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="content">
                    Content * (Markdown supported){' '}
                    <HelpTip
                      title="Content"
                      body="Write the full entry content. Markdown formatting is supported."
                      example="# Title\\n\\nYour content here..."
                    />
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="# Your Title Here\n\nWrite your content here...\n\n## Section\nYour text...\n\n- Bullet points\n- Are supported\n\n**Bold** and *italic* text work too."
                    rows="15"
                    required
                  />
                  <div className="word-count">
                    Word count: {formData.wordCount}
                  </div>
                </div>
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? '⏳ Publishing...' : (editingEntry ? '✅ Update Entry' : '💾 Publish to Live Site')}
                </button>
              </form>
            </div>
          </div>
            </>
          )}

          {/* Marketplace Tab */}
          {activeTab === 'marketplace' && <MarketplaceTab />}

          {/* Users Tab */}
          {activeTab === 'users' && <UsersTab />}

          {/* Cloud Storage Tab */}
          {activeTab === 'cloud' && <CloudStorageTab />}

          {/* API Documentation Tab */}
          {activeTab === 'api' && <ApiDocsTab />}

          {/* Health Tab */}
          {activeTab === 'health' && <HealthTab />}

          {/* Settings Tab */}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="delete-confirmation-bubble">
            <div className="bubble-icon">⚠️</div>
            <h3>Delete Entry?</h3>
            <p className="entry-title-confirm">{deleteConfirm.title}</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="button-group">
              <button 
                onClick={cancelDelete}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteAction}
                className="confirm-delete-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ Deleting...' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
