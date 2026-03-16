import React, { useMemo } from 'react';

export default function ArchivePage({ entries = [], searchTerm = '' }) {
  const grouped = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      const key = e.category || 'journal';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    map.forEach((list) => list.sort((a, b) => new Date(b.date) - new Date(a.date)));
    return Array.from(map.entries());
  }, [entries]);

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <div className="pill">Complete archive</div>
          <h2>All writings</h2>
        </div>
        <span className="pill">Search: {searchTerm || '—'}</span>
      </div>
      {grouped.map(([category, list]) => (
        <div key={category} className="archive-group">
          <h3 className="archive-group-title">{category}</h3>
          <div className="entry-list">
            {list.map((entry) => (
              <article className="entry-card" key={entry.id}>
                <h3><a href={`#/entry/${entry.id}`}>{entry.title}</a></h3>
                <div className="entry-meta">{new Date(entry.date).toLocaleDateString()} · {entry.tags?.join(', ')}</div>
                <p className="entry-excerpt">{entry.excerpt}</p>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
