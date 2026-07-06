# ⚡ Quick Start - Deployment Setup (5 Minutes)

## What Just Happened

✅ Deployment pipelines are now configured and committed to GitHub.

**Your new workflows:**

- `.github/workflows/deploy-to-github-pages.yml` - Automatically deploys frontend to GitHub Pages
- `.github/workflows/deploy-backend.yml` - Automatically deploys backend to Vercel
- `.github/workflows/deploy-frontend.yml` - Dual deployment to both GitHub Pages & Vercel

---

## 🎯 NEXT STEPS (Required for Deployment to Work)

### Step 1️⃣: Create Projects on Vercel

**For Backend API:**

```bash
cd backend
npm install -g vercel
vercel link
# Follow prompts → Create new project "pva-bazaar-api"
# It will create: backend/.vercel/project.json
```

**For Frontend (Optional - for preview deployments):**

```bash
cd Frontend
vercel link
# Follow prompts → Create new project "pva-bazaar-frontend"
```

### Step 2️⃣: Get Your Vercel Credentials

Run this command in your terminal:

```bash
cat backend/.vercel/project.json
```

You'll see:

```json
{
  "orgId": "YOUR_ORG_ID",
  "projectId": "YOUR_PROJECT_ID"
}
```

**Save these values!**

### Step 3️⃣: Generate Vercel API Token

1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: `pva-bazaar-github`
4. Expiration: 90 days
5. Copy the token (you won't see it again!)

### Step 4️⃣: Add GitHub Secrets

Either use the helper script or add manually:

**Option A - Automated (Linux/macOS):**

```bash
bash scripts/setup-github-secrets.sh
```

**Option B - Manual:**
Go to: https://github.com/PVAGR/pva-bazaar-app/settings/secrets/actions

Add these secrets:
| Name | Value | Where to Get |
|------|-------|--------------|
| `VERCEL_TOKEN` | Your API token | Vercel account settings |
| `VERCEL_ORG_ID` | From `project.json` | `backend/.vercel/project.json` |
| `VERCEL_BACKEND_PROJECT_ID` | From `project.json` | `backend/.vercel/project.json` |
| `MONGODB_URI` | Your MongoDB connection | MongoDB Atlas or local |
| `JWT_SECRET` | Any secret string | Generate: `openssl rand -base64 32` |
| `VITE_API_URL` | Backend URL | `https://pva-bazaar-api.vercel.app` |

### Step 5️⃣: Enable GitHub Pages

1. Go to: https://github.com/PVAGR/pva-bazaar-app/settings/pages
2. Under "Build and deployment":
   - Source: `Deploy from a branch`
   - Branch: `gh-pages` (it will be created by workflow)
3. Click Save

---

## 🚀 Deploy!

Push a commit to trigger deployments:

```bash
git commit --allow-empty -m "trigger: deploy to production"
git push origin main
```

**Check status:**

- GitHub Actions: https://github.com/PVAGR/pva-bazaar-app/actions
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Pages: https://github.com/PVAGR/pva-bazaar-app/settings/pages

---

## 📍 Where to Find Your Deployments

After first successful deployment:

| Service            | URL                                       | Purpose     |
| ------------------ | ----------------------------------------- | ----------- |
| **GitHub Pages**   | `https://PVAGR.github.io/pva-bazaar-app/` | Frontend UI |
| **Vercel Backend** | `https://pva-bazaar-api.vercel.app`       | REST API    |
| **GitHub Repo**    | `https://github.com/PVAGR/pva-bazaar-app` | Source code |

---

## ✅ Verification Checklist

After setup, verify everything works:

```bash
# 1. Check frontend builds
cd Frontend && npm run build
# Should create: Frontend/dist/

# 2. Check backend starts
cd backend && npm run dev
# Should connect to MongoDB and start on :5000

# 3. Test API
curl http://localhost:5000/api/health
# Should return: 200 OK

# 4. Push to GitHub
git push origin main
# Check Actions tab for workflow runs
```

---

## 🔗 API Integration

Frontend already configured to connect to backend:

**Development**: `http://localhost:5000`
**Production**: Set via `VITE_API_URL` secret

No code changes needed! Just update the environment variable.

---

## 📞 Troubleshooting

### "Workflow not running"

- Check you added all 6 secrets to GitHub
- Verify `.vercel/project.json` exists in backend/
- Try: `git commit --allow-empty -m "trigger" && git push`

### "Backend API returns 500"

- Check MongoDB connection in Vercel logs
- Verify `MONGODB_URI` secret is set correctly
- Test locally first: `npm run dev:backend`

### "Frontend can't reach API"

- Verify `VITE_API_URL` points to correct backend
- Check CORS settings in backend
- Test: `curl $VITE_API_URL/api/health`

### "GitHub Pages not updating"

- Check Actions tab for failed workflows
- Verify gh-pages branch exists in repo
- Try forcing rebuild: commit empty commit + push

---

**Questions?** Check `DEPLOYMENT_SETUP.md` for detailed guide!
