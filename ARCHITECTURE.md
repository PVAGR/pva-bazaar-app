# Architecture

System layout reference for PVA Bazaar.
The canonical live routing map is `Frontend/public/live-map.json`.
If a doc disagrees with that map, the map wins.

## Live surfaces

| Surface | Canonical URL |
|---|---|
| Frontend | https://pvabazaar.org |
| Backend | https://api.pvabazaar.org |
| API base | https://api.pvabazaar.org/api |
| Status page | https://pvabazaar.org/status.html |

## Components

- Public UI: `Frontend/` (vanilla JS + Vite) - static build to GitHub Pages
- Serverless entry: `api/[...path].js` (Vercel catchall, bundles `backend/**`)
- Backend: `backend/` (Express 5, Mongoose/MongoDB Atlas, Cloudinary media)
- Secondary app: `apps/pva-bazaar-web` (Next.js sanctuary layer)
- Contracts: `contracts/` (Hardhat; ERC-721 provenance)
- Content: `content/` (writings, library data; IPFS publish pipeline reads `content/library`)
- Live routing data: `Frontend/public/live-map.json`
- Status and discovery pages: built from `Frontend/public/` (`status.html`, `llms.txt`, `readable-site.json`, `sitemap.xml`)

## Deploys

- Frontend: GitHub Pages via `.github/workflows/deploy-frontend.yml`
- Backend: Vercel via `.github/workflows/deploy-backend-live.yml` (+ repo-root catchall from `vercel.json`)

## Operational rule

Keep the frontend, backend, and live map in sync.
Do not add new entry points without updating the live map and the runbook.
