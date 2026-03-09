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

## Frontend design baseline (must preserve)
- The visual/interaction baseline is the current Archive Library page look at pvabazaar.org (dark blue night mode, green day mode, cyan/blue accents, compact glassy panels, rounded controls, and high contrast text).
- Any new page/component should match this baseline by default (spacing rhythm, button style, card feel, border radii, and hover/active behavior).
- Do not introduce a second competing theme system. Preserve the existing toggle behavior and current color language unless explicitly requested.
- Do not switch global backgrounds, typography tone, or component density away from the Archive baseline without explicit user approval.
- Preserve full-page theme coverage (blue night / green day) and avoid reintroducing white/light spacer panels in shared page shells.
- Prefer shared theme tokens (`--site-*` in `Frontend/src/base.css`) over hardcoded colors for all new UI work.

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
