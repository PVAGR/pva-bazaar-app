import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { fetchPublicBookProject, getApiBase } from '../lib/api';
import { findLocalPublishedBookBySlug } from '../lib/localBookVault';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import './BookReaderPage.css';

function toApiUrl(path) {
  if (!path || /^data:|^blob:|^https?:/i.test(path)) return path;
  const base = getApiBase().replace(/\/+$/, '');
  const normalized = base.endsWith('/api') && path.startsWith('/api/') ? path.slice(4) : path;
  return `${base}${normalized}`;
}

export default function BookReaderPage() {
  const { slug } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPublicBookProject(slug);
        if (!data?.ok || !data?.item) {
          throw new Error(data?.error || 'Book not found');
        }
        if (!cancelled) setBook(data.item);
      } catch (err) {
        const localBook = findLocalPublishedBookBySlug(slug);
        if (!cancelled) setError(err.message || 'Failed to load book');
        if (!cancelled && localBook) {
          setBook(localBook);
          setError('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const viewLinks = useMemo(() => {
    if (!book?.links) return null;
    return {
      apiView: toApiUrl(book.links.apiView),
      pdf: toApiUrl(book.links.pdf),
      epub: toApiUrl(book.links.epub),
      frontCover: book.links.frontCover ? toApiUrl(book.links.frontCover) : '',
      backCover: book.links.backCover ? toApiUrl(book.links.backCover) : '',
    };
  }, [book]);

  return (
    <>
      <Helmet>
        <title>{book?.title ? `${book.title} · PVA Bazaar` : 'Book Reader · PVA Bazaar'}</title>
        <meta
          name="description"
          content={book?.description || 'Published book reader on PVA Bazaar.'}
        />
      </Helmet>

      <section className="book-reader section-card">
        <header className="book-reader__hero">
          <div>
            <p className="pill">Published book</p>
            <h1>{book?.title || 'Book reader'}</h1>
            {book?.subtitle ? <p className="book-reader__subtitle">{book.subtitle}</p> : null}
            {book?.authorName ? <p className="book-reader__author">by {book.authorName}</p> : null}
            {book?.description ? <p className="book-reader__lead">{book.description}</p> : null}
          </div>
          <aside className="book-reader__panel">
            <h2>Download and return</h2>
            <div className="book-reader__actions">
              <Link className="book-reader__button" to="/books">Back to books</Link>
              <Link className="book-reader__button" to="/books/published">Browse bookshelf</Link>
              <Link className="book-reader__button" to="/books/publish">Publish a book</Link>
              {viewLinks?.pdf ? <a className="book-reader__button book-reader__button--primary" href={viewLinks.pdf} target="_blank" rel="noreferrer">PDF</a> : null}
              {viewLinks?.epub ? <a className="book-reader__button" href={viewLinks.epub} target="_blank" rel="noreferrer">EPUB</a> : null}
            </div>
          </aside>
        </header>

        <section className="book-reader__grid">
          <article className="book-reader__card">
            <h2>Reader view</h2>
            {loading ? <p className="book-reader__muted">Loading book…</p> : null}
            {error ? <div className="book-reader__error" role="alert">{error}</div> : null}
            {!loading && !error && book?.webHtml ? (
              <div className="book-reader__html" dangerouslySetInnerHTML={{ __html: book.webHtml }} />
            ) : null}
            {!loading && !error && !book?.webHtml && book?.manuscriptMarkdown ? (
              <div className="book-reader__html">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{book.manuscriptMarkdown}</ReactMarkdown>
              </div>
            ) : null}
            {!loading && !error && !book?.webHtml && !book?.manuscriptMarkdown ? (
              <p className="book-reader__muted">This book does not have rendered HTML yet.</p>
            ) : null}
          </article>

          <aside className="book-reader__card">
            <h2>Book details</h2>
            <ul className="book-reader__meta">
              {book?.genre ? <li><strong>Genre:</strong> {book.genre}</li> : null}
              {book?.audience ? <li><strong>Audience:</strong> {book.audience}</li> : null}
              {book?.language ? <li><strong>Language:</strong> {book.language}</li> : null}
              {book?.wordCount ? <li><strong>Words:</strong> {book.wordCount}</li> : null}
              {book?.status ? <li><strong>Status:</strong> {book.status}</li> : null}
            </ul>

            {viewLinks?.frontCover ? (
              <div className="book-reader__cover">
                <h3>Front cover</h3>
                <img src={viewLinks.frontCover} alt={`${book?.title || 'Book'} front cover`} />
              </div>
            ) : null}
            {viewLinks?.backCover ? (
              <div className="book-reader__cover">
                <h3>Back cover</h3>
                <img src={viewLinks.backCover} alt={`${book?.title || 'Book'} back cover`} />
              </div>
            ) : null}

            {viewLinks?.apiView ? (
              <div className="book-reader__actions">
                <a className="book-reader__button" href={viewLinks.apiView} target="_blank" rel="noreferrer">Open API view</a>
                {viewLinks.pdf ? <a className="book-reader__button" href={viewLinks.pdf} target="_blank" rel="noreferrer">Download PDF</a> : null}
                {viewLinks.epub ? <a className="book-reader__button" href={viewLinks.epub} target="_blank" rel="noreferrer">Download EPUB</a> : null}
              </div>
            ) : null}
          </aside>
        </section>
      </section>
    </>
  );
}
