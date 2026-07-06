# Reference only

Start at [CANONICAL_MAP.md](CANONICAL_MAP.md) for the single source of truth.
This file is historical reference material and should not override the canonical map.

# PVA Bazaar Blueprint v1: Decentralized Livestreaming & Data Sovereignty Platform

## 🌊 Vision

**Reclaim your digital sovereignty.** This platform enables users to livestream, journal, and organize data autonomously—breaking free from centralized control. Every recording, thought, and identity becomes part of your personal akashic record, evolving with you across time.

### Philosophy

> "Open the doorway at the top of your brain"—a space for vulnerability, reflection, and connection with Truth (Asha). By streaming and journaling autonomously, you break the callus of centralized control. Whether you seek uplifting enlightenment or confront shadows, this is your sanctuary.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Features](#features)
3. [Installation](#installation)
4. [API Documentation](#api-documentation)
5. [Frontend Usage](#frontend-usage)
6. [Deployment](#deployment)
7. [Contributing](#contributing)
8. [Roadmap](#roadmap)

---

## 🏗️ Architecture Overview

### Tech Stack

**Backend:**

- Express.js API (Node.js)
- MongoDB for user data, journals, streams
- IPFS (Pinata) for decentralized storage
- Deployed on Vercel (serverless)

**Frontend:**

- Vite + React
- Axios for API calls
- GitHub Pages deployment

**Decentralization:**

- IPFS: Permanent, censorship-resistant storage
- DIDs: Self-sovereign identity (W3C standard)
- Livepeer: Decentralized livestreaming network

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User (You)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
    │  OBS    │   │  Browser  │  │  Mobile │
    │ Studio  │   │ Dashboard │  │   App   │
    └────┬────┘   └─────┬─────┘  └────┬────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
         ┌──────────────▼──────────────┐
         │   PVA Bazaar API (Vercel)   │
         │   • Auth (JWT)              │
         │   • CRUD routes             │
         │   • Webhook handlers        │
         └──────────────┬──────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
    │ MongoDB │   │   IPFS    │  │ Livepeer│
    │(Atlas)  │   │ (Pinata)  │  │ Network │
    └─────────┘   └───────────┘  └─────────┘
       Metadata    Recordings     Streaming
```

---

## ✨ Features

### v1 (Current - Blueprint)

✅ **Livestreaming Management**

- Connect OBS to Twitch, Kick, YouTube, or Livepeer
- Webhook integration for auto-recording
- Stream status tracking

✅ **Journal System**

- Markdown-based personal reflections
- Link journal entries to stream sessions
- Public/private visibility control

✅ **Decentralized Identity (DID)**

- W3C-compliant DID creation
- Ed25519 key pair generation
- Self-custody of identity

✅ **IPFS Storage**

- Auto-backup recordings to IPFS
- Permanent, censorship-resistant storage
- Gateway URLs for playback

✅ **Custom Databases**

- Build personal "PirateBay-like" databases
- Organize files, links, media
- Full data custody

✅ **Privacy-First**

- No tracking or analytics
- Voluntary data setup
- User-controlled encryption

### v2 (Planned)

🔜 **WebRTC P2P Streaming**

- Direct peer-to-peer connections
- No centralized server dependency

🔜 **Blockchain Integration**

- On-chain identity attestation
- Smart contracts for data sovereignty

🔜 **Enhanced DID**

- Multi-sig authentication
- Verifiable credentials

### v3 (Future)

🔮 **AI Journal Insights**

- "Uplifting senses" filter
- Consciousness-aware analytics

🔮 **Decentralized Marketplace**

- Trade stream recordings
- Community-driven content

---

## 🚀 Installation

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier)
- Pinata account (IPFS storage)
- Optional: Twitch/Kick/Livepeer API keys

### Backend Setup

1. **Clone repository:**

   ```bash
   git clone https://github.com/yourusername/pva-bazaar-app.git
   cd pva-bazaar-app
   ```

2. **Install dependencies:**

   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables:**
   Create `.env` file in `backend/`:

   ```env
   # Database
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pvabazaar

   # Auth
   JWT_SECRET=your-secure-random-string-here

   # IPFS (Pinata)
   PINATA_API_KEY=your-pinata-api-key
   PINATA_API_SECRET=your-pinata-secret-key
   PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs

   # Streaming platforms (optional)
   TWITCH_CLIENT_ID=your-twitch-client-id
   TWITCH_CLIENT_SECRET=your-twitch-secret
   LIVEPEER_API_KEY=your-livepeer-key

   # Server
   NODE_ENV=development
   PORT=5001
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Install dependencies:**

   ```bash
   cd Frontend
   npm install
   ```

2. **Configure environment:**
   Create `.env.development` in `Frontend/`:

   ```env
   VITE_API_URL=http://localhost:5001/api
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

4. **Access dashboard:**
   Open `http://localhost:5173/dashboard.html`

---

## 📡 API Documentation

### Authentication

All protected routes require JWT token in `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Streams

**Create Stream**

```http
POST /api/streams
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "My First Stream",
  "description": "Testing autonomous recording",
  "platform": "twitch",
  "platformStreamUrl": "https://twitch.tv/myusername",
  "isPublic": true
}
```

**Get User Streams**

```http
GET /api/streams?status=live&limit=50
Authorization: Bearer <token>
```

**Update Stream** (e.g., add IPFS recording)

```http
PUT /api/streams/:id
Authorization: Bearer <token>

{
  "status": "ended",
  "ipfsHash": "QmYourIPFSHash",
  "recordingDuration": 3600
}
```

#### Journal

**Create Entry**

```http
POST /api/journal
Authorization: Bearer <token>

{
  "title": "Reflections on Today's Stream",
  "content": "# Insights\n\nToday I explored...",
  "contentType": "markdown",
  "tags": ["reflection", "spirituality"],
  "mood": "contemplative",
  "isPublic": false
}
```

**Get Entries**

```http
GET /api/journal?tags=spirituality&limit=20
Authorization: Bearer <token>
```

#### Decentralized Identity

**Create DID**

```http
POST /api/did
Authorization: Bearer <token>

{
  "didMethod": "key"
}

Response:
{
  "ok": true,
  "item": { "did": "did:key:z6Mk...", ... },
  "privateKey": "-----BEGIN PRIVATE KEY-----...",
  "warning": "Save your private key securely..."
}
```

**Resolve DID** (public)

```http
GET /api/did/did:key:z6Mk...
```

#### Custom Databases

**Create Database**

```http
POST /api/databases
Authorization: Bearer <token>

{
  "name": "My Video Archive",
  "description": "Personal collection of streams",
  "type": "media",
  "isPublic": false
}
```

**Add Entry to Database**

```http
POST /api/databases/:id/entries
Authorization: Bearer <token>

{
  "title": "Epic Stream Recording",
  "description": "3-hour marathon session",
  "ipfsHash": "QmYourHash",
  "fileType": "video/mp4",
  "fileSize": 1500000000,
  "tags": ["gaming", "philosophy"]
}
```

---

## 🖥️ Frontend Usage

### Dashboard Navigation

1. **Dashboard Home** (`/dashboard.html`)
   - Central hub with all features
   - Quick links to streams, journal, DID

2. **Livestreaming** (`/stream.html`)
   - Create new stream session
   - Get RTMP/stream key
   - Monitor live status
   - View recordings

3. **Journal** (`/journal.html`)
   - Create/edit entries
   - Link to stream sessions
   - Markdown editor
   - Public/private toggle

4. **DID Manager** (`/did.html`)
   - Generate DID
   - View DID document
   - Export/backup keys

5. **Custom Databases** (`/databases.html`)
   - Create custom databases
   - Add/organize entries
   - IPFS backup management

### Using the API in Frontend

```javascript
import { createStream, fetchStreams } from './lib/decentralizedApi';

// Create stream
const result = await createStream({
  title: 'My Stream',
  platform: 'livepeer',
  isPublic: true,
});

if (result.ok) {
  console.log('Stream created:', result.item);
}

// Fetch streams
const streams = await fetchStreams({ status: 'live' });
```

---

## 🚢 Deployment

### Backend (Vercel)

1. **Install Vercel CLI:**

   ```bash
   npm i -g vercel
   ```

2. **Deploy:**

   ```bash
   cd backend
   vercel --prod
   ```

3. **Configure environment variables** in Vercel dashboard:
   - Add all env vars from `.env`
   - Ensure `MONGODB_URI`, `JWT_SECRET`, `PINATA_API_KEY` are set

4. **Verify deployment:**
   ```bash
   curl https://your-api.vercel.app/api/ping
   ```

### Frontend (GitHub Pages)

1. **Build production:**

   ```bash
   cd Frontend
   npm run build
   ```

2. **Update `.env.production`:**

   ```env
   VITE_API_URL=https://your-api.vercel.app/api
   ```

3. **Deploy to GitHub Pages:**

   ```bash
   npm run deploy
   ```

4. **Configure custom domain** (optional):
   - Add `CNAME` file with `pvabazaar.org`
   - Configure DNS: `A` record to GitHub Pages IP

---

## 🤝 Contributing

This is Blueprint v1—a **foundational skeleton for community iteration**. Contributions welcome!

### How to Contribute

1. **Fork the repository**
2. **Create feature branch:** `git checkout -b feature/amazing-feature`
3. **Commit changes:** `git commit -m 'Add amazing feature'`
4. **Push to branch:** `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Priority Areas

- [ ] WebRTC implementation for P2P streaming
- [ ] Enhanced DID features (multi-sig, credentials)
- [ ] UI/UX improvements
- [ ] Mobile app (React Native)
- [ ] Documentation translations

---

## 🗺️ Roadmap

### Phase 1: Blueprint v1 (Current)

✅ Core API infrastructure
✅ IPFS storage integration
✅ Basic DID support
✅ Dashboard UI

### Phase 2: Decentralization (Q2 2026)

- [ ] Full WebRTC P2P streaming
- [ ] OrbitDB for decentralized databases
- [ ] IPFS pubsub for real-time updates
- [ ] Enhanced privacy tools

### Phase 3: Community & Intelligence (Q3 2026)

- [ ] AI journal insights
- [ ] Community marketplace
- [ ] Verifiable credentials
- [ ] Multi-chain identity support

### Phase 4: Ecosystem (Q4 2026+)

- [ ] Plugin system for extensibility
- [ ] Developer SDK
- [ ] Mobile apps
- [ ] Federation with other platforms

---

## 📄 License

MIT License - Free to fork, modify, and distribute. See `LICENSE` file.

---

## 🙏 Acknowledgments

Built with love for digital sovereignty. Special thanks to:

- The IPFS/Filecoin community
- W3C DID Working Group
- Livepeer decentralized streaming network
- All truth seekers breaking the callus

---

## 📞 Support

- **GitHub Issues:** [Report bugs](https://github.com/yourusername/pva-bazaar-app/issues)
- **Discussions:** [Community forum](https://github.com/yourusername/pva-bazaar-app/discussions)
- **Website:** [pvabazaar.org](https://pvabazaar.org)

---

**"One day, one year, one century at a time—we evolve the mirror of consciousness."**

🌊 PVA Bazaar Team
