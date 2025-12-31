# PVA Bazaar - Full Vercel Deployment Setup

## Vercel Status Check Results

```bash
🚀 PVA Bazaar - Vercel Status Check
=================================

Vercel CLI 47.0.5
47.0.5
--- TOKEN ---
--- WHOAMI ---
❌ Not logged in to Vercel (authentication required for deployment)
```

## Deployment Configuration

### Root Level Configuration
- ✅ **vercel.json** updated for full-stack deployment
- ✅ **Vercel CLI** installed (v47.0.5)
- ✅ **Frontend** configured with Vite build system
- ✅ **Backend** configured as serverless function

### Backend Configuration
- **Entry Point**: `backend/server.js` (serverless wrapper)
- **API Handler**: `backend/api/index.js` (Express app)
- **Runtime**: `@vercel/node`
- **Environment**: Production mode enabled

### Frontend Configuration  
- **Framework**: Vite
- **Build Command**: `cd Frontend && npm install && npm run build`
- **Output Directory**: `Frontend/dist`
- **API Proxy**: Configured for production API endpoints
 - **Root Directory (Vercel Settings)**: set to `Frontend` (case-sensitive). Do not use `frontend` or `frontend `.

## Deployment Steps

### 1. Authentication Required
```bash
vercel login
# Choose authentication method (GitHub recommended)
```

### 2. Deploy Full Stack App
```bash
# From project root
vercel --prod
```

### 3. Environment Variables Setup
Configure in Vercel Dashboard or via CLI:

Backend (serverless API):
- `MONGODB_URI`: Production MongoDB connection string
- `JWT_SECRET`: Strong production secret
- `NODE_ENV`: production
- `ETHEREUM_RPC_URL`: https://mainnet.base.org
- `ALLOWED_ORIGIN`: https://your-frontend-domain

Frontend (static + serverless helpers):
- `BACKEND_URL`: URL of your Backend deployment (e.g., `https://pvabazaar-backend.vercel.app`).
	- When set, frontend serverless APIs (`/api/blogs/*`, `/api/comments/*`) proxy to Backend for persistence.
	- When not set, they run in serverless demo mode (in-memory).

CLI example:
```
cd Frontend
vercel env set BACKEND_URL https://<your-backend-domain> production
vercel env set BACKEND_URL https://<your-backend-domain> preview
vercel env set BACKEND_URL https://<your-backend-domain> development
vercel redeploy --prod --yes
```

### 4. Domain Configuration
- Set up custom domain in Vercel dashboard
- Alias Frontend to `pvabazaar.org`:
```
cd Frontend
vercel alias pvabazaar-frontend.vercel.app pvabazaar.org
```
- Ensure DNS CNAME points to `cname.vercel-dns.com`.
- Backend CORS: allow the aliased frontend domain or rely on serverless proxy (calls originate from Vercel functions).

## Verification Commands

The exact commands requested have been implemented and tested:

```bash
vercel --version
echo "--- TOKEN ---"
env | grep -i VERCEL | sed -e 's/=.*/=***hidden***/'
echo "--- WHOAMI ---"
vercel whoami || true
```

## Next Steps

1. **Login to Vercel**: `vercel login`
2. **Deploy**: `vercel --prod` 
3. **Configure Environment Variables** in Vercel dashboard
4. **Test Deployment**: Verify API endpoints and frontend functionality
5. **Set Custom Domain** (optional)

## Notes

- Authentication is required before deployment
- Environment variables must be configured in Vercel dashboard
- Full-stack deployment is configured to serve frontend and API together
- Backend runs as serverless functions for optimal performance and cost