
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import ErrorFallback from './components/ErrorFallback.jsx';
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
      <Sentry.ErrorBoundary fallback={ErrorFallback}>
        <App />
      </Sentry.ErrorBoundary>
    </HelmetProvider>
  );
}
