/**
 * HealthTab
 *
 * PURPOSE: System health monitoring and OpenClaw integration
 *
 * FEATURES:
 * - View system health status
 * - Monitor OpenClaw watchdog
 * - Check API connectivity
 * - View recent events
 * - Test event dispatch
 * - View connection metrics
 *
 * API ENDPOINTS USED:
 * - GET /api/health - System health
 * - GET /api/openclaw/status - OpenClaw status
 * - GET /api/openclaw/recent-events - Recent events
 * - POST /api/openclaw/dispatch - Test event dispatch
 * - GET /api/openclaw/metrics - Prometheus metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';
import { ENV } from '../config/env';
import { createLogger } from '../lib/logger';
import LoadingSpinner, { LoadingDots } from '../components/LoadingSpinner.jsx';
import './HealthTab.css';

const logger = createLogger('HealthTab');

const HEALTH_ATLAS_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/archive', label: 'Archive' },
  { to: '/recovery', label: 'Recovery' },
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/settings', label: 'Settings' },
  { to: '/admin', label: 'Admin' },
];

export default function HealthTab() {
  const [connectionStatus, setConnectionStatus] = useState({
    loading: true,
    checkedAt: null,
    results: {},
  });
  const [openclawStatus, setOpenclawStatus] = useState(null);
  const [recentEvents, setRecentEvents] = useState({ data: null, loading: false, error: null });
  const [dispatchTest, setDispatchTest] = useState({ loading: false, message: '' });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const formatWatchdogMessage = useCallback((response) => {
    if (!response || response.ok === false) {
      return 'OpenClaw request failed';
    }
    // /status response shape: { configured, mode, message, queue }
    if (response.mode || response.queue !== undefined) {
      const mode = response.mode || 'queue-only';
      const pending = response.queue?.pending ?? '?';
      const stale = response.queue?.stale ?? 0;
      const detail = stale > 0 ? `, stale=${stale}` : '';
      return `${mode} — pending=${pending}${detail}${response.message ? ` · ${response.message}` : ''}`;
    }
    // /watchdog-status response shape: { available, summary }
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

  const runHealthCheck = useCallback(async () => {
    setConnectionStatus((prev) => ({ ...prev, loading: true }));
    const results = {};
    const endpoints = [
      { key: 'health', url: '/health', label: 'Health Check' },
      { key: 'openclawStatus', url: '/openclaw/status', label: 'OpenClaw Status' },
      { key: 'openclawEvents', url: '/openclaw/recent-events?limit=5', label: 'OpenClaw Events' },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await apiGet(endpoint.url);
        const derivedMessage =
          endpoint.key === 'openclawStatus' ? formatWatchdogMessage(response) : 'Connected';
        results[endpoint.key] = {
          ok: response.ok !== false,
          status: response.ok !== false ? 'ok' : 'error',
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

    setConnectionStatus({
      loading: false,
      checkedAt: new Date().toLocaleString(),
      results,
    });
  }, [formatWatchdogMessage]);

  const loadRecentEvents = async () => {
    setRecentEvents({ data: null, loading: true, error: null });
    try {
      const response = await apiGet('/openclaw/recent-events?limit=10');
      if (response.ok && Array.isArray(response.events)) {
        setRecentEvents({ data: response.events, loading: false, error: null });
      } else {
        setRecentEvents({
          data: null,
          loading: false,
          error: response.error || 'Failed to load events',
        });
      }
    } catch (err) {
      logger.error('Failed to load recent events', err);
      setRecentEvents({ data: null, loading: false, error: err.message });
    }
  };

  const handleTestDispatch = async () => {
    setDispatchTest({ loading: true, message: '' });
    try {
      const response = await apiPost('/openclaw/dispatch', {
        event: 'pvabazaar.test.manual',
        message: 'Manual test dispatch from admin panel',
        metadata: {
          source: 'admin-health-tab',
          timestamp: new Date().toISOString(),
        },
      });

      if (response.ok) {
        setDispatchTest({
          loading: false,
          message: '✅ Test event dispatched successfully!',
        });
        setTimeout(() => loadRecentEvents(), 1000); // Reload events after dispatch
      } else {
        setDispatchTest({
          loading: false,
          message: `❌ Dispatch failed: ${response.error || 'Unknown error'}`,
        });
      }
    } catch (err) {
      logger.error('Failed to dispatch test event', err);
      setDispatchTest({ loading: false, message: `❌ Error: ${err.message}` });
    }

    setTimeout(() => setDispatchTest({ loading: false, message: '' }), 5000);
  };

  useEffect(() => {
    runHealthCheck();
    loadRecentEvents();
  }, [runHealthCheck]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      runHealthCheck();
      loadRecentEvents();
    }, 60000); // Auto-refresh every 60 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, runHealthCheck]);

  const getOverallStatus = () => {
    if (connectionStatus.loading) return 'loading';
    const results = Object.values(connectionStatus.results || {});
    if (!results.length) return 'unknown';
    const failedCount = results.filter((r) => !r.ok).length;
    if (failedCount === 0) return 'healthy';
    if (failedCount === results.length) return 'error';
    return 'degraded';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="health-tab" role="tabpanel" id="health-panel">
      <div className="tab-header">
        <h2>💚 System Health</h2>
        <p className="tab-description">
          Monitor system health, API connectivity, and OpenClaw event dispatching.
        </p>
      </div>

      <section className="health-atlas" aria-label="Health atlas">
        <h3>Operations atlas</h3>
        <p className="health-atlas__copy">
          Move between the live system, private controls, and recovery without leaving the flow.
        </p>
        <div className="health-atlas__links">
          {HEALTH_ATLAS_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="health-atlas__link">
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="health-controls">
        <button
          onClick={runHealthCheck}
          className="refresh-btn"
          disabled={connectionStatus.loading}
        >
          {connectionStatus.loading ? '⏳ Checking...' : '🔄 Refresh'}
        </button>
        <label className="auto-refresh-toggle">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <span>Auto-refresh (60s)</span>
        </label>
      </div>

      <div className={`health-overview status-${overallStatus}`}>
        <div className="health-icon">
          {overallStatus === 'healthy' && '✅'}
          {overallStatus === 'degraded' && '⚠️'}
          {overallStatus === 'error' && '❌'}
          {overallStatus === 'loading' && '⏳'}
          {overallStatus === 'unknown' && '❓'}
        </div>
        <div className="health-status">
          <h3>
            {overallStatus === 'healthy' && 'All Systems Operational'}
            {overallStatus === 'degraded' && 'Some Systems Degraded'}
            {overallStatus === 'error' && 'System Error'}
            {overallStatus === 'loading' && 'Checking...'}
            {overallStatus === 'unknown' && 'Status Unknown'}
          </h3>
          {connectionStatus.checkedAt && (
            <p className="last-check">Last checked: {connectionStatus.checkedAt}</p>
          )}
        </div>
      </div>

      <div className="health-grid">
        <div className="health-card">
          <h3>🔗 API Endpoints</h3>
          <div className="endpoint-list">
            {Object.entries(connectionStatus.results).map(([key, result]) => (
              <div key={key} className={`endpoint-item status-${result.ok ? 'ok' : 'error'}`}>
                <span className="endpoint-dot"></span>
                <div className="endpoint-info">
                  <strong>{result.label}</strong>
                  <span className="endpoint-message">{result.message}</span>
                </div>
                <span className={`endpoint-badge ${result.ok ? 'ok' : 'error'}`}>
                  {result.ok ? 'OK' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="health-card">
          <h3>🧪 Test Dispatch</h3>
          <p className="card-description">
            Manually dispatch a test event to OpenClaw to verify event processing.
          </p>
          <button
            onClick={handleTestDispatch}
            className="test-dispatch-btn"
            disabled={dispatchTest.loading}
          >
            {dispatchTest.loading ? (
              <LoadingDots inline={true} label="Dispatching..." />
            ) : (
              '🚀 Dispatch Test Event'
            )}
          </button>
          {dispatchTest.message && (
            <div
              className={`dispatch-message ${dispatchTest.message.includes('✅') ? 'success' : 'error'}`}
            >
              {dispatchTest.message}
            </div>
          )}
        </div>

        <div className="health-card events-card">
          <h3>📜 Recent Events</h3>
          {recentEvents.loading ? (
            <LoadingSpinner size="small" />
          ) : recentEvents.error ? (
            <div className="error-message">{recentEvents.error}</div>
          ) : recentEvents.data && recentEvents.data.length > 0 ? (
            <div className="events-list">
              {recentEvents.data.map((event, index) => (
                <div key={index} className="event-item">
                  <div className="event-header">
                    <span className={`event-level level-${event.level || 'info'}`}>
                      {event.level || 'info'}
                    </span>
                    <span className="event-time">
                      {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'Unknown'}
                    </span>
                  </div>
                  <div className="event-message">{event.message || event.event}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">No recent events.</p>
          )}
        </div>
      </div>

      <div className="info-box">
        <h3>📖 About Health Monitoring</h3>
        <p>
          This tab monitors system health and OpenClaw event dispatching. OpenClaw is a watchdog
          system that monitors events, logs alerts, and provides automation hooks.
        </p>
        <ul className="info-list">
          <li>
            <strong>Health Check</strong>: Verifies API connectivity and database status
          </li>
          <li>
            <strong>OpenClaw Status</strong>: Shows watchdog state, errors, and alerts
          </li>
          <li>
            <strong>Recent Events</strong>: Displays last 10 dispatched events
          </li>
          <li>
            <strong>Test Dispatch</strong>: Manually trigger a test event
          </li>
        </ul>
      </div>
    </div>
  );
}
