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
 */

import React, { useState } from 'react';
import { getApiBase, setApiBase } from '../lib/api';
import { ENV } from '../config/env';
import './SettingsTab.css';

export default function SettingsTab() {
  const [apiUrl, setApiUrl] = useState(getApiBase() || ENV.API_URL);
  const [message, setMessage] = useState('');

  const handleSaveApi = () => {
    setApiBase(apiUrl);
    setMessage(' API URL saved successfully!');
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

  return (
    <div className="settings-tab" role="tabpanel" id="settings-panel">
      <div className="tab-header">
        <h2>⚙️ Settings</h2>
        <p className="tab-description">
          Configure application settings, API endpoints, and preferences.
        </p>
      </div>

      {message && <div className="success-message">{message}</div>}

      <div className="settings-grid">
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
            />
            <div className="button-group">
              <button onClick={handleSaveApi} className="primary-btn">
                💾 Save
              </button>
              <button onClick={handleResetApi} className="secondary-btn">
                🔄 Reset
              </button>
            </div>
          </div>
        </div>

        <div className="setting-card">
          <h3>🎨 Theme</h3>
          <p className="setting-description">
            Theme toggle is available in the header. Current theme is managed globally.
          </p>
          <div className="theme-info">
            <strong>Current:</strong>
            <span>{document.documentElement.getAttribute('data-theme') || 'dark'}</span>
          </div>
        </div>

        <div className="setting-card">
          <h3>💾 Data Management</h3>
          <p className="setting-description">
            Manage cached data and local storage. Clearing cache will log you out.
          </p>
          <div className="button-group">
            <button onClick={handleClearCache} className="danger-btn">
              🗑️ Clear All Cache
            </button>
            <button onClick={handleExportSettings} className="secondary-btn">
              📥 Export Settings
            </button>
          </div>
        </div>

        <div className="setting-card info-card">
          <h3>ℹ️ System Information</h3>
          <dl className="info-list">
            <dt>Environment:</dt>
            <dd>{ENV.NODE_ENV || 'production'}</dd>
            
            <dt>API URL:</dt>
            <dd className="code-text">{ENV.API_URL}</dd>
            
            <dt>Version:</dt>
            <dd>1.0.0</dd>
            
            <dt>Build:</dt>
            <dd>{new Date().toISOString().split('T')[0]}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
