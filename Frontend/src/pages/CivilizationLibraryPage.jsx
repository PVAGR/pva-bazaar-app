import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { ENV } from '../config/env.ts';
import './CivilizationLibraryPage.css';

function toApiUrl(path) {
  const base = ENV.API_URL.replace(/\/+$/, '');
  const normalized = base.endsWith('/api') && path.startsWith('/api/') ? path.slice(4) : path;
  return `${base}${normalized}`;
}

export default function CivilizationLibraryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/library?limit=200');
      if (data.ok) {
        setItems(Array.isArray(data.items) ? data.items : []);
      } else {
        setError(data.error || 'Failed to load public library');
      }
    } catch (err) {
      setError(err.message || 'Failed to load public library');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const values = new Set(items.map((item) => item.category).filter(Boolean));
    return ['all', ...Array.from(values).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const categoryOk = category === 'all' || item.category === category;
      if (!categoryOk) return false;
      if (!query.trim()) return true;
      const haystack = [item.title, item.description, item.category, item.domain, ...(item.tags || [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [items, category, query]);

  return (
    <div className="civil-library-page">
      <Helmet>
        <title>Civilization Library | PVA Bazaar</title>
        <meta
          name="description"
          content="Download practical manuals and training guides for essential roles: agriculture, healthcare, engineering, security, and more."
        />
      </Helmet>

      <header className="civil-library-hero">
        <div>
          <h1>Civilization Knowledge Library</h1>
          <p>
            Public archive of practical manuals and training material designed to help communities survive,
            rebuild, and thrive.
          </p>
        </div>
        <div className="civil-library-hero-actions">
          <Link to="/career-quiz" className="civil-btn civil-btn-primary">
            Take Career Compass Quiz
          </Link>
          <Link className="civil-btn civil-btn-secondary" to="/library">
            Archive Home
          </Link>
        </div>
      </header>

      <section className="civil-library-toolbar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search manuals, skills, domains..."
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <a
          className="civil-btn civil-btn-secondary"
          href={toApiUrl('/api/library/export/full/snapshot.zip')}
          target="_blank"
          rel="noreferrer"
        >
          Download Full Snapshot ZIP
        </a>
      </section>

      {error ? (
        <div className="civil-alert civil-alert-error">{error}</div>
      ) : null}

      {loading ? (
        <div className="civil-loading">Loading public library...</div>
      ) : filteredItems.length === 0 ? (
        <div className="civil-empty">No published manuals found for this filter.</div>
      ) : (
        <section className="civil-grid">
          {filteredItems.map((item) => (
            <article key={item._id} className="civil-card">
              <h2>{item.title}</h2>
              <p>{item.description || 'No description available.'}</p>
              <div className="civil-meta">
                <span>{item.category}</span>
                <span>{item.domain}</span>
                <span>{formatBytes(item?.file?.size || 0)}</span>
              </div>
              <div className="civil-actions">
                <a
                  className="civil-btn civil-btn-primary"
                  href={toApiUrl(`/api/library/${item._id}/download`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download Manual
                </a>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Math.round((bytes / Math.pow(1024, idx)) * 100) / 100} ${units[idx]}`;
}
