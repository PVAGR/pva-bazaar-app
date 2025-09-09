# PVA Bazaar - Artisan Marketplace with Blockchain Provenance

A blockchain-powered marketplace for artisan goods with provenance tracking and fractional ownership.

## 🚀 Quick Start

```bash
# Run the application
./test-app.sh
```

## 📱 Available Pages

- **Portfolio**: http://localhost:3000/pages/portfolio.html
- **Product Showcase**: http://localhost:3000/pages/productshowcase.html?id=[artifact_id]
- **Provenance**: http://localhost:3000/pages/provenance.html?id=[artifact_id]
- **Dashboard**: http://localhost:3000/pages/pvadashboard.html

## 👤 Dev Login

- Email: admin@pvabazaar.org
- Password: admin123

## 🧩 Features Implemented

- ✅ User authentication with JWT
- ✅ Artifact listing and details
- ✅ Fractional ownership capabilities
- ✅ Provenance verification
- ✅ Dashboard with key metrics
- ✅ MongoDB with in-memory fallback for development

## 🔧 Development

### Backend

```bash
cd backend
npm install

# Start with in-memory database (no MongoDB needed)
PORT=5001 NODE_ENV=development USE_MEMORY_DB=true DEV_AUTO_SEED=true npm run dev
```

### Frontend

```bash
cd Frontend
npm install

# Connect to backend on port 5001
VITE_API_URL=http://localhost:5001/api npm run dev
```

## 📋 Next Steps

### Priority Implementation Order

1. **Enhanced Authentication UI**
   - Implement proper login/signup modal
   - Add profile management page
   - Add password reset functionality

2. **Shopping Cart**
   - Create cart model in backend
   - Add cart API endpoints
   - Implement cart UI components

3. **Payment Processing**
   - Integrate with payment gateway
   - Implement checkout flow
   - Handle payment confirmations

4. **Enhanced Blockchain Features**
   - Complete smart contract integration
   - Add real-time ownership verification
   - Implement on-chain provenance

5. **Admin Dashboard**
   - Add artifact management tools
   - User management features
   - Sales analytics

## 🚀 Deployment

### Quick Vercel Deployment

For a complete production deployment to Vercel:

```bash
./deploy-to-production.sh
```

This automated script will:
- Deploy your backend API to Vercel
- Update frontend configuration automatically
- Build and deploy your frontend
- Guide you through custom domain setup

### Detailed Setup Guide

See [VERCEL-SETUP.md](./VERCEL-SETUP.md) for complete deployment instructions including:
- Environment variable configuration
- Custom domain setup for pvabazaar.org
- Troubleshooting common issues

### Alternative Deployment

See [production-deploy.md](./production-deploy.md) for other deployment options.

## 🔍 Troubleshooting

Use the API health check script to verify backend connectivity:

```bash
./api-health-check.sh
```

## 📊 Database Management

Export and import data between environments:

```bash
# Export data
cd backend
node scripts/export-data.js > backup.json

# Import data
cd backend
node scripts/import-data.js backup.json
```
