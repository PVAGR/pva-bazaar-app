const BOOKS_KEY = 'pva:local-book-projects-v1';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function readJson(key, fallback) {
  if (!canUseStorage()) return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (_err) {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function loadBooks() {
  return readJson(BOOKS_KEY, []);
}

function saveBooks(books) {
  writeJson(BOOKS_KEY, books);
}

function buildLocalLinks(book) {
  const slug = normalize(book.slug) || `local-book-${String(book.id || '').slice(-8)}`;
  return {
    publicPage: `/books/read/${encodeURIComponent(slug)}`,
    apiView: '',
    pdf: '',
    epub: '',
    frontCover: book.frontCover?.url || '',
    backCover: book.backCover?.url || '',
  };
}

export function normalizeLocalBook(raw = {}) {
  const book = { ...raw };
  const id = String(book.id || book._id || `local-book-${Date.now()}`);
  const slug = normalize(book.slug) || `local-book-${id}`.toLowerCase();
  const status = String(book.status || 'draft').toLowerCase() === 'published' ? 'published' : 'draft';
  const title = String(book.title || 'Untitled book').trim();
  const manuscriptMarkdown = String(book.manuscriptMarkdown || '');

  return {
    id,
    _id: id,
    title,
    subtitle: String(book.subtitle || ''),
    authorName: String(book.authorName || ''),
    slug,
    description: String(book.description || ''),
    genre: String(book.genre || 'general').toLowerCase(),
    audience: String(book.audience || 'general').toLowerCase(),
    language: String(book.language || 'en').toLowerCase(),
    status,
    wordCount: Number(book.wordCount || manuscriptMarkdown.split(/\s+/).filter(Boolean).length || 0),
    publishedAt: book.publishedAt || null,
    updatedAt: book.updatedAt || new Date().toISOString(),
    createdAt: book.createdAt || new Date().toISOString(),
    manuscriptMarkdown,
    webHtml: String(book.webHtml || ''),
    frontCover: book.frontCover || {},
    backCover: book.backCover || {},
    links: buildLocalLinks({ ...book, id, slug, frontCover: book.frontCover, backCover: book.backCover }),
    source: 'local',
  };
}

export function listLocalBookProjects() {
  return loadBooks().map(normalizeLocalBook);
}

export function listLocalPublishedBookProjects() {
  return listLocalBookProjects().filter((book) => book.status === 'published');
}

export function findLocalBookById(bookId) {
  const id = String(bookId || '');
  return listLocalBookProjects().find((book) => String(book.id || book._id || '') === id) || null;
}

export function findLocalPublishedBookBySlug(slug) {
  const normalized = normalize(slug);
  if (!normalized) return null;
  return listLocalPublishedBookProjects().find((book) => normalize(book.slug) === normalized) || null;
}

export function saveLocalBookProject(payload = {}) {
  const books = loadBooks();
  const next = normalizeLocalBook(payload);
  const index = books.findIndex((book) => String(book.id || book._id || '') === String(next.id));

  if (index >= 0) {
    books[index] = {
      ...books[index],
      ...next,
      updatedAt: new Date().toISOString(),
    };
  } else {
    books.push({
      ...next,
      createdAt: next.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  saveBooks(books);
  return normalizeLocalBook(books[index >= 0 ? index : books.length - 1]);
}

export function deleteLocalBookProject(bookId) {
  const id = String(bookId || '');
  const books = loadBooks().filter((book) => String(book.id || book._id || '') !== id);
  saveBooks(books);
  return true;
}

export function clearLocalBookProjects() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(BOOKS_KEY);
}

export default {
  clearLocalBookProjects,
  deleteLocalBookProject,
  findLocalBookById,
  findLocalPublishedBookBySlug,
  listLocalBookProjects,
  listLocalPublishedBookProjects,
  normalizeLocalBook,
  saveLocalBookProject,
};
