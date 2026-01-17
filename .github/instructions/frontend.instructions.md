---
applyTo: "Frontend/**"
---

# Frontend (Vite) rules
- Never hardcode API URLs. Use ENV.API_URL (Frontend/src/config/env.ts).
- All backend calls must use Frontend/src/lib/api.js helpers (apiGet/apiPost/apiPut/apiDelete).
- External APIs (Cloudinary) must NOT use the internal axios client (avoid leaking auth headers).
- Vite env vars are build-time and accessed via import.meta.env (VITE_*).
