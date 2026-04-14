import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

const PLATFORM_COLORS = ['#26c6da', '#66bb6a', '#4dd0e1', '#81c784', '#26a69a', '#ff8a65', '#ba68c8'];

function formatUsd(v) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(v || 0));
}

export default function RoyaltyAnalyticsChart({ platformBreakdown }) {
  if (!platformBreakdown.length) return null;

  return (
    <div className="royalty-analytics__panel">
      <h3>Volume by Platform</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={platformBreakdown} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--site-border)" />
          <XAxis dataKey="platform" tick={{ fill: 'var(--site-text-muted)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--site-text-muted)', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: 'var(--site-panel)',
              border: '1px solid var(--site-border)',
              color: 'var(--site-text)',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [
              name === 'volume' ? formatUsd(value) : name === 'royalties' ? formatUsd(value) : value,
              name,
            ]}
          />
          <Bar dataKey="volume" name="volume" radius={[4, 4, 0, 0]}>
            {platformBreakdown.map((entry, idx) => (
              <Cell key={entry.platform} fill={PLATFORM_COLORS[idx % PLATFORM_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}