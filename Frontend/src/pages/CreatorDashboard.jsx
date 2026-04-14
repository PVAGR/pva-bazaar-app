import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiGet,
  fetchCreatorRoyaltyDashboard,
  fetchCreatorRoyaltyHistory,
  recordRoyaltySale,
  exportCreatorRoyaltyCsv,
} from '../lib/api';
import './CreatorDashboard.css';

const CreatorDashboardCharts = lazy(() => import('./CreatorDashboardCharts.jsx'));

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

export default function CreatorDashboard() {
  const [creatorAddress, setCreatorAddress] = useState('');
  const [days, setDays] = useState(365);
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProfileAddress() {
      try {
        const response = await apiGet('/users/profile');
        const fromPrefs = response?.user?.preferences?.defaultWalletAddress || '';
        if (mounted && fromPrefs) setCreatorAddress(fromPrefs);
      } catch {
        // Address is optional; user can provide manually.
      }
    }

    loadProfileAddress();
    return () => {
      mounted = false;
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!creatorAddress) return;
    setLoading(true);
    setError('');

    try {
      const [dashRes, historyRes] = await Promise.all([
        fetchCreatorRoyaltyDashboard(creatorAddress, { days }),
        fetchCreatorRoyaltyHistory(creatorAddress, { limit: 50, offset: 0 }),
      ]);

      if (!dashRes.ok) throw new Error(dashRes.error || 'Failed to load dashboard');
      if (!historyRes.ok) throw new Error(historyRes.error || 'Failed to load history');

      setDashboard(dashRes.dashboard);
      setHistory(Array.isArray(historyRes.history?.events) ? historyRes.history.events : []);
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [creatorAddress, days]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const summary = dashboard?.summary || {};

  const platformData = useMemo(() => {
    const rows = Array.isArray(dashboard?.platformBreakdown) ? dashboard.platformBreakdown : [];
    return rows.map((row) => ({
      name: row.platform,
      value: Number(row.sales_volume || 0),
      royalties: Number(row.royalties || 0),
      earnings: Number(row.creator_earnings || 0),
    }));
  }, [dashboard]);

  const trendData = useMemo(() => {
    const rows = Array.isArray(dashboard?.monthlyTrend) ? dashboard.monthlyTrend : [];
    return rows.map((row) => ({
      month: row.month,
      earnings: Number(row.creator_earnings || 0),
      royalties: Number(row.royalties || 0),
      volume: Number(row.sales_volume || 0),
    }));
  }, [dashboard]);

  const hasChartData = trendData.length > 0 || platformData.length > 0;

  async function handleSimulateSale() {
    if (!creatorAddress) {
      setError('Enter your creator wallet address first.');
      return;
    }

    setSimulating(true);
    setError('');

    try {
      const salePrice = Math.round((75 + Math.random() * 425) * 100) / 100;
      const response = await recordRoyaltySale({
        creatorAddress,
        saleType: 'SECONDARY',
        platform: 'WEBSITE',
        salePrice,
        royaltyRate: 10,
        buyerAddress: `demo-buyer-${Date.now()}`,
        txHash: `sim-${Date.now()}`,
        metadata: { source: 'dashboard-simulation' },
      });

      if (!response.ok) throw new Error(response.error || 'Simulation failed');
      await loadDashboardData();
    } catch (err) {
      setError(err.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  }

  async function handleExportCsv() {
    if (!creatorAddress) {
      setError('Enter your creator wallet address first.');
      return;
    }

    setExporting(true);
    setError('');

    try {
      const result = await exportCreatorRoyaltyCsv(creatorAddress);
      if (!result.ok) throw new Error(result.error || 'Export failed');

      const blob = new globalThis.Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = globalThis.URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = `royalty-history-${creatorAddress}.csv`;
      globalThis.document.body.appendChild(link);
      link.click();
      globalThis.document.body.removeChild(link);
      globalThis.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="creator-dashboard">
      <header className="creator-dashboard__header">
        <h1>Creator Royalty Dashboard</h1>
        <p>Track primary sales, secondary royalties, and platform performance in one place.</p>
      </header>

      <div className="creator-dashboard__controls">
        <label>
          Creator wallet
          <input
            type="text"
            value={creatorAddress}
            placeholder="0x..."
            onChange={(e) => setCreatorAddress(e.target.value.trim())}
          />
        </label>
        <label>
          Window
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>365 days</option>
          </select>
        </label>
        <button type="button" onClick={loadDashboardData} disabled={loading || !creatorAddress}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <button type="button" onClick={handleSimulateSale} disabled={simulating || !creatorAddress}>
          {simulating ? 'Simulating...' : 'Simulate Sale'}
        </button>
        <button type="button" onClick={handleExportCsv} disabled={exporting || !creatorAddress}>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {error ? <div className="creator-dashboard__error">{error}</div> : null}

      <div className="creator-dashboard__stats">
        <article>
          <h2>Total Creator Earnings</h2>
          <strong>{formatUsd(summary.total_earnings)}</strong>
        </article>
        <article>
          <h2>Total Royalties</h2>
          <strong>{formatUsd(summary.total_royalties)}</strong>
        </article>
        <article>
          <h2>Primary Sales Volume</h2>
          <strong>{formatUsd(summary.primary_sales_volume)}</strong>
        </article>
        <article>
          <h2>Secondary Sales Volume</h2>
          <strong>{formatUsd(summary.secondary_sales_volume)}</strong>
        </article>
        <article>
          <h2>Total Sales Count</h2>
          <strong>{Number(summary.total_sales_count || 0)}</strong>
        </article>
      </div>

      {hasChartData ? (
        <Suspense fallback={<div className="creator-dashboard__panel">Loading charts...</div>}>
          <CreatorDashboardCharts platformData={platformData} trendData={trendData} />
        </Suspense>
      ) : null}

      <article className="creator-dashboard__panel">
        <h3>Recent Royalty Events</h3>
        <div className="creator-dashboard__table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Platform</th>
                <th>Sale Price</th>
                <th>Royalty</th>
                <th>Creator Earned</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6}>No royalty events yet.</td>
                </tr>
              ) : (
                history.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDate(event.sale_timestamp)}</td>
                    <td>{event.sale_type}</td>
                    <td>{event.platform}</td>
                    <td>{formatUsd(event.sale_price)}</td>
                    <td>{formatUsd(event.royalty_amount)}</td>
                    <td>{formatUsd(event.creator_earning_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
