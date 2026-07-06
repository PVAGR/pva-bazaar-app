# 🚀 Vercel Deployment - Ready to Deploy!

## ✅ Configuration Complete

All fixes have been applied and pushed to GitHub. The backend is now ready for Vercel deployment.

---

## 📋 Backend Deployment Steps on Vercel

### 1. Create New Project on Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Select **pva-bazaar-app** repository
4. Click **"Import"**

### 2. Configure Project Settings

**Project Name:** `pva-bazaar-backend` (or your preferred name)

**Framework Preset:** Other

**Root Directory:**

- Click **"Edit"**
- Set to: `backend`
- Click **"Continue"**

**Build Command:**

```
npm install
```

**Output Directory:**

- Leave empty (or set to `.`)

**Install Command:**

```
npm install
```

### 3. Set Environment Variables

Click **"Environment Variables"** and add these **REQUIRED** variables:

```env
NODE_ENV=production
JWT_SECRET=<generate-a-strong-secret-min-32-chars>
MONGODB_URI=<your-mongodb-atlas-connection-string>
ALLOWED_ORIGIN=https://pvabazaar.org
USE_MEMORY_DB=false
```

**How to generate JWT_SECRET:**

```bash
# In terminal (Linux/Mac):
openssl rand -base64 48

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**MongoDB URI format:**

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### 4. Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete (2-3 minutes)
3. Get your deployment URL (e.g., `https://pva-bazaar-backend-xxx.vercel.app`)

---

## 🔍 What Was Fixed

### ✅ Problem 1: Root Directory Configuration

- **Issue:** Vercel was looking at entire monorepo
- **Fix:** Set Root Directory to `backend` in project settings

### ✅ Problem 2: Output Directory Error

- **Issue:** Vercel expected `public` folder (static site)
- **Fix:** Removed outputDirectory from vercel.json (not needed for Node.js API)

### ✅ Problem 3: Husky Installation Error

- **Issue:** `husky: command not found` during npm install
- **Fix:** Updated prepare script to check for .git directory first

### ✅ Problem 4: Serverless Entry Point

- **Issue:** vercel.json pointed to wrong entry file
- **Fix:** Updated to use `server.js` which properly wraps Express app

---

## 📝 Backend Configuration Files

### [backend/vercel.json](backend/vercel.json)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.js"
    },
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "USE_MEMORY_DB": "false",
    "ALLOWED_ORIGIN": "https://pvabazaar.org"
  }
}
```

### [backend/server.js](backend/server.js)

✅ Serverless wrapper using `serverless-http`
✅ Initializes database connection
✅ Exports proper handler for Vercel

### [backend/.vercelignore](backend/.vercelignore)

✅ Excludes test files and development files
✅ Keeps deployment lean

---

## 🧪 After Deployment - Testing

Once deployed, test your API endpoints:

### Health Check

```bash
curl https://your-backend-url.vercel.app/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-03T...",
  "environment": "production",
  "database": "connected"
}
```

### Test Authentication

```bash
curl -X POST https://your-backend-url.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123!","role":"buyer"}'
```

---

## 🔗 Update Frontend Configuration

After backend is deployed, update the frontend environment file:

**[Frontend/.env.production](Frontend/.env.production)**

```env
VITE_API_URL=https://your-actual-backend-url.vercel.app/api

# Optional: Admin panel connection status stale threshold (default: 120000ms = 2 minutes)
# VITE_STATUS_STALE_MS=180000
```

Replace `your-actual-backend-url` with the actual Vercel URL.

---

## 📊 Monitoring

After deployment, check:

- **Vercel Dashboard:** Monitor function invocations and errors
- **MongoDB Atlas:** Check database connections
- **Logs:** View real-time logs in Vercel dashboard

---

## 🚨 Common Issues & Solutions

### Issue: Database Connection Timeout

**Solution:** Check MongoDB Atlas network access settings. Add `0.0.0.0/0` to allow Vercel serverless functions.

### Issue: JWT_SECRET Error

**Solution:** Ensure JWT_SECRET is set in Vercel environment variables and is at least 32 characters.

### Issue: CORS Errors

**Solution:** Check ALLOWED_ORIGIN matches your frontend domain exactly.

---

## ✅ Ready to Deploy!

All configurations are complete. Follow the steps above to deploy your backend on Vercel! 🎉
