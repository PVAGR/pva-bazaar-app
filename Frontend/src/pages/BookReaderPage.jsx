import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { fetchPublicBookProject, getApiBase } from '../lib/api';
import { fetchManuscriptFromMirrors } from '../lib/manuscriptArchives';
import { findLocalPublishedBookBySlug } from '../lib/localBookVault';
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
  const [manuscriptText, setManuscriptText] = useState('');
  const [manuscriptLoading, setManuscriptLoading] = useState(false);
  const [viewMode, setViewMode] = useState('iframe');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      setManuscriptText('');
      try {
        const data = await fetchPublicBookProject(slug);
        if (!data?.ok || !data?.item) {
          throw new Error(data?.error || 'Book not found');
        }
        if (!cancelled) setBook(data.item);
      } catch (err) {
        const localBook = findLocalPublishedBookBySlug(slug);
        if (!cancelled && localBook) {
          setBook(localBook);
          setError('');
        } else if (!cancelled) {
          setError(err.message || 'Failed to load book');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!book || manuscriptText) return;
    let cancelled = false;
    setManuscriptLoading(true);
    fetchManuscriptFromMirrors(book)
      .then((text) => {
        if (!cancelled && text && text.length > 100) {
          setManuscriptText(text);
          if (!book.links?.apiView) setViewMode('markdown');
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setManuscriptLoading(false); });
    return () => { cancelled = true; };
  }, [book, manuscriptText]);

  const viewLinks = useMemo(() => {
    if (!book?.links) return null;
    return {
      apiView: toApiUrl(book.links.apiView),
      pdf: toApiUrl(book.links.pdf),
      epub: toApiUrl(book.links.epub),
      docx: toApiUrl(book.links.docx),
      viewDocx: toApiUrl(book.links.viewDocx),
      frontCover: book.links.frontCover ? toApiUrl(book.links.frontCover) : '',
      backCover: book.links.backCover ? toApiUrl(book.links.backCover) : '',
    };
  }, [book]);

  const readerIframeSrc = viewLinks?.apiView || '';

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
              {viewLinks?.docx ? <a className="book-reader__button" href={viewLinks.docx} target="_blank" rel="noreferrer">DOCX</a> : null}
              {viewLinks?.viewDocx ? <a className="book-reader__button" href={viewLinks.viewDocx} target="_blank" rel="noreferrer">Read DOCX on site</a> : null}
            </div>
          </aside>
        </header>

        <section className="book-reader__grid">
          <article className="book-reader__card">
            <h2>Reader view</h2>

            {loading ? <p className="book-reader__muted">Loading book…</p> : null}
            {error ? <div className="book-reader__error" role="alert">{error}</div> : null}

            {!loading && !error && readerIframeSrc && manuscriptText ? (
              <div className="book-reader__tabs">
                <button className={`book-reader__tab ${viewMode === 'iframe' ? 'is-active' : ''}`} onClick={() => setViewMode('iframe')}>
                  Rendered view
                </button>
                <button className={`book-reader__tab ${viewMode === 'markdown' ? 'is-active' : ''}`} onClick={() => setViewMode('markdown')}>
                  Plain text
                </button>
              </div>
            ) : null}

            {!loading && !error && viewMode === 'iframe' && readerIframeSrc ? (
              <div className="book-reader__iframeWrap">
                <iframe
                  src={readerIframeSrc}
                  title={`${book?.title || 'Book'} reader`}
                  className="book-reader__iframe"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            ) : null}

            {!loading && !error && viewMode === 'markdown' && manuscriptText ? (
              <div className="book-reader__localRender">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                  {manuscriptText}
                </ReactMarkdown>
              </div>
            ) : null}

            {!loading && !error && manuscriptLoading ? (
              <p className="book-reader__muted">Loading manuscript text…</p>
            ) : null}

            {!loading && !error && !readerIframeSrc && !manuscriptText && !manuscriptLoading ? (
              <p className="book-reader__muted">This book does not have rendered content yet.</p>
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

            {book?.mirrors ? (
              <div className="book-reader__archives">
                <h3>Archive mirrors</h3>
                <ul className="book-reader__archiveList">
                  {book.mirrors.archiveOrg ? <li>✓ Internet Archive</li> : null}
                  {book.mirrors.pinata ? <li>✓ Pinata IPFS</li> : null}
                  {book.mirrors.ipfs ? <li>✓ IPFS</li> : null}
                  {book.mirrors.storacha ? <li>✓ Storacha</li> : null}
                  {!book.mirrors.archiveOrg && !book.mirrors.pinata && !book.mirrors.ipfs && !book.mirrors.storacha ? <li>No archive mirrors</li> : null}
                </ul>
              </div>
            ) : null}

            {viewLinks?.frontCover ? (
              <div className="book-reader__cover">
                <h3>Front cover</h3>
                <img src={viewLinks.frontCover} alt={`${book?.title || 'Book'} front cover`} loading="lazy" />
              </div>
            ) : null}
            {viewLinks?.backCover ? (
              <div className="book-reader__cover">
                <h3>Back cover</h3>
                <img src={viewLinks.backCover} alt={`${book?.title || 'Book'} back cover`} loading="lazy" />
              </div>
            ) : null}

            {viewLinks?.apiView ? (
              <div className="book-reader__actions">
                <a className="book-reader__button" href={viewLinks.apiView} target="_blank" rel="noreferrer">Open API view</a>
                {viewLinks.pdf ? <a className="book-reader__button" href={viewLinks.pdf} target="_blank" rel="noreferrer">Download PDF</a> : null}
                {viewLinks.docx ? <a className="book-reader__button" href={viewLinks.docx} target="_blank" rel="noreferrer">Download DOCX</a> : null}
                {viewLinks.viewDocx ? <a className="book-reader__button" href={viewLinks.viewDocx} target="_blank" rel="noreferrer">Read DOCX on site</a> : null}
              </div>
            ) : null}
          </aside>
        </section>
      </section>
    </>
  );
}
