const SNAPSHOT_VERSION = 'hk-recovery-v1';
const PBKDF2_ITERATIONS = 250000;
const AUTH_KEY_PATTERN = /(?:^|[-_:])(token|auth|jwt|secret|password|session|admin-auth|login-time|auth-version)(?:$|[-_:])/i;

function getCrypto() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto;
  }
  throw new Error('Browser crypto is unavailable');
}

function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < arr.length; index += chunkSize) {
    binary += String.fromCharCode(...arr.subarray(index, index + chunkSize));
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(value) {
  const raw = String(value || '').trim();
  if (!raw) return new Uint8Array();
  const binary = globalThis.atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function sha256Hex(input) {
  return getCrypto().subtle.digest('SHA-256', new TextEncoder().encode(String(input || ''))).then((digest) =>
    Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(''),
  );
}

function shouldKeepStorageKey(key, includeSensitive = false) {
  const normalized = String(key || '');
  if (!normalized) return false;
  if (includeSensitive) return true;
  if (AUTH_KEY_PATTERN.test(normalized)) return false;
  if (/password|secret|private|bearer/i.test(normalized)) return false;
  return true;
}

export function collectContinuitySnapshot({
  label = 'Untitled continuity snapshot',
  backendUrl = '',
  archiveEntries = [],
  includeSessionStorage = true,
} = {}) {
  if (typeof window === 'undefined') {
    throw new Error('Continuity snapshots can only be created in the browser');
  }

  const storage = {
    localStorage: {},
    sessionStorage: {},
  };

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !shouldKeepStorageKey(key)) continue;
    storage.localStorage[key] = window.localStorage.getItem(key);
  }

  if (includeSessionStorage) {
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key || !shouldKeepStorageKey(key)) continue;
      storage.sessionStorage[key] = window.sessionStorage.getItem(key);
    }
  }

  const recentArchive = Array.isArray(archiveEntries)
    ? archiveEntries.slice(0, 8).map((entry) => ({
        id: entry.id || entry._id || entry.externalId || entry.slug || entry.title,
        title: entry.title || entry.name || 'Untitled archive entry',
        excerpt: entry.excerpt || entry.summary || '',
        note: `${entry.date ? new Date(entry.date).toLocaleDateString() : 'Recent'} · ${entry.category || 'Archive'}`,
      }))
    : [];

  return {
    label: String(label || 'Untitled continuity snapshot').trim().slice(0, 140),
    exportedAt: new Date().toISOString(),
    version: SNAPSHOT_VERSION,
    site: {
      title: globalThis.document?.title || 'PVA Bazaar',
      href: globalThis.location?.href || '',
      path: globalThis.location?.hash || globalThis.location?.pathname || '/',
    },
    device: {
      userAgent: globalThis.navigator?.userAgent || '',
      language: globalThis.navigator?.language || '',
      platform: globalThis.navigator?.platform || '',
      screen: `${globalThis.screen?.width || 0}x${globalThis.screen?.height || 0}`,
      viewport: `${globalThis.innerWidth || 0}x${globalThis.innerHeight || 0}`,
      standalone: Boolean(
        globalThis.navigator?.standalone ||
          globalThis.matchMedia?.('(display-mode: standalone)')?.matches,
      ),
    },
    manifest: {
      backendUrl: String(backendUrl || '').trim(),
      localStorageKeys: Object.keys(storage.localStorage).sort(),
      sessionStorageKeys: Object.keys(storage.sessionStorage).sort(),
      localStorageCount: Object.keys(storage.localStorage).length,
      sessionStorageCount: Object.keys(storage.sessionStorage).length,
      recentArchiveCount: recentArchive.length,
      includeSessionStorage: Boolean(includeSessionStorage),
    },
    storage,
    archive: {
      recent: recentArchive,
    },
  };
}

export async function encryptContinuitySnapshot(snapshot, passphrase) {
  const pass = String(passphrase || '').trim();
  if (!pass) {
    throw new Error('Passphrase is required to encrypt the snapshot');
  }

  const cryptoApi = getCrypto();
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(snapshot));
  const plaintextSha256 = await sha256Hex(JSON.stringify(snapshot));

  const keyMaterial = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(pass),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  const key = await cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  const ciphertext = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const ciphertextBytes = new Uint8Array(ciphertext);
  const ciphertextB64 = bytesToBase64(ciphertextBytes);

  return {
    version: SNAPSHOT_VERSION,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    saltB64: bytesToBase64(salt),
    ivB64: bytesToBase64(iv),
    ciphertextB64,
    plaintextSha256,
    ciphertextSha256: await sha256Hex(ciphertextB64),
  };
}

export async function decryptContinuitySnapshot(payload, passphrase) {
  const pass = String(passphrase || '').trim();
  if (!pass) {
    throw new Error('Passphrase is required to decrypt the snapshot');
  }

  const cryptoApi = getCrypto();
  const salt = base64ToBytes(payload?.saltB64);
  const iv = base64ToBytes(payload?.ivB64);
  const ciphertext = base64ToBytes(payload?.ciphertextB64);

  if (!salt.length || !iv.length || !ciphertext.length) {
    throw new Error('Snapshot payload is missing encryption data');
  }

  const keyMaterial = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(pass),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  const key = await cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: Number(payload?.iterations || PBKDF2_ITERATIONS),
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );

  const plaintext = await cryptoApi.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  const json = new TextDecoder().decode(plaintext);
  return JSON.parse(json);
}

export function applyContinuitySnapshot(snapshot, { replaceMatchingKeys = true } = {}) {
  if (typeof window === 'undefined' || !snapshot || typeof snapshot !== 'object') {
    throw new Error('Snapshot is not available for restore');
  }

  const storage = snapshot.storage || {};
  const localStorageEntries = storage.localStorage && typeof storage.localStorage === 'object' ? storage.localStorage : {};
  const sessionStorageEntries = storage.sessionStorage && typeof storage.sessionStorage === 'object' ? storage.sessionStorage : {};

  const restoreEntries = (targetStorage, entries) => {
    const keys = Object.keys(entries || {});
    if (replaceMatchingKeys) {
      for (const key of keys) {
        try {
          targetStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
    }
    for (const key of keys) {
      const value = entries[key];
      if (value == null) continue;
      try {
        targetStorage.setItem(key, String(value));
      } catch {
        /* ignore quota / security errors */
      }
    }
    return keys.length;
  };

  return {
    localStorageRestored: restoreEntries(window.localStorage, localStorageEntries),
    sessionStorageRestored: restoreEntries(window.sessionStorage, sessionStorageEntries),
  };
}

export function downloadContinuityBundle(bundle, filename) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}
