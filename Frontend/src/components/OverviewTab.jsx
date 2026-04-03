import { useEffect, useState } from 'react';
import { apiGet, fetchTransactions } from '../lib/api';
import { createLogger } from '../lib/logger';
import './OverviewTab.css';

const logger = createLogger('OverviewTab');

export default function OverviewTab() {
  const [metrics, setMetrics] = useState({
    admins: 0,
    users: 0,
    artifacts: 0,
    orders: 0,
    transactions: 0,
    loading: true,
  });

  useEffect(() => {
    loadOverviewMetrics();
  }, []);

  async function loadOverviewMetrics() {
    try {
      // Fetch all metrics in parallel
      const [adminResp, usersResp, artifactsResp, ordersResp, txResp] = await Promise.all([
        apiGet('/admin/stats').catch(() => ({})),
        apiGet('/users').catch(() => ({})),
        apiGet('/items').catch(() => ({})),
        apiGet('/orders').catch(() => ({})),
        fetchTransactions(100).catch(() => []),
      ]);

      setMetrics({
        admins: adminResp?.adminCount || 0,
        users: Array.isArray(usersResp?.users) ? usersResp.users.length : usersResp?.count || 0,
        artifacts: Array.isArray(artifactsResp?.items) ? artifactsResp.items.length : artifactsResp?.count || 0,
        orders: Array.isArray(ordersResp?.orders) ? ordersResp.orders.length : ordersResp?.count || 0,
        transactions: Array.isArray(txResp) ? txResp.length : 0,
        loading: false,
      });
    } catch (error) {
      logger.error('Failed to load overview metrics', error);
      setMetrics(m => ({ ...m, loading: false }));
    }
  }

  const features = [
    {
      id: 'orders',
      title: '📦 Orders Management',
      description: 'View and manage all marketplace orders in one place',
      status: metrics.orders > 0 ? 'active' : 'ready',
      link: '#/admin?tab=orders',
      statsLabel: `${metrics.orders} orders`,
    },
    {
      id: 'transactions',
      title: '💱 Transaction Feed',
      description: 'Track all buy/sell activity and marketplace transactions',
      status: metrics.transactions > 0 ? 'active' : 'ready',
      link: '#/admin?tab=transactions',
      statsLabel: `${metrics.transactions} transactions`,
    },
    {
      id: 'dashboard',
      title: '📊 Dashboard',
      description: 'Business oversight with metrics and recent activity',
      status: 'active',
      link: '#/admin?tab=dashboard',
      statsLabel: 'Quick overview',
    },
    {
      id: 'users',
      title: '👥 Users Management',
      description: 'View and manage all registered users',
      status: metrics.users > 0 ? 'active' : 'ready',
      link: '#/admin?tab=users',
      statsLabel: `${metrics.users} users`,
    },
    {
      id: 'archive',
      title: '📚 Archive Library',
      description: 'Access the archive and lore entries',
      status: 'active',
      link: '#/admin?tab=archive',
      statsLabel: 'Content vault',
    },
    {
      id: 'marketplace',
      title: '🛍️ Marketplace',
      description: 'Monitor marketplace activity and listings',
      status: 'active',
      link: '#/admin?tab=marketplace',
      statsLabel: `${metrics.artifacts} artifacts`,
    },
  ];

  const systemStatus = [
    {
      name: 'Admin Access',
      status: metrics.admins > 0 ? 'operational' : 'pending setup',
      details: `${metrics.admins} admin account(s) configured`,
    },
    {
      name: 'User System',
      status: metrics.users > 0 ? 'operational' : 'ready',
      details: `${metrics.users} total users registered`,
    },
    {
      name: 'Marketplace',
      status: metrics.artifacts > 0 ? 'operational' : 'ready',
      details: `${metrics.artifacts} artifacts available`,
    },
    {
      name: 'Order Processing',
      status: metrics.orders > 0 ? 'operational' : 'ready',
      details: `${metrics.orders} orders in system`,
    },
    {
      name: 'Transaction Tracking',
      status: metrics.transactions > 0 ? 'operational' : 'ready',
      details: `${metrics.transactions} transactions recorded`,
    },
  ];

  if (metrics.loading) {
    return (
      <div className="admin-tab-container">
        <h2>🔄 Loading Overview...</h2>
      </div>
    );
  }

  return (
    <div className="admin-tab-container overview-tab">
      <h1>🎯 Admin Overview</h1>
      <p className="tab-description">Welcome to your 3PL dashboard. Monitor all critical business operations from here.</p>

      {/* System Status Section */}
      <section className="overview-section">
        <h2>System Status</h2>
        <div className="status-grid">
          {systemStatus.map(item => (
            <div key={item.name} className="status-card">
              <div className="status-header">
                <h3>{item.name}</h3>
                <span className={`status-badge status-${item.status.replace(/\s+/g, '-')}`}>
                  {item.status}
                </span>
              </div>
              <p className="status-details">{item.details}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Checklist Section */}
      <section className="overview-section">
        <h2>Quick Access - New Features</h2>
        <p className="section-description">All new admin tools are ready to use. Click any to jump there.</p>
        <div className="features-grid">
          {features.map(feature => (
            <a key={feature.id} href={feature.link} className="feature-card">
              <div className="feature-header">
                <h3>{feature.title}</h3>
                <span className={`feature-status ${feature.status}`}>{feature.status}</span>
              </div>
              <p>{feature.description}</p>
              <div className="feature-stats">{feature.statsLabel}</div>
            </a>
          ))}
        </div>
      </section>

      {/* What's New Section */}
      <section className="overview-section">
        <h2>🚀 What's New</h2>
        <ul className="new-features-list">
          <li><strong>Orders Tab:</strong> Unified order management interface within admin shell</li>
          <li><strong>Transactions Tab:</strong> Complete transaction history and activity feed</li>
          <li><strong>Dashboard Enhancement:</strong> Business metrics with real-time transaction previews</li>
          <li><strong>Session Management:</strong> Improved admin session handling and security</li>
          <li><strong>Keyboard Shortcuts:</strong> Alt+1-9 for quick navigation between tabs</li>
          <li><strong>Admin-Only Access:</strong> Restricted dashboard for authorized personnel only</li>
        </ul>
      </section>

      {/* Admin Tools Section */}
      <section className="overview-section">
        <h2>⚙️ Admin Tools</h2>
        <div className="tools-grid">
          <a href="#/admin?tab=users" className="tool-button">
            <span>👥 Manage Users</span>
            <small>View and manage all registered users</small>
          </a>
          <a href="#/admin?tab=marketplace" className="tool-button">
            <span>🛍️ View Marketplace</span>
            <small>Monitor all artifacts and listings</small>
          </a>
          <a href="#/admin?tab=orders" className="tool-button">
            <span>📦 View Orders</span>
            <small>Check order status and history</small>
          </a>
          <a href="#/admin?tab=transactions" className="tool-button">
            <span>💱 View Transactions</span>
            <small>Monitor all marketplace transactions</small>
          </a>
          <a href="#/admin?tab=payouts" className="tool-button">
            <span>💰 Payout Settings</span>
            <small>Configure payout preferences</small>
          </a>
          <a href="#/admin?tab=settings" className="tool-button">
            <span>⚙️ Admin Settings</span>
            <small>Configure admin preferences</small>
          </a>
        </div>
      </section>

      {/* Stats Summary */}
      <section className="overview-section stats-summary">
        <h2>📈 Summary</h2>
        <div className="summary-grid">
          <div className="summary-stat">
            <span className="stat-number">{metrics.admins}</span>
            <span className="stat-label">Admins</span>
          </div>
          <div className="summary-stat">
            <span className="stat-number">{metrics.users}</span>
            <span className="stat-label">Users</span>
          </div>
          <div className="summary-stat">
            <span className="stat-number">{metrics.artifacts}</span>
            <span className="stat-label">Artifacts</span>
          </div>
          <div className="summary-stat">
            <span className="stat-number">{metrics.orders}</span>
            <span className="stat-label">Orders</span>
          </div>
          <div className="summary-stat">
            <span className="stat-number">{metrics.transactions}</span>
            <span className="stat-label">Transactions</span>
          </div>
        </div>
      </section>
    </div>
  );
}
