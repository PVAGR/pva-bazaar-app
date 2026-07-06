import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const PLATFORM_COLORS = ['#26c6da', '#66bb6a', '#4dd0e1', '#81c784', '#26a69a'];

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function CreatorDashboardCharts({ platformData, trendData }) {
  return (
    <div className="creator-dashboard__charts">
      <article className="creator-dashboard__panel">
        <h3>Monthly Earnings Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--site-border)" />
            <XAxis dataKey="month" stroke="var(--site-text-muted)" />
            <YAxis stroke="var(--site-text-muted)" />
            <Tooltip
              contentStyle={{
                background: 'var(--site-panel)',
                border: '1px solid var(--site-border)',
                color: 'var(--site-text)',
              }}
            />
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="var(--site-accent)"
              fill="var(--site-accent-soft)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </article>

      <article className="creator-dashboard__panel">
        <h3>Platform Sales Distribution</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={platformData} dataKey="value" nameKey="name" outerRadius={95}>
              {platformData.map((entry, idx) => (
                <Cell
                  key={`${entry.name}-${idx}`}
                  fill={PLATFORM_COLORS[idx % PLATFORM_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatUsd(value)}
              contentStyle={{
                background: 'var(--site-panel)',
                border: '1px solid var(--site-border)',
                color: 'var(--site-text)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </article>

      <article className="creator-dashboard__panel">
        <h3>Royalties by Platform</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={platformData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--site-border)" />
            <XAxis dataKey="name" stroke="var(--site-text-muted)" />
            <YAxis stroke="var(--site-text-muted)" />
            <Tooltip
              formatter={(value) => formatUsd(value)}
              contentStyle={{
                background: 'var(--site-panel)',
                border: '1px solid var(--site-border)',
                color: 'var(--site-text)',
              }}
            />
            <Bar dataKey="royalties" fill="var(--site-accent)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>
    </div>
  );
}
