import React, { useState, useEffect, useRef } from "react";
import fetchMarketplaceItems from "../lib/api";
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
    <main className="marketplace-page">
      <section className="marketplace-header">
        <h1>Marketplace</h1>
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
              className={"category-chip" + (cat === selectedCategory ? " selected" : "")}
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
          {items.map(item => (
            <article className="item-card" key={item._id || item.id} tabIndex={0} aria-label={item.title}>
              <img src={item.image || "/placeholder.png"} alt={item.title} className="item-image" />
              <div className="item-info">
                <h2 className="item-title">{item.title}</h2>
                <div className="item-meta">
                  <span className="item-category">{item.category}</span>
                  {item.price && <span className="item-price">${item.price}</span>}
                </div>
                <p className="item-desc">{item.description}</p>
              </div>
            </article>
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
