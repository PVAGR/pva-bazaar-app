# PVA Bazaar - Deployment Guide

## Overview

This project has a dual deployment strategy:

- **Frontend**: GitHub Pages (public, served at github.io)
- **Backend**: Vercel (serverless API)

---

## 🚀 Frontend Deployment (GitHub Pages)

### Automatic Deployment

The frontend automatically deploys to GitHub Pages on every push to `main` branch.

**Workflow**: `.github/workflows/deploy-to-github-pages.yml`

### GitHub Pages Configuration

1. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Select "Deploy from a branch"
   - Choose: `gh-pages` branch
   - Click Save

2. **URL**: `https://PVAGR.github.io/pva-bazaar-app/`

### Frontend Build

```bash
cd Frontend
npm install
npm run build
```

Output: `Frontend/dist/`

### Environment Variables (GitHub Actions)

```
VITE_API_URL=https://pva-bazaar-api.vercel.app
VITE_BASE_PATH=/pva-bazaar-app/
```

---

## 🔧 Backend Deployment (Vercel)

### Required Secrets in GitHub

Add these secrets to your repository settings (Settings → Secrets and variables → Actions):

| Secret                      | Value                       | Example                             |
| --------------------------- | --------------------------- | ----------------------------------- |
| `VERCEL_TOKEN`              | Your Vercel API token       | `abc123...`                         |
| `VERCEL_ORG_ID`             | Your Vercel organization ID | `team_abc123`                       |
| `VERCEL_BACKEND_PROJECT_ID` | Backend project ID          | `prj_abc123`                        |
| `MONGODB_URI`               | MongoDB connection string   | `mongodb+srv://...`                 |
| `JWT_SECRET`                | JWT signing secret          | `your-secret-key`                   |
| `VITE_API_URL`              | Backend API URL             | `https://pva-bazaar-api.vercel.app` |

### Get Your Vercel IDs

**1. Find Vercel Token:**

```bash
# Go to https://vercel.com/account/tokens
# Create a new token and copy it
```

**2. Find Organization ID:**

```bash
# After linking project to Vercel:
vercel link
# Run: vercel env list
# Or find in .vercel/project.json
```

**3. Create Projects on Vercel:**

For Backend:

```bash
cd backend
vercel link
# Follow prompts to create "pva-bazaar-api" project
# Copy the project ID from .vercel/project.json
```

### Backend Deployment Flow

1. **Environment Setup**:
   - Create `.env` file in `backend/` with required variables
   - Add secrets to GitHub repository

2. **Deploy**:

   ```bash
   git push origin main
   ```

   - Workflow: `.github/workflows/deploy-backend.yml`
   - Automatically deploys to Vercel when `backend/` files change

3. **Verify**:
   - Check Vercel Dashboard
   - URL: `https://pva-bazaar-api.vercel.app`

---

## 📋 Deployment Checklist

### Initial Setup

- [ ] Create Vercel account & projects
- [ ] Generate Vercel tokens & IDs
- [ ] Add all secrets to GitHub
- [ ] Enable GitHub Pages in repository settings
- [ ] Configure MongoDB Atlas (or use local MongoDB)

### Before First Deployment

- [ ] Update `VITE_API_URL` in GitHub secrets
- [ ] Ensure `backend/.env` has all required variables
- [ ] Test frontend build locally: `npm run build`
- [ ] Test backend locally: `npm run dev:backend`

### Monitor Deployments

- [ ] GitHub Actions tab → View workflow runs
- [ ] Check GitHub Pages deployment status
- [ ] Verify Vercel dashboard for backend
- [ ] Test API endpoints after deployment

---

## 🔍 Troubleshooting

### GitHub Pages Not Updating

```bash
# Force rebuild
git commit --allow-empty -m "Force rebuild"
git push origin main
```

### Frontend Can't Connect to API

- Check `VITE_API_URL` environment variable
- Verify backend is running on Vercel
- Check CORS settings in `backend/api/index.js`
- Test API directly: `curl https://pva-bazaar-api.vercel.app/api/health`

### Vercel Deployment Fails

- Check `backend/package.json` for all dependencies
- Verify `backend/vercel.json` configuration
- Check build logs: `vercel logs`
- Ensure `.env` variables are in GitHub secrets

### MongoDB Connection Error

- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist (allow Vercel IPs)
- Test connection locally first

---

## 📚 Links

- **Frontend**: https://PVAGR.github.io/pva-bazaar-app/
- **Backend API**: https://pva-bazaar-api.vercel.app
- **GitHub Repository**: https://github.com/PVAGR/pva-bazaar-app
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## 🛠️ Manual Deployment

### Frontend

```bash
cd Frontend
npm run build
# Output in Frontend/dist/
```

### Backend

```bash
cd backend
npm install
vercel --prod
```

---

## 📝 Environment Variables

### Frontend (.env or GitHub Secrets)

```
VITE_API_URL=https://pva-bazaar-api.vercel.app
VITE_BASE_PATH=/pva-bazaar-app/
```

### Backend (.env)

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pvabazaar
JWT_SECRET=your-jwt-secret-key
NODE_ENV=production
```

---

**Last Updated**: January 14, 2026
