# Fork Guide for PVA Civilization Library

This guide explains how to fork and run your own decentralized Civilization Library instance.

## 1. Fork and Clone

1. Fork the repository in GitHub.
2. Clone your fork:

   git clone https://github.com/<your-org>/pva-bazaar-app.git
   cd pva-bazaar-app

## 2. Install Dependencies

1. Install root dependencies:

   npm install

2. Install workspace dependencies explicitly (recommended for first-time setup):

   cd backend && npm install
   cd ../Frontend && npm install
   cd ..

## 3. Configure Environment

Set these backend variables in backend/.env:

- MONGODB_URI
- JWT_SECRET
- PINATA_API_KEY
- PINATA_API_SECRET
- PINATA_GATEWAY_URL
- LIBRARY_GIT_SYNC_ENABLED=true
- LIBRARY_GIT_BRANCH=content-library

Set these frontend variables in Frontend/.env.local:

- VITE_API_URL

## 4. Run Locally

1. Backend:

   cd backend
   npm run dev

2. Frontend:

   cd Frontend
   npm run dev

## 5. Library Content Forkability

- Approved articles are written to content/library/\*.md.
- CID mapping is tracked in content/library/cid-map.json.
- You can maintain a separate content-library branch for collaborative content workflows.

## 6. Moderation Roles

- user: submit articles
- moderator: review, approve, reject
- admin: full moderator capabilities

## 7. Publishing Pipeline

Use .github/workflows/ipfs-publish.yml to publish content/library markdown files to IPFS and update CID mapping.

## 8. AGPL Compliance Reminder

If you deploy a modified network-accessible fork, you must publish the corresponding source code under AGPL-3.0.
