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
import { uploadToInternetArchive } from '../lib/manuscriptArchives';
import { ENV } from '../config/env';
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

const MAX_BACKEND_PUBLISH_BYTES = 4 * 1024 * 1024;

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let next = value;
  let unitIndex = 0;
  while (next >= 1024 && unitIndex < units.length - 1) {
    next /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : next >= 10 ? 1 : 2;
  return `${next.toFixed(precision)} ${units[unitIndex]}`;
}

function estimateTextBytes(value) {
  try {
    return new TextEncoder().encode(String(value || '')).length;
  } catch (_err) {
    return String(value || '').length;
  }
}

function estimateMultipartOverhead(fieldCount = 0, fileCount = 0) {
  return 8 * 1024 + (fieldCount * 256) + (fileCount * 768);
}

function getBookPublishRequestUrl() {
  const base = getApiBase().replace(/\/+$/, '');
  return `${base}/book-publishing`;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error || new Error('Failed to load image'));
    };
    image.src = objectUrl;
  });
}

async function compressCoverFile(file, fallbackName) {
  if (!file) return null;
  if (typeof document === 'undefined') {
    return file;
  }

  try {
    const image = await loadImageFromFile(file);
    const width = Number(image.naturalWidth || image.width || 0);
    const height = Number(image.naturalHeight || image.height || 0);
    if (!width || !height) return file;

    const maxWidth = 1600;
    const targetWidth = Math.min(width, maxWidth);
    const targetHeight = Math.max(1, Math.round((height * targetWidth) / width));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/jpeg', 0.8);
    });

    if (!blob) return file;

    const safeName = String(fallbackName || file.name || 'cover')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    return new File([blob], `${safeName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified || Date.now(),
    });
  } catch (_err) {
    return file;
  }
}



function minifyHtml(html) {
  if (!html || typeof html !== 'string') return html;
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\DOCTYPE[^>]*>/gi, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s+\/>/g, '/>')
    .trim();
}

async function compressFileForUpload(file, maxBytes = 500000) {
  if (!file) return file;
  if (file.size <= maxBytes) return file;
  if (file.type === 'text/html' || file.name?.endsWith('.html') || file.name?.endsWith('.htm')) {
    const text = await file.text();
    const minified = minifyHtml(text);
    if (new Blob([minified]).size < file.size) {
      return new Blob([minified], { type: 'text/html' });
    }
  }
  return file;
}

async function uploadFormatFileViaSignedUrl(file, folder, resourceType = 'raw', apiBase, authToken) {
  const signedRes = await fetch(`${apiBase}/book-publishing/signed-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ folder, resourceType }),
  });
  if (!signedRes.ok) {
    const errData = await signedRes.json().catch(() => ({}));
    throw new Error(errData.error || `Signed upload request failed (${signedRes.status})`);
  }
  const { signature, timestamp, apiKey, cloudName } = await signedRes.json();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('resource_type', resourceType);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
  if (!uploadRes.ok) {
    const errBody = await uploadRes.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Cloudinary upload failed (${uploadRes.status})`);
  }
  const data = await uploadRes.json();
  return { secure_url: data.secure_url, public_id: data.public_id };
}

function describePublishFailure(error, { requestUrl, tokenPresent }) {
  const status = Number(error?.status || error?.response?.status || 0);
  const statusText =
    String(error?.statusText || error?.response?.statusText || (status ? 'HTTP error' : 'Network error')).trim();
  const responseBody = error?.responseBody || error?.data || error?.response?.data || null;
  const bodyText =
    typeof responseBody === 'string'
      ? responseBody
      : responseBody
        ? JSON.stringify(responseBody, null, 2)
        : '(none)';
  const requestId = responseBody?.requestId || '';
  const stage = responseBody?.stage || '';
  const backendError = responseBody?.error || '';
  const backendMessage = responseBody?.message || '';
  const lines = [
    'Online publish failed.',
    `Request URL: ${requestUrl || getBookPublishRequestUrl()}`,
    `HTTP status: ${status || 'network error'}`,
    `Status text: ${statusText || 'Network error'}`,
  ];
  if (backendError) lines.push(`Backend error: ${backendError}`);
  if (backendMessage) lines.push(`Backend message: ${backendMessage}`);
  if (requestId) lines.push(`Request ID: ${requestId}`);
  if (stage) lines.push(`Stage: ${stage}`);
  if (bodyText !== '(none)') lines.push(`Backend response body: ${bodyText}`);
  lines.push(`Auth token present: ${tokenPresent ? 'yes' : 'no'}`);
  return lines.join('\n');
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

  const frontCoverUrl = String(book?.frontCover?.url || '');
  const backCoverUrl = String(book?.backCover?.url || '');
  if (frontCoverUrl && /^https?:\/\//i.test(frontCoverUrl) && !frontCoverUrl.startsWith('data:')) {
    payload.append('frontCoverUrl', frontCoverUrl);
    payload.append('frontCoverPublicId', book?.frontCover?.publicId || '');
  } else if (frontCoverUrl.startsWith('data:')) {
    const frontCoverFile = await dataUrlToFile(
      frontCoverUrl,
      book?.frontCover?.originalName || `${book?.slug || 'book'}-front-cover`,
      book?.frontCover?.mimeType || 'image/png',
    );
    if (frontCoverFile) {
      payload.append('frontCover', frontCoverFile, frontCoverFile.name || `${book?.slug || 'book'}-front-cover`);
    }
  }

  if (backCoverUrl && /^https?:\/\//i.test(backCoverUrl) && !backCoverUrl.startsWith('data:')) {
    payload.append('backCoverUrl', backCoverUrl);
    payload.append('backCoverPublicId', book?.backCover?.publicId || '');
  } else if (backCoverUrl.startsWith('data:')) {
    const backCoverFile = await dataUrlToFile(
      backCoverUrl,
      book?.backCover?.originalName || `${book?.slug || 'book'}-back-cover`,
      book?.backCover?.mimeType || 'image/png',
    );
    if (backCoverFile) {
      payload.append('backCover', backCoverFile, backCoverFile.name || `${book?.slug || 'book'}-back-cover`);
    }
  }

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
  const [htmlFile, setHtmlFile] = useState(null);
  const [htmlFileName, setHtmlFileName] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [docxFile, setDocxFile] = useState(null);
  const [docxFileName, setDocxFileName] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedBookSlug, setSavedBookSlug] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [archiveStatus, setArchiveStatus] = useState({ ia: false, ipfs: false, storacha: false, pinata: false, uploading: false });
  const frontCoverInputRef = useRef(null);
  const backCoverInputRef = useRef(null);
  const manuscriptInputRef = useRef(null);
  const htmlInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const docxInputRef = useRef(null);
  const manuscriptImportedTextRef = useRef('');
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
    setHtmlFile(null);
    setHtmlFileName('');
    setPdfFile(null);
    setPdfFileName('');
    setDocxFile(null);
    setDocxFileName('');
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
      const isAuth = err?.status === 401 || err?.response?.status === 401
        || /auth|token|session/i.test(String(err?.message || ''));
      if (isAuth) {
        try { localStorage.removeItem('token'); } catch (_) {}
        if (typeof window !== 'undefined' && !window.location.hash.startsWith('#/login')) {
          window.location.assign('/#/login');
        }
        return;
      }
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
    setHtmlFile(null);
    setHtmlFileName('');
    setPdfFile(null);
    setPdfFileName('');
    setDocxFile(null);
    setDocxFileName('');
  }

  function selectBook(book) {
    setSelectedBookId(book.id);
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'title' && !prev.slug && !prev.bookId) {
        next.slug = value.toLowerCase().replace(/['"]+/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || prev.slug;
      }
      return next;
    });
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
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
    manuscriptImportedTextRef.current = '';
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
          manuscriptImportedTextRef.current = extracted;
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
      manuscriptImportedTextRef.current = String(reader.result || '');
      setForm((prev) => ({
        ...prev,
        manuscriptMarkdown: String(reader.result || ''),
      }));
    };
    reader.readAsText(file);
  }

  function handleHtmlFile(event) {
    const file = event.target.files?.[0] || null;
    setHtmlFile(file);
    setHtmlFileName(file?.name || '');
  }

  function handlePdfFile(event) {
    const file = event.target.files?.[0] || null;
    setPdfFile(file);
    setPdfFileName(file?.name || '');
  }

  function handleDocxFile(event) {
    const file = event.target.files?.[0] || null;
    setDocxFile(file);
    setDocxFileName(file?.name || '');
  }

  async function submitBook(publish) {
    setSaving(true);
    setError('');
    setSuccess('');
    setSavedBookSlug('');
    const errors = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.manuscriptMarkdown.trim() && !manuscriptFile) errors.manuscriptMarkdown = 'Manuscript content is required';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      setSaving(false);
      setError('Please fix the highlighted fields before saving.');
      return;
    }
    const requestUrl = getBookPublishRequestUrl();
    const authToken = (() => {
      try {
        return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt') || '';
      } catch (_err) {
        return '';
      }
    })();
    const tokenPresent = Boolean(authToken);
    try {
      console.log('[PUBLISH-FLOW] Starting submitBook, has text:', !!form.manuscriptMarkdown, 'has file:', !!manuscriptFile, 'publish:', publish);
      const [preparedFrontCover, preparedBackCover] = await Promise.all([
        frontCoverFile ? compressCoverFile(frontCoverFile, frontCoverFile.name || `${form.slug || 'book'}-front-cover`) : Promise.resolve(null),
        backCoverFile ? compressCoverFile(backCoverFile, backCoverFile.name || `${form.slug || 'book'}-back-cover`) : Promise.resolve(null),
      ]);

      const apiBase = getApiBase();
      let frontCoverResult = null;
      let backCoverResult = null;
      let manuscriptResult = null;
      let htmlResult = null;
      let pdfResult = null;
      let docxResult = null;

      // Upload all files directly to Cloudinary using signed URLs from the
      // backend to avoid sending binary data through the Vercel proxy which
      // causes network errors on large payloads.
      if (preparedFrontCover) {
        try {
          frontCoverResult = await uploadFormatFileViaSignedUrl(preparedFrontCover, 'pva-bazaar-books/book-covers', 'image', apiBase, authToken);
        } catch (e) {
          console.warn('Cloudinary front cover upload failed:', e.message);
        }
      }
      if (preparedBackCover) {
        try {
          backCoverResult = await uploadFormatFileViaSignedUrl(preparedBackCover, 'pva-bazaar-books/book-covers', 'image', apiBase, authToken);
        } catch (e) {
          console.warn('Cloudinary back cover upload failed:', e.message);
        }
      }
      if (form.manuscriptMarkdown || manuscriptFile) {
        try {
          const fileToUpload = manuscriptFile
            ? manuscriptFile
            : new File([new Blob([form.manuscriptMarkdown], { type: 'text/markdown' })], `${form.slug || 'manuscript'}.md`, { type: 'text/markdown' });
          manuscriptResult = await uploadFormatFileViaSignedUrl(fileToUpload, 'pva-bazaar-books/book-manuscripts', 'raw', apiBase, authToken);
        } catch (e) {
          console.warn('Cloudinary manuscript upload via signed URL failed:', e.message);
        }
      }
      if (htmlFile) {
        try {
          const compressed = await compressFileForUpload(htmlFile);
          htmlResult = await uploadFormatFileViaSignedUrl(compressed, 'pva-bazaar-books/book-html', 'raw', apiBase, authToken);
        } catch (e) {
          console.warn('HTML upload via signed URL failed:', e.message);
        }
      }
      if (pdfFile) {
        try {
          pdfResult = await uploadFormatFileViaSignedUrl(pdfFile, 'pva-bazaar-books/book-pdfs', 'raw', apiBase, authToken);
        } catch (e) {
          console.warn('PDF upload via signed URL failed:', e.message);
        }
      }
      if (docxFile) {
        try {
          docxResult = await uploadFormatFileViaSignedUrl(docxFile, 'pva-bazaar-books/book-docx', 'raw', apiBase, authToken);
        } catch (e) {
          console.warn('DOCX upload via signed URL failed:', e.message);
        }
      }

      const buildPayload = (overrides = {}) => {
        const payload = new FormData();
        if (overrides.bookId || form.bookId) payload.append('bookId', overrides.bookId || form.bookId);
        payload.append('title', overrides.title || form.title);
        payload.append('subtitle', overrides.subtitle || form.subtitle);
        payload.append('authorName', overrides.authorName || form.authorName);
        payload.append('slug', overrides.slug || form.slug);
        payload.append('description', overrides.description || form.description);
        payload.append('genre', overrides.genre || form.genre);
        payload.append('audience', overrides.audience || form.audience);
        payload.append('language', overrides.language || form.language);
        // Send manuscript content — prefer Cloudinary URL over raw text to
        // keep the backend POST payload small and avoid Vercel proxy timeouts.
        if (overrides.manuscriptUrl) {
          payload.append('manuscriptUrl', overrides.manuscriptUrl);
          payload.append('manuscriptType', overrides.manuscriptType || 'raw');
        } else if (manuscriptResult) {
          payload.append('manuscriptUrl', manuscriptResult.secure_url);
          payload.append('manuscriptType', manuscriptFile?.name?.toLowerCase().endsWith('.pdf') ? 'pdf' : 
                         manuscriptFile?.name?.toLowerCase().endsWith('.docx') ? 'docx' : 'raw');
        } else if (overrides.manuscriptMarkdown) {
          payload.append('manuscriptMarkdown', overrides.manuscriptMarkdown);
        } else if (form.manuscriptMarkdown && !overrides.skipMarkdown) {
          // Send raw markdown — only for first save (no bookId yet).
          // Subsequent saves send only the manuscriptUrl.
          // To avoid Vercel proxy timeout/body-limit issues, truncate at 500KB.
          const MAX_INLINE_MD = 500000;
          if (form.manuscriptMarkdown.length > MAX_INLINE_MD) {
            console.warn(`[PUBLISH-FLOW] Truncating markdown to ${MAX_INLINE_MD} bytes (was ${form.manuscriptMarkdown.length})`);
            payload.append('manuscriptMarkdown', form.manuscriptMarkdown.slice(0, MAX_INLINE_MD));
          } else {
            payload.append('manuscriptMarkdown', form.manuscriptMarkdown);
          }
        }
        if (overrides.mirrors) {
          payload.append('mirrors', JSON.stringify(overrides.mirrors));
        }
        payload.append('publish', overrides.publish !== undefined ? String(overrides.publish) : publish ? 'true' : 'false');
        
        if (frontCoverResult) {
          payload.append('frontCoverUrl', frontCoverResult.secure_url);
          payload.append('frontCoverPublicId', frontCoverResult.public_id);
        }
        if (backCoverResult) {
          payload.append('backCoverUrl', backCoverResult.secure_url);
          payload.append('backCoverPublicId', backCoverResult.public_id);
        }
        if (htmlResult) {
          payload.append('manuscriptHtmlUrl', htmlResult.secure_url);
        }
        if (pdfResult) {
          payload.append('manuscriptPdfUrl', pdfResult.secure_url);
        }
        if (docxResult) {
          payload.append('manuscriptDocxUrl', docxResult.secure_url);
        }
        return payload;
      };

      try {
        const payload = buildPayload();
        console.log('[PUBLISH-FLOW] POSTing to backend, payload keys:', [...payload.keys()], 'url:', requestUrl);
        const remoteData = await saveBookProject(payload);
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
        setSavedBookSlug(publish ? saved.slug || '' : '');
        if (saved.slug) {
          setForm(prev => ({ ...prev, slug: saved.slug }));
        }

        // ── Background archive upload ──────────────────────────────────────
        // After the book is saved, upload the manuscript to Internet Archive
        // via direct browser→IA S3 PUT (no Vercel proxy, no size limit).
        // When the upload completes, update the book's mirrors with a second
        // POST. This runs fire-and-forget — the user sees success immediately.
        const finalSlug = saved.slug || form.slug;
        const hasContent = form.manuscriptMarkdown || manuscriptFile;
        const alreadyArchived = saved.mirrors?.archiveOrg || selectedBook?.mirrors?.archiveOrg;
        if (hasContent && !alreadyArchived && finalSlug) {
          const fileForIa = manuscriptFile
            ? manuscriptFile
            : new File([new Blob([form.manuscriptMarkdown], { type: 'text/markdown' })], `${finalSlug}.md`, { type: 'text/markdown' });
          setArchiveStatus({ ia: false, ipfs: false, storacha: false, pinata: false, uploading: true });
          (async () => {
            try {
              const iaUrl = await uploadToInternetArchive(fileForIa, finalSlug);
              console.log('[PUBLISH-FLOW] Background IA upload done:', iaUrl);
              const updatePayload = buildPayload({
                bookId: saved.id,
                slug: finalSlug,
                skipMarkdown: true,
                mirrors: { archiveOrg: iaUrl, ipfs: '', ipfsCid: '', storacha: '', pinata: '' },
              });
              await saveBookProject(updatePayload);
              setArchiveStatus({ ia: true, ipfs: false, storacha: false, pinata: false, uploading: false });
            } catch (iaErr) {
              console.warn('[PUBLISH-FLOW] Background IA upload failed:', iaErr.message);
              setArchiveStatus({ ia: false, ipfs: false, storacha: false, pinata: false, uploading: false });
            }
          })();
        }

        setSuccess(
          publish
            ? `"${saved.title}" is published online and visible on the public bookshelf.`
            : `"${saved.title}" was saved as a draft.`,
        );

        return;
      } catch (networkErr) {
        console.error('[PUBLISH-FLOW] Backend POST failed:', networkErr?.message, networkErr);
        console.error('[PUBLISH-FLOW] Error details:', {
          name: networkErr?.name,
          status: networkErr?.status,
          requestUrl: networkErr?.requestUrl,
          stack: networkErr?.stack?.slice(0, 300),
        });
        const publishStatus = Number(networkErr?.status || networkErr?.response?.status || 0);
        const isAuth = publishStatus === 401 || /auth|token|session/i.test(String(networkErr?.message || ''));
        if (isAuth) {
          try { localStorage.removeItem('token'); } catch (_) {}
          if (typeof window !== 'undefined' && !window.location.hash.startsWith('#/login')) {
            window.location.assign('/#/login');
          }
          return;
        }
        setError(describePublishFailure(networkErr, { requestUrl, tokenPresent }));
        setSuccess('');
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
    docx: toApiUrl(selectedBook.links.docx),
    viewDocx: toApiUrl(selectedBook.links.viewDocx),
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
          content="Publish books with front cover, back cover, manuscript editing, web view, PDF, DOCX, and HTML output."
        />
      </Helmet>

      <section className="book-publish section-card">
        <header className="book-publish__hero">
          <div>
            <p className="pill">Book publishing</p>
            <h1>Publish your work as a real book.</h1>
            <p className="book-publish__lead">
              Use this workspace to prepare the title, subtitle, author line, front cover, back cover, manuscript,
              and publish output. One book can become a public web view, PDF, DOCX, and HTML without splitting the source
              into separate systems.
            </p>
          </div>

          <aside className="book-publish__heroPanel">
            <h2>Publishing lanes</h2>
            <ul>
              <li>Draft the manuscript in the editor or upload a text file.</li>
              <li>Attach front and back covers as images.</li>
              <li>Upload HTML, PDF, and DOCX versions for different reading experiences.</li>
              <li>Save as a draft or publish immediately.</li>
              <li>Share the public web reader, PDF, or DOCX once published.</li>
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

        <section className="book-publish__atlas section-card">
          <h2>Account publishing</h2>
          <p>
            Sign in to your website account to publish. No extra GitHub key is required. When you save and publish,
            the book is stored in your account-backed online shelf and can be viewed from any device that is signed in.
          </p>
          <div className="book-publish__form">
            <p className="book-publish__muted">
              Published books live in your website account. If you are not signed in, use the login page first.
            </p>
            <div className="book-publish__editorActions">
              <button
                className="book-publish__button"
                type="button"
                onClick={() => window.location.assign('/#/login?next=%2Fbooks%2Fpublish')}
              >
                Go to sign in
              </button>
            </div>
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
            {error ? (
              <div className="book-publish__error" role="alert">
                <strong>Error:</strong> {error}
              </div>
            ) : null}
            {success ? (
              <div className="book-publish__success" role="status">
                <strong>{success}</strong>
                {savedBookSlug ? (
                  <Link className="book-publish__button book-publish__button--primary" to={`/books/read/${savedBookSlug}`} style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                    View your published book
                  </Link>
                ) : null}
              </div>
            ) : null}

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
              <label className={formErrors.title ? 'book-publish__field--error' : ''}>
                Title
                <input name="title" value={form.title} onChange={handleFieldChange} placeholder="Your book title" />
                {formErrors.title ? <span className="book-publish__fieldError">{formErrors.title}</span> : null}
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

              <label className={formErrors.manuscriptMarkdown ? 'book-publish__field--error' : ''}>
                Manuscript content
                <textarea
                  name="manuscriptMarkdown"
                  value={form.manuscriptMarkdown}
                  onChange={handleFieldChange}
                  rows={18}
                  placeholder={`# Chapter One\nYour manuscript text here.\n\n## Another section\nMore writing...`}
                />
                {formErrors.manuscriptMarkdown ? <span className="book-publish__fieldError">{formErrors.manuscriptMarkdown}</span> : null}
              </label>

              <div className="book-publish__formatSection">
                <p className="book-publish__formatSectionTitle">Additional manuscript formats</p>
                <p className="book-publish__muted">
                  Upload specific file formats for different reading experiences. HTML renders on the website, PDF is downloadable, DOCX is readable on site.
                </p>

                <div className="book-publish__field">
                  <span>HTML version (for web reader)</span>
                  <div className="book-publish__fileRow">
                    <button
                      type="button"
                      className="book-publish__button book-publish__button--primary book-publish__fileButton"
                      onClick={() => htmlInputRef.current?.click()}
                    >
                      Choose HTML file
                    </button>
                    <span className="book-publish__fileName">
                      {htmlFileName || selectedBook?.manuscriptHtml ? (htmlFileName || 'Uploaded') : '.html file'}
                    </span>
                  </div>
                  <input
                    ref={htmlInputRef}
                    className="book-publish__nativeFile"
                    type="file"
                    accept=".html,.htm,text/html"
                    onChange={handleHtmlFile}
                  />
                </div>

                <div className="book-publish__field">
                  <span>PDF version (for download)</span>
                  <div className="book-publish__fileRow">
                    <button
                      type="button"
                      className="book-publish__button book-publish__button--primary book-publish__fileButton"
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      Choose PDF file
                    </button>
                    <span className="book-publish__fileName">
                      {pdfFileName || selectedBook?.manuscriptPdfUrl ? (pdfFileName || 'Uploaded') : '.pdf file'}
                    </span>
                  </div>
                  <input
                    ref={pdfInputRef}
                    className="book-publish__nativeFile"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfFile}
                  />
                </div>

                <div className="book-publish__field">
                  <span>DOCX version (for reading on site)</span>
                  <div className="book-publish__fileRow">
                    <button
                      type="button"
                      className="book-publish__button book-publish__button--primary book-publish__fileButton"
                      onClick={() => docxInputRef.current?.click()}
                    >
                      Choose DOCX file
                    </button>
                    <span className="book-publish__fileName">
                      {docxFileName || selectedBook?.manuscriptDocxUrl ? (docxFileName || 'Uploaded') : '.docx file'}
                    </span>
                  </div>
                  <input
                    ref={docxInputRef}
                    className="book-publish__nativeFile"
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleDocxFile}
                  />
                </div>
              </div>
            </div>

            <div className="book-publish__editorActions">
              {archiveStatus.uploading && (
                <div className="book-publish__archiveStatus" style={{ fontSize: '0.85em', opacity: 0.8, marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700 }}>Uploading to permanent archives…</span>
                  <span style={{ marginLeft: '0.5rem' }}>{archiveStatus.ia ? '✓ IA' : '○ IA'}</span>
                  <span style={{ marginLeft: '0.3rem' }}>{archiveStatus.storacha ? '✓ Storacha' : '○ Storacha'}</span>
                  <span style={{ marginLeft: '0.3rem' }}>{archiveStatus.pinata ? '✓ Pinata' : '○ Pinata'}</span>
                </div>
              )}
              {!archiveStatus.uploading && (archiveStatus.ia || archiveStatus.storacha || archiveStatus.pinata) && (
                <div className="book-publish__archiveStatus" style={{ fontSize: '0.85em', opacity: 0.7, marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>Archives:</span>
                  <span style={{ marginLeft: '0.4rem', color: archiveStatus.ia ? '#1a7d3a' : '#999' }}>{archiveStatus.ia ? '✓' : '✗'} Internet Archive</span>
                  <span style={{ marginLeft: '0.4rem', color: archiveStatus.storacha ? '#1a7d3a' : '#999' }}>{archiveStatus.storacha ? '✓' : '✗'} Storacha</span>
                  <span style={{ marginLeft: '0.4rem', color: archiveStatus.pinata ? '#1a7d3a' : '#999' }}>{archiveStatus.pinata ? '✓' : '✗'} Pinata IPFS</span>
                </div>
              )}
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
                  {activeDownloadLinks?.docx ? (
                    <a className="book-publish__button" href={activeDownloadLinks.docx} target="_blank" rel="noreferrer">
                      Download DOCX
                    </a>
                  ) : null}
                  {activeDownloadLinks?.viewDocx ? (
                    <a className="book-publish__button" href={activeDownloadLinks.viewDocx} target="_blank" rel="noreferrer">
                      Read DOCX on site
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
