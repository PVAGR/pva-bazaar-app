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
 * Request a presigned S3 upload URL from the backend for Internet Archive.
 * The browser then uploads directly to IA — no file touches the backend.
 */
export async function requestIASignedUpload(identifier, filename, contentType) {
  console.log('[ARCHIVES] Requesting IA signed URL:', { identifier, filename });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${getApi()}/book-publishing/ia-signed-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ identifier, filename, contentType }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      throw new Error(json.error || `IA signed upload request failed (${res.status})`);
    }
    return json; // { uploadUrl, finalUrl }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Upload a file directly to Internet Archive using the presigned URL.
 * The browser sends the file straight to IA S3 — no backend proxy.
 */
export async function uploadToInternetArchive(file, identifier, signedUploadUrl) {
  console.log('[ARCHIVES] Uploading to IA S3:', { identifier, url: String(signedUploadUrl || '').slice(0, 80) });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(signedUploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`IA upload failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Get a Storacha upload delegation from the backend, then upload the file
 * directly to Storacha's upload endpoint.
 */
export async function uploadToStoracha(file, filename) {
  throw new Error('Storacha upload is temporarily disabled');
}

/**
 * Upload a manuscript to Internet Archive.
 * Throws if the upload fails.
 *
 * @param {File|Blob} file - The manuscript file
 * @param {string} slug - Book slug used as IA identifier
 * @returns {Promise<{archiveOrgUrl: string|null, ipfsCid: null, ipfsUrl: null, format: string, fileSize: number, wordCount: number}>}
 */
export async function uploadManuscriptToArchives(file, slug) {
  console.log('[ARCHIVES] Starting IA-only upload for:', slug, 'size:', file.size, 'type:', file.type);
  const filename = `${slug}.md`;
  const contentType = file.type || 'text/markdown';
  const fileSize = file.size || 0;

  // Count words from the file content
  let wordCount = 0;
  let text = '';
  try {
    text = await file.text();
    wordCount = text.split(/\s+/).filter(Boolean).length;
  } catch (_e) {
    // Word count is best-effort
  }

  const iaResult = await Promise.allSettled([
    (async () => {
      const { uploadUrl, finalUrl } = await requestIASignedUpload(slug, filename, contentType);
      await uploadToInternetArchive(file, slug, uploadUrl);
      return finalUrl;
    })(),
  ]).then(results => results[0]);

  const archiveOrgUrl = iaResult.status === 'fulfilled' ? iaResult.value : null;

  if (iaResult.status === 'rejected') {
    console.error('[archives] Internet Archive upload failed:', iaResult.reason?.message);
    throw new Error(`Archive upload failed: ${iaResult.reason?.message || 'IA error'}`);
  }

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
          // Cache in sessionStorage to avoid re-fetching
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

  // Legacy fallback: embedded text in MongoDB
  if (book.manuscriptMarkdown) {
    return book.manuscriptMarkdown;
  }

  return '';
}
