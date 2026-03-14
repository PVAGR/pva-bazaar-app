import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchMyMarketplaceItems,
  retryMarketplaceSyndication,
} from '../lib/api';
import './MyListingsPage.css';

const NEEDS_ATTENTION_STATUSES = new Set(['failed', 'manual_required']);

function formatMoney(priceCents, currency = 'USD') {
  const amount = Number(priceCents || 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (_) {
    return `$${amount.toFixed(2)}`;
  }
}

export default function MyListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [retryingKey, setRetryingKey] = useState('');
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const filter = searchParams.get('filter') === 'attention' ? 'attention' : 'all';

  async function loadItems() {
    setLoading(true);
    setError('');
    const result = await fetchMyMarketplaceItems();
    setLoading(false);
    if (!result.ok) {
      setError(result.error || 'Failed to load your listings');
      return;
    }
    setItems(result.items || []);
  }

  useEffect(() => {
    loadItems();
  }, []);

  const summary = useMemo(() => {
    let attention = 0;
    for (const item of items) {
      const jobs = item?.syndication?.jobs || [];
      if (jobs.some((job) => NEEDS_ATTENTION_STATUSES.has(job.status))) {
        attention += 1;
      }
    }
    return {
      total: items.length,
      needsAttention: attention,
    };
  }, [items]);

  const visibleItems = useMemo(() => {
    if (filter !== 'attention') return items;
    return items.filter((item) => {
      const jobs = item?.syndication?.jobs || [];
      return jobs.some((job) => NEEDS_ATTENTION_STATUSES.has(job.status));
    });
  }, [items, filter]);

  function setFilter(nextFilter) {
    if (nextFilter === 'attention') {
      setSearchParams({ filter: 'attention' });
      return;
    }
    setSearchParams({});
  }

  async function retryChannelsForItem(itemId, channels, key) {
    if (!itemId || !channels?.length) return;
    setRetryingKey(key);
    setError('');
    const retry = await retryMarketplaceSyndication(itemId, channels);
    setRetryingKey('');
    if (!retry.ok) {
      setError(retry.error || 'Retry failed');
      return;
    }
    await loadItems();
  }

  return (
    <main className="my-listings-page">
      <header className="my-listings-header">
        <h1>My Listings</h1>
        <p>Manage your submitted listings and re-run marketplace syndication where needed.</p>
      </header>

      <section className="my-listings-actions">
        <Link className="btn primary" to="/items/new">
          + Create New Listing
        </Link>
        <Link className="btn ghost" to="/marketplace">
          Browse Marketplace
        </Link>
      </section>

      <section className="my-listings-filters" aria-label="Listing filters">
        <button
          type="button"
          className={`btn ghost ${filter === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Listings
        </button>
        <button
          type="button"
          className={`btn ghost ${filter === 'attention' ? 'is-active' : ''}`}
          onClick={() => setFilter('attention')}
        >
          Needs Attention
        </button>
      </section>

      <section className="my-listings-summary">
        <div className="summary-card">
          <span>Total listings</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="summary-card warning">
          <span>Need syndication attention</span>
          <strong>{summary.needsAttention}</strong>
        </div>
      </section>

      {loading ? <div className="listings-note">Loading your listings...</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="listings-note">
          You have not created any listings yet. <Link to="/items/new">Create your first listing</Link>.
        </div>
      ) : null}

      {!loading && !error && items.length > 0 && visibleItems.length === 0 ? (
        <div className="listings-note">No listings currently match this filter.</div>
      ) : null}

      <section className="my-listings-grid">
        {visibleItems.map((item) => {
          const jobs = item?.syndication?.jobs || [];
          const retryableChannels = jobs
            .filter((job) => NEEDS_ATTENTION_STATUSES.has(job.status))
            .map((job) => job.channel);

          return (
            <article key={item.id} className="listing-card">
              <div className="listing-card-top">
                <div>
                  <h2>{item.name || 'Untitled item'}</h2>
                  <p>{item.category || 'Uncategorized'} • {formatMoney(item.priceCents, item.currency)}</p>
                </div>
                <span className={`listing-status is-${item.status || 'draft'}`}>{item.status || 'draft'}</span>
              </div>

              <div className="listing-links">
                <Link to={`/marketplace/${encodeURIComponent(item.slug || item.id)}`}>Open listing</Link>
              </div>

              <div className="syndication-block">
                <h3>Syndication</h3>
                {!jobs.length ? <p className="muted">No syndication requested for this listing.</p> : null}
                {jobs.map((job) => (
                  <div key={`${item.id}-${job.channel}`} className="job-row">
                    <span className="job-channel">{job.channel}</span>
                    <span className={`job-status is-${job.status}`}>{job.status}</span>
                    <span className="job-message">{job.message || 'No details'}</span>
                    <div className="job-actions">
                      {job.externalUrl ? (
                        <a className="btn ghost" href={job.externalUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : null}
                      {NEEDS_ATTENTION_STATUSES.has(job.status) ? (
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => retryChannelsForItem(item.id, [job.channel], `${item.id}-${job.channel}`)}
                          disabled={retryingKey === `${item.id}-${job.channel}`}
                        >
                          {retryingKey === `${item.id}-${job.channel}` ? 'Retrying...' : 'Retry'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {!!retryableChannels.length ? (
                <div className="listing-footer-actions">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => retryChannelsForItem(item.id, retryableChannels, `${item.id}-all`)}
                    disabled={retryingKey === `${item.id}-all`}
                  >
                    {retryingKey === `${item.id}-all` ? 'Retrying...' : 'Retry All Failed Channels'}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
