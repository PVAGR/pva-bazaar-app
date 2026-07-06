import React, { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';
import './AttributionTab.css';

export default function AttributionTab() {
  const [summary, setSummary] = useState(null);
  const [creators, setCreators] = useState([]);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [creatorDetail, setCreatorDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState(30);

  // Fetch summary stats
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await apiGet(`/attribution/summary?days=${dateRange}`);
        if (data.ok) {
          setSummary(data);
        } else {
          setError(data.error || 'Failed to fetch attribution summary');
        }
      } catch (err) {
        setError(err.message || 'Error fetching attribution data');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [dateRange]);

  // Fetch creators list
  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const data = await apiGet('/attribution/creators?sortBy=commission_total');
        if (data.ok) {
          setCreators(data.creators || []);
        }
      } catch (err) {
        console.error('Error fetching creators:', err);
      }
    };

    fetchCreators();
  }, []);

  // Fetch creator detail when selected
  const handleSelectCreator = async (handle) => {
    if (selectedCreator === handle) {
      setSelectedCreator(null);
      setCreatorDetail(null);
      return;
    }

    try {
      setSelectedCreator(handle);
      const data = await apiGet(`/attribution/creator/${handle}`);
      if (data.ok) {
        setCreatorDetail(data);
      }
    } catch (err) {
      setError(`Error loading creator detail: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="attribution-tab" role="tabpanel" id="attribution-panel">
        <div className="loading">Loading attribution data...</div>
      </div>
    );
  }

  const summaryData = summary?.overall || {};
  const topCreators = summary?.topCreators || [];

  return (
    <div className="attribution-tab" role="tabpanel" id="attribution-panel">
      <h2>💰 Creator Attribution & Commissions</h2>
      <p>Track influencer-driven sales and commission payouts</p>

      {error && <div className="error-banner">{error}</div>}

      {/* Date range filter */}
      <div className="filter-bar">
        <label>Time Period:</label>
        <select value={dateRange} onChange={(e) => setDateRange(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Summary metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Orders</div>
          <div className="metric-value">{summaryData.totalOrders || 0}</div>
          <div className="metric-detail">{summaryData.paidOrders || 0} paid</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Revenue</div>
          <div className="metric-value">
            ${((summaryData.totalRevenueCents || 0) / 100).toFixed(2)}
          </div>
          <div className="metric-detail">USD</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Creator-Attributed</div>
          <div className="metric-value">{summaryData.attributedOrders || 0}</div>
          <div className="metric-detail">
            {summaryData.totalOrders > 0
              ? (((summaryData.attributedOrders || 0) / summaryData.totalOrders) * 100).toFixed(1)
              : 0}
            %
          </div>
        </div>

        <div className="metric-card highlight">
          <div className="metric-label">Total Commissions</div>
          <div className="metric-value">
            ${((summaryData.totalCommissionsCents || 0) / 100).toFixed(2)}
          </div>
          <div className="metric-detail">To be paid</div>
        </div>
      </div>

      {/* Top creators summary */}
      {topCreators.length > 0 && (
        <div className="top-creators-section">
          <h3>🌟 Top Creators (by commission)</h3>
          <div className="creators-summary">
            {topCreators.map((creator) => (
              <div key={creator._id} className="top-creator-card">
                <div className="creator-handle">{creator._id}</div>
                <div className="creator-stat">{creator.ordersCount} orders</div>
                <div className="creator-commission">
                  ${(creator.commissionsCents / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed creators table */}
      <div className="creators-section">
        <h3>👥 All Creators</h3>
        {creators.length > 0 ? (
          <div className="creators-table-wrapper">
            <table className="creators-table">
              <thead>
                <tr>
                  <th>Creator Handle</th>
                  <th>Orders</th>
                  <th>Conversion Rate</th>
                  <th>Total Revenue</th>
                  <th>Total Commission</th>
                  <th>Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {creators.map((creator) => (
                  <React.Fragment key={creator.creatorHandle}>
                    <tr
                      className={`creator-row ${selectedCreator === creator.creatorHandle ? 'selected' : ''}`}
                      onClick={() => handleSelectCreator(creator.creatorHandle)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="creator-handle-cell">{creator.creatorHandle}</td>
                      <td>{creator.ordersCount}</td>
                      <td>{(creator.conversionRate * 100).toFixed(1)}%</td>
                      <td>${(creator.totalRevenuesCents / 100).toFixed(2)}</td>
                      <td className="commission-cell">
                        ${(creator.totalCommissionsCents / 100).toFixed(2)}
                      </td>
                      <td>${(creator.avgOrderValueCents / 100).toFixed(2)}</td>
                    </tr>
                    {selectedCreator === creator.creatorHandle && creatorDetail && (
                      <tr className="detail-row">
                        <td colSpan="6">
                          <div className="creator-detail-panel">
                            <h4>Recent Orders from {creator.creatorHandle}</h4>
                            {creatorDetail.recentOrders && creatorDetail.recentOrders.length > 0 ? (
                              <div className="recent-orders">
                                {creatorDetail.recentOrders.map((order) => (
                                  <div key={order._id} className="recent-order-item">
                                    <div className="order-item-name">
                                      {order.itemSnapshot?.name || 'Unknown Item'}
                                    </div>
                                    <div className="order-item-details">
                                      {order.paymentStatus === 'paid' ? (
                                        <span className="status-paid">✓ Paid</span>
                                      ) : (
                                        <span className="status-pending">
                                          ⏳ {order.paymentStatus}
                                        </span>
                                      )}
                                      <span className="order-amount">
                                        ${(order.amountTotal / 100).toFixed(2)}
                                      </span>
                                      <span className="commission">
                                        Commission: $
                                        {(order.attribution.commissionAmountCents / 100).toFixed(2)}
                                      </span>
                                      <span className="order-date">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p>No recent orders found</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No creator attribution data yet</p>
        )}
      </div>

      {/* Info section */}
      <div className="info-section">
        <h3>📊 How Creator Attribution Works</h3>
        <ul>
          <li>
            <strong>UTM Tracking:</strong> Use links like{' '}
            <code>?utm_source=creator_handle&utm_medium=referral&utm_campaign=name</code>
          </li>
          <li>
            <strong>Referral Codes:</strong> Generate unique codes for each creator
          </li>
          <li>
            <strong>Commission Calculation:</strong> Automatic percentage splits based on order
            total
          </li>
          <li>
            <strong>Payout Ready:</strong> Track commission balances per creator for monthly
            settlements
          </li>
        </ul>
      </div>
    </div>
  );
}
