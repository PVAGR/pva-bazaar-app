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
- the marketplace and operations surfaces,
- the recovery and continuity tools.

## Canonical sources

- Live frontend: [https://pvabazaar.org](https://pvabazaar.org)
- Backend/API: [https://api.pvabazaar.org](https://api.pvabazaar.org)
- Live routing map: [Frontend/public/live-map.json](Frontend/public/live-map.json)
- Runbook: [RUNBOOK.md](RUNBOOK.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- Current status: [CURRENT_STATUS.md](CURRENT_STATUS.md)

## Where to edit

- Public pages and UI: `Frontend/src/pages/`
- Shared UI components: `Frontend/src/components/`
- Static site content and route data: `Frontend/public/`
- Backend API routes: `backend/`
- GitHub Pages deploy: `.github/workflows/deploy-frontend.yml`
- Backend deploy: `.github/workflows/deploy-backend-live.yml`

## Legacy and reference material

Many older docs still exist in the repo.
They are kept for reference, but they are not the first place to look.
If a legacy doc conflicts with this map, this map wins.

## Simple rule

One site, one live map, one backend, one operating path.
Anything else should support that path or be treated as legacy.
