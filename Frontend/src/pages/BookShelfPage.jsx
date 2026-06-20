import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { fetchPublishedBookProjects, getApiBase } from '../lib/api';
import { listLocalPublishedBookProjects } from '../lib/localBookVault';
import './BookShelfPage.css';

function toApiUrl(path) {
  if (!path || /^data:|^blob:|^https?:/i.test(path)) return path;
  const base = getApiBase().replace(/\/+$/, '');
  const normalized = base.endsWith('/api') && path.startsWith('/api/') ? path.slice(4) : path;
  return `${base}${normalized}`;
}

function formatDate(value) {
  if (!value) return 'Recently published';
  try {
    return new Date(value).toLocaleDateString();
  } catch (_err) {
    return 'Recently published';
  }
}

export default function BookShelfPage() {
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPublishedBookProjects(activeQuery ? { q: activeQuery, limit: 48 } : { limit: 48 });
        if (!data?.ok) {
          throw new Error(data?.error || 'Failed to load published books');
        }
        const localItems = listLocalPublishedBookProjects();
        const items = Array.isArray(data.items) ? data.items : [];
        const merged = [...items, ...localItems].reduce((acc, book) => {
          const key = String(book.id || book.slug || '');
          if (!key) return acc;
          if (!acc.some((item) => String(item.id || item.slug || '') === key)) {
            acc.push(book);
          }
          return acc;
        }, []);
        if (!cancelled) {
          setBooks(merged);
        }
      } catch (err) {
        const localItems = listLocalPublishedBookProjects();
        if (!cancelled) {
          setBooks(localItems);
          if (!localItems.length) {
            setError(err.message || 'Failed to load published books');
          }
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

  function handleSubmit(event) {
    event.preventDefault();
    setQuery(draftQuery);
  }

  function clearSearch() {
    setDraftQuery('');
    setQuery('');
  }

  return (
    <>
      <Helmet>
        <title>Published Books · PVA Bazaar</title>
        <meta
          name="description"
          content="Browse the public bookshelf on PVA Bazaar, read published books online, and download PDF or EPUB editions."
        />
      </Helmet>

      <section className="book-shelf section-card">
        <header className="book-shelf__hero">
          <div>
            <p className="pill">Published books</p>
            <h1>Browse the public bookshelf.</h1>
            <p className="book-shelf__lead">
              This shelf shows every published book that has been opened to the public. Read it online, open the API
              view, or download the PDF and EPUB editions when available.
            </p>
          </div>

          <aside className="book-shelf__panel">
            <h2>Find a book</h2>
            <form className="book-shelf__search" onSubmit={handleSubmit}>
              <label className="book-shelf__field">
                <span>Search by title, author, or topic</span>
                <input
                  type="search"
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder="Search published books"
                />
              </label>
              <div className="book-shelf__actions">
                <button className="book-shelf__button book-shelf__button--primary" type="submit">
                  Search
                </button>
                <button className="book-shelf__button" type="button" onClick={clearSearch}>
                  Clear
                </button>
              </div>
            </form>
            <div className="book-shelf__actions">
              <Link className="book-shelf__button" to="/books">Back to books</Link>
              <Link className="book-shelf__button book-shelf__button--primary" to="/books/publish">
                Publish a book
              </Link>
            </div>
          </aside>
        </header>

        <div className="book-shelf__metaRow">
          <span className="pill">{loading ? 'Loading…' : `${books.length} published book${books.length === 1 ? '' : 's'}`}</span>
          {activeQuery ? <span className="book-shelf__query">Filtered by “{activeQuery}”</span> : <span className="book-shelf__query">All published books</span>}
        </div>

        {error ? <div className="book-shelf__error" role="alert">{error}</div> : null}
        {!loading && !error && books.length === 0 ? (
          <section className="book-shelf__empty">
            <h2>No published books yet.</h2>
            <p>
              The bookshelf will appear here as soon as a book is published. If you are the author, open the publishing
              workspace and publish the first edition.
            </p>
            <div className="book-shelf__actions">
              <Link className="book-shelf__button book-shelf__button--primary" to="/books/publish">
                Open publishing workspace
              </Link>
              <Link className="book-shelf__button" to="/archive">
                Read the archive
              </Link>
            </div>
          </section>
        ) : null}

        <div className="book-shelf__grid">
          {books.map((book) => {
            const coverUrl = book?.links?.frontCover ? toApiUrl(book.links.frontCover) : '';
            const readerPath = book?.links?.publicPage || (book?.slug ? `/books/read/${encodeURIComponent(book.slug)}` : '/books');
            return (
              <article key={book.id || book.slug} className="book-shelf__card">
                <div className="book-shelf__cover">
                  {coverUrl ? (
                    <img src={coverUrl} alt={`${book.title || 'Book'} cover`} />
                  ) : (
                    <div className="book-shelf__coverPlaceholder">
                      <span>Cover pending</span>
                    </div>
                  )}
                </div>

                <div className="book-shelf__copy">
                  <div>
                    <p className="book-shelf__eyebrow">Published {formatDate(book.publishedAt)}</p>
                    <h2>{book.title}</h2>
                    {book.subtitle ? <p className="book-shelf__subtitle">{book.subtitle}</p> : null}
                    {book.authorName ? <p className="book-shelf__author">by {book.authorName}</p> : null}
                  </div>

                  <p className="book-shelf__description">{book.description || 'No description provided yet.'}</p>

                  <div className="book-shelf__tags">
                    {book.genre ? <span>{book.genre}</span> : null}
                    {book.audience ? <span>{book.audience}</span> : null}
                    {book.language ? <span>{String(book.language).toUpperCase()}</span> : null}
                    {book.wordCount ? <span>{Number(book.wordCount).toLocaleString()} words</span> : null}
                  </div>

                  <div className="book-shelf__actions">
                    <Link className="book-shelf__button book-shelf__button--primary" to={readerPath}>
                      Read online
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
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && books.length > 0 ? (
          <section className="book-shelf__closing">
            <div>
              <p className="pill">Publish more</p>
              <h2>Keep adding public editions as they are ready.</h2>
              <p>
                The bookshelf is designed to grow with the site. As more books are published, they appear here as a
                clean public catalog with direct reader and download links.
              </p>
            </div>
            <div className="book-shelf__actions">
              <Link className="book-shelf__button book-shelf__button--primary" to="/books/publish">
                Publish a new edition
              </Link>
              <Link className="book-shelf__button" to="/books">
                Return to books
              </Link>
            </div>
          </section>
        ) : null}
      </section>
    </>
  );
}
