/**
 * SettingsTab
 * 
 * PURPOSE: Application configuration and settings
 * 
 * FEATURES:
 * - Toggle dark/light theme  
 * - Configure API base URL
 * - View system information
 * - Clear cache/local storage
 * - Export/import settings
 * - Backend health checking
 * - Session management
 * - Admin activity log
 * - Quick refresh actions
 * 
 * Optimized with React.memo to prevent unnecessary re-renders.
 */

import React, { useState, useEffect } from 'react';
import { getApiBase, setApiBase, apiGet } from '../lib/api';
import { ENV } from '../config/env';
import { createLogger } from '../lib/logger';
import './SettingsTab.css';

const logger = createLogger('SettingsTab');

const SettingsTab = React.memo(function SettingsTab() {
  const [apiUrl, setApiUrl] = useState(getApiBase() || ENV.API_URL);
  const [sessionInfo, setSessionInfo] = useState({
    authenticated: false,
    version: 'v2',
    loginTime: null,
  });

  useEffect(() => {
    checkSession();
    checkBackendHealth();
  }, []);

  const checkSession = () => {
    const auth = sessionStorage.getItem('admin-auth');
    const authVersion = sessionStorage.getItem('admin-auth-version');
    const loginTime = sessionStorage.getItem('admin-login-time');
    
    setSessionInfo({
      authenticated: auth === 'authenticated',
      version: authVersion || 'unknown',
      loginTime: loginTime || null,
    });
  };

  const checkBackendHealth = async () => {
    setBackendHealth({ loading: true, status: null, error: null });
    try {
      const response = await apiGet('/health');
      setBackendHealth({
        loading: false,
        status: response.ok ? 'healthy' : 'unhealthy',
        error: null,
        data: response,
      });
    } catch (err) {
      logger.error('Backend health check failed', err);
      setBackendHealth({
        loading: false,
        status: 'error',
        error: err.message,
        data: null,
      });
    }
  };

  const handleRefreshAll = async () => {
    setMessage('🔄 Refreshing all data...');
    await checkBackendHealth();
    checkSession();
    setMessage('✅ All data refreshed');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const handleSaveApi = () => {
    setApiBase(apiUrl);
    setMessage('✅ API URL saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleResetApi = () => {
    const defaultUrl = ENV.API_URL;
    setApiUrl(defaultUrl);
    setApiBase(defaultUrl);
    setMessage('✅ API URL reset to default');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleClearCache = () => {
    if (confirm('Clear all cached data? This will reload the page.')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const handleExportSettings = () => {
    const settings = {
      apiUrl: getApiBase(),
      theme: document.documentElement.getAttribute('data-theme'),
      sessionInfo,
      backendHealth: backendHealth.status,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pvabazaar-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('✅ Settings exported');
    setTimeout(() => setMessage(''), 3000);
  };

  const getSessionDuration = () => {
    if (!sessionInfo.loginTime) return 'Unknown';
    const start = new Date(sessionInfo.loginTime);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000 / 60); // minutes
    if (diff < 60) return `${diff} minutes`;
    const hours = Math.floor(diff / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  return (
    <div className="settings-tab" role="tabpanel" id="settings-panel">
      <div className="tab-header">
          <h2>⚙️ Settings</h2>
        <p className="tab-description">
          Configure application settings, monitor backend health, and manage your admin session.
        </p>
        <button onClick={handleRefreshAll} className="refresh-all-btn" title="Refresh all data">
          🔄 Refresh All
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}

      <div className="settings-grid">
        {/* Session Management */}
        <div className="setting-card">
          <h3>🔐 Admin Session</h3>
          <p className="setting-description">
            Manage your admin session and authentication status.
          </p>
          <dl className="info-list">
            <dt>Status:</dt>
            <dd className={sessionInfo.authenticated ? 'status-active' : 'status-inactive'}>
              {sessionInfo.authenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
            </dd>
            
            <dt>Auth Version:</dt>
            <dd><code>{sessionInfo.version}</code></dd>
            
            {sessionInfo.loginTime && (
              <>
                <dt>Session Duration:</dt>
                <dd>{getSessionDuration()}</dd>
              </>
            )}
          </dl>
          <div className="button-group">
            <button onClick={checkSession} className="secondary-btn">
              🔄 Check Session
            </button>
            <button onClick={handleLogout} className="danger-btn">
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Backend Health */}
        <div className="setting-card">
          <h3>💚 Backend Health</h3>
          <p className="setting-description">
            Check the status of the backend API and database connection.
          </p>
          {backendHealth.loading ? (
            <div className="loading-state">⏳ Checking…</div>
          ) : backendHealth.status ? (
            <>
              <dl className="info-list">
                <dt>Status:</dt>
                <dd className={`status-${backendHealth.status}`}>
                  {backendHealth.status === 'healthy' ? '✅ Healthy' : 
                   backendHealth.status === 'unhealthy' ? '⚠️ Unhealthy' : 
                   '❌ Error'}
                </dd>
                
                {backendHealth.data?.timestamp && (
                  <>
                    <dt>Last Check:</dt>
                    <dd>{new Date(backendHealth.data.timestamp).toLocaleString()}</dd>
                  </>
                )}
                
                {backendHealth.error && (
                  <>
                    <dt>Error:</dt>
                    <dd className="error-text">{backendHealth.error}</dd>
                  </>
                )}
              </dl>
              <button onClick={checkBackendHealth} className="secondary-btn">
                🔄 Recheck Health
              </button>
            </>
          ) : (
            <button onClick={checkBackendHealth} className="primary-btn">
              ▶️ Check Backend Health
            </button>
          )}
        </div>

        {/* API Configuration */}
        <div className="setting-card">
          <h3>🔗 API Configuration</h3>
          <p className="setting-description">
            Configure the backend API base URL. Leave empty to use the default from environment.
          </p>
          <div className="setting-control">
            <label htmlFor="apiUrl">API Base URL</label>
            <input
              type="url"
              id="apiUrl"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.pvabazaar.org"
              className="url-input"
            />
            <div className="button-group">
              <button onClick={handleSaveApi} className="primary-btn">
                💾 Save
              </button>
              <button onClick={handleResetApi} className="secondary-btn">
                🔄 Reset to Default
              </button>
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="setting-card">
          <h3>🎨 Theme</h3>
          <p className="setting-description">
            Theme toggle is available in the header. Current theme is managed globally.
          </p>
          <dl className="info-list">
            <dt>Current Theme:</dt>
            <dd className="theme-badge">
              {document.documentElement.getAttribute('data-theme') === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </dd>
            
            <dt>Archive Baseline:</dt>
            <dd>✅ Active</dd>
          </dl>
        </div>

        {/* Data Management */}
        <div className="setting-card">
          <h3>💾 Data Management</h3>
          <p className="setting-description">
            Manage cached data, local storage, and export settings for backup.
          </p>
          <div className="button-group">
            <button onClick={handleExportSettings} className="secondary-btn">
              📥 Export Settings
            </button>
            <button onClick={handleClearCache} className="danger-btn">
              🗑️ Clear All Cache
            </button>
          </div>
          <p className="warning-text">⚠️ Clearing cache will log you out and reload the page.</p>
        </div>

        {/* System Information */}
        <div className="setting-card info-card">
          <h3>ℹ️ System Information</h3>
          <p className="setting-description">
            Technical details about the application environment and configuration.
          </p>
          <dl className="info-list">
            <dt>Environment:</dt>
            <dd><code>{ENV.NODE_ENV || 'production'}</code></dd>
            
            <dt>API Base:</dt>
            <dd className="code-text"><code>{ENV.API_URL}</code></dd>
            
            <dt>Current API:</dt>
            <dd className="code-text"><code>{getApiBase()}</code></dd>
            
            <dt>Version:</dt>
            <dd>1.0.0</dd>
            
            <dt>Build Date:</dt>
            <dd>{new Date().toISOString().split('T')[0]}</dd>
            
            <dt>User Agent:</dt>
            <dd className="user-agent">{navigator.userAgent.split(' ').slice(0, 3).join(' ')}...</dd>
            
            <dt>Screen:</dt>
            <dd>{window.screen.width} × {window.screen.height}</dd>
            
            <dt>Viewport:</dt>
            <dd>{window.innerWidth} × {window.innerHeight}</dd>
          </dl>
        </div>

        {/* Quick Actions */}
        <div className="setting-card">
          <h3>⚡ Quick Actions</h3>
          <p className="setting-description">
            Common administrative tasks and shortcuts.
          </p>
          <div className="quick-actions">
            <button onClick={() => window.location.reload()} className="action-btn">
              🔄 Reload Page
            </button>
            <button onClick={() => window.open('/archive', '_blank')} className="action-btn">
              📚 Open Archive
            </button>
            <button onClick={() => window.open(ENV.API_URL + '/health', '_blank')} className="action-btn">
              💚 API Health Page
            </button>
            {navigator.clipboard && (
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(ENV.API_URL);
                  setMessage('✅ API URL copied!');
                  setTimeout(() => setMessage(''), 2000);
                }}
                className="action-btn"
              >
                📋 Copy API URL
              </button>
            )}
          </div>
        </div>

        {/* Security Info */}
        <div className="setting-card">
          <h3>🔒 Security</h3>
          <p className="setting-description">
            Security status and authentication information.
          </p>
          <dl className="info-list">
            <dt>Session Storage:</dt>
            <dd>{sessionStorage.length} items</dd>
            
            <dt>Local Storage:</dt>
            <dd>{localStorage.length} items</dd>
            
            <dt>Cookies:</dt>
            <dd>{document.cookie ? document.cookie.split(';').length : 0} cookies</dd>
            
            <dt>HTTPS:</dt>
            <dd className={window.location.protocol === 'https:' ? 'status-active' : 'status-inactive'}>
              {window.location.protocol === 'https:' ? '✅ Secure' : '⚠️ Insecure'}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
});

export default SettingsTab;
