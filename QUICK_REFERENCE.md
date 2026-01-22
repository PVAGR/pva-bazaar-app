# Quick Reference Card

## 🚀 START HERE

### First Time Setup
```bash
# Clone and install
git clone https://github.com/richy1000/pva-bazaar-app
cd pva-bazaar-app

# Frontend setup
cd Frontend
npm install
echo "VITE_API_URL=http://localhost:3001" > .env.local
cd ..

# Backend setup
cd backend
npm install
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
echo "MONGODB_URI=mongodb://localhost:27017/pva-bazaar" >> .env
echo "NODE_ENV=development" >> .env
cd ..

# Start MongoDB
mongod &

# Start both (Terminal 1 & 2)
cd backend && npm run dev          # Terminal 1
cd Frontend && npm run dev         # Terminal 2
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- API Health: http://localhost:3001/health

---

## 📁 PROJECT STRUCTURE

```
pva-bazaar-app/
├── Frontend/                 # React + Vite (port 5173)
│   ├── src/
│   │   ├── config/env.ts    # Environment validation
│   │   ├── lib/api.js       # API helpers (use these!)
│   │   ├── pages/           # Route components
│   │   └── components/      # Reusable components
│   ├── vite.config.ts
│   ├── package.json
│   └── dist/                # Build output
│
├── backend/                  # Express API (port 3001)
│   ├── api/
│   │   └── index.js         # Main Express app
│   ├── routes/              # API endpoints
│   ├── middleware/          # Express middleware
│   ├── models/              # MongoDB schemas
│   ├── package.json
│   └── .env                 # Secrets (gitignored)
│
├── .github/
│   └── workflows/           # GitHub Actions CI/CD
│
├── .env.example.ci          # CI/CD env template
└── README.md                # Main docs
```

---

## 🔑 ENVIRONMENT VARIABLES

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3001
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
```

### Backend (.env)
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pva-bazaar
JWT_SECRET=your_jwt_secret_here
ADMIN_SECRET_CODE=your_admin_code
```

### Production (Vercel)
- Set in Vercel Dashboard → Environment Variables
- Also set GitHub Secrets for CI/CD

---

## 🔧 COMMON COMMANDS

### Frontend
```bash
cd Frontend
npm install              # Install dependencies
npm run dev            # Start dev server (port 5173)
npm run build          # Build for production
npm run preview        # Preview production build
npm run test           # Run tests
```

### Backend
```bash
cd backend
npm install            # Install dependencies
npm run dev           # Start dev server (port 3001, auto-reload)
npm run start         # Start production
npm run seed          # Seed database
```

### Git
```bash
git status            # Check status
git log --oneline     # Recent commits
git diff              # Uncommitted changes
git add .             # Stage changes
git commit -m "msg"   # Commit
git push              # Push to GitHub
```

### Database
```bash
# Start MongoDB (macOS)
brew services start mongodb-community

# Start MongoDB (Windows)
# Use MongoDB Compass or services UI

# Connect to MongoDB shell
mongosh

# Show databases
show dbs

# Use pva-bazaar database
use pva-bazaar

# See collections
show collections
```

---

## 🌐 API QUICK TEST

### Health Check
```bash
curl http://localhost:3001/health
```

### Get Products
```bash
curl http://localhost:3001/api/products
```

### Test CORS
```bash
curl -v -X OPTIONS http://localhost:3001/api/products \
  -H "Origin: http://localhost:5173"
# Look for: Access-Control-Allow-Origin header
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}'
```

---

## 🎯 FOLDER PURPOSES

| Folder | Purpose | Example File |
|--------|---------|--------------|
| `Frontend/src/config/` | Configuration & env vars | env.ts |
| `Frontend/src/lib/` | Utilities & API client | api.js |
| `Frontend/src/pages/` | Route pages (React) | HomePage.jsx |
| `Frontend/src/components/` | Reusable components | ProductCard.jsx |
| `backend/api/` | Express app setup | index.js |
| `backend/routes/` | API endpoints | products.js |
| `backend/models/` | MongoDB schemas | Product.js |
| `backend/middleware/` | Express middleware | rateLimit.js |
| `.github/workflows/` | CI/CD automation | deploy-backend.yml |

---

## 🚀 DEPLOYMENT QUICK START

### Prerequisites
- [ ] GitHub Secrets configured (VERCEL_TOKEN, MONGODB_URI, etc.)
- [ ] Vercel backend project created
- [ ] Vercel frontend project created
- [ ] MongoDB Atlas cluster ready

### Deploy Backend
```bash
# Vercel handles automatically on push to main
# Or manual:
cd backend
npx vercel --prod
```

### Deploy Frontend
```bash
# Vercel handles automatically on push to main
# Or manual:
cd Frontend
npx vercel --prod
```

### Verify Production
```bash
curl https://api.pvabazaar.org/health
curl https://pvabazaar.org
```

---

## ❌ COMMON MISTAKES

### ❌ Frontend Issues
- Hardcoding API URLs in components
- Not using `ENV.API_URL` from config/env.ts
- Not using api.js helpers for backend calls
- Fetching external APIs with internal axios client

### ❌ Backend Issues
- Returning raw secrets in responses
- Hardcoding CORS origins
- Not reading secrets from process.env
- Not handling database connection failures

### ❌ Deployment Issues
- Committing .env files to git
- Not setting GitHub Secrets
- Not setting Vercel environment variables
- Using localhost API URL in production

---

## ✅ BEST PRACTICES

### Frontend
- Use `ENV.API_URL` everywhere
- Use api.js helpers (apiGet, apiPost, etc.)
- Import from absolute paths (@/components)
- Use lazy loading for large components
- Handle errors gracefully

### Backend
- Read all secrets from process.env
- Validate environment at startup
- Use middleware for cross-cutting concerns
- Return consistent JSON responses
- Log errors without revealing secrets

### Deployment
- Set all secrets in GitHub/Vercel, never commit
- Test locally before pushing
- Monitor Vercel logs for errors
- Use Sentry for error tracking
- Keep dependencies updated

---

## 🔗 IMPORTANT FILES

**Frontend:**
- [Frontend/src/config/env.ts](Frontend/src/config/env.ts) - Env validation
- [Frontend/src/lib/api.js](Frontend/src/lib/api.js) - API client
- [Frontend/vite.config.ts](Frontend/vite.config.ts) - Vite config
- [Frontend/.env.local]() - Local env (create this)

**Backend:**
- [backend/api/index.js](backend/api/index.js) - Express app
- [backend/.env]() - Secrets (create this, gitignored)
- [backend/package.json](backend/package.json) - Dependencies

**Root:**
- [README.md](README.md) - Main documentation
- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Detailed setup
- [DEPLOYMENT_CHECKLIST_PRODUCTION.md](DEPLOYMENT_CHECKLIST_PRODUCTION.md) - Deploy guide
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) - Architecture
- [TROUBLESHOOTING_PERFORMANCE.md](TROUBLESHOOTING_PERFORMANCE.md) - Debugging
- [CORS_VERIFICATION_COMPLETE.md](CORS_VERIFICATION_COMPLETE.md) - CORS details

---

## 📞 QUICK HELP

**Frontend won't start?**
```bash
cd Frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Backend won't connect?**
```bash
# Check MongoDB
mongod

# Check backend
cd backend
npm run dev

# Test health
curl http://localhost:3001/health
```

**CORS errors?**
```bash
# Check CORS headers
curl -v http://localhost:3001/health

# Backend CORS config
# backend/api/index.js lines 40-65
```

**Something else?**
1. Check [TROUBLESHOOTING_PERFORMANCE.md](TROUBLESHOOTING_PERFORMANCE.md)
2. Check browser console (F12)
3. Check backend logs (terminal)
4. Check Vercel/GitHub Actions logs

---

## 🎓 Learning Path

1. Read [README.md](README.md) for overview
2. Read [LOCAL_SETUP.md](LOCAL_SETUP.md) for setup
3. Follow [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for how it works
4. Use [TROUBLESHOOTING_PERFORMANCE.md](TROUBLESHOOTING_PERFORMANCE.md) when stuck
5. Use [DEPLOYMENT_CHECKLIST_PRODUCTION.md](DEPLOYMENT_CHECKLIST_PRODUCTION.md) to deploy

---

## 📊 STATUS CHECKS

### Is frontend running?
```bash
curl http://localhost:5173
# Should return HTML
```

### Is backend running?
```bash
curl http://localhost:3001/health
# Should return JSON with ok: true
```

### Can frontend reach backend?
```bash
# In browser console:
fetch('http://localhost:3001/api/products')
  .then(r => r.json())
  .then(d => console.log(d))
```

### Is database connected?
```bash
# Check backend logs for:
# ✅ MongoDB connected
```

---

**Everything working? Great! Start building! 🎉**

*Last updated: January 21, 2026*
