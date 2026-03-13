import React, { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';
import { createLogger } from '../lib/logger';
import './DashboardTab.css';

/**
 * DashboardTab
 * 
 * Comprehensive overview of the entire PVA Bazaar admin system.
 * Aggregates data from all subsystems for at-a-glance monitoring.
 */

const logger = createLogger('DashboardTab');

export default function DashboardTab({ onNavigateTab }) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    users: { total: 0, active: 0, admins: 0, newThisMonth: 0, loading: true },
    items: { total: 0, published: 0, draft: 0, loading: true },
    archive: { total: 0, categories: {}, loading: true },
    health: { status: 'unknown', timestamp: null, loading: true },
    cloudStorage: { files: 0, totalSize: 0, loading: true },
  });
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load data from all endpoints in parallel
      const [usersResponse, itemsResponse, archiveResponse, healthResponse, cloudResponse] = await Promise.allSettled([
        apiGet('/admin/stats'),
        apiGet('/items').catch(() => ({ ok: false })),
        apiGet('/archive').catch(() => ({ ok: false })),
        apiGet('/health').catch(() => ({ ok: false })),
        apiGet('/admin/cloud-storage').catch(() => ({ ok: false })),
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
      });

      setLastRefresh(new Date());
    } catch (err) {
      logger.error('Failed to load dashboard data', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="dashboard-tab">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>📊 Operations Dashboard</h2>
          <p>Live overview of platform health, content, and admin activity.</p>
        </div>
        <div className="header-actions">
          <span className="last-refresh">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </span>
          <button onClick={loadDashboardData} className="btn-refresh" disabled={loading}>
            {loading ? '⏳ Loading…' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          ⚠️ Unable to load dashboard data: {error}
        </div>
      )}

      {/* System Health Status */}
      <div className="health-banner" style={{ borderLeftColor: getStatusColor(dashboardData.health.status) }}>
        <div className="health-indicator">
          <span className="health-icon" style={{ color: getStatusColor(dashboardData.health.status) }}>
            {dashboardData.health.status === 'healthy' ? '✅' : dashboardData.health.status === 'error' ? '❌' : '⚠️'}
          </span>
          <div className="health-text">
            <strong>System status: {dashboardData.health.status}</strong>
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
              Open Users →
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
          </div>
          <div className="metric-footer">
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigateTab?.('marketplace'); }}>
              Open Marketplace →
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
              Open Archive →
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
              Open Storage →
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
            <span className="action-label">Open Users</span>
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
    </div>
  );
}
