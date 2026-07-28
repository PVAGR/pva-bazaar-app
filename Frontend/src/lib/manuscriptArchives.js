import { getApiBase } from './api';
import { getToken } from './auth';

function getApi() {
  return (getApiBase() || '').replace(/\/+$/, '');
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Upload a file to Internet Archive via the backend proxy.
 * The backend handles presigned URL generation and S3 upload,
 * avoiding CORS and browser-blocking issues.
 */
export async function uploadToInternetArchive(file, identifier) {
  console.log('[ARCHIVES] Uploading via IA proxy:', { identifier, size: file.size });

  let manuscriptMarkdown;
  try {
    manuscriptMarkdown = await file.text();
  } catch (_e) {
    manuscriptMarkdown = '';
  }

  const body = JSON.stringify({
    identifier,
    filename: file.name || `${identifier}.md`,
    manuscriptMarkdown,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(`${getApi()}/book-publishing/ia-upload-proxy`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `IA proxy upload failed (${res.status})`);
    }
    const json = await res.json();
    console.log('[ARCHIVES] IA proxy upload succeeded:', json.url);
    return json.url;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Storacha upload is disabled. Throws immediately.
 */
export async function uploadToStoracha(file, filename) {
  throw new Error('Storacha upload is temporarily disabled');
}

/**
 * Upload a manuscript to Internet Archive via the backend proxy.
 * Throws if the upload fails — the caller catches and falls back
 * to sending manuscriptMarkdown directly to the backend.
 *
 * @param {File|Blob} file - The manuscript file
 * @param {string} slug - Book slug used as IA identifier
 * @returns {Promise<{archiveOrgUrl: string, ipfsCid: null, ipfsUrl: null, format: string, fileSize: number, wordCount: number}>}
 */
export async function uploadManuscriptToArchives(file, slug) {
  console.log('[ARCHIVES] Starting IA proxy upload for:', slug, 'size:', file.size, 'type:', file.type);
  const fileSize = file.size || 0;

  let wordCount = 0;
  try {
    const text = await file.text();
    wordCount = text.split(/\s+/).filter(Boolean).length;
  } catch (_e) {}

  const archiveOrgUrl = await uploadToInternetArchive(file, slug);

  return { archiveOrgUrl, ipfsCid: null, ipfsUrl: null, format: 'md', fileSize, wordCount };
}

/**
 * Fetch manuscript text from a book's archive mirrors, trying each in order.
 * Falls back to embedded manuscriptMarkdown for legacy books.
 *
 * @param {Object} book - Book object with mirrors, manuscriptUrl, manuscriptMarkdown
 * @returns {Promise<string>} The manuscript text
 */
export async function fetchManuscriptFromMirrors(book) {
  if (!book) return '';

  const mirrorUrls = [
    book.mirrors?.archiveOrg,
    book.mirrors?.ipfs,
    book.manuscriptUrl,
  ].filter(Boolean);

  for (const url of mirrorUrls) {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 100) {
          try {
            const cacheKey = `pva:manuscript:${book.slug || 'unknown'}`;
            sessionStorage.setItem(cacheKey, text);
          } catch (_e) {}
          return text;
        }
      }
    } catch (_e) {
      console.warn(`[archives] Mirror failed: ${url}`, _e.message);
    }
  }

  if (book.manuscriptMarkdown) {
    return book.manuscriptMarkdown;
  }

  return '';
}
