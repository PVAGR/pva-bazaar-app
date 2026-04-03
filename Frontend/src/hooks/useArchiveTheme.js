import { useCallback, useEffect, useState } from 'react';

const THEME_KEY = 'archive-theme';
const DEFAULT_THEME = 'dark';

function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

function readStoredTheme() {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return DEFAULT_THEME;
  const saved = globalThis.localStorage.getItem(THEME_KEY);
  return normalizeTheme(saved || DEFAULT_THEME);
}

function applyTheme(theme) {
  if (typeof globalThis === 'undefined' || !globalThis.document?.documentElement) return;
  globalThis.document.documentElement.setAttribute('data-theme', normalizeTheme(theme));
}

function saveTheme(theme) {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return;
  const next = normalizeTheme(theme);
  globalThis.localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  if (globalThis.dispatchEvent && globalThis.CustomEvent) {
    globalThis.dispatchEvent(new globalThis.CustomEvent('pva-theme-change', { detail: next }));
  }
}

export default function useArchiveTheme() {
  const [theme, setThemeState] = useState(() => {
    const initial = readStoredTheme();
    applyTheme(initial);
    return initial;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.addEventListener) return undefined;

    function onStorage(e) {
      if (e?.key !== THEME_KEY) return;
      const next = normalizeTheme(e?.newValue || DEFAULT_THEME);
      setThemeState(next);
      applyTheme(next);
    }

    function onThemeChange(e) {
      const next = normalizeTheme(e?.detail || readStoredTheme());
      setThemeState(next);
      applyTheme(next);
    }

    globalThis.addEventListener('storage', onStorage);
    globalThis.addEventListener('pva-theme-change', onThemeChange);
    return () => {
      globalThis.removeEventListener('storage', onStorage);
      globalThis.removeEventListener('pva-theme-change', onThemeChange);
    };
  }, []);

  const setTheme = useCallback((nextTheme) => {
    const next = normalizeTheme(nextTheme);
    setThemeState(next);
    saveTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return {
    theme,
    darkMode: theme === 'dark',
    setTheme,
    toggleTheme,
  };
}
