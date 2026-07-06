import React, { useEffect, useState } from 'react';
import { fetchArchiveEntries } from '../lib/api';

export default function Writings() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      const response = await fetchArchiveEntries({
        q: 'writing essay reflection',
        limit: 10,
        sort: 'new',
      });
      if (cancelled) return;
      if (response.ok) {
        setItems(response.items || []);
      } else {
        setError(response.error || 'Unable to load writings');
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <h2>Writings</h2>
      {loading && <p>Loading writings...</p>}
      {!loading && error && <p>{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p>No writings were returned by the archive API.</p>
      )}
      {!loading && items.length > 0 && (
        <div>
          {items.map((entry) => (
            <article key={entry.id || entry.externalId || entry._id} className="writing-entry">
              <h3>{entry.title}</h3>
              <p>{entry.excerpt || 'No summary available.'}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
