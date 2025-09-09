# PVA Bazaar Production Deployment Guide

## Current Status

You currently have a single static page deployed on pvabazaar.org. To fully deploy the application, we need to:

1. Deploy the backend API
2. Deploy all frontend pages
3. Configure the static site to connect to the API

## Deployment Options

### Option 1: Full Vercel Deployment (Recommended)

This approach uses Vercel for both frontend and backend, providing a seamless deployment experience.

#### Step 1: Deploy Backend API

1. **Prepare your backend**:
   ```bash
   cd backend
   # Ensure vercel.json is properly configured
   cat > vercel.json << EOF
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
   EOF
   ```

2. **Deploy to Vercel**:
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

3. **Set up environment variables in Vercel dashboard**:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Secret for JWT tokens
   - `ALLOWED_ORIGIN`: https://pvabazaar.org

4. **Note your API URL**: (e.g., https://pva-bazaar-api.vercel.app)

#### Step 2: Deploy Frontend

1. **Update frontend configuration**:
   ```bash
   cd Frontend
   
   # Update config.js
   cat > config.js << EOF
   // Production configuration
   const config = {
     apiUrl: 'https://pva-bazaar-api.vercel.app/api'  // Use your actual API URL from step 1
   };
   
   export default config;
   EOF
   ```

2. **Build frontend**:
   ```bash
   npm install
   npm run build
   ```

3. **Deploy frontend to Vercel**:
   ```bash
   cd Frontend
   vercel --prod
   ```

4. **Configure custom domain**: 
   - In Vercel dashboard, add pvabazaar.org as a custom domain
   - Update DNS settings if needed

### Option 2: Keep Existing Static Site & Add API Only

If you want to maintain your current static site setup and just add the API:

1. **Deploy only the backend API** (follow Step 1 from Option 1)

2. **Modify your existing static site** to include the PVA Bazaar pages:
   - Copy the built HTML/JS/CSS from `Frontend/dist` after building
   - Add these files to your existing hosting
   - Update any API URLs to point to your deployed API

## Database Setup

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster (free tier is sufficient for starting)
3. Set up database access user and password
4. Add network access (IP allowlist or allow from anywhere for testing)
5. Get your connection string: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/pvabazaar`

### Initialize Production Database

After deploying your API:

```bash
# Export data from development
cd backend
node scripts/export-data.js > backup.json

# Import to production (replace with your production API URL)
curl -X POST -H "Content-Type: application/json" -d @backup.json https://pva-bazaar-api.vercel.app/api/admin/import-data
```

## Testing Deployment

Once deployed, verify these endpoints:

1. API Health: `https://pva-bazaar-api.vercel.app/api/health`
2. Frontend pages:
   - Homepage: `https://pvabazaar.org`
   - Portfolio: `https://pvabazaar.org/pages/portfolio.html`
   - Dashboard: `https://pvabazaar.org/pages/pvadashboard.html`

## Troubleshooting

If you encounter issues:

1. **API Connection Failed**:
   - Check CORS settings in backend
   - Verify API URL in frontend config.js
   - Check browser console for errors

2. **MongoDB Connection Failed**:
   - Verify connection string
   - Check IP allowlist in MongoDB Atlas

3. **Authentication Issues**:
   - Verify JWT_SECRET is set
   - Check login endpoint response

## Simple Deployment Script

```bash
#!/bin/bash
# PVA Bazaar Deployment Script

# Deploy backend
cd backend
vercel --prod

# Update frontend config with API URL
echo "Enter your deployed API URL (e.g., https://pva-bazaar-api.vercel.app):"
read API_URL

cd ../Frontend
sed -i "s|apiUrl:.*|apiUrl: '$API_URL/api'|" config.js

# Build and deploy frontend
npm install
npm run build
vercel --prod
```

Save this as `deploy.sh` and run `chmod +x deploy.sh` to make it executable.
