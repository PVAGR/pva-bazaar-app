import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/search/text?q=${encodeURIComponent(searchTerm)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Search failed');
        setResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
        setError(err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <section className="section-card">
      <div className="section-heading">
        <h2>Search Archive</h2>
        <span className="pill">{loading ? 'Searching...' : `${results.length} results`}</span>
      </div>
      <div className="form" style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search entries by title, content, tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
      </div>
      {error && (
        <div style={{ padding: '1rem', background: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}
      <div className="entry-list">
        {results.map((entry) => (
          <article className="entry-card" key={entry._id || entry.id}>
            <h3><a href={`#/entry/${entry._id || entry.id}`}>{entry.title}</a></h3>
            <div className="entry-meta">
              {new Date(entry.date || entry.createdAt).toLocaleDateString()} · {entry.category || 'entry'}
            </div>
            <p className="entry-excerpt">{entry.excerpt || entry.content?.substring(0, 200)}</p>
            {entry.tags && entry.tags.length > 0 && (
              <div className="entry-tags">
                {entry.tags.slice(0, 5).map((tag, i) => (
                  <span className="pill" key={i}>{tag}</span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      {!loading && !error && searchTerm && results.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
          No entries found for "{searchTerm}"
        </p>
      )}
    </section>
  );
}
