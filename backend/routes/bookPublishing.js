const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const BookProject = require('../models/BookProject');
const { getMongoState } = require('../lib/mongoConnection');
const { decryptJson } = require('../utils/cryptoVault');
const {
  deleteBook: deleteFileBook,
  findBookById: findFileBookById,
  findBookOne: findFileBookOne,
  listBooks: listFileBooks,
  saveBook: saveFileBook,
} = require('../lib/bookProjectStore');
const {
  renderBookHtml,
  buildPdfBuffer,
  buildEpubBuffer,
  escapeHtml,
} = require('../services/bookPublisher');
const {
  clearGitHubTokenOverride,
  setGitHubTokenOverride,
} = require('../services/gitHubService');

let mammoth = null;
try {
  mammoth = require('mammoth');
} catch (_err) {
  mammoth = null;
}

let pdfParse = null;
try {
  pdfParse = require('pdf-parse');
} catch (_err) {
  pdfParse = null;
}

let multer = null;
try {
  multer = require('multer');
} catch (_err) {
  multer = () => ({
    fields: () => (req, _res, next) => {
      req.files = req.files || {};
      next();
    },
  });
  multer.memoryStorage = () => ({});
}

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const bookUpload = upload.fields([
  { name: 'frontCover', maxCount: 1 },
  { name: 'backCover', maxCount: 1 },
  { name: 'manuscriptFile', maxCount: 1 },
]);

function authenticateBookPublishing(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  if (token.startsWith('local.')) {
    try {
      const raw = Buffer.from(token.slice(6), 'base64').toString('utf8');
      const payload = JSON.parse(raw);
      const userId = String(payload.id || payload.userId || payload.sub || '').trim();
      if (!userId) {
        throw new Error('Invalid local session token');
      }

      req.user = {
        _id: userId,
        id: userId,
        email: String(payload.email || ''),
        username: String(payload.username || ''),
        role: 'user',
        local: true,
      };
      return next();
    } catch (error) {
      return res.status(401).json({ error: error.message || 'Invalid local session token' });
    }
  }

  return authenticateToken(req, res, next);
}

function hasStaticGitHubToken() {
  return Boolean(
    process.env.GITHUB_TOKEN ||
      process.env.GITHUB_APP_TOKEN ||
      process.env.GH_TOKEN ||
      process.env.BOOK_STORE_GITHUB_TOKEN ||
      process.env.BOOK_STORE_TOKEN ||
      process.env.GITHUB_PAT,
  );
}

const PUBLIC_GITHUB_BOOK_STORE_URL = process.env.BOOK_STORE_PUBLIC_RAW_URL
  || 'https://raw.githubusercontent.com/PVAGR/pva-bazaar-app/main/backend/data/book-projects.json';

async function attachRequestGitHubToken(req, res, next) {
  const requestToken = String(
    req.get('x-pva-github-token')
    || req.get('x-pva-book-store-github-token')
    || req.body?.githubToken
    || req.query?.githubToken
    || ''
  ).trim();

  if (requestToken) {
    setGitHubTokenOverride(requestToken);
    const clearToken = () => clearGitHubTokenOverride();
    res.once('finish', clearToken);
    res.once('close', clearToken);
    return next();
  }

  if (hasStaticGitHubToken()) {
    return next();
  }

  const userId = String(req.user?.id || '').trim();
  if (!userId || String(req.user?.role || '').toLowerCase() !== 'admin') {
    return next();
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next();
  }

  try {
    const user = await User.findById(userId).select('oauthTokens').lean();
    const tokenPayload = user?.oauthTokens?.githubAdminProfile?.payload;
    const tokenData = decryptJson(tokenPayload);
    const accessToken = String(tokenData?.accessToken || '').trim();
    if (accessToken) {
      setGitHubTokenOverride(accessToken);
      const clearToken = () => clearGitHubTokenOverride();
      res.once('finish', clearToken);
      res.once('close', clearToken);
    }
  } catch (error) {
    console.warn('[book-publishing] failed to attach GitHub token:', error.message);
  }

  return next();
}

async function readPublicBookStoreFromGitHubRaw() {
  try {
    const response = await axios.get(PUBLIC_GITHUB_BOOK_STORE_URL, {
      timeout: 20000,
      responseType: 'text',
      transformResponse: [(data) => data],
      headers: {
        Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
      },
    });

    const text = String(response?.data || '').trim();
    if (!text) {
      return [];
    }

    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.books)) {
      return parsed.books;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_err) {
    return [];
  }

  return [];
}

const BOOK_UPLOAD_DIR = path.join(__dirname, '../uploads/books');
const CLOUDINARY_ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

let slugify = null;
try {
  slugify = require('slugify');
} catch (_err) {
  slugify = (value) => String(value || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isAdmin(req) {
  return String(req.user?.role || '').toLowerCase() === 'admin';
}

function sanitizeText(value, max = 12000) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function sanitizeFilename(name) {
  return path.basename(String(name || 'asset')).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

async function ensureUploadsDir() {
  await fsp.mkdir(BOOK_UPLOAD_DIR, { recursive: true });
}

async function writeLocalAsset(buffer, originalName, prefix) {
  await ensureUploadsDir();
  const safePrefix = sanitizeFilename(prefix || 'asset');
  const filename = `${Date.now()}-${safePrefix}-${sanitizeFilename(originalName)}`;
  const filePath = path.join(BOOK_UPLOAD_DIR, filename);
  await fsp.writeFile(filePath, buffer);
  return {
    provider: 'local',
    localFilename: filename,
    url: `/api/book-publishing/assets/local/${encodeURIComponent(filename)}`,
  };
}

async function uploadCoverAsset(buffer, originalName, folder, mimeType) {
  if (!isCloudinaryConfigured()) {
    return writeLocalAsset(buffer, originalName, folder);
  }

  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
      },
      (error, data) => {
        if (error) reject(error);
        else resolve(data);
      },
    );
    stream.end(buffer);
  });

  return {
    provider: 'cloudinary',
    url: result.secure_url,
    publicId: result.public_id,
    localFilename: '',
    originalName,
    mimeType,
    size: buffer.length,
  };
}

async function resolveAssetBuffer(asset) {
  const source = asset || {};
  if (source.provider === 'local' && source.localFilename) {
    const filePath = path.join(BOOK_UPLOAD_DIR, path.basename(source.localFilename));
    await fsp.stat(filePath);
    return fsp.readFile(filePath);
  }

  if (source.url && /^https?:\/\//i.test(source.url)) {
    const response = await axios.get(source.url, { responseType: 'arraybuffer', timeout: 20000 });
    return Buffer.from(response.data);
  }

  return null;
}

function renderableBook(book, basePath = '') {
  const clone = {
    ...book,
    frontCover: book.frontCover ? { ...book.frontCover } : {},
    backCover: book.backCover ? { ...book.backCover } : {},
  };

  const normalizedBase = String(basePath || '').replace(/\/+$/, '');
  if (clone.frontCover?.localFilename && normalizedBase) {
    clone.frontCover.url = `${normalizedBase}/assets/local/${encodeURIComponent(path.basename(clone.frontCover.localFilename))}`;
  }
  if (clone.backCover?.localFilename && normalizedBase) {
    clone.backCover.url = `${normalizedBase}/assets/local/${encodeURIComponent(path.basename(clone.backCover.localFilename))}`;
  }
  return clone;
}

function parseBoolean(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function shouldUseFileBookStore() {
  const mongoState = getMongoState();
  return mongoState.mode === 'mock' || mongoState.mode === 'error' || mongoState.mode === 'disconnected';
}

function isDocxFile(file) {
  const name = String(file?.originalname || '').toLowerCase();
  const mime = String(file?.mimetype || '').toLowerCase();
  return name.endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

function isPdfFile(file) {
  const name = String(file?.originalname || '').toLowerCase();
  const mime = String(file?.mimetype || '').toLowerCase();
  return name.endsWith('.pdf') || mime === 'application/pdf';
}

async function extractManuscriptTextFromUpload(file) {
  if (!file?.buffer) return '';

  if (isDocxFile(file)) {
    if (mammoth?.extractRawText) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return String(result?.value || '').trim();
    }

    if (mammoth?.convertToHtml) {
      const result = await mammoth.convertToHtml({ buffer: file.buffer });
      return String(result?.value || '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
  }

  if (isPdfFile(file) && pdfParse) {
    const parsed = await pdfParse(file.buffer);
    return String(parsed?.text || '').trim();
  }

  return file.buffer.toString('utf8').trim();
}

async function resolveUniqueSlug(baseSlug, excludeId = null) {
  const seed = slugify(String(baseSlug || 'book'), { lower: true, strict: true });
  const base = seed || 'book';
  let candidate = base;
  let suffix = 2;

  while (true) {
    let match = null;
    if (shouldUseFileBookStore()) {
      const books = await listFileBooks();
      match = books.find((book) => {
        if (String(book.slug || '') !== candidate) return false;
        if (!excludeId) return true;
        return String(book._id || '') !== String(excludeId);
      }) || null;
    } else {
      match = await BookProject.findOne({
        slug: candidate,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
        .select('_id')
        .lean();
    }

    if (!match) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function listUserBooks(userId) {
  if (shouldUseFileBookStore()) {
    return listFileBooks({ authorId: String(userId || '') }, { updatedAt: -1, _id: -1 });
  }

  return BookProject.find({
    authorId: userId,
  })
    .sort({ updatedAt: -1, _id: -1 })
    .lean();
}

async function listPublishedBooks() {
  const localBooks = shouldUseFileBookStore()
    ? await listFileBooks({ status: 'published' }, { publishedAt: -1, updatedAt: -1, _id: -1 })
    : await BookProject.find({ status: 'published' })
      .sort({ publishedAt: -1, updatedAt: -1, _id: -1 })
      .lean();

  const rawBooks = await readPublicBookStoreFromGitHubRaw();
  if (!rawBooks.length) {
    return localBooks;
  }

  const merged = new Map();
  for (const book of [...localBooks, ...rawBooks]) {
    const key = String(book?.slug || book?._id || book?.id || '').trim().toLowerCase();
    if (!key || merged.has(key)) continue;
    merged.set(key, book);
  }
  return Array.from(merged.values());
}

async function loadBookForEdit(bookId) {
  if (shouldUseFileBookStore()) {
    return findFileBookById(bookId);
  }

  return BookProject.findById(bookId).lean();
}

async function loadBookForSlug(slug) {
  const normalized = sanitizeText(slug, 180).toLowerCase();
  if (!normalized) return null;

  if (shouldUseFileBookStore()) {
    const localBook = await findFileBookOne({ slug: normalized, status: 'published' });
    if (localBook) return localBook;
    const rawBooks = await readPublicBookStoreFromGitHubRaw();
    return rawBooks.find((book) => String(book?.slug || '').trim().toLowerCase() === normalized) || null;
  }

  const localBook = await BookProject.findOne({ slug: normalized, status: 'published' }).lean();
  if (localBook) return localBook;
  const rawBooks = await readPublicBookStoreFromGitHubRaw();
  return rawBooks.find((book) => String(book?.slug || '').trim().toLowerCase() === normalized) || null;
}

async function persistBookRecord(book) {
  if (shouldUseFileBookStore()) {
    return saveFileBook(book);
  }

  return book.save();
}

async function removeBookRecord(bookId) {
  if (shouldUseFileBookStore()) {
    return deleteFileBook(bookId);
  }

  return BookProject.findByIdAndDelete(bookId);
}

function bookSummary(book, { publicView = false } = {}) {
  const slug = String(book.slug || '').trim();
  const id = String(book._id || '');
  const baseRoute = publicView ? `/api/book-publishing/public/${encodeURIComponent(slug)}` : `/api/book-publishing/${encodeURIComponent(id)}`;

  const frontCover = book.frontCover?.url
    ? `${baseRoute}/assets/front-cover`
    : '';
  const backCover = book.backCover?.url
    ? `${baseRoute}/assets/back-cover`
    : '';

  const publicRoute = slug ? `/books/read/${encodeURIComponent(slug)}` : '';

  return {
    id,
    title: book.title,
    subtitle: book.subtitle,
    authorName: book.authorName,
    slug,
    description: book.description,
    genre: book.genre,
    audience: book.audience,
    language: book.language,
    status: book.status,
    wordCount: book.wordCount || 0,
    publishedAt: book.publishedAt || null,
    updatedAt: book.updatedAt || null,
    createdAt: book.createdAt || null,
    manuscriptMarkdown: publicView ? undefined : book.manuscriptMarkdown || '',
    webHtml: book.webHtml || '',
    frontCover: book.frontCover || {},
    backCover: book.backCover || {},
    links: {
      publicPage: publicRoute || '',
      apiView: `${baseRoute}/view`,
      pdf: `${baseRoute}/download/pdf`,
      epub: `${baseRoute}/download/epub`,
      frontCover,
      backCover,
    },
  };
}

function canEditBook(req, book) {
  if (!book) return false;
  if (isAdmin(req)) return true;
  return String(book.authorId || '') === String(req.user?.id || '');
}

function canViewBook(req, book) {
  if (!book) return false;
  if (book.status === 'published') return true;
  return canEditBook(req, book);
}

function notFound(res, message = 'Book not found') {
  return res.status(404).json({ ok: false, error: message });
}

function renderNotFoundHtml(message) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Book not found</title>
    <style>
      body{font-family:Georgia,serif;background:#f6f2e8;color:#1d1d1d;margin:0;padding:3rem;}
      .card{max-width:700px;margin:0 auto;background:#fffdf8;border:1px solid #d8cab0;border-radius:18px;padding:1.5rem;}
    </style>
  </head>
  <body><main class="card"><h1>Book not found</h1><p>${escapeHtml(message)}</p></main></body>
</html>`;
}

router.get('/mine', authenticateBookPublishing, attachRequestGitHubToken, async (req, res) => {
  try {
    const items = await listUserBooks(req.user.id);

    return res.json({
      ok: true,
      items: items.map((item) => bookSummary(item)),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to load books' });
  }
});

router.get('/public', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query?.limit) || 24, 100));
    const query = sanitizeText(req.query?.q || '', 120);
    const genre = sanitizeText(req.query?.genre || '', 80).toLowerCase();
    const items = await listPublishedBooks();

    const loweredQuery = query.toLowerCase();
    const matchedItems = items.filter((item) => {
      if (genre && String(item.genre || '').toLowerCase() !== genre) {
        return false;
      }

      if (!loweredQuery) return true;
      const searchable = [
        item.title,
        item.subtitle,
        item.authorName,
        item.description,
        item.slug,
        item.genre,
        item.audience,
        item.language,
      ]
        .filter(Boolean)
        .map((field) => String(field).toLowerCase())
        .join(' ');

      return searchable.includes(loweredQuery);
    });

    return res.json({
      ok: true,
      items: matchedItems.slice(0, limit).map((item) => bookSummary(item, { publicView: true })),
      total: matchedItems.length,
      query,
      genre,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to load books' });
  }
});

router.post('/', authenticateBookPublishing, attachRequestGitHubToken, bookUpload, async (req, res) => {
  try {
    const bookId = sanitizeText(req.body?.bookId || '', 120);
    const title = sanitizeText(req.body?.title || '', 240);
    if (!title) {
      return res.status(400).json({ ok: false, error: 'Title is required' });
    }

    let book = null;
    if (bookId) {
      book = await loadBookForEdit(bookId);
      if (!book) return notFound(res);
      if (!canEditBook(req, book)) {
        return res.status(403).json({ ok: false, error: 'You do not have permission to edit this book' });
      }
    } else {
      const authorId = String(req.user?.id || req.user?._id || '');
      if (shouldUseFileBookStore()) {
        book = { authorId };
      } else {
        book = new BookProject({ authorId });
      }
    }

    const previousStatus = book.status || 'draft';
    const requestedPublish = parseBoolean(req.body?.publish);
    const shouldPublish = requestedPublish || previousStatus === 'published';
    const frontFile = req.files?.frontCover?.[0];
    const backFile = req.files?.backCover?.[0];
    const manuscriptFile = req.files?.manuscriptFile?.[0];

    if (frontFile && !CLOUDINARY_ALLOWED_IMAGE_TYPES.has(String(frontFile.mimetype || '').toLowerCase())) {
      return res.status(400).json({ ok: false, error: 'Front cover must be an image file' });
    }
    if (backFile && !CLOUDINARY_ALLOWED_IMAGE_TYPES.has(String(backFile.mimetype || '').toLowerCase())) {
      return res.status(400).json({ ok: false, error: 'Back cover must be an image file' });
    }

    if (frontFile) {
      book.frontCover = await uploadCoverAsset(
        frontFile.buffer,
        frontFile.originalname,
        'pva-bazaar-books/front-covers',
        frontFile.mimetype,
      );
      book.frontCover.originalName = frontFile.originalname;
      book.frontCover.mimeType = frontFile.mimetype;
      book.frontCover.size = frontFile.size;
      book.frontCover.checksumSha256 = crypto.createHash('sha256').update(frontFile.buffer).digest('hex');
    }

    if (backFile) {
      book.backCover = await uploadCoverAsset(
        backFile.buffer,
        backFile.originalname,
        'pva-bazaar-books/back-covers',
        backFile.mimetype,
      );
      book.backCover.originalName = backFile.originalname;
      book.backCover.mimeType = backFile.mimetype;
      book.backCover.size = backFile.size;
      book.backCover.checksumSha256 = crypto.createHash('sha256').update(backFile.buffer).digest('hex');
    }

    let manuscriptMarkdown = sanitizeText(req.body?.manuscriptMarkdown || '', 2_000_000);
    if (manuscriptFile) {
      manuscriptMarkdown = await extractManuscriptTextFromUpload(manuscriptFile);
    }

    if (manuscriptMarkdown) {
      book.manuscriptMarkdown = manuscriptMarkdown;
    }

    if (!book.manuscriptMarkdown) {
      return res.status(400).json({ ok: false, error: 'Manuscript content is required' });
    }

    book.title = title;
    book.subtitle = sanitizeText(req.body?.subtitle || '', 240);
    book.authorName = sanitizeText(req.body?.authorName || req.user?.name || '', 160);
    book.description = sanitizeText(req.body?.description || '', 4000);
    book.genre = sanitizeText(req.body?.genre || 'general', 80).toLowerCase() || 'general';
    book.audience = sanitizeText(req.body?.audience || 'general', 80).toLowerCase() || 'general';
    book.language = sanitizeText(req.body?.language || 'en', 24).toLowerCase() || 'en';
    book.slug = await resolveUniqueSlug(req.body?.slug || book.title, book._id);
    book.authorId = String(book.authorId || req.user?.id || req.user?._id || '');
    book.wordCount = String(book.manuscriptMarkdown || '')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean).length;
    book.status = shouldPublish ? 'published' : 'draft';
    if (shouldPublish && previousStatus !== 'published') {
      book.publishedAt = new Date();
      book.publishedVersion = (Number(book.publishedVersion || 0) || 0) + 1;
    } else if (shouldPublish && !book.publishedAt) {
      book.publishedAt = new Date();
    }

    const useFileStore = shouldUseFileBookStore();
    let savedBook = null;

    if (useFileStore) {
      savedBook = await persistBookRecord(book);
      const renderBase = shouldPublish
        ? `/api/book-publishing/public/${encodeURIComponent(savedBook.slug)}`
        : `/api/book-publishing/${encodeURIComponent(savedBook._id || '')}`;
      savedBook.webHtml = renderBookHtml(renderableBook(savedBook, renderBase));
      savedBook.lastRenderedAt = new Date().toISOString();
      savedBook = await persistBookRecord(savedBook);
    } else {
      const renderBase = shouldPublish
        ? `/api/book-publishing/public/${encodeURIComponent(book.slug)}`
        : `/api/book-publishing/${encodeURIComponent(book._id || '')}`;
      book.webHtml = renderBookHtml(renderableBook(book, renderBase));
      book.lastRenderedAt = new Date().toISOString();
      savedBook = await persistBookRecord(book);
    }

    return res.status(bookId ? 200 : 201).json({
      ok: true,
      item: bookSummary(savedBook?.toObject ? savedBook.toObject() : savedBook || book),
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Failed to save book' });
  }
});

router.get('/public/:slug', async (req, res) => {
  try {
    const book = await loadBookForSlug(req.params.slug);
    if (!book) return notFound(res);
    return res.json({ ok: true, item: bookSummary(book, { publicView: true }) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to load book' });
  }
});

router.get('/public/:slug/view', async (req, res) => {
  try {
    const book = await loadBookForSlug(req.params.slug);
    if (!book) {
      return res.status(404).type('html').send(renderNotFoundHtml('This book has not been published yet.'));
    }

    return res
      .status(200)
      .type('html')
      .send(renderBookHtml(renderableBook(book, `/api/book-publishing/public/${encodeURIComponent(book.slug)}`)));
  } catch (error) {
    return res.status(500).type('html').send(renderNotFoundHtml(error.message || 'Unable to render book'));
  }
});

router.get('/assets/local/:filename', async (req, res) => {
  try {
    const filename = path.basename(String(req.params.filename || ''));
    if (!filename) return notFound(res);
    const filePath = path.join(BOOK_UPLOAD_DIR, filename);
    await fsp.stat(filePath);

    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' :
      ext === '.webp' ? 'image/webp' :
      ext === '.gif' ? 'image/gif' :
      'image/jpeg';

    res.setHeader('Content-Type', contentType);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    return res.status(404).json({ ok: false, error: error.message || 'Asset unavailable' });
  }
});

router.get('/public/:slug/assets/:assetKey', async (req, res) => {
  try {
    const book = await loadBookForSlug(req.params.slug);
    if (!book) return notFound(res);

    const key = String(req.params.assetKey || '').toLowerCase();
    const asset = key === 'front-cover' ? book.frontCover : key === 'back-cover' ? book.backCover : null;
    if (!asset || !asset.url) {
      return res.status(404).json({ ok: false, error: 'Asset not found' });
    }

    if (asset.provider === 'local' && asset.localFilename) {
      const filePath = path.join(BOOK_UPLOAD_DIR, path.basename(asset.localFilename));
      await fsp.stat(filePath);
      return fs.createReadStream(filePath).pipe(res);
    }

    const response = await axios.get(asset.url, { responseType: 'stream', timeout: 20000 });
    return response.data.pipe(res);
  } catch (error) {
    return res.status(404).json({ ok: false, error: error.message || 'Asset unavailable' });
  }
});

router.get('/public/:slug/download/pdf', async (req, res) => {
  try {
    const book = await loadBookForSlug(req.params.slug);
    if (!book) return notFound(res);

    const pdfBuffer = await buildPdfBuffer(book, resolveAssetBuffer);
    const filename = `${sanitizeFilename(book.slug || book.title || 'book')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to generate PDF' });
  }
});

router.get('/public/:slug/download/epub', async (req, res) => {
  try {
    const book = await loadBookForSlug(req.params.slug);
    if (!book) return notFound(res);

    const epubBuffer = await buildEpubBuffer(book, resolveAssetBuffer);
    const filename = `${sanitizeFilename(book.slug || book.title || 'book')}.epub`;
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(epubBuffer);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to generate EPUB' });
  }
});

router.get('/:bookId', authenticateBookPublishing, attachRequestGitHubToken, async (req, res) => {
  try {
    const book = await loadBookForEdit(req.params.bookId);
    if (!book) return notFound(res);
    if (!canViewBook(req, book)) {
      return res.status(403).json({ ok: false, error: 'You do not have permission to view this book' });
    }
    return res.json({ ok: true, item: bookSummary(book, { publicView: false }) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to load book' });
  }
});

router.get('/:bookId/view', authenticateBookPublishing, attachRequestGitHubToken, async (req, res) => {
  try {
    const book = await loadBookForEdit(req.params.bookId);
    if (!book) return res.status(404).type('html').send(renderNotFoundHtml('Book not found.'));
    if (!canViewBook(req, book)) {
      return res.status(403).type('html').send(renderNotFoundHtml('You do not have permission to view this book.'));
    }
    return res
      .status(200)
      .type('html')
      .send(renderBookHtml(renderableBook(book, `/api/book-publishing/${encodeURIComponent(book._id)}`)));
  } catch (error) {
    return res.status(500).type('html').send(renderNotFoundHtml(error.message || 'Unable to render book'));
  }
});

router.get('/:bookId/assets/:assetKey', authenticateBookPublishing, attachRequestGitHubToken, async (req, res) => {
  try {
    const book = await loadBookForEdit(req.params.bookId);
    if (!book) return notFound(res);
    if (!canViewBook(req, book)) {
      return res.status(403).json({ ok: false, error: 'You do not have permission to view this asset' });
    }

    const key = String(req.params.assetKey || '').toLowerCase();
    const asset = key === 'front-cover' ? book.frontCover : key === 'back-cover' ? book.backCover : null;
    if (!asset || !asset.url) {
      return res.status(404).json({ ok: false, error: 'Asset not found' });
    }

    if (asset.provider === 'local' && asset.localFilename) {
      const filePath = path.join(BOOK_UPLOAD_DIR, path.basename(asset.localFilename));
      await fsp.stat(filePath);
      return fs.createReadStream(filePath).pipe(res);
    }

    const response = await axios.get(asset.url, { responseType: 'stream', timeout: 20000 });
    return response.data.pipe(res);
  } catch (error) {
    return res.status(404).json({ ok: false, error: error.message || 'Asset unavailable' });
  }
});

router.get('/:bookId/download/pdf', authenticateBookPublishing, attachRequestGitHubToken, async (req, res) => {
  try {
    const book = await loadBookForEdit(req.params.bookId);
    if (!book) return notFound(res);
    if (!canViewBook(req, book)) {
      return res.status(403).json({ ok: false, error: 'You do not have permission to download this book' });
    }

    const pdfBuffer = await buildPdfBuffer(book, resolveAssetBuffer);
    const filename = `${sanitizeFilename(book.slug || book.title || 'book')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to generate PDF' });
  }
});

router.get('/:bookId/download/epub', authenticateBookPublishing, attachRequestGitHubToken, async (req, res) => {
  try {
    const book = await loadBookForEdit(req.params.bookId);
    if (!book) return notFound(res);
    if (!canViewBook(req, book)) {
      return res.status(403).json({ ok: false, error: 'You do not have permission to download this book' });
    }

    const epubBuffer = await buildEpubBuffer(book, resolveAssetBuffer);
    const filename = `${sanitizeFilename(book.slug || book.title || 'book')}.epub`;
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(epubBuffer);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to generate EPUB' });
  }
});

router.delete('/:bookId', authenticateBookPublishing, attachRequestGitHubToken, async (req, res) => {
  try {
    const book = await loadBookForEdit(req.params.bookId);
    if (!book) return notFound(res);
    if (!canEditBook(req, book)) {
      return res.status(403).json({ ok: false, error: 'You do not have permission to delete this book' });
    }

    if (book.frontCover?.provider === 'local' && book.frontCover?.localFilename) {
      const filePath = path.join(BOOK_UPLOAD_DIR, path.basename(book.frontCover.localFilename));
      await fsp.rm(filePath, { force: true }).catch(() => {});
    }
    if (book.backCover?.provider === 'local' && book.backCover?.localFilename) {
      const filePath = path.join(BOOK_UPLOAD_DIR, path.basename(book.backCover.localFilename));
      await fsp.rm(filePath, { force: true }).catch(() => {});
    }

    await removeBookRecord(book._id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to delete book' });
  }
});

module.exports = router;
