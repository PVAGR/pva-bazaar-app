# Complete Vercel Backend Deployment Guide

## 🎯 Current Status

✅ **Frontend**: Deployed to GitHub Pages at https://pvabazaar.org  
✅ **Backend Code**: Production-ready with proper serverless configuration  
⚠️ **Backend Deployment**: Not yet deployed to Vercel  
❌ **Connection**: Frontend needs backend URL

---

## 📋 Step-by-Step Deployment Instructions

### PART 1: Deploy Backend to Vercel (10 minutes)

#### Step 1: Go to Vercel and Import Project

1. Go to **https://vercel.com** and log in with your GitHub account
2. Click **"Add New"** button (top left corner)
3. Select **"Project"**
4. Click **"Import Git Repository"**
5. Find and select **`PVAGR/pva-bazaar-app`**
6. Click **"Import"**

#### Step 2: Configure Root Directory ⚠️ CRITICAL

This is the most important step! Vercel needs to know your backend is in a subdirectory.

1. Look for the **"Root Directory"** section
2. Click **"Edit"** next to it
3. Type: **`backend`**
4. Click **"Save"** or confirm

#### Step 3: Configure Build Settings

Leave these settings as-is (Vercel will auto-detect):

- **Framework Preset**: Other (or None)
- **Build Command**: _(leave blank)_
- **Output Directory**: _(leave blank)_
- **Install Command**: _(leave blank)_

> ⚠️ **IMPORTANT**: You may see warnings about "dist folder not found" during deployment.  
> **This is NORMAL for Node.js serverless functions!** Your backend uses `@vercel/node`, not static files.  
> The deployment will still work correctly. ✅

#### Step 4: Add Environment Variables 🔐

Scroll down to **"Environment Variables"** section.

Add these 4 variables (click "Add Environment Variable" for each):

##### Variable 1: MONGODB_URI

- **Name**: `MONGODB_URI`
- **Value**: Your MongoDB connection string from your local `.env`
  - Example: `mongodb+srv://username:password@cluster.mongodb.net/pvabazaar`
- Click **"Add"**

##### Variable 2: JWT_SECRET

- **Name**: `JWT_SECRET`
- **Value**: Your JWT secret key from your local `.env`
  - Example: `your-super-secret-key-here`
  - **Must be the same as local development** or tokens won't work
- Click **"Add"**

##### Variable 3: NODE_ENV

- **Name**: `NODE_ENV`
- **Value**: `production`
- Click **"Add"**

##### Variable 4: ALLOWED_ORIGIN

- **Name**: `ALLOWED_ORIGIN`
- **Value**: `https://pvabazaar.org`
- Click **"Add"**

#### Step 5: Deploy! 🚀

1. Click the big **"Deploy"** button at the bottom
2. Wait 3-5 minutes while Vercel builds and deploys
3. ✅ You'll see: "Congratulations! Your project has been successfully deployed."
4. **COPY THE URL** - It will look like: `https://pva-bazaar-backend-xyz123.vercel.app`

---

### PART 2: Connect Frontend to Backend (5 minutes)

#### Step 6: Update Frontend Environment File

1. Open `Frontend/.env.production` (already created for you)
2. Update the backend URL:

\`\`\`env
VITE_API_URL=https://your-actual-backend-url.vercel.app
\`\`\`

Replace `your-actual-backend-url` with the URL Vercel gave you in Step 5.

3. **Commit and push this change**:

\`\`\`bash
git add Frontend/.env.production
git commit -m "chore: Connect frontend to Vercel backend"
git push
\`\`\`

#### Step 7: Add GitHub Secret (Optional but Recommended)

This allows you to change the backend URL without editing code:

1. Go to your GitHub repo: **https://github.com/PVAGR/pva-bazaar-app**
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Fill in:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-actual-backend-url.vercel.app` (same as Step 6)
5. Click **"Add secret"**

#### Step 8: Trigger Frontend Rebuild

1. Go to **Actions** tab in GitHub
2. Find your frontend deployment workflow (should be "Deploy to GitHub Pages" or similar)
3. Click **"Run workflow"** button
4. Wait 2-3 minutes for deployment to complete

---

### PART 3: Verify Everything Works! ✅

#### Step 9: Test the Site

1. Go to **https://pvabazaar.org** in your browser
2. Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac) to hard refresh
3. Open browser **Developer Tools** (F12)
4. Go to **Console** tab
5. Look for any errors

**Expected Result**: ✅ Your site loads with content, no blank screen!

#### Step 10: Test Backend Directly

Test your backend API directly:

\`\`\`bash
curl https://your-actual-backend-url.vercel.app/api/health
\`\`\`

**Expected Response**:
\`\`\`json
{
"ok": true,
"message": "API is healthy",
"timestamp": "2026-01-03T..."
}
\`\`\`

---

## 🔧 Troubleshooting

### Problem: Blank White Screen

**Solution**:

1. Hard refresh: **Ctrl+Shift+R**
2. Open Console (F12), check for errors
3. If you see "Failed to fetch from localhost" → Frontend didn't get the new backend URL
4. Verify `Frontend/.env.production` has the correct URL
5. Re-run the frontend workflow in GitHub Actions

### Problem: CORS Error

**Error**: "Access to fetch has been blocked by CORS policy"

**Solution**:

1. Go to Vercel → Your backend project → **Settings** → **Environment Variables**
2. Check that `ALLOWED_ORIGIN` is set to `https://pvabazaar.org` (no trailing slash)
3. If missing or wrong, update it
4. Go to **Deployments** tab → Click **...** on latest → **Redeploy**

### Problem: "401 Unauthorized" or "503 Service Not Configured"

**Solution**:

1. Your environment variables are missing or incorrect
2. Go to Vercel → Your project → **Settings** → **Environment Variables**
3. Verify all 4 variables are set:
   - `MONGODB_URI` (must be valid connection string)
   - `JWT_SECRET` (must match local dev)
   - `NODE_ENV` (must be `production`)
   - `ALLOWED_ORIGIN` (must be `https://pvabazaar.org`)
4. Redeploy after fixing

### Problem: "Failed to connect to MongoDB"

**Solution**:

1. Check your MongoDB Atlas cluster is running
2. Verify your connection string is correct
3. Make sure your IP address is whitelisted in MongoDB Atlas:
   - Go to MongoDB Atlas → Network Access
   - Add `0.0.0.0/0` to allow all IPs (Vercel uses dynamic IPs)
4. Redeploy backend after fixing

### Problem: Vercel says "dist not found"

**This is NORMAL!** ✅

Your backend uses `@vercel/node` for serverless functions, not static files. The warning appears because Vercel initially looks for static files, but then correctly uses the Node.js runtime. **Ignore this warning** - your deployment will work.

---

## 📝 Important Files Reference

### Backend Configuration

**`backend/vercel.json`** ✅ Already configured correctly:
\`\`\`json
{
"version": 2,
"builds": [{"src": "api/index.js", "use": "@vercel/node"}],
"routes": [
{"src": "/api/(.*)", "dest": "api/index.js"},
{"src": "/(.*)", "dest": "api/index.js"}
],
"env": {
"NODE_ENV": "production",
"ALLOWED_ORIGIN": "https://pvabazaar.org"
}
}
\`\`\`

**`backend/api/index.js`** ✅ Properly configured:

- CORS allows `https://pvabazaar.org`
- Environment variable validation
- MongoDB connection with fallback
- Serverless-optimized connection caching

### Frontend Configuration

**`Frontend/.env.production`** ✅ Created:
\`\`\`env
VITE_API_URL=https://pva-bazaar-backend.vercel.app
\`\`\`

**`Frontend/vite.config.js`** ✅ Correct:
\`\`\`javascript
export default defineConfig({
base: '/', // ✅ Correct for root domain
// ...
})
\`\`\`

**`Frontend/src/lib/api.js`** ✅ Uses environment variable:
\`\`\`javascript
const envApiUrl = import.meta.env.VITE_API_URL;
if (envApiUrl) return envApiUrl;
\`\`\`

---

## 🎉 Success Checklist

After completing all steps, verify:

- [ ] Backend deployed on Vercel with custom domain URL
- [ ] All 4 environment variables added to Vercel
- [ ] `Frontend/.env.production` has correct backend URL
- [ ] Frontend redeployed to GitHub Pages
- [ ] https://pvabazaar.org loads with content (not blank)
- [ ] Browser console shows no CORS errors
- [ ] Backend health check responds: `curl https://your-backend.vercel.app/api/health`

---

## 🆘 Need Help?

If you're still stuck after trying these steps:

1. Check the browser console (F12) for specific error messages
2. Check Vercel deployment logs: Vercel Dashboard → Your Project → Deployments → Click latest → View logs
3. Verify your MongoDB cluster is running and accessible
4. Make sure all environment variables are correct (no typos, no extra spaces)

---

**Estimated Total Time**: 15-20 minutes  
**Difficulty**: Beginner-friendly with step-by-step instructions  
**Result**: Fully working site with frontend on GitHub Pages and backend on Vercel! 🎉
