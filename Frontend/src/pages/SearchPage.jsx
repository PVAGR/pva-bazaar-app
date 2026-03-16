import React from 'react';

export default function SearchPage({ entries = [], searchTerm = '' }) {
  return (
    <section className="section-card">
      <div className="section-heading">
        <h2>Search</h2>
        <span className="pill">{searchTerm || 'Type to search'}</span>
      </div>
      <div className="entry-list">
        {entries.map((entry) => (
          <article className="entry-card" key={entry.id}>
            <h3><a href={`#/entry/${entry.id}`}>{entry.title}</a></h3>
            <div className="entry-meta">{new Date(entry.date).toLocaleDateString()} · {entry.category}</div>
            <p className="entry-excerpt">{entry.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
