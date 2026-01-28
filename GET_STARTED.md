# 🚀 Getting Started with Blueprint v1

**TL;DR:** Decentralized livestreaming platform. Stream → Auto-record to IPFS → Journal reflections → Own your data.

---

## 1️⃣ Install (2 minutes)

### Windows:
```powershell
.\setup-blueprint.ps1
```

### Mac/Linux:
```bash
chmod +x setup-blueprint.sh
./setup-blueprint.sh
```

---

## 2️⃣ Configure (3 minutes)

### Get Free Credentials:

**MongoDB (Database):**
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string
4. Add to `backend/.env` as `MONGODB_URI`

**Pinata (IPFS Storage):**
1. Go to [pinata.cloud](https://pinata.cloud)
2. Generate API keys
3. Add to `backend/.env`:
   - `PINATA_API_KEY`
   - `PINATA_API_SECRET`

**JWT Secret:**
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Add to `backend/.env` as `JWT_SECRET`

---

## 3️⃣ Run (30 seconds)

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```
✅ Should see: "🚀 Server running on http://localhost:5001"

### Terminal 2 - Frontend:
```bash
cd Frontend
npm run dev
```
✅ Should see: "Local: http://localhost:5173"

---

## 4️⃣ Test (2 minutes)

1. **Open Dashboard:**
   ```
   http://localhost:5173/dashboard.html
   ```

2. **Register Account:**
   - Use Postman/curl or build login UI
   ```bash
   curl -X POST http://localhost:5001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Your Name","email":"you@email.com","password":"pass123"}'
   ```
   - Save the JWT token

3. **Create Stream:**
   ```bash
   curl -X POST http://localhost:5001/api/streams \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"My First Stream","platform":"livepeer"}'
   ```

4. **Create Journal Entry:**
   ```bash
   curl -X POST http://localhost:5001/api/journal \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"Day 1","content":"# Reflections\n\nStarting my journey..."}'
   ```

---

## 📚 What's Next?

### Learn the System:
- **Full Docs:** [BLUEPRINT_V1_README.md](./BLUEPRINT_V1_README.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Testing:** [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)

### Build Features:
1. Create UI for streams/journal (React components)
2. Add OBS integration guide
3. Build DID management page
4. Add public feed for community

### Deploy:
1. **Backend:** Vercel (see [BLUEPRINT_V1_README.md](./BLUEPRINT_V1_README.md#deployment))
2. **Frontend:** GitHub Pages
3. **Domain:** Point pvabazaar.org to your deployments

---

## 🆘 Troubleshooting

**Backend won't start:**
- Check MongoDB connection string
- Verify Node.js 18+ installed
- Check `.env` file exists

**IPFS uploads fail:**
- Verify Pinata API keys
- Check free tier limits (1GB)

**CORS errors:**
- Verify `VITE_API_URL` in Frontend/.env.development
- Check backend CORS whitelist

**Need help?** 
- Read [QUICKSTART.md](./QUICKSTART.md)
- Check [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
- Open GitHub Issue

---

## 🎯 Core Concepts

**Privacy-First:**
- No tracking, no analytics
- You control all data
- Optional public sharing

**Decentralized:**
- IPFS for permanent storage
- DIDs for self-sovereign identity
- No platform lock-in

**Open Source:**
- MIT license
- Fork and customize
- Community-driven evolution

---

## 🌊 Philosophy

This platform lets you:
- **Stream autonomously** (break free from platform control)
- **Journal reflections** (vulnerable self-expression)
- **Own your data** (digital sovereignty)
- **Build akashic records** (permanent consciousness archive)

"One day, one year, one century at a time—we evolve."

---

**Ready to reclaim your digital soul?** Start coding! 🚀

---

_Blueprint v1 - January 23, 2026_  
_Built for truth seekers and freedom builders_
