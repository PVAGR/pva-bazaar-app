# Self-Hosting Guide: Civilization Library Module

This document explains how to self-host the collaborative Civilization Library for pvabazaar.org architecture.

## Prerequisites

- Node.js 20.x
- MongoDB Atlas (or compatible MongoDB)
- Git installed on server runtime (optional but recommended for content branch commits)
- Pinata account (or compatible IPFS pinning service)

## 1. Clone and Install

1. Clone repository:

   git clone https://github.com/PVAGR/pva-bazaar-app.git
   cd pva-bazaar-app

2. Install dependencies:

   npm install
   cd backend && npm install
   cd ../Frontend && npm install
   cd ..

## 2. Backend Environment

Create backend/.env with at least:

- NODE_ENV=production
- MONGODB_URI=<atlas-connection-string>
- JWT_SECRET=<strong-secret>
- ALLOWED_ORIGIN=https://your-domain.example
- PINATA_API_KEY=<pinata-key>
- PINATA_API_SECRET=<pinata-secret>
- PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
- LIBRARY_GIT_SYNC_ENABLED=true
- LIBRARY_GIT_BRANCH=content-library

## 3. Frontend Environment

Create Frontend/.env.production:

- VITE_API_URL=https://your-api-domain.example

## 4. Build and Run

1. Backend:

   cd backend
   npm run dev

2. Frontend:

   cd Frontend
   npm run build
   npm run preview

## 5. API Surface Added by Civilization Library Module

Mounted under existing backend route prefix /api/library:

- POST /api/library/submit
- GET /api/library/pending
- PUT /api/library/:id/approve
- PUT /api/library/:id/reject
- GET /api/library/:id

## 6. Moderation Flow

1. User submits markdown + YAML using POST /api/library/submit.
2. Article status becomes pending.
3. Moderator reviews queue using GET /api/library/pending.
4. Moderator approves or rejects.
5. On approve, backend renders static HTML, uploads to IPFS, stores CID, and attempts Git sync to content/library.

## 7. CI/CD for IPFS Sync

Workflow: .github/workflows/ipfs-publish.yml

It triggers on content/library changes, uploads generated HTML to IPFS, and updates content/library/cid-map.json.

## 8. Security Checklist

- Enforce HTTPS for API and frontend.
- Use strong JWT secret and rotate regularly.
- Restrict CORS origins.
- Keep role assignment for moderator/admin controlled.
- Keep PINATA and DB credentials in secret stores (never commit).
