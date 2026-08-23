# Canonical Map

This file is the shortest truthful map of the repo.
Use it first when you need to know what this project is and where to edit it.

## What this repo is

PVA Bazaar is a personal website and business suite.
It serves:

- the public site on GitHub Pages,
- the backend/API on Vercel,
- the canonical live routing map,
- the personal archive and writing surfaces,
- the marketplace and operations surfaces.

## Canonical sources

- Live frontend: [https://pvabazaar.org](https://pvabazaar.org)
- Backend/API: [https://pva-backend-api.vercel.app](https://pva-backend-api.vercel.app)
- Live routing map: [Frontend/public/live-map.json](Frontend/public/live-map.json)
- Runbook: [RUNBOOK.md](RUNBOOK.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Current status: [STATUS.md](STATUS.md)

## Where to edit

- Public pages and UI: `Frontend/src/pages/`
- Shared UI components: `Frontend/src/components/`
- Static site content and route data: `Frontend/public/`
- Backend API routes: `backend/routes/`
- Library content: `content/`
- GitHub Pages deploy: `.github/workflows/deploy-frontend.yml`
- Backend deploy: `.github/workflows/deploy-backend-live.yml`

## App inventory

There are three frontend apps. Only one is canonical:

1. `Frontend/` - CANONICAL public site (GitHub Pages).
2. `apps/pva-bazaar-web` - secondary Next.js sanctuary layer with its own deploy workflows.
3. `apps/web-com` - experiment; sole consumer of `packages/ui` + `packages/oracle-engine`.

Do not add a fourth. If one of the non-canonical apps goes dormant, archive it under `_archive/apps/`.

## Legacy and reference material

Legacy sites, content drafts, superseded integrations and old docs are kept under
`_archive/` and `docs/history/`. They are not the first place to look.
If a legacy doc conflicts with this map, this map wins.

## Simple rule

One site, one live map, one backend, one operating path.
Anything else should support that path or be treated as legacy.
