# Troubleshooting & Performance Guide

## 🆘 Common Issues & Solutions

### FRONTEND ISSUES

#### Issue: "Cannot connect to API" / CORS errors
**Symptoms:**
- Browser console: "Access to XMLHttpRequest blocked by CORS policy"
- Frontend loads, but no data visible
- Network tab shows failed XHR requests

**Diagnosis:**
1. Check backend is running
2. Check API_URL is correct
3. Check CORS headers in response

**Solutions:**
```bash
# 1. Verify backend is running
cd backend && npm run dev

# 2. Check API_URL in frontend
grep "VITE_API_URL" .env.local

# 3. Test CORS headers manually
curl -v -X OPTIONS http://localhost:3001/api/products \
  -H "Origin: http://localhost:5173"
# Look for: Access-Control-Allow-Origin header

# 4. If headers missing, backend CORS middleware not running
# Check backend/api/index.js lines 40-65
```

---

#### Issue: "Cannot find module" errors during build
**Symptoms:**
```
Cannot find module '@/config/env'
Module not found: Error: Can't resolve 'react-router-dom'
```

**Solutions:**
```bash
# 1. Reinstall dependencies
cd Frontend
rm -rf node_modules package-lock.json
npm install

# 2. Clear Vite cache
rm -rf .vite

# 3. Check import paths
# ✅ Correct: import { ENV } from '@/config/env'
# ❌ Wrong: import { ENV } from './config/env'

# 4. Rebuild
npm run build
```

---

#### Issue: "VITE_API_URL pointing to localhost in production"
**Symptoms:**
```
Error: VITE_API_URL points to localhost in production build
```

**Solutions:**
```bash
# 1. Set production API URL in Vercel environment
# Vercel Dashboard → Project Settings → Environment Variables
VITE_API_URL=https://api.pvabazaar.org

# 2. Or set via command line during build
VITE_API_URL=https://api.pvabazaar.org npm run build
```

---

#### Issue: Page loads but shows blank / no products
**Symptoms:**
- Homepage loads (no 404)
- But no products visible
- DevTools shows API request failed or timed out

**Solutions:**
```bash
# 1. Check backend is responding
curl http://localhost:3001/api/products

# 2. If backend responds, check database
# Verify MongoDB connection in backend logs

# 3. Check if DB has data
# Use MongoDB shell or Compass

# 4. Test with different API endpoint
curl http://localhost:3001/health

# 5. Check frontend console for JavaScript errors
# Open DevTools → Console tab
```

---

#### Issue: Images not loading
**Symptoms:**
- Image placeholder or broken image icon
- DevTools shows 404 or CORS error for image

**Solutions:**
```bash
# 1. If using Cloudinary, check credentials
# Frontend/.env.local:
VITE_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset

# 2. Test Cloudinary URL directly in browser
# https://res.cloudinary.com/{cloud_name}/...

# 3. If local images, check paths
# Should be /images/filename.png (not ./images)

# 4. Check public/ folder exists with images
ls -la Frontend/public/images/
```

---

### BACKEND ISSUES

#### Issue: "Cannot connect to MongoDB"
**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
MongooseError: Cannot connect to MongoDB
```

**Solutions:**
```bash
# 1. If using local MongoDB, start it
mongod
# Or on macOS with Homebrew:
brew services start mongodb-community

# 2. If using MongoDB Atlas, verify connection string
# Format: mongodb+srv://user:password@cluster.mongodb.net/pva-bazaar
# Check:
# - Username/password correct
# - IP whitelist includes your IP (or 0.0.0.0/0)
# - Database name exists

# 3. Test connection directly
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pva-bazaar')
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌', err.message));
"

# 4. Check MONGODB_URI is set
echo $MONGODB_URI
```

---

#### Issue: "Port 3001 already in use"
**Symptoms:**
```
Error: listen EADDRINUSE :::3001
Address already in use
```

**Solutions:**
```bash
# 1. Kill process using the port (macOS/Linux)
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9

# 2. Or on Windows (PowerShell)
Get-NetTCPConnection -LocalPort 3001 | Stop-Process -Force

# 3. Or use npx
npx kill-port 3001

# 4. Use different port
PORT=3002 npm run dev
```

---

#### Issue: "JWT_SECRET not set" error
**Symptoms:**
```
⚠️ Env validation: Missing env: JWT_SECRET
API_READY = false
```

**Solutions:**
```bash
# 1. Create .env file in backend/
cat > backend/.env <<EOF
JWT_SECRET=$(openssl rand -hex 32)
MONGODB_URI=mongodb://localhost:27017/pva-bazaar
NODE_ENV=development
EOF

# 2. Or set manually
JWT_SECRET="your_secret_here_at_least_32_chars"

# 3. Restart backend
npm run dev
```

---

#### Issue: "ADMIN_SECRET_CODE in production is unsafe"
**Symptoms:**
- Admin endpoints return 403
- Cannot access admin panel
- Security warnings in logs

**Solutions:**
```bash
# 1. In development, set in backend/.env
ADMIN_SECRET_CODE=dev_code_here

# 2. In production (Vercel), set in environment variables
# Vercel Dashboard → Settings → Environment Variables
ADMIN_SECRET_CODE=production_secret_code_here

# 3. Never commit secrets to git
# Check .gitignore includes .env files
grep "\.env" .gitignore
```

---

#### Issue: "CORS error: Origin not allowed"
**Symptoms:**
```
Access-Control-Allow-Origin header missing
Origin ... not allowed
```

**Solutions:**
```bash
# 1. Check CORS config in backend/api/index.js
# Lines 40-45 should list your origins:
const allowedOrigins = new Set([
  'https://pvabazaar.org',
  'https://www.pvabazaar.org',
  'http://localhost:3000',
  'http://localhost:5173',
]);

# 2. If missing your origin, add it:
# const allowedOrigins = new Set([
#   'https://your-domain.com',  // Add this line
#   ...existing...
# ]);

# 3. Restart backend
npm run dev

# 4. Test CORS header
curl -v -H "Origin: http://localhost:5173" http://localhost:3001/health
# Should see: Access-Control-Allow-Origin: http://localhost:5173
```

---

#### Issue: Requests timeout / very slow
**Symptoms:**
- API calls timeout after 30 seconds
- Database queries take forever
- Vercel logs show slow invocations

**Solutions:**
```bash
# 1. Check database connection
# Add logging to see connection time

# 2. Check query performance
# Use MongoDB Compass or Atlas UI
# Look for slow queries

# 3. Add indexes to frequently queried fields
db.products.createIndex({ name: 1 })
db.orders.createIndex({ userId: 1 })

# 4. Check rate limiting isn't blocking
# Default: 100 req/15min per IP
# For APIs, consider increasing

# 5. Check Vercel logs for errors
# Vercel Dashboard → Deployments → Logs
```

---

### DEPLOYMENT ISSUES

#### Issue: "Build fails on Vercel"
**Symptoms:**
```
Build Error: Command failed
npm ERR! code ENOENT
npm ERR! notfound: vite
```

**Solutions:**
```bash
# 1. Test build locally first
npm run build
# If works locally, likely missing dependencies

# 2. Check package.json has all dependencies
npm ls

# 3. Ensure node_modules properly committed
# Or rely on npm ci during build

# 4. Check Node version
# Vercel should use 20.x (set in backend/package.json)

# 5. Check build command in Vercel
# Frontend: npm run build
# Backend: npm run build (should be "echo 'Serverless build'")

# 6. Review full Vercel logs
# Vercel Dashboard → Deployment → Logs
```

---

#### Issue: "Environment variables not found in Vercel"
**Symptoms:**
```
Error: Missing required env var: MONGODB_URI
API not ready (production)
```

**Solutions:**
```bash
# 1. Verify secrets in GitHub Actions
# GitHub → Settings → Secrets → Actions
# Should include: MONGODB_URI, JWT_SECRET, etc.

# 2. Verify env vars in Vercel
# Vercel Project → Settings → Environment Variables
# Should match what's used in code

# 3. For backend, env vars can come from:
# - Vercel dashboard (preferred)
# - GitHub Secrets (for CI/CD)

# 4. Test locally with env file
cat backend/.env
# Should have all required variables

# 5. Redeploy after adding env vars
# Changes to env vars require redeployment
```

---

### GIT / GITHUB ISSUES

#### Issue: "Secrets detected in git history"
**Symptoms:**
```
gitleaks: Private key found
Secret detected: JWT_SECRET=...
```

**Solutions:**
```bash
# 1. Never commit .env files
# Check .gitignore
grep ".env" .gitignore

# 2. If already committed
# Use git-filter-branch or BFG
bfg --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 3. Rotate compromised secrets
# Generate new JWT_SECRET
# Update in Vercel & GitHub Secrets

# 4. Add pre-commit hook
# Use husky + lint-staged to prevent

# 5. Run gitleaks locally
gitleaks detect --source .
```

---

#### Issue: "GitHub Actions workflow fails"
**Symptoms:**
```
Workflow failed at "Deploy Backend to Vercel"
Error: VERCEL_TOKEN is not set
```

**Solutions:**
```bash
# 1. Check GitHub Secrets
# GitHub → Settings → Secrets → Actions
# Verify secret names match workflow file

# 2. Verify secret values
# Each secret should be set (not empty)

# 3. Check workflow syntax
# GitHub shows workflow errors in Actions tab

# 4. Manual trigger to test
# GitHub → Actions → Workflow → Run workflow

# 5. Check permissions
# GitHub → Settings → Actions → General
# Verify "Read and write permissions" enabled
```

---

## ⚡ Performance Optimization

### Frontend Performance

#### Code Splitting
```typescript
// Instead of importing everything:
import { Dashboard, Checkout, Admin } from '@/pages';

// Use dynamic imports:
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Admin = lazy(() => import('@/pages/Admin'));

// Wrap with Suspense:
<Suspense fallback={<Spinner />}>
  <Dashboard />
</Suspense>
```

#### Image Optimization
```html
<!-- ❌ Large unoptimized image -->
<img src="/image.png" alt="Product" />

<!-- ✅ Optimized with srcset -->
<img 
  src="/image-400.webp"
  srcset="/image-200.webp 200w, /image-400.webp 400w, /image-800.webp 800w"
  alt="Product"
  loading="lazy"
/>

<!-- ✅ Using Cloudinary -->
<img 
  src="https://res.cloudinary.com/{cloud_name}/image/upload/w_400,q_80/image.jpg"
  alt="Product"
  loading="lazy"
/>
```

#### Remove Unused CSS/JS
```bash
# Check bundle size
npm run build

# Look for large chunks in output:
# dist/assets/vendor-CvzFlBTx.js  536.16 kB

# Analyze what's included:
npm install -g vite-plugin-visualizer

# Add to vite.config.ts:
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer()
  ]
}

# Rebuild and open stats.html
```

#### Reduce API Calls
```javascript
// ❌ Multiple separate calls
const products = await apiGet('/products');
const reviews = await apiGet('/reviews');
const specs = await apiGet('/specs');

// ✅ Single call with nested data
const productData = await apiGet('/products?include=reviews,specs');
```

---

### Backend Performance

#### Enable Caching
```javascript
// Cache products for 1 hour
app.get('/api/products', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  // ... return products
});

// Cache immutable assets forever
app.get('/public/*', (req, res) => {
  res.set('Cache-Control', 'public, immutable, max-age=31536000');
  // ... serve file
});
```

#### Database Query Optimization
```javascript
// ❌ N+1 queries problem
const products = await Product.find().limit(10);
for (const product of products) {
  product.reviews = await Review.find({ productId: product._id });
}

// ✅ Single query with populate
const products = await Product
  .find()
  .limit(10)
  .populate('reviews');
```

#### Add Database Indexes
```bash
# Connect to MongoDB
mongodb atlas

# Create indexes for frequently queried fields
db.products.createIndex({ name: 1, category: 1 })
db.orders.createIndex({ userId: 1, createdAt: -1 })
db.reviews.createIndex({ productId: 1 })
```

#### Compression
```javascript
// Enable gzip compression
const compression = require('compression');
app.use(compression());
// Reduces response size by ~70%
```

---

### Database Performance

#### Connection Pooling
```javascript
// Already optimized in backend/api/index.js
// Uses global cache for serverless
// Reduces connection overhead by ~90%
```

#### Query Performance
```javascript
// ❌ Slow: unindexed search
db.products.find({ name: { $regex: 'search' } })

// ✅ Fast: text index
db.products.createIndex({ name: 'text' })
db.products.find({ $text: { $search: 'search' } })
```

#### Pagination
```javascript
// ❌ Slow: fetch all
const all = await Product.find({});

// ✅ Fast: paginate
const page = req.query.page || 1;
const limit = 20;
const skip = (page - 1) * limit;
const products = await Product.find()
  .skip(skip)
  .limit(limit);
```

---

### Vercel Optimization

#### Use Serverless Functions Efficiently
```javascript
// ✅ Fast: reuse connections
// Connection pooled globally
await db.connect();

// ✅ Fast: lightweight middleware
// Only essential middleware

// ❌ Slow: heavy initialization in function
// Connect to database in every function
```

#### Monitor Cold Starts
1. Vercel Dashboard → Project → Deployments → Function Duration
2. First invocation slower (cold start)
3. Subsequent invocations faster (warm)
4. Optimize by reducing bundle size

#### Use Edge Functions (Optional)
```javascript
// For lightweight, ultra-fast responses
// Static content, redirects, authentication
// Runs closer to user (lower latency)
```

---

## 📊 Monitoring & Debugging

### Local Debugging
```bash
# Frontend with source maps
npm run dev
# Open DevTools (F12) and set breakpoints

# Backend with debugger
node --inspect api/index.js
# Open chrome://inspect

# Or use VS Code debugger
# .vscode/launch.json:
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/backend/api/index.js"
    }
  ]
}
```

### Production Debugging
```bash
# Vercel logs
vercel logs <project-name> --follow

# Sentry error tracking
# https://sentry.io → Project → Issues

# Backend console logs
# Vercel Dashboard → Deployments → Logs
```

### Performance Monitoring
```bash
# Lighthouse score (Frontend)
# Chrome DevTools → Lighthouse → Generate report
# Target: > 80 score

# Vercel Analytics
# Vercel Dashboard → Analytics
# Monitors Core Web Vitals

# MongoDB Performance
# Atlas Dashboard → Metrics
# CPU, memory, operations/sec
```

---

## 🔧 Advanced Troubleshooting

### Enable Debug Logging
```javascript
// backend/api/index.js
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}
```

### Test API Locally
```bash
# Start all services
# Backend: npm run dev
# MongoDB: mongod
# Frontend: npm run dev

# In browser console:
fetch('http://localhost:3001/health').then(r => r.json()).then(console.log)

# Using curl:
curl http://localhost:3001/api/products
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Check Network Request Details
```bash
# In browser DevTools:
1. Open Network tab
2. Make API call
3. Click request in list
4. Inspect Headers, Request, Response
5. Check:
   - Status code (200, 401, 404, 500)
   - CORS headers present
   - Response data
   - Timing (too slow?)
```

---

**For setup:** See [LOCAL_SETUP.md](LOCAL_SETUP.md)  
**For deployment:** See [DEPLOYMENT_CHECKLIST_PRODUCTION.md](DEPLOYMENT_CHECKLIST_PRODUCTION.md)  
**For architecture:** See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
