# PVA Bazaar - Full Stack Integration Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                │
│                  Deployed: pvabazaar.org                     │
│                                                              │
│  Port 5173 (dev) → Vite dev server with hot reload         │
│  Port 3000 (prod) → Static files from GitHub Pages         │
└────────────────────────┬────────────────────────────────────┘
                         │ API Calls via axios
                         │ (Frontend/src/lib/api.js)
                         │
         ┌───────────────▼───────────────┐
         │    CORS Middleware            │
         │  (Unconditional, all requests)│
         └───────────────┬───────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  BACKEND (Express + Node)                   │
│              Deployed: api.pvabazaar.org (Vercel)          │
│                                                              │
│  Port 3001 (dev) → Express server with auto-reload         │
│  Port 443 (prod) → Vercel serverless functions             │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────▼───────────────┐
         │  Rate Limiting Middleware     │
         │  Authentication Middleware    │
         │  Error Handling               │
         └───────────────┬───────────────┘
                         │
         ┌───────────────▼───────────────┐
         │       Route Handlers          │
         │  /api/products                │
         │  /api/orders                  │
         │  /api/auth                    │
         │  /admin/...                   │
         └───────────────┬───────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  DATABASE (MongoDB)                         │
│                                                              │
│  Local Dev: mongodb://localhost:27017/pva-bazaar          │
│  Production: MongoDB Atlas (Cloud)                         │
└────────────────────────────────────────────────────────────┘
```

## Frontend Configuration

### Environment Variables

[Frontend/src/config/env.ts](Frontend/src/config/env.ts) validates and exports:

```typescript
ENV = {
  API_URL: 'http://localhost:3001', // From VITE_API_URL
  CLOUDINARY_CLOUD_NAME: '...',
  CLOUDINARY_UPLOAD_PRESET: '...',
};
```

**Build-time validation:**

- Warns if localhost used in production build
- Throws if VITE_API_URL not set

### API Client

[Frontend/src/lib/api.js](Frontend/src/lib/api.js) provides:

```javascript
import { apiGet, apiPost, apiPut, apiDelete } from './lib/api.js';

// Automatic URL prefixing
await apiGet('/products'); // → http://localhost:3001/products
await apiPost('/orders', data); // → http://localhost:3001/orders
await apiPut('/orders/123', update); // → http://localhost:3001/orders/123
await apiDelete('/orders/123'); // → http://localhost:3001/orders/123
```

**Features:**

- Automatic ENV.API_URL prepending
- Error handling & logging
- Auth header injection
- CORS credential handling

---

## Backend Configuration

### Entry Point

[backend/api/index.js](backend/api/index.js) configures:

1. **Express App Setup**

   ```javascript
   app.set('trust proxy', 1); // For Vercel reverse proxy
   ```

2. **Security Headers**
   - Helmet for security
   - CSP configured
   - XSS protection

3. **CORS Middleware** (Unconditional)

   ```javascript
   const allowedOrigins = new Set([
     'https://pvabazaar.org',
     'https://www.pvabazaar.org',
     'http://localhost:3000',
     'http://localhost:5173',
   ]);

   app.use((req, res, next) => {
     const origin = req.headers.origin;
     if (allowedOrigins.has(origin)) {
       res.setHeader('Access-Control-Allow-Origin', origin);
       res.setHeader('Access-Control-Allow-Credentials', 'true');
     }
     // ... set other headers
     next();
   });
   ```

4. **Body Parsing**
   - JSON: max 1MB
   - URL-encoded: 1MB

5. **Rate Limiting**
   - General: 100 requests/15min
   - Auth: 5 requests/15min
   - Checkout: 10 requests/15min
   - Webhooks: 30 requests/15min

6. **Database Connection**

   ```javascript
   async function connectToDatabase() {
     // Returns cached connection for serverless
     // Falls back to localhost:27017 if MONGODB_URI not set
   }
   ```

7. **Routes**
   - `/health` - Health check (no auth)
   - `/api/products` - Public products
   - `/api/orders` - Order management
   - `/api/auth` - Authentication
   - `/admin/*` - Admin endpoints
   - `/webhooks/stripe` - Payment webhooks

### Environment Variables

Required:

- `JWT_SECRET` - JWT signing key
- `MONGODB_URI` - Database connection (optional in dev)
- `NODE_ENV` - "development" or "production"

Optional:

- `SENTRY_DSN` - Error tracking
- `STRIPE_SECRET_KEY` - Payment processing
- `ADMIN_SECRET_CODE` - Admin authentication

---

## API Endpoints

### Health & Status

```bash
GET /health
# Response: { ok: true, api_ready: true, ... }

GET /ping
# Response: { ok: true, timestamp: 1234567890, ... }
```

### Products

```bash
GET /api/products
# Query params: ?page=1&limit=20&search=term&category=art

POST /api/products (admin only)
# Body: { name, description, price, ... }

GET /api/products/:id

PUT /api/products/:id (admin only)

DELETE /api/products/:id (admin only)
```

### Authentication

```bash
POST /api/auth/register
# Body: { email, password, name }

POST /api/auth/login
# Body: { email, password }
# Response: { token: "jwt_token", user: {...} }

POST /api/auth/logout

GET /api/auth/me (requires auth)
```

### Orders

```bash
GET /api/orders (requires auth)

POST /api/orders (requires auth)
# Body: { items: [...], shipping_address, ... }

GET /api/orders/:id (requires auth)

PUT /api/orders/:id (admin only)
```

### Admin

```bash
GET /admin/stats (requires admin code)

GET /admin/users (requires admin code)

POST /admin/users/:id/ban (requires admin code)
```

---

## Request/Response Flow Example

### Scenario: User Browsing Products

**1. Frontend Initialization**

```typescript
// Frontend/src/config/env.ts
API_URL = import.meta.env.VITE_API_URL;
// = "http://localhost:3001" (dev)
// = "https://api.pvabazaar.org" (prod)
```

**2. Frontend Makes Request**

```javascript
// Frontend/src/lib/api.js
const response = await apiGet('/products');
// Constructs: GET http://localhost:3001/products
```

**3. Backend Receives Request**

```javascript
// backend/api/index.js
app.use((req, res, next) => {
  // CORS middleware runs first
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  // ...
  next();
});

app.get('/products', async (req, res) => {
  // Rate limiter checks
  // Optional auth check
  // Fetch from DB
  // Return response
});
```

**4. Backend Response**

```json
{
  "ok": true,
  "data": [
    {
      "id": "prod_123",
      "name": "Artwork",
      "price": 99.99,
      ...
    }
  ]
}
```

**5. CORS Headers in Response**

```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,...
Vary: Origin
```

**6. Frontend Receives Response**

```javascript
// Browser allows response (CORS headers match)
console.log(response.data); // Array of products
```

---

## Authentication Flow

### Login Process

```
User enters email/password
         ↓
Frontend: POST /api/auth/login
         ↓
Backend validates credentials
         ↓
Backend generates JWT
         ↓
Response: { token: "eyJhbGc..." }
         ↓
Frontend stores token (localStorage)
         ↓
Subsequent requests include header:
Authorization: Bearer eyJhbGc...
         ↓
Backend verifies JWT in middleware
         ↓
Allows/denies request
```

### Protected Requests

```javascript
// Frontend automatically adds header
const response = await apiGet('/api/orders');
// Actually sends:
// GET /api/orders
// Authorization: Bearer eyJhbGc...
```

### Admin Authentication

```javascript
// Special admin endpoint
POST /admin/users
X-Admin-Code: secret_code_here

// Backend verifies code matches ADMIN_SECRET_CODE env var
```

---

## Database Connection Pooling

**Optimized for Vercel Serverless:**

```javascript
// backend/api/index.js
global._mongooseConn = global._mongooseConn || {
  conn: null,
  promise: null,
};

async function connectToDatabase() {
  // If already connected, return cached connection
  if (global._mongooseConn.conn) {
    return global._mongooseConn.conn;
  }

  // If connection in progress, wait for it
  if (global._mongooseConn.promise) {
    return global._mongooseConn.promise;
  }

  // Create new connection
  global._mongooseConn.promise = mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/pva-bazaar',
  );

  global._mongooseConn.conn = await global._mongooseConn.promise;
  return global._mongooseConn.conn;
}
```

**Why this matters:**

- Vercel creates new container for each request
- Without caching, would reconnect to DB every request
- Global cache persists across invocations in same container
- Dramatically improves performance

---

## Error Handling

### Frontend Errors

```javascript
try {
  const response = await apiGet('/api/products');
} catch (error) {
  if (error.response?.status === 404) {
    console.error('Not found');
  } else if (error.response?.status === 401) {
    console.error('Unauthorized - login required');
  } else if (error.request) {
    console.error('No response - backend down?');
  } else {
    console.error('Request setup error:', error.message);
  }
}
```

### Backend Errors

```javascript
// Automatic error responses
res.status(400).json({ ok: false, message: 'Bad request' });
res.status(401).json({ ok: false, message: 'Unauthorized' });
res.status(403).json({ ok: false, message: 'Forbidden' });
res.status(404).json({ ok: false, message: 'Not found' });
res.status(500).json({ ok: false, message: 'Server error' });

// Sentry captures and reports errors
```

### Sentry Error Tracking

All errors automatically sent to Sentry if `SENTRY_DSN` configured:

```javascript
console.error('Something went wrong');
// → Captured in Sentry dashboard
// → Team receives notification
// → Includes stack trace, context, user info
// → PII/tokens filtered before sending
```

---

## Development Workflow

### Starting Local Development

```bash
# Terminal 1: Backend
cd backend
npm run dev
# Watches for changes
# http://localhost:3001

# Terminal 2: Frontend
cd Frontend
npm run dev
# Hot reload on save
# http://localhost:5173

# Terminal 3: MongoDB (if local)
mongod
# mongodb://localhost:27017
```

### Making Changes

1. Edit code
2. Backend: Automatically restarts (nodemon)
3. Frontend: Hot reload (Vite)
4. Test in browser (http://localhost:5173)
5. Check DevTools Network tab
6. Verify backend logs

### Testing API Calls

```bash
# From browser console
fetch('http://localhost:3001/api/products')
  .then(r => r.json())
  .then(d => console.log(d));

# Or use curl
curl http://localhost:3001/api/products
```

---

## Production Deployment

### Vercel Backend

- Deployed from `backend/` folder
- Entry point: `api/[...path].js` (Vercel serverless)
- Environment variables set in Vercel dashboard
- MongoDB connection pooled globally

### Vercel Frontend

- Deployed from `Frontend/` folder
- Build: `npm run build`
- Output: `dist/`
- Environment variables set in Vercel dashboard

### Domain Setup

- `api.pvabazaar.org` → Vercel Backend
- `pvabazaar.org` → Vercel Frontend (or GitHub Pages)
- DNS records managed by registrar

---

## Testing Checklist

### Local Testing

- [ ] Frontend builds: `npm run build`
- [ ] Backend starts: `npm run dev`
- [ ] Can visit http://localhost:5173
- [ ] Can fetch /health: `curl http://localhost:3001/health`
- [ ] CORS headers present: `curl -v http://localhost:3001/health`
- [ ] Database connects (check backend logs)

### Integration Testing

- [ ] Browse products (Frontend → Backend → DB)
- [ ] Add product to cart
- [ ] Go to checkout
- [ ] Place order (if payment configured)
- [ ] View order in admin panel

### Security Testing

- [ ] CORS blocks wrong origins
- [ ] Auth headers required for protected routes
- [ ] Admin code prevents unauthorized access
- [ ] JWT expiration works
- [ ] No secrets in logs/errors

---

## Troubleshooting

### "Cannot GET /api/products"

**Cause:** Backend not running or CORS issue
**Fix:**

1. Check backend running: `npm run dev` in /backend
2. Check frontend has correct API_URL
3. Check CORS middleware in backend

### "CORS error: blocked by browser"

**Cause:** Frontend origin not in allowed list
**Fix:**

1. Check browser console for full error
2. Add origin to backend/api/index.js line 40-45
3. Restart backend

### "401 Unauthorized"

**Cause:** Missing or invalid auth token
**Fix:**

1. Login first: `POST /api/auth/login`
2. Get token from response
3. Subsequent requests auto-include token

### "503 Service Unavailable"

**Cause:** Missing environment variables in production
**Fix:**

1. Check GitHub Secrets are set
2. Check Vercel environment variables
3. Check MongoDB connection string

---

## Quick Reference

| Component | Local                      | Production                |
| --------- | -------------------------- | ------------------------- |
| Frontend  | `npm run dev` on port 5173 | Vercel, pvabazaar.org     |
| Backend   | `npm run dev` on port 3001 | Vercel, api.pvabazaar.org |
| Database  | `mongod` localhost:27017   | MongoDB Atlas             |
| API Base  | http://localhost:3001      | https://api.pvabazaar.org |
| Logs      | Terminal output            | Vercel dashboard          |
| Errors    | Console/terminal           | Sentry dashboard          |

---

**For detailed setup:** See [LOCAL_SETUP.md](LOCAL_SETUP.md)  
**For deployment:** See [DEPLOYMENT_CHECKLIST_PRODUCTION.md](DEPLOYMENT_CHECKLIST_PRODUCTION.md)  
**CORS details:** See [CORS_VERIFICATION_COMPLETE.md](CORS_VERIFICATION_COMPLETE.md)
