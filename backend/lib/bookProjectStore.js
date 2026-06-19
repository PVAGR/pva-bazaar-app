const fs = require('fs/promises');
const path = require('path');

const STORE_PATH = process.env.BOOK_STORE_PATH || path.resolve(__dirname, '../data/book-projects.json');

const store = global._pvaBookProjectStore || {
  books: [],
  loaded: false,
  nextId: 1,
};

global._pvaBookProjectStore = store;

let writeQueue = Promise.resolve();

function cloneBook(book) {
  if (!book) return null;
  return {
    ...book,
    _id: String(book._id || book.id || ''),
    id: String(book._id || book.id || ''),
  };
}

function hydrateBook(book) {
  if (!book) return null;
  return cloneBook({
    ...book,
    _id: String(book._id || book.id || ''),
    id: String(book._id || book.id || ''),
  });
}

function stripRuntimeFields(book) {
  if (!book) return null;
  const { id, ...rest } = book;
  return rest;
}

async function readStoreFromDisk() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.books)) {
      store.books = parsed.books.map(hydrateBook).filter(Boolean);
      const nextId = Number(parsed.nextId);
      if (Number.isFinite(nextId) && nextId > 0) {
        store.nextId = nextId;
      } else {
        const maxId = store.books.reduce((max, book) => {
          const value = Number(book._id);
          return Number.isFinite(value) && value > max ? value : max;
        }, 0);
        store.nextId = maxId + 1;
      }
      return true;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('⚠️ book store read failed:', err.message || err);
    }
  }
  return false;
}

async function persistStoreToDisk() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  const payload = {
    books: store.books.map(stripRuntimeFields),
    nextId: store.nextId,
    updatedAt: new Date().toISOString(),
  };
  const tmpPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
  await fs.rename(tmpPath, STORE_PATH);
}

function queuePersist() {
  writeQueue = writeQueue.then(() => persistStoreToDisk()).catch((err) => {
    console.warn('⚠️ book store persist failed:', err?.message || err);
  });
  return writeQueue;
}

async function ensureStoreLoaded() {
  if (store.loaded) return;
  await readStoreFromDisk();
  store.loaded = true;
}

function matchesTextField(actual, expected) {
  if (!expected) return true;
  return String(actual || '').toLowerCase() === String(expected || '').toLowerCase();
}

function matchesQuery(book, query = {}) {
  const checks = Object.entries(query || {});
  if (!checks.length) return true;

  return checks.every(([key, value]) => {
    if (key === '$or' && Array.isArray(value)) {
      return value.some((candidate) => matchesQuery(book, candidate));
    }
    if (key === '$in' && Array.isArray(value)) {
      return value.includes(book);
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$ne' in value) return String(book?.[key] || '') !== String(value.$ne || '');
      if ('$in' in value && Array.isArray(value.$in)) {
        return value.$in.includes(book?.[key]);
      }
    }
    return matchesTextField(book?.[key], value);
  });
}

function sortBooks(books, sort = {}) {
  const entries = Object.entries(sort || {});
  if (!entries.length) {
    return [...books];
  }

  return [...books].sort((left, right) => {
    for (const [key, direction] of entries) {
      const sign = Number(direction) >= 0 ? 1 : -1;
      const leftValue = left?.[key];
      const rightValue = right?.[key];
      const leftDate = new Date(leftValue || 0).getTime();
      const rightDate = new Date(rightValue || 0).getTime();
      const numericComparable = Number.isFinite(leftDate) && Number.isFinite(rightDate) && !Number.isNaN(leftDate) && !Number.isNaN(rightDate);
      if (numericComparable && leftDate !== rightDate) {
        return (leftDate - rightDate) * sign;
      }

      const leftString = String(leftValue || '');
      const rightString = String(rightValue || '');
      if (leftString === rightString) continue;
      return leftString > rightString ? sign : -sign;
    }
    return 0;
  });
}

async function listBooks(query = {}, sort = { updatedAt: -1, _id: -1 }) {
  await ensureStoreLoaded();
  const filtered = store.books.filter((book) => matchesQuery(book, query));
  return sortBooks(filtered, sort).map(cloneBook);
}

async function findBookOne(query = {}) {
  const items = await listBooks(query, { updatedAt: -1, _id: -1 });
  return items[0] || null;
}

async function findBookById(bookId) {
  await ensureStoreLoaded();
  const normalized = String(bookId || '').trim();
  if (!normalized) return null;
  const found = store.books.find((book) => String(book._id || '') === normalized);
  return cloneBook(found);
}

async function saveBook(input) {
  await ensureStoreLoaded();
  const now = new Date().toISOString();
  const doc = cloneBook(input || {});
  const id = String(doc._id || doc.id || '').trim() || String(store.nextId++);
  const record = {
    ...doc,
    _id: id,
    id,
    createdAt: doc.createdAt || now,
    updatedAt: now,
  };

  const index = store.books.findIndex((book) => String(book._id || '') === id);
  if (index >= 0) {
    store.books[index] = { ...store.books[index], ...record };
    await queuePersist();
    return cloneBook(store.books[index]);
  }

  store.books.push(record);
  await queuePersist();
  return cloneBook(record);
}

async function deleteBook(bookId) {
  await ensureStoreLoaded();
  const normalized = String(bookId || '').trim();
  const before = store.books.length;
  store.books = store.books.filter((book) => String(book._id || '') !== normalized);
  if (store.books.length !== before) {
    await queuePersist();
  }
  return before !== store.books.length;
}

async function getBookStoreState() {
  await ensureStoreLoaded();
  return {
    mode: 'file',
    connected: true,
    readyState: 1,
    path: STORE_PATH,
    books: store.books.length,
    loaded: store.loaded,
  };
}

module.exports = {
  deleteBook,
  findBookById,
  findBookOne,
  getBookStoreState,
  listBooks,
  saveBook,
};
