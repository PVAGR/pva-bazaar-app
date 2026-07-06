import React, { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

export default function Blogs() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiGet('/blogs');
        if (cancelled) return;
        setItems(Array.isArray(response?.blogs) ? response.blogs : []);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Unable to load blogs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <h2>Blogs</h2>
      {loading && <p>Loading blog entries...</p>}
      {!loading && error && <p>{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p>No published blog entries are available from the API.</p>
      )}
      {!loading && items.length > 0 && (
        <ul>
          {items.map((blog) => (
            <li key={blog.slug}>
              <strong>{blog.title}</strong>
              {blog.updatedAt ? ` - Updated ${new Date(blog.updatedAt).toLocaleDateString()}` : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
