import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchMarketplaceItems } from "../lib/api";
import SiteFooter from "../components/SiteFooter.jsx";
import ShareButton from "../components/ShareButton.jsx";
import useDebounce from "../hooks/useDebounce";
import "./MarketplacePage.css";

export default function MarketplacePage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState(null);
  const debouncedSearch = useDebounce(search, 400);
  const abortRef = useRef();
  const isAuthed = !!(
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt")
  );

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    fetchData(true);
    // eslint-disable-next-line
  }, [debouncedSearch, selectedCategory]);

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
        signal: controller.signal,
      });
      if (res.ok) {
        setItems(reset ? res.items : prev => [...prev, ...res.items]);
        setNextCursor(res.nextCursor || null);
        if (reset) {
          const derived = Array.from(new Set((res.items || []).map(i => i.category).filter(Boolean)));
          setCategories(Array.isArray(res.categories) && res.categories.length ? res.categories : derived);
        }
      } else {
        setError(res.error || "Failed to load items");
      }
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCategory(cat) {
    setSelectedCategory(cat === selectedCategory ? "" : cat);
  }

  function handleLoadMore() {
    if (!loading && nextCursor) fetchData();
  }

  return (
    <main className="marketplace-page">
      <Helmet>
        <title>Marketplace | PVA Bazaar</title>
        <meta name="description" content="Browse artifacts and crafts on the PVA Bazaar marketplace." />
        <meta property="og:title" content="Marketplace | PVA Bazaar" />
        <meta property="og:description" content="Browse artifacts and crafts on the PVA Bazaar marketplace." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pvabazaar.org/#/marketplace" />
        <meta property="og:image" content="https://pvabazaar.org/og-default.svg" />
      </Helmet>
      <section className="marketplace-header">
        <div className="marketplace-nav" style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <Link to="/">📚 Archive</Link>
          <Link to="/chat">💬 Chat with Richard</Link>
          <Link to="/about">About</Link>
        </div>
        <div className="marketplace-topbar">
          <h1>Marketplace</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ShareButton url="https://pvabazaar.org/#/marketplace" title="Marketplace | PVA Bazaar" text="Browse artifacts and crafts" />
            <Link to={isAuthed ? "/items/new" : "/admin"} className="create-listing-btn">
            {isAuthed ? "Create New Listing" : "Login to Sell"}
          </Link>
          </div>
        </div>
        <input
          aria-label="Search items"
          className="marketplace-search"
          type="search"
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="marketplace-categories" role="list">
          {categories.map(cat => (
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
        {items.length === 0 && !loading && (
          <div className="empty">
            <p>No items found.</p>
            {isAuthed ? <Link to="/items/new">Create your first listing</Link> : null}
          </div>
        )}
        <div className="item-grid">
          {items.map(item => (
            <Link
              to={`/marketplace/${encodeURIComponent(item.slug || item.id)}`}
              className="item-card-link"
              key={item.id || item._id}
            >
            <article className="item-card" tabIndex={0} aria-label={item.name || item.title}>
              <img src={(item.media && item.media[0]) || item.image || "/placeholder.svg"} alt={item.name || item.title} className="item-image" loading="lazy" decoding="async" />
              <div className="item-info">
                <h2 className="item-title">{item.name || item.title}</h2>
                <div className="item-meta">
                  <span className="item-category">{item.category}</span>
                  {typeof item.priceCents === "number" ? (
                    <span className="item-price">${(item.priceCents / 100).toFixed(2)}</span>
                  ) : null}
                </div>
                <p className="item-desc">{item.description}</p>
              </div>
            </article>
            </Link>
          ))}
        </div>
        {nextCursor && (
          <button className="load-more" onClick={handleLoadMore} disabled={loading}>
            {loading ? "Loading..." : "Load More"}
          </button>
        )}
        {error && <div className="error">{error}</div>}
      </section>

      <SiteFooter style={{ padding: 24 }} />
    </main>
  );
}
