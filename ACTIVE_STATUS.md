# PVA Bazaar - Active Status

## Confirmed Architecture

### Production Infrastructure
- **Frontend**: GitHub Pages at https://pvabazaar.org
- **Backend**: Vercel at https://pva-backend-api.vercel.app
- **Database**: MongoDB Atlas (source of truth for book records)
- **Media Storage**: Cloudinary (cover images and media assets only)

### Architecture Rules
- ✅ MongoDB is the sole source of truth for book records
- ✅ Cloudinary is media storage only, NOT a book database
- ❌ GitHub is NOT the database
- ❌ Cloudinary assets are NOT book records unless referenced by MongoDB documents
- ❌ Vercel filesystem is NOT persistent
- ❌ Browser localStorage is NOT production persistence

## Live Verification Policy

**No task is complete until externally verified from production:**

### Required Endpoints to Check
1. `https://pva-backend-api.vercel.app/api/health`
2. `https://pva-backend-api.vercel.app/api/book-publishing/public`
3. `https://pva-backend-api.vercel.app/api/book-publishing/public?t=<timestamp>`

### Verification Requirements
- `/api/health` must show:
  - MongoDB connected (mode: mongo, readyState: 1)
  - Real deployed SHA (not "local")
  - Branch: main

- `/api/book-publishing/public` must return:
  - Total >= 1 (if books exist)
  - MongoDB-backed published books only
  - No webHtml
  - No manuscriptMarkdown
  - No Cloudinary-only fake book records

- Consistency check:
  - Plain endpoint and cache-busted endpoint MUST return identical results
  - Same total count
  - Same book IDs
  - Same metadata

## Current Known Issues

### Production Inconsistency (2026-07-22) - RESOLVED
**Latest Agent Report:**
- Deployment SHA: 5c0d38e
- Public endpoint total: 1

**External Check (ChatGPT):**
- `/api/health` sha: local
- MongoDB: connected
- `/api/book-publishing/public` total: 0

**Status:** RESOLVED - Latest deployment (90b9aae) has fixed the inconsistency.

**Current Live Status (2026-07-22 16:36 UTC):**
- `/api/health` sha: 90b9aae (real SHA, not "local")
- MongoDB: connected (mode: mongo, readyState: 1)
- `/api/book-publishing/public` total: 1
- `/api/book-publishing/public?t=<timestamp>` total: 1
- Both endpoints match ✅

## Public API Requirements

### Data Source
- Public book records come ONLY from MongoDB BookProject collection
- Filter: `status = 'published'`
- No Cloudinary asset merging as books
- No file-store fallback when MongoDB is connected

### Lightweight Metadata Only
**Required fields:**
- id
- title
- subtitle
- authorName
- slug
- description
- genre
- audience
- language
- status
- wordCount
- publishedAt
- updatedAt
- frontCover.url/provider/publicId
- backCover.url/provider/publicId
- links

**Forbidden fields:**
- webHtml
- manuscriptMarkdown
- full manuscript text
- file buffers
- secrets

## Required Live Success Criteria

1. `/api/health` shows MongoDB connected and real deployed SHA
2. `/api/book-publishing/public` returns total >= 1 (if books exist)
3. Plain endpoint and cache-busted endpoint match exactly
4. No webHtml in response
5. No manuscriptMarkdown in response
6. No Cloudinary-only fake books
7. No file-store fallback when MongoDB is connected

## Agent Reporting Requirements

Every coding agent must report:
- Files changed
- Branch name
- Git status
- Latest commit SHA
- Deployment ID
- Live `/api/health` result
- Live `/api/book-publishing/public` result
- Live cache-busted `/api/book-publishing/public?t=` result
- Exact proof that plain and cache-busted endpoints match

## Current Deployment Status

**Last Verified:** 2026-07-22 16:36 UTC
**Backend URL:** https://pva-backend-api.vercel.app
**Frontend URL:** https://pvabazaar.org
**Repository:** PVAGR/pva-bazaar-app
**Branch:** main

**Current Deployment:**
- SHA: 90b9aae3410b4aa2be691f5b465fe2923ba7da6f
- Deployment ID: dpl_6fptpS6Dx19gbndA2kZGzFD8ZHqy
- MongoDB: Connected ✅
- Public API: Deterministic ✅
- Plain endpoint: total=1 ✅
- Cache-busted endpoint: total=1 ✅

**Status:** Production is consistent and operational
