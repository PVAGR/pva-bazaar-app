# Deployment Checklist & Launch Readiness

## 📋 Pre-Deployment Verification

### Local Development ✅
- [x] Frontend builds without errors: `npm run build`
- [x] Backend runs without errors: `npm run dev`
- [x] CORS configured properly
- [x] No hardcoded API URLs
- [x] All secrets from environment variables
- [ ] Tested full flow locally (Frontend → Backend → Database)

### Code Quality ✅
- [x] No syntax errors in code
- [x] No unused imports
- [x] Environment config validated
- [x] API helpers properly used
- [ ] All console.logs reviewed (remove debug logs before production)

### Git Status ✅
- [x] Working tree clean
- [x] All changes committed
- [x] No uncommitted secrets
- [ ] Branch pushed to origin/main

---

## 🔑 GitHub Secrets Configuration

### Required Secrets (Add to Settings → Secrets and variables → Actions)

**Vercel Deployment:**
```
VERCEL_TOKEN              → Get from Vercel account settings
VERCEL_ORG_ID             → From Vercel dashboard
VERCEL_BACKEND_PROJECT_ID → Project ID for backend
VERCEL_FRONTEND_PROJECT_ID → Project ID for frontend
```

**Database:**
```
MONGODB_URI               → Production MongoDB connection string
                            Format: mongodb+srv://user:pass@cluster.mongodb.net/pva-bazaar
```

**API Secrets:**
```
JWT_SECRET                → Generate: openssl rand -hex 32
ADMIN_SECRET_CODE         → Custom secure admin code
```

**Optional Services:**
```
SENTRY_DSN                → From Sentry.io (error tracking)
STRIPE_SECRET_KEY         → From Stripe (payments)
SENTRY_AUTH_TOKEN         → For source map uploads
```

### How to Add Secrets
1. Go to GitHub repo → Settings
2. Click "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add each secret name and value
5. GitHub Actions will use them in workflows

---

## 🚀 Vercel Backend Deployment

### Project Setup
1. [ ] Backend project created in Vercel
2. [ ] Connected to GitHub repository
3. [ ] Production branch set to `main`

### Environment Variables in Vercel
Set in Vercel Project Settings → Environment Variables:

```
MONGODB_URI               → mongodb+srv://...
JWT_SECRET                → from GitHub Secrets
ADMIN_SECRET_CODE         → from GitHub Secrets
STRIPE_SECRET_KEY         → from GitHub Secrets (if using Stripe)
NODE_ENV                  → production
SENTRY_DSN                → from GitHub Secrets (optional)
SENTRY_ENVIRONMENT        → production
```

### Deployment Verification
- [ ] Build succeeds: `npm run build`
- [ ] Health endpoint works: `https://api.pvabazaar.org/health`
- [ ] CORS headers present in responses
- [ ] No 500 errors in Vercel logs

### Rollback Plan
If deployment fails:
1. Check Vercel build logs for errors
2. Verify all env vars are set
3. Check MongoDB connection string
4. Revert commit: `git revert <commit>`
5. Push to main (triggers new deployment)

---

## 🎨 Vercel Frontend Deployment

### Project Setup
1. [ ] Frontend project created in Vercel (or use GitHub Pages)
2. [ ] Connected to GitHub repository
3. [ ] Build command: `npm run build`
4. [ ] Output directory: `dist`
5. [ ] Production branch: `main`

### Environment Variables in Vercel
Set in Vercel Project Settings → Environment Variables:

```
VITE_API_URL              → https://api.pvabazaar.org
VITE_CLOUDINARY_CLOUD_NAME → from Cloudinary
VITE_CLOUDINARY_UPLOAD_PRESET → from Cloudinary
```

### Pre-Build Checks
- [ ] All VITE_* env vars defined
- [ ] No `import.meta.env` references to undefined vars
- [ ] Build output is in `dist/`
- [ ] All static files copied to dist

### Deployment Verification
- [ ] Build succeeds without warnings
- [ ] Site loads at https://pvabazaar.org
- [ ] API calls work (check Network tab in DevTools)
- [ ] CORS headers correct (Origin matches frontend URL)
- [ ] No VITE_API_URL validation errors

---

## 🗄️ MongoDB Production Setup

### Atlas Configuration
- [ ] Cluster created (M0 free tier or higher)
- [ ] Firewall whitelist includes Vercel IPs (or allow 0.0.0.0/0 for flexibility)
- [ ] User created with proper permissions
- [ ] Connection string available

### Connection String
Format: `mongodb+srv://username:password@cluster.mongodb.net/pva-bazaar`

### Verification
Test in backend before deployment:
```bash
# In terminal with env vars set:
node -e "
const uri = process.env.MONGODB_URI;
const mongoose = require('mongoose');
mongoose.connect(uri).then(() => {
  console.log('✅ MongoDB connected');
  process.exit(0);
}).catch(err => {
  console.error('❌ MongoDB error:', err.message);
  process.exit(1);
});
"
```

---

## 🔒 Security Checklist

### Secrets & API Keys
- [ ] No secrets in git history
- [ ] All secrets in GitHub Secrets or Vercel env vars
- [ ] `JWT_SECRET` is strong (32+ characters)
- [ ] `ADMIN_SECRET_CODE` is not easy to guess
- [ ] Stripe API key is secret (not publishable)

### CORS Configuration
- [ ] Only allows intended origins (pvabazaar.org + www)
- [ ] Credentials enabled for allowed origins
- [ ] No `Access-Control-Allow-Origin: *` with credentials
- [ ] All methods and headers explicitly listed

### Code Review
- [ ] No sensitive data in console.logs
- [ ] No credentials in error messages
- [ ] Sentry scrubbing enabled (PII/tokens filtered)
- [ ] Rate limiting enabled for sensitive routes

### HTTPS & Domains
- [ ] SSL certificate installed (Vercel provides automatic)
- [ ] Redirects http → https
- [ ] CNAME configured for pvabazaar.org
- [ ] www subdomain properly set up

---

## 📊 Monitoring & Alerts

### Sentry Error Tracking
- [ ] SENTRY_DSN configured in backend
- [ ] Source maps uploaded (requires SENTRY_AUTH_TOKEN)
- [ ] Alerts configured for critical errors
- [ ] Team members added to Sentry project

### Vercel Analytics
- [ ] Web Analytics enabled
- [ ] Performance monitoring active
- [ ] Build logs accessible
- [ ] Deployment notifications enabled

### Uptime Monitoring
- [ ] Health check endpoint monitored: `https://api.pvabazaar.org/health`
- [ ] Frontend availability monitored: `https://pvabazaar.org`
- [ ] Alerts set for downtime
- [ ] Status page updated

---

## 🧪 Post-Deployment Testing

### Manual Testing
1. [ ] Frontend loads without errors
2. [ ] Can browse products
3. [ ] Can search/filter
4. [ ] Can add to cart
5. [ ] Checkout flow works
6. [ ] Admin panel accessible (with ADMIN_SECRET_CODE)
7. [ ] File uploads work (Cloudinary)

### API Testing
```bash
# Health check
curl https://api.pvabazaar.org/health

# Get products
curl https://api.pvabazaar.org/api/products

# Check CORS
curl -X OPTIONS https://api.pvabazaar.org/api/products \
  -H "Origin: https://pvabazaar.org"
```

### Cross-Browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Mobile (iOS Safari, Chrome Mobile)

### Performance Checks
- [ ] Frontend loads in < 3 seconds
- [ ] API responses < 500ms
- [ ] No unused CSS/JS in build
- [ ] Images optimized
- [ ] Lighthouse score > 80

---

## 📋 CI/CD Pipeline Status

### GitHub Actions Workflows
- [x] deploy-backend.yml - Configured
- [x] deploy-frontend.yml - Configured
- [x] quality-gates.yml - Configured
- [x] security-audit.yml - Configured
- [x] secret-scan.yml - Configured

### Workflow Triggers
- [x] Trigger on push to main
- [x] Trigger on pull requests
- [x] Manual trigger option available
- [ ] All checks pass for deployment

### What Workflows Do
1. **deploy-backend.yml**
   - Runs on push to main
   - Builds backend
   - Deploys to Vercel
   - Sets environment variables

2. **deploy-frontend.yml**
   - Runs on push to main
   - Builds frontend (Vite)
   - Deploys to Vercel/GitHub Pages
   - Uploads Sentry source maps

3. **quality-gates.yml**
   - Runs on PRs
   - Linting checks
   - Type checking
   - Security scanning

4. **security-audit.yml**
   - Scans dependencies for vulnerabilities
   - Checks for hardcoded secrets

---

## 🚨 Troubleshooting Deployment

### Backend Won't Deploy
**Error: "Missing environment secrets"**
- Solution: Add all required secrets to GitHub Actions or Vercel

**Error: "MongoDB connection failed"**
- Solution: Verify MONGODB_URI is correct, whitelist Vercel IPs

**Error: "Build failed"**
- Solution: Check workflow logs, run `npm run build` locally

### Frontend Won't Deploy
**Error: "VITE_API_URL is pointing to localhost"**
- Solution: Set VITE_API_URL to production API URL in Vercel

**Error: "Build is too large"**
- Solution: Code split using dynamic imports, lazy load components

### CORS Errors in Production
**Error: "Access to XMLHttpRequest blocked by CORS"**
- Solution: Verify backend CORS config includes frontend domain
- Check backend logs for CORS issue details

---

## ✅ Launch Readiness Criteria

**All items below must be checked before going live:**

### Code
- [ ] No errors in build
- [ ] No console.logs with sensitive data
- [ ] All tests passing
- [ ] Code reviewed

### Configuration
- [ ] All environment variables set (GitHub Secrets + Vercel)
- [ ] CORS configured for production domains
- [ ] MongoDB production URL verified
- [ ] JWT_SECRET is strong

### Monitoring
- [ ] Sentry connected and receiving errors
- [ ] Health checks working
- [ ] Error notifications enabled
- [ ] Status page up to date

### Testing
- [ ] Manual testing passed
- [ ] Cross-browser testing passed
- [ ] Performance acceptable (Lighthouse > 80)
- [ ] Security audit passed

### Deployment
- [ ] GitHub Actions workflows configured
- [ ] Vercel projects set up
- [ ] DNS records updated
- [ ] SSL certificates active

---

## 🎉 Post-Launch Checklist

After deployment goes live:

- [ ] Monitor error rates (Sentry)
- [ ] Check performance metrics (Vercel Analytics)
- [ ] Verify uptime (monitoring service)
- [ ] Test core functionality
- [ ] Gather user feedback
- [ ] Update status page
- [ ] Celebrate! 🎊

---

## 📞 Support & Escalation

**If deployment fails:**
1. Check Vercel build logs
2. Review GitHub Actions workflow logs
3. Verify environment variables
4. Check database connectivity
5. Rollback previous commit if needed

**Key Contacts:**
- Vercel Support: https://vercel.com/support
- MongoDB Support: https://www.mongodb.com/support
- Sentry Support: https://sentry.io/support/
- GitHub Support: https://support.github.com/

---

**Last Updated:** January 21, 2026
**Version:** 1.0
**Status:** Ready for Production
