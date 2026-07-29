// Lightweight telemetry (respects DNT & opt-out)
const canTrack = () => {
  if (!globalThis?.window || !globalThis?.navigator) return false;
  return globalThis.navigator.doNotTrack !== '1' && !globalThis.window.__DO_NOT_TRACK;
};

export const Telemetry = {
  trackEvent: (event, data = {}) => {
    if (!canTrack()) return;

    if (import.meta.env.VITE_TELEMETRY_URL) {
      globalThis.fetch(import.meta.env.VITE_TELEMETRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          data,
          ts: Date.now(),
          locale: globalThis.navigator?.language,
        }),
      }).catch(() => { /* fire-and-forget telemetry */ });
    }

    if (import.meta.env.DEV) console.log('[Telemetry]', event, data);
  },

  trackPageView: (path) => {
    const referrer = globalThis.document?.referrer || '';
    Telemetry.trackEvent('page_view', { path, referrer });
  },
};

if (globalThis.window && globalThis.MutationObserver) {
  let currentPath = globalThis.window.location.hash;

  const startObserver = () => {
    const observer = new globalThis.MutationObserver(() => {
      if (globalThis.window.location.hash !== currentPath) {
        currentPath = globalThis.window.location.hash;
        Telemetry.trackPageView(currentPath);
      }
    });

    observer.observe(globalThis.document.body, { childList: true, subtree: true });
  };

  if (globalThis.document?.body) {
    startObserver();
  } else {
    globalThis.window.addEventListener('DOMContentLoaded', startObserver, { once: true });
  }
}
