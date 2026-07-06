import React, { useMemo, useState } from 'react';

export default function JournalPage({ entries = [], searchTerm = '' }) {
  const [category, setCategory] = useState('all');
  const categories = useMemo(() => {
    const set = new Set(entries.map((e) => e.category || 'journal'));
    return ['all', ...Array.from(set)];
  }, [entries]);

  const list = useMemo(() => {
    return entries.filter((e) => category === 'all' || e.category === category);
  }, [entries, category]);

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <div className="pill">Chronological log</div>
          <h2>Journal entries</h2>
        </div>
        <a className="button" href="#/studio">
          Open writing studio
        </a>
      </div>

      <div className="form" style={{ marginBottom: '1rem' }}>
        <label>
          Filter by category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All' : c}
              </option>
            ))}
          </select>
        </label>
        <p style={{ margin: 0 }}>
          Showing {list.length} of {entries.length} · search term: “{searchTerm || '—'}”
        </p>
      </div>

      <div className="entry-list">
        {list.map((entry) => (
          <article className="entry-card" key={entry.id}>
            <h3>
              <a href={`#/entry/${entry.id}`}>{entry.title}</a>
            </h3>
            <div className="entry-meta">
              {new Date(entry.date).toLocaleDateString()} · {entry.category}
            </div>
            <p className="entry-excerpt">{entry.excerpt}</p>
            <div className="entry-tags">
              {(entry.tags || []).map((tag) => (
                <span className="pill" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
