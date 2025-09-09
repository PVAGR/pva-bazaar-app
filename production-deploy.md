# PVA Bazaar Production Deployment Guide

## Environment Setup

### Backend (.env file)
```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/pvabazaar?retryWrites=true&w=majority
JWT_SECRET=<strong-production-secret>
ETHEREUM_RPC_URL=https://mainnet.base.org
ADMIN_WALLET_PUBLIC=0x463ace850a958e768618361e352fe9efe31d5d0e
ALLOWED_ORIGIN=https://pvabazaar.org
```

### Frontend (config.js)
Update the `Frontend/config.js` file to point to your production API:

```javascript
const config = {
  apiUrl: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production')
    ? 'https://api.pvabazaar.org/api'
    : '/api'
};

export default config;
```

## Deployment Steps

### Backend Deployment (Vercel)

1. Ensure `vercel.json` is properly configured:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

2. Deploy to Vercel:
```bash
cd backend
vercel --prod
```

3. Set environment variables in Vercel dashboard.

### Frontend Deployment

1. Build the frontend:
```bash
cd Frontend
npm run build
```

2. Deploy the `dist` folder to your hosting provider (Vercel, Netlify, etc.)

3. Configure custom domain if needed.

## Post-Deployment Checks

1. Verify API connectivity: `https://api.pvabazaar.org/api/health`
2. Test authentication: Login with admin user
3. Verify artifact listings are loading
4. Check artifact details pages
5. Test provenance verification

## Database Migration

If switching from development (in-memory) to production MongoDB:

1. Export data from development:
```bash
cd backend
node scripts/export-data.js > backup.json
```

2. Import to production:
```bash
cd backend
MONGODB_URI=<production-uri> node scripts/import-data.js backup.json
```

## Scaling Considerations

1. Add Redis caching for frequent queries
2. Implement CDN for frontend assets and artifact images
3. Set up proper MongoDB indexing for search queries
4. Configure rate limiting for API endpoints
