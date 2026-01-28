# PVABazaar - Decentralized Livestreaming Platform

**Status:** Blueprint v1 - Production Ready  
**Last Updated:** January 23, 2026  
**License:** MIT | **Community:** Open Source

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://cloud.mongodb.com)
[![IPFS](https://img.shields.io/badge/Storage-IPFS-blue.svg)](https://ipfs.io)

---

## 🎯 Mission Statement

**Reclaim your digital autonomy.**

PVABazaar is a decentralized livestreaming platform that lets you:
- 📡 **Stream autonomously** to Twitch, Kick, or Livepeer
- 💾 **Record everything** to your own IPFS database (permanent, decentralized)
- 📝 **Journal reflections** linked to streams (private or public)
- 🆔 **Control your identity** with W3C Decentralized Identifiers (DIDs)
- 🗂️ **Create custom databases** ("PirateBay-like") with complete data ownership
- 📊 **Export all your data** anytime (JSON format—no lock-in)

**Philosophy:** "Open the doorway at the top of your brain...relax...experience vulnerability...break the callus off our minds...one day one year one century at a time."

---

## 🚀 Quick Start

### Express + Vite (Production Implementation)

**5-minute setup:**
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/pva-bazaar-app.git
cd pva-bazaar-app

# Run setup (Windows)
.\setup-blueprint.ps1

# Or Mac/Linux
./setup-blueprint.sh

# Configure .env files with your credentials
# Get MongoDB URI from https://mongodb.com/atlas (free tier)
# Get Pinata keys from https://pinata.cloud (free tier)

# Start development servers (two terminals)
cd backend && npm run dev      # Terminal 1: Backend on :5001
cd Frontend && npm run dev     # Terminal 2: Frontend on :5173

# Test
curl http://localhost:5001/api/health
open http://localhost:5173
```

**Sign up → Dashboard → Done!** ✅

### Next.js Alternative (For rapid development)

```bash
# Windows
.\setup-nextjs-blueprint.ps1

# Mac/Linux
./setup-nextjs-blueprint.sh

cd pvabazaar-livestream
npm run dev  # Everything on :3000
```

**[Choose your path →](NEXTJS_VS_EXPRESS_COMPARISON.md)**

---

## 📚 Documentation Hub

### 🏃 Getting Started (Pick One)

| Resource | Time | Best For |
|----------|------|----------|
| **[QUICKSTART.md](QUICKSTART.md)** | 15 min | Express setup walkthrough |
| **[GET_STARTED.md](GET_STARTED.md)** | 5 min | Quick reference |
| **[COPY_PASTE_BUILD_GUIDE.md](COPY_PASTE_BUILD_GUIDE.md)** | 2-4 hours | Complete Next.js implementation |

### 🏗️ Architecture & Design

| Document | Purpose |
|----------|---------|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design, data flows, security layers |
| **[BLUEPRINT_V1_README.md](BLUEPRINT_V1_README.md)** | Feature overview (all 30+ endpoints) |
| **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** | Complete file inventory (22 files) |

### 🚀 Deployment & Launch

| Document | Purpose |
|----------|---------|
| **[LAUNCH_GUIDE.md](LAUNCH_GUIDE.md)** | Complete go-live checklist & procedure |
| **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** | Pre-production verification |
| **[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)** | Comprehensive testing with curl examples |

### 🔐 Production & Security

| Document | Purpose |
|----------|---------|
| **[SECURITY_GUIDE.md](SECURITY_GUIDE.md)** | Production hardening & best practices |
| **[NEXTJS_VS_EXPRESS_COMPARISON.md](NEXTJS_VS_EXPRESS_COMPARISON.md)** | Choose the right stack |

### 🤝 Community & Contribution

| Document | Purpose |
|----------|---------|
| **[COMMUNITY_FORK_GUIDE.md](COMMUNITY_FORK_GUIDE.md)** | How to fork, customize, and deploy your version |
| **[ROADMAP.md](ROADMAP.md)** | Vision for v1, v2, v3 and beyond |
| **[PROJECT_QUICKLINKS.md](PROJECT_QUICKLINKS.md)** | Command reference & central navigation |

---

## 💡 Core Features

### ✅ Implemented (Blueprint v1)

| Feature | Express | Next.js | Details |
|---------|---------|---------|---------|
| **Livestream Management** | ✅ | ✅ | Create, update, delete streams; track viewer count |
| **IPFS Recording** | ✅ | ✅ | Auto-record to decentralized IPFS (Pinata) |
| **Journal Entries** | ✅ | ✅ | Markdown editor, mood tracking, public/private |
| **Stream Linking** | ✅ | ✅ | Link journals to specific streams |
| **Public Community Feed** | ✅ | ✅ | Discover streams and journals from others |
| **User Authentication** | ✅ | ✅ | JWT (Express) or NextAuth (Next.js) |
| **Data Export** | ✅ | ✅ | Download all your data as JSON (GDPR compliant) |
| **Twitch Integration** | ✅ | ✅ | OAuth, stream status, webhooks |
| **Livepeer Integration** | ✅ | ✅ | Decentralized streaming with transcoding |
| **W3C DIDs** | ✅ | 🔜 | Self-sovereign identity (Express only) |
| **Custom Databases** | ✅ | 🔜 | User-created databases with flexible schema (Express only) |

### 🔜 Coming Soon (Blueprint v2+)

- WebRTC P2P streaming (remove server intermediary)
- OrbitDB integration (fully decentralized database)
- IPFS pubsub for real-time sync
- Multi-DID support (multiple identities per user)
- Mobile app (React Native)
- Plugin architecture for extensibility
- DAO governance (community voting)

---

## 🛠️ Technical Stack

### Backend (Express)
- **Runtime:** Node.js 20.x (serverless on Vercel)
- **Framework:** Express.js 4.18
- **Database:** MongoDB 7.5 (Atlas)
- **Auth:** JWT tokens, bcryptjs password hashing
- **Storage:** IPFS via Pinata
- **Streaming:** Twitch API, Livepeer SDK
- **Middleware:** Helmet (security), express-rate-limit (rate limiting), CORS

### Backend (Next.js)
- **Runtime:** Node.js 20.x
- **Framework:** Next.js 14 (App Router)
- **Database:** MongoDB 7.5 (same as Express)
- **Auth:** NextAuth.js v5
- **Storage:** IPFS via Pinata
- **API Routes:** Server-side route handlers
- **Features:** SSR, ISR, Server Components

### Frontend (Vite)
- **Build Tool:** Vite (lightning-fast HMR)
- **Framework:** React 18
- **HTTP Client:** Axios
- **Styling:** Custom CSS (dark theme)
- **Video Player:** HLS.js (streaming playback)
- **Deployment:** GitHub Pages (static)

### DevOps
- **Backend Deployment:** Vercel (Express serverless)
- **Frontend Deployment:** GitHub Pages (Vite static)
- **Environment:** GitHub Actions CI/CD (coming soon)
- **Monitoring:** Vercel analytics

---

## 📋 Project Structure

```
pva-bazaar-app/
├── backend/                       # Express API
│   ├── api/index.js               # Main app
│   ├── models/                    # MongoDB schemas
│   ├── routes/                    # REST endpoints
│   ├── middleware/                # Auth, CORS, rate limiting
│   ├── service/                   # IPFS, streaming integrations
│   └── package.json
├── Frontend/                      # Vite + React
│   ├── src/
│   │   ├── lib/                   # API clients
│   │   ├── components/            # React components
│   │   └── config/                # Environment config
│   ├── public/
│   └── package.json
├── docs/                          # Documentation (this folder)
├── .github/
│   └── workflows/                 # CI/CD pipelines
├── README.md                      # THIS FILE
├── COPY_PASTE_BUILD_GUIDE.md      # Complete Next.js guide
├── LAUNCH_GUIDE.md                # Go-live checklist
├── SECURITY_GUIDE.md              # Production hardening
├── ROADMAP.md                     # Future vision
└── package.json                   # Root scripts
```

---

## 🔑 Environment Setup

### 1. MongoDB (Free Tier)

```bash
# Go to https://cloud.mongodb.com
# 1. Create account (free)
# 2. Create cluster (free tier: 512MB)
# 3. Get connection string (looks like):
# mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/pvabazaar

# Add to backend/.env and pvabazaar-livestream/.env.local
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/pvabazaar
```

### 2. Pinata IPFS (Free Tier)

```bash
# Go to https://pinata.cloud
# 1. Create account (free)
# 2. Create API key
# 3. Get three credentials:
# - API Key
# - API Secret
# - JWT Token

# Add to backend/.env and pvabazaar-livestream/.env.local
PINATA_API_KEY=your_key
PINATA_API_SECRET=your_secret
PINATA_API_JWT=your_jwt
```

### 3. Authentication Secrets

```bash
# Generate JWT secret (Express)
openssl rand -hex 32
# Copy output to backend/.env
JWT_SECRET=your_output_here

# Generate NextAuth secret (Next.js)
openssl rand -hex 32
# Copy output to pvabazaar-livestream/.env.local
NEXTAUTH_SECRET=your_output_here
```

### 4. Optional: Streaming Platforms

```bash
# Twitch (for stream status checking)
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret

# Livepeer (for decentralized streaming)
LIVEPEER_API_KEY=your_api_key
```

**Full template:** [.env.example.blueprint](.env.example.blueprint)

---

## 🧪 Testing

### Local Development

```bash
# Terminal 1: Backend
cd backend && npm run dev        # :5001

# Terminal 2: Frontend
cd Frontend && npm run dev       # :5173

# Test sign up
open http://localhost:5173
# Click "Sign Up" → Create account → Auto-redirects to dashboard
```

### API Testing

```bash
# Health check
curl http://localhost:5001/api/health

# Create account
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'

# Sign in
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
# Response includes JWT token

# Use token for authenticated requests
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X GET http://localhost:5001/api/streams \
  -H "Authorization: Bearer $TOKEN"
```

**[Full testing guide →](TESTING_CHECKLIST.md)**

---

## 🚀 Deployment

### Express Backend (Vercel)

```bash
# 1. Connect GitHub repo to Vercel
# 2. Set environment variables (MongoDB, JWT, Pinata, etc.)
# 3. Deploy
git push origin main
# Auto-deploys to https://pvabazaar-api.vercel.app
```

### Vite Frontend (GitHub Pages)

```bash
# 1. Create GitHub repo: pvabazaar-livestream
# 2. Deploy frontend
cd Frontend
npm run deploy
# Auto-publishes to https://YOUR_USERNAME.github.io/pvabazaar-livestream
```

### Or: Next.js (Single Deploy to Vercel)

```bash
# Everything in one place
cd pvabazaar-livestream
git push origin main
# Auto-deploys to https://pvabazaar-livestream.vercel.app
```

**[Full launch guide →](LAUNCH_GUIDE.md)**

---

## 🔐 Security

### Production Checklist

- [ ] All secrets in `.env` (never commit)
- [ ] CORS whitelist configured (no wildcards)
- [ ] Rate limiting enabled
- [ ] HTTPS enabled (Vercel/GitHub automatic)
- [ ] MongoDB IP whitelist configured
- [ ] JWT secret is 256+ bits
- [ ] Input validation on all routes
- [ ] Helmet.js enabled (security headers)
- [ ] Dependencies audited (`npm audit`)
- [ ] Private keys never stored (DID feature)

**[Full security guide →](SECURITY_GUIDE.md)**

---

## 🤝 Contributing

### Fork & Customize

1. Fork this repo
2. Follow [COMMUNITY_FORK_GUIDE.md](COMMUNITY_FORK_GUIDE.md)
3. Customize for your community/brand
4. Deploy your version

### Add Features

1. Create feature branch: `git checkout -b feature/your-feature`
2. Follow existing code patterns (see [BLUEPRINT_V1_README.md](BLUEPRINT_V1_README.md))
3. Test with [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
4. Submit PR with description

### Report Issues

Open GitHub Issues with:
- What happened
- What should have happened
- Steps to reproduce
- Environment (OS, Node version, etc.)

---

## 📖 Learning Path

**New to the project?** Follow this order:

1. ⭐ **[QUICKSTART.md](QUICKSTART.md)** (15 min) - Get it running locally
2. ⭐ **[BLUEPRINT_V1_README.md](BLUEPRINT_V1_README.md)** (15 min) - Understand features
3. 📚 **[ARCHITECTURE.md](ARCHITECTURE.md)** (20 min) - How it works
4. 🧪 **[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)** (20 min) - Verify everything
5. 🚀 **[LAUNCH_GUIDE.md](LAUNCH_GUIDE.md)** (30 min) - Deploy your instance
6. 🤝 **[COMMUNITY_FORK_GUIDE.md](COMMUNITY_FORK_GUIDE.md)** (15 min) - Customize for your use case

---

## 📊 Implementation Status

### Complete (22 Files)

✅ **Backend Models** (4 files)
- StreamSession.js
- JournalEntry.js
- DecentralizedIdentity.js
- CustomDatabase.js

✅ **Backend Routes** (4 files)
- streams.js
- journal.js
- did.js
- databases.js

✅ **Backend Services** (2 files)
- ipfs.js
- streaming.js

✅ **Frontend Components** (2 files)
- dashboard.html
- decentralizedApi.js

✅ **Authentication** (2 files)
- JWT middleware
- NextAuth configuration

✅ **Documentation** (8+ files)
- All guides, checklists, comparisons

### Current Deployment

- ✅ **Backend API:** Vercel
- ✅ **Frontend UI:** GitHub Pages
- ✅ **Database:** MongoDB Atlas
- ✅ **Storage:** Pinata IPFS
- ✅ **Version:** Blueprint v1

---

## 🎯 Next Steps

### To Launch Your Own Instance

1. **Setup:** `./setup-blueprint.ps1` (or `.sh` on Mac/Linux)
2. **Configure:** Add MongoDB/Pinata credentials to `.env`
3. **Test:** `npm run dev` in both backends
4. **Deploy:** Push to Vercel + GitHub Pages
5. **Share:** Invite your community!

### To Customize for Your Community

1. Follow [COMMUNITY_FORK_GUIDE.md](COMMUNITY_FORK_GUIDE.md)
2. Rebrand with your colors/name
3. Add custom features
4. Deploy your version

### To Contribute to Core

1. Read [ROADMAP.md](ROADMAP.md) for priorities
2. Check GitHub Issues for open tasks
3. Submit PR with your contribution

---

## 📞 Support

### Getting Help

- 📖 **Docs:** Start with [PROJECT_QUICKLINKS.md](PROJECT_QUICKLINKS.md)
- 🐛 **Bugs:** Open GitHub Issues
- 💡 **Ideas:** Start a Discussion
- 🤝 **Contributing:** See [COMMUNITY_FORK_GUIDE.md](COMMUNITY_FORK_GUIDE.md)

### External Resources

- **MongoDB:** https://cloud.mongodb.com (free tier: 512MB)
- **Pinata:** https://pinata.cloud (free tier: 1GB)
- **Vercel:** https://vercel.com (free tier: 100GB bandwidth)
- **Twitch API:** https://dev.twitch.tv
- **Livepeer:** https://livepeer.org

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) for details.

### Attribution

Built with:
- Express.js
- React + Vite
- MongoDB
- IPFS (Pinata)
- NextAuth.js
- Tailwind CSS

Inspired by philosophy of digital sovereignty and decentralized technology.

---

## 🚀 Vision

> "Open the doorway at the top of your brain. Relax. Experience vulnerability. Break the callus off our minds. One day, one year, one century at a time."

PVABazaar is built on the belief that technology should serve human consciousness and collective uplifting, not corporate control.

**Our goal:** Create infrastructure that empowers individuals to own their data, their identity, and their voice.

**Your role:** Fork this, customize it, run it, build it, share it. The more instances out there, the more decentralized the future becomes.

---

**Ready to reclaim your digital autonomy?** 

### 👉 [Start with QUICKSTART.md →](QUICKSTART.md)

---

**Last Updated:** January 23, 2026  
**Current Version:** Blueprint v1  
**Next Release:** Blueprint v2 (Q2 2026)

Made with 💜 for the collective consciousness.
