---
applyTo: 'Frontend/**'
---

# Frontend (Vite) rules

- Never hardcode API URLs. Use ENV.API_URL (Frontend/src/config/env.ts).
- All backend calls must use Frontend/src/lib/api.js helpers (apiGet/apiPost/apiPut/apiDelete).
- External APIs (Cloudinary) must NOT use the internal axios client (avoid leaking auth headers).
- Vite env vars are build-time and accessed via import.meta.env (VITE\_\*).

# UI/UX baseline (default for all future frontend work)

- Match the current Archive Library visual language exactly unless explicitly told otherwise.
- Preserve the current green/day and blue-dark/night theme toggle behavior and tone.
- Keep the same component feel: rounded controls, high-contrast text, subtle panel borders, and consistent hover/active states.
- Avoid introducing alternate global theme systems, radically different palettes, or mismatched page shells.
- Do not introduce hardcoded light/white page or panel colors in frontend pages (`#fff`, `#f*`, `white`) unless explicitly requested.
- For shared or page-level styling, prefer `--site-*` tokens from `Frontend/src/base.css` to prevent theme drift.
