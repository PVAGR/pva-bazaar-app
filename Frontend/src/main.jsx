
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import './base.css';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
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
  tracesSampleRate: 0.2, // Increase for better tracing coverage
  replaysSessionSampleRate: 0.02, // 2% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% on error
  beforeSend(event) {
    // Scrub PII/tokens/admin codes from event data
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
    if (event.breadcrumbs) event.breadcrumbs.forEach(b => scrub(b));
    return event;
  },
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <HelmetProvider>
      <Sentry.ErrorBoundary
        fallback={({ resetError }) => (
          <div role="alert" style={{ padding: 24, textAlign: 'center', maxWidth: 480, margin: '40px auto' }}>
            <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
            <p style={{ color: '#666', marginBottom: 16 }}>We&apos;ve been notified. You can try again or go home.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={resetError} className="btn" style={{ padding: '10px 20px', cursor: 'pointer' }}>
                Try again
              </button>
              <a href="/#/" className="btn ghost" style={{ padding: '10px 20px' }}>Go home</a>
            </div>
          </div>
        )}
      >
        <App />
      </Sentry.ErrorBoundary>
    </HelmetProvider>
  );
}
