import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchArchiveText, searchArtifacts, searchAll } from '../lib/api';
import { createLogger } from '../lib/logger';
import './SearchPage.css';

const logger = createLogger('SearchPage');

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [scope, setScope] = useState('all');
  const [results, setResults] = useState([]);
  const [breakdown, setBreakdown] = useState({ entries: 0, artifacts: 0 });
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
        const term = searchTerm.trim();
        let payload;
        if (scope === 'entries') {
          payload = await searchArchiveText(term, { limit: 16 });
          setBreakdown({ entries: payload.count || 0, artifacts: 0 });
        } else if (scope === 'artifacts') {
          payload = await searchArtifacts(term, { limit: 16 });
          setBreakdown({ entries: 0, artifacts: payload.count || 0 });
        } else {
          payload = await searchAll(term, { limit: 12 });
          setBreakdown(payload.breakdown || { entries: 0, artifacts: 0 });
        }

        if (!payload.ok) {
          throw new Error(payload.error || 'Search failed');
        }
        setResults(payload.results || []);
      } catch (err) {
        logger.error('Search error', err);
        setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Search failed');
        setResults([]);
        setBreakdown({ entries: 0, artifacts: 0 });
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, scope]);

  return (
    <section className="section-card search-page">
      <div className="section-heading">
        <div>
          <p className="search-page__eyebrow">Discovery</p>
          <h2>Search Archive</h2>
        </div>
        <span className="pill">{loading ? 'Searching...' : `${results.length} results`}</span>
      </div>
      <p className="search-page__lead">
        Explore archive entries and marketplace artifacts by title, content, tags, artisan, and themes.
      </p>
      <div className="form form-spaced search-page__controls">
        <input
          className="search-page__input"
          type="search"
          placeholder="Search by title, content, tags, artisan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
        <label className="search-page__scope">
          <span>Scope</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All</option>
            <option value="entries">Archive Entries</option>
            <option value="artifacts">Artifacts</option>
          </select>
        </label>
      </div>
      {scope === 'all' && searchTerm.trim().length >= 2 && !loading && (
        <p className="search-page__breakdown">
          {breakdown.entries} entries • {breakdown.artifacts} artifacts
        </p>
      )}
      {error && (
        <div className="search-error-box">
          Error: {error}
        </div>
      )}
      <div className="entry-list search-page__results">
        {results.map((entry) => (
          <article className="entry-card search-page__result" key={entry._id || entry.id}>
            <h3>
              {entry.type === 'artifact'
                ? <Link to={`/marketplace/${entry.slug || entry._id || entry.id}`}>{entry.title || entry.name}</Link>
                : <Link to={`/entry/${entry._id || entry.id}`}>{entry.title}</Link>}
            </h3>
            <div className="entry-meta">
              {new Date(entry.date || entry.updatedAt || entry.createdAt).toLocaleDateString()}
              {' · '}
              {entry.type === 'artifact' ? 'artifact' : (entry.category || 'entry')}
              {entry.type === 'artifact' && typeof entry.price === 'number' ? ` · $${entry.price}` : ''}
            </div>
            <p className="entry-excerpt">{entry.excerpt || entry.description || entry.content?.substring(0, 200)}</p>
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
        <p className="search-empty-state">
          No results found for "{searchTerm}"
        </p>
      )}
    </section>
  );
}
