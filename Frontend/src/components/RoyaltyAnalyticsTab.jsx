import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAllRoyaltyEvents } from '../lib/api';
import './RoyaltyAnalyticsTab.css';

const PAGE_SIZE = 50;
const RoyaltyAnalyticsChart = lazy(() => import('./RoyaltyAnalyticsChart.jsx'));

function formatUsd(v) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(v || 0));
}

function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function truncate(str, n = 16) {
  if (!str) return '—';
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

export default function RoyaltyAnalyticsTab() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [saleTypeFilter, setSaleTypeFilter] = useState('');
  const [page, setPage] = useState(0);

  const load = useCallback(
    async (opts = {}) => {
      setLoading(true);
      setError('');
      const offset = (opts.page ?? page) * PAGE_SIZE;
      const result = await fetchAllRoyaltyEvents({
        limit: PAGE_SIZE,
        offset,
        platform: opts.platform ?? platformFilter,
      });
      setLoading(false);
      if (!result.ok) {
        setError(result.error || 'Failed to load events');
        return;
      }
      setEvents(result.events);
      setTotal(result.total);
    },
    [page, platformFilter],
  );

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilter() {
    setPage(0);
    load({ page: 0, platform: platformFilter });
  }

  function clearFilter() {
    setPlatformFilter('');
    setSaleTypeFilter('');
    setPage(0);
    load({ page: 0, platform: '' });
  }

  function goPage(p) {
    setPage(p);
    load({ page: p });
  }

  // Derived stats from current page (for overview numbers use total)
  const filteredEvents = useMemo(() => {
    if (!saleTypeFilter) return events;
    return events.filter((e) => e.sale_type === saleTypeFilter);
  }, [events, saleTypeFilter]);

  const summary = useMemo(() => {
    const allSales = filteredEvents.reduce((s, e) => s + Number(e.sale_price || 0), 0);
    const allRoyalties = filteredEvents.reduce((s, e) => s + Number(e.royalty_amount || 0), 0);
    const creators = new Set(filteredEvents.map((e) => e.creator_address).filter(Boolean));
    const platforms = new Set(filteredEvents.map((e) => e.platform).filter(Boolean));
    return { allSales, allRoyalties, creators: creators.size, platforms: platforms.size };
  }, [filteredEvents]);

  const platformBreakdown = useMemo(() => {
    const map = {};
    filteredEvents.forEach((e) => {
      const p = e.platform || 'UNKNOWN';
      if (!map[p]) map[p] = { platform: p, volume: 0, royalties: 0, count: 0 };
      map[p].volume += Number(e.sale_price || 0);
      map[p].royalties += Number(e.royalty_amount || 0);
      map[p].count += 1;
    });
    return Object.values(map).sort((a, b) => b.volume - a.volume);
  }, [filteredEvents]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="royalty-analytics" role="tabpanel" id="royalty-analytics-panel">
      {/* Header */}
      <div className="royalty-analytics__header">
        <h2>Royalty Analytics — All Events</h2>
        <p>Cross-creator sales and royalty event log from the registrar.</p>
      </div>

      {/* Filters */}
      <div className="royalty-analytics__filters">
        <label>
          <span>Platform</span>
          <input
            type="text"
            placeholder="e.g. WEBSITE, ETSY…"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value.toUpperCase())}
          />
        </label>
        <label>
          <span>Sale Type</span>
          <select value={saleTypeFilter} onChange={(e) => setSaleTypeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="PRIMARY">Primary</option>
            <option value="SECONDARY">Secondary</option>
          </select>
        </label>
        <button onClick={applyFilter} disabled={loading}>
          {loading ? 'Loading…' : 'Apply'}
        </button>
        <button onClick={clearFilter} disabled={loading} className="royalty-analytics__btn-ghost">
          Clear
        </button>
        <button
          onClick={() => load()}
          disabled={loading}
          className="royalty-analytics__btn-ghost"
          title="Refresh"
        >
          ↺ Refresh
        </button>
      </div>

      {/* Error */}
      {error && <div className="royalty-analytics__error">{error}</div>}

      {/* Summary KPIs */}
      <div className="royalty-analytics__stats">
        <article>
          <h3>Total Events</h3>
          <strong>{total.toLocaleString()}</strong>
          <span>(page {filteredEvents.length})</span>
        </article>
        <article>
          <h3>Sales Volume</h3>
          <strong>{formatUsd(summary.allSales)}</strong>
          <span>this page</span>
        </article>
        <article>
          <h3>Royalties Earned</h3>
          <strong>{formatUsd(summary.allRoyalties)}</strong>
          <span>this page</span>
        </article>
        <article>
          <h3>Unique Creators</h3>
          <strong>{summary.creators}</strong>
          <span>this page</span>
        </article>
        <article>
          <h3>Platforms Active</h3>
          <strong>{summary.platforms}</strong>
          <span>this page</span>
        </article>
      </div>

      {platformBreakdown.length > 0 ? (
        <Suspense fallback={<div className="royalty-analytics__panel">Loading chart...</div>}>
          <RoyaltyAnalyticsChart platformBreakdown={platformBreakdown} />
        </Suspense>
      ) : null}

      {/* Events table */}
      <div className="royalty-analytics__panel">
        <div className="royalty-analytics__table-header">
          <h3>Events</h3>
          {totalPages > 1 && (
            <div className="royalty-analytics__pagination">
              <button onClick={() => goPage(page - 1)} disabled={page === 0 || loading}>
                ‹ Prev
              </button>
              <span>
                Page {page + 1} / {totalPages}
              </span>
              <button onClick={() => goPage(page + 1)} disabled={page >= totalPages - 1 || loading}>
                Next ›
              </button>
            </div>
          )}
        </div>
        <div className="royalty-analytics__table-wrap">
          {loading ? (
            <div className="royalty-analytics__loading">Loading events…</div>
          ) : filteredEvents.length === 0 ? (
            <div className="royalty-analytics__empty">
              No events found. Record a sale via the Creator Dashboard to populate data.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Platform</th>
                  <th>Type</th>
                  <th>Sale Price</th>
                  <th>Royalty</th>
                  <th>Creator</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{formatDate(e.sale_timestamp)}</td>
                    <td>
                      <span className="royalty-analytics__badge">{e.platform || '—'}</span>
                    </td>
                    <td>
                      <span
                        className={`royalty-analytics__badge royalty-analytics__badge--${(e.sale_type || '').toLowerCase()}`}
                      >
                        {e.sale_type || '—'}
                      </span>
                    </td>
                    <td>{formatUsd(e.sale_price)}</td>
                    <td>{formatUsd(e.royalty_amount)}</td>
                    <td title={e.creator_address}>{truncate(e.creator_address, 14)}</td>
                    <td title={e.tx_hash}>{truncate(e.tx_hash, 12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
