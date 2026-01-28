# ✅ PRODUCTION SETUP CHECKLIST

## Generated Secrets (Keep Safe!)

```
NEXTAUTH_SECRET=yIklmeTFv8pLDoY6Qu7SEbRzK5nBCgqJZjXtW2cUdr3MGs4OxHPw1Af0haN9
DID_SEED=2668c0dee48b9810fda17ec69c95f489a5c031fa15e650dc7fda528c5ff5c646
```

## Configuration Steps

### ✅ Step 1: Backend Environment Variables
- [x] MONGODB_URI - Already configured
- [x] JWT_SECRET - Already configured  
- [x] ADMIN_SECRET_CODE - Already configured
- [x] NODE_ENV - Set to production
- [x] ETHEREUM_RPC_URL - Configured
- [x] ALLOWED_ORIGIN - Configured

**Status**: COMPLETE ✅

### ⏳ Step 2: Livestream Environment Variables

**Action**: Add to https://vercel.com/pvagrs-projects/pvabazaar-livestream/settings/environment-variables

Variables to add (select: Production + Preview + Development):

- [ ] `NEXTAUTH_URL` = `https://pvabazaar-livestream-o3okjf15o-pvagrs-projects.vercel.app`
- [ ] `NEXTAUTH_SECRET` = `yIklmeTFv8pLDoY6Qu7SEbRzK5nBCgqJZjXtW2cUdr3MGs4OxHPw1Af0haN9`
- [ ] `NEXT_PUBLIC_API_URL` = `https://pva-backend-h6zkzdmjy-pvagrs-projects.vercel.app`
- [ ] `DID_SEED` = `2668c0dee48b9810fda17ec69c95f489a5c031fa15e650dc7fda528c5ff5c646`
- [ ] `NODE_ENV` = `production` (Production only)
- [ ] `MONGODB_URI` = Copy from backend project (all environments)

**Time Required**: 10 minutes

### ⏳ Step 3: Remove Deployment Protection

**Backend**: https://vercel.com/pvagrs-projects/pva-backend-api/settings/deployment-protection
- [ ] Click "Deployment Protection"
- [ ] Select "Only Preview Deployments" or "None"
- [ ] Save changes

**Livestream**: https://vercel.com/pvagrs-projects/pvabazaar-livestream/settings/deployment-protection
- [ ] Click "Deployment Protection"
- [ ] Select "Only Preview Deployments" or "None"  
- [ ] Save changes

**Time Required**: 3 minutes

### ⏳ Step 4: Redeploy Livestream

After adding environment variables:

```powershell
cd pvabazaar-livestream
vercel --prod
```

**Time Required**: 2 minutes

### 🧪 Step 5: Run Tests

After all configuration:

```powershell
# Test backend health
curl https://pva-backend-h6zkzdmjy-pvagrs-projects.vercel.app/api/health

# Test livestream homepage
curl -I https://pvabazaar-livestream-o3okjf15o-pvagrs-projects.vercel.app

# Test frontend
curl -I https://pvabazaar.org

# Browser tests:
# 1. Visit https://pvabazaar-livestream-o3okjf15o-pvagrs-projects.vercel.app
# 2. Sign up with email
# 3. Verify email (or use test account)
# 4. Access dashboard
# 5. Create journal entry
# 6. Verify DID signing works
```

**Time Required**: 10 minutes

---

## Deployment URLs

| Service | URL | Status |
|---------|-----|--------|
| Backend API | https://pva-backend-h6zkzdmjy-pvagrs-projects.vercel.app | 🟢 Running |
| Frontend | https://pvabazaar.org | 🟢 Running |
| Livestream | https://pvabazaar-livestream-o3okjf15o-pvagrs-projects.vercel.app | 🟡 Needs Config |

---

## Deployment Architecture

```
┌────────────────────────────────────────────┐
│         Production Environment             │
└────────────────────────────────────────────┘

Internet Users
    │
    ├─→ https://pvabazaar.org
    │   └─→ Frontend (React + Vite)
    │       └─→ Static hosted on GitHub Pages
    │
    ├─→ https://pva-backend-*.vercel.app
    │   └─→ Backend API (Express.js)
    │       ├─→ MongoDB Atlas
    │       ├─→ Pinata IPFS
    │       └─→ ChromaDB (optional)
    │
    └─→ https://pvabazaar-livestream-*.vercel.app
        └─→ Livestream App (Next.js 16)
            ├─→ NextAuth (JWT-based)
            ├─→ MongoDB Atlas
            ├─→ Pinata IPFS
            ├─→ DID/VC Support
            └─→ Communicates with Backend API
```

---

## Quick Reference

### Copy These Secrets (Ctrl+C)

```
NEXTAUTH_SECRET=yIklmeTFv8pLDoY6Qu7SEbRzK5nBCgqJZjXtW2cUdr3MGs4OxHPw1Af0haN9
DID_SEED=2668c0dee48b9810fda17ec69c95f489a5c031fa15e650dc7fda528c5ff5c646
NEXT_PUBLIC_API_URL=https://pva-backend-h6zkzdmjy-pvagrs-projects.vercel.app
NEXTAUTH_URL=https://pvabazaar-livestream-o3okjf15o-pvagrs-projects.vercel.app
```

### Dashboard Links

- Backend Settings: https://vercel.com/pvagrs-projects/pva-backend-api
- Livestream Settings: https://vercel.com/pvagrs-projects/pvabazaar-livestream
- GitHub Repository: https://github.com/PVAGR/pva-bazaar-app
- MongoDB Atlas: https://cloud.mongodb.com

---

## Estimated Time to Production

- Step 1 (Backend Config): ✅ DONE (0 min)
- Step 2 (Livestream Config): ⏳ 10 minutes
- Step 3 (Remove Protection): ⏳ 3 minutes
- Step 4 (Redeploy): ⏳ 2 minutes
- Step 5 (Testing): ⏳ 10 minutes

**Total Remaining**: ~25 minutes

---

## Success Criteria

- [ ] All environment variables configured
- [ ] Deployment protection removed
- [ ] Backend health check returns 200
- [ ] Livestream homepage loads
- [ ] Frontend loads correctly
- [ ] Signup flow works
- [ ] Journal entry creation works
- [ ] DID signing works

---

**Created**: January 27, 2026  
**Status**: Ready for final configuration  
**Next Action**: Add environment variables to livestream project
