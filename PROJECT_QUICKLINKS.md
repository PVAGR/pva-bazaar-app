# PVABazaar - Quick Links & Command Reference

**Last Updated:** January 23, 2026  
**Version:** Blueprint v1 (Express) + Next.js Alternative

---

## 🚀 Quick Start Commands

### Express + Vite (Current Production)

```bash
# Setup (first time)
.\setup-blueprint.ps1              # Windows
./setup-blueprint.sh               # Mac/Linux

# Development
cd backend && npm run dev          # Backend on :5001
cd Frontend && npm run dev         # Frontend on :5173

# Testing
curl http://localhost:5001/api/health  # Backend health check
open http://localhost:5173             # Frontend UI

# Deployment
git push origin main               # Auto-deploys to Vercel
npm run deploy:frontend            # Deploy to GitHub Pages
```

### Next.js (Alternative Implementation)

```bash
# Setup (first time)
.\setup-nextjs-blueprint.ps1       # Windows
./setup-nextjs-blueprint.sh        # Mac/Linux

# Development
cd pvabazaar-livestream
npm run dev                        # Everything on :3000

# Testing
open http://localhost:3000         # Full app (frontend + backend)

# Deployment
git push origin main               # Auto-deploys to Vercel
```

---

## 📚 Documentation Index

### Getting Started
- **[README.md](README.md)** - Project overview and main documentation
- **[QUICKSTART.md](QUICKSTART.md)** - Express setup (15 minutes)
- **[GET_STARTED.md](GET_STARTED.md)** - Condensed quick reference (5 minutes)
- **[COPY_PASTE_BUILD_GUIDE.md](COPY_PASTE_BUILD_GUIDE.md)** - Complete Next.js implementation guide

### Architecture & Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, data flows, security layers
- **[BLUEPRINT_V1_README.md](BLUEPRINT_V1_README.md)** - Blueprint v1 feature overview
- **[NEXTJS_VS_EXPRESS_COMPARISON.md](NEXTJS_VS_EXPRESS_COMPARISON.md)** - When to use each stack

### Testing & Deployment
- **[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)** - Comprehensive verification guide with curl examples
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Production deployment steps
- **[.env.example.blueprint](.env.example.blueprint)** - Environment variable template

### Implementation Details
- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Full file inventory (22 files, 5500+ lines)
- **[MAGNUM_OPUS.md](MAGNUM_OPUS.md)** - Project philosophy and vision

---

## 🗂️ Project Structure

### Express + Vite Implementation

```
pva-bazaar-app/
├── backend/                       # Express API (Node.js 20)
│   ├── api/index.js               # Main Express app
│   ├── models/                    # MongoDB schemas
│   │   ├── StreamSession.js       # Livestream sessions
│   │   ├── JournalEntry.js        # Personal journals
│   │   ├── DecentralizedIdentity.js  # W3C DIDs
│   │   └── CustomDatabase.js      # User-created databases
│   ├── routes/                    # API endpoints
│   │   ├── streams.js             # /api/streams
│   │   ├── journal.js             # /api/journal
│   │   ├── did.js                 # /api/did
│   │   └── databases.js           # /api/databases
│   ├── service/                   # Business logic
│   │   ├── ipfs.js                # Pinata IPFS client
│   │   └── streaming.js           # Twitch/Livepeer integration
│   └── middleware/
│       └── auth.js                # JWT authentication
├── Frontend/                      # Vite + React
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.js             # Axios client
│   │   │   └── decentralizedApi.js  # Blueprint v1 API client
│   │   └── config/env.ts          # Environment config
│   └── public/
│       └── dashboard.html         # Main dashboard UI
└── docs/                          # All documentation
```

### Next.js Implementation (New)

```
pvabazaar-livestream/              # Created by setup script
├── app/
│   ├── api/                       # API routes
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── streams/route.ts
│   │   ├── journals/route.ts
│   │   └── users/export/route.ts
│   ├── dashboard/                 # Dashboard pages
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── streams/page.tsx
│   │   └── journals/page.tsx
│   └── auth/                      # Auth pages
│       ├── signin/page.tsx
│       └── signup/page.tsx
├── components/                    # React components
│   ├── Sidebar.tsx
│   ├── StreamCard.tsx
│   ├── JournalPreview.tsx
│   └── HLSPlayer.tsx
├── lib/                           # Utilities
│   ├── mongodb.ts                 # DB connection
│   └── ipfs.ts                    # IPFS client
└── models/                        # Mongoose schemas
    ├── User.ts
    ├── Stream.ts
    └── JournalEntry.ts
```

---

## 🔗 API Endpoints Reference

### Authentication (Express)
```
POST   /api/auth/register        # Create account
POST   /api/auth/login           # Sign in (returns JWT)
POST   /api/auth/logout          # Sign out
GET    /api/auth/me              # Get current user
```

### Streams
```
GET    /api/streams              # List user's streams (paginated)
GET    /api/streams/:id          # Get single stream
POST   /api/streams              # Create stream
PUT    /api/streams/:id          # Update stream
DELETE /api/streams/:id          # Delete stream
POST   /api/streams/:id/webhook  # Webhook handler (Twitch/Kick)
```

### Journal Entries
```
GET    /api/journal              # List user's entries
GET    /api/journal/:id          # Get single entry
POST   /api/journal              # Create entry
PUT    /api/journal/:id          # Update entry
DELETE /api/journal/:id          # Delete entry
GET    /api/journal/public/feed  # Public community feed
```

### Decentralized Identity (DID)
```
GET    /api/did                  # Get user's DID
POST   /api/did                  # Generate new DID (returns privateKey once)
PUT    /api/did                  # Update DID document
GET    /api/did/:did             # Resolve any DID (public)
POST   /api/did/verify           # Verify signature
```

### Custom Databases
```
GET    /api/databases            # List user's databases
GET    /api/databases/:id        # Get single database
POST   /api/databases            # Create database
PUT    /api/databases/:id        # Update database
DELETE /api/databases/:id        # Delete database
POST   /api/databases/:id/entries         # Add entry
DELETE /api/databases/:id/entries/:entryId # Remove entry
GET    /api/databases/public/feed         # Public databases
```

### Data Export
```
GET    /api/users/export         # Download all data (JSON)
```

---

## 🧪 Testing Commands

### Health Checks

```bash
# Backend API
curl http://localhost:5001/api/health

# Frontend
curl http://localhost:5173

# Next.js (everything)
curl http://localhost:3000
```

### User Registration (Express)

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

### Create Stream (Express)

```bash
curl -X POST http://localhost:5001/api/streams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "My First Stream",
    "description": "Testing the platform",
    "platform": "twitch",
    "tags": ["test", "live"]
  }'
```

### Create Journal Entry (Express)

```bash
curl -X POST http://localhost:5001/api/journal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Reflection on Today",
    "content": "Today I streamed for the first time...",
    "mood": "uplifting",
    "tags": ["first-stream", "reflection"]
  }'
```

**Full testing guide:** [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)

---

## 🛠️ Environment Variables

### Express Backend (backend/.env)

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pvabazaar

# JWT Authentication
JWT_SECRET=your-256-bit-secret-here

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
PINATA_GATEWAY_URL=https://gateway.pinata.cloud

# Streaming Platforms (Optional)
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
TWITCH_WEBHOOK_SECRET=your_webhook_secret
LIVEPEER_API_KEY=your_livepeer_api_key

# Server
PORT=5001
NODE_ENV=development
```

### Vite Frontend (Frontend/.env)

```bash
VITE_API_URL=http://localhost:5001
```

### Next.js (pvabazaar-livestream/.env.local)

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pvabazaar

# NextAuth
NEXTAUTH_SECRET=your-32-byte-hex-secret
NEXTAUTH_URL=http://localhost:3000

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
PINATA_API_JWT=your_pinata_jwt

# Streaming Platforms (Optional)
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
LIVEPEER_API_KEY=your_livepeer_api_key
```

**Full templates:** [.env.example.blueprint](.env.example.blueprint)

---

## 🚢 Deployment URLs

### Production (Express + Vite)
- **Frontend:** https://pvabazaar.org (GitHub Pages)
- **Backend:** https://pvabazaar-api.vercel.app (Vercel)

### Staging (Next.js - if deployed)
- **Full App:** https://pvabazaar-livestream.vercel.app

---

## 📦 NPM Scripts

### Backend (Express)

```json
{
  "scripts": {
    "dev": "nodemon api/index.js",           # Dev server with hot reload
    "start": "node api/index.js",            # Production server
    "test": "jest",                          # Run tests
    "lint": "eslint .",                      # Lint check
    "format": "prettier --write ."           # Format code
  }
}
```

### Frontend (Vite)

```json
{
  "scripts": {
    "dev": "vite",                           # Dev server on :5173
    "build": "vite build",                   # Production build
    "preview": "vite preview",               # Preview build locally
    "deploy": "gh-pages -d dist"             # Deploy to GitHub Pages
  }
}
```

### Next.js

```json
{
  "scripts": {
    "dev": "next dev",                       # Dev server on :3000
    "build": "next build",                   # Production build
    "start": "next start",                   # Production server
    "lint": "next lint",                     # Next.js linter
    "type-check": "tsc --noEmit"             # TypeScript check
  }
}
```

---

## 🐛 Troubleshooting Quick Fixes

### Backend won't start

```bash
# Check MongoDB connection
mongo "MONGODB_URI_HERE" --eval "db.stats()"

# Clear node_modules
cd backend
rm -rf node_modules package-lock.json
npm install

# Check port availability
lsof -i :5001  # Mac/Linux
netstat -ano | findstr :5001  # Windows
```

### Frontend can't reach backend

```bash
# Check CORS configuration in backend/api/index.js
# Verify VITE_API_URL in Frontend/.env
# Ensure both servers running

# Test backend directly
curl http://localhost:5001/api/health
```

### MongoDB connection timeout

```bash
# Whitelist your IP in MongoDB Atlas
# Check network access in Atlas dashboard
# Verify MONGODB_URI format:
# mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/DATABASE
```

### IPFS upload fails

```bash
# Verify Pinata credentials
curl -X GET https://api.pinata.cloud/data/testAuthentication \
  -H "pinata_api_key: YOUR_KEY" \
  -H "pinata_secret_api_key: YOUR_SECRET"

# Check Pinata quota (free tier: 1GB)
```

**Full troubleshooting:** [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) (Common Issues section)

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] ✅ All secrets in `.env` (never commit)
- [ ] ✅ CORS whitelist configured (no wildcards in production)
- [ ] ✅ Rate limiting enabled (express-rate-limit)
- [ ] ✅ JWT secret is 256+ bits
- [ ] ✅ MongoDB Atlas IP whitelist configured
- [ ] ✅ HTTPS enabled (Vercel does this automatically)
- [ ] ✅ Input validation on all API routes
- [ ] ✅ Helmet.js enabled (security headers)
- [ ] ✅ Dependencies up to date (`npm audit`)
- [ ] ✅ Private keys never stored server-side (DID feature)

---

## 🤝 Contributing

### For Express + Vite:
1. Fork the repo
2. Create feature branch: `git checkout -b feature/your-feature`
3. Follow existing patterns in `backend/routes/` and `Frontend/src/`
4. Test with curl (see [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md))
5. Submit PR with detailed description

### For Next.js:
1. Run setup script: `./setup-nextjs-blueprint.sh`
2. Follow [COPY_PASTE_BUILD_GUIDE.md](COPY_PASTE_BUILD_GUIDE.md)
3. Create PR with comparison to Express implementation

---

## 📞 Support & Resources

### External Services
- **MongoDB Atlas:** https://cloud.mongodb.com (free tier: 512MB)
- **Pinata IPFS:** https://pinata.cloud (free tier: 1GB)
- **Vercel:** https://vercel.com (free tier: 100GB bandwidth)
- **Twitch Developers:** https://dev.twitch.tv
- **Livepeer:** https://livepeer.org

### Community
- **GitHub Issues:** Open issues for bugs/features
- **Discussions:** Share your customizations
- **Wiki:** Community-maintained guides

---

## 🎯 Quick Decision Tree

**"Which implementation should I use?"**

```
Are you building an API for multiple clients (web + mobile)?
├─ YES → Use Express + Vite
└─ NO → Continue...

Do you need SEO (server-side rendering)?
├─ YES → Use Next.js
└─ NO → Continue...

Do you want the fastest development experience?
├─ YES → Use Next.js (less boilerplate)
└─ NO → Use Express + Vite (more control)

Do you need advanced features (DID, Custom DBs)?
├─ YES → Use Express + Vite (already implemented)
└─ NO → Either works

Want to deploy for free?
├─ YES → Express + Vite (GitHub Pages frontend)
└─ NO → Either works
```

**Still unsure?** Read [NEXTJS_VS_EXPRESS_COMPARISON.md](NEXTJS_VS_EXPRESS_COMPARISON.md)

---

## 📝 Todo List (Community Contributions Welcome)

### Express + Vite Enhancements
- [ ] Add Kick API integration (currently stubbed)
- [ ] Implement webhook signature verification
- [ ] Auto-trigger IPFS upload on stream.offline
- [ ] Add stream recording download UI
- [ ] Email verification for new users
- [ ] Password reset flow
- [ ] 2FA with DID integration

### Next.js Implementation
- [ ] Port DID feature from Express version
- [ ] Port Custom Databases feature
- [ ] Add rate limiting middleware
- [ ] Implement advanced IPFS features
- [ ] Add real-time stream status updates (WebSocket)

### Documentation
- [ ] OBS setup guide (stream key configuration)
- [ ] Mobile app roadmap
- [ ] Plugin development guide
- [ ] Video tutorials

---

**Last Updated:** January 23, 2026  
**Maintained by:** PVABazaar Community  
**License:** MIT

🚀 **Ready to build?** Start with [QUICKSTART.md](QUICKSTART.md) or [COPY_PASTE_BUILD_GUIDE.md](COPY_PASTE_BUILD_GUIDE.md)
