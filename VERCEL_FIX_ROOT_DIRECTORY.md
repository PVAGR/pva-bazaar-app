# FIX: Vercel Backend Deployment - Root Directory Issue

**Problem**: Vercel can't find the "backend" root directory  
**Error**: "The specified Root Directory 'backend' does not exist"  
**Status**: Configuration issue (not code issue)

---

## Solution

The fix has been applied to `backend/vercel.json` with explicit `./` paths.

However, you also need to fix the Vercel project settings:

### Step 1: Go to Vercel Project Settings
1. Visit: https://vercel.com/dashboard
2. Select your project: `pva-bazaar-app`
3. Click "Settings"

### Step 2: Update Root Directory
1. Go to "General" section
2. Find "Root Directory" setting
3. **CHANGE FROM**: `backend`  
4. **CHANGE TO**: `.` (dot/period) or leave empty
5. Click "Save"

### Step 3: Redeploy
1. Go back to "Deployments" tab
2. Click "Redeploy" on the latest failed deployment
3. Vercel will re-run with the correct root directory

---

## Why This Happens

The repository structure is:
```
pva-bazaar-app/
├── backend/          ← Backend code here
│   ├── api/
│   ├── package.json
│   └── vercel.json
├── Frontend/         ← Frontend code here
└── ... other files
```

When Vercel clones the repository, it starts at the repository root. Setting root directory to "backend" tells Vercel to go INTO that folder and treat it as the project root.

However, if the root directory is set incorrectly, Vercel looks for a folder called "backend" INSIDE the backend folder (doesn't exist).

---

## What Was Fixed

### backend/vercel.json
Changed all paths to use explicit `./` format:

**Before**:
```json
"src": "api/index.js",
"dest": "api/index.js"
```

**After**:
```json
"src": "./api/index.js",
"dest": "./api/index.js"
```

This helps Vercel correctly resolve paths regardless of root directory configuration.

---

## Testing

After fixing in Vercel dashboard:

1. Navigate to: https://vercel.com/dashboard/pva-bazaar-app
2. Click "Redeploy" on latest deployment
3. Check build logs for success
4. Once deployed, test: `curl https://pva-bazaar-api.vercel.app/api/health`
5. Expected response: `{"ok":true,"message":"Health route is working!"}`

---

## Quick Fix Checklist

- [x] Updated backend/vercel.json with explicit paths ✅
- [ ] Update Vercel project root directory setting to `.` 
- [ ] Redeploy in Vercel dashboard
- [ ] Verify deployment completes
- [ ] Test health endpoint

---

**Note**: The root directory fix must be done through the Vercel dashboard. It cannot be done through code configuration.
