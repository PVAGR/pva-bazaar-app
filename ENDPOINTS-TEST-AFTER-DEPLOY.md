# 🧪 TEST ALL ENDPOINTS AFTER DEPLOYMENT

Once your app is live on internet, test these endpoints to verify everything works:

## Replace this with your Render URL:
```
PROD_URL="https://your-render-app.onrender.com"
```

---

## CRITICAL ENDPOINTS (Must Work)

### 1. Health Check
```bash
curl -s $PROD_URL/api/health-check
# Expected: HTTP 200, {"ok":true,...}
```

### 2. API Documentation
```bash
curl -s $PROD_URL/api/docs | head -20
# Expected: HTML with Swagger/OpenAPI UI
```

### 3. OpenAPI Spec
```bash
curl -s $PROD_URL/api/openapi.json | jq .
# Expected: JSON with all endpoint definitions
```

---

## USER-FACING PAGES (No Network Errors)

Test these in browser at: `$PROD_URL/`

1. **Home Page**
   - ✅ Should load without errors
   - ✅ Top navigation visible
   - ✅ All buttons clickable

2. **Library/Archive**
   - ✅ No "Network Error" messages
   - ✅ Can browse content
   - ✅ Search works

3. **Marketplace**
   - ✅ Product list loads
   - ✅ Can click products
   - ✅ No 404s

4. **Governance**
   - ✅ Proposals load
   - ✅ No network errors
   - ✅ Can view details

5. **My Passport**
   - ✅ Should load (may say not logged in)
   - ✅ No network error boxes
   - ✅ Login form visible

6. **Admin Dashboard**
   - ✅ /admin accessible
   - ✅ No JavaScript errors
   - ✅ Stats loading

---

## API ENDPOINT TESTS

### Authentication
```bash
# Test JWT generation (mock)
curl -X POST $PROD_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Marketplace
```bash
# Get products
curl -s $PROD_URL/api/products | head -30

# Search
curl -s "$PROD_URL/api/search?q=craft" | head -30
```

### Provenance (NFT System)
```bash
# Start submission
curl -X POST $PROD_URL/api/provenance/start \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"objectType":"craft"}'
```

---

## EXPECTED RESULTS

All endpoints should return:
- ✅ HTTP 200 or 201 (successful requests)
- ✅ No "Connection refused" errors
- ✅ No "502 Bad Gateway" errors
- ✅ No timeout errors
- ✅ Valid JSON responses

---

## DEBUGGING YOUR LIVE DEPLOYMENT

If something isn't working:

### Check Render Logs
1. Go to https://dashboard.render.com
2. Click your service
3. Click "Logs" tab
4. Look for error messages

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 502 Bad Gateway | Server crashed | Check logs, restart |
| Cannot connect | Env vars wrong | Check MongoDB_URI, JWT_SECRET |
| Network Error | API URL wrong | Verify frontend API config |
| 404 errors | Routes not mounted | Confirm backend/api/index.js |

---

## SUCCESS CRITERIA

Your deployment is **PRODUCTION READY** when:

✅ All critical endpoints return HTTP 200
✅ No network errors on any page
✅ Home page loads fully
✅ Can navigate between sections
✅ API documentation accessible
✅ Health check shows all systems available

**Once all tests pass → Users can start signing up!** 🎉
