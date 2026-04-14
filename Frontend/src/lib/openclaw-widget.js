/**
 * OpenClaw Health Widget
 * 
 * Standalone component that can be embedded in any page to show OpenClaw status
 * Usage: <div id="openclaw-health-widget"></div>
 * Then call: initOpenClawWidget({ apiUrl: 'https://api.pvabazaar.org' });
 */

(function(window) {
  'use strict';

  const DEFAULT_CONFIG = {
    apiUrl: 'https://api.pvabazaar.org',
    refreshInterval: 60000, // 60 seconds
    showDetails: true,
    compact: false,
  };

  let config = { ...DEFAULT_CONFIG };
  let widgetElement = null;
  let refreshTimer = null;
  let currentStatus = null;

  function initOpenClawWidget(options = {}) {
    config = { ...DEFAULT_CONFIG, ...options };
    widgetElement = document.getElementById('openclaw-health-widget');
    
    if (!widgetElement) {
      // Widget element not found - this is expected when widget is not on page
      return;
    }

    render({ loading: true });
    fetchStatus();

    if (config.refreshInterval > 0) {
      refreshTimer = setInterval(fetchStatus, config.refreshInterval);
    }
  }

  async function fetchStatus() {
    try {
      const response = await fetch(`${config.apiUrl}/api/openclaw/watchdog-status`);
      const data = await response.json();
      
      currentStatus = {
        ok: data.ok,
        available: data.available,
        summary: data.summary || {},
        timestamp: new Date().toISOString(),
        error: null,
      };
      
      render(currentStatus);
    } catch (err) {
      currentStatus = {
        ok: false,
        available: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
      
      render(currentStatus);
    }
  }

  function render(status) {
    if (!widgetElement) return;

    if (status.loading) {
      widgetElement.innerHTML = `
        <div class="openclaw-widget loading">
          <div class="spinner"></div>
          <p>Loading OpenClaw status...</p>
        </div>
      `;
      return;
    }

    const state = getHealthState(status);
    const stateClass = state.toLowerCase();
    const stateEmoji = getStateEmoji(state);

    const html = config.compact 
      ? renderCompact(status, state, stateEmoji, stateClass)
      : renderFull(status, state, stateEmoji, stateClass);

    widgetElement.innerHTML = html;
  }

  function renderCompact(status, state, stateEmoji, stateClass) {
    return `
      <div class="openclaw-widget openclaw-widget--compact ${stateClass}">
        <span class="widget-emoji">${stateEmoji}</span>
        <span class="widget-state">${state}</span>
      </div>
    `;
  }

  function renderFull(status, state, stateEmoji, stateClass) {
    const summary = status.summary || {};
    
    return `
      <div class="openclaw-widget ${stateClass}">
        <div class="widget-header">
          <span class="widget-emoji">${stateEmoji}</span>
          <h4>OpenClaw Gateway</h4>
          <span class="widget-badge ${stateClass}">${state}</span>
        </div>
        
        ${status.available && config.showDetails ? `
          <div class="widget-metrics">
            <div class="widget-metric">
              <span class="metric-label">Errors</span>
              <span class="metric-value">${summary.errorCountWindow || 0}</span>
            </div>
            <div class="widget-metric">
              <span class="metric-label">Warnings</span>
              <span class="metric-value">${summary.warnCountWindow || 0}</span>
            </div>
            <div class="widget-metric">
              <span class="metric-label">Alerts</span>
              <span class="metric-value">${summary.alertCountWindow || 0}</span>
            </div>
            ${summary.lastEventAt ? `
              <div class="widget-metric widget-metric--full">
                <span class="metric-label">Last Activity</span>
                <span class="metric-value">${formatTimestamp(summary.lastEventAt)}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        ${status.error ? `
          <div class="widget-error">
            ⚠️ ${status.error}
          </div>
        ` : ''}
        
        ${!status.available && !status.error ? `
          <div class="widget-message">
            No watchdog activity detected
          </div>
        ` : ''}
        
        <div class="widget-footer">
          <span class="widget-timestamp">Updated: ${formatTimestamp(status.timestamp)}</span>
        </div>
      </div>
    `;
  }

  function getHealthState(status) {
    if (!status.ok || status.error) return 'ERROR';
    if (!status.available) return 'UNKNOWN';
    
    const summary = status.summary || {};
    const errors = summary.errorCountWindow || 0;
    const state = summary.state || 'unknown';
    
    if (state === 'degraded' || errors > 3) return 'DEGRADED';
    if (errors > 0) return 'WARNING';
    return 'HEALTHY';
  }

  function getStateEmoji(state) {
    const emojiMap = {
      'HEALTHY': '✅',
      'WARNING': '⚠️',
      'DEGRADED': '🟠',
      'ERROR': '❌',
      'UNKNOWN': '❔',
    };
    return emojiMap[state] || '❔';
  }

  function formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  }

  function destroy() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    currentStatus = null;
  }

  // Expose public API
  window.OpenClawWidget = {
    init: initOpenClawWidget,
    refresh: fetchStatus,
    destroy,
    getStatus: () => currentStatus,
  };

})(window);

// Auto-initialize if data attributes are present
document.addEventListener('DOMContentLoaded', function() {
  const widgetEl = document.getElementById('openclaw-health-widget');
  if (widgetEl && widgetEl.dataset.autoInit !== 'false') {
    const config = {
      apiUrl: widgetEl.dataset.apiUrl || 'https://api.pvabazaar.org',
      refreshInterval: parseInt(widgetEl.dataset.refreshInterval) || 60000,
      showDetails: widgetEl.dataset.showDetails !== 'false',
      compact: widgetEl.dataset.compact === 'true',
    };
    window.OpenClawWidget.init(config);
  }
});
