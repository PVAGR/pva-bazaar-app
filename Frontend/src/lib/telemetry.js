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

if (globalThis.window) {
  let lastPath = globalThis.window.location.hash.replace(/^#\/?/, '') || '/';

  function trackHashChange() {
    const path = globalThis.window.location.hash.replace(/^#\/?/, '') || '/';
    if (path !== lastPath) {
      lastPath = path;
      Telemetry.trackPageView(path);
    }
  }

  globalThis.window.addEventListener('hashchange', trackHashChange);
  trackHashChange();
}
