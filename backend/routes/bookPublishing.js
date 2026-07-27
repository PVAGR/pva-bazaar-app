const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
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
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB for files
    fieldSize: 50 * 1024 * 1024, // 50MB for text fields (manuscripts)
    fields: 100 // Allow up to 100 form fields
  },
});

const bookUpload = upload.fields([
  { name: 'frontCover', maxCount: 1 },
  { name: 'backCover', maxCount: 1 },
  { name: 'manuscriptFile', maxCount: 1 },
  { name: 'manuscriptPdf', maxCount: 1 },
  { name: 'manuscriptDocx', maxCount: 1 },
  { name: 'manuscriptHtml', maxCount: 1 },
]);

const hasMongoUri = Boolean(process.env.MONGODB_URI || process.env.DATABASE_URL);
const CLOUDINARY_BOOK_MANIFEST_FOLDER = 'pva-bazaar-books/book-manifests';
const CLOUDINARY_BOOK_MANUSCRIPT_FOLDER = 'pva-bazaar-books/book-manuscripts';
const CLOUDINARY_BOOK_PDF_FOLDER = 'pva-bazaar-books/book-pdfs';
const CLOUDINARY_BOOK_DOCX_FOLDER = 'pva-bazaar-books/book-docx';
const CLOUDINARY_BOOK_HTML_FOLDER = 'pva-bazaar-books/book-html';
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

router.use(async (req, res, next) => {
  try {
    await ensureMongoBookReady();
    next();
  } catch (error) {
    const status = Number(error?.status || 503);
    return res.status(status).json({
      ok: false,
      error: 'MongoDB unavailable',
      message: error.message || 'MongoDB book publishing store unavailable',
      stage: 'db_check',
      requestId: req.requestId || null,
    });
  }
});

function authenticateBookPublishing(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const requestId = req.requestId || null;

  if (!token) {
    return res.status(401).json({
      ok: false,
      error: 'Missing authentication token',
      message: 'Authorization token is required to publish books.',
      stage: 'auth_checked',
      requestId,
    });
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
        role: String(payload.role || 'user'),
        local: true,
      };
      return next();
    } catch (error) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid local session token',
        message: error.message || 'Invalid or expired authentication token.',
        stage: 'auth_checked',
        requestId,
      });
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

function getCloudinaryClient() {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

function isMongoQuotaError(error) {
  const message = String(error?.message || error?.responseBody?.error || error?.response?.data?.error || '').toLowerCase();
  return (
    message.includes('space quota') ||
    message.includes('writes are blocked') ||
    message.includes('limit=storage') ||
    message.includes('free up storage') ||
    message.includes('quota')
  );
}

function isMongoObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value || '').trim());
}

function cloudinaryBookSlugId(slug) {
  return sanitizeText(slug || '', 180).toLowerCase();
}

async function uploadCloudinaryRawPayload(buffer, folder, publicId) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured for cloud fallback');
  }

  const cloudinary = getCloudinaryClient();
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'raw',
        use_filename: false,
        unique_filename: false,
        overwrite: true,
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
    size: buffer.length,
  };
}

async function uploadCloudinaryBookText(slug, manuscriptMarkdown) {
  const text = String(manuscriptMarkdown || '');
  return uploadCloudinaryRawPayload(
    Buffer.from(text, 'utf8'),
    CLOUDINARY_BOOK_MANUSCRIPT_FOLDER,
    cloudinaryBookSlugId(slug),
  );
}

async function uploadCloudinaryBookPdf(slug, buffer) {
  if (!buffer?.length) return null;
  return uploadCloudinaryRawPayload(buffer, CLOUDINARY_BOOK_PDF_FOLDER, cloudinaryBookSlugId(slug));
}

async function uploadCloudinaryBookDocx(slug, buffer) {
  if (!buffer?.length) return null;
  return uploadCloudinaryRawPayload(buffer, CLOUDINARY_BOOK_DOCX_FOLDER, cloudinaryBookSlugId(slug));
}

async function uploadCloudinaryBookHtml(slug, buffer) {
  if (!buffer?.length) return null;
  return uploadCloudinaryRawPayload(buffer, CLOUDINARY_BOOK_HTML_FOLDER, cloudinaryBookSlugId(slug));
}

async function uploadCloudinaryBookManifest(book, manuscriptMarkdown, manuscriptAsset, extraFormats = {}) {
  const manifest = {
    source: 'cloudinary-raw',
    _id: cloudinaryBookSlugId(book.slug || book.title || 'book'),
    id: cloudinaryBookSlugId(book.slug || book.title || 'book'),
    authorId: String(book.authorId || ''),
    title: book.title || '',
    subtitle: book.subtitle || '',
    authorName: book.authorName || '',
    slug: cloudinaryBookSlugId(book.slug || book.title || 'book'),
    description: book.description || '',
    genre: book.genre || 'general',
    audience: book.audience || 'general',
    language: book.language || 'en',
    status: book.status || 'draft',
    wordCount: Number(book.wordCount || 0),
    publishedAt: book.publishedAt ? new Date(book.publishedAt).toISOString() : null,
    updatedAt: new Date().toISOString(),
    createdAt: book.createdAt ? new Date(book.createdAt).toISOString() : null,
    frontCover: book.frontCover || {},
    backCover: book.backCover || {},
    storage: {
      provider: 'cloudinary-raw',
      manuscript: manuscriptAsset || null,
    },
    manuscriptMarkdown: '',
    manuscriptPdfUrl: extraFormats.pdfUrl || '',
    manuscriptDocxUrl: extraFormats.docxUrl || '',
    manuscriptHtml: extraFormats.htmlUrl || '',
    webHtml: '',
  };

  return uploadCloudinaryRawPayload(
    Buffer.from(JSON.stringify({
      ...manifest,
      manuscriptMarkdown: '',
      manuscript: {
        url: manuscriptAsset?.url || '',
        publicId: manuscriptAsset?.publicId || '',
      },
    }, null, 2), 'utf8'),
    CLOUDINARY_BOOK_MANIFEST_FOLDER,
    cloudinaryBookSlugId(book.slug || book.title || 'book'),
  ).then((asset) => ({
    ...manifest,
    storage: {
      ...manifest.storage,
      manifest: asset,
    },
  }));
}

async function loadCloudinaryBookManifest(slug) {
  if (!isCloudinaryConfigured()) return null;

  const cleanSlug = cloudinaryBookSlugId(slug);
  if (!cleanSlug) return null;

  const cloudinary = getCloudinaryClient();
  const manifestPublicId = `${CLOUDINARY_BOOK_MANIFEST_FOLDER}/${cleanSlug}`;

  try {
    const resource = await cloudinary.api.resource(manifestPublicId, { resource_type: 'raw' });
    const url = resource?.secure_url || resource?.url;
    if (!url) return null;

    const response = await axios.get(url, { timeout: 20000 });
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    if (!data || typeof data !== 'object') return null;

    return {
      ...data,
      _id: data._id || data.id || cleanSlug,
      id: data.id || data._id || cleanSlug,
      slug: data.slug || cleanSlug,
      manuscriptMarkdown: String(data.manuscriptMarkdown || ''),
      manuscriptUrl: String(data.manuscriptUrl || data.manuscript?.url || ''),
      manuscriptType: String(data.manuscriptType || ''),
      manuscriptPdfUrl: String(data.manuscriptPdfUrl || ''),
      manuscriptDocxUrl: String(data.manuscriptDocxUrl || ''),
      manuscriptHtml: String(data.manuscriptHtml || ''),
      webHtml: String(data.webHtml || ''),
    };
  } catch (_error) {
    return null;
  }
}

async function listCloudinaryPublishedBooks() {
  if (!isCloudinaryConfigured()) return [];

  const cloudinary = getCloudinaryClient();
  const results = [];
  try {
    const page = await cloudinary.api.resources({
      resource_type: 'raw',
      type: 'upload',
      prefix: `${CLOUDINARY_BOOK_MANIFEST_FOLDER}/`,
      max_results: 1000,
    });

    const resources = Array.isArray(page?.resources) ? page.resources : [];
    for (const resource of resources) {
      const url = resource?.secure_url || resource?.url;
      if (!url) continue;
      try {
        const response = await axios.get(url, { timeout: 20000 });
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (!data || typeof data !== 'object') continue;
        results.push({
          ...data,
          _id: data._id || data.id || data.slug || '',
          id: data.id || data._id || data.slug || '',
          slug: data.slug || '',
        });
      } catch (_err) {
        // Skip unreadable manifest files and continue with the rest.
      }
    }
  } catch (_error) {
    return results;
  }

  return results;
}

function mergePublishedBooks(primary = [], secondary = []) {
  const merged = [];
  const seen = new Map();
  for (const book of [...primary, ...secondary]) {
    const slug = String(book?.slug || '').trim().toLowerCase();
    const id = String(book?.id || book?._id || '').trim().toLowerCase();
    const key = slug || id;
    if (!key) continue;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, book);
      continue;
    }

    const prevTime = new Date(prev?.updatedAt || prev?.publishedAt || prev?.createdAt || 0).getTime();
    const nextTime = new Date(book?.updatedAt || book?.publishedAt || book?.createdAt || 0).getTime();
    const shouldReplace = nextTime >= prevTime || String(book?.source || '') === 'cloudinary-raw';
    if (shouldReplace) {
      seen.set(key, book);
    }
  }

  for (const value of seen.values()) merged.push(value);
  return merged;
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
    let cloudinaryMatch = null;
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
      if (!match && isCloudinaryConfigured()) {
        cloudinaryMatch = await loadCloudinaryBookManifest(candidate);
      }
    }

    if (!match && !cloudinaryMatch) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function listUserBooks(userId) {
  if (shouldUseFileBookStore()) {
    return listFileBooks({ authorId: String(userId || '') }, { updatedAt: -1, _id: -1 });
  }

  const mongoBooks = await BookProject.find({
    authorId: userId,
  })
    .sort({ updatedAt: -1, _id: -1 })
    .lean();

  const cloudBooks = isCloudinaryConfigured()
    ? (await listCloudinaryPublishedBooks()).filter((book) => String(book.authorId || '') === String(userId || ''))
    : [];

  return mergePublishedBooks(mongoBooks, cloudBooks);
}

async function listPublishedBooks() {
  if (shouldUseFileBookStore()) {
    return await listFileBooks({ status: 'published' }, { publishedAt: -1, updatedAt: -1, _id: -1 });
  }

  const mongoBooks = await BookProject.find({ status: 'published' })
    .select('_id title subtitle authorName slug description genre audience language status wordCount publishedAt updatedAt frontCover.url frontCover.provider frontCover.publicId backCover.url backCover.provider backCover.publicId')
    .sort({ publishedAt: -1, updatedAt: -1, _id: -1 })
    .lean();

  const cloudBooks = isCloudinaryConfigured()
    ? (await listCloudinaryPublishedBooks()).filter((b) => String(b.status || '').toLowerCase() === 'published')
    : [];

  return mergePublishedBooks(mongoBooks, cloudBooks);
}

async function loadBookForEdit(bookId) {
  const normalizedBookId = String(bookId || '').trim();
  const mongoState = getMongoState();
  const connected = mongoState.mode === 'mongo' && mongoState.readyState === 1;
  if (!connected && shouldUseFileBookStore()) {
    return findFileBookById(bookId);
  }

  const cloudinaryBook = await loadCloudinaryBookManifest(normalizedBookId);
  if (cloudinaryBook) return cloudinaryBook;

  if (isMongoObjectId(normalizedBookId)) {
    const book = await BookProject.findById(normalizedBookId);
    if (book) return book;
  }

  if (connected) {
    const bySlug = await BookProject.findOne({ slug: normalizedBookId });
    if (bySlug) return bySlug;
  }

  return null;
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

  const cloudinaryBook = await loadCloudinaryBookManifest(normalized);
  const localBook = await BookProject.findOne({ slug: normalized, status: 'published' }).lean();

  if (cloudinaryBook && String(cloudinaryBook.status || '').toLowerCase() === 'published') {
    if (!localBook) return cloudinaryBook;

    const localTime = new Date(localBook.updatedAt || localBook.publishedAt || localBook.createdAt || 0).getTime();
    const cloudTime = new Date(cloudinaryBook.updatedAt || cloudinaryBook.publishedAt || cloudinaryBook.createdAt || 0).getTime();
    if (cloudTime >= localTime) {
      return cloudinaryBook;
    }
  }

  return localBook || null;
}

async function persistBookRecord(book) {
  const mongoState = getMongoState();
  const connected = mongoState.mode === 'mongo' && mongoState.readyState === 1;
  if (!connected && shouldUseFileBookStore()) {
    return saveFileBook(book);
  }

  if (book && typeof book.save === 'function') {
    return book.save();
  }

  const document = BookProject.hydrate(book || {});
  return document.save();
}

async function saveCloudinaryPublishedBook(book) {
  const sourceBook = typeof book?.toObject === 'function'
    ? book.toObject({ depopulate: true, getters: false, virtuals: false })
    : { ...(book || {}) };
  const slug = cloudinaryBookSlugId(book.slug || book.title || 'book');
  const manuscriptMarkdown = String(book.manuscriptMarkdown || '').trim();
  if (!slug) {
    throw new Error('Unable to generate a stable book slug for cloud fallback');
  }
  if (!manuscriptMarkdown) {
    throw new Error('Manuscript content is required');
  }

  const manuscriptAsset = await uploadCloudinaryBookText(slug, manuscriptMarkdown);

  // Upload extra format files if provided
  const extraFormats = {};
  if (book.manuscriptPdfUrl) extraFormats.pdfUrl = book.manuscriptPdfUrl;
  if (book.manuscriptDocxUrl) extraFormats.docxUrl = book.manuscriptDocxUrl;
  if (book.manuscriptHtml) extraFormats.htmlUrl = book.manuscriptHtml;

  const manifest = await uploadCloudinaryBookManifest(book, manuscriptMarkdown, manuscriptAsset, extraFormats);
  const savedBook = {
    ...sourceBook,
    _id: slug,
    id: slug,
    slug,
    status: sourceBook.status || 'published',
    title: sourceBook.title || book.title || '',
    subtitle: sourceBook.subtitle || book.subtitle || '',
    authorName: sourceBook.authorName || book.authorName || '',
    description: sourceBook.description || book.description || '',
    genre: sourceBook.genre || book.genre || 'general',
    audience: sourceBook.audience || book.audience || 'general',
    language: sourceBook.language || book.language || 'en',
    wordCount: Number(sourceBook.wordCount || book.wordCount || manuscriptMarkdown.split(/\s+/).filter(Boolean).length || 0),
    publishedAt: sourceBook.publishedAt || book.publishedAt || new Date(),
    updatedAt: sourceBook.updatedAt || book.updatedAt || new Date(),
    createdAt: sourceBook.createdAt || book.createdAt || new Date(),
    manuscriptMarkdown: '',
    manuscriptPdfUrl: extraFormats.pdfUrl || '',
    manuscriptDocxUrl: extraFormats.docxUrl || '',
    manuscriptHtml: extraFormats.htmlUrl || '',
    webHtml: '',
    storage: {
      provider: 'cloudinary-raw',
      manuscript: manuscriptAsset,
      manifest: manifest.storage?.manifest || null,
    },
    manuscriptAsset,
    manifestAsset: manifest.storage?.manifest || null,
  };

  return savedBook;
}

async function removeBookRecord(bookId) {
  const mongoState = getMongoState();
  const connected = mongoState.mode === 'mongo' && mongoState.readyState === 1;
  if (!connected && shouldUseFileBookStore()) {
    return deleteFileBook(bookId);
  }

  const strId = String(bookId || '').trim();
  if (isMongoObjectId(strId)) {
    return BookProject.findByIdAndDelete(strId);
  }

  return BookProject.findOneAndDelete({ slug: strId });
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
    manuscriptUrl: book.manuscriptUrl || '',
    manuscriptPdfUrl: book.manuscriptPdfUrl || '',
    manuscriptDocxUrl: book.manuscriptDocxUrl || '',
    manuscriptHtml: book.manuscriptHtml || '',
    mirrors: book.mirrors || {},
    format: book.format || '',
    fileSize: book.fileSize || 0,
    webHtml: book.webHtml || '',
    frontCover: book.frontCover || {},
    backCover: book.backCover || {},
    links: {
      publicPage: publicRoute || '',
      apiView: `${baseRoute}/view`,
      pdf: `${baseRoute}/download/pdf`,
      epub: `${baseRoute}/download/epub`,
      docx: `${baseRoute}/download/docx`,
      viewDocx: `${baseRoute}/view/docx`,
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

function wrapHtmlContent(book, htmlContent) {
  const title = escapeHtml(book.title || 'Book');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      :root{color-scheme:light;}
      body{margin:0;background:#f6f2e8;color:#171717;font-family:Georgia,Times,serif;line-height:1.7;}
      .page{max-width:920px;margin:0 auto;padding:2rem 1.25rem 3rem;}
      .book-hero{padding:1.5rem;border:1px solid #d4c8b4;border-radius:22px;background:#fffdf8;box-shadow:0 10px 30px rgba(60,40,10,.06);margin-bottom:1.5rem;}
      .book-pill{margin:0 0 .6rem;text-transform:uppercase;letter-spacing:.12em;font-size:.76rem;color:#755b2f;font-weight:700;}
      h1,h2,h3{line-height:1.15;margin:0;color:#1d2d46;}
      h1{font-size:clamp(2.1rem,5vw,3.6rem);margin-bottom:.35rem;}
      .book-subtitle,.book-author{margin:.15rem 0;color:#574f43;font-size:1.02rem;}
      .book-meta{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.9rem;}
      .book-meta span{border:1px solid #d8cab0;border-radius:999px;padding:.32rem .7rem;background:#faf2df;color:#7b5c2b;font-size:.86rem;font-weight:700;}
      img{max-width:100%;height:auto;border-radius:12px;}
      blockquote{border-left:4px solid #a08b66;padding-left:1rem;color:#5d5446;margin:1rem 0;}
    </style>
  </head>
  <body>
    <main class="page">
      <header class="book-hero">
        <p class="book-pill">Book edition</p>
        <h1>${title}</h1>
        ${book.subtitle ? `<p class="book-subtitle">${escapeHtml(book.subtitle)}</p>` : ''}
        ${book.authorName ? `<p class="book-author">by ${escapeHtml(book.authorName)}</p>` : ''}
      </header>
      <section class="book-manuscript">${htmlContent}</section>
    </main>
  </body>
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, s-maxage=0');
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
    docx: slug ? `/api/book-publishing/public/${encodeURIComponent(slug)}/download/docx` : '',
    viewDocx: slug ? `/api/book-publishing/public/${encodeURIComponent(slug)}/view/docx` : '',
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
    manuscriptPdfUrl: book.manuscriptPdfUrl || '',
    manuscriptDocxUrl: book.manuscriptDocxUrl || '',
    manuscriptHtml: book.manuscriptHtml || '',
    manuscriptUrl: book.manuscriptUrl || '',
    mirrors: book.mirrors || {},
    format: book.format || '',
    fileSize: book.fileSize || 0,
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

router.post('/signed-upload', authenticateBookPublishing, (req, res) => {
  try {
    const folder = sanitizeText(req.body?.folder || '', 200);
    const resourceType = sanitizeText(req.body?.resourceType || 'raw', 20);
    if (!folder) {
      return res.status(400).json({ ok: false, error: 'folder is required' });
    }
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ ok: false, error: 'Cloudinary not configured' });
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { timestamp, folder };
    const cloudinary = getCloudinaryClient();
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
    return res.json({
      ok: true,
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
      resourceType,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to generate signed upload' });
  }
});

// ── Internet Archive presigned S3 upload ────────────────────────────────────
router.post('/ia-signed-upload', authenticateBookPublishing, (req, res) => {
  console.log('[IA-SIGNED] Request received', {
    hasAuth: !!req.headers.authorization,
    bodyKeys: Object.keys(req.body || {}),
    timestamp: new Date().toISOString(),
  });
  try {
    const iaAccessKey = process.env.IA_ACCESS_KEY;
    const iaSecretKey = process.env.IA_SECRET_KEY;
    if (!iaAccessKey || !iaSecretKey) {
      return res.status(503).json({ ok: false, error: 'Internet Archive credentials not configured' });
    }

    const identifier = sanitizeText(req.body?.identifier || '', 120);
    const filename = sanitizeText(req.body?.filename || '', 200);
    const contentType = sanitizeText(req.body?.contentType || 'application/octet-stream', 100);
    if (!identifier || !filename) {
      return res.status(400).json({ ok: false, error: 'identifier and filename are required' });
    }

    const host = 's3.us.archive.org';
    const bucket = identifier;
    const resource = `/${bucket}/${filename}`;
    const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    // AWS Signature V2 for IA S3
    const stringToSign = `PUT\n\n${contentType}\n${expires}\n${resource}`;
    const hmac = crypto.createHmac('sha1', iaSecretKey);
    hmac.update(stringToSign);
    const signature = hmac.digest('base64');

    const uploadUrl = `https://${host}${resource}?AWSAccessKeyId=${encodeURIComponent(iaAccessKey)}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`;
    const finalUrl = `https://archive.org/download/${identifier}/${filename}`;

    console.log('[IA-SIGNED] Signed URL generated', { identifier, filename, finalUrl });
    return res.json({ ok: true, uploadUrl, finalUrl });
  } catch (error) {
    console.error('[IA-SIGNED] Error generating signed URL:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });
    return res.status(500).json({ ok: false, error: error.message || 'Failed to generate IA signed upload' });
  }
});

// ── Storacha (IPFS + Filecoin) upload delegation ────────────────────────────
router.post('/storacha-upload-url', authenticateBookPublishing, async (req, res) => {
  console.log('[STORACHA] Request received — Storacha temporarily disabled');
  return res.status(503).json({
    ok: false,
    error: 'Storacha upload is temporarily disabled. Internet Archive upload is still available.',
    disabled: true,
  });
});

// ── Diagnostic: test-publish endpoint ───────────────────────────────────────
router.get('/test-publish', (req, res) => {
  console.log('[TEST-PUBLISH] Request received', { timestamp: new Date().toISOString() });
  res.json({
    ok: true,
    message: 'Publish endpoint reachable',
    env: {
      ia: !!process.env.IA_ACCESS_KEY,
      storacha: !!process.env.STORACHA_API_KEY,
      mongodb: !!process.env.MONGODB_URI,
      nodeEnv: process.env.NODE_ENV || 'unknown',
    },
  });
});

// ── Diagnostic: test-publish-direct endpoint ─────────────────────────────────
router.post('/test-publish-direct', authenticateBookPublishing, bookUpload, async (req, res) => {
  try {
    console.log('[TEST-PUBLISH-DIRECT] Request received');
    const bodyKeys = Object.keys(req.body || {});
    const filesKeys = req.files ? Object.keys(req.files) : [];
    const manuscriptLength = req.body?.manuscriptMarkdown ? String(req.body.manuscriptMarkdown).length : 0;

    return res.json({
      ok: true,
      message: 'Publish endpoint POST is reachable',
      received: {
        bodyKeys,
        filesKeys,
        manuscriptLength,
        hasAuth: !!req.headers.authorization,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
      },
      env: {
        ia: !!process.env.IA_ACCESS_KEY,
        storacha: !!process.env.STORACHA_API_KEY,
        mongodb: !!process.env.MONGODB_URI,
      },
    });
  } catch (error) {
    console.error('[TEST-PUBLISH-DIRECT] Error:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Diagnostic: minimal publish (no multer, no archive, no file processing) ─
router.post('/publish-safe', authenticateBookPublishing, async (req, res) => {
  try {
    console.log('[PUBLISH-SAFE] Request received', {
      hasAuth: !!req.headers.authorization,
      bodyKeys: Object.keys(req.body || {}),
      contentType: req.headers['content-type'],
      timestamp: new Date().toISOString(),
    });

    const title = sanitizeText(req.body?.title || '', 240);
    if (!title) {
      return res.status(400).json({ ok: false, error: 'Title is required' });
    }

    const authorId = String(req.user?.id || req.user?._id || '');
    const book = new BookProject({
      authorId,
      title,
      slug: sanitizeText(req.body?.slug || '', 120) || title.toLowerCase().replace(/\s+/g, '-'),
      authorName: sanitizeText(req.body?.authorName || req.user?.name || '', 120),
      description: sanitizeText(req.body?.description || '', 2000),
      manuscriptMarkdown: sanitizeText(req.body?.manuscriptMarkdown || '', 500000),
      status: 'draft',
    });

    await book.save();
    console.log('[PUBLISH-SAFE] Book saved:', book._id);

    return res.status(201).json({
      ok: true,
      item: { id: book._id, title: book.title, slug: book.slug },
    });
  } catch (error) {
    console.error('[PUBLISH-SAFE] Error:', error.message, error.stack);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Diagnostic: reachability without multer ──────────────────────────────────
router.post('/publish-no-multer', authenticateBookPublishing, async (req, res) => {
  try {
    console.log('[PUBLISH-NO-MULTER] Body keys:', Object.keys(req.body || {}));
    console.log('[PUBLISH-NO-MULTER] Has files:', !!req.files);
    return res.json({ ok: true, message: 'Reached handler without multer' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ── Internet Archive upload proxy ───────────────────────────────────────────
// Proxies file uploads to IA S3 to avoid CORS and browser-blocking issues.

router.get('/ia-upload-proxy', (req, res) => {
  console.log('[IA-PROXY] GET ping');
  res.json({ ok: true, method: 'GET', message: 'ia-upload-proxy reachable' });
});

router.post('/ia-upload-proxy', authenticateBookPublishing, async (req, res) => {
  try {
    console.log('[IA-PROXY] Request received, content-type:', req.headers['content-type']);

    const file = req.files?.manuscriptFile?.[0] || req.file;
    const bodyMarkdown = req.body?.manuscriptMarkdown;
    const fileBuffer = file?.buffer || (bodyMarkdown ? Buffer.from(bodyMarkdown, 'utf8') : null);
    const filename = sanitizeText(req.body?.filename || file?.originalname || 'manuscript.md', 200);
    const identifier = sanitizeText(req.body?.identifier || '', 200);

    if (!fileBuffer || !identifier) {
      return res.status(400).json({ ok: false, error: 'fileBuffer and identifier required' });
    }

    const iaAccessKey = process.env.IA_ACCESS_KEY;
    const iaSecretKey = process.env.IA_SECRET_KEY;
    if (!iaAccessKey || !iaSecretKey) {
      return res.status(503).json({ ok: false, error: 'IA credentials not configured' });
    }

    const contentType = 'text/markdown';
    const host = 's3.us.archive.org';
    const bucket = identifier;
    const resource = `/${bucket}/${filename}`;
    const expires = Math.floor(Date.now() / 1000) + 3600;

    const stringToSign = `PUT\n\n${contentType}\n${expires}\n${resource}`;
    const signature = crypto.createHmac('sha1', iaSecretKey).update(stringToSign).digest('base64');
    const uploadUrl = new URL(`https://${host}${resource}`);
    uploadUrl.searchParams.set('AWSAccessKeyId', iaAccessKey);
    uploadUrl.searchParams.set('Expires', String(expires));
    uploadUrl.searchParams.set('Signature', signature);
    const finalUrl = `https://archive.org/download/${identifier}/${filename}`;

    console.log('[IA-PROXY] Uploading to IA S3:', { identifier, filename, size: fileBuffer.length });

    let uploadStatus;
    try {
      const https = require('https');
      uploadStatus = await new Promise((resolve, reject) => {
        const urlStr = uploadUrl.toString();
        const urlObj = new URL(urlStr);
        const reqOpts = {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          timeout: 20000,
        };
        const iaReq = https.request(reqOpts, (iaRes) => {
          let body = '';
          iaRes.on('data', (chunk) => { body += chunk; });
          iaRes.on('end', () => {
            resolve({ status: iaRes.statusCode, body: body.slice(0, 500) });
          });
        });
        iaReq.on('error', (err) => reject(err));
        iaReq.on('timeout', () => { iaReq.destroy(); reject(new Error('timeout')); });
        iaReq.write(fileBuffer);
        iaReq.end();
      });
    } catch (uploadErr) {
      console.error('[IA-PROXY] S3 upload error:', String(uploadErr));
      return res.status(502).json({ ok: false, error: `S3 upload failed: ${String(uploadErr).slice(0, 300)}`, finalUrl });
    }

    console.log('[IA-PROXY] Upload result:', uploadStatus.status, finalUrl);
    return res.json({ ok: true, status: uploadStatus.status, url: finalUrl, identifier, filename });
  } catch (error) {
    const errMsg = String(error?.message || 'IA proxy upload failed').slice(0, 500);
    console.error('[IA-PROXY] Upload failed:', errMsg);
    return res.status(500).json({ ok: false, error: errMsg });
  }
});

router.post('/', authenticateBookPublishing, bookUpload, async (req, res) => {
  const requestId = req.requestId || crypto.randomUUID();
  console.log('[PUBLISH] Request received', {
    requestId,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    hasAuth: !!req.headers.authorization,
    bodyKeys: Object.keys(req.body || {}),
    filesKeys: req.files ? Object.keys(req.files) : 'none',
    manuscriptLength: req.body?.manuscriptMarkdown ? String(req.body.manuscriptMarkdown).length : 0,
    hasMirrors: !!req.body?.mirrors,
    timestamp: new Date().toISOString(),
  });
  let stage = 'received_request';
  try {
    stage = 'auth_checked';

    const bookId = sanitizeText(req.body?.bookId || '', 120);
    const title = sanitizeText(req.body?.title || '', 240);
    if (!title) {
      throw new Error('Title is required');
    }

    stage = 'payload_parsed';

    let book = null;
    if (bookId && isMongoObjectId(bookId)) {
      book = await loadBookForEdit(bookId);
      if (!book) throw new Error('Book not found');
      if (!canEditBook(req, book)) throw new Error('Unauthorized to edit book');
    } else {
      const authorId = String(req.user?.id || req.user?._id || '');
      if (shouldUseFileBookStore()) {
        book = { authorId };
      } else {
        book = new BookProject({ authorId });
      }
    }

    stage = 'fields_validated';

    const previousStatus = book.status || 'draft';
    const requestedPublish = parseBoolean(req.body?.publish);
    const shouldPublish = requestedPublish || previousStatus === 'published';
    const frontFile = req.files?.frontCover?.[0];
    const backFile = req.files?.backCover?.[0];
    const manuscriptFile = req.files?.manuscriptFile?.[0];

    stage = 'size_checked';

    // Accept pre-uploaded Cloudinary URLs from frontend direct upload
    const frontCoverUrl = sanitizeText(req.body?.frontCoverUrl || '', 500);
    const frontCoverPublicId = sanitizeText(req.body?.frontCoverPublicId || '', 200);
    const backCoverUrl = sanitizeText(req.body?.backCoverUrl || '', 500);
    const backCoverPublicId = sanitizeText(req.body?.backCoverPublicId || '', 200);

    if (frontCoverUrl && !/^https?:\/\//i.test(frontCoverUrl)) {
      throw new Error('Invalid front cover URL');
    }
    if (backCoverUrl && !/^https?:\/\//i.test(backCoverUrl)) {
      throw new Error('Invalid back cover URL');
    }

    stage = 'cloudinary_fields_checked';

    if (frontFile && !CLOUDINARY_ALLOWED_IMAGE_TYPES.has(String(frontFile.mimetype || '').toLowerCase())) {
      throw new Error('Front cover must be an image file');
    }
    if (backFile && !CLOUDINARY_ALLOWED_IMAGE_TYPES.has(String(backFile.mimetype || '').toLowerCase())) {
      throw new Error('Back cover must be an image file');
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

    stage = 'files_processed';

    let manuscriptMarkdown = sanitizeText(req.body?.manuscriptMarkdown || '', 2_000_000);
    if (manuscriptFile) {
      manuscriptMarkdown = await extractManuscriptTextFromUpload(manuscriptFile);
    }

    if (manuscriptMarkdown) {
      book.manuscriptMarkdown = manuscriptMarkdown;
    }

    // Allow manuscript URL from Cloudinary as alternative to manuscript text
    const manuscriptUrl = sanitizeText(req.body?.manuscriptUrl || '', 500);
    const manuscriptType = sanitizeText(req.body?.manuscriptType || '', 20);
    if (manuscriptUrl && /^https?:\/\//i.test(manuscriptUrl)) {
      book.manuscriptUrl = manuscriptUrl;
      book.manuscriptType = manuscriptType || 'raw';
    }

    // Accept archival mirror URLs, format, and fileSize from frontend archive uploads
    let mirrors = {};
    try {
      const mirrorsRaw = req.body?.mirrors;
      mirrors = typeof mirrorsRaw === 'string' ? JSON.parse(mirrorsRaw) : (mirrorsRaw || {});
    } catch (_e) { mirrors = {}; }

    const archiveFormat = sanitizeText(req.body?.format || '', 10);
    const archiveFileSize = parseInt(req.body?.fileSize, 10) || 0;

    if (mirrors.archiveOrg || mirrors.ipfs) {
      book.mirrors = {
        archiveOrg: sanitizeText(mirrors.archiveOrg || '', 500),
        ipfs: sanitizeText(mirrors.ipfs || '', 500),
        ipfsCid: sanitizeText(mirrors.ipfsCid || '', 200),
        github: sanitizeText(mirrors.github || '', 500),
      };
      if (archiveFormat) book.format = archiveFormat;
      if (archiveFileSize > 0) book.fileSize = archiveFileSize;

      // Set manuscriptUrl to primary archive if not already set
      if (!book.manuscriptUrl && mirrors.archiveOrg) {
        book.manuscriptUrl = book.mirrors.archiveOrg;
      }

      // Clear manuscriptMarkdown from DB — the text now lives in archives
      if (book.manuscriptMarkdown) {
        console.log('[book-publishing] Archive mirrors present; manuscriptMarkdown cleared from DB record');
        book.manuscriptMarkdown = '';
      }
    }

    if (!book.manuscriptMarkdown && !book.manuscriptUrl && !book.mirrors?.archiveOrg && !book.mirrors?.ipfs) {
      throw new Error('Manuscript content is required (text or file URL)');
    }

    stage = 'manuscript_validated';

    // Handle PDF manuscript upload
    const manuscriptPdfFile = req.files?.manuscriptPdf?.[0];
    if (manuscriptPdfFile?.buffer) {
      const pdfResult = await uploadCloudinaryBookPdf(book.slug || book.title, manuscriptPdfFile.buffer);
      if (pdfResult?.url) {
        book.manuscriptPdfUrl = pdfResult.url;
      }
    }
    // Accept pre-uploaded PDF URL
    const manuscriptPdfUrl = sanitizeText(req.body?.manuscriptPdfUrl || '', 500);
    if (manuscriptPdfUrl && /^https?:\/\//i.test(manuscriptPdfUrl)) {
      book.manuscriptPdfUrl = manuscriptPdfUrl;
    }

    // Handle DOCX manuscript upload
    const manuscriptDocxFile = req.files?.manuscriptDocx?.[0];
    if (manuscriptDocxFile?.buffer) {
      const docxResult = await uploadCloudinaryBookDocx(book.slug || book.title, manuscriptDocxFile.buffer);
      if (docxResult?.url) {
        book.manuscriptDocxUrl = docxResult.url;
      }
    }
    // Accept pre-uploaded DOCX URL
    const manuscriptDocxUrl = sanitizeText(req.body?.manuscriptDocxUrl || '', 500);
    if (manuscriptDocxUrl && /^https?:\/\//i.test(manuscriptDocxUrl)) {
      book.manuscriptDocxUrl = manuscriptDocxUrl;
    }

    // Handle HTML manuscript upload
    const manuscriptHtmlFile = req.files?.manuscriptHtml?.[0];
    if (manuscriptHtmlFile?.buffer) {
      const htmlResult = await uploadCloudinaryBookHtml(book.slug || book.title, manuscriptHtmlFile.buffer);
      if (htmlResult?.url) {
        book.manuscriptHtml = htmlResult.url;
      }
    }
    // Accept pre-uploaded HTML URL
    const manuscriptHtmlUrl = sanitizeText(req.body?.manuscriptHtmlUrl || '', 500);
    if (manuscriptHtmlUrl && /^https?:\/\//i.test(manuscriptHtmlUrl)) {
      book.manuscriptHtml = manuscriptHtmlUrl;
    }

    book.title = title;
    book.subtitle = sanitizeText(req.body?.subtitle || '', 240);
    book.authorName = sanitizeText(req.body?.authorName || req.user?.name || '', 160);
    book.description = sanitizeText(req.body?.description || '', 4000);
    book.category = sanitizeText(req.body?.category || 'General', 80);
    book.genre = sanitizeText(req.body?.genre || 'general', 80).toLowerCase() || 'general';
    book.audience = sanitizeText(req.body?.audience || 'general', 80).toLowerCase() || 'general';
    book.language = sanitizeText(req.body?.language || 'en', 24).toLowerCase() || 'en';
    
    // Handle cover URL from Cloudinary direct upload
    const coverUrl = sanitizeText(req.body?.coverUrl || '', 500);
    if (coverUrl && /^https?:\/\//i.test(coverUrl)) {
      book.coverUrl = coverUrl;
    }
    
    book.slug = await resolveUniqueSlug(req.body?.slug || book.title, book._id);
    book.authorId = String(book.authorId || req.user?.id || req.user?._id || '');
    book.wordCount = String(book.manuscriptMarkdown || '')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean).length;
    book.status = shouldPublish ? 'published' : 'draft';
    book.isApproved = req.body?.isApproved !== false; // Default true unless explicitly false
    if (shouldPublish && previousStatus !== 'published') {
      book.publishedAt = new Date();
      book.publishedVersion = (Number(book.publishedVersion || 0) || 0) + 1;
    } else if (shouldPublish && !book.publishedAt) {
      book.publishedAt = new Date();
    }

    stage = 'properties_set';
    stage = 'slug_generated';
    stage = 'duplicate_checked';

    const useFileStore = shouldUseFileBookStore();
    let savedBook = null;

    stage = 'mongo_save_started';

    if (useFileStore) {
      stage = 'store_decision_file';
      savedBook = await persistBookRecord(book);
      stage = 'file_store_saved';
      const renderBase = shouldPublish
        ? `/api/book-publishing/public/${encodeURIComponent(savedBook.slug)}`
        : `/api/book-publishing/${encodeURIComponent(savedBook._id || '')}`;
      savedBook.webHtml = renderBookHtml(renderableBook(savedBook, renderBase));
      stage = 'file_store_html_set';
      savedBook.lastRenderedAt = new Date().toISOString();
      savedBook = await persistBookRecord(savedBook);
      stage = 'file_store_final';
    } else {
      // Mongo-backed publishing must stay lightweight. Render HTML on demand
      // from the public / view routes instead of storing the full HTML blob.
      stage = 'store_decision_mongo';
      book.webHtml = '';
      book.lastRenderedAt = new Date().toISOString();
      try {
        savedBook = await persistBookRecord(book);
        stage = 'mongo_saved';
      } catch (persistError) {
        console.error('[book-publishing] persistBookRecord error:', {
          name: persistError?.name,
          code: persistError?.code,
          message: persistError?.message,
          stack: persistError?.stack?.split('\n').slice(0, 5).join('\n'),
        });
        if (isMongoQuotaError(persistError) && isCloudinaryConfigured()) {
          console.warn('⚠️ Mongo storage quota hit for book publishing; falling back to Cloudinary raw storage.');
          savedBook = await saveCloudinaryPublishedBook(book);
          stage = 'fallback_to_cloudinary';
        } else {
          throw persistError;
        }
      }
    }

    stage = 'mongo_save_success';
    stage = 'ready_to_respond';

    return res.status(bookId ? 200 : 201).json({
      ok: true,
      item: bookSummary(savedBook?.toObject ? savedBook.toObject() : savedBook || book),
    });
  } catch (error) {
    // Determine status code and error details based on error type
    let statusCode = 500;
    let errorObj = { ok: false, error: 'Internal server error', message: 'An unexpected error occurred', stage, requestId };

    // Handle specific errors
    if (error.message === 'Title is required') {
      statusCode = 400;
      errorObj.error = 'missing_title';
      errorObj.message = 'Title is required';
    } else if (error.message === 'Manuscript content is required') {
      statusCode = 400;
      errorObj.error = 'missing_manuscript';
      errorObj.message = 'Manuscript content is required';
    } else if (error.message === 'Book not found') {
      statusCode = 404;
      errorObj.error = 'book_not_found';
      errorObj.message = 'Book not found';
    } else if (error.message === 'Unauthorized to edit book') {
      statusCode = 403;
      errorObj.error = 'unauthorized_edit';
      errorObj.message = 'You do not have permission to edit this book';
    } else if (error.message === 'Front cover must be an image file' ||
               error.message === 'Back cover must be an image file') {
      statusCode = 400;
      errorObj.error = 'invalid_file_type';
      errorObj.message = error.message;
    } else if (error.message === 'Invalid front cover URL' ||
               error.message === 'Invalid back cover URL') {
      statusCode = 400;
      errorObj.error = 'invalid_cover_url';
      errorObj.message = error.message;
    } else if (error.code === 11000 ||
               (error.name === 'MongoError' && error.code === 11000) ||
               (error.name === 'MongoServerError' && error.code === 11000)) {
      statusCode = 409;
      errorObj.error = 'duplicate_slug';
      errorObj.message = 'A book with this slug already exists. Choose a different slug.';
    } else if (error.name === 'MulterError' || (error.message && error.message.includes('File too large'))) {
      statusCode = 413;
      errorObj.error = 'file_too_large';
      errorObj.message = 'One or more uploaded files exceed the allowed size limit.';
    } else if (error.message && (error.message.includes('Unauthorized') || error.message.includes('invalid token'))) {
      statusCode = 401;
      errorObj.error = 'invalid_auth';
      errorObj.message = 'Invalid or missing authentication token';
    } else {
      // Generic error
      errorObj.error = error.name || 'unknown_error';
      errorObj.message = error.message || 'Something went wrong';
      errorObj.stage = stage;
    }

    // Safe logging (avoid leaking secrets)
    console.error('[book-publishing] publish failed', {
      requestId,
      stage,
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    return res.status(statusCode).json(errorObj);
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

    // Try archive mirrors first (manuscript text now lives in archives, not MongoDB)
    if (!book.manuscriptMarkdown) {
      const mirrorUrls = [
        book.mirrors?.archiveOrg,
        book.mirrors?.ipfs,
        book.manuscriptUrl,
      ].filter(Boolean);

      for (const url of mirrorUrls) {
        try {
          const resp = await axios.get(url, { timeout: 30000, responseType: 'text' });
          const fetched = String(resp.data || '');
          if (fetched.length > 100) {
            book.manuscriptMarkdown = fetched;
            break;
          }
        } catch (_e) {}
      }
    }

    // Prefer HTML manuscript if available
    if (book.manuscriptHtml && !book.manuscriptMarkdown) {
      try {
        const resp = await axios.get(book.manuscriptHtml, { timeout: 30000, responseType: 'text' });
        const fetched = String(resp.data || '');
        if (fetched.length > 50) {
          // HTML file content - wrap it in our page template
          return res.status(200).type('html').send(wrapHtmlContent(book, fetched));
        }
      } catch (_e) {}
    }

    // Fall back to manuscriptUrl (markdown text)
    if (!book.manuscriptMarkdown && book.manuscriptUrl) {
      try {
        const resp = await axios.get(book.manuscriptUrl, { timeout: 30000, responseType: 'text' });
        const fetched = String(resp.data || '');
        if (fetched.length > 100) {
          book.manuscriptMarkdown = fetched;
        }
      } catch (_e) {}
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

router.get('/public/:slug/download/docx', async (req, res) => {
  try {
    setNoCacheHeaders(res);
    const book = await loadBookForSlug(req.params.slug);
    if (!book) return notFound(res);

    if (!book.manuscriptDocxUrl) {
      return res.status(404).json({ ok: false, error: 'DOCX version not available for this book' });
    }

    const response = await axios.get(book.manuscriptDocxUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const filename = `${sanitizeFilename(book.slug || book.title || 'book')}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(response.data));
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to download DOCX' });
  }
});

router.get('/public/:slug/view/docx', async (req, res) => {
  try {
    setNoCacheHeaders(res);
    const book = await loadBookForSlug(req.params.slug);
    if (!book) {
      return res.status(404).type('html').send(renderNotFoundHtml('This book has not been published yet.'));
    }

    if (!book.manuscriptDocxUrl) {
      return res.status(404).type('html').send(renderNotFoundHtml('DOCX version not available for this book.'));
    }

    // Fetch DOCX and convert to HTML using mammoth
    const response = await axios.get(book.manuscriptDocxUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const docxBuffer = Buffer.from(response.data);

    if (!mammoth) {
      return res.status(200).type('html').send(wrapHtmlContent(book,
        `<p style="padding:1.5rem;text-align:center;color:#574f43;">DOCX viewer not available. <a href="${escapeHtml(book.manuscriptDocxUrl)}" target="_blank" rel="noreferrer">Download the DOCX file</a> instead.</p>`
      ));
    }

    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    const htmlContent = String(result?.value || '<p>No content found in DOCX.</p>');

    return res.status(200).type('html').send(wrapHtmlContent(book, htmlContent));
  } catch (error) {
    return res.status(500).type('html').send(renderNotFoundHtml(error.message || 'Unable to render DOCX'));
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

    // Try archive mirrors first (manuscript text now lives in archives, not MongoDB)
    if (!book.manuscriptMarkdown) {
      const mirrorUrls = [
        book.mirrors?.archiveOrg,
        book.mirrors?.ipfs,
        book.manuscriptUrl,
      ].filter(Boolean);

      for (const url of mirrorUrls) {
        try {
          const resp = await axios.get(url, { timeout: 30000, responseType: 'text' });
          const fetched = String(resp.data || '');
          if (fetched.length > 100) {
            book.manuscriptMarkdown = fetched;
            break;
          }
        } catch (_e) {}
      }
    }

    // Prefer HTML manuscript if available
    if (book.manuscriptHtml && !book.manuscriptMarkdown) {
      try {
        const resp = await axios.get(book.manuscriptHtml, { timeout: 30000, responseType: 'text' });
        const fetched = String(resp.data || '');
        if (fetched.length > 50) {
          return res.status(200).type('html').send(wrapHtmlContent(book, fetched));
        }
      } catch (_e) {}
    }

    // Fall back to manuscriptUrl (markdown text)
    if (!book.manuscriptMarkdown && book.manuscriptUrl) {
      try {
        const resp = await axios.get(book.manuscriptUrl, { timeout: 30000, responseType: 'text' });
        const fetched = String(resp.data || '');
        if (fetched.length > 100) {
          book.manuscriptMarkdown = fetched;
        }
      } catch (_e) {}
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

router.get('/:bookId/download/docx', authenticateBookPublishing, async (req, res) => {
  try {
    setNoCacheHeaders(res);
    const book = await loadBookForEdit(req.params.bookId);
    if (!book) return notFound(res);
    if (!canViewBook(req, book)) {
      return res.status(403).json({ ok: false, error: 'You do not have permission to download this book' });
    }

    if (!book.manuscriptDocxUrl) {
      return res.status(404).json({ ok: false, error: 'DOCX version not available for this book' });
    }

    const response = await axios.get(book.manuscriptDocxUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const filename = `${sanitizeFilename(book.slug || book.title || 'book')}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(response.data));
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to download DOCX' });
  }
});

router.get('/:bookId/view/docx', authenticateBookPublishing, async (req, res) => {
  try {
    setNoCacheHeaders(res);
    const book = await loadBookForEdit(req.params.bookId);
    if (!book) return res.status(404).type('html').send(renderNotFoundHtml('Book not found.'));
    if (!canViewBook(req, book)) {
      return res.status(403).type('html').send(renderNotFoundHtml('You do not have permission to view this book.'));
    }

    if (!book.manuscriptDocxUrl) {
      return res.status(404).type('html').send(renderNotFoundHtml('DOCX version not available for this book.'));
    }

    const response = await axios.get(book.manuscriptDocxUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const docxBuffer = Buffer.from(response.data);

    if (!mammoth) {
      return res.status(200).type('html').send(wrapHtmlContent(book,
        `<p style="padding:1.5rem;text-align:center;color:#574f43;">DOCX viewer not available. <a href="${escapeHtml(book.manuscriptDocxUrl)}" target="_blank" rel="noreferrer">Download the DOCX file</a> instead.</p>`
      ));
    }

    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    const htmlContent = String(result?.value || '<p>No content found in DOCX.</p>');

    return res.status(200).type('html').send(wrapHtmlContent(book, htmlContent));
  } catch (error) {
    return res.status(500).type('html').send(renderNotFoundHtml(error.message || 'Unable to render DOCX'));
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

    if (isCloudinaryConfigured()) {
      const slug = String(book.slug || '').trim();
      const cloudinary = getCloudinaryClient();
      const idsToDelete = [];

      if (slug) {
        idsToDelete.push(
          `${CLOUDINARY_BOOK_MANIFEST_FOLDER}/${cloudinaryBookSlugId(slug)}`,
          `${CLOUDINARY_BOOK_MANUSCRIPT_FOLDER}/${cloudinaryBookSlugId(slug)}`,
          `${CLOUDINARY_BOOK_PDF_FOLDER}/${cloudinaryBookSlugId(slug)}`,
          `${CLOUDINARY_BOOK_DOCX_FOLDER}/${cloudinaryBookSlugId(slug)}`,
          `${CLOUDINARY_BOOK_HTML_FOLDER}/${cloudinaryBookSlugId(slug)}`,
        );
      }

      if (book.frontCover?.publicId) {
        idsToDelete.push(book.frontCover.publicId);
      }
      if (book.backCover?.publicId) {
        idsToDelete.push(book.backCover.publicId);
      }

      if (idsToDelete.length) {
        await cloudinary.api.delete_resources(idsToDelete, { resource_type: 'raw' }).catch(() => {});
      }
    }

    await removeBookRecord(book._id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to delete book' });
  }
});


// Admin-only endpoint to delete test books
router.delete('/admin/cleanup-test-books', authenticateToken, adminOnly, async (req, res) => {
  try {
    const TEST_BOOK_TITLES = [
      'Mongo Test Book 1784321779305',
      'Codex Cover Smoke Test 1784674070980',
      'Codex Live Smoke Preserve Fields 1784674508',
      'Codex Live Smoke Preserve Fields 1784674561',
      'Codex Smoke Test Book 1784673930989',
      'Diagnostic Test 1784747016',
      'E2E Publish bc509452',
      'Final Test 3c6024e3',
      'Multipart Probe',
      'Publish Probe',
      'Published Book 19d48310',
    ];

    const testBooks = await BookProject.find({
      title: { $in: TEST_BOOK_TITLES }
    });

    if (testBooks.length === 0) {
      return res.json({ ok: true, message: 'No test books found to delete', deletedCount: 0 });
    }

    const deleteResult = await BookProject.deleteMany({
      title: { $in: TEST_BOOK_TITLES }
    });

    return res.json({ 
      ok: true, 
      message: `Deleted ${deleteResult.deletedCount} test books`,
      deletedCount: deleteResult.deletedCount,
      deletedBooks: testBooks.map(b => ({ id: b._id, title: b.title }))
    });
  } catch (error) {
    console.error('[book-publishing] cleanup test books error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Failed to delete test books' });
  }
});


router.get('/debug/public-counts', async (req, res) => {
  try {
    setNoCacheHeaders(res);
    const requestId = crypto.randomUUID();
    const queryParams = req.query;
    const mongoState = getMongoState();
    const mongoConnected = mongoState?.connected === true;
    const mongoReadyState = mongoState?.readyState;
    const storeMode = shouldUseFileBookStore() ? 'file' : 'mongo';
    const cloudinaryConfigured = isCloudinaryConfigured();
    
    let totalMongoBooks = 0;
    let publishedMongoBooks = 0;
    let draftMongoBooks = 0;
    let sampleMongoPublishedIds = [];
    let areIdsMongoStyle = false;
    let dataSourceUsed = 'unknown';
    let totalReturnedItems = 0;
    let sampleReturnedIds = [];

    if (!shouldUseFileBookStore() && getMongoState()?.readyState === 1) {
      dataSourceUsed = 'mongo';
      const [total, published, draft] = await Promise.all([
        BookProject.countDocuments(),
        BookProject.countDocuments({ status: 'published' }),
        BookProject.countDocuments({ status: 'draft' }),
      ]);
      totalMongoBooks = total;
      publishedMongoBooks = published;
      draftMongoBooks = draft;

      const sample = await BookProject.find({ status: 'published' }, '_id').limit(5);
      sampleMongoPublishedIds = sample.map(doc => doc._id.toString());
      areIdsMongoStyle = sampleMongoPublishedIds.every(id => /^[0-9a-fA-F]{24}$/.test(id));
      
      // Get actual returned items from listPublishedBooks
      const publishedBooks = await listPublishedBooks();
      totalReturnedItems = publishedBooks.length;
      sampleReturnedIds = publishedBooks.slice(0, 5).map(book => book._id?.toString() || book.id?.toString() || 'unknown');
    } else if (shouldUseFileBookStore()) {
      dataSourceUsed = 'file';
      const fileBooks = await listFileBooks({ status: 'published' }, { publishedAt: -1 });
      totalReturnedItems = fileBooks.length;
      sampleReturnedIds = fileBooks.slice(0, 5).map(book => book.id || 'unknown');
    } else {
      dataSourceUsed = 'none';
    }

    const buildInfo = getBuildInfo();

    res.json({
      ok: true,
      requestId,
      queryParams,
      deployedSha: buildInfo.sha || 'unknown',
      deploymentId: buildInfo.deploymentId || 'unknown',
      branch: buildInfo.branch || 'unknown',
      cacheControlHeadersApplied: true,
      mongoConnected,
      mongoReadyState,
      storeMode,
      dataSourceUsed,
      cloudinaryConfigured,
      totalMongoBooks,
      publishedMongoBooks,
      draftMongoBooks,
      totalReturnedItems,
      sampleMongoPublishedIds,
      sampleReturnedIds,
      areIdsMongoStyle,
    });
  } catch (error) {
    console.error('[book-publishing] debug endpoint error:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to get debug counts',
    });
  }
});

router.get('/debug/test-save', async (req, res) => {
  try {
    setNoCacheHeaders(res);
    const mongoState = getMongoState();
    const connected = mongoState.mode === 'mongo' && mongoState.readyState === 1;
    if (!connected) {
      return res.json({ ok: false, error: 'MongoDB not connected', mongoState });
    }
    const testDoc = new BookProject({
      authorId: 'debug-test',
      title: `Debug Save Test ${Date.now()}`,
      status: 'draft',
    });
    const saved = await testDoc.save();
    await BookProject.findByIdAndDelete(saved._id);
    res.json({ ok: true, savedId: saved._id.toString(), message: 'MongoDB write successful' });
  } catch (error) {
    res.json({
      ok: false,
      error: error.message,
      name: error.name,
      code: error.code,
      codeName: error.codeName,
    });
  }
});

router.get('/debug/collection-stats', async (req, res) => {
  try {
    setNoCacheHeaders(res);
    const mongoState = getMongoState();
    if (mongoState.mode !== 'mongo' || mongoState.readyState !== 1) {
      return res.json({ ok: false, error: 'MongoDB not connected', mongoState });
    }
    const db = mongoose.connection.db;
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();
    const collectionStats = [];
    for (const col of collections) {
      try {
        const colStats = await db.collection(col.name).stats();
        collectionStats.push({
          name: col.name,
          count: colStats.count,
          sizeBytes: colStats.size,
          storageSizeBytes: colStats.storageSize,
          avgObjSizeBytes: colStats.avgObjSize,
        });
      } catch {
        collectionStats.push({ name: col.name, error: 'failed to stats' });
      }
    }
    res.json({
      ok: true,
      dbStats: {
        db: stats.db,
        collections: stats.collections,
        objects: stats.objects,
        dataSizeBytes: stats.dataSize,
        storageSizeBytes: stats.storageSize,
        indexSizeBytes: stats.indexSize,
        totalSizeBytes: stats.totalSize,
      },
      collections: collectionStats.sort((a, b) => (b.storageSizeBytes || 0) - (a.storageSizeBytes || 0)),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
