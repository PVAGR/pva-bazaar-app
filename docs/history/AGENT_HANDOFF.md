# PVA Bazaar - Agent Handoff

## Quick Start for New Agents

**STOP** - Read this file before making any changes.

## Architecture Overview

### Production Infrastructure
- **Frontend**: GitHub Pages → https://pvabazaar.org
- **Backend**: Vercel → https://pva-backend-api.vercel.app
- **Database**: MongoDB Atlas (book records only)
- **Media**: Cloudinary (covers/media only)

### Critical Rules
1. **MongoDB is the source of truth** for book records
2. **Cloudinary is NOT a book database** - it's media storage only
3. **GitHub is NOT a database**
4. **Vercel filesystem is NOT persistent**
5. **Browser localStorage is NOT production persistence**

### Data Flow
```
User → Frontend (GitHub Pages) → Backend API (Vercel) → MongoDB (Atlas) → Cloudinary (media)
```

## Verification Policy

**NO TASK IS COMPLETE until externally verified from production.**

### Required Live Checks
Before claiming success, verify ALL of these:

1. `https://pva-backend-api.vercel.app/api/health`
   - MongoDB connected (mode: mongo, readyState: 1)
   - Real deployed SHA (not "local")
   - Branch: main

2. `https://pva-backend-api.vercel.app/api/book-publishing/public`
   - Returns MongoDB-backed published books
   - No webHtml
   - No manuscriptMarkdown
   - No Cloudinary-only fake books

3. `https://pva-backend-api.vercel.app/api/book-publishing/public?t=<timestamp>`
   - MUST match plain endpoint exactly
   - Same total count
   - Same book IDs

### Success Criteria
- ✅ MongoDB connected
- ✅ Real SHA (not "local")
- ✅ Public endpoint returns books from MongoDB only
- ✅ Plain and cache-busted endpoints match
- ✅ No webHtml/manuscript in response
- ✅ No Cloudinary fake books

## Current Issues

### Production Inconsistency (2026-07-22)
**Problem:** Public endpoint is not deterministic

**Evidence:**
- Latest agent report: SHA=5c0d38e, total=1
- External check: SHA=local, total=0

**Status:** ✅ RESOLVED — see ACTIVE_STATUS.md for the live verification.

**Resolution:**
- Public endpoint is deterministic regardless of query params; plain and cache-busted endpoints match (total=1).
- MongoDB is the source of truth for published books; no webHtml/manuscriptMarkdown in public responses.
- Last verified deployment: SHA `90b9aae3410b4aa2be691f5b465fe2923ba7da6f`, deployment `dpl_6fptpS6Dx19gbndA2kZGzFD8ZHqy` (2026-07-22 16:36 UTC).

## Code Structure

### Backend Routes
- `backend/routes/bookPublishing.js` - Book publishing API
- `backend/api/index-serverless.js` - Main serverless entry point
- `backend/lib/mongoConnection.js` - MongoDB connection logic
- `backend/lib/buildInfo.js` - Build/deployment info

### Key Functions
- `listPublishedBooks()` - Must return MongoDB books only
- `loadBookForSlug()` - Load book by slug from MongoDB
- `setNoCacheHeaders()` - Apply cache headers to responses

### GitHub Actions
- `.github/workflows/deploy-backend-live.yml` - Backend deployment
- `.github/workflows/deploy-frontend.yml` - Frontend deployment

## Agent Reporting Template

After any work, report:

```
Files changed: [list]
Branch: [name]
Git status: [status]
Latest commit SHA: [SHA]
Deployment ID: [ID]

Live verification:
- /api/health: [result]
- /api/book-publishing/public: [total, book IDs]
- /api/book-publishing/public?t=<timestamp>: [total, book IDs]

Proof of consistency: [plain == cache-busted]
```

## Common Pitfalls

### ❌ DO NOT
- Use Cloudinary as a book database
- Merge Cloudinary assets as published books
- Return webHtml or manuscriptMarkdown in public API
- Use file-store fallback when MongoDB is connected
- Claim success without live verification
- Work on styling before fixing API consistency

### ✅ DO
- Read MongoDB for book records
- Use Cloudinary only for cover/media URLs
- Return lightweight metadata only
- Verify live endpoints before claiming success
- Check both plain and cache-busted endpoints
- Report live verification results

## Debugging

### Diagnostic Endpoints
- `/api/health` - Backend health and MongoDB status
- `/api/version` - Deployment SHA and version
- `/api/book-publishing/debug/public-counts` - Book counts and diagnostics

### Common Issues
1. **SHA shows "local"** - VERCEL_GIT_COMMIT_SHA not set in deployment
2. **Total = 0** - MongoDB query failing or no published books
3. **Inconsistent results** - Cache headers not applied or data source changing

## Deployment

### Backend Deployment
- Trigger: Push to main branch affecting backend/
- Target: Vercel project `pva-backend-api`
- Environment variables set via GitHub Actions

### Frontend Deployment
- Trigger: Push to main branch affecting Frontend/
- Target: GitHub Pages
- Static site build

## Contact

**Repository:** PVAGR/pva-bazaar-app
**Backend:** https://pva-backend-api.vercel.app
**Frontend:** https://pvabazaar.org

**Last Updated:** 2026-07-22
