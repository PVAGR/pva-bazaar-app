# Quick Start Guide: Decentralized Platform

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../Frontend
npm install
```

### Step 2: Configure Environment

**Backend (`backend/.env`):**
```env
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-random-secret-here
PINATA_API_KEY=your-pinata-key
PINATA_API_SECRET=your-pinata-secret
```

**Frontend (`Frontend/.env.development`):**
```env
VITE_API_URL=http://localhost:5001/api
```

### Step 3: Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd Frontend
npm run dev
```

### Step 4: Access Dashboard

Open browser: `http://localhost:5173/dashboard.html`

---

## 📋 First-Time Setup Checklist

### MongoDB Setup
1. Create account at [MongoDB Atlas](https://mongodb.com/cloud/atlas)
2. Create free cluster
3. Add database user
4. Whitelist IP: `0.0.0.0/0` (allow all for dev)
5. Get connection string
6. Add to `.env` as `MONGODB_URI`

### IPFS Setup (Pinata)
1. Create account at [Pinata.cloud](https://pinata.cloud)
2. Generate API keys (Settings → API Keys)
3. Add to `.env`:
   - `PINATA_API_KEY`
   - `PINATA_API_SECRET`

### Optional: Streaming Platforms

**Twitch:**
1. Register app at [Twitch Dev Console](https://dev.twitch.tv/console)
2. Get Client ID & Secret
3. Add to `.env`:
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`

**Livepeer:**
1. Sign up at [Livepeer Studio](https://livepeer.studio)
2. Get API key
3. Add to `.env`: `LIVEPEER_API_KEY`

---

## 🎥 Livestreaming Setup

### Using OBS Studio

1. **Install OBS:** [obsproject.com](https://obsproject.com)

2. **Get Stream Key:**
   - Go to `http://localhost:5173/stream.html`
   - Click "Create Stream"
   - Select platform (Livepeer recommended for decentralization)
   - Copy RTMP URL and Stream Key

3. **Configure OBS:**
   - Settings → Stream
   - Service: Custom
   - Server: `rtmp://rtmp.livepeer.com/live`
   - Stream Key: `<your-key-from-dashboard>`

4. **Start Streaming:**
   - Click "Start Streaming" in OBS
   - Stream auto-records to IPFS via webhook

---

## 📝 Journal Workflow

1. **Create Entry:**
   - Navigate to `/journal.html`
   - Click "New Entry"
   - Write in Markdown
   - Add tags (e.g., `spirituality`, `reflection`)
   - Toggle public/private

2. **Link to Stream:**
   - When creating entry, select associated stream
   - Entry auto-timestamps with stream session

3. **Export to IPFS:**
   - Click "Backup to IPFS" button
   - Entry permanently stored
   - Get IPFS hash for sharing

---

## 🆔 DID Creation

1. **Generate DID:**
   - Go to `/did.html`
   - Click "Create DID"
   - Choose method: `key` (recommended)
   - **IMPORTANT:** Save private key securely (shown once)

2. **Use DID:**
   - Your DID: `did:key:z6Mk...`
   - Share DID for verification
   - Use private key to sign messages

3. **Verify Others:**
   - Enter someone's DID
   - System resolves DID document
   - Verify signatures/credentials

---

## 🗂️ Custom Database Example

**Create Personal Video Archive:**

1. **Create Database:**
   ```javascript
   POST /api/databases
   {
     "name": "My Stream Archive",
     "description": "All my recordings 2026",
     "type": "media"
   }
   ```

2. **Add Recordings:**
   ```javascript
   POST /api/databases/:id/entries
   {
     "title": "Epic 5-Hour Stream",
     "ipfsHash": "QmYourHash",
     "fileType": "video/mp4",
     "fileSize": 2000000000,
     "tags": ["gaming", "philosophy"]
   }
   ```

3. **Share Database:**
   - Toggle `isPublic: true`
   - Others can browse (read-only)
   - Fork to their own database

---

## 🛠️ Troubleshooting

### Backend won't connect to MongoDB
- Check connection string format
- Verify IP whitelist includes your IP
- Test connection: `mongosh "your-connection-string"`

### IPFS upload fails
- Verify Pinata API keys
- Check file size (free tier: 1GB limit)
- Try smaller test file first

### Stream won't start in OBS
- Verify RTMP URL format
- Check stream key is correct
- Test with VLC: `vlc rtmp://...`

### Frontend can't reach API
- Check `VITE_API_URL` in `.env.development`
- Verify backend is running on port 5001
- Check CORS headers in browser console

---

## 📚 Next Steps

1. **Read Full Docs:** `BLUEPRINT_V1_README.md`
2. **API Reference:** See "API Documentation" section
3. **Join Community:** GitHub Discussions
4. **Customize:** Fork and modify to your needs

---

## 🆘 Need Help?

- **Issues:** [GitHub Issues](https://github.com/yourusername/pva-bazaar-app/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/pva-bazaar-app/discussions)
- **Email:** support@pvabazaar.org

---

**Happy streaming! 🌊**
