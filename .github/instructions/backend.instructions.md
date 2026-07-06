---
applyTo: 'backend/**'
---

# Backend (Express/Vercel) rules

- Read secrets from process.env only (MONGODB_URI, JWT_SECRET, ADMIN_SECRET_CODE).
- CORS must allow the frontend origins (pvabazaar.org) and must correctly handle multiple origins if configured.
- Never return raw secrets in responses/logs.
