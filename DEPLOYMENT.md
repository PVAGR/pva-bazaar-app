# PVA Bazaar App

A blockchain-powered marketplace for artisan goods with provenance tracking and fractional ownership.

## Quick Start

Just run the test script to start the application:

```bash
./test-app.sh
```

This will:
1. Fix any import case-sensitivity issues
2. Start the backend on port 5001 with in-memory DB
3. Start the frontend on port 3000
4. Verify that everything is working

## Available Pages (Verified Working)

- Portfolio: http://localhost:3000/pages/portfolio.html
- Product Showcase: http://localhost:3000/pages/productshowcase.html?id=[artifact_id]
- Provenance: http://localhost:3000/pages/provenance.html?id=[artifact_id]
- Dashboard: http://localhost:3000/pages/pvadashboard.html

## Dev Login (Working)

- Email: admin@pvabazaar.org
- Password: admin123

## For Production Deployment

When deploying to pvabazaar.org:

1. Update the backend `.env` file with production database credentials
2. Set `NODE_ENV=production` to disable development features
3. Update the frontend `config.js` with the production API URL

## Note on API Connectivity

The frontend uses a Vite proxy to connect to the backend API. This ensures all API requests work correctly in both development and production environments.

For production deployment, the API URL will automatically switch to the production endpoint defined in `config.js`.
