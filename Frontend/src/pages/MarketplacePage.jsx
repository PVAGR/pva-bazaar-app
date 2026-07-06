import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchMarketplaceItems } from '../lib/api';
import useDebounce from '../hooks/useDebounce';
import './MarketplacePage.css';

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23141a2b'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23cfe8ff' font-family='Arial,sans-serif' font-size='24'%3EPVA Bazaar%3C/text%3E%3C/svg%3E";
const MARKETPLACE_PORTAL_LINKS = [
  { key: 'home', label: 'Home', to: '/', note: 'Personal portal and site atlas' },
  { key: 'archive', label: 'Archive', to: '/archive', note: 'Words, writings, and public context' },
  { key: 'studio', label: 'Writing Studio', to: '/studio', note: 'Drafts, notes, and publishing' },
  { key: 'recovery', label: 'Recovery', to: '/recovery', note: 'Backups, bundles, continuity' },
  {
    key: 'showroom',
    label: 'Showroom',
    to: '/showroom',
    note: 'Curated display of featured pieces',
  },
  { key: 'admin', label: 'Admin', to: '/admin', note: 'Operations and continuity controls' },
];

function resolveItemImage(item) {
  const primary = item?.media?.[0] || '';
  if (typeof primary === 'string' && /via\.placeholder\.com/i.test(primary)) {
    return FALLBACK_IMAGE;
  }
  return primary || FALLBACK_IMAGE;
}

export default function MarketplacePage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('');
  const [uniquenessMode, setUniquenessMode] = useState('all');
  const [originCountry, setOriginCountry] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState(null);
  const debouncedSearch = useDebounce(search, 400);
  const abortRef = useRef();

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    fetchData(true);
    // eslint-disable-next-line
  }, [
    debouncedSearch,
    selectedCategory,
    availabilityStatus,
    uniquenessMode,
    originCountry,
    colorFilter,
  ]);

  async function fetchData(reset = false) {
    setLoading(true);
    setError(null);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetchMarketplaceItems({
        limit: 12,
        cursor: reset ? null : nextCursor,
        category: selectedCategory || null,
        q: debouncedSearch || null,
        availabilityStatus: availabilityStatus || null,
        isUnique: uniquenessMode === 'all' ? null : uniquenessMode === 'unique',
        originCountry: originCountry || null,
        color: colorFilter || null,
        signal: controller.signal,
      });
      if (res.ok) {
        setItems(reset ? res.items : (prev) => [...prev, ...res.items]);
        setNextCursor(res.nextCursor || null);
        if (reset && res.categories) setCategories(res.categories);
      } else {
        setError(res.error || 'Failed to load items');
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCategory(cat) {
    setSelectedCategory(cat === selectedCategory ? '' : cat);
  }

  function handleLoadMore() {
    if (!loading && nextCursor) fetchData();
  }

  return (
    <main className="marketplace-page">
      <section className="marketplace-header">
        <div className="marketplace-header-copy">
          <p className="marketplace-kicker">Business portal</p>
          <h1>Marketplace</h1>
          <p className="marketplace-tagline">
            A public trade surface for sourcing, listings, and product discovery. Use it alongside
            the archive, writing studio, and recovery tools as one connected site.
          </p>
        </div>
        <div className="marketplace-nav-links">
          <Link to="/" className="marketplace-nav-link">
            Home
          </Link>
          <Link to="/archive" className="marketplace-nav-link">
            Archive
          </Link>
          <Link to="/showroom" className="marketplace-nav-link">
            Go to Showroom
          </Link>
        </div>
        <div className="marketplace-portal-row" aria-label="Marketplace portal shortcuts">
          {MARKETPLACE_PORTAL_LINKS.map((link) => (
            <Link key={link.key} to={link.to} className="marketplace-portal-card">
              <strong>{link.label}</strong>
              <span>{link.note}</span>
            </Link>
          ))}
        </div>
        <section className="marketplace-atlas" aria-label="Marketplace atlas">
          <h2>Atlas</h2>
          <p className="marketplace-atlas-copy">
            Stay oriented while moving between reading, selling, recovery, and public display. This
            is one portal in the same site, not a separate system.
          </p>
          <div className="marketplace-atlas-links">
            <Link to="/" className="marketplace-atlas-link">
              Home
            </Link>
            <Link to="/archive" className="marketplace-atlas-link">
              Archive
            </Link>
            <Link to="/studio" className="marketplace-atlas-link">
              Writing Studio
            </Link>
            <Link to="/recovery" className="marketplace-atlas-link">
              Recovery
            </Link>
            <Link to="/showroom" className="marketplace-atlas-link">
              Showroom
            </Link>
            <Link to="/creator" className="marketplace-atlas-link">
              Creator Portal
            </Link>
          </div>
        </section>
        <input
          aria-label="Search items"
          className="marketplace-search"
          type="search"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="marketplace-filters">
          <select
            className="marketplace-filter"
            aria-label="Filter by availability"
            value={availabilityStatus}
            onChange={(e) => setAvailabilityStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="backorder">Backorder</option>
          </select>
          <select
            className="marketplace-filter"
            aria-label="Filter by uniqueness"
            value={uniquenessMode}
            onChange={(e) => setUniquenessMode(e.target.value)}
          >
            <option value="all">All Pieces</option>
            <option value="unique">One-of-One</option>
            <option value="bulk">Bulk Inventory</option>
          </select>
          <input
            className="marketplace-filter"
            type="text"
            aria-label="Filter by origin country"
            placeholder="Origin country"
            value={originCountry}
            onChange={(e) => setOriginCountry(e.target.value)}
          />
          <input
            className="marketplace-filter"
            type="text"
            aria-label="Filter by color"
            placeholder="Color"
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
          />
        </div>
        <div className="marketplace-categories" role="list">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-chip${cat === selectedCategory ? ' selected' : ''}`}
              onClick={() => handleCategory(cat)}
              aria-pressed={cat === selectedCategory}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>
      <section className="marketplace-items">
        {items.length === 0 && !loading && <div className="empty">No items found.</div>}
        <div className="item-grid">
          {items.map((item) => (
            <Link
              className="item-card-link"
              to={`/marketplace/${encodeURIComponent(item.slug || item.id)}`}
              key={item._id || item.id}
            >
              <article className="item-card" tabIndex={0} aria-label={item.name || item.title}>
                <img
                  src={resolveItemImage(item)}
                  alt={item.name || item.title}
                  className="item-image"
                />
                <div className="item-info">
                  <h2 className="item-title">{item.name || item.title}</h2>
                  <div className="item-meta">
                    <span className="item-category">{item.category}</span>
                    <span
                      className={`item-status-pill status-${item?.catalog?.availabilityStatus || 'available'}`}
                    >
                      {item?.catalog?.availabilityStatus || 'available'}
                    </span>
                    <span className="item-uniqueness-pill">
                      {item?.catalog?.isUnique
                        ? 'One-of-One'
                        : `Bulk: ${item?.catalog?.bulkQuantity || 0}`}
                    </span>
                  </div>
                  <p className="item-desc">{item.description}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
        {nextCursor && (
          <button className="load-more" onClick={handleLoadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </button>
        )}
        {error && <div className="error">{error}</div>}
      </section>
    </main>
  );
}
