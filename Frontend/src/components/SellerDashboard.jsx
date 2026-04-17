import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import styles from './SellerDashboard.module.css';

/**
 * Seller Dashboard Component - Complete seller analytics and management
 */
const SellerDashboard = ({ sellerId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [sellerId]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Fetch analytics
      const analyticsRes = await apiFetch('/api/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }

      // Fetch orders
      const ordersRes = await apiFetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ordersRes.ok) {
        setOrders(await ordersRes.json());
      }

      // Fetch AI insights
      const insightsRes = await apiFetch('/api/ai-help/performance-insights', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (insightsRes.ok) {
        setInsights(await insightsRes.json());
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.loader}>Loading dashboard...</div>;

  return (
    <div className={styles.dashboard}>
      <h1>📊 Seller Dashboard</h1>

      {/* Navigation Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'orders' ? styles.active : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'insights' ? styles.active : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          Insights
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && analytics && (
        <div className={styles.overview}>
          <div className={styles.kpiGrid}>
            <div className={styles.kpi}>
              <div className={styles.value}>${(analytics.totalRevenue / 100).toFixed(2)}</div>
              <div className={styles.label}>Total Revenue</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.value}>{analytics.completedOrders}</div>
              <div className={styles.label}>Orders Complete</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.value}>{analytics.conversionRate?.toFixed(2)}%</div>
              <div className={styles.label}>Conversion Rate</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.value}>${(analytics.avgOrderValue || 0).toFixed(2)}</div>
              <div className={styles.label}>Avg Order Value</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.value}>{analytics.pageViews || 0}</div>
              <div className={styles.label}>Page Views</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.value}>{analytics.checkoutStarts || 0}</div>
              <div className={styles.label}>Checkout Starts</div>
            </div>
          </div>

          {/* Charts Section */}
          <section className={styles.chartsSection}>
            <h2>Sales Funnel</h2>
            <div className={styles.funnel}>
              <div className={styles.funnelStep}>
                <span>Views: {analytics.pageViews}</span>
                <div className={styles.bar} style={{ width: '100%' }}></div>
              </div>
              <div className={styles.funnelStep}>
                <span>Product Clicks: {analytics.productClicks}</span>
                <div
                  className={styles.bar}
                  style={{ width: `${(analytics.productClicks / analytics.pageViews) * 100}%` }}
                ></div>
              </div>
              <div className={styles.funnelStep}>
                <span>Checkout Starts: {analytics.checkoutStarts}</span>
                <div
                  className={styles.bar}
                  style={{ width: `${(analytics.checkoutStarts / analytics.pageViews) * 100}%` }}
                ></div>
              </div>
              <div className={styles.funnelStep}>
                <span>Orders: {analytics.completedOrders}</span>
                <div
                  className={styles.bar}
                  style={{ width: `${(analytics.completedOrders / analytics.pageViews) * 100}%` }}
                ></div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className={styles.ordersSection}>
          <h2>Recent Orders</h2>
          {orders.length > 0 ? (
            <table className={styles.ordersTable}>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr key={order._id}>
                    <td>{order._id.slice(-8)}</td>
                    <td>{order.customerName}</td>
                    <td>${(order.amountTotal / 100).toFixed(2)}</td>
                    <td>
                      <span className={`${styles.status} ${styles[order.fulfillmentStatus]}`}>
                        {order.fulfillmentStatus}
                      </span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className={styles.viewBtn}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No orders yet</p>
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && insights && (
        <div className={styles.insightsSection}>
          <h2>🤖 AI-Powered Insights</h2>

          {insights.insights.length > 0 && (
            <section className={styles.insightsContainer}>
              <h3>Performance Insights</h3>
              {insights.insights.map((insight, idx) => (
                <div key={idx} className={`${styles.insight} ${styles[insight.priority]}`}>
                  <strong>{insight.category}</strong>
                  <p>{insight.insight}</p>
                </div>
              ))}
            </section>
          )}

          {insights.recommendations.length > 0 && (
            <section className={styles.recommendations}>
              <h3>📋 Recommendations</h3>
              <ul>
                {insights.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </section>
          )}

          {insights.nextSteps.length > 0 && (
            <section className={styles.nextSteps}>
              <h3>⏭️ Next Steps</h3>
              <ol>
                {insights.nextSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
