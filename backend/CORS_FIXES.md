# Backend CORS & 500 Error Fixes

## Root Causes Identified

### 1. CORS Headers Missing on Error Responses
- Express CORS middleware only ran on successful requests
- Error handlers didn't set CORS headers
- Result: Browser blocked requests with "CORS policy" error

### 2. Health Endpoints Blocked by DB Connection
- `/api/health`, `/api/ping` tried to connect to MongoDB
- If MongoDB unavailable, threw 503/500 error
- Result: No way to check API status when DB down

### 3. Module Export Broken
- Changed export from `module.exports = app` to `module.exports = { app, setCorsHeaders }`
- Vercel serverless couldn't find Express app
- Result: Requests wouldn't be handled

## Fixes Applied

### api/index.js

**1. Early CORS Setup (Before Routes)**
```javascript
const setCorsHeaders = (req, res) => {
  res.set('Access-Control-Allow-Origin', origin || '*');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Code');
};

app.use((req, res, next) => {
  setCorsHeaders(req, res);  // Set CORS headers on EVERY request
  next();
});

app.options('*', (req, res) => {
  setCorsHeaders(req, res);   // Handle preflight
  res.sendStatus(200);
});
```

**2. Skip DB for Health Endpoints**
```javascript
const skipPaths = ['/health', '/ping', '/version', '/express-ping', '/dev/token'];
if (skipPaths.some(p => req.path === p)) {
  return next();  // Don't require DB for health endpoints
}
```

**3. Error Handlers Set CORS**
```javascript
app.use((err, req, res, next) => {
  setCorsHeaders(req, res);  // CRITICAL: Set CORS on errors too
  res.status(500).json({ ok: false, message: 'Something went wrong!' });
});

app.use((req, res) => {
  setCorsHeaders(req, res);  // CRITICAL: Set CORS on 404 too
  res.status(404).json({ ok: false, message: 'Not found' });
});
```

**4. Fixed Module Export**
```javascript
module.exports = app;  // Must export Express app directly
```

### routes/health.js
```javascript
router.get('/', (req, res) => {
  res.status(200).json({ 
    ok: true,
    message: 'PVA Bazaar API is healthy!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### vercel.json
Added CORS headers at platform level (belt-and-suspenders):
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization,X-Admin-Code" }
      ]
    }
  ]
}
```

## Test Commands

```bash
# Test with CORS headers
curl -i -H "Origin: https://pvabazaar.org" https://api.pvabazaar.org/api/health

# Should include:
# Access-Control-Allow-Origin: https://pvabazaar.org
# Access-Control-Allow-Methods: ...
# Access-Control-Allow-Headers: ...

# Test preflight
curl -i -X OPTIONS https://api.pvabazaar.org/api/archive
# Should return 200 with CORS headers
```

## Why This Works

1. **Early Middleware**: CORS headers applied before routes run
2. **Error Handlers**: Catch all errors and still set CORS headers
3. **No DB Dependency**: Health endpoints work even if MongoDB unavailable
4. **Platform Fallback**: vercel.json provides CORS headers at infrastructure level
5. **Explicit Preflight**: OPTIONS handler ensures browser preflight requests succeed

## Files Changed
- `backend/api/index.js` - Core CORS and error handling fixes
- `backend/routes/health.js` - Remove DB dependency
- `backend/vercel.json` - Add platform-level CORS headers
