# Local Development Setup Guide

## Prerequisites
- Node.js 20.x or higher
- npm or pnpm
- MongoDB (local or Atlas)
- Git

## Project Structure
```
pva-bazaar-app/
├── Frontend/                 # React + Vite (port 5173)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # Express API (port 3001)
│   ├── api/
│   ├── package.json
│   └── routes/
└── .env files               # Configuration (ignored in git)
```

## Frontend Setup

### 1. Install Dependencies
```bash
cd Frontend
npm install
```

### 2. Create `.env.local`
```env
# Frontend/.env.local
VITE_API_URL=http://localhost:3001
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### 3. Development Server
```bash
npm run dev
# Frontend runs on http://localhost:5173
```

### 4. Build for Production
```bash
npm run build
# Output in dist/
```

### 5. Key Files
- [src/config/env.ts](Frontend/src/config/env.ts) - Environment configuration (validates VITE_API_URL)
- [src/lib/api.js](Frontend/src/lib/api.js) - API helpers (apiGet, apiPost, apiPut, apiDelete)
- [vite.config.ts](Frontend/vite.config.ts) - Vite configuration

### Frontend Rules ✅
- Never hardcode API URLs
- Use `ENV.API_URL` from env.ts
- Use api.js helpers for all backend calls
- Use separate client for external APIs (Cloudinary)
- Vite env vars are `VITE_*` prefix

---

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create `.env`
```env
# backend/.env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pva-bazaar
# or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pva-bazaar

JWT_SECRET=your_jwt_secret_here_change_in_production
ADMIN_SECRET_CODE=your_admin_code_here

# Optional - for full features
STRIPE_SECRET_KEY=sk_test_...
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=development

# CORS is handled in code, no env var needed
```

### 3. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB Community
# macOS:
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Windows:
# Download MSI installer from https://www.mongodb.com/try/download/community

# Start service:
mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster (free tier available)
3. Get connection string
4. Use in MONGODB_URI

### 4. Development Server
```bash
npm run dev
# Backend runs on http://localhost:3001
```

### 5. Test API Health
```bash
curl http://localhost:3001/health
# Response: { "ok": true, ... }
```

### 6. Key Files
- [api/index.js](backend/api/index.js) - Main Express app
  - CORS configuration (lines 40-65)
  - MongoDB connection pooling (lines 147-190)
  - Health check endpoints
- [routes/](backend/routes/) - API route handlers
- [middleware/](backend/middleware/) - Express middleware

### Backend Rules ✅
- Read all secrets from process.env
- CORS configured for pvabazaar.org + localhost
- Never log/return raw secrets
- Connection pooling for serverless (Vercel)
- CORS applies to all requests (even errors)

---

## Full Stack Development

### Terminal 1: Backend
```bash
cd backend
npm run dev
# Watches for changes, restarts on save
```

### Terminal 2: Frontend
```bash
cd Frontend
npm run dev
# Vite dev server with hot reload
```

### Terminal 3: Optional - Testing
```bash
# Run health checks
curl http://localhost:3001/health
curl http://localhost:5173/

# Check logs for errors
# (refer to terminal 1 & 2)
```

---

## CORS Configuration

### Current Setup
- ✅ Allowed Origins:
  - `https://pvabazaar.org`
  - `https://www.pvabazaar.org`
  - `http://localhost:3000`
  - `http://localhost:5173`

- ✅ Allowed Methods: GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS
- ✅ Allowed Headers: Content-Type, Authorization, X-Admin-Code, Origin, X-Requested-With, Accept
- ✅ Credentials: Enabled for allowed origins

**To add origins:** Edit [backend/api/index.js](backend/api/index.js) lines 40-45

---

## API Connectivity Verification

### 1. Check Backend Health
```bash
curl -v http://localhost:3001/health
# Should return 200 with { "ok": true, ... }
```

### 2. Check CORS Headers
```bash
curl -v -X OPTIONS http://localhost:3001/api/products \
  -H "Origin: http://localhost:5173"
# Look for:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Credentials: true
```

### 3. Check Frontend → Backend Communication
1. Open http://localhost:5173
2. Open browser DevTools (F12)
3. Go to Network tab
4. Make an API call (e.g., browse products)
5. Check XHR requests - should see requests to http://localhost:3001

---

## Common Issues & Solutions

### "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "ECONNREFUSED localhost:3001" (Frontend can't reach Backend)
1. Is backend running? Check Terminal 1
2. Is VITE_API_URL correct? Check Frontend/.env.local
3. CORS issue? Check browser console for error details

### "MONGODB_URI not set" error
1. Create backend/.env
2. Add MONGODB_URI (local or Atlas)
3. Restart backend (npm run dev)

### MongoDB connection timeout
- If local: Is mongod running? (`mongod` command)
- If Atlas: Is IP whitelisted? Check Atlas dashboard

### Port already in use
```bash
# Backend (3001) in use
npx kill-port 3001

# Frontend (5173) in use
npx kill-port 5173
# Or specify different port:
npm run dev -- --port 5174
```

---

## Deployment Environment Variables

### GitHub Secrets (for CI/CD)
Add to repo Settings → Secrets and variables → Actions:

```
VERCEL_TOKEN           # From Vercel account
VERCEL_ORG_ID          # From Vercel dashboard
VERCEL_BACKEND_PROJECT_ID
VERCEL_FRONTEND_PROJECT_ID
MONGODB_URI            # Production MongoDB
JWT_SECRET             # Production secret
SENTRY_DSN             # Optional, for error tracking
```

### Vercel Backend Environment Variables
Set in Vercel Project Settings:

```
MONGODB_URI=...
JWT_SECRET=...
ADMIN_SECRET_CODE=...
STRIPE_SECRET_KEY=...
SENTRY_DSN=...
NODE_ENV=production
```

### Vercel Frontend Environment Variables
Set in Vercel Project Settings:

```
VITE_API_URL=https://api.pvabazaar.org
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

---

## File Structure Reference

### Frontend Key Paths
- **Config:** [Frontend/src/config/env.ts](Frontend/src/config/env.ts)
- **API Client:** [Frontend/src/lib/api.js](Frontend/src/lib/api.js)
- **Pages:** [Frontend/src/pages/](Frontend/src/pages/)
- **Components:** [Frontend/src/components/](Frontend/src/components/)
- **Vite Config:** [Frontend/vite.config.ts](Frontend/vite.config.ts)

### Backend Key Paths
- **API Entry:** [backend/api/index.js](backend/api/index.js)
- **Routes:** [backend/routes/](backend/routes/)
- **Middleware:** [backend/middleware/](backend/middleware/)
- **Models:** [backend/models/](backend/models/)
- **Seeds:** [backend/seed.js](backend/seed.js)

---

## Quick Commands

### Frontend
```bash
cd Frontend
npm install                # Install dependencies
npm run dev               # Development server (port 5173)
npm run build             # Production build
npm run preview           # Preview production build
npm run test              # Run tests
```

### Backend
```bash
cd backend
npm install                # Install dependencies
npm run dev               # Development server (port 3001, auto-reload)
npm run start             # Production start (no auto-reload)
npm run seed              # Seed database
```

### Root Project
```bash
git status               # Check git status
git log --oneline        # View recent commits
npm run build            # Build both frontend & backend
```

---

## Next Steps

1. ✅ Clone repository and install dependencies
2. ✅ Configure local `.env` files (Frontend & Backend)
3. ✅ Start MongoDB (local or verify Atlas connection)
4. ✅ Run backend: `npm run dev` in /backend
5. ✅ Run frontend: `npm run dev` in /Frontend
6. ✅ Verify connectivity: Open http://localhost:5173
7. ✅ Test API calls in browser DevTools Network tab
8. ✅ For production: Set GitHub Secrets + Vercel env vars

---

## Support

- **Issues?** Check browser console (Frontend) or terminal output (Backend)
- **Docs:** See [README.md](README.md)
- **Deploy:** See [DEPLOYMENT.md](DEPLOYMENT.md)
