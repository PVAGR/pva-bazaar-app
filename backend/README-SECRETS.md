# Backend Secrets Guide

Never commit `.env` files. Use this guide to configure secrets locally and in deployment.

## Required Variables

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Long, random value used to sign tokens
- `ADMIN_SECRET_CODE` (optional): Local admin-only features

## Local Setup

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in values securely
3. Start the backend:

```
cd backend
npm install
npm run dev
```

## Production

- Store secrets in your platform’s environment manager (e.g., Vercel/Render/AWS Secrets Manager)
- Do not commit `.env` or `.vercel/.env.*` files

## Audits

- Gitleaks flagged `.env` and `.vercel` env files with real tokens. These files were removed and ignored.
- If rotating secrets, update environment manager and restart the service.
