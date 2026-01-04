import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchArchiveEntryById } from '../lib/archiveApi.js';

export default function EntryDetail({ entries = [] }) {
  const { id } = useParams();
  const list = useMemo(() => entries, [entries]);
  const idx = list.findIndex((e) => String(e.id) === String(id));
  const entry = idx >= 0 ? list[idx] : null;
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx + 1 < list.length ? list[idx + 1] : null;

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
    return <section className="section-card">Loading entry...</section>;
  }

  if (!displayEntry) {
    return <section className="section-card">Entry not found.</section>;
  }

  return (
    <article className="section-card entry-page">
      <h1>{displayEntry.title}</h1>
      <div className="entry-page__meta">
        {new Date(displayEntry.date).toLocaleDateString()}
        {displayEntry.location ? ` · ${displayEntry.location}` : ''}
        {displayEntry.tags?.length ? ' · ' + displayEntry.tags.join(', ') : ''}
      </div>
      <div className="entry-page__body" dangerouslySetInnerHTML={{ __html: displayEntry.contentHtml || displayEntry.content }} />
      <div className="entry-page__nav">
        {prev ? <a href={`#/entry/${prev.id}`}>← Previous</a> : <span />}
        <a href="#/journal">Back to journal</a>
        {next ? <a href={`#/entry/${next.id}`}>Next →</a> : <span />}
      </div>
    </article>
  );
}
