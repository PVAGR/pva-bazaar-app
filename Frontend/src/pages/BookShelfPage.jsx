import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { fetchPublishedBookProjects, getApiBase } from '../lib/api';
import { getToken, setToken } from '../lib/auth';
import { listLocalPublishedBookProjects } from '../lib/localBookVault';
import './BookShelfPage.css';

function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(globalThis.atob(base64));
  } catch (_err) {
    return null;
  }
}

function isAdminToken(token) {
  const payload = parseJwtPayload(token);
  return String(payload?.role || '').toLowerCase() === 'admin';
}

function toApiUrl(path) {
  if (!path || /^data:|^blob:|^https?:/i.test(path)) return path;
  const base = getApiBase().replace(/\/+$/, '');
  const normalized = base.endsWith('/api') && path.startsWith('/api/') ? path.slice(4) : path;
  return `${base}${normalized}`;
}

export default function BookShelfPage() {
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const activeQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    setIsAdmin(isAdminToken(getToken()));
  }, []);

  async function handleAdminDelete(book) {
    const bookId = book?.id || book?._id;
    const bookSlug = book?.slug || bookId;
    if (!bookId) return;
    setDeleteTarget({ id: bookId, slug: bookSlug, title: book.title || 'Untitled' });
    setDeleteEmail('');
    setDeletePassword('');
    setDeleteError('');
  }

  async function confirmAdminDelete(e) {
    e.preventDefault();
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const base = getApiBase();
      if (!base) throw new Error('API not configured');

      let token = getToken();
      if (!isAdminToken(token)) {
        const res = await fetch(`${base}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: deleteEmail, password: deletePassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.token) throw new Error(data?.message || data?.error || 'Login failed');
        token = data.token;
        setToken(token);
        if (!isAdminToken(token)) throw new Error('This account does not have admin access');
      }

      const delRes = await fetch(`${base}/api/book-publishing/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const delData = await delRes.json().catch(() => ({}));
      if (!delRes.ok || delData?.ok === false) {
        throw new Error(delData?.error || delData?.message || `Delete failed (${delRes.status})`);
      }

      setBooks((prev) => (prev || []).filter((b) => (b.id || b._id) !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetchPublishedBookProjects();
        if (cancelled) return;
        const remote = Array.isArray(response?.items) ? response.items : Array.isArray(response) ? response : [];
        const local = listLocalPublishedBookProjects();
        const merged = [...remote];
        for (const localBook of local) {
          if (!merged.some((b) => (b.id || b._id) === (localBook.id || localBook._id))) {
            merged.push(localBook);
          }
        }
        setBooks(merged);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load books');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredBooks = useMemo(() => {
    const list = books || [];
    if (!activeQuery) return list;
    const lowered = activeQuery.toLowerCase();
    return list.filter((book) => {
      const haystack = `${book.title || ''} ${book.authorName || ''} ${book.subtitle || ''}`.toLowerCase();
      return haystack.includes(lowered);
    });
  }, [books, activeQuery]);

  if (loading) {
    return (
      <section className="book-shelf">
        <Helmet><title>Published Books · PVA Bazaar</title></Helmet>
        <p className="book-shelf__loading">Loading published books…</p>
      </section>
    );
  }

  return (
    <>
      <Helmet><title>Published Books · PVA Bazaar</title></Helmet>
      <section className="book-shelf">
        <div className="book-shelf__controls">
          <input
            type="text"
            className="book-shelf__search"
            placeholder="Search published books by title, author, or subtitle…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error ? <p className="book-shelf__error" role="alert">{error}</p> : null}

        {filteredBooks.length === 0 ? (
          <p className="book-shelf__empty">No published books match your search.</p>
        ) : (
          <ul className="book-shelf__grid">
            {filteredBooks.map((book) => (
              <li key={book.id || book._id} className="book-shelf__card">
                <div className="book-shelf__cover">
                  {book.frontCover?.url ? (
                    <img src={toApiUrl(book.frontCover.url)} alt={`${book.title} cover`} />
                  ) : (
                    <div className="book-shelf__coverPlaceholder">{book.title?.charAt(0) || '?'}</div>
                  )}
                </div>
                <div className="book-shelf__meta">
                  <h3 className="book-shelf__title">{book.title || 'Untitled'}</h3>
                  {book.subtitle ? <p className="book-shelf__subtitle">{book.subtitle}</p> : null}
                  <p className="book-shelf__author">by {book.authorName || 'Unknown'}</p>
                  {book.wordCount ? <p className="book-shelf__stats">{book.wordCount.toLocaleString()} words</p> : null}
                </div>
                <div className="book-shelf__actions">
                  <Link className="book-shelf__button" to={`/books/read/${book.slug || book.id || book._id}`}>
                    Read
                  </Link>
                  {book.links?.pdf ? (
                    <a className="book-shelf__button" href={toApiUrl(book.links.pdf)} target="_blank" rel="noreferrer">
                      PDF
                    </a>
                  ) : null}
                  {book.links?.epub ? (
                    <a className="book-shelf__button" href={toApiUrl(book.links.epub)} target="_blank" rel="noreferrer">
                      EPUB
                    </a>
                  ) : null}
                  {isAdmin ? (
                    <button
                      type="button"
                      className="book-shelf__button book-shelf__button--danger"
                      onClick={() => handleAdminDelete(book)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {deleteTarget ? (
        <div className="book-shelf__modalOverlay" role="dialog" aria-modal="true" aria-label="Admin delete confirmation">
          <form className="book-shelf__modal" onSubmit={confirmAdminDelete}>
            <h3>Delete &ldquo;{deleteTarget.title}&rdquo;?</h3>
            <p className="book-shelf__modalWarning">This cannot be undone. {isAdmin ? 'Click Confirm to delete.' : 'Sign in as an admin to proceed.'}</p>
            {!isAdmin ? (
              <>
                <label className="book-shelf__field">
                  <span>Admin email or username</span>
                  <input
                    type="text"
                    value={deleteEmail}
                    onChange={(e) => setDeleteEmail(e.target.value)}
                    placeholder="Email or username"
                    required
                  />
                </label>
                <label className="book-shelf__field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Password"
                    required
                  />
                </label>
              </>
            ) : null}
            {deleteError ? <p className="book-shelf__error" role="alert">{deleteError}</p> : null}
            <div className="book-shelf__actions">
              <button
                type="submit"
                className="book-shelf__button book-shelf__button--danger"
                disabled={deleteBusy || (!isAdmin && (!deleteEmail || !deletePassword))}
              >
                {deleteBusy ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                type="button"
                className="book-shelf__button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteBusy}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
