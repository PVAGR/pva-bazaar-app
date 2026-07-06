# 🛠️ TROUBLESHOOTING GUIDE

**Status:** Common issues and solutions  
**Last Updated:** January 23, 2026  
**For:** PVABazaar Blueprint v1

---

## 🎯 Quick Diagnostics

### Is it a...?

**🔵 Backend issue?**

```bash
curl https://your-backend.com/api/health
# If error → See "Backend Won't Start"
```

**🔵 Frontend issue?**

```bash
# Check browser console (F12)
# Look for Network tab errors
# See "Frontend Shows Blank Page"
```

**🔵 Database issue?**

```bash
# Try connecting directly
mongosh "MONGODB_URI"
# If fails → See "MongoDB Connection Fails"
```

**🔵 IPFS issue?**

```bash
# Test Pinata auth
curl -X GET https://api.pinata.cloud/data/testAuthentication \
  -H "pinata_api_key: YOUR_KEY"
# If error → See "IPFS Upload Fails"
```

---

## 🚀 Backend Issues

### Backend Won't Start

#### Symptoms

- Port 5001 already in use
- `Error: EADDRINUSE: address already in use :::5001`
- Server crashes immediately
- `Cannot find module` errors

#### Solutions

**Port Already in Use:**

```bash
# macOS/Linux - Find process using port
lsof -i :5001
# Kill process
kill -9 <PID>

# Windows - Find process
netstat -ano | findstr :5001
# Kill process
taskkill /PID <PID> /F

# Or use different port
PORT=5002 npm run dev
```

**Missing Dependencies:**

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Or update all dependencies
npm update
```

**Node Version Mismatch:**

```bash
# Check required version
node --version
# Should be v20.x or higher

# If wrong version:
# Use nvm (recommended)
nvm install 20
nvm use 20
```

**Environment Variables Missing:**

```bash
# Check .env file exists
ls -la backend/.env

# If missing, create from template
cp backend/.env.example backend/.env

# Edit .env with real credentials
vim backend/.env
```

### Backend API Returns 500 Errors

#### Symptoms

- `curl https://localhost:5001/api/streams` → `500 Internal Server Error`
- Random endpoints fail
- Works locally but fails in production

#### Solutions

**Check Server Logs:**

```bash
# In development
npm run dev  # See full stack trace

# In production (Vercel)
# Go to https://vercel.com/dashboard
# View logs in project → Deployments → Logs
```

**Common 500 Errors:**

| Error                                    | Cause                  | Fix                                      |
| ---------------------------------------- | ---------------------- | ---------------------------------------- |
| `MongoNetworkError`                      | MongoDB unreachable    | Check MONGODB_URI, whitelist IP in Atlas |
| `JsonWebTokenError`                      | Invalid JWT secret     | Verify JWT_SECRET in .env                |
| `Cannot read property 'id' of undefined` | User not authenticated | Check auth middleware                    |
| `PINATA_API_KEY is undefined`            | Missing env var        | Add to .env and restart                  |

**Debugging Strategy:**

```javascript
// Add detailed logging (temporarily)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Body:', req.body);
  console.log('User:', req.user);
  next();
});

// Try again and check logs
npm run dev
```

### Backend Can't Connect to MongoDB

#### Symptoms

- `MongoNetworkError: connect ECONNREFUSED`
- `MongoAuthenticationError: authentication failed`
- Connection timeout after 10s

#### Solutions

**Check MongoDB URI Format:**

```bash
# Format should be:
# mongodb+srv://username:password@cluster.mongodb.net/database

# Common mistakes:
# ❌ Missing +srv
# ❌ Password not URL-encoded (use @urlencoded)
# ❌ Database name wrong
# ❌ Wrong username/password

# Test connection
mongosh "mongodb+srv://username:password@cluster.mongodb.net/test"
```

**If Using MongoDB Atlas:**

```bash
# 1. Whitelist your IP
#    Go to MongoDB Atlas → Network Access
#    Add current IP or 0.0.0.0/0 (not recommended)

# 2. Create database user
#    Go to Database Access
#    Create user with password (save it!)

# 3. Update .env
MONGODB_URI="mongodb+srv://USER:PASS@CLUSTER.mongodb.net/DATABASE"

# 4. Restart
npm run dev
```

**If Using Local MongoDB:**

```bash
# macOS - Install & start
brew install mongodb-community
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
# MongoDB should auto-start as service
# Or: "C:\Program Files\MongoDB\Server\7.5\bin\mongod.exe"

# Then use local URI
MONGODB_URI="mongodb://localhost:27017/pvabazaar"
```

**Test Connection:**

```bash
# Install mongosh if needed
npm install -g mongosh

# Try connecting
mongosh "YOUR_MONGODB_URI"

# If successful, you'll see prompt:
# >
```

### Backend Endpoints Return 401 Unauthorized

#### Symptoms

- `{"message": "No token provided"}`
- `{"message": "Invalid token"}`
- Logs show `AuthError: jwt malformed`

#### Solutions

**Sending Token:**

```bash
# ❌ Wrong - No token
curl https://localhost:5001/api/streams

# ✅ Correct - Include Bearer token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://localhost:5001/api/streams
```

**Getting Token:**

```bash
# 1. Sign up first
curl -X POST https://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepass123"}'
# Returns: { "token": "eyJhbGc..." }

# 2. Use that token in subsequent requests
TOKEN="eyJhbGc..."
curl -H "Authorization: Bearer $TOKEN" \
  https://localhost:5001/api/streams
```

**JWT Secret Mismatch:**

```bash
# Issue: Different JWT_SECRET in different environments
# Solution: Use same secret everywhere

# Generate strong secret
openssl rand -hex 32
# Copy to all .env files (dev, staging, production)

# Restart server
npm run dev
```

### Backend Rate Limiting Errors

#### Symptoms

- `{"message": "Too many requests from this IP"}`
- After 100 requests in 15 minutes
- Happens even with valid auth

#### Solutions

**Expected Behavior:**

```
- General endpoints: 100 requests / 15 minutes
- Auth endpoints: 5 attempts / 15 minutes
- This is intentional (security)
```

**Workarounds:**

```bash
# Wait 15 minutes and try again
sleep 900
npm run dev

# Or use different IP (VPN)
# Or adjust limits in backend/middleware/rateLimit.js
```

**Disable Rate Limiting (Development Only):**

```javascript
// backend/middleware/rateLimit.js
// ❌ NOT for production
const limiter = (req, res, next) => next(); // Skip

// ✅ Keep it for security
```

---

## 🎨 Frontend Issues

### Frontend Shows Blank Page

#### Symptoms

- Browser shows nothing
- No errors in console
- Network tab shows successful requests

#### Solutions

**Clear Cache:**

```bash
# Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
# Or:
# Settings → Clear browsing data → All time

# In code:
// Clear local storage
localStorage.clear()
sessionStorage.clear()
```

**Check API URL:**

```bash
# In browser console (F12)
console.log(import.meta.env.VITE_API_URL)
# Should show your backend URL

# If undefined, check .env
cat Frontend/.env
# Should have: VITE_API_URL=https://...

# Restart dev server
npm run dev
```

**Check Network Errors:**

```bash
# Open browser DevTools (F12)
# Go to Network tab
# Refresh page
# Look for red errors

# Common issues:
# ❌ 404 - Backend not running
# ❌ CORS errors - Check backend CORS settings
# ❌ 401 - Not authenticated

# Solution:
# npm run dev  (restart dev server)
```

**React Component Errors:**

```bash
# In browser console, look for:
# - React warnings (yellow)
# - React errors (red)
# - Stack traces

# If you see "Cannot read property..."
# Usually means data not loaded yet

# Add error boundary:
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <div>Error loading page</div>;
    return this.props.children;
  }
}
```

### Frontend API Calls Fail

#### Symptoms

- Console shows 404, 500, or CORS errors
- Network tab shows failed requests to backend
- Frontend and backend both running

#### Solutions

**CORS Errors (Most Common):**

```
Error: Access to XMLHttpRequest at 'https://backend.com'
from origin 'https://frontend.com' has been blocked by CORS policy
```

**Fix CORS:**

```javascript
// backend/middleware/cors.js
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://your-frontend.com'],
  credentials: true,
};

app.use(cors(corsOptions));
```

**Wrong API URL:**

```bash
# Check .env
cat Frontend/.env

# Should be:
VITE_API_URL=https://your-backend.com
# NOT: http://localhost:5001 (won't work in production)

# Update and restart
npm run dev
```

**Backend Not Running:**

```bash
# Try hitting backend directly
curl https://your-backend.com/api/health

# If error:
# 1. Backend not deployed
# 2. URL wrong
# 3. Backend crashed

# Solutions:
npm run dev  # Start locally
# OR check Vercel: https://vercel.com/dashboard
```

### Frontend Build Fails

#### Symptoms

- `npm run build` throws error
- `vite build` fails
- Production deployment fails

#### Solutions

**Check Error Message:**

```bash
npm run build 2>&1 | head -50
# Look for first error

# Common:
# ❌ import issues
# ❌ undefined variables
# ❌ TypeScript errors
```

**Fix TypeScript Errors:**

```bash
# Check types
npm run type-check
# or
npx tsc --noEmit

# Fix errors shown
# Then rebuild
npm run build
```

**Out of Memory:**

```bash
# If: "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed"
# Solution: Increase memory

# macOS/Linux
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Windows
set NODE_OPTIONS=--max-old-space-size=4096
npm run build
```

**Vite Cache Issues:**

```bash
# Clear cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```

---

## 🔐 Authentication Issues

### Can't Sign Up

#### Symptoms

- Sign-up form won't submit
- Returns validation error
- Returns 400/500 error

#### Solutions

**Validation Error:**

```
❌ "Password must be at least 8 characters"
❌ "Email already exists"
❌ "Invalid email format"
```

**Fix:**

- Use strong password (8+ chars, mixed case, numbers)
- Use valid email format (user@example.com)
- Don't reuse email (create new account)

**Server Error (500):**

```bash
# Check backend logs
npm run dev

# Common causes:
# - MongoDB not running
# - Duplicate email in database
# - Password hashing failed

# Solutions:
# 1. Verify MongoDB: mongosh "MONGODB_URI"
# 2. Clear users table: db.users.deleteMany({})
# 3. Restart backend
```

### Can't Log In

#### Symptoms

- Wrong password message
- "No user found" message
- Request hangs/times out

#### Solutions

**Wrong Credentials:**

```bash
# Double-check:
# - Email spelling
# - Password (case-sensitive!)
# - Account exists (try sign up with different email)
```

**Backend Not Responding:**

```bash
# Is backend running?
npm run dev

# Is API URL correct?
# Check Frontend/.env
VITE_API_URL=https://correct-url
```

**Token Expired:**

```bash
# JWT tokens expire (default: 7 days)
# Solution: Log in again

# In code, refresh token:
// When token expires, automatically refresh
fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${oldToken}` }
})
.then(res => res.json())
.then(data => saveNewToken(data.token))
```

### Session Expires Too Quickly

#### Symptoms

- Logged out after 1 minute
- "Please log in again" messages
- Token constantly refreshing

#### Solutions

**JWT Expiration Too Short:**

```javascript
// backend/config/jwt.js
const JWT_EXPIRES_IN = '24h'; // Change from '1h' to '24h'
```

**Cookie Settings:**

```javascript
// If using cookies:
res.cookie('token', jwt, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});
```

**Test Local Storage:**

```javascript
// In browser console
console.log(localStorage.getItem('token'));
// Should show JWT token

// If empty, login again
```

---

## 💾 Database Issues

### Data Not Saving

#### Symptoms

- Create stream but it doesn't appear
- Update user but changes don't stick
- Random data loss

#### Solutions

**Check MongoDB Connection:**

```bash
mongosh "MONGODB_URI"
use pvabazaar
db.streams.find()
# Should show your data

# If no data:
# 1. Wrong database name
# 2. Connection not persisted
# 3. Data in different cluster
```

**Verify Write Permissions:**

```javascript
// backend/routes/streams.js
app.post('/api/streams', authMiddleware, async (req, res) => {
  try {
    const stream = await Stream.create({...})
    console.log('Stream saved:', stream._id)
    res.json(stream)
  } catch (error) {
    console.error('Save failed:', error.message)
    res.status(500).json({ error: error.message })
  }
})
```

**Check Validation Rules:**

```javascript
// Models often have required fields
const streamSchema = new Schema({
  title: { type: String, required: true },
  // If title missing, save fails silently
});

// Ensure all required fields provided
```

### Database Connection Slow

#### Symptoms

- API responses take 5+ seconds
- Intermittent timeouts
- "ECONNREFUSED" errors

#### Solutions

**MongoDB Atlas Limits:**

```bash
# Free tier limits:
# - 512MB storage
# - 100 connections
# - Slower performance

# Solutions:
# 1. Upgrade cluster (paid)
# 2. Delete old data
# 3. Optimize queries (add indexes)
```

**Add Indexes:**

```javascript
// backend/models/Stream.js
streamSchema.index({ userId: 1 });
streamSchema.index({ platform: 1 });
streamSchema.index({ createdAt: -1 });

// This speeds up queries by 100x
```

**Connection Pooling:**

```javascript
// backend/db/connect.js
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
};

mongoose.connect(MONGODB_URI, options);
```

---

## 🌐 IPFS Upload Issues

### IPFS Upload Fails

#### Symptoms

- `Error: 401 Unauthorized` from Pinata
- File upload stalls/hangs
- "Network error" message

#### Solutions

**Check Pinata Credentials:**

```bash
# Test authentication
curl -X GET https://api.pinata.cloud/data/testAuthentication \
  -H "pinata_api_key: YOUR_KEY" \
  -H "pinata_secret_api_key: YOUR_SECRET"

# If fails, credentials are wrong
# Get new ones from: https://pinata.cloud/keys
```

**File Size Too Large:**

```bash
# Pinata free tier limit: 100MB per file
# If larger:
# 1. Upgrade Pinata plan
# 2. Chunk file into smaller pieces
# 3. Use different provider (Web3.Storage, etc)
```

**Network Issues:**

```bash
# If upload stalls:
# 1. Check internet connection
# 2. Try different network (WiFi → Hotspot)
# 3. Increase timeout

// backend/services/ipfs.js
const timeout = 60000; // 60 seconds
const response = await axios.post(url, form, { timeout })
```

**IPFS Gateway Unreachable:**

```bash
# If playback fails but upload succeeded:
# 1. Check gateway URL
# 2. Use different gateway

// Try these gateways:
// https://gateway.pinata.cloud/ipfs/HASH
// https://ipfs.io/ipfs/HASH
// https://cf-ipfs.com/ipfs/HASH
```

---

## 📊 Streaming Issues

### Stream Won't Go Live

#### Symptoms

- Status shows "starting" for 5+ minutes
- Stream never appears on Twitch/platform
- "Failed to connect" errors

#### Solutions

**Twitch Integration:**

```bash
# 1. Verify Twitch account
#    https://www.twitch.tv/dashboard/account

# 2. Create OAuth app
#    https://dev.twitch.tv/console/apps

# 3. Get credentials:
TWITCH_CLIENT_ID=your_id
TWITCH_CLIENT_SECRET=your_secret

# 4. Test connection
curl -X GET https://api.twitch.tv/kraken/user \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**OBS Encoder Settings:**

```
Bitrate: 2500-6000 kbps (depends on internet)
Resolution: 1280x720 (720p) recommended
FPS: 30-60
Encoder: Hardware (NVIDIA/AMD) or x264
```

**Network Bandwidth:**

```bash
# Check upload speed
# Download speedtest (speedtest.net or fast.com)
# Need at least 5 Mbps for good stream quality

# If low speed:
# 1. Close other apps
# 2. Use wired ethernet instead of WiFi
# 3. Lower stream bitrate
```

### Stream Recordings Not Saving to IPFS

#### Symptoms

- Stream completes but no IPFS hash
- "Recording not saved" message
- Webhook never fires

#### Solutions

**Check IPFS Service:**

```javascript
// backend/services/ipfs.js
// Add logging
async function uploadToPinata(file) {
  try {
    console.log('Uploading to IPFS:', file.name);
    const response = await pinata.pinFileToIPFS(file);
    console.log('Upload successful:', response.IpfsHash);
    return response.IpfsHash;
  } catch (error) {
    console.error('Upload failed:', error.message);
    throw error;
  }
}
```

**Webhook Configuration:**

```javascript
// Ensure webhook route exists
app.post('/api/webhooks/twitch', (req, res) => {
  console.log('Webhook received');
  const stream = req.body;

  // Download from Twitch
  // Upload to IPFS
  // Save hash to database
})

// Test webhook
curl -X POST http://localhost:5001/api/webhooks/twitch \
  -H "Content-Type: application/json" \
  -d '{"stream_id":"123"}'
```

**Livepeer Integration:**

```bash
# If using Livepeer:
LIVEPEER_API_KEY=your_key

# Test
curl -X GET https://livepeer.com/api/stream \
  -H "Authorization: Bearer YOUR_KEY"
```

---

## 🚢 Deployment Issues

### Backend Won't Deploy to Vercel

#### Symptoms

- Deployment fails with error
- "Build failed"
- "Cannot find module"

#### Solutions

**Check Build Logs:**

```bash
# Go to: https://vercel.com/dashboard
# Click project → Deployments → [Failed] → Logs
# Look for error message
```

**Common Errors:**

| Error                 | Fix                                 |
| --------------------- | ----------------------------------- |
| Cannot find module    | Missing dependency in package.json  |
| MONGODB_URI undefined | Add env vars in Vercel settings     |
| Port already in use   | Vercel uses port 3000 automatically |
| Timeout during build  | Package too large, install issues   |

**Add Environment Variables:**

```bash
# Go to Vercel Project Settings
# Environment Variables
# Add each secret:
MONGODB_URI = mongodb+srv://...
JWT_SECRET = your_secret
PINATA_API_KEY = your_key
```

**Deploy Manually:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Or redeploy
vercel --prod
```

### Frontend Won't Deploy to GitHub Pages

#### Symptoms

- 404 on GitHub Pages
- CSS/JS not loading
- Shows main repo page instead

#### Solutions

**Enable GitHub Pages:**

```bash
# Go to repo Settings → Pages
# Select source: "Deploy from a branch"
# Branch: gh-pages
# Folder: / (root)
# Save
```

**Check Package.json Homepage:**

```json
{
  "homepage": "https://YOUR_USERNAME.github.io/YOUR_REPO_NAME"
}
```

**Deploy Manually:**

```bash
# Build
npm run build

# Deploy (if using gh-pages package)
npm run deploy

# Or manually:
# Commit dist/ folder
git add dist/
git commit -m "Deploy to GitHub Pages"
git push
```

---

## 🔍 Monitoring & Logging

### Check Production Status

```bash
# Backend health
curl https://your-backend.com/api/health

# Frontend
open https://your-username.github.io/your-repo

# Monitor logs
# Vercel: Dashboard → [Project] → Deployments → Logs
# GitHub Pages: Settings → Pages (check publish status)
```

### Enable Debug Logging

```javascript
// backend/app.js
// Add at top:
if (process.env.DEBUG) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
  });
}

// Run with logging
DEBUG=true npm run dev
```

---

## 🆘 Still Stuck?

### Get Help

1. **Check logs first** (always)
2. **Search GitHub Issues** - Your problem probably exists
3. **Read error messages carefully** - They're usually specific
4. **Try rubber duck debugging** - Explain problem aloud
5. **Search Stack Overflow** - Similar issues exist
6. **Ask in communities:**
   - GitHub Discussions
   - Discord communities
   - Reddit (r/webdev, r/streaming)

### Report a Bug

When opening an issue:

```markdown
**Title:** Clear one-line description

**Environment:**

- Node version: v20.x
- OS: macOS/Linux/Windows
- npm version: 10.x

**Steps to Reproduce:**

1. Do X
2. Do Y
3. See error

**Expected Behavior:**
Should show Z

**Actual Behavior:**
Shows error: "..."

**Error Message:**
(full error here)

**Screenshots:**
(if helpful)
```

---

## Prevention Tips

### Before Issues Happen

✅ Keep dependencies updated: `npm update`  
✅ Read error messages fully  
✅ Test locally before deploying  
✅ Use version control (git commit)  
✅ Document your changes  
✅ Monitor production with alerts  
✅ Backup database regularly  
✅ Use environment variables for secrets  
✅ Log important events  
✅ Have a rollback plan

---

**Remember:** Errors are learning opportunities. Every developer gets stuck. The path forward is always: read → diagnose → fix → learn → prevent.

**You've got this. 🚀**

---

**Last Updated:** January 23, 2026  
**Questions?** Open a GitHub Issue  
**Feedback?** Submit a PR with improvements
