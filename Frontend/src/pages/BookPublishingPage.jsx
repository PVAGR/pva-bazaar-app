import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { deleteBookProject, fetchMyBookProjects, getApiBase, saveBookProject } from '../lib/api';
import './BookPublishingPage.css';

const EMPTY_FORM = {
  bookId: '',
  title: '',
  subtitle: '',
  authorName: '',
  slug: '',
  description: '',
  genre: 'general',
  audience: 'general',
  language: 'en',
  manuscriptMarkdown: '',
};

function toApiUrl(path) {
  const base = getApiBase().replace(/\/+$/, '');
  const normalized = base.endsWith('/api') && path.startsWith('/api/') ? path.slice(4) : path;
  return `${base}${normalized}`;
}

function countWords(text) {
  return String(text || '')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean).length;
}

export default function BookPublishingPage() {
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [frontCoverFile, setFrontCoverFile] = useState(null);
  const [backCoverFile, setBackCoverFile] = useState(null);
  const [frontCoverPreview, setFrontCoverPreview] = useState('');
  const [backCoverPreview, setBackCoverPreview] = useState('');
  const [manuscriptFileName, setManuscriptFileName] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedBook = useMemo(
    () => books.find((item) => item.id === selectedBookId) || null,
    [books, selectedBookId],
  );

  const wordCount = useMemo(() => countWords(form.manuscriptMarkdown), [form.manuscriptMarkdown]);
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 300));

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (!selectedBook) return;
    setForm({
      bookId: selectedBook.id || '',
      title: selectedBook.title || '',
      subtitle: selectedBook.subtitle || '',
      authorName: selectedBook.authorName || '',
      slug: selectedBook.slug || '',
      description: selectedBook.description || '',
      genre: selectedBook.genre || 'general',
      audience: selectedBook.audience || 'general',
      language: selectedBook.language || 'en',
      manuscriptMarkdown: selectedBook.manuscriptMarkdown || '',
    });
    setFrontCoverPreview(selectedBook.links?.frontCover ? toApiUrl(selectedBook.links.frontCover) : '');
    setBackCoverPreview(selectedBook.links?.backCover ? toApiUrl(selectedBook.links.backCover) : '');
    setFrontCoverFile(null);
    setBackCoverFile(null);
    setManuscriptFileName('');
  }, [selectedBook]);

  async function loadBooks() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyBookProjects();
      if (!data?.ok) {
        throw new Error(data?.error || 'Failed to load your books');
      }
      const items = Array.isArray(data.items) ? data.items : [];
      setBooks(items);
      if (!selectedBookId && items.length) {
        setSelectedBookId(items[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load your books');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedBookId('');
    setForm(EMPTY_FORM);
    setFrontCoverFile(null);
    setBackCoverFile(null);
    setFrontCoverPreview('');
    setBackCoverPreview('');
    setManuscriptFileName('');
  }

  function selectBook(book) {
    setSelectedBookId(book.id);
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCoverChange(event, setFile, setPreview) {
    const file = event.target.files?.[0] || null;
    setFile(file);
    if (!file) {
      setPreview('');
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  function handleManuscriptFile(event) {
    const file = event.target.files?.[0] || null;
    setManuscriptFileName(file?.name || '');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        manuscriptMarkdown: String(reader.result || ''),
      }));
    };
    reader.readAsText(file);
  }

  async function submitBook(publish) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = new FormData();
      if (form.bookId) payload.append('bookId', form.bookId);
      payload.append('title', form.title);
      payload.append('subtitle', form.subtitle);
      payload.append('authorName', form.authorName);
      payload.append('slug', form.slug);
      payload.append('description', form.description);
      payload.append('genre', form.genre);
      payload.append('audience', form.audience);
      payload.append('language', form.language);
      payload.append('manuscriptMarkdown', form.manuscriptMarkdown);
      payload.append('publish', publish ? 'true' : 'false');
      if (frontCoverFile) payload.append('frontCover', frontCoverFile);
      if (backCoverFile) payload.append('backCover', backCoverFile);

      const data = await saveBookProject(payload);
      if (!data?.ok || !data?.item) {
        throw new Error(data?.error || 'Failed to save book');
      }

      const saved = data.item;
      setSuccess(
        publish
          ? `"${saved.title}" is published and ready for web, PDF, and EPUB delivery.`
          : `"${saved.title}" was saved as a draft.`,
      );
      await loadBooks();
      setSelectedBookId(saved.id);
    } catch (err) {
      setError(err.message || 'Failed to save book');
    } finally {
      setSaving(false);
    }
  }

  async function removeBook(bookId) {
    if (!window.confirm('Delete this book project? This removes the draft and attached local cover files.')) {
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const data = await deleteBookProject(bookId);
      if (!data?.ok) {
        throw new Error(data?.error || 'Failed to delete book');
      }
      setSuccess('Book project deleted.');
      resetForm();
      await loadBooks();
    } catch (err) {
      setError(err.message || 'Failed to delete book');
    } finally {
      setSaving(false);
    }
  }

  const activeDownloadLinks = selectedBook ? {
    pdf: toApiUrl(selectedBook.links.pdf),
    epub: toApiUrl(selectedBook.links.epub),
    apiView: toApiUrl(selectedBook.links.apiView),
    publicPage: selectedBook.links.publicPage || '',
    frontCover: selectedBook.links.frontCover ? toApiUrl(selectedBook.links.frontCover) : '',
    backCover: selectedBook.links.backCover ? toApiUrl(selectedBook.links.backCover) : '',
  } : null;

  return (
    <>
      <Helmet>
        <title>Book Publishing · PVA Bazaar</title>
        <meta
          name="description"
          content="Publish books with front cover, back cover, manuscript editing, web view, PDF, and EPUB output."
        />
      </Helmet>

      <section className="book-publish section-card">
        <header className="book-publish__hero">
          <div>
            <p className="pill">Book publishing</p>
            <h1>Publish your work as a real book.</h1>
            <p className="book-publish__lead">
              Use this workspace to prepare the title, subtitle, author line, front cover, back cover, manuscript,
              and publish output. One book can become a public web view, PDF, and EPUB without splitting the source
              into separate systems.
            </p>
          </div>

          <aside className="book-publish__heroPanel">
            <h2>Publishing lanes</h2>
            <ul>
              <li>Draft the manuscript in the editor or upload a text file.</li>
              <li>Attach front and back covers as images.</li>
              <li>Save as a draft or publish immediately.</li>
              <li>Share the public web reader, PDF, or EPUB once published.</li>
            </ul>
            <div className="book-publish__heroActions">
              <Link className="book-publish__button" to="/books">Back to books</Link>
              <Link className="book-publish__button book-publish__button--primary" to="/books">
                Open the books page
              </Link>
            </div>
          </aside>
        </header>

        <section className="book-publish__atlas section-card">
          <h2>Publishing atlas</h2>
          <p>Move between the book launch, archive, recovery, and marketplace without losing your place.</p>
          <div className="book-publish__atlasLinks">
            <Link className="book-publish__button" to="/">Home</Link>
            <Link className="book-publish__button" to="/archive">Archive</Link>
            <Link className="book-publish__button" to="/recovery">Recovery</Link>
            <Link className="book-publish__button" to="/marketplace">Marketplace</Link>
            <Link className="book-publish__button" to="/creator">Supplier Portal</Link>
          </div>
        </section>

        <div className="book-publish__grid">
          <section className="book-publish__panel">
            <div className="book-publish__panelHeader">
              <div>
                <p className="pill">Your books</p>
                <h2>Drafts and published editions</h2>
              </div>
              <button type="button" className="book-publish__button" onClick={resetForm}>
                New book
              </button>
            </div>

            {loading ? <p className="book-publish__muted">Loading your books…</p> : null}
            {error ? <div className="book-publish__error" role="alert">{error}</div> : null}
            {success ? <div className="book-publish__success" role="status">{success}</div> : null}

            <div className="book-publish__list">
              {books.length ? books.map((book) => (
                <article
                  key={book.id}
                  className={`book-publish__listItem ${book.id === selectedBookId ? 'is-selected' : ''}`}
                >
                  <button type="button" className="book-publish__listButton" onClick={() => selectBook(book)}>
                    <strong>{book.title}</strong>
                    <span>{book.status} · {book.wordCount || 0} words</span>
                    {book.subtitle ? <em>{book.subtitle}</em> : null}
                  </button>
                  <div className="book-publish__listActions">
                    <button type="button" className="book-publish__button" onClick={() => selectBook(book)}>
                      Edit
                    </button>
                    {book.status === 'published' && book.links?.publicPage ? (
                      <Link className="book-publish__button" to={book.links.publicPage}>
                        Reader page
                      </Link>
                    ) : null}
                    {book.links?.apiView ? (
                      <a className="book-publish__button" href={toApiUrl(book.links.apiView)} target="_blank" rel="noreferrer">
                        API view
                      </a>
                    ) : null}
                  </div>
                </article>
              )) : (
                <p className="book-publish__muted">No book projects yet. Start a new one on the right.</p>
              )}
            </div>
          </section>

          <section className="book-publish__panel book-publish__panel--editor">
            <div className="book-publish__panelHeader">
              <div>
                <p className="pill">{form.bookId ? 'Edit book' : 'Create book'}</p>
                <h2>{form.title || 'Untitled book'}</h2>
              </div>
              <div className="book-publish__stats">
                <span>{wordCount} words</span>
                <span>~{estimatedPages} pages</span>
              </div>
            </div>

            <div className="book-publish__form">
              <label>
                Title
                <input name="title" value={form.title} onChange={handleFieldChange} placeholder="Your book title" />
              </label>
              <label>
                Subtitle
                <input name="subtitle" value={form.subtitle} onChange={handleFieldChange} placeholder="Optional subtitle" />
              </label>
              <label>
                Author name
                <input name="authorName" value={form.authorName} onChange={handleFieldChange} placeholder="Author or pen name" />
              </label>
              <label>
                Slug
                <input name="slug" value={form.slug} onChange={handleFieldChange} placeholder="optional-book-slug" />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFieldChange}
                  rows={4}
                  placeholder="Short back-cover style summary"
                />
              </label>

              <div className="book-publish__row">
                <label>
                  Genre
                  <input name="genre" value={form.genre} onChange={handleFieldChange} placeholder="general" />
                </label>
                <label>
                  Audience
                  <input name="audience" value={form.audience} onChange={handleFieldChange} placeholder="general" />
                </label>
                <label>
                  Language
                  <input name="language" value={form.language} onChange={handleFieldChange} placeholder="en" />
                </label>
              </div>

              <label>
                Front cover image
                <input type="file" accept="image/*" onChange={(e) => handleCoverChange(e, setFrontCoverFile, setFrontCoverPreview)} />
              </label>
              <label>
                Back cover image
                <input type="file" accept="image/*" onChange={(e) => handleCoverChange(e, setBackCoverFile, setBackCoverPreview)} />
              </label>
              <label>
                Manuscript file
                <input type="file" accept=".txt,.md,.markdown,.html,.htm,text/plain,text/markdown,text/html" onChange={handleManuscriptFile} />
              </label>
              {manuscriptFileName ? <p className="book-publish__muted">Loaded file: {manuscriptFileName}</p> : null}

              <label>
                Manuscript content
                <textarea
                  name="manuscriptMarkdown"
                  value={form.manuscriptMarkdown}
                  onChange={handleFieldChange}
                  rows={18}
                  placeholder={`# Chapter One\nYour manuscript text here.\n\n## Another section\nMore writing...`}
                />
              </label>
            </div>

            <div className="book-publish__editorActions">
              <button type="button" className="book-publish__button" onClick={() => submitBook(false)} disabled={saving}>
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" className="book-publish__button book-publish__button--primary" onClick={() => submitBook(true)} disabled={saving}>
                {saving ? 'Publishing…' : 'Save and publish'}
              </button>
              {form.bookId ? (
                <button type="button" className="book-publish__button book-publish__button--danger" onClick={() => removeBook(form.bookId)} disabled={saving}>
                  Delete book
                </button>
              ) : null}
            </div>

            {selectedBook ? (
              <div className="book-publish__links">
                <h3>Published links</h3>
                <div className="book-publish__linkGrid">
                  {selectedBook.links?.publicPage ? (
                    <Link className="book-publish__button" to={selectedBook.links.publicPage}>
                      Open reader page
                    </Link>
                  ) : null}
                  {activeDownloadLinks?.apiView ? (
                    <a className="book-publish__button" href={activeDownloadLinks.apiView} target="_blank" rel="noreferrer">
                      API web view
                    </a>
                  ) : null}
                  {activeDownloadLinks?.pdf ? (
                    <a className="book-publish__button" href={activeDownloadLinks.pdf} target="_blank" rel="noreferrer">
                      Download PDF
                    </a>
                  ) : null}
                  {activeDownloadLinks?.epub ? (
                    <a className="book-publish__button" href={activeDownloadLinks.epub} target="_blank" rel="noreferrer">
                      Download EPUB
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <section className="book-publish__previewPanel section-card">
          <div className="book-publish__previewHeader">
            <div>
              <p className="pill">Live preview</p>
              <h2>{form.title || 'Book preview'}</h2>
            </div>
            <div className="book-publish__previewMeta">
              <span>{wordCount} words</span>
              <span>~{estimatedPages} pages</span>
            </div>
          </div>

          <div className="book-publish__previewGrid">
            <article className="book-publish__previewCard">
              <h3>Front cover</h3>
              {frontCoverPreview ? (
                <img src={frontCoverPreview} alt="Front cover preview" />
              ) : selectedBook?.links?.frontCover ? (
                <img src={toApiUrl(selectedBook.links.frontCover)} alt="Front cover preview" />
              ) : (
                <p className="book-publish__muted">No front cover selected yet.</p>
              )}
            </article>
            <article className="book-publish__previewCard">
              <h3>Back cover</h3>
              {backCoverPreview ? (
                <img src={backCoverPreview} alt="Back cover preview" />
              ) : selectedBook?.links?.backCover ? (
                <img src={toApiUrl(selectedBook.links.backCover)} alt="Back cover preview" />
              ) : (
                <p className="book-publish__muted">No back cover selected yet.</p>
              )}
            </article>
          </div>

          <article className="book-publish__reader">
            <h3>Reader view</h3>
            <div className="book-publish__readerBody">
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {form.manuscriptMarkdown || 'Add manuscript text to see a live reader preview.'}
              </ReactMarkdown>
            </div>
          </article>
        </section>
      </section>
    </>
  );
}
