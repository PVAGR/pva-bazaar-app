import React, { useState, useEffect } from 'react';
import { apiGet, fetchTransactions } from '../lib/api.js';
import { createLogger } from '../lib/logger.js';
import { getToken } from '../lib/auth.js';
import NavLink from '../components/NavLink.jsx';
import AdminNav from '../components/AdminNav.jsx';
import '../pages/UserDashboard.css';

const logger = createLogger('UserDashboard');
const COMMAND_NOTE_KEY = 'pva-command-center-note';

/**
 * UserDashboard - Public-facing user dashboard
 * 
 * Shows safe, personal data only:
 * - My Orders (user's purchases)
 * - My Items/Artifacts (user's listings)
 * - My Transactions (buy/sell activity)
 * - Marketplace Stats (public aggregates)
 * - Escrow Status (user's escrow transactions)
 * - Sales Dashboard (seller metrics)
 * - Analytics Preview (basic charts)
 * 
 * NO access to:
 * - System administration
 * - Other users' data
 * - Security settings
 * - Financial controls (except personal payouts)
 * - Any harmful operations
 */

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [commandNote, setCommandNote] = useState('');
  const [commandNoteStatus, setCommandNoteStatus] = useState('saved');
  const [dashboardData, setDashboardData] = useState({
    userOrders: [],
    userItems: [],
    userTransactions: [],
    deals: [],
    contacts: [],
    templates: [],
    streams: [],
    marketplaceStats: { totalItems: 0, totalSales: 0 },
    escrowStatus: [],
    salesMetrics: { totalSales: 0, thisMonth: 0, thisWeek: 0 },
    loading: true,
    error: null,
  });

  const hasToken = getToken();

  useEffect(() => {
    if (!hasToken) return;
    loadDashboardData();

    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000); // eslint-disable-line no-undef
    return () => clearInterval(interval); // eslint-disable-line no-undef
  }, [hasToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(COMMAND_NOTE_KEY);
      if (stored) {
        setCommandNote(stored);
      }
    } catch {
      logger.warn('Unable to restore command center note');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(COMMAND_NOTE_KEY, commandNote);
        setCommandNoteStatus('saved');
      } catch {
        setCommandNoteStatus('save-failed');
      }
    }, 300);

    if (commandNoteStatus !== 'typing') {
      setCommandNoteStatus(commandNote ? 'typing' : 'saved');
    }

    return () => clearTimeout(timer);
  }, [commandNote]);

  async function loadDashboardData() {
    try {
      const results = await Promise.allSettled([
        apiGet('/orders/mine').catch(() => ({ error: 'Error loading orders' })),
        apiGet('/items/mine').catch(() => ({ error: 'Error loading items' })),
        fetchTransactions(10).catch(() => []),
        apiGet('/items?limit=100').catch(() => ({})),
        apiGet('/orders/escrow').catch(() => []),
        apiGet('/sales/metrics').catch(() => ({})),
        apiGet('/deals', { params: { limit: 5 } }).catch(() => ({})),
        apiGet('/contacts', { params: { limit: 5 } }).catch(() => ({})),
        apiGet('/templates', { params: { limit: 5 } }).catch(() => ({})),
        apiGet('/streams', { params: { limit: 5 } }).catch(() => ({})),
      ]);

      const [ordersR, itemsR, txR, mpR, escrowR, salesR, dealsR, contactsR, templatesR, streamsR] = results;
      const orderItems = Array.isArray(ordersR.value?.items)
        ? ordersR.value.items
        : Array.isArray(ordersR.value?.orders)
          ? ordersR.value.orders
          : [];
      const txItems = Array.isArray(txR.value)
        ? txR.value
        : Array.isArray(txR.value?.items)
          ? txR.value.items
          : [];
      const escrowItems = Array.isArray(escrowR.value?.items)
        ? escrowR.value.items
        : Array.isArray(escrowR.value)
          ? escrowR.value
          : [];

      setDashboardData({
        userOrders: ordersR.status === 'fulfilled' ? orderItems : [],
        userItems: itemsR.status === 'fulfilled' ? (Array.isArray(itemsR.value?.items) ? itemsR.value.items : []) : [],
        userTransactions: txR.status === 'fulfilled' ? txItems : [],
        deals: dealsR.status === 'fulfilled' && Array.isArray(dealsR.value?.items) ? dealsR.value.items : [],
        contacts: contactsR.status === 'fulfilled' && Array.isArray(contactsR.value?.items) ? contactsR.value.items : [],
        templates: templatesR.status === 'fulfilled' && Array.isArray(templatesR.value?.items) ? templatesR.value.items : [],
        streams: streamsR.status === 'fulfilled' && Array.isArray(streamsR.value?.items) ? streamsR.value.items : [],
        marketplaceStats: mpR.status === 'fulfilled' ? mpR.value : { totalItems: 0, totalSales: 0 },
        escrowStatus: escrowR.status === 'fulfilled' ? escrowItems : [],
        salesMetrics: salesR.status === 'fulfilled' ? salesR.value : { totalSales: 0, thisMonth: 0, thisWeek: 0 },
        loading: false,
        error: null,
      });
    } catch (error) {
      logger.error('Failed to load dashboard data', error);
      setDashboardData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }

  if (!hasToken) {
    return (
      <div className="user-dashboard-container">
        <div className="auth-required">
          <h2>📊 Dashboard</h2>
          <p>You must be logged in to access your dashboard.</p>
          <NavLink to="/login" className="btn btn-primary">Sign In</NavLink>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '🧭 Command', icon: '🧭' },
    { id: 'orders', label: '🛍️ My Orders', icon: '🛍️' },
    { id: 'items', label: '📦 My Items', icon: '📦' },
    { id: 'transactions', label: '💱 Activity', icon: '💱' },
    { id: 'escrow', label: '🔒 Escrow', icon: '🔒' },
    { id: 'sales', label: '💰 Sales', icon: '💰' },
    { id: 'analytics', label: '📈 Analytics', icon: '📈' },
  ];

  const toAmount = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    if (Math.abs(numeric) >= 1000 && Number.isInteger(numeric)) {
      return numeric / 100;
    }
    return numeric;
  };

  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const transactionCount = dashboardData.userTransactions.length;
  const transactionVolume = dashboardData.userTransactions.reduce(
    (sum, tx) => sum + Math.abs(toAmount(tx.amount)),
    0,
  );
  const recentTransactionCount = dashboardData.userTransactions.filter((tx) => {
    const when = new Date(tx.createdAt || tx.date || 0).getTime();
    return Number.isFinite(when) && when >= thirtyDaysAgo;
  }).length;

  const orderPerformanceMap = dashboardData.userOrders.reduce((acc, order) => {
    const name = order.itemName || order.itemSnapshot?.name || 'Unknown Item';
    const amount = toAmount(order.totalPrice ?? (Number(order.amountTotal || 0) / 100));
    const current = acc[name] || { name, count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += amount;
    acc[name] = current;
    return acc;
  }, {});
  const topOrderItems = Object.values(orderPerformanceMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const quickActions = [
    { to: '/broker-hub', label: 'Broker Hub', detail: 'Research, contacts, templates, deals' },
    { to: '/deals', label: 'Deals', detail: `${dashboardData.deals.length} recent loaded` },
    { to: '/contacts', label: 'Contacts', detail: `${dashboardData.contacts.length} recent loaded` },
    { to: '/templates', label: 'Templates', detail: `${dashboardData.templates.length} recent loaded` },
    { to: '/streams', label: 'Streams', detail: `${dashboardData.streams.length} recent loaded` },
    { to: '/chat', label: 'Chat', detail: 'Talk to Richard about sourcing and operations' },
    { to: '/items/new', label: 'List Item', detail: 'Create a new listing quickly' },
    { to: '/archive', label: 'Archive', detail: 'Read and preserve the long memory' },
  ];

  const noteWordCount = commandNote.trim() ? commandNote.trim().split(/\s+/).length : 0;
  const draftStatusLabel =
    commandNoteStatus === 'typing' ? 'Saving...' :
      commandNoteStatus === 'save-failed' ? 'Save failed locally' :
        'Saved locally';

  return (
    <div className="user-dashboard-container">
        <header className="dashboard-header">
          <h1>🧭 Command Center</h1>
          <p>Your operator workspace for writing, deals, communication, listings, and live business flow</p>
        </header>
        <AdminNav />

        {/* Tab Navigation */}
        <nav className="dashboard-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {dashboardData.loading && (
          <div className="loading-state">
            <p>Loading your dashboard...</p>
          </div>
        )}

        {!dashboardData.loading && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <section className="tab-content overview-content">
                <div className="command-center-grid">
                  <section className="overview-section command-note-panel">
                    <div className="command-section-header">
                      <div>
                        <h2>Write first</h2>
                        <p className="section-helper">This draft pad autosaves in your browser so you can think in plain text and keep moving.</p>
                      </div>
                      <span className={`command-note-status ${commandNoteStatus}`}>{draftStatusLabel}</span>
                    </div>
                    <textarea
                      className="command-note-textarea"
                      value={commandNote}
                      onChange={(event) => setCommandNote(event.target.value)}
                      placeholder="Write your notes, sourcing ideas, deal thoughts, reminders, or next moves here..."
                    />
                    <div className="command-note-footer">
                      <span>{noteWordCount} words</span>
                      <button
                        type="button"
                        className="command-note-clear"
                        onClick={() => {
                          setCommandNote('');
                          setCommandNoteStatus('saved');
                          try {
                            window.localStorage.removeItem(COMMAND_NOTE_KEY);
                          } catch {
                            logger.warn('Unable to clear command center note');
                          }
                        }}
                      >
                        Clear note
                      </button>
                    </div>
                  </section>

                  <section className="overview-section command-actions-panel">
                    <div className="command-section-header">
                      <div>
                        <h2>Operate the suite</h2>
                        <p className="section-helper">Jump directly into the surfaces that keep the whole system moving.</p>
                      </div>
                    </div>
                    <div className="command-actions-grid">
                      {quickActions.map((action) => (
                        <NavLink key={action.to} to={action.to} className="command-action-card">
                          <strong>{action.label}</strong>
                          <span>{action.detail}</span>
                        </NavLink>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-label">my orders</span>
                    <span className="stat-value">{dashboardData.userOrders.length}</span>
                    <span className="stat-unit">total</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">items listed</span>
                    <span className="stat-value">{dashboardData.userItems.length}</span>
                    <span className="stat-unit">active</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">all sales</span>
                    <span className="stat-value">${dashboardData.salesMetrics.totalSales?.toFixed(2) || '0.00'}</span>
                    <span className="stat-unit">lifetime</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">this month</span>
                    <span className="stat-value">${dashboardData.salesMetrics.thisMonth?.toFixed(2) || '0.00'}</span>
                    <span className="stat-unit">current</span>
                  </div>
                </div>

                <div className="command-center-grid command-center-grid--secondary">
                  <section className="overview-section">
                    <h2>Business surfaces</h2>
                    <div className="command-mini-grid">
                      <div className="command-mini-card">
                        <span className="command-mini-label">Deals</span>
                        <span className="command-mini-value">{dashboardData.deals.length}</span>
                      </div>
                      <div className="command-mini-card">
                        <span className="command-mini-label">Contacts</span>
                        <span className="command-mini-value">{dashboardData.contacts.length}</span>
                      </div>
                      <div className="command-mini-card">
                        <span className="command-mini-label">Templates</span>
                        <span className="command-mini-value">{dashboardData.templates.length}</span>
                      </div>
                      <div className="command-mini-card">
                        <span className="command-mini-label">Streams</span>
                        <span className="command-mini-value">{dashboardData.streams.length}</span>
                      </div>
                    </div>
                  </section>

                  <section className="overview-section">
                    <h2>Recent business activity</h2>
                    <div className="command-list-stack">
                      {dashboardData.deals.slice(0, 3).map((deal) => (
                        <NavLink key={deal._id} to="/deals" className="command-list-item">
                          <strong>{deal.title || 'Untitled deal'}</strong>
                          <span>{deal.status || 'unknown'} · {deal.currency || 'USD'} {deal.totalAmount || 0}</span>
                        </NavLink>
                      ))}
                      {dashboardData.deals.length === 0 ? <p className="empty-state compact">No recent deals loaded yet.</p> : null}
                    </div>
                  </section>
                </div>

                <div className="overview-section">
                  <h2>Recent Activity</h2>
                  {dashboardData.userTransactions.length > 0 ? (
                    <div className="activity-list">
                      {dashboardData.userTransactions.slice(0, 5).map((tx, i) => (
                        <div key={i} className="activity-item">
                          <span className="activity-type">{tx.type || 'Transaction'}</span>
                          <span className="activity-date">{new Date(tx.createdAt || tx.date || Date.now()).toLocaleDateString()}</span>
                          <span className="activity-amount">${toAmount(tx.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">No recent activity</p>
                  )}
                </div>

                <div className="overview-section">
                  <h2>Marketplace Overview</h2>
                  <div className="mp-stats">
                    <div className="mp-stat">
                      <p className="stat-title">Items for Sale</p>
                      <p className="stat-big">{dashboardData.marketplaceStats.totalItems || 0}</p>
                    </div>
                    <div className="mp-stat">
                      <p className="stat-title">Recent Sales</p>
                      <p className="stat-big">${dashboardData.marketplaceStats.totalSales?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </div>

                <div className="command-center-grid command-center-grid--secondary">
                  <section className="overview-section">
                    <h2>Contacts in reach</h2>
                    <div className="command-list-stack">
                      {dashboardData.contacts.slice(0, 4).map((contact) => (
                        <NavLink key={contact._id} to="/contacts" className="command-list-item">
                          <strong>{contact.name || 'Unknown contact'}</strong>
                          <span>{contact.company || contact.type || 'Contact record'}</span>
                        </NavLink>
                      ))}
                      {dashboardData.contacts.length === 0 ? <p className="empty-state compact">No contacts loaded yet.</p> : null}
                    </div>
                  </section>

                  <section className="overview-section">
                    <h2>Templates and repeatables</h2>
                    <div className="command-list-stack">
                      {dashboardData.templates.slice(0, 4).map((template) => (
                        <NavLink key={template._id} to="/templates" className="command-list-item">
                          <strong>{template.name || 'Untitled template'}</strong>
                          <span>{template.type || 'Reusable template'}</span>
                        </NavLink>
                      ))}
                      {dashboardData.templates.length === 0 ? <p className="empty-state compact">No templates loaded yet.</p> : null}
                    </div>
                  </section>
                </div>
              </section>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <section className="tab-content orders-content">
                <h2>Your Orders</h2>
                {dashboardData.userOrders.length > 0 ? (
                  <div className="orders-list">
                    {dashboardData.userOrders.map((order, i) => (
                      <div key={i} className="order-card">
                        <div className="order-header">
                          <span className="order-id">Order #{order._id?.slice(-8) || i}</span>
                          <span className={`order-status status-${(order.status || order.paymentStatus || 'pending').toLowerCase()}`}>
                            {order.status || order.paymentStatus || 'Pending'}
                          </span>
                        </div>
                        <div className="order-details">
                          <p><strong>Item:</strong> {order.itemName || order.itemSnapshot?.name || 'Unknown'}</p>
                          <p><strong>Amount:</strong> ${((order.totalPrice ?? Number(order.amountTotal || 0) / 100) || 0).toFixed(2)}</p>
                          <p><strong>Date:</strong> {new Date(order.createdAt || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No orders yet. <NavLink to="/marketplace">Browse the marketplace</NavLink></p>
                  </div>
                )}
              </section>
            )}

            {/* Items Tab */}
            {activeTab === 'items' && (
              <section className="tab-content items-content">
                <h2>Your Items</h2>
                {dashboardData.userItems.length > 0 ? (
                  <div className="items-grid">
                    {dashboardData.userItems.map((item, i) => (
                      <div key={i} className="item-card">
                        <div className="item-image" style={{ backgroundImage: item.image ? `url('${item.image}')` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
                        <div className="item-info">
                          <h3>{item.name}</h3>
                          <p className="price">${item.price?.toFixed(2) || '0.00'}</p>
                          <p className="status">{item.status || 'Listed'}</p>
                          <NavLink to={`/marketplace/${item.slug || item._id}`} className="view-btn">View</NavLink>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No items listed yet. <NavLink to="/items/new">Create your first listing</NavLink></p>
                  </div>
                )}
              </section>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <section className="tab-content transactions-content">
                <h2>Your Activity</h2>
                {dashboardData.userTransactions.length > 0 ? (
                  <div className="transactions-list">
                    {dashboardData.userTransactions.map((tx, i) => (
                      <div key={i} className="transaction-card">
                        <span className="tx-type">{tx.type || 'Transaction'}</span>
                        <span className="tx-item">{tx.itemName || tx.title || 'Unknown Item'}</span>
                        <span className="tx-user">{tx.user?.name || 'User'}</span>
                        <span className="tx-date">{new Date(tx.createdAt || tx.date || Date.now()).toLocaleDateString()}</span>
                        <span className={`tx-amount ${tx.type?.toLowerCase() === 'sale' ? 'income' : 'expense'}`}>
                          {tx.type?.toLowerCase() === 'sale' ? '+' : '-'} ${toAmount(tx.amount || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No transactions yet</p>
                )}
              </section>
            )}

            {/* Escrow Status Tab */}
            {activeTab === 'escrow' && (
              <section className="tab-content escrow-content">
                <h2>Escrow Status</h2>
                <p className="section-description">Track the status of your escrow-protected transactions</p>
                {dashboardData.escrowStatus.length > 0 ? (
                  <div className="escrow-list">
                    {dashboardData.escrowStatus.map((escrow, i) => (
                      <div key={i} className="escrow-card">
                        <div className="escrow-header">
                          <span className="escrow-order">Order #{escrow._id?.slice(-8) || i}</span>
                          <span className={`escrow-status status-${escrow.status?.toLowerCase()}`}>{escrow.status}</span>
                        </div>
                        <div className="escrow-details">
                          <p><strong>Item:</strong> {escrow.itemName || 'Unknown'}</p>
                          <p><strong>Amount:</strong> ${(Number((escrow.totalPrice ?? escrow.amount) || 0) / (Number((escrow.totalPrice ?? escrow.amount) || 0) > 1000 ? 100 : 1)).toFixed(2)}</p>
                          <p><strong>Release Date:</strong> {new Date(escrow.releaseDate || Date.now()).toLocaleDateString()}</p>
                          <p className="escrow-desc">{escrow.status === 'held' ? '🔒 Funds protected in escrow' : escrow.status === 'released' ? '✅ Transaction complete' : '⏳ Pending'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No escrow transactions</p>
                )}
              </section>
            )}

            {/* Sales Dashboard Tab */}
            {activeTab === 'sales' && (
              <section className="tab-content sales-content">
                <h2>Sales Dashboard</h2>
                <div className="sales-metrics">
                  <div className="metric-card">
                    <p className="metric-label">Lifetime Sales</p>
                    <p className="metric-value">${dashboardData.salesMetrics.totalSales?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="metric-card">
                    <p className="metric-label">This Month</p>
                    <p className="metric-value">${dashboardData.salesMetrics.thisMonth?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="metric-card">
                    <p className="metric-label">This Week</p>
                    <p className="metric-value">${dashboardData.salesMetrics.thisWeek?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="metric-card">
                    <p className="metric-label">Active Listings</p>
                    <p className="metric-value">{dashboardData.userItems.length}</p>
                  </div>
                </div>
                {dashboardData.userItems.length > 0 && (
                  <div className="sales-recommendations">
                    <h3>💡 Tips to Increase Sales</h3>
                    <ul>
                      <li>Ensure your item photos are clear and well-lit</li>
                      <li>Write detailed, accurate descriptions</li>
                      <li>Price competitively based on market rates</li>
                      <li>Respond quickly to inquiries</li>
                      <li>Keep your items in stock</li>
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Analytics Preview Tab */}
            {activeTab === 'analytics' && (
              <section className="tab-content analytics-content">
                <h2>Analytics Preview</h2>
                <div className="analytics-summary">
                  <div className="analytics-card">
                    <p>Activity Snapshot</p>
                    <div className="top-item">
                      <span>Total Transactions</span>
                      <span className="item-sales">{transactionCount}</span>
                    </div>
                    <div className="top-item">
                      <span>30-Day Activity</span>
                      <span className="item-sales">{recentTransactionCount}</span>
                    </div>
                    <div className="top-item">
                      <span>Transaction Volume</span>
                      <span className="item-sales">${transactionVolume.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="analytics-card">
                    <p>Top Items by Completed Orders</p>
                    {topOrderItems.map((item) => (
                      <div key={item.name} className="top-item">
                        <span>{item.name}</span>
                        <span className="item-sales">${item.revenue.toFixed(2)} ({item.count})</span>
                      </div>
                    ))}
                    {topOrderItems.length === 0 && <small>No order data available yet</small>}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
  );
}
