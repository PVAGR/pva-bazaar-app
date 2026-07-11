const BOOK_STORE_GITHUB_TOKEN_KEY = 'pva:book-store-github-token-v1';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function getBookStoreGitHubToken() {
  if (!canUseStorage()) return '';
  return String(window.localStorage.getItem(BOOK_STORE_GITHUB_TOKEN_KEY) || '').trim();
}

export function setBookStoreGitHubToken(token) {
  if (!canUseStorage()) return;
  const value = String(token || '').trim();
  if (!value) {
    window.localStorage.removeItem(BOOK_STORE_GITHUB_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(BOOK_STORE_GITHUB_TOKEN_KEY, value);
}

export function clearBookStoreGitHubToken() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(BOOK_STORE_GITHUB_TOKEN_KEY);
}
