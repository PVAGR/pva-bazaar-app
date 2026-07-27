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
  const res = await fetch(`${getApi()}/book-publishing/ia-signed-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ identifier, filename, contentType }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `IA signed upload request failed (${res.status})`);
  }
  return json; // { uploadUrl, finalUrl }
}

/**
 * Upload a file directly to Internet Archive using the presigned URL.
 * The browser sends the file straight to IA S3 — no backend proxy.
 */
export async function uploadToInternetArchive(file, identifier, signedUploadUrl) {
  const res = await fetch(signedUploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`IA upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return true;
}

/**
 * Get a Storacha upload delegation from the backend, then upload the file
 * directly to Storacha's upload endpoint.
 */
export async function uploadToStoracha(file, filename) {
  const res = await fetch(`${getApi()}/book-publishing/storacha-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ filename }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `Storacha delegation failed (${res.status})`);
  }

  const { uploadUrl, headers: uploadHeaders } = json;
  if (!uploadUrl) throw new Error('Storacha bridge did not return upload URL');

  // Upload file directly to Storacha
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      ...uploadHeaders,
    },
    body: file,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '');
    throw new Error(`Storacha upload failed (${uploadRes.status}): ${text.slice(0, 200)}`);
  }

  // Try to extract CID from response headers or URL
  const cid = uploadRes.headers?.get('x-ipfs-cid') || '';
  const url = cid ? `https://ipfs.io/ipfs/${cid}` : uploadUrl;

  return { cid, url };
}

/**
 * Upload a manuscript to both Internet Archive and Storacha in parallel.
 * If one fails but the other succeeds, returns partial results.
 * Only throws if BOTH fail.
 *
 * @param {File|Blob} file - The manuscript file
 * @param {string} slug - Book slug used as IA identifier
 * @returns {Promise<{archiveOrgUrl: string|null, ipfsCid: string|null, ipfsUrl: string|null, format: string, fileSize: number, wordCount: number}>}
 */
export async function uploadManuscriptToArchives(file, slug) {
  const filename = `${slug}.md`;
  const contentType = file.type || 'text/markdown';
  const fileSize = file.size || 0;

  // Count words from the file content
  let wordCount = 0;
  try {
    const text = await file.text();
    wordCount = text.split(/\s+/).filter(Boolean).length;
  } catch (_e) {
    // Word count is best-effort
  }

  const [iaResult, ipfsResult] = await Promise.allSettled([
    (async () => {
      const { uploadUrl, finalUrl } = await requestIASignedUpload(slug, filename, contentType);
      await uploadToInternetArchive(file, slug, uploadUrl);
      return finalUrl;
    })(),
    uploadToStoracha(file, filename),
  ]);

  const archiveOrgUrl = iaResult.status === 'fulfilled' ? iaResult.value : null;
  const ipfsCid = ipfsResult.status === 'fulfilled' ? ipfsResult.value?.cid || '' : '';
  const ipfsUrl = ipfsResult.status === 'fulfilled' ? ipfsResult.value?.url || '' : '';

  // Log failures for debugging
  if (iaResult.status === 'rejected') {
    console.warn('[archives] Internet Archive upload failed:', iaResult.reason?.message);
  }
  if (ipfsResult.status === 'rejected') {
    console.warn('[archives] Storacha/IPFS upload failed:', ipfsResult.reason?.message);
  }

  // Only throw if BOTH failed
  if (!archiveOrgUrl && !ipfsUrl) {
    throw new Error(
      `Archive uploads failed: IA: ${iaResult.status === 'rejected' ? iaResult.reason?.message : 'no URL'}; ` +
      `IPFS: ${ipfsResult.status === 'rejected' ? ipfsResult.reason?.message : 'no URL'}`
    );
  }

  return { archiveOrgUrl, ipfsCid, ipfsUrl, format: 'md', fileSize, wordCount };
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
