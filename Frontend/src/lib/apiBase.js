import { ENV } from '../config/env';

const STORAGE_KEY = 'api-base-url';

const DEFAULT_CANDIDATES = [
  ENV.API_URL,
  'https://pva-bazaar-app-1.onrender.com/api',
  'https://api.pvabazaar.org/api',
  'https://pva-backend-api.vercel.app/api',
];

export function normalizeApiBaseUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  let next = value.replace(/\/+$/, '');
  if (!/\/api$/i.test(next)) {
    next = `${next}/api`;
  }
  return next;
}

export function isUnsafeProductionOverride(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return false;
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(value);
}

function safeReadStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (_err) {
    return '';
  }
}

function safeWriteStorage(key, value) {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch (_err) {
    // Ignore storage failures and keep the current runtime base in memory.
  }
}

function uniqueBases(values) {
  const out = [];
  for (const value of values) {
    const normalized = normalizeApiBaseUrl(value);
    if (!normalized || out.includes(normalized)) continue;
    out.push(normalized);
  }
  return out;
}

export function getApiBaseCandidates() {
  const stored = normalizeApiBaseUrl(safeReadStorage(STORAGE_KEY));
  const ordered = stored ? [stored, ...DEFAULT_CANDIDATES] : [...DEFAULT_CANDIDATES];
  return uniqueBases(ordered);
}

export function getPreferredApiBase() {
  const candidates = getApiBaseCandidates();
  const isProd = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'production';
  if (candidates.length === 0) {
    return normalizeApiBaseUrl(ENV.API_URL);
  }

  const stored = normalizeApiBaseUrl(safeReadStorage(STORAGE_KEY));
  if (stored) {
    if (isProd && isUnsafeProductionOverride(stored)) {
      safeWriteStorage(STORAGE_KEY, '');
    } else {
      return stored;
    }
  }

  return candidates[0];
}

export function rememberApiBase(url) {
  const normalized = normalizeApiBaseUrl(url);
  if (!normalized) {
    safeWriteStorage(STORAGE_KEY, '');
    return '';
  }

  const isProd = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'production';
  if (isProd && isUnsafeProductionOverride(normalized)) {
    safeWriteStorage(STORAGE_KEY, '');
    return '';
  }

  safeWriteStorage(STORAGE_KEY, normalized);
  return normalized;
}

export function clearApiBaseOverride() {
  safeWriteStorage(STORAGE_KEY, '');
}
