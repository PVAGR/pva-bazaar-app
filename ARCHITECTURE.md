# Blueprint v1 Architecture & Data Flow

## Live Continuity Map

| Surface | Canonical URL |
|---|---|
| Frontend | https://pvabazaar.org |
| Backend | https://api.pvabazaar.org |
| API base | https://api.pvabazaar.org/api |
| Status page | https://pvabazaar.org/status.html |
| Fallback backend | https://pva-bazaar-app-1.onrender.com |

The canonical source of truth for live routing and release targets is `/tmp/workspace/PVAGR/pva-bazaar-app/Frontend/public/live-map.json`. Deploy gates, status reporting, and continuity monitoring should consume that file before using hardcoded endpoints.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER LAYER                                  │
│  ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌─────────────┐     │
│  │   OBS    │  │   Browser   │  │  Mobile  │  │  External   │     │
│  │  Studio  │  │  Dashboard  │  │   App    │  │   APIs      │     │
│  └────┬─────┘  └──────┬──────┘  └────┬─────┘  └──────┬──────┘     │
│       │               │              │               │             │
└───────┼───────────────┼──────────────┼───────────────┼─────────────┘
        │               │              │               │
        │         ┌─────▼──────────────▼───────────────▼─────┐
        │         │     CORS-Protected Frontend (Vite)       │
        │         │     • React Components                    │
        │         │     • API Client (axios)                  │
        │         │     • JWT Token Management                │
        │         └──────────────┬────────────────────────────┘
        │                        │
        │                        │ HTTPS/WSS
        │                        │
┌───────▼────────────────────────▼───────────────────────────────────┐
│                    API GATEWAY (Vercel)                            │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Express.js Server (Serverless Functions)                    │ │
│  │  • Rate Limiting                                              │ │
│  │  • Authentication Middleware (JWT)                            │ │
│  │  • CORS Configuration                                         │ │
│  └────────┬───────────────────────────────────────────┬──────────┘ │
│           │                                            │            │
│  ┌────────▼────────┐                         ┌────────▼──────────┐ │
│  │  Route Handlers │                         │  Service Layer    │ │
│  │  • /streams     │                         │  • ipfs.js        │ │
│  │  • /journal     │◄────────────────────────┤  • streaming.js   │ │
│  │  • /did         │                         │  • auth.js        │ │
│  │  • /databases   │                         └───────────────────┘ │
│  └─────────────────┘                                               │
└─────────┬─────────────────────┬─────────────────────┬─────────────┘
          │                     │                     │
          │                     │                     │
┌─────────▼───────┐  ┌──────────▼──────────┐  ┌──────▼──────────────┐
│   MongoDB       │  │   IPFS Network      │  │  External Services  │
│   (Atlas)       │  │   (Pinata)          │  │  • Twitch API       │
│                 │  │                     │  │  • Kick API         │
│  Collections:   │  │  Storage:           │  │  • Livepeer API     │
│  • Users        │  │  • Video recordings │  │  • YouTube API      │
│  • StreamSess.. │  │  • Journal backups  │  │                     │
│  • JournalEnt.. │  │  • DID documents    │  └─────────────────────┘
│  • DecentralId  │  │  • Database exports │
│  • CustomDB     │  │                     │
└─────────────────┘  └─────────────────────┘
```

---

## 📊 Data Flow Diagrams

### 1. Livestream Recording Flow

```
┌──────────┐
│   User   │
│  (OBS)   │
└────┬─────┘
     │ 1. Start Stream
     │    (RTMP to Livepeer/Twitch)
     ▼
┌──────────────────┐
│  Streaming       │
│  Platform        │◄──────────────┐
│  (Livepeer)      │               │
└────┬─────────────┘               │
     │ 2. Webhook:                 │
     │    stream.online            │
     ▼                             │ 5. Confirm
┌──────────────────┐               │    recording URL
│  PVA API         │               │
│  /streams/webhook│───────────────┘
└────┬─────────────┘
     │ 3. Update stream status
     │    (live)
     ▼
┌──────────────────┐
│  MongoDB         │
│  StreamSession   │
└────┬─────────────┘
     │
     │ 4. On stream end:
     │    Download recording
     ▼
┌──────────────────┐
│  IPFS Service    │
│  (Pinata)        │
└────┬─────────────┘
     │ 5. Upload to IPFS
     │    → Get IPFS hash
     ▼
┌──────────────────┐
│  Update MongoDB  │
│  with ipfsHash   │
│  & gateway URL   │
└──────────────────┘
     │
     ▼
┌──────────────────┐
│  User Dashboard  │
│  (View recording)│
└──────────────────┘
```

### 2. Journal Entry Creation

```
┌──────────┐
│  User    │
│ Browser  │
└────┬─────┘
     │ 1. Create journal entry
     │    (title, content, tags)
     ▼
┌──────────────────┐
│  Frontend Form   │
│  /journal.html   │
└────┬─────────────┘
     │ 2. POST /api/journal
     │    {title, content, tags}
     ▼
┌──────────────────┐
│  Auth Middleware │
│  (Verify JWT)    │
└────┬─────────────┘
     │ 3. Validated
     ▼
┌──────────────────┐
│  Journal Route   │
│  Handler         │
└────┬─────────────┘
     │ 4. Create document
     ▼
┌──────────────────┐
│  MongoDB         │
│  JournalEntry    │
└────┬─────────────┘
     │
     │ 5. Optional: Backup to IPFS
     │    (if user clicks "Backup")
     ▼
┌──────────────────┐
│  IPFS Service    │
│  uploadJSON()    │
└────┬─────────────┘
     │ 6. Return ipfsHash
     ▼
┌──────────────────┐
│  Update entry    │
│  with ipfsHash   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Return to user  │
│  {ok: true, item}│
└──────────────────┘
```

### 3. DID Creation & Verification

```
┌──────────┐
│  User    │
│  Browser │
└────┬─────┘
     │ 1. Click "Create DID"
     ▼
┌──────────────────┐
│  POST /api/did   │
└────┬─────────────┘
     │ 2. Generate key pair
     │    (Ed25519)
     ▼
┌──────────────────┐
│  Crypto Module   │
│  generateKeyPair │
└────┬─────────────┘
     │ 3. publicKey, privateKey
     ▼
┌──────────────────┐
│  Hash public key │
│  → DID identifier│
│  did:key:z6Mk... │
└────┬─────────────┘
     │ 4. Create DID Document
     │    (W3C format)
     ▼
┌──────────────────┐
│  Save to MongoDB │
│  DecentralizedId │
│  (publicKey only)│
└────┬─────────────┘
     │ 5. Return privateKey ONCE
     │    (never stored)
     ▼
┌──────────────────┐
│  User saves key  │
│  (secure storage)│
└──────────────────┘

--- Verification Flow ---

┌──────────┐
│  Anyone  │
└────┬─────┘
     │ 1. GET /api/did/did:key:z6Mk...
     ▼
┌──────────────────┐
│  Resolve DID     │
│  from MongoDB    │
└────┬─────────────┘
     │ 2. Return DID Document
     │    (public info only)
     ▼
┌──────────────────┐
│  Verify signature│
│  using publicKey │
└──────────────────┘
```

### 4. Custom Database Management

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Create database
     │    "My Video Archive"
     ▼
┌──────────────────┐
│  POST /databases │
└────┬─────────────┘
     │ 2. Save metadata
     ▼
┌──────────────────┐
│  MongoDB         │
│  CustomDatabase  │
│  {name, type}    │
└────┬─────────────┘
     │
     │ 3. Add entries
     │    (videos, links, files)
     ▼
┌──────────────────┐
│  POST /databases │
│  /:id/entries    │
└────┬─────────────┘
     │ 4. Push to entries array
     │    {title, ipfsHash, ...}
     ▼
┌──────────────────┐
│  Update stats    │
│  totalEntries++  │
│  totalSize += n  │
└────┬─────────────┘
     │
     │ 5. Optional: Full backup
     │    (export all entries)
     ▼
┌──────────────────┐
│  IPFS Service    │
│  uploadJSON()    │
└────┬─────────────┘
     │ 6. Save backup hash
     ▼
┌──────────────────┐
│  ipfsBackupHash  │
│  stored in DB    │
└──────────────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
└─────────────────────────────────────────────────────────────┘

1. Transport Layer (TLS/HTTPS)
   ├─ All API calls encrypted in transit
   ├─ WSS for real-time connections
   └─ Certificate validation

2. Authentication Layer (JWT)
   ├─ Token-based auth (Bearer)
   ├─ Expiry: 7 days
   ├─ Refresh tokens (optional v2)
   └─ Middleware validation on all protected routes

3. Authorization Layer
   ├─ User can only access own data (userId check)
   ├─ Admin routes require admin secret
   └─ Public endpoints: DID resolution, public feeds

4. Data Protection
   ├─ Passwords hashed (bcrypt, salt rounds: 10)
   ├─ Secrets in env vars (never committed)
   ├─ Private keys NEVER stored (DID generation)
   └─ Stream keys encrypted at rest (future)

5. Rate Limiting
   ├─ General: 100 req/15min
   ├─ Auth: 10 req/15min
   ├─ Webhooks: 50 req/15min
   └─ Prevents brute force/DoS

6. CORS Policy
   ├─ Whitelist: pvabazaar.org, localhost
   ├─ Credentials allowed
   ├─ Preflight handled
   └─ Origin validation

7. Input Validation
   ├─ Schema validation (Mongoose)
   ├─ Sanitization (xss-clean)
   ├─ Size limits (1MB JSON body)
   └─ Type checking

8. IPFS Security
   ├─ Pinata API keys in env
   ├─ CIDv1 for content addressing
   ├─ Gateway rate limits
   └─ No executable file uploads
```

---

## 🌐 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION SETUP                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  GitHub Repo     │
│  (Source Code)   │
└────┬────────┬────┘
     │        │
     │        └──────────────────┐
     │                           │
     ▼                           ▼
┌──────────────────┐    ┌──────────────────┐
│  Vercel          │    │  GitHub Pages    │
│  (Backend API)   │    │  (Frontend)      │
│                  │    │                  │
│  • Auto-deploy   │    │  • Auto-deploy   │
│  • Env vars      │    │  • Static HTML   │
│  • Serverless    │    │  • CDN cached    │
│  • Edge network  │    │  • HTTPS         │
└────┬─────────────┘    └────┬─────────────┘
     │                       │
     │                       │
     ▼                       ▼
┌──────────────────────────────────────┐
│         User Browser                 │
│  • pvabazaar.org (frontend)          │
│  • api.pvabazaar.org (backend)       │
└──────────────────────────────────────┘

External Services:
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  MongoDB Atlas   │  │  Pinata (IPFS)   │  │  Livepeer        │
│  (Database)      │  │  (Storage)       │  │  (Streaming)     │
│  • Free tier     │  │  • Free tier     │  │  • Free tier     │
│  • Auto-backup   │  │  • 1GB limit     │  │  • 1000min/mo    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 📈 Scalability Considerations

### Current (v1 - Small Scale)
- **Users:** 1-1000
- **Streams:** ~100 concurrent
- **Storage:** 10GB IPFS (Pinata free tier)
- **Database:** MongoDB free tier (512MB)

### Phase 2 (Medium Scale - 10K users)
- Upgrade MongoDB to paid tier
- Multiple IPFS providers (redundancy)
- CDN for video playback (Cloudflare)
- Load balancer for API

### Phase 3 (Large Scale - 100K+ users)
- Microservices architecture
- Kubernetes for orchestration
- Distributed IPFS cluster
- Cassandra/ScyllaDB for time-series data
- WebRTC mesh networks (P2P)

---

**Architecture designed for:**
✅ Easy local development  
✅ Free-tier deployment  
✅ Progressive decentralization  
✅ Community forkability  
✅ Horizontal scalability  

---

_Last Updated: January 23, 2026_  
_Blueprint v1 Architecture_
