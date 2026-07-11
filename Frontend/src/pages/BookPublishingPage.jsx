import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import {
  deleteBookProject,
  fetchMyBookProjects,
  getApiBase,
  saveBookProject,
} from '../lib/api';
import {
  deleteLocalBookProject,
  listLocalBookProjects,
  saveLocalBookProject,
} from '../lib/localBookVault';
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
  if (!path || /^data:|^blob:|^https?:/i.test(path)) return path;
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

function normalizeBookKey(book) {
  return String(book?.slug || book?.id || book?._id || '')
    .trim()
    .toLowerCase();
}

function mergeBooksByKey(primary = [], secondary = []) {
  const merged = [];
  const seen = new Set();
  for (const book of [...primary, ...secondary]) {
    const key = normalizeBookKey(book);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(book);
  }
  return merged;
}

async function fileToDataUrl(file) {
  if (!file) return '';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(dataUrl, filename, fallbackType = 'application/octet-stream') {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename || 'asset', { type: blob.type || fallbackType });
}

async function extractDocxText(file) {
  if (!file) return '';
  const mammoth = await import('mammoth/mammoth.browser');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return String(result?.value || '').trim();
}

async function buildRemotePayloadFromBook(book) {
  const payload = new FormData();
  if (book?.id) payload.append('bookId', book.id);
  payload.append('title', book?.title || '');
  payload.append('subtitle', book?.subtitle || '');
  payload.append('authorName', book?.authorName || '');
  payload.append('slug', book?.slug || '');
  payload.append('description', book?.description || '');
  payload.append('genre', book?.genre || 'general');
  payload.append('audience', book?.audience || 'general');
  payload.append('language', book?.language || 'en');
  payload.append('manuscriptMarkdown', book?.manuscriptMarkdown || '');
  payload.append('publish', book?.status === 'published' ? 'true' : 'false');

  const frontCoverFile = await dataUrlToFile(
    book?.frontCover?.url || '',
    book?.frontCover?.originalName || `${book?.slug || 'book'}-front-cover`,
    book?.frontCover?.mimeType || 'image/png',
  );
  const backCoverFile = await dataUrlToFile(
    book?.backCover?.url || '',
    book?.backCover?.originalName || `${book?.slug || 'book'}-back-cover`,
    book?.backCover?.mimeType || 'image/png',
  );

  if (frontCoverFile) payload.append('frontCover', frontCoverFile);
  if (backCoverFile) payload.append('backCover', backCoverFile);

  return payload;
}

export default function BookPublishingPage() {
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [frontCoverFile, setFrontCoverFile] = useState(null);
  const [backCoverFile, setBackCoverFile] = useState(null);
  const [frontCoverPreview, setFrontCoverPreview] = useState('');
  const [backCoverPreview, setBackCoverPreview] = useState('');
  const [manuscriptFile, setManuscriptFile] = useState(null);
  const [manuscriptFileName, setManuscriptFileName] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const frontCoverInputRef = useRef(null);
  const backCoverInputRef = useRef(null);
  const manuscriptInputRef = useRef(null);
  const syncInFlightRef = useRef(false);

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
    setManuscriptFile(null);
    setManuscriptFileName('');
  }, [selectedBook]);

  async function syncLocalPublishedBooks(remoteBooks = [], localBooks = []) {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      const remoteSlugs = new Set(
        (remoteBooks || [])
          .map((book) => String(book?.slug || '').trim().toLowerCase())
          .filter(Boolean),
      );
      const candidates = (localBooks || []).filter((book) => {
        const isPublished = String(book?.status || '').toLowerCase() === 'published';
        const slug = String(book?.slug || '').trim().toLowerCase();
        return isPublished && slug && !remoteSlugs.has(slug);
      });

      if (!candidates.length) return;

      let syncedCount = 0;
      const syncedItems = [];
      for (const localBook of candidates) {
        try {
          const payload = await buildRemotePayloadFromBook(localBook);
          const data = await saveBookProject(payload);
          if (data?.ok && data?.item) {
            syncedCount += 1;
            syncedItems.push(data.item);
          }
        } catch (_err) {
          // Keep syncing the remaining local books.
        }
      }

      if (syncedItems.length) {
        setBooks((prev) => {
          const next = [...prev];
          for (const item of syncedItems) {
            const key = String(item?.id || item?._id || '').trim();
            const slug = String(item?.slug || '').trim().toLowerCase();
            const filtered = next.filter((book) => {
              const bookKey = String(book?.id || book?._id || '').trim();
              const bookSlug = String(book?.slug || '').trim().toLowerCase();
              return bookKey !== key && bookSlug !== slug;
            });
            filtered.unshift(item);
            next.splice(0, next.length, ...filtered);
          }
          return next;
        });
        setSelectedBookId(String(syncedItems[0]?.id || syncedItems[0]?._id || selectedBookId || ''));
      }

      if (syncedCount > 0) {
        setSuccess((prev) => prev || `${syncedCount} local published book${syncedCount === 1 ? '' : 's'} synced online.`);
      }
    } finally {
      syncInFlightRef.current = false;
    }
  }

  async function syncQueuedPublishDrafts(remoteBooks = [], localBooks = []) {
    const remoteSlugs = new Set(
      (remoteBooks || [])
        .map((book) => String(book?.slug || '').trim().toLowerCase())
        .filter(Boolean),
    );
    const queued = (localBooks || []).filter((book) => {
      const slug = String(book?.slug || '').trim().toLowerCase();
      return Boolean(book?.pendingPublish) && slug && !remoteSlugs.has(slug);
    });

    if (!queued.length) return;

    let syncedCount = 0;
    const syncedItems = [];
    for (const localBook of queued) {
      try {
        const payload = await buildRemotePayloadFromBook(localBook);
        payload.set('publish', 'true');
        const data = await saveBookProject(payload);
        if (data?.ok && data?.item) {
          syncedCount += 1;
          syncedItems.push(data.item);
          saveLocalBookProject({
            ...localBook,
            pendingPublish: false,
            status: 'published',
            publishedAt: data.item.publishedAt || new Date().toISOString(),
            slug: data.item.slug || localBook.slug,
            title: data.item.title || localBook.title,
            subtitle: data.item.subtitle || localBook.subtitle,
            authorName: data.item.authorName || localBook.authorName,
            description: data.item.description || localBook.description,
            genre: data.item.genre || localBook.genre,
            audience: data.item.audience || localBook.audience,
            language: data.item.language || localBook.language,
            manuscriptMarkdown: data.item.manuscriptMarkdown || localBook.manuscriptMarkdown,
          });
        }
      } catch (_err) {
        // Keep trying queued books individually.
      }
    }

    if (syncedItems.length) {
      setBooks((prev) => {
        const next = [...prev];
        for (const item of syncedItems) {
          const key = normalizeBookKey(item);
          const filtered = next.filter((book) => normalizeBookKey(book) !== key);
          filtered.unshift(item);
          next.splice(0, next.length, ...filtered);
        }
        return next;
      });
      setSelectedBookId(String(syncedItems[0]?.id || syncedItems[0]?._id || selectedBookId || ''));
    }

    if (syncedCount > 0) {
      setSuccess((prev) => prev || `${syncedCount} queued publish${syncedCount === 1 ? '' : 'es'} synced online.`);
    }
  }

  async function loadBooks() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyBookProjects();
      if (!data?.ok) {
        throw new Error(data?.error || 'Failed to load your books');
      }
      const items = Array.isArray(data.items) ? data.items : [];
      const localItems = listLocalBookProjects();
      const merged = mergeBooksByKey(items, localItems);
      setBooks(merged);
      if (!selectedBookId && items.length) {
        setSelectedBookId(items[0].id);
      } else if (!selectedBookId && localItems.length) {
        setSelectedBookId(localItems[0].id);
      }
      if (items.length || localItems.length) {
        void syncLocalPublishedBooks(items, localItems);
        void syncQueuedPublishDrafts(items, localItems);
      }
    } catch (err) {
      const localItems = listLocalBookProjects();
      setBooks(localItems);
      if (!selectedBookId && localItems.length) {
        setSelectedBookId(localItems[0].id);
      }
      if (!localItems.length) {
        setError(err.message || 'Failed to load your books');
      }
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedBookId('');
    setForm(EMPTY_FORM);
    setFrontCoverFile(null);
    setBackCoverFile(null);
    setManuscriptFile(null);
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

  async function handleManuscriptFile(event) {
    const file = event.target.files?.[0] || null;
    setManuscriptFile(file);
    setManuscriptFileName(file?.name || '');
    if (!file) return;

    const isDocx =
      file.name.toLowerCase().endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isPdf =
      file.name.toLowerCase().endsWith('.pdf') ||
      file.type === 'application/pdf';

    if (isDocx || isPdf) {
      if (isDocx) {
        try {
          const extracted = await extractDocxText(file);
          setForm((prev) => ({
            ...prev,
            manuscriptMarkdown: extracted,
          }));
          return;
        } catch (_err) {
          // Keep the file attached and let the save path try again server-side.
        }
      }

      setForm((prev) => ({ ...prev, manuscriptMarkdown: '' }));
      return;
    }

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
      const buildPayload = () => {
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
        if (manuscriptFile) payload.append('manuscriptFile', manuscriptFile);
        payload.append('publish', publish ? 'true' : 'false');
        if (frontCoverFile) payload.append('frontCover', frontCoverFile);
        if (backCoverFile) payload.append('backCover', backCoverFile);
        return payload;
      };

      const saveViaLocalVault = async () => {
        const [frontCoverDataUrl, backCoverDataUrl] = await Promise.all([
          frontCoverFile ? fileToDataUrl(frontCoverFile) : Promise.resolve(''),
          backCoverFile ? fileToDataUrl(backCoverFile) : Promise.resolve(''),
        ]);
        const localSaved = saveLocalBookProject({
          bookId: form.bookId || '',
          title: form.title,
          subtitle: form.subtitle,
          authorName: form.authorName,
          slug: form.slug,
          description: form.description,
          genre: form.genre,
          audience: form.audience,
          language: form.language,
          manuscriptMarkdown: form.manuscriptMarkdown,
          status: publish ? 'published' : 'draft',
          publishedAt: publish ? new Date().toISOString() : null,
          frontCover: frontCoverDataUrl
            ? {
              provider: 'local',
              url: frontCoverDataUrl,
              originalName: frontCoverFile?.name || '',
              mimeType: frontCoverFile?.type || '',
              size: frontCoverFile?.size || 0,
            }
            : undefined,
          backCover: backCoverDataUrl
            ? {
              provider: 'local',
              url: backCoverDataUrl,
              originalName: backCoverFile?.name || '',
              mimeType: backCoverFile?.type || '',
              size: backCoverFile?.size || 0,
            }
            : undefined,
        });
        setBooks((prev) => {
          const next = prev.filter((book) => String(book.id) !== String(localSaved.id));
          return [localSaved, ...next].sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
        });
        setSelectedBookId(localSaved.id);
        if (localSaved._storageError) {
          setError(localSaved._storageError);
          setSuccess('');
        } else {
          const storageNote = localSaved._storageWarning ? ` Note: ${localSaved._storageWarning}` : '';
          setSuccess(
            `${publish
              ? `"${localSaved.title}" is published locally on this device and ready to view.`
              : `"${localSaved.title}" was saved locally as a draft.`}${storageNote}`,
          );
        }
        return localSaved;
      };

      try {
        const remoteData = await saveBookProject(buildPayload());
        if (!remoteData?.ok || !remoteData?.item) {
          throw new Error(remoteData?.error || 'Failed to save book');
        }

        const saved = remoteData.item;
        setBooks((prev) => {
          const withoutDuplicate = prev.filter((book) => {
            const sameRemoteId = String(book.id || '') === String(saved.id || '');
            const sameSlug = normalizeBookKey(book) === normalizeBookKey(saved);
            return !(sameRemoteId || sameSlug);
          });
          return [saved, ...withoutDuplicate].sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
        });
        setSelectedBookId(saved.id);
        setSuccess(
          publish
            ? `"${saved.title}" is published and live for web, PDF, and EPUB delivery.`
            : `"${saved.title}" was saved as a draft.`,
        );

        void (async () => {
          try {
            const localSaved = await saveViaLocalVault();
            setBooks((prev) => {
              const withoutRemote = prev.filter((book) => {
                const sameRemoteId = String(book.id || '') === String(saved.id || '');
                const sameLocalSlug = normalizeBookKey(book) === normalizeBookKey(localSaved);
                return !(sameRemoteId || sameLocalSlug);
              });
              return [saved, ...withoutRemote].sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));
            });
          } catch (_localBackupErr) {
            // Keep the online-published copy even if local backup fails.
          }
        })();

        return;
      } catch (networkErr) {
        if (publish) {
          const localSaved = saveLocalBookProject({
            bookId: form.bookId || '',
            title: form.title,
            subtitle: form.subtitle,
            authorName: form.authorName,
            slug: form.slug,
            description: form.description,
            genre: form.genre,
            audience: form.audience,
            language: form.language,
            manuscriptMarkdown: form.manuscriptMarkdown,
            status: 'draft',
            pendingPublish: true,
            frontCover: frontCoverFile
              ? {
                  provider: 'local',
                  url: await fileToDataUrl(frontCoverFile),
                  originalName: frontCoverFile?.name || '',
                  mimeType: frontCoverFile?.type || '',
                  size: frontCoverFile?.size || 0,
                }
              : undefined,
            backCover: backCoverFile
              ? {
                  provider: 'local',
                  url: await fileToDataUrl(backCoverFile),
                  originalName: backCoverFile?.name || '',
                  mimeType: backCoverFile?.type || '',
                  size: backCoverFile?.size || 0,
                }
              : undefined,
          });
          setBooks((prev) => mergeBooksByKey([localSaved], prev.filter((book) => normalizeBookKey(book) !== normalizeBookKey(localSaved))));
          setSelectedBookId(localSaved.id);
          setSuccess(`"${localSaved.title}" was saved locally and queued for online publishing. It is not live yet.`);
          setError('Online publish failed. The book is saved locally and will sync when the backend is reachable.');
        } else {
          const localSaved = await saveViaLocalVault();
          setSuccess(`"${localSaved.title}" was saved locally as a draft.`);
          setError('');
        }
      }
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
      deleteLocalBookProject(bookId);
      setSuccess('Book project deleted locally.');
      resetForm();
      await loadBooks();
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

  const manuscriptHint = manuscriptFileName
    ? (manuscriptFileName.toLowerCase().endsWith('.docx')
      ? `Loaded file: ${manuscriptFileName}. DOCX content is extracted into the editor, and save/publish will recheck it if needed.`
      : `Loaded file: ${manuscriptFileName}. PDF and DOCX are extracted on save if the backend is available.`)
    : 'Upload a DOCX or PDF manuscript, or paste text directly into the editor.';

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
              <Link className="book-publish__button" to="/books/published">Browse published books</Link>
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

              <div className="book-publish__field">
                <span>Front cover image</span>
                <div className="book-publish__fileRow">
                  <label className="book-publish__button book-publish__button--primary book-publish__fileButton" htmlFor="frontCoverUpload">
                    Choose front cover
                  </label>
                  <span className="book-publish__fileName">
                    {frontCoverFile?.name || 'PNG, JPG, or WEBP'}
                  </span>
                </div>
                <input
                  ref={frontCoverInputRef}
                  id="frontCoverUpload"
                  className="book-publish__nativeFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCoverChange(e, setFrontCoverFile, setFrontCoverPreview)}
                />
              </div>
              <div className="book-publish__field">
                <span>Back cover image</span>
                <div className="book-publish__fileRow">
                  <label className="book-publish__button book-publish__button--primary book-publish__fileButton" htmlFor="backCoverUpload">
                    Choose back cover
                  </label>
                  <span className="book-publish__fileName">
                    {backCoverFile?.name || 'PNG, JPG, or WEBP'}
                  </span>
                </div>
                <input
                  ref={backCoverInputRef}
                  id="backCoverUpload"
                  className="book-publish__nativeFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCoverChange(e, setBackCoverFile, setBackCoverPreview)}
                />
              </div>
              <div className="book-publish__field">
                <span>Manuscript file</span>
                <div className="book-publish__fileRow">
                  <button
                    type="button"
                    className="book-publish__button book-publish__button--primary book-publish__fileButton"
                    onClick={() => manuscriptInputRef.current?.click()}
                  >
                    Choose manuscript
                  </button>
                  <span className="book-publish__fileName">
                    {manuscriptFileName || 'DOCX, PDF, TXT, MD, or HTML'}
                  </span>
                </div>
                <input
                  ref={manuscriptInputRef}
                  id="manuscriptUpload"
                  className="book-publish__nativeFile book-publish__nativeFile--visible"
                  type="file"
                  accept=".docx,.pdf,.txt,.md,.markdown,.html,.htm,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown,text/html"
                  onChange={handleManuscriptFile}
                />
              </div>
              <p className="book-publish__muted">
                {manuscriptHint}
              </p>

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
