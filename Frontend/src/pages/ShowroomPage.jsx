import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchMarketplaceItems } from "../lib/api";
import useDebounce from "../hooks/useDebounce";
import "./ShowroomPage.css";

export default function ShowroomPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("");
  const [uniquenessMode, setUniquenessMode] = useState("all");
  const [originCountry, setOriginCountry] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [search, setSearch] = useState("");
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
  }, [debouncedSearch, selectedCategory, availabilityStatus, uniquenessMode, originCountry, colorFilter]);

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
        isUnique: uniquenessMode === "all" ? null : uniquenessMode === "unique",
        originCountry: originCountry || null,
        color: colorFilter || null,
        signal: controller.signal,
      });
      if (res.ok) {
        setItems(reset ? res.items : prev => [...prev, ...res.items]);
        setNextCursor(res.nextCursor || null);
        if (reset && res.categories) setCategories(res.categories);
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
    <main className="showroom-page">
      <section className="showroom-header">
        <div className="showroom-header-content">
          <h1>Professional Showroom</h1>
          <p className="showroom-tagline">Discover premium materials, gemstones, and artisanal pieces curated for creative professionals.</p>
        </div>
        <div className="showroom-nav-links">
          <Link to="/library" className="showroom-nav-link">Back to Home</Link>
          <Link to="/marketplace" className="showroom-nav-link">Go to Marketplace</Link>
        </div>
        <input
          aria-label="Search items"
          className="showroom-search"
          type="search"
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="showroom-filters">
          <select
            className="showroom-filter"
            aria-label="Filter by availability"
            value={availabilityStatus}
            onChange={e => setAvailabilityStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="backorder">Backorder</option>
          </select>
          <select
            className="showroom-filter"
            aria-label="Filter by uniqueness"
            value={uniquenessMode}
            onChange={e => setUniquenessMode(e.target.value)}
          >
            <option value="all">All Pieces</option>
            <option value="unique">One-of-One</option>
            <option value="bulk">Bulk Inventory</option>
          </select>
          <input
            className="showroom-filter"
            type="text"
            aria-label="Filter by origin country"
            placeholder="Origin country"
            value={originCountry}
            onChange={e => setOriginCountry(e.target.value)}
          />
          <input
            className="showroom-filter"
            type="text"
            aria-label="Filter by color"
            placeholder="Color"
            value={colorFilter}
            onChange={e => setColorFilter(e.target.value)}
          />
        </div>
        <div className="showroom-categories" role="list">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-chip${  cat === selectedCategory ? " selected" : ""}`}
              onClick={() => handleCategory(cat)}
              aria-pressed={cat === selectedCategory}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>
      <section className="showroom-items">
        {items.length === 0 && !loading && <div className="empty">No items found.</div>}
        <div className="item-grid">
          {items.map(item => (
            <Link
              className="item-card-link"
              to={`/showroom/${encodeURIComponent(item.slug || item.id)}`}
              key={item._id || item.id}
            >
              <article className="item-card" tabIndex={0} aria-label={item.name || item.title}>
                <img
                  src={item.media?.[0] || "/placeholder.png"}
                  alt={item.name || item.title}
                  className="item-image"
                />
                <div className="item-info">
                  <h2 className="item-title">{item.name || item.title}</h2>
                  <div className="item-meta">
                    <span className="item-category">{item.category}</span>
                    <span className={`item-status-pill status-${item?.catalog?.availabilityStatus || "available"}`}>
                      {item?.catalog?.availabilityStatus || "available"}
                    </span>
                    <span className="item-uniqueness-pill">
                      {item?.catalog?.isUnique ? "One-of-One" : `Bulk: ${item?.catalog?.bulkQuantity || 0}`}
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
            {loading ? "Loading..." : "Load More"}
          </button>
        )}
        {error && <div className="error">{error}</div>}
      </section>
    </main>
  );
}
