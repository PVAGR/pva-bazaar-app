import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchArchiveEntryById } from '../lib/archiveApi.js';

export default function EntryDetail({ entries = [] }) {
  const { id } = useParams();
  const list = useMemo(() => entries, [entries]);
  const idx = list.findIndex((e) => String(e.id) === String(id));
  const entry = idx >= 0 ? list[idx] : null;
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx + 1 < list.length ? list[idx + 1] : null;

  // Lock body scroll on mobile detail view
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, []);

  const [fetchedEntry, setFetchedEntry] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!entry) {
      setLoading(true);
      const controller = new AbortController();
      fetchArchiveEntryById(id, { signal: controller.signal })
        .then((data) => {
          if (mounted) {
            setFetchedEntry(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          if (mounted) {
            console.warn('Failed to fetch entry', err);
            setLoading(false);
          }
        });
      return () => {
        mounted = false;
        controller.abort();
      };
    }
  }, [id, entry]);

  const displayEntry = entry || fetchedEntry;

  if (loading) {
    return (
      <section className="entry-detail-container">
        <div className="entry-detail-header">
          <Link to="#/journal" className="entry-close-btn">✕</Link>
        </div>
        <div className="entry-detail-content">Loading entry...</div>
      </section>
    );
  }

  if (!displayEntry) {
    return (
      <section className="entry-detail-container">
        <div className="entry-detail-header">
          <Link to="#/journal" className="entry-close-btn">✕</Link>
        </div>
        <div className="entry-detail-content">Entry not found.</div>
      </section>
    );
  }

  return (
    <section className="entry-detail-container">
      <div className="entry-detail-header">
        <h2 className="entry-detail-title">{displayEntry.title}</h2>
        <Link to="#/journal" className="entry-close-btn" aria-label="Close">✕</Link>
      </div>
      
      <div className="entry-detail-scrollable">
        <article className="entry-detail-content">
          <div className="entry-page__meta">
            {new Date(displayEntry.date).toLocaleDateString()}
            {displayEntry.location ? ` · ${displayEntry.location}` : ''}
            {displayEntry.tags?.length ? ' · ' + displayEntry.tags.join(', ') : ''}
          </div>
          <div className="entry-page__body" dangerouslySetInnerHTML={{ __html: displayEntry.contentHtml || displayEntry.content }} />
        </article>
      </div>

      <nav className="entry-detail-nav">
        {prev && <Link to={`#/entry/${prev.id}`} className="nav-link nav-prev">← Previous</Link>}
        <Link to="#/journal" className="nav-link nav-back">Back to Journal</Link>
        {next && <Link to={`#/entry/${next.id}`} className="nav-link nav-next">Next →</Link>}
      </nav>
    </section>
  );
}
