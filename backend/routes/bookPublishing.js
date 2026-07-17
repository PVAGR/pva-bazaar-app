const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const BookProject = require('../models/BookProject');
const { connectMongo, getMongoState } = require('../lib/mongoConnection');
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

const hasMongoUri = Boolean(process.env.MONGODB_URI || process.env.DATABASE_URL);
let mongoReadyPromise = null;

async function ensureMongoBookReady() {
  if (!hasMongoUri) return null;
  if (!mongoReadyPromise) {
    mongoReadyPromise = connectMongo({ logger: console, allowMemoryFallback: false });
  }

  await mongoReadyPromise;
  const state = getMongoState();
  if (state.mode !== 'mongo') {
    const message = state.lastError || 'MongoDB is not available for book publishing';
    const error = new Error(message);
    error.status = 503;
    throw error;
  }

  return state;
}

router.use(async (_req, res, next) => {
  try {
    await ensureMongoBookReady();
    next();
  } catch (error) {
    const status = Number(error?.status || 503);
    return res.status(status).json({
      ok: false,
      error: error.message || 'MongoDB book publishing store unavailable',
    });
  }
});

function authenticateBookPublishing(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  if (!hasMongoUri && token.startsWith('local.')) {
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
    console.warn('⚠️ Cloudinary not configured, using local storage for cover image');
    return writeLocalAsset(buffer, originalName, folder);
  }

  try {
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
  } catch (cloudinaryError) {
    console.error('❌ Cloudinary upload failed:', cloudinaryError.message);
    console.warn('⚠️ Falling back to local storage for cover image');
    return writeLocalAsset(buffer, originalName, folder);
  }
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
  if (hasMongoUri) return false;
  const mongoState = getMongoState();
  // Production fix: never fall back to the file store when MongoDB is connected.
  const connected = mongoState.mode === 'mongo' && mongoState.readyState === 1;
  if (connected) return false;
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
  return shouldUseFileBookStore()
    ? await listFileBooks({ status: 'published' }, { publishedAt: -1, updatedAt: -1, _id: -1 })
    : await BookProject.find({ status: 'published' })
      .select('_id title subtitle authorName slug description genre audience language status wordCount publishedAt updatedAt frontCover.url frontCover.provider frontCover.publicId backCover.url backCover.provider backCover.publicId')
      .sort({ publishedAt: -1, updatedAt: -1, _id: -1 })
      .lean();
}

async function loadBookForEdit(bookId) {
  const mongoState = getMongoState();
  const connected = mongoState.mode === 'mongo' && mongoState.readyState === 1;
  if (!connected && shouldUseFileBookStore()) {
    return findFileBookById(bookId);
  }

  return BookProject.findById(bookId).lean();
}

async function loadBookForSlug(slug) {
  const normalized = sanitizeText(slug, 180).toLowerCase();
  if (!normalized) return null;

  // Production fix: if Mongo is connected, always read from MongoDB.
  const mongoState = getMongoState();
  const connected = mongoState.mode === 'mongo' && mongoState.readyState === 1;
  if (!connected && shouldUseFileBookStore()) {
    const localBook = await findFileBookOne({ slug: normalized, status: 'published' });
    if (localBook) return localBook;
    return null;
  }

  const localBook = await BookProject.findOne({ slug: normalized, status: 'published' }).lean();
  return localBook || null;
}

async function persistBookRecord(book) {
  const mongoState = getMongoState();
  const connected = mongoState.mode === 'mongo' && mongoState.readyState === 1;
  if (!connected && shouldUseFileBookStore()) {
    return saveFileBook(book);
  }

  return book.save();
}

async function removeBookRecord(bookId) {
  const mongoState = getMongoState();
  const connected = mongoState.mode === 'mongo' && mongoState.readyState === 1;
  if (!connected && shouldUseFileBookStore()) {
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

router.get('/mine', authenticateBookPublishing, async (req, res) => {
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

router.get('/debug/public-counts', async (_req, res) => {
  try {
    setNoCacheHeaders(res);

    const mongoState = getMongoState();
    const mongoConnected = mongoState.mode === 'mongo' && mongoState.readyState === 1;
    const storeMode = mongoConnected ? 'mongo' : mongoState.mode || 'unknown';

    let totalBooks = 0;
    let publishedBooks = 0;
    let draftBooks = 0;
    let samplePublishedBookIds = [];
    let areIdsMongoStyle = false;

    if (mongoConnected) {
      const total = await BookProject.estimatedDocumentCount();
      const published = await BookProject.countDocuments({ status: 'published' });
      const draft = await BookProject.countDocuments({ status: 'draft' });
      const sample = await BookProject.find({ status: 'published' })
        .select('_id')
        .limit(5)
        .lean();

      totalBooks = Number(total || 0);
      publishedBooks = Number(published || 0);
      draftBooks = Number(draft || 0);
      samplePublishedBookIds = (sample || []).map((d) => String(d?._id || ''));
      areIdsMongoStyle = samplePublishedBookIds.some((id) => /^[0-9a-fA-F]{24}$/.test(id));
    } else {
      // Avoid calling private store details; rely on cached store functions only.
      // Mongo not connected: public counts are intentionally limited.
      // Do not expose store internal structures or fall back to any mock content in production.
      totalBooks = 0;
      publishedBooks = 0;
      draftBooks = 0;
      samplePublishedBookIds = [];
      areIdsMongoStyle = false;
    }

    return res.json({
      ok: true,
      mongoConnected,
      storeMode,
      totalBooks,
      publishedBooks,
      draftBooks,
      samplePublishedBookIds,
      areIdsMongoStyle,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Failed to compute public counts' });
  }
});

function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

function lightweightPublicSummary(book) {
  const slug = String(book.slug || '').trim();
  const id = String(book._id || '');

  const links = {
    publicPage: slug ? `/books/read/${encodeURIComponent(slug)}` : '',
    apiView: slug ? `/api/book-publishing/public/${encodeURIComponent(slug)}/view` : '',
    pdf: slug ? `/api/book-publishing/public/${encodeURIComponent(slug)}/download/pdf` : '',
    epub: slug ? `/api/book-publishing/public/${encodeURIComponent(slug)}/download/epub` : '',
    frontCover:
      book.frontCover?.url || book.frontCover?.localFilename
        ? `/api/book-publishing/public/${encodeURIComponent(slug)}/assets/front-cover`
        : '',
    backCover:
      book.backCover?.url || book.backCover?.localFilename
        ? `/api/book-publishing/public/${encodeURIComponent(slug)}/assets/back-cover`
        : '',
  };

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
    links,
    frontCover: book.frontCover?.url ? { url: book.frontCover.url, provider: book.frontCover.provider } : { url: '', provider: book.frontCover?.provider || 'local' },
    backCover: book.backCover?.url ? { url: book.backCover.url, provider: book.backCover.provider } : { url: '', provider: book.backCover?.provider || 'local' },
  };
}

router.get('/public', async (req, res) => {
  try {
    setNoCacheHeaders(res);
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

    const paged = matchedItems.slice(0, limit);
    return res.json({
      ok: true,
      items: paged.map((item) => lightweightPublicSummary(item)),
      total: matchedItems.length,
      query,
      genre,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to load books' });
  }
});

router.post('/', authenticateBookPublishing, bookUpload, async (req, res) => {
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

    // Accept pre-uploaded Cloudinary URLs from frontend direct upload
    const frontCoverUrl = sanitizeText(req.body?.frontCoverUrl || '', 500);
    const frontCoverPublicId = sanitizeText(req.body?.frontCoverPublicId || '', 200);
    const backCoverUrl = sanitizeText(req.body?.backCoverUrl || '', 500);
    const backCoverPublicId = sanitizeText(req.body?.backCoverPublicId || '', 200);

    if (frontFile && !CLOUDINARY_ALLOWED_IMAGE_TYPES.has(String(frontFile.mimetype || '').toLowerCase())) {
      return res.status(400).json({ ok: false, error: 'Front cover must be an image file' });
    }
    if (backFile && !CLOUDINARY_ALLOWED_IMAGE_TYPES.has(String(backFile.mimetype || '').toLowerCase())) {
      return res.status(400).json({ ok: false, error: 'Back cover must be an image file' });
    }

    if (frontCoverUrl && /^https?:\/\//i.test(frontCoverUrl)) {
      // Frontend uploaded directly to Cloudinary — store the URL
      book.frontCover = {
        provider: 'cloudinary',
        url: frontCoverUrl,
        publicId: frontCoverPublicId || '',
        localFilename: '',
        originalName: '',
        mimeType: 'image/jpeg',
        size: 0,
      };
    } else if (frontFile) {
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

    if (backCoverUrl && /^https?:\/\//i.test(backCoverUrl)) {
      // Frontend uploaded directly to Cloudinary — store the URL
      book.backCover = {
        provider: 'cloudinary',
        url: backCoverUrl,
        publicId: backCoverPublicId || '',
        localFilename: '',
        originalName: '',
        mimeType: 'image/jpeg',
        size: 0,
      };
    } else if (backFile) {
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
    setNoCacheHeaders(res);
    const book = await loadBookForSlug(req.params.slug);
    if (!book) return notFound(res);
    return res.json({ ok: true, item: lightweightPublicSummary(book) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to load book' });
  }
});

router.get('/public/:slug/view', async (req, res) => {
  try {
    setNoCacheHeaders(res);
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
    setNoCacheHeaders(res);
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
    setNoCacheHeaders(res);
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
    setNoCacheHeaders(res);
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
    setNoCacheHeaders(res);
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

router.get('/:bookId', authenticateBookPublishing, async (req, res) => {
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

router.get('/:bookId/view', authenticateBookPublishing, async (req, res) => {
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

router.get('/:bookId/assets/:assetKey', authenticateBookPublishing, async (req, res) => {
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

router.get('/:bookId/download/pdf', authenticateBookPublishing, async (req, res) => {
  try {
    setNoCacheHeaders(res);
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

router.get('/:bookId/download/epub', authenticateBookPublishing, async (req, res) => {
  try {
    setNoCacheHeaders(res);
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

router.delete('/:bookId', authenticateBookPublishing, async (req, res) => {
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
