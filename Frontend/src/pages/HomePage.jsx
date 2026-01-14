import React, { useMemo } from 'react';

export default function HomePage({ entries = [] }) {
  const latest = useMemo(() => entries.slice(0, 6), [entries]);
  const categories = useMemo(() => {
    const counts = {};
    entries.forEach((e) => {
      const key = e.category || 'journal';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [entries]);

  return (
    <>
      <section className="section-card">
        <div className="section-heading">
          <div>
            <div className="pill">A living archive</div>
            <h1 style={{ margin: '0.35rem 0 0' }}>pvabazaar.org · A life in words</h1>
          </div>
          <a className="button" href="#/archive">View archive →</a>
        </div>
        <p style={{ marginBottom: '0.5rem' }}>
          A clean, personal journal—no marketplace noise. Read by date, explore by theme, or
          search across the full archive.
        </p>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <h2>Latest entries</h2>
          <a className="button ghost" href="#/journal">All journals</a>
        </div>
        <div className="entry-list">
          {latest.map((entry) => (
            <article className="entry-card" key={entry.id}>
              <h3><a href={`#/entry/${entry.id}`}>{entry.title}</a></h3>
              <div className="entry-meta">{new Date(entry.date).toLocaleDateString()} · {entry.category}</div>
              <p className="entry-excerpt">{entry.excerpt}</p>
              <div className="entry-tags">
                {(entry.tags || []).slice(0, 4).map((tag) => (
                  <span className="pill" key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <h2>Browse by theme</h2>
          <a className="button ghost" href="#/search">Search all</a>
        </div>
        <div className="entry-tags">
          {categories.map(([cat, count]) => (
            <span className="pill" key={cat}>{cat} · {count}</span>
          ))}
        </div>
      </section>
    </>
  );
}
