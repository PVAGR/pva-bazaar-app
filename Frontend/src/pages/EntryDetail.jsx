import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export default function EntryDetail({ entries = [] }) {
  const { id } = useParams();
  const list = useMemo(() => entries, [entries]);
  const idx = list.findIndex((e) => String(e.id) === String(id));
  const entry = idx >= 0 ? list[idx] : null;
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx + 1 < list.length ? list[idx + 1] : null;

  if (!entry) {
    return <section className="section-card">Entry not found.</section>;
  }

  return (
    <article className="section-card entry-page">
      <h1>{entry.title}</h1>
      <div className="entry-page__meta">
        {new Date(entry.date).toLocaleDateString()}
        {entry.location ? ` · ${entry.location}` : ''}
        {entry.tags?.length ? ' · ' + entry.tags.join(', ') : ''}
      </div>
      <div className="entry-page__body" dangerouslySetInnerHTML={{ __html: entry.contentHtml || entry.content }} />
      <div className="entry-page__nav">
        {prev ? <a href={`#/entry/${prev.id}`}>← Previous</a> : <span />}
        <a href="#/journal">Back to journal</a>
        {next ? <a href={`#/entry/${next.id}`}>Next →</a> : <span />}
      </div>
    </article>
  );
}
