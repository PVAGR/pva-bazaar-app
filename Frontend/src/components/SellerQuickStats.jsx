import React from 'react';
import './SellerQuickStats.css';

export default function SellerQuickStats({ stats = {} }) {
  const { total = 0, published = 0, needsAttention = 0, withSyndication = 0, loading = false } = stats;

  const statusBadges = [
    {
      label: 'Total listings',
      value: total,
      icon: '📦',
      color: 'neutral',
    },
    {
      label: 'Published',
      value: published,
      icon: '✓',
      color: published > 0 ? 'success' : 'neutral',
    },
    {
      label: 'Syndicated',
      value: withSyndication,
      icon: '🔗',
      color: withSyndication > 0 ? 'active' : 'neutral',
    },
    {
      label: 'Needs attention',
      value: needsAttention,
      icon: '⚠️',
      color: needsAttention > 0 ? 'warning' : 'success',
    },
  ];

  if (loading) {
    return (
      <div className="seller-quick-stats loading">
        <span>Loading stats...</span>
      </div>
    );
  }

  return (
    <div className="seller-quick-stats">
      {statusBadges.map(badge => (
        <div key={badge.label} className={`stat-card ${badge.color}`}>
          <span className="stat-icon">{badge.icon}</span>
          <div className="stat-content">
            <span className="stat-value">{badge.value}</span>
            <span className="stat-label">{badge.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
