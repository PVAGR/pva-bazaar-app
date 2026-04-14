
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { HelmetProvider } from 'react-helmet-async';
import './base.css';

function AppCrashFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, var(--site-bg-primary) 0%, var(--site-bg-secondary) 100%)' }}>
      <div style={{ width: 'min(620px, 100%)', background: 'var(--site-panel)', border: '1px solid var(--site-border)', borderRadius: '16px', padding: '24px' }}>
        <h2 style={{ margin: '0 0 10px', color: 'var(--site-accent)' }}>The page hit an error</h2>
        <p style={{ margin: '0 0 16px', color: 'var(--site-text-muted)' }}>
          Please refresh, or use a direct destination below.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href="/#/library" style={{ color: 'var(--site-text)', textDecoration: 'none', border: '1px solid var(--site-border)', borderRadius: '10px', padding: '10px 12px', background: 'var(--site-panel-soft)', fontWeight: 700 }}>Archive Library</a>
          <a href="/#/marketplace" style={{ color: 'var(--site-text)', textDecoration: 'none', border: '1px solid var(--site-border)', borderRadius: '10px', padding: '10px 12px', background: 'var(--site-panel-soft)', fontWeight: 700 }}>Marketplace</a>
          <a href="/#/showroom" style={{ color: 'var(--site-text)', textDecoration: 'none', border: '1px solid var(--site-border)', borderRadius: '10px', padding: '10px 12px', background: 'var(--site-panel-soft)', fontWeight: 700 }}>Showroom</a>
        </div>
      </div>
    </div>
  );
}

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn: sentryDsn,
        release: import.meta.env.VITE_SENTRY_RELEASE,
        environment: import.meta.env.MODE,
        integrations: [
          Sentry.browserTracingIntegration({
            tracePropagationTargets: [
              'pvabazaar.org',
              'api.pvabazaar.org',
              /^https:\/\/pvabazaar\.org/,
              /^https:\/\/.*vercel\.app/
            ],
          }),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        tracesSampleRate: 0.2,
        replaysSessionSampleRate: 0.02,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event) {
          // Scrub PII/tokens/admin codes from event data.
          function scrub(obj) {
            if (!obj || typeof obj !== 'object') return obj;
            for (const key of Object.keys(obj)) {
              if (/token|authorization|jwt|admin/i.test(key)) {
                obj[key] = '[Filtered]';
              } else if (typeof obj[key] === 'object') {
                scrub(obj[key]);
              }
            }
            return obj;
          }
          if (event.request) scrub(event.request.headers);
          if (event.request) scrub(event.request.data);
          if (event.user) scrub(event.user);
          if (event.extra) scrub(event.extra);
          if (event.breadcrumbs) event.breadcrumbs.forEach((b) => scrub(b));
          return event;
        },
      });
    })
    .catch(() => {
      // Keep app boot resilient if monitoring bundle fails.
    });
}

const root = document.getElementById('root');
if (root) {
  document.body.dataset.appMounted = 'true';
  createRoot(root).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch(() => {
      // Non-blocking: app should stay functional even if SW fails.
    });
  });
}
