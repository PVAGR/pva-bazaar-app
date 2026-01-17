# PVA Bazaar - Copilot Instructions

## Repo layout
- Frontend/ = React + Vite (client). Deployed to GitHub Pages / pvabazaar.org
- backend/ = Express API (server). Deployed to Vercel

## Frontend rules (Vite)
- Use Vite env vars only: import.meta.env.VITE_*
- API base URL comes from ENV.API_URL (Frontend/src/config/env.ts)
- All backend API calls must go through Frontend/src/lib/api.js helpers (apiGet/apiPost/apiPut/apiDelete)
- Do not hardcode backend URLs in components.
- Do not send internal auth headers to third-party APIs (Cloudinary etc). External APIs may use fetch or a separate client.

## Backend rules
- CORS must allow pvabazaar.org (and any other configured origins)
- Never commit secrets; use Vercel environment variables.

## Commands
Frontend:
- cd Frontend && npm i
- npm run dev
- npm run build

Backend:
- cd backend && npm i
- npm run dev

## PR checks
- No secrets in git history (Mongo URI, JWT, admin code)
- Frontend builds successfully with production env
