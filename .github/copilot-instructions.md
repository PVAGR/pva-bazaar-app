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

## Debugging workflow
When a debugging request is filed (issue template: `debugging_request.md`) or a user pastes broken code and asks for help, follow these steps in order:

1. **Read the code carefully** — understand what the code is supposed to do before looking for errors.
2. **Pinpoint the failure** — identify the exact line(s), function(s), or logic block(s) that are wrong. Be specific.
3. **Explain the root cause** — describe in plain language *why* it fails (wrong type, off-by-one, missing await, incorrect scope, race condition, etc.). No vague answers.
4. **Show the fixed code** — provide a corrected diff or full replacement that addresses the root cause. Keep changes minimal and surgical; do not rewrite unrelated code.
5. **Explain the fix** — briefly state what changed and why that change solves the problem.

Additional guidelines:
- Point out any secondary issues or code smells discovered along the way, but distinguish them from the primary bug.
- If the root cause cannot be determined from the snippet alone, state exactly what additional information or context is needed (stack trace, env vars, test input, etc.).
- Do not sugarcoat; be direct about mistakes while remaining constructive.
