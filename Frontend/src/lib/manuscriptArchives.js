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
 * Upload a file to Internet Archive via direct browser→S3 PUT.
 * Gets LOW auth config from the backend (no secret key in JS bundle),
 * then PUTs the file directly to s3.us.archive.org.
 * Falls back to the backend proxy for small files.
 */
export async function uploadToInternetArchive(file, identifier) {
  const filename = file.name || `${identifier}.md`;
  console.log('[ARCHIVES] Uploading to IA:', { identifier, filename, size: file.size });

  // Get IA upload config from backend (returns LOW auth headers + S3 URL)
  const configUrl = `${getApi()}/book-publishing/ia-upload-config?identifier=${encodeURIComponent(identifier)}&filename=${encodeURIComponent(filename)}`;
  let config;
  try {
    const configRes = await fetch(configUrl, { headers: getAuthHeaders() });
    if (!configRes.ok) {
      const err = await configRes.json().catch(() => ({}));
      throw new Error(err.error || `IA config fetch failed (${configRes.status})`);
    }
    config = await configRes.json();
  } catch (configErr) {
    console.warn('[ARCHIVES] IA config fetch failed:', configErr.message);
    // Fall back to proxy for small files
    if (file.size > 4000000) throw new Error('IA config unavailable for large file upload');
    return uploadToInternetArchiveViaProxy(file, identifier);
  }

  // PUT file directly to IA S3 (bypasses Vercel, no size limit).
  // No AbortController timeout — IA can take minutes to process large files.
  console.log('[ARCHIVES] Direct upload to IA S3:', config.uploadUrl);
  try {
    const uploadRes = await fetch(config.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        ...config.headers,
        'Authorization': config.authHeader,
      },
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      throw new Error(`IA S3 direct upload failed (${uploadRes.status}): ${errText.slice(0, 200)}`);
    }
    console.log('[ARCHIVES] IA direct upload succeeded:', config.finalUrl);
    return config.finalUrl;
  }
}

/**
 * Fallback: upload via backend proxy (for small files only).
 */
async function uploadToInternetArchiveViaProxy(file, identifier) {
  console.log('[ARCHIVES] Falling back to IA proxy:', { identifier, size: file.size });

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
  const timer = setTimeout(() => controller.abort(), 30000);
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
 * Upload a file to Storacha (IPFS + Filecoin) via the backend proxy.
 */
export async function uploadToStoracha(file, identifier) {
  console.log('[ARCHIVES] Uploading via Storacha proxy:', { identifier, size: file.size });

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
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${getApi()}/book-publishing/storacha-upload-url`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Storacha upload failed (${res.status})`);
    }
    const json = await res.json();
    console.log('[ARCHIVES] Storacha upload succeeded:', json.url);
    return { url: json.url, cid: json.cid };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Upload a file to Pinata IPFS via the backend proxy.
 */
export async function uploadToPinata(file, identifier) {
  console.log('[ARCHIVES] Uploading via Pinata proxy:', { identifier, size: file.size });

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
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${getApi()}/book-publishing/pinata-upload-proxy`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Pinata upload failed (${res.status})`);
    }
    const json = await res.json();
    console.log('[ARCHIVES] Pinata upload succeeded:', json.url);
    return { url: json.url, hash: json.hash };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Upload a manuscript to all three archive angles (IA + Storacha + Pinata)
 * in parallel. Each failure is logged but does not block the others.
 *
 * @param {File|Blob} file - The manuscript file
 * @param {string} slug - Book slug used as identifier
 * @returns {Promise<{archiveOrgUrl: string, storachaUrl: string, pinataUrl: string, ipfsCid: string, ipfsUrl: string, format: string, fileSize: number, wordCount: number}>}
 */
export async function uploadManuscriptToArchives(file, slug) {
  console.log('[ARCHIVES] Starting parallel archive upload for:', slug, 'size:', file.size, 'type:', file.type);
  const fileSize = file.size || 0;

  let wordCount = 0;
  try {
    const text = await file.text();
    wordCount = text.split(/\s+/).filter(Boolean).length;
  } catch (_e) {}

  const [iaResult, storachaResult, pinataResult] = await Promise.allSettled([
    uploadToInternetArchive(file, slug).then(url => ({ url })),
    uploadToStoracha(file, slug).then(r => r),
    uploadToPinata(file, slug).then(r => r),
  ]);

  let archiveOrgUrl = '';
  let storachaUrl = '';
  let pinataUrl = '';
  let ipfsCid = '';
  let ipfsUrl = '';

  if (iaResult.status === 'fulfilled') {
    archiveOrgUrl = iaResult.value.url;
    console.log('[ARCHIVES] IA upload succeeded:', archiveOrgUrl);
  } else {
    console.warn('[ARCHIVES] IA upload failed:', iaResult.reason?.message);
  }

  if (storachaResult.status === 'fulfilled') {
    storachaUrl = storachaResult.value.url;
    ipfsCid = storachaResult.value.cid || '';
    ipfsUrl = storachaUrl;
    console.log('[ARCHIVES] Storacha upload succeeded:', storachaUrl);
  } else {
    console.warn('[ARCHIVES] Storacha upload failed:', storachaResult.reason?.message);
  }

  if (pinataResult.status === 'fulfilled') {
    pinataUrl = pinataResult.value.url;
    if (!ipfsCid) ipfsCid = pinataResult.value.hash || '';
    if (!ipfsUrl) ipfsUrl = pinataUrl;
    console.log('[ARCHIVES] Pinata upload succeeded:', pinataUrl);
  } else {
    console.warn('[ARCHIVES] Pinata upload failed:', pinataResult.reason?.message);
  }

  return { archiveOrgUrl, storachaUrl, pinataUrl, ipfsCid, ipfsUrl, format: 'md', fileSize, wordCount };
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
    book.mirrors?.storacha,
    book.mirrors?.pinata,
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
