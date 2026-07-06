/**
 * Extract user-friendly error message from API responses.
 * Used across Streams, Deals, Onboarding, Account, etc.
 */
export function getErrorMessage(err, fallback = 'Something went wrong') {
  if (!err) return fallback;
  const data = err?.response?.data;
  const msg =
    data?.error || data?.message || err?.message || (typeof err === 'string' ? err : fallback);
  return String(msg || fallback).trim() || fallback;
}

/**
 * Retry a promise-returning function with exponential backoff.
 * @param {() => Promise<T>} fn
 * @param {object} opts - { retries, delayMs, onRetry }
 * @returns {Promise<T>}
 */
export async function withRetry(fn, opts = {}) {
  const { retries = 2, delayMs = 800, onRetry } = opts;
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < retries && onRetry) onRetry(i + 1, e);
      if (i < retries) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}
