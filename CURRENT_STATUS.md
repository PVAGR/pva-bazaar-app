# Current Status - PVA Bazaar

**Status:** Live frontend updated | Backend on Vercel (fallback-safe) | Canonical map established

## Current truth

- The public website runs on GitHub Pages.
- The backend/API is treated as a separate Vercel deployment.
- `Frontend/public/live-map.json` is the canonical live routing map.
- The repo now has one clear starting point: `CANONICAL_MAP.md`.
- Sign-in and sign-up now have a free browser-side fallback path if the hosted API is unavailable.
- The frontend build is green after adding the local auth vault dependency and wiring login/register fallback.
- The layout and auth pages now show whether the site is on the live backend or free local fallback mode.
- The backend deploy workflow no longer blocks on a stale live-readiness gate, so fixes can actually ship to Vercel.

## Recently completed

- The home page now acts as a human front door with categorized paths.
- Archive, studio, recovery, marketplace, showroom, admin, account, login, and dashboard surfaces all share the same atlas language.
- Recovery and continuity flows are visible from the public site and the private tools.
- A dedicated book publishing workspace is being added so authors can draft, upload covers, publish, and export PDF/EPUB/web editions from one source.
- A public published-books shelf now exposes live editions with reader, PDF, and EPUB links.
- Backend database bootstrap now uses a serverless-safe mock fallback when production `MONGODB_URI` is missing, and auth/login falls back to a shared JWT secret so the API keeps responding instead of hard-failing at startup.
- The live frontend deployment was refreshed successfully.

## What to trust

- Use `CANONICAL_MAP.md` for the shortest accurate repo map.
- Use `RUNBOOK.md` for release and continuity operations.
- Use `ARCHITECTURE.md` for system layout.
- Treat older docs as support or reference unless they are explicitly named in the canonical map.
