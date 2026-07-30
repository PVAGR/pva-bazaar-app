const BOOKS_KEY = 'pva:local-book-projects-v1';
const MAX_DATA_URL_BYTES = 250 * 1024;

// Internal helpers

function canUseStorage() { return typeof window !== 'undefined' && Boolean(window.localStorage); }

function readJson(key, fallback) {
  if (!canUseStorage()) return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_err) { return fallback; }
}
function writeJson(key, value) {
  if (!canUseStorage()) return { ok: false, message: 'localStorage is not available.' };
  const first = trySet(key, value);
  if (first.ok) return { ok: true, strippedImages: false, message: '' };
  if (!isQuotaError(first.error)) throw first.error;
  const trimmed = stripOversizedDataUrls(value);
  const second = trySet(key, trimmed);
  if (second.ok) { syncArrayInPlace(value, trimmed); return { ok: true, strippedImages: true, message: 'Large cover images were removed.' }; }
  if (!isQuotaError(second.error)) throw second.error;
  const bare = stripAllDataUrls(value);
  const third = trySet(key, bare);
  if (third.ok) { syncArrayInPlace(value, bare); return { ok: true, strippedImages: true, message: 'Cover images were removed to fit storage limits.' }; }
  if (!isQuotaError(third.error)) throw third.error;
  return { ok: false, message: `Storage full (${  estimateSize(value)  } KB). Delete local books and try again.` };
}

function trySet(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); return { ok: true }; }
  catch (err) { return { ok: false, error: err }; }
}

function isQuotaError(err) {
  if (!err) return false;
  const m = String(err.name || err.message || '').toLowerCase();
  return m.indexOf('quota') !== -1 || m.indexOf('exceeded') !== -1 || err.code === 22 || err.code === 1014;
}

function estimateSize(v) { try { return Math.round(JSON.stringify(v).length / 1024); } catch (_) { return -1; } }

function syncArrayInPlace(t, s) {
  if (!Array.isArray(t) || !Array.isArray(s)) return; t.length = 0;
  for (let i = 0; i < s.length; i++) t.push(s[i]);
}

function isOversizedDataUrl(url) {
  if (!url || typeof url !== 'string' || url.indexOf('data:') !== 0) return false;
  return (url.length * 3) / 4 > MAX_DATA_URL_BYTES;
}

function stripOversizedDataUrls(books) {
  if (!Array.isArray(books)) return books;
  return books.map(function(b) {
    const c = Object.assign({}, b);
    if (c.frontCover && isOversizedDataUrl(c.frontCover.url)) c.frontCover = Object.assign({}, c.frontCover, { url: '', _imageStripped: 'oversized' });
    if (c.backCover && isOversizedDataUrl(c.backCover.url)) c.backCover = Object.assign({}, c.backCover, { url: '', _imageStripped: 'oversized' });
    return c;
  });
}

function stripAllDataUrls(books) {
  if (!Array.isArray(books)) return books;
  return books.map(function(b) {
    const c = Object.assign({}, b);
    if (c.frontCover && typeof c.frontCover.url === 'string' && c.frontCover.url.indexOf('data:') === 0) c.frontCover = Object.assign({}, c.frontCover, { url: '', _imageStripped: 'quota' });
    if (c.backCover && typeof c.backCover.url === 'string' && c.backCover.url.indexOf('data:') === 0) c.backCover = Object.assign({}, c.backCover, { url: '', _imageStripped: 'quota' });
    return c;
  });
}

function normalize(v) { return String(v || '').trim().toLowerCase(); }

function loadBooks() { return readJson(BOOKS_KEY, []); }

function saveBooks(books) { return writeJson(BOOKS_KEY, books); }
function buildLocalLinks(book) {
  const slug = normalize(book.slug) || `local-book-${  String(book.id || '').slice(-8)}`;
  return {
    publicPage: `/books/read/${  encodeURIComponent(slug)}`,
    apiView: '',
    pdf: '',
    epub: '',
    frontCover: (book.frontCover && book.frontCover.url) || '',
    backCover: (book.backCover && book.backCover.url) || '',
  };
}

export function normalizeLocalBook(raw) {
  if (!raw) raw = {};
  const book = Object.assign({}, raw);
  const id = String(book.id || book._id || `local-book-${  Date.now()}`);
  const slug = normalize(book.slug) || (`local-book-${  id}`).toLowerCase();
  const status = (String(book.status || 'draft').toLowerCase() === 'published') ? 'published' : 'draft';
  const pendingPublish = Boolean(book.pendingPublish || book.publishQueued || book.publishRequested);
  const title = String(book.title || 'Untitled book').trim();
  const manuscriptMarkdown = String(book.manuscriptMarkdown || '');
  const wc = Number(book.wordCount || manuscriptMarkdown.split(/\s+/).filter(Boolean).length || 0);
  return {
    id, _id: id, title,
    subtitle: String(book.subtitle || ''),
    authorName: String(book.authorName || ''),
    slug,
    description: String(book.description || ''),
    genre: String(book.genre || 'general').toLowerCase(),
    audience: String(book.audience || 'general').toLowerCase(),
    language: String(book.language || 'en').toLowerCase(),
    status, wordCount: wc,
    publishedAt: book.publishedAt || null,
    updatedAt: book.updatedAt || new Date().toISOString(),
    createdAt: book.createdAt || new Date().toISOString(),
    pendingPublish,
    manuscriptMarkdown,
    webHtml: String(book.webHtml || ''),
    frontCover: book.frontCover || {},
    backCover: book.backCover || {},
    links: {
      publicPage: `/books/read/${  encodeURIComponent(slug)}`,
      apiView: '', pdf: '', epub: '',
      frontCover: (book.frontCover && book.frontCover.url) || '',
      backCover: (book.backCover && book.backCover.url) || '',
    },
    source: 'local',
  };
}

export function listLocalBookProjects() {
  return loadBooks().map(normalizeLocalBook);
}

export function listLocalPublishedBookProjects() {
  return listLocalBookProjects().filter(function(b) { return b.status === 'published'; });
}

export function listLocalQueuedPublishBookProjects() {
  return listLocalBookProjects().filter(function(b) { return b.pendingPublish && b.status !== 'published'; });
}

export function findLocalBookById(bookId) {
  const id = String(bookId || '');
  return listLocalBookProjects().find(function(b) { return String(b.id || b._id || '') === id; }) || null;
}

export function findLocalPublishedBookBySlug(slug) {
  const norm = normalize(slug);
  if (!norm) return null;
  return listLocalPublishedBookProjects().find(function(b) { return normalize(b.slug) === norm; }) || null;
}

export function saveLocalBookProject(payload) {
  if (!payload) payload = {};
  const books = loadBooks();
  const next = normalizeLocalBook(payload);
  const idx = books.findIndex(function(b) { return String(b.id || b._id || '') === String(next.id); });
  if (idx >= 0) {
    books[idx] = Object.assign({}, books[idx], next, { updatedAt: new Date().toISOString() });
  } else {
    books.push(Object.assign({}, next, {
      createdAt: next.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }
  const sr = saveBooks(books);
  const saved = normalizeLocalBook(books[idx >= 0 ? idx : books.length - 1]);
  if (sr && !sr.ok) { saved._storageError = sr.message; }
  else if (sr && sr.strippedImages) { saved._imagesStripped = true; saved._storageWarning = sr.message; }
  return saved;
}

export function deleteLocalBookProject(bookId) {
  const id = String(bookId || '');
  const books = loadBooks().filter(function(b) { return String(b.id || b._id || '') !== id; });
  saveBooks(books);
  return true;
}

export function clearLocalBookProjects() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(BOOKS_KEY);
}
