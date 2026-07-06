import React, { useEffect, useState } from 'react';
import { fetchArchiveEntries } from '../lib/api';

export default function Biography() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      const response = await fetchArchiveEntries({ q: 'biography', limit: 8, sort: 'new' });
      if (cancelled) return;
      if (response.ok) {
        setItems(response.items || []);
      } else {
        setError(response.error || 'Unable to load biography entries');
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
      <h2>Biography</h2>
      {loading && <p>Loading biography entries...</p>}
      {!loading && error && <p>{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p>No biography entries were returned by the archive API.</p>
      )}
      {!loading && items.length > 0 && (
        <ul>
          {items.map((entry) => (
            <li key={entry.id || entry.externalId || entry._id}>
              <strong>{entry.title}</strong>
              {entry.excerpt ? ` - ${entry.excerpt}` : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
