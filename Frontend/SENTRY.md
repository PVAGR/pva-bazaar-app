# Sentry Monitoring & Sourcemaps

## Frontend (Vite + React)

### Environment Variables

- `VITE_SENTRY_DSN` – Sentry DSN for the frontend project
- `SENTRY_ORG` – Sentry organization slug (for sourcemap upload)
- `SENTRY_PROJECT` – Sentry project slug (for sourcemap upload)
- `SENTRY_AUTH_TOKEN` – Sentry auth token (for sourcemap upload, CI only)
- `SENTRY_RELEASE` – Release version (for sourcemap upload, CI only)

**Never commit secrets. Use GitHub/Vercel/CI env vars.**

### How it works

- Sentry is initialized in `src/main.jsx` using `VITE_SENTRY_DSN`.
- All errors are captured and reported to Sentry.
- The Vite config (`vite.config.js`) uses `@sentry/vite-plugin` to upload sourcemaps during build if Sentry env vars are present.

### Local Development

- Sentry will only report errors if `VITE_SENTRY_DSN` is set.
- Sourcemap upload is a no-op unless `SENTRY_AUTH_TOKEN` is present (CI/CD only).

## Backend (Express)

### Environment Variables

- `SENTRY_DSN` – Sentry DSN for backend
- `SENTRY_RELEASE` – Release version (optional, for trace correlation)

### How it works

- Sentry is initialized in `backend/api/index.js` if `SENTRY_DSN` is set.
- All requests and errors are captured by Sentry middleware.

## Release Health, Tracing, Replay, and Scrubbing

- `VITE_SENTRY_RELEASE` is set automatically in CI to the current git SHA for every deploy.
- Sentry.init in `src/main.jsx` now includes:
  - `release` and `environment` for Release Health
  - BrowserTracing with `tracePropagationTargets` for distributed tracing
  - Session Replay (privacy-safe, maskAllText/blockAllMedia, low sample rate)
  - `beforeSend` scrubs tokens, admin codes, and PII from all events
- To enable full Release Health and tracing, set these env vars in CI/CD:
  - `VITE_SENTRY_DSN`, `VITE_SENTRY_RELEASE`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- For backend, set `SENTRY_DSN`, `SENTRY_RELEASE`, `SENTRY_ENVIRONMENT` (optional, defaults to NODE_ENV)
- Recommended: Set up Sentry alert rules for errors, performance, and release regressions in the Sentry UI.

See Sentry docs for more: https://docs.sentry.io/product/releases/ https://docs.sentry.io/platforms/javascript/guides/react/session-replay/

## Deployment & CI

- Set Sentry env vars in GitHub Actions, Vercel, or your CI/CD provider.
- Do not commit `.env` files or secrets.
- For production, ensure `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_RELEASE` are set for sourcemap upload.

## References

- [Sentry Vite Plugin](https://docs.sentry.io/platforms/javascript/guides/vite/)
- [Sentry Node/Express](https://docs.sentry.io/platforms/node/guides/express/)
- [Sourcemaps in Sentry](https://docs.sentry.io/platforms/javascript/sourcemaps/)
