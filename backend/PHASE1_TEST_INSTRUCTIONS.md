# Phase 1: Item Registration Route - Test Instructions

## ✅ Implementation Complete

**Files Modified:**
- `backend/routes/items.js` - Added `POST /api/items/register` route
- `backend/.env.example` - Added SMTP and OpenAI env vars

## 🧪 Testing Steps

### Step 1: Start Backend Server

```bash
cd backend
npm install  # If needed
npm run dev
```

Server should start on `http://localhost:5001` (or PORT from .env)

### Step 2: Get Authentication Token

**Option A: Register a new user**
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'
```

**Response:**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "name": "Test User", "email": "test@example.com" }
}
```

**Option B: Login with existing user**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pvabazaar.org",
    "password": "admin123"
  }'
```

### Step 3: Test Item Registration

**Basic Registration:**
```bash
curl -X POST http://localhost:5001/api/items/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test Item",
    "description": "This is a test item for registration",
    "price": 99.99,
    "category": "electronics",
    "condition": "used",
    "materials": ["Plastic", "Metal"],
    "images": ["https://example.com/image1.jpg"]
  }'
```

**Expected Response (201 Created):**
```json
{
  "ok": true,
  "item": {
    "id": "...",
    "slug": "test-item",
    "name": "Test Item",
    "category": "electronics",
    "description": "This is a test item for registration",
    "priceCents": 9999,
    "currency": "USD",
    "status": "draft",
    "media": ["https://example.com/image1.jpg"],
    "tags": ["used"],
    "createdAt": "2026-02-20T...",
    "updatedAt": "2026-02-20T..."
  },
  "message": "Item registered successfully. It will be reviewed before publishing."
}
```

### Step 4: Test Validation Errors

**Missing Required Fields:**
```bash
curl -X POST http://localhost:5001/api/items/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test Item",
    "price": 99.99
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "ok": false,
  "error": "Description is required"
}
```

**Invalid Price:**
```bash
curl -X POST http://localhost:5001/api/items/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test Item",
    "description": "Test",
    "price": -10,
    "category": "test"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "ok": false,
  "error": "Valid price greater than 0 is required"
}
```

### Step 5: Test Without Authentication

```bash
curl -X POST http://localhost:5001/api/items/register \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Item",
    "description": "Test",
    "price": 99.99,
    "category": "test"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "ok": false,
  "message": "No authentication token provided"
}
```

### Step 6: Verify Item in Database

**Check via Admin Endpoint (if you have admin token):**
```bash
curl -X GET "http://localhost:5001/api/items?includeDrafts=true" \
  -H "X-Admin-Code: YOUR_ADMIN_SECRET_CODE"
```

You should see your registered item with `status: "draft"` and `creator` set to your user ID.

## ✅ Success Criteria

- [x] Route accepts POST requests to `/api/items/register`
- [x] Requires JWT authentication
- [x] Validates required fields (title, description, price, category)
- [x] Creates item with `status: "draft"`
- [x] Sets `creator` to authenticated user ID
- [x] Returns proper error codes (400, 401, 500)
- [x] Sanitizes user input (XSS prevention)
- [x] Handles duplicate slug errors gracefully

## 🐛 Troubleshooting

**Error: "Cannot find module '../middleware/auth'"**
- Check that `backend/middleware/auth.js` exists
- Verify the export: `module.exports.authMiddleware = authMiddleware;`

**Error: "MongoDB connection failed"**
- Check `MONGODB_URI` in `.env` file
- Ensure MongoDB is running (local) or connection string is correct (Atlas)

**Error: "JWT_SECRET is not defined"**
- Add `JWT_SECRET` to `.env` file
- Use a strong random string (32+ characters)

**Item created but status is "published" instead of "draft"**
- Check that the route is setting `status: 'draft'` explicitly
- Verify Artifact model default is not overriding

## 📊 Next Steps

After Phase 1 is verified working:
1. ✅ Phase 1 Complete - Item Registration Route
2. ⏭️ Phase 2 - Email Service (`backend/service/emailService.js`)
3. ⏭️ Phase 3 - Frontend Registration Page
4. ⏭️ Phase 4 - Integration Tests
5. ⏭️ Phase 5 - Documentation

## 🎯 Report Back

After testing, report:
- ✅ Route works with valid token
- ✅ Validation errors work correctly
- ✅ Unauthenticated requests are rejected
- ✅ Items are created with `status: "draft"`
- ✅ Ready for Phase 2 (Yes/No)
