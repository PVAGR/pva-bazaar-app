# Admin Authentication Setup Guide

## ✅ What's Been Configured

Your admin credentials have been properly set up for the PVA Bazaar admin panel:

- **Username:** `richyrichaii`
- **Password:** `pva123zxc!`

## 🔧 Local Development Setup

### 1. Environment Variables

A **backend/.env** file has been created with your credentials. This file is gitignored and won't be committed to the repository.

```env
ADMIN_USERNAME=richyrichaii
ADMIN_PASSWORD=pva123zxc!
```

### 2. Starting the Backend Locally

To test the admin panel locally, you need MongoDB running:

#### Option A: Install MongoDB Locally

1. Download MongoDB Community Edition: https://www.mongodb.com/try/download/community
2. Install and start the MongoDB service
3. Update `backend/.env` if needed:
   ```env
   MONGODB_URI=mongodb://localhost:27017/pvabazaar
   ```

#### Option B: Use Docker

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### Option C: Use MongoDB Atlas (Cloud)

1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Get your connection string
3. Update `backend/.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pvabazaar
   ```

### 3. Start the Backend Server

```bash
cd backend
npm install
npm run dev
```

The server should start on http://localhost:5001

### 4. Start the Frontend

```bash
cd Frontend
npm run dev
```

The frontend will start on http://localhost:5173

### 5. Access the Admin Panel

1. Navigate to: http://localhost:5173/#/admin
2. Login with:
   - Username: `richyrichaii`
   - Password: `pva123zxc!`

## 🚀 Production Deployment (Vercel)

### Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

```
ADMIN_USERNAME = richyrichaii
ADMIN_PASSWORD = pva123zxc!
MONGODB_URI = your-production-mongodb-connection-string
JWT_SECRET = your-secret-key-minimum-32-characters
ALLOWED_ORIGIN = https://pvabazaar.org
```

4. Redeploy your backend for changes to take effect

### Deploying to Vercel

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Deploy
vercel --prod
```

## 📋 Admin Panel Features

Your admin panel now includes 5 comprehensive tabs:

### 1. 📚 Archive Tab
- View all archive entries
- Upload new entries with images
- Edit existing content
- Delete entries

### 2. 🛍️ Marketplace Tab
- Manage marketplace items
- CRUD operations (Create, Read, Update, Delete)
- Image upload and preview
- Category and condition management

### 3. 👥 Users Tab
- View all registered users
- Search and filter users
- See user roles and status
- Statistics dashboard

### 4. 💚 Health Tab
- System health monitoring
- API endpoint status checks
- OpenClaw integration monitoring
- Recent events log
- Manual event dispatch for testing

### 5. ⚙️ Settings Tab
- API URL configuration
- Theme toggle (Archive baseline)
- Clear cache functionality
- Export/Import settings
- System information display

## 🔒 Security Notes

1. **Never commit .env files** to git (already gitignored)
2. **Use strong passwords** in production
3. **Rotate credentials** periodically
4. **Use environment variables** in Vercel/production, never hardcode
5. **JWT_SECRET** should be minimum 32 characters

## 🐛 Troubleshooting

### Login Not Working

1. **Check backend is running:** Visit http://localhost:5001/api/health
2. **Check credentials:** Verify ADMIN_USERNAME and ADMIN_PASSWORD in .env
3. **Check browser console:** Look for CORS or network errors
4. **Check backend logs:** Look for authentication errors

### MongoDB Connection Errors

```
❌ MongoDB connection error: connect ECONNREFUSED
```

**Solution:** Ensure MongoDB is running (see Step 2 above)

### CORS Errors

If you see CORS errors in the browser console:

1. Check `ALLOWED_ORIGIN` in backend/.env
2. For local development, set:
   ```env
   ALLOWED_ORIGIN=http://localhost:5173
   ```

### JWT Errors

If you see "invalid token" errors:

1. Clear browser cookies
2. Ensure JWT_SECRET is set in backend/.env
3. Try logging in again

## 📖 Additional Documentation

- **Admin Tabs Guide:** See `ADMIN_TABS_DOCUMENTATION.md` for detailed tab usage
- **API Endpoints:** See `CLAUDE.md` for API documentation
- **Deployment Guide:** See `VERCEL_READY_TO_DEPLOY.md` for deployment instructions

## ✨ Next Steps

1. ✅ Local .env file created with your credentials
2. ✅ .env.example updated for documentation
3. ✅ Changes committed and pushed to main branch
4. ⏭️ Set up MongoDB (choose Option A, B, or C above)
5. ⏭️ Start backend and frontend servers
6. ⏭️ Test admin login at http://localhost:5173/#/admin
7. ⏭️ Configure Vercel environment variables for production

## 🎉 Summary

Your admin authentication is now properly configured! The credentials `richyrichaii` / `pva123zxc!` will work once you:
1. Start MongoDB
2. Start the backend server
3. Start the frontend server

All configuration files have been updated and pushed to the repository. The .env file with your actual credentials is secured and won't be committed to git.
