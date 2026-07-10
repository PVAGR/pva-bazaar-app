import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { fetchMarketplaceItems } from '../lib/api';
import { CIVILIZATION_PAGE_LOOKUP, CIVILIZATION_INSTITUTION_LINKS } from '../data/civilizationAtlas';
import './CivilizationCategoryPage.css';

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23141a2b'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23cfe8ff' font-family='Arial,sans-serif' font-size='24'%3EPVA Bazaar%3C/text%3E%3C/svg%3E";

function resolveItemImage(item) {
  const primary = item?.media?.[0] || '';
  if (typeof primary === 'string' && /via\.placeholder\.com/i.test(primary)) {
    return FALLBACK_IMAGE;
  }
  return primary || FALLBACK_IMAGE;
}

export default function CivilizationCategoryPage() {
  const { categorySlug } = useParams();
  const category = useMemo(() => CIVILIZATION_PAGE_LOOKUP[categorySlug] || null, [categorySlug]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchMarketplaceItems({
          limit: 8,
          q: category?.searchQuery || category?.title || categorySlug || null,
          category: category?.title || null,
        });
        if (cancelled) return;
        if (response?.ok && Array.isArray(response.items)) {
          setItems(response.items.slice(0, 8));
        } else {
          setItems([]);
          setError(response?.error || 'No items found yet for this category.');
        }
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setError(err?.message || 'Unable to load category items right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [category?.searchQuery, category?.title, categorySlug]);

  if (!category) {
    return (
      <section className="civilization-category-page section-card">
        <p className="pill">Civilization atlas</p>
        <h1>Category not found</h1>
        <p className="civilization-category__lead">
          The requested category does not exist yet. Return home and choose one of the civilization atlas paths.
        </p>
        <div className="civilization-category__actions">
          <Link className="button" to="/">Return home</Link>
          <Link className="button ghost" to="/marketplace">Open marketplace</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="civilization-category-page">
      <Helmet>
        <title>{category.title} · PVA Bazaar</title>
        <meta name="description" content={category.summary} />
      </Helmet>

      <section className="section-card civilization-category__hero">
        <div className="civilization-category__heroCopy">
          <p className="pill">{category.kicker}</p>
          <h1>{category.title}</h1>
          <p className="civilization-category__lead">{category.hero}</p>
          <p className="civilization-category__summary">{category.summary}</p>
          <div className="civilization-category__actions">
            <Link className="button" to="/marketplace">Open marketplace</Link>
            <Link className="button ghost" to="/creator">Become a supplier</Link>
            <Link className="button secondary" to="/books">Read the books</Link>
          </div>
        </div>

        <aside className="civilization-category__atlas">
          <div>
            <p className="civilization-category__asideLabel">What belongs here</p>
            <div className="civilization-category__chipRow">
              {category.focus.map((item) => (
                <span key={item} className="civilization-category__chip">{item}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="civilization-category__asideLabel">Best uses</p>
            <div className="civilization-category__chipRow">
              {category.uses.map((item) => (
                <span key={item} className="civilization-category__chip civilization-category__chip--soft">{item}</span>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="section-card civilization-category__institutionPanel">
        <div className="section-heading">
          <div>
            <div className="pill">Institutional use</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Built for {category.institutions.slice(0, 3).join(', ')}</h2>
          </div>
          <Link className="button ghost" to="/about">Why this exists</Link>
        </div>
        <div className="civilization-category__institutionGrid">
          {CIVILIZATION_INSTITUTION_LINKS.map((institution) => (
            <Link key={institution.key} to={institution.to} className="civilization-category__institutionCard">
              <strong>{institution.title}</strong>
              <span>{institution.note}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-card civilization-category__marketPanel">
        <div className="section-heading">
          <div>
            <div className="pill">Marketplace results</div>
            <h2 style={{ margin: '0.35rem 0 0' }}>Featured listings in {category.title}</h2>
          </div>
          <Link className="button ghost" to={`/marketplace?category=${encodeURIComponent(category.title)}`}>
            Filter marketplace
          </Link>
        </div>
        <p className="civilization-category__note">
          These are live marketplace results related to this category. If the shelf is still small, the category page
          still acts as the entry point for future listings, institutional partners, and sourcing work.
        </p>

        {loading ? <div className="civilization-category__state">Loading featured listings...</div> : null}
        {!loading && items.length === 0 ? (
          <div className="civilization-category__empty">
            <h3>No featured listings yet.</h3>
            <p>{error || 'This category page is ready, and items will appear here as more listings are added.'}</p>
            <div className="civilization-category__actions">
              <Link className="button" to="/marketplace">Browse all marketplace items</Link>
              <Link className="button ghost" to="/creator">Submit a supplier listing</Link>
            </div>
          </div>
        ) : null}

        {!loading && items.length > 0 ? (
          <div className="civilization-category__itemGrid">
            {items.map((item) => (
              <Link
                key={item._id || item.id || item.slug}
                className="civilization-category__itemCard"
                to={`/marketplace/${encodeURIComponent(item.slug || item.id)}`}
              >
                <img className="civilization-category__itemImage" src={resolveItemImage(item)} alt={item.name || item.title} />
                <div className="civilization-category__itemBody">
                  <span className="pill">{item.category || category.title}</span>
                  <strong>{item.name || item.title}</strong>
                  <p>{item.description || 'Marketplace listing'}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
