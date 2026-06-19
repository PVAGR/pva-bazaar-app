# Current Status - PVA Bazaar

**Status:** Live frontend updated | Multi-host backend failover active | Canonical map established

## Current truth

- The public website runs on GitHub Pages.
- The backend/API now prefers the reachable Render host and can fail over to alternate hosts so the site stays reachable across regions.
- `Frontend/public/live-map.json` is the canonical live routing map.
- The repo now has one clear starting point: `CANONICAL_MAP.md`.
- Sign-in and sign-up now use a regular single-form login UI, with a free browser-side fallback path if the hosted API is unavailable.
- The backend auth store now persists to a shared file-backed store when Mongo is unavailable, so sign-ups can survive across requests instead of disappearing.
- The frontend build is green after wiring the login/register fallback and the shared auth store status labels.
- The layout and auth pages now show whether the site is on the live backend, the shared auth store, or free local fallback mode.
- The frontend API client now tries multiple backend candidates instead of depending on one endpoint.
- The backend deploy workflow no longer blocks on a stale live-readiness gate, so fixes can actually ship to Vercel.
- The live Render backend is still serving the older deployed SHA until its service redeploys; repo code now has the failover logic ready for when the host updates.

## Recently completed

- The home page now acts as a human front door with categorized paths.
- Archive, studio, recovery, marketplace, showroom, admin, account, login, and dashboard surfaces all share the same atlas language.
- Recovery and continuity flows are visible from the public site and the private tools.
- A dedicated book publishing workspace is being added so authors can draft, upload covers, publish, and export PDF/EPUB/web editions from one source.
- The book publishing workspace now accepts DOCX and PDF manuscripts through a visible mobile-friendly upload button and server-side extraction.
- A public published-books shelf now exposes live editions with reader, PDF, and EPUB links.
- Backend database bootstrap now uses a serverless-safe mock fallback when production `MONGODB_URI` is missing, and auth/login falls back to a shared JWT secret so the API keeps responding instead of hard-failing at startup.
- The frontend API client now falls back across Render, the pvabazaar API domain, and Vercel endpoints so people in more regions can still reach the site even if one host is slow or down.
- The live frontend deployment was refreshed successfully.

## What to trust

- Use `CANONICAL_MAP.md` for the shortest accurate repo map.
- Use `RUNBOOK.md` for release and continuity operations.
- Use `ARCHITECTURE.md` for system layout.
- Treat older docs as support or reference unless they are explicitly named in the canonical map.
