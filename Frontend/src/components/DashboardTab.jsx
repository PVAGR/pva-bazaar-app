import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { createLogger } from '../lib/logger';
import './DashboardTab.css';

/**
 * DashboardTab
 * 
 * Comprehensive overview of the entire PVA Bazaar admin system.
 * Aggregates data from all subsystems for at-a-glance monitoring.
 */

const logger = createLogger('DashboardTab');
const INCIDENT_DISMISS_STORAGE_KEY = 'admin-dashboard-dismissed-incidents-v1';

export default function DashboardTab({ onNavigateTab }) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    users: { total: 0, active: 0, admins: 0, newThisMonth: 0, loading: true },
    items: { total: 0, published: 0, draft: 0, loading: true },
    archive: { total: 0, categories: {}, loading: true },
    health: { status: 'unknown', timestamp: null, loading: true },
    cloudStorage: { files: 0, totalSize: 0, loading: true },
    ops: {
      openclawReachable: false,
      staleQueue: 0,
      heartbeatAgeMinutes: null,
      solanaReady: false,
      anomalyCount: 0,
      loading: true,
    },
  });
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [recovering, setRecovering] = useState(false);
  const [opsActionResult, setOpsActionResult] = useState(null);
  const [deployStatus, setDeployStatus] = useState({
    loading: true,
    error: '',
    updatedAt: null,
    runs: [],
    lastSuccessfulDeploy: null,
    latestFailure: null,
  });
  const [incidentFeed, setIncidentFeed] = useState({
    loading: true,
    error: '',
    updatedAt: null,
    items: [],
  });
  const [criticalOnlyIncidents, setCriticalOnlyIncidents] = useState(false);
  const [dismissedIncidentIds, setDismissedIncidentIds] = useState(() => {
    try {
      const raw = localStorage.getItem(INCIDENT_DISMISS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (_err) {
      return new Set();
    }
  });

  useEffect(() => {
    loadDashboardData();
    loadDeploymentStatus();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      loadDeploymentStatus();
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load data from all endpoints in parallel
      const [
        usersResponse,
        itemsResponse,
        archiveResponse,
        healthResponse,
        cloudResponse,
        openclawStatusResponse,
        openclawQueueResponse,
        solanaReadinessResponse,
      ] = await Promise.allSettled([
        apiGet('/admin/stats'),
        apiGet('/items').catch(() => ({ ok: false })),
        apiGet('/archive').catch(() => ({ ok: false })),
        apiGet('/health').catch(() => ({ ok: false })),
        apiGet('/admin/cloud-storage').catch(() => ({ ok: false })),
        apiGet('/openclaw/status').catch(() => ({ ok: false })),
        apiGet('/openclaw/queue-stats').catch(() => ({ ok: false })),
        apiGet('/solana/direct-transfer-readiness').catch(() => ({ ok: false })),
      ]);

      // Process users data
      const usersData = usersResponse.status === 'fulfilled' && usersResponse.value.ok
        ? {
            total: usersResponse.value.stats?.totalUsers || 0,
            active: usersResponse.value.stats?.activeUsers || 0,
            admins: usersResponse.value.stats?.adminUsers || 0,
            newThisMonth: usersResponse.value.stats?.newUsersThisMonth || 0,
            loading: false,
          }
        : { total: 0, active: 0, admins: 0, newThisMonth: 0, loading: false };

      // Process items data
      const itemsData = itemsResponse.status === 'fulfilled' && itemsResponse.value.ok
        ? {
            total: itemsResponse.value.items?.length || 0,
            published: itemsResponse.value.items?.filter(i => i.status === 'published').length || 0,
            draft: itemsResponse.value.items?.filter(i => i.status === 'draft').length || 0,
            loading: false,
          }
        : { total: 0, published: 0, draft: 0, loading: false };

      // Process archive data
      const archiveData = archiveResponse.status === 'fulfilled' && archiveResponse.value.ok
        ? {
            total: archiveResponse.value.items?.length || 0,
            categories: archiveResponse.value.items?.reduce((acc, entry) => {
              acc[entry.category] = (acc[entry.category] || 0) + 1;
              return acc;
            }, {}) || {},
            loading: false,
          }
        : { total: 0, categories: {}, loading: false };

      // Process health data
      const healthData = healthResponse.status === 'fulfilled' && healthResponse.value.ok
        ? {
            status: 'healthy',
            timestamp: healthResponse.value.timestamp,
            loading: false,
          }
        : { status: 'error', timestamp: null, loading: false };

      // Process cloud storage data
      const cloudData = cloudResponse.status === 'fulfilled' && cloudResponse.value.ok
        ? {
            files: cloudResponse.value.files || 0,
            totalSize: cloudResponse.value.totalSize || 0,
            configuredProviders: cloudResponse.value.configuredProviders || 0,
            loading: false,
          }
        : { files: 0, totalSize: 0, configuredProviders: 0, loading: false };

      const heartbeatAt = openclawStatusResponse.status === 'fulfilled'
        ? openclawStatusResponse.value?.worker?.heartbeatAt
        : null;
      const heartbeatAgeMinutes = heartbeatAt
        ? Math.max(Math.round((Date.now() - new Date(heartbeatAt).getTime()) / 60000), 0)
        : null;

      const openclawReachable = openclawStatusResponse.status === 'fulfilled'
        && openclawStatusResponse.value?.reachable === true;
      const staleQueue = openclawQueueResponse.status === 'fulfilled'
        ? Number(openclawQueueResponse.value?.staleOutbound || 0)
        : 0;
      const solanaReady = solanaReadinessResponse.status === 'fulfilled'
        && solanaReadinessResponse.value?.readiness?.ready === true;

      const anomalyCount = [
        !openclawReachable,
        staleQueue > 0,
        heartbeatAgeMinutes !== null && heartbeatAgeMinutes > 4,
        !solanaReady,
      ].filter(Boolean).length;

      const opsData = {
        openclawReachable,
        staleQueue,
        heartbeatAgeMinutes,
        solanaReady,
        anomalyCount,
        loading: false,
      };

      setDashboardData({
        users: usersData,
        items: {
          ...itemsData,
          // Prefer artifact counts from stats endpoint (avoids loading all items)
          total: usersResponse.value?.stats?.totalArtifacts ?? itemsData.total,
          published: usersResponse.value?.stats?.publishedArtifacts ?? itemsData.published,
          draft: usersResponse.value?.stats?.draftArtifacts ?? itemsData.draft,
        },
        archive: archiveData,
        health: healthData,
        cloudStorage: cloudData,
        ops: opsData,
      });

      setLastRefresh(new Date());
    } catch (err) {
      logger.error('Failed to load dashboard data', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDeploymentStatus = async () => {
    setDeployStatus((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await fetch('https://api.github.com/repos/PVAGR/pva-bazaar-app/actions/runs?branch=main&per_page=20', {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
        },
      });

      if (!res.ok) {
        throw new Error(`GitHub API ${res.status}`);
      }

      const payload = await res.json();
      const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];

      const importantNames = [
        'Deploy Frontend to GitHub Pages',
        'Deploy Backend Live',
        'Frontend Tests & Deploy',
        'Backend Tests & Security',
        'Live Readiness Check',
        'OpenClaw Integration Test',
      ];

      const mapped = runs
        .filter((run) => importantNames.includes(run?.name))
        .slice(0, 8)
        .map((run) => ({
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          htmlUrl: run.html_url,
          headSha: run.head_sha,
          updatedAt: run.updated_at,
          displayTitle: run.display_title || '',
          headCommitMessage: String(run?.head_commit?.message || '').split('\n')[0],
        }));

      const latestSuccessfulDeploy = [...mapped]
        .filter((run) => run.name.toLowerCase().includes('deploy') && run.conclusion === 'success')
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] || null;

      const latestFailure = [...mapped]
        .filter((run) => run.conclusion === 'failure')
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] || null;

      setDeployStatus({
        loading: false,
        error: '',
        updatedAt: new Date().toISOString(),
        runs: mapped,
        lastSuccessfulDeploy: latestSuccessfulDeploy,
        latestFailure,
      });

      await loadIncidentFeed(mapped);
    } catch (err) {
      setDeployStatus((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load workflow status',
      }));
      setIncidentFeed((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load incident feed',
      }));
    }
  };

  const loadIncidentFeed = async (workflowRuns = []) => {
    setIncidentFeed((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const eventsData = await apiGet('/openclaw/recent-events?limit=25').catch(() => ({ ok: false, events: [] }));
      const openclawEvents = Array.isArray(eventsData?.events) ? eventsData.events : [];

      const openclawIncidents = openclawEvents
        .filter((evt) => {
          const level = String(evt?.level || '').toLowerCase();
          const type = String(evt?.type || '').toLowerCase();
          const msg = String(evt?.message || '').toLowerCase();
          return (
            level === 'error'
            || level === 'alert'
            || type.includes('recovery')
            || type.includes('health-failure')
            || msg.includes('recover')
            || msg.includes('health check failed')
          );
        })
        .map((evt, idx) => ({
          id: `oc-${evt.id || idx}`,
          source: 'openclaw',
          title: evt.type || 'OpenClaw event',
          detail: evt.message || 'OpenClaw event',
          level: String(evt.level || 'INFO').toLowerCase(),
          at: evt.timestamp || null,
          href: null,
        }));

      const workflowIncidents = workflowRuns
        .filter((run) => run.conclusion === 'failure' || run.status === 'in_progress' || run.status === 'queued')
        .map((run) => ({
          id: `wf-${run.id}`,
          source: 'workflow',
          title: run.name,
          detail: run.conclusion === 'failure'
            ? (run.displayTitle || run.headCommitMessage || 'Workflow failed')
            : `Workflow ${run.status}`,
          level: run.conclusion === 'failure' ? 'error' : 'info',
          at: run.updatedAt || null,
          href: run.htmlUrl,
        }));

      const merged = [...workflowIncidents, ...openclawIncidents]
        .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
        .slice(0, 12);

      setIncidentFeed({
        loading: false,
        error: '',
        updatedAt: new Date().toISOString(),
        items: merged,
      });
    } catch (err) {
      setIncidentFeed((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load incident feed',
      }));
    }
  };

  const refreshAll = async () => {
    await Promise.allSettled([
      loadDashboardData(),
      loadDeploymentStatus(),
    ]);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getRunTone = (run) => {
    if (run?.status === 'in_progress' || run?.status === 'queued' || run?.status === 'waiting') {
      return 'run-tone-progress';
    }
    if (run?.conclusion === 'success') {
      return 'run-tone-success';
    }
    if (run?.conclusion === 'failure' || run?.conclusion === 'cancelled' || run?.conclusion === 'timed_out') {
      return 'run-tone-failure';
    }
    return 'run-tone-neutral';
  };

  const latestFrontendDeploy = deployStatus.runs
    .filter((run) => run.name === 'Deploy Frontend to GitHub Pages')
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] || null;

  const latestBackendDeploy = deployStatus.runs
    .filter((run) => run.name === 'Deploy Backend Live')
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] || null;

  const deployPipelinesHealthy = [latestFrontendDeploy, latestBackendDeploy]
    .filter(Boolean)
    .every((run) => run.conclusion === 'success' || run.status === 'in_progress');

  const openclawHealthy = dashboardData.ops.openclawReachable
    && dashboardData.ops.staleQueue === 0
    && ((dashboardData.ops.heartbeatAgeMinutes ?? 0) <= 4);

  const solanaReadyForOps = dashboardData.ops.solanaReady;
  const operatorReady = deployPipelinesHealthy && openclawHealthy && solanaReadyForOps;

  const visibleIncidents = (criticalOnlyIncidents
    ? incidentFeed.items.filter((item) => item.level === 'error' || item.level === 'alert')
    : incidentFeed.items
  ).filter((item) => !dismissedIncidentIds.has(item.id));

  const dismissIncident = (incidentId) => {
    setDismissedIncidentIds((prev) => {
      const next = new Set(prev);
      next.add(incidentId);
      localStorage.setItem(INCIDENT_DISMISS_STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const clearDismissedIncidents = () => {
    setDismissedIncidentIds(new Set());
    localStorage.removeItem(INCIDENT_DISMISS_STORAGE_KEY);
  };

  const runOpsRecovery = async () => {
    setRecovering(true);
    setOpsActionResult(null);
    try {
      const result = await apiPost('/openclaw/recover', {});
      if (result?.ok) {
        const staleBefore = result?.queue?.before?.staleOutbound ?? 0;
        const staleAfter = result?.queue?.after?.staleOutbound ?? 0;
        setOpsActionResult({
          ok: true,
          text: `${result.message || 'Recovery complete'} · stale ${staleBefore} -> ${staleAfter}`,
        });
      } else {
        setOpsActionResult({ ok: false, text: result?.message || 'Recovery failed' });
      }
      await loadDashboardData();
    } catch (err) {
      setOpsActionResult({ ok: false, text: err?.response?.data?.message || err.message || 'Recovery failed' });
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="dashboard-tab">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>📊 Admin Dashboard</h2>
          <p>Real-time overview of PVA Bazaar system status and metrics</p>
        </div>
        <div className="header-actions">
          <span className="last-refresh">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </span>
          <button onClick={refreshAll} className="btn-refresh" disabled={loading || deployStatus.loading}>
            {loading || deployStatus.loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ Error loading dashboard: {error}
        </div>
      )}

      {/* System Health Status */}
      <div className="health-banner" style={{ borderLeftColor: getStatusColor(dashboardData.health.status) }}>
        <div className="health-indicator">
          <span className="health-icon" style={{ color: getStatusColor(dashboardData.health.status) }}>
            {dashboardData.health.status === 'healthy' ? '✅' : dashboardData.health.status === 'error' ? '❌' : '⚠️'}
          </span>
          <div className="health-text">
            <strong>System Status: {dashboardData.health.status}</strong>
            {dashboardData.health.timestamp && (
              <span className="health-time">
                Checked: {new Date(dashboardData.health.timestamp).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        {/* Users Metrics */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">👥</span>
            <h3>Users</h3>
          </div>
          <div className="metric-body">
            <div className="metric-primary">
              <span className="metric-value">{dashboardData.users.total}</span>
              <span className="metric-label">Total Users</span>
            </div>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-label">Active</span>
                <span className="stat-value">{dashboardData.users.active}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Admins</span>
                <span className="stat-value">{dashboardData.users.admins}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">New (30d)</span>
                <span className="stat-value stat-highlight">{dashboardData.users.newThisMonth}</span>
              </div>
            </div>

          </div>
          <div className="metric-footer">
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateTab?.('users'); }}>
              View Details →
            </a>
          </div>
        </div>

        {/* Marketplace Metrics */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🛒</span>
            <h3>Marketplace</h3>
          </div>
          <div className="metric-body">
            <div className="metric-primary">
              <span className="metric-value">{dashboardData.items.total}</span>
              <span className="metric-label">Total Items</span>
            </div>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-label">Published</span>
                <span className="stat-value stat-success">{dashboardData.items.published}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Draft</span>
                <span className="stat-value">{dashboardData.items.draft}</span>
              </div>
            </div>
            <div className="ops-actions-row">
              <button
                className="btn-refresh ops-recover-btn"
                type="button"
                onClick={runOpsRecovery}
                disabled={recovering}
              >
                {recovering ? '🛠️ Recovering...' : '🛠️ Run Recovery'}
              </button>
              {opsActionResult && (
                <span className={`ops-action-result ${opsActionResult.ok ? 'ok' : 'err'}`}>
                  {opsActionResult.text}
                </span>
              )}
            </div>
          </div>
          <div className="metric-footer">
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateTab?.('marketplace'); }}>
              Manage Items →
            </a>
          </div>
        </div>

        {/* Archive Metrics */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">📚</span>
            <h3>Archive</h3>
          </div>
          <div className="metric-body">
            <div className="metric-primary">
              <span className="metric-value">{dashboardData.archive.total}</span>
              <span className="metric-label">Total Entries</span>
            </div>
            {Object.keys(dashboardData.archive.categories).length > 0 && (
              <div className="metric-stats">
                {Object.entries(dashboardData.archive.categories).slice(0, 3).map(([category, count]) => (
                  <div key={category} className="stat-item">
                    <span className="stat-label">{category}</span>
                    <span className="stat-value">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="metric-footer">
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateTab?.('archive'); }}>
              View Archive →
            </a>
          </div>
        </div>

        {/* Cloud Storage Metrics */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">☁️</span>
            <h3>Cloud Storage</h3>
          </div>
          <div className="metric-body">
            <div className="metric-primary">
              <span className="metric-value">{dashboardData.cloudStorage.files}</span>
              <span className="metric-label">Files Stored</span>
            </div>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-label">Providers</span>
                <span className="stat-value">{dashboardData.cloudStorage.configuredProviders} active</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Size</span>
                <span className="stat-value">{formatBytes(dashboardData.cloudStorage.totalSize)}</span>
              </div>
            </div>
          </div>
          <div className="metric-footer">
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateTab?.('cloud'); }}>
              Manage Storage →
            </a>
          </div>
        </div>

        {/* Ops Cockpit */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🛡️</span>
            <h3>Ops Cockpit</h3>
          </div>
          <div className="metric-body">
            <div className="metric-primary">
              <span className="metric-value">{dashboardData.ops.anomalyCount}</span>
              <span className="metric-label">Active Alerts</span>
            </div>
            <div className="metric-stats">
              <div className="stat-item">
                <span className="stat-label">OpenClaw</span>
                <span className={`stat-value ${dashboardData.ops.openclawReachable ? 'stat-success' : 'stat-danger'}`}>
                  {dashboardData.ops.openclawReachable ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Stale Queue</span>
                <span className={`stat-value ${dashboardData.ops.staleQueue > 0 ? 'stat-danger' : 'stat-success'}`}>
                  {dashboardData.ops.staleQueue}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Heartbeat</span>
                <span className={`stat-value ${(dashboardData.ops.heartbeatAgeMinutes ?? 0) > 4 ? 'stat-danger' : 'stat-success'}`}>
                  {dashboardData.ops.heartbeatAgeMinutes == null ? 'n/a' : `${dashboardData.ops.heartbeatAgeMinutes}m`}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Solana Ready</span>
                <span className={`stat-value ${dashboardData.ops.solanaReady ? 'stat-success' : 'stat-danger'}`}>
                  {dashboardData.ops.solanaReady ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
          <div className="metric-footer metric-footer-links">
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateTab?.('openclaw'); }}>
              OpenClaw →
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateTab?.('payouts'); }}>
              Payout Ops →
            </a>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-panel">
        <h3>⚡ Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-card" onClick={() => onNavigateTab?.('users')}>
            <span className="action-icon">👥</span>
            <span className="action-label">Manage Users</span>
          </button>
          <button className="action-card" onClick={() => onNavigateTab?.('marketplace')}>
            <span className="action-icon">➕</span>
            <span className="action-label">Add Marketplace Item</span>
          </button>
          <button className="action-card" onClick={() => onNavigateTab?.('archive')}>
            <span className="action-icon">📝</span>
            <span className="action-label">Create Archive Entry</span>
          </button>
          <button className="action-card" onClick={() => onNavigateTab?.('health')}>
            <span className="action-icon">💚</span>
            <span className="action-label">System Health</span>
          </button>
          <button className="action-card" onClick={() => onNavigateTab?.('openclaw')}>
            <span className="action-icon">🦞</span>
            <span className="action-label">OpenClaw Console</span>
          </button>
          <button className="action-card" onClick={() => onNavigateTab?.('payouts')}>
            <span className="action-icon">💸</span>
            <span className="action-label">Payout Operations</span>
          </button>
          <button className="action-card" onClick={() => onNavigateTab?.('api')}>
            <span className="action-icon">🔗</span>
            <span className="action-label">API Documentation</span>
          </button>
          <button className="action-card" onClick={() => onNavigateTab?.('settings')}>
            <span className="action-icon">⚙️</span>
            <span className="action-label">Settings</span>
          </button>
        </div>
      </div>

      {/* System Information */}
      <div className="system-info-panel">
        <h3>ℹ️ System Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Admin Session</span>
            <span className="info-value">✅ Active</span>
          </div>
          <div className="info-item">
            <span className="info-label">API Connection</span>
            <span className="info-value">
              {dashboardData.health.status === 'healthy' ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Database</span>
            <span className="info-value">
              {dashboardData.health.status === 'healthy' ? '✅ Online' : '⚠️ Unknown'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Last Activity</span>
            <span className="info-value">{lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <div className="system-info-panel deploy-status-panel">
        <div className="deploy-status-head">
          <h3>🚀 Deployment Status</h3>
          <button
            type="button"
            className="btn-refresh deploy-refresh"
            onClick={loadDeploymentStatus}
            disabled={deployStatus.loading}
          >
            {deployStatus.loading ? 'Refreshing...' : 'Refresh Deploy'}
          </button>
        </div>
        <p className="deploy-status-subtitle">
          Live view of key GitHub Actions workflows for branch main.
          {deployStatus.updatedAt ? ` Updated ${new Date(deployStatus.updatedAt).toLocaleTimeString()}.` : ''}
        </p>

        <div className="deploy-badges">
          <div className="deploy-badge success">
            <span className="deploy-badge-label">Last Successful Deploy</span>
            <strong>
              {deployStatus.lastSuccessfulDeploy
                ? `${deployStatus.lastSuccessfulDeploy.name} · ${new Date(deployStatus.lastSuccessfulDeploy.updatedAt).toLocaleTimeString()}`
                : 'No successful deploy in current window'}
            </strong>
          </div>
          <div className="deploy-badge failure">
            <span className="deploy-badge-label">Latest Failure Excerpt</span>
            <strong>
              {deployStatus.latestFailure
                ? `${deployStatus.latestFailure.name} · ${deployStatus.latestFailure.displayTitle || deployStatus.latestFailure.headCommitMessage || 'No details'}`
                : 'No failure detected in tracked workflows'}
            </strong>
          </div>
        </div>

        {deployStatus.error && (
          <div className="deploy-status-error">
            {deployStatus.error}
          </div>
        )}

        {!deployStatus.error && deployStatus.runs.length === 0 && !deployStatus.loading && (
          <div className="deploy-status-empty">No tracked workflows found.</div>
        )}

        {!!deployStatus.runs.length && (
          <div className="deploy-run-list">
            {deployStatus.runs.map((run) => (
              <a
                key={run.id}
                className={`deploy-run-row ${getRunTone(run)}`}
                href={run.htmlUrl}
                target="_blank"
                rel="noreferrer"
              >
                <div className="deploy-run-main">
                  <strong>{run.name}</strong>
                  <span className="deploy-run-meta">SHA {String(run.headSha || '').slice(0, 7)} · {run.updatedAt ? new Date(run.updatedAt).toLocaleTimeString() : 'n/a'}</span>
                </div>
                <span className="deploy-run-badge">
                  {run.status === 'completed' ? (run.conclusion || 'completed') : run.status}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="system-info-panel readiness-panel">
        <h3>✅ Operator Checklist</h3>
        <p className="deploy-status-subtitle">
          Proceed with money-run and payout operations only when all gates are green.
        </p>
        <div className={`readiness-overall ${operatorReady ? 'ready' : 'blocked'}`}>
          {operatorReady ? 'READY FOR OPERATIONS' : 'BLOCKED - INVESTIGATE INCIDENTS'}
        </div>
        <div className="readiness-grid">
          <button
            type="button"
            className={`readiness-item readiness-button ${deployPipelinesHealthy ? 'ok' : 'bad'}`}
            onClick={() => onNavigateTab?.('health')}
          >
            <span>Deploy Pipelines</span>
            <strong>{deployPipelinesHealthy ? 'Green' : 'Not Green'}</strong>
          </button>
          <button
            type="button"
            className={`readiness-item readiness-button ${openclawHealthy ? 'ok' : 'bad'}`}
            onClick={() => onNavigateTab?.('openclaw')}
          >
            <span>OpenClaw Health</span>
            <strong>{openclawHealthy ? 'Healthy' : 'Needs Recovery'}</strong>
          </button>
          <button
            type="button"
            className={`readiness-item readiness-button ${solanaReadyForOps ? 'ok' : 'bad'}`}
            onClick={() => onNavigateTab?.('payouts')}
          >
            <span>Solana Readiness</span>
            <strong>{solanaReadyForOps ? 'Ready' : 'Not Ready'}</strong>
          </button>
        </div>
      </div>

      <div className="system-info-panel incident-timeline-panel">
        <div className="deploy-status-head">
          <h3>🧭 Incident Timeline</h3>
          <div className="incident-head-actions">
            <label className="incident-filter-toggle">
              <input
                type="checkbox"
                checked={criticalOnlyIncidents}
                onChange={(event) => setCriticalOnlyIncidents(event.target.checked)}
              />
              Critical only
            </label>
            <button
              type="button"
              className="btn-refresh deploy-refresh"
              onClick={() => loadIncidentFeed(deployStatus.runs)}
              disabled={incidentFeed.loading}
            >
              {incidentFeed.loading ? 'Refreshing...' : 'Refresh Timeline'}
            </button>
            <button
              type="button"
              className="btn-refresh deploy-refresh"
              onClick={clearDismissedIncidents}
              disabled={dismissedIncidentIds.size === 0}
            >
              Restore Dismissed
            </button>
          </div>
        </div>
        <p className="deploy-status-subtitle">
          Combined stream: workflow failures/progress + OpenClaw recoveries and alerts.
          {incidentFeed.updatedAt ? ` Updated ${new Date(incidentFeed.updatedAt).toLocaleTimeString()}.` : ''}
        </p>

        {incidentFeed.error && (
          <div className="deploy-status-error">{incidentFeed.error}</div>
        )}

        {!incidentFeed.error && !incidentFeed.loading && visibleIncidents.length === 0 && (
          <div className="deploy-status-empty">No incidents in the current activity window.</div>
        )}

        {!!visibleIncidents.length && (
          <div className="incident-list">
            {visibleIncidents.map((item) => {
              return (
                <div key={item.id} className="incident-row">
                  <div className="incident-main">
                    <span className={`incident-level ${item.level === 'error' || item.level === 'alert' ? 'high' : 'info'}`}>
                      {item.source}
                    </span>
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noreferrer" className="incident-link-title">
                        <strong>{item.title}</strong>
                      </a>
                    ) : (
                      <strong>{item.title}</strong>
                    )}
                    <p>{item.detail}</p>
                  </div>
                  <div className="incident-side">
                    <span className="incident-time">{item.at ? new Date(item.at).toLocaleString() : 'n/a'}</span>
                    <button
                      type="button"
                      className="incident-dismiss-btn"
                      onClick={() => dismissIncident(item.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
