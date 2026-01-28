# Blueprint v1 Testing & Verification Checklist

Use this checklist to verify the Blueprint v1 implementation works correctly.

---

## ✅ Pre-Flight Checks

### Environment Setup
- [ ] Node.js 18+ installed (`node -v`)
- [ ] MongoDB Atlas account created (free tier)
- [ ] Pinata account created (free tier)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Frontend dependencies installed (`cd Frontend && npm install`)

### Configuration
- [ ] `backend/.env` created with:
  - [ ] `MONGODB_URI` (MongoDB connection string)
  - [ ] `JWT_SECRET` (64+ character random string)
  - [ ] `PINATA_API_KEY` (from Pinata dashboard)
  - [ ] `PINATA_API_SECRET` (from Pinata dashboard)
- [ ] `Frontend/.env.development` created with:
  - [ ] `VITE_API_URL=http://localhost:5001/api`

---

## 🚀 Startup Tests

### Backend Server
```bash
cd backend
npm run dev
```
- [ ] Server starts without errors
- [ ] Console shows: "✅ MongoDB connected"
- [ ] Console shows: "🚀 Server running on http://localhost:5001"
- [ ] Visit `http://localhost:5001/api/ping` → Returns `{"ok":true}`
- [ ] Visit `http://localhost:5001/api/health` → Returns MongoDB status

### Frontend Server
```bash
cd Frontend
npm run dev
```
- [ ] Server starts on port 5173
- [ ] Visit `http://localhost:5173` → Site loads
- [ ] Visit `http://localhost:5173/dashboard.html` → Dashboard loads

---

## 🧪 API Testing (Use Postman/curl)

### 1. Authentication Setup

**Register User:**
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpass123"
  }'
```
- [ ] Returns `{"ok": true, "token": "..."}` with JWT token

**Save token for next tests:**
```bash
export TOKEN="your-jwt-token-here"
```

---

### 2. Stream Endpoints

**Create Stream:**
```bash
curl -X POST http://localhost:5001/api/streams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Stream",
    "description": "Testing autonomous recording",
    "platform": "livepeer",
    "isPublic": true
  }'
```
- [ ] Returns stream object with `_id`
- [ ] Status is `"scheduled"`

**Get Streams:**
```bash
curl -X GET http://localhost:5001/api/streams \
  -H "Authorization: Bearer $TOKEN"
```
- [ ] Returns array with created stream

**Update Stream (simulate recording):**
```bash
curl -X PUT http://localhost:5001/api/streams/STREAM_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ended",
    "ipfsHash": "QmTestHash123",
    "recordingDuration": 3600
  }'
```
- [ ] Stream status updated to `"ended"`
- [ ] IPFS hash stored

---

### 3. Journal Endpoints

**Create Journal Entry:**
```bash
curl -X POST http://localhost:5001/api/journal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First Reflection",
    "content": "# My Thoughts\n\nThis is a test entry.",
    "contentType": "markdown",
    "tags": ["reflection", "test"],
    "mood": "contemplative",
    "isPublic": false
  }'
```
- [ ] Returns entry object with `_id`
- [ ] Entry is private by default

**Get Journal Entries:**
```bash
curl -X GET http://localhost:5001/api/journal \
  -H "Authorization: Bearer $TOKEN"
```
- [ ] Returns array with created entry

**Update Entry:**
```bash
curl -X PUT http://localhost:5001/api/journal/ENTRY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isPublic": true
  }'
```
- [ ] Entry made public
- [ ] `publishedAt` timestamp added

---

### 4. DID Endpoints

**Create DID:**
```bash
curl -X POST http://localhost:5001/api/did \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "didMethod": "key"
  }'
```
- [ ] Returns DID object with `did:key:z6Mk...`
- [ ] Returns `privateKey` (shown ONCE - save it!)
- [ ] Shows warning message

**Get Your DID:**
```bash
curl -X GET http://localhost:5001/api/did \
  -H "Authorization: Bearer $TOKEN"
```
- [ ] Returns DID without private key

**Resolve Public DID:**
```bash
curl -X GET http://localhost:5001/api/did/did:key:z6Mk... 
```
- [ ] Returns DID document (public info)
- [ ] Works without authentication

---

### 5. Custom Database Endpoints

**Create Database:**
```bash
curl -X POST http://localhost:5001/api/databases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Video Archive",
    "description": "Personal collection",
    "type": "media",
    "isPublic": false
  }'
```
- [ ] Returns database object with `_id`

**Add Entry to Database:**
```bash
curl -X POST http://localhost:5001/api/databases/DATABASE_ID/entries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Epic Stream Recording",
    "description": "3-hour session",
    "ipfsHash": "QmTestHash456",
    "fileType": "video/mp4",
    "fileSize": 1500000000,
    "tags": ["gaming", "philosophy"]
  }'
```
- [ ] Entry added to database
- [ ] `totalEntries` incremented
- [ ] `totalSize` updated

---

## 🖥️ Frontend Testing

### Dashboard Navigation
- [ ] Visit `http://localhost:5173/dashboard.html`
- [ ] All cards visible (Livestreaming, Journal, DID, Databases, etc.)
- [ ] Hover effects work
- [ ] Links are properly styled

### API Integration (Browser Console)
```javascript
// Test in browser console (after importing API client)
import { createStream } from './src/lib/decentralizedApi.js';

// Create stream
const result = await createStream({
  title: 'Test from Frontend',
  platform: 'livepeer'
});
console.log(result);
```
- [ ] API calls work from browser
- [ ] CORS headers properly set
- [ ] JWT token sent in headers

---

## 🌐 IPFS Testing (Optional - requires Pinata keys)

### Upload Test File
```bash
# In backend directory
node -e "
const ipfs = require('./service/ipfs');
const buffer = Buffer.from('Hello IPFS!', 'utf-8');
ipfs.uploadToPinata(buffer, 'test.txt', { type: 'test' })
  .then(result => console.log('IPFS Hash:', result.hash))
  .catch(err => console.error(err));
"
```
- [ ] Returns IPFS hash (e.g., `Qm...`)
- [ ] File accessible via gateway URL

---

## 🔐 Security Testing

### Authentication
- [ ] Protected routes return 401 without token
- [ ] Invalid tokens rejected
- [ ] Users can only access own data

### Rate Limiting
```bash
# Spam requests (should get rate limited)
for i in {1..150}; do
  curl http://localhost:5001/api/ping
done
```
- [ ] After 100 requests, returns 429 (Too Many Requests)

### CORS
```bash
# Request from unauthorized origin
curl -X GET http://localhost:5001/api/streams \
  -H "Origin: https://evil.com" \
  -H "Authorization: Bearer $TOKEN"
```
- [ ] CORS headers NOT set for unauthorized origin

---

## 📚 Documentation Review

- [ ] Read `BLUEPRINT_V1_README.md` - comprehensive docs
- [ ] Read `QUICKSTART.md` - setup instructions
- [ ] Read `ARCHITECTURE.md` - system design
- [ ] Read `IMPLEMENTATION_COMPLETE.md` - feature summary
- [ ] Check `.env.example.blueprint` - all variables documented

---

## 🚢 Deployment Preparation

### Backend (Vercel)
- [ ] `vercel.json` configured
- [ ] Environment variables ready to set in Vercel dashboard
- [ ] Test build: `npm run build` (should succeed)

### Frontend (GitHub Pages)
- [ ] Update `Frontend/.env.production` with production API URL
- [ ] Test production build: `npm run build`
- [ ] Check `dist/` folder created

---

## 🐛 Common Issues & Solutions

### MongoDB Connection Fails
- Check connection string format
- Whitelist IP in MongoDB Atlas (0.0.0.0/0 for development)
- Verify username/password are URL-encoded

### IPFS Upload Fails
- Check Pinata API keys are correct
- Verify free tier limits (1GB)
- Try smaller test file first

### CORS Errors
- Check `VITE_API_URL` matches backend URL
- Verify backend CORS whitelist includes frontend origin
- Clear browser cache

### JWT Errors
- Regenerate JWT secret (64+ characters)
- Check token hasn't expired
- Verify token format: `Bearer <token>`

---

## ✅ Final Checklist

All tests passing? Check these final items:

- [ ] Backend API fully functional
- [ ] Frontend loads without errors
- [ ] All CRUD operations work
- [ ] IPFS integration tested (if configured)
- [ ] Documentation reviewed
- [ ] Ready to deploy or invite testers

---

## 🎉 Success!

If all tests pass, **Blueprint v1 is fully operational!** 

Next steps:
1. Deploy to production (Vercel + GitHub Pages)
2. Configure production environment variables
3. Invite beta testers
4. Open source on GitHub
5. Build community

**Congratulations on reclaiming digital sovereignty!** 🌊

---

_Last Updated: January 23, 2026_  
_Blueprint v1 Testing Checklist_
