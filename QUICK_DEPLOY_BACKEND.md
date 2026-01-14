# ⚡ Quick Deployment Guide - Backend to Vercel

**Time**: 15 minutes | **Difficulty**: Beginner

---

## 🎯 What You're Doing

Deploying your Node.js backend API to Vercel so your frontend on GitHub Pages can talk to it.

---

## 📋 Before You Start

Have these ready:
1. Your **MongoDB connection string** (looks like `mongodb+srv://...`)
2. Your **JWT secret** (from your local `.env` file)

---

## 🚀 Step-by-Step Instructions

### 1. Go to Vercel (2 min)

1. Visit **https://vercel.com**
2. Log in with GitHub
3. Click **"Add New"** → **"Project"**
4. Find and click **"PVAGR/pva-bazaar-app"**
5. Click **"Import"**

---

### 2. Set Root Directory ⚠️ CRITICAL (1 min)

On the configuration screen:

1. Find **"Root Directory"**
2. Click **"Edit"**
3. Type: **`backend`**
4. Click **Save**

> ⚠️ **This is the most important step!** Without this, Vercel will try to deploy the whole repo.

---

### 3. Leave Build Settings Blank (0 min)

Don't touch these - leave them empty:
- Framework Preset: **Other**
- Build Command: *(empty)*
- Output Directory: *(empty)*
- Install Command: *(empty)*

---

### 4. Add Environment Variables (5 min)

Scroll down to **"Environment Variables"**

Click **"Add Environment Variable"** and add these 4:

| Name | Value | Where to Find It |
|------|-------|------------------|
| `MONGODB_URI` | `mongodb+srv://...` | Your local `.env` file |
| `JWT_SECRET` | `your-secret-key` | Your local `.env` file |
| `NODE_ENV` | `production` | Type exactly this |
| `ALLOWED_ORIGIN` | `https://pvabazaar.org` | Type exactly this |

Click **"Add"** after each one.

---

### 5. Deploy! (3 min)

1. Click the big **"Deploy"** button
2. Wait 3-5 minutes
3. When you see **"Congratulations!"**, you're done! 🎉
4. **IMPORTANT**: Copy the URL Vercel gives you

It will look like: `https://pva-bazaar-backend-abc123.vercel.app`

> 💡 You might see a warning about "dist not found" - **ignore it**! This is normal for Node.js APIs.

---

### 6. Update Frontend Configuration (2 min)

Open `Frontend/.env.production` in your code editor:

**Change this:**
\`\`\`env
VITE_API_URL=https://pva-bazaar-backend.vercel.app
\`\`\`

**To this:**
\`\`\`env
VITE_API_URL=https://your-actual-url-from-step-5.vercel.app
\`\`\`

**Save the file.**

---

### 7. Commit and Push (1 min)

In your terminal:

\`\`\`bash
git add Frontend/.env.production
git commit -m "chore: Connect frontend to Vercel backend"
git push
\`\`\`

This will automatically trigger a new frontend deployment.

---

### 8. Wait and Verify (2 min)

1. Wait 2-3 minutes for GitHub Actions to rebuild your frontend
2. Go to **https://pvabazaar.org**
3. Press **Ctrl+Shift+R** to hard refresh
4. ✅ Your site should now work (no blank screen!)

---

## ✅ Success Checklist

After completing all steps:

- [ ] Backend is live on Vercel
- [ ] I copied the Vercel backend URL
- [ ] I updated `Frontend/.env.production` with the real URL
- [ ] I committed and pushed the change
- [ ] GitHub Actions finished rebuilding
- [ ] https://pvabazaar.org loads with content (not blank)

---

## 🚨 Troubleshooting

### Still Seeing a Blank Screen?

1. Open browser Developer Tools (press **F12**)
2. Go to **Console** tab
3. Look for error messages

**Common fixes:**
- Hard refresh again: **Ctrl+Shift+R**
- Check that you updated `.env.production` with the correct URL
- Wait 5 minutes and try again (caching)

### CORS Error?

1. Go to Vercel Dashboard → Your project → **Settings** → **Environment Variables**
2. Check that `ALLOWED_ORIGIN` is exactly: `https://pvabazaar.org` (no trailing slash)
3. If wrong, fix it and click **"Redeploy"** in the Deployments tab

### 503 or 401 Error?

1. Your environment variables are missing or wrong
2. Go to Vercel → **Settings** → **Environment Variables**
3. Make sure all 4 are there and correct
4. Redeploy

---

## 📞 Need More Help?

See the full detailed guide: **[VERCEL_BACKEND_DEPLOYMENT.md](./VERCEL_BACKEND_DEPLOYMENT.md)**

---

**That's it! You're done!** 🎉

Your site should now be fully working with the frontend on GitHub Pages talking to your backend on Vercel.
