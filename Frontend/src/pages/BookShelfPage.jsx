import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { apiUrl as toApiUrl, fetchPublishedBookProjects } from '../lib/api';
import { listLocalPublishedBookProjects } from '../lib/localBookVault';
import './BookShelfPage.css';

function formatDate(value) {
  if (!value) return 'Recently published';
  try {
    return new Date(value).toLocaleDateString();
  } catch (_err) {
    return 'Recently published';
  }
}

function isAdminUser() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt') || '';
    if (!token) return false;
    // Simple check - in production, verify with backend
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'admin' || payload.isAdmin === true;
  } catch (_err) {
    return false;
  }
}

async function deleteBookAsAdmin(bookId) {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt') || '';
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(toApiUrl(`/book-publishing/${encodeURIComponent(bookId)}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  let data = {};
  try { data = await response.json(); } catch (_e) { /* empty */ }
  if (!response.ok || !data.ok) throw new Error(data.error || data.message || `Delete failed (${response.status})`);
  return data;
}

export default function BookShelfPage() {
  // `books` = ONLINE published records only (production API → MongoDB).
  // `localDrafts` = browser-only copies, shown in a separate clearly-labeled
  // section and NEVER merged into the published list.
  const [books, setBooks] = useState([]);
  const [localDrafts, setLocalDrafts] = useState([]);
  const [query, setQuery] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const activeQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    setIsAdmin(isAdminUser());
  }, []);

  async function handleAdminDelete(book) {
    const bookId = book?.id || book?._id;
    if (!bookId) return;
    setDeleteTarget({ id: bookId, title: book.title || 'Untitled' });
    setDeleteError('');
  }

  async function confirmAdminDelete(e) {
    e.preventDefault();
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteBookAsAdmin(deleteTarget.id);
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
      // Local browser copies are listed separately no matter what — they are
      // never presented as published books.
      try {
        if (!cancelled) setLocalDrafts(listLocalPublishedBookProjects());
      } catch (_err) {
        if (!cancelled) setLocalDrafts([]);
      }
      try {
        const data = await fetchPublishedBookProjects(activeQuery ? { q: activeQuery, limit: 48 } : { limit: 48 });
        if (!data?.ok) {
          throw new Error(data?.error || 'Failed to load published books');
        }
        const items = Array.isArray(data.items) ? data.items : [];
        if (!cancelled) {
          setBooks(items);
        }
      } catch (err) {
        // Online shelf failed: keep the published list EMPTY and say so.
        // Local browser copies stay in their own section below.
        if (!cancelled) {
          setBooks([]);
          setError(`Published books could not be loaded from the online library (${err.message || 'network error'}). Nothing here is shown as published from this device.`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeQuery]);

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
          <p className="book-shelf__empty">
            {error
              ? 'The online library is unreachable right now — no books are shown as published.'
              : 'No published books match your search.'}
          </p>
        ) : (
          <ul className="book-shelf__grid">
            {filteredBooks.map((book) => (
              <li key={book.id || book._id} className="book-shelf__card">
                <div className="book-shelf__cover">
                  {book.frontCover?.url ? (
                    <img
                      src={toApiUrl(book.frontCover.url)}
                      alt={`${book.title} cover`}
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallbackApplied) return;
                        img.dataset.fallbackApplied = 'true';
                        img.src = '/placeholder.png';
                      }}
                    />
                  ) : (
                    <div className="book-shelf__coverPlaceholder">{book.title?.charAt(0) || '?'}</div>
                  )}
                </div>
                <div className="book-shelf__meta">
                  <h3 className="book-shelf__title">{book.title || 'Untitled'}</h3>
                  {book.subtitle ? <p className="book-shelf__subtitle">{book.subtitle}</p> : null}
                  <p className="book-shelf__author">by {book.authorName || 'Unknown'}</p>
                  {book.wordCount ? <p className="book-shelf__stats">{book.wordCount.toLocaleString()} words</p> : null}
                  {book.mirrors ? (
                    <div className="book-shelf__badges">
                      {book.mirrors.archiveOrg ? <span className="book-shelf__badge" title="Archived on Internet Archive">IA</span> : null}
                      {book.mirrors.pinata ? <span className="book-shelf__badge" title="Archived on Pinata IPFS">Pinata</span> : null}
                      {book.mirrors.ipfs ? <span className="book-shelf__badge" title="Archived on IPFS">IPFS</span> : null}
                      {book.mirrors.storacha ? <span className="book-shelf__badge" title="Archived on Storacha">Storacha</span> : null}
                    </div>
                  ) : null}
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

        {localDrafts.length > 0 ? (
          <section className="book-shelf__local" aria-label="Local drafts on this device">
            <h2 className="book-shelf__localHeading">On this device only — not published</h2>
            <p className="book-shelf__muted">
              These copies live only in this browser. They are NOT in the online
              library and are NOT visible to anyone else. Open the publishing
              workspace to save or publish them.
            </p>
            <ul className="book-shelf__localList">
              {localDrafts.map((draft) => (
                <li key={draft.id || draft._id} className="book-shelf__localItem">
                  <strong>{draft.title || 'Untitled'}</strong>
                  <span> · Local draft · {draft.wordCount || 0} words</span>
                  <Link className="book-shelf__button" to="/books/publish">
                    Open publishing workspace
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>

      {deleteTarget ? (
        <div className="book-shelf__modalOverlay" role="dialog" aria-modal="true" aria-label="Admin delete confirmation">
          <form className="book-shelf__modal" onSubmit={confirmAdminDelete}>
            <h3>Delete &ldquo;{deleteTarget.title}&rdquo;?</h3>
            <p className="book-shelf__modalWarning">This cannot be undone. Click Confirm to delete.</p>
            {deleteError ? <p className="book-shelf__error" role="alert">{deleteError}</p> : null}
            <div className="book-shelf__actions">
              <button
                type="submit"
                className="book-shelf__button book-shelf__button--danger"
                disabled={deleteBusy}
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
