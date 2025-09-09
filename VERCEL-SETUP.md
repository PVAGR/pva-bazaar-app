# Vercel Deployment Setup Guide

This guide walks through the complete Vercel deployment process for PVA Bazaar.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm install -g vercel`
3. **MongoDB Database**: You'll need a MongoDB connection string (MongoDB Atlas recommended)

## Step 1: Environment Variables

Before deploying, you need to set up environment variables for production:

### Required Environment Variables

1. **MONGODB_URI**: Your production MongoDB connection string
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/pvabazaar`
   - Get this from MongoDB Atlas or your MongoDB provider

2. **JWT_SECRET**: A secure random string for JWT token signing
   - Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - Should be at least 32 characters long

### Setting Environment Variables in Vercel

During deployment, you'll be prompted to set these variables, or you can set them later in the Vercel dashboard:

1. Go to your backend project in Vercel dashboard
2. Navigate to Settings → Environment Variables
3. Add the required variables for Production, Preview, and Development environments

## Step 2: Run Deployment

From the project root directory, run:

```bash
./deploy-to-production.sh
```

This script will:
1. Verify your project structure
2. Deploy your backend API to Vercel
3. Update frontend configuration with the API URL
4. Build and deploy your frontend to Vercel

## Step 3: Custom Domain Setup

After deployment:

1. **Find your frontend project** in the Vercel dashboard
2. **Add custom domain**:
   - Go to Settings → Domains
   - Add `pvabazaar.org`
   - Follow Vercel's DNS configuration instructions

3. **Update DNS records** with your domain provider:
   - Add the CNAME or A records as instructed by Vercel
   - This typically takes 24-48 hours to propagate

## Step 4: Verification

1. **Check API health**: Visit `https://your-backend-url.vercel.app/api/health`
2. **Test frontend**: Visit your frontend URL and verify it loads
3. **Test API connection**: Try logging in or browsing products

## Troubleshooting

### Common Issues

1. **Environment variables not set**: 
   - Redeploy after setting variables in Vercel dashboard
   - Check the Functions logs in Vercel dashboard

2. **CORS issues**: 
   - Verify your frontend domain is correctly configured
   - Check that API URLs are correctly updated

3. **Database connection issues**:
   - Verify MongoDB URI is correct
   - Check MongoDB Atlas network access (allow all IPs for Vercel)

### Logs and Debugging

- View function logs in Vercel dashboard → Functions tab
- Check real-time logs during deployment
- Use `vercel logs [deployment-url]` for detailed logs

## Production Checklist

- [ ] Environment variables set in Vercel
- [ ] Backend deployed and health check passing
- [ ] Frontend deployed and loading
- [ ] Custom domain configured
- [ ] API connection working between frontend and backend
- [ ] MongoDB connection working
- [ ] Authentication flow working

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/)
- [Domain Configuration](https://vercel.com/docs/concepts/projects/custom-domains)