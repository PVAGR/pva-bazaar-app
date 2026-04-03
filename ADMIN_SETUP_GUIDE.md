# Admin Setup & Configuration Guide

## What's been created:

Your new **Overview** admin tab is now live! Access it by:
- Navigating to the admin panel and clicking the **🎯 Overview** tab (at the end of all tabs)
- Or use the keyboard shortcut (once your admin account is set up)

The Overview tab shows:
- ✅ System status dashboard (Admin access, Users, Marketplace, Orders, Transactions)
- ✅ Feature checklist with quick links to Orders, Transactions, Dashboard, etc.
- ✅ What's new section highlighting all recently added admin features
- ✅ Admin tools for user management, marketplace, orders, transactions, and more
- ✅ Real-time metric summaries (Admins, Users, Artifacts, Orders, Transactions)

---

## Making Yourself Admin on Your Two Email Addresses

### Step 1: Determine Your Admin Setup Strategy

You have 3 options:

**Option A: Self-Signup Mode (EASIEST)** ⭐ Recommended
- Allow anyone who knows the bootstrap code to create an admin account
- Requires: `ADMIN_BOOTSTRAP_CODE` environment variable
- Process: Set the env var, then both email addresses sign up with that code

**Option B: Database Direct Assignment** 
- Manually add your emails to the `users` collection with `role: 'admin'`
- No env vars needed
- Requires MongoDB access

**Option C: First-Admin Bootstrap** (Already available)
- If NO admins exist yet, the first signup is auto-approved
- Works only if `adminCount === 0` in database
- Future signups need the bootstrap code

### Step 2: Use Option A (Self-Signup) - Recommended Workflow

#### 2a. Set Backend Environment Variables (Vercel)

1. Go to your Vercel project settings
2. Navigate to **Settings → Environment Variables**
3. Add these variables:

```
Name: ADMIN_BOOTSTRAP_CODE
Value: YOUR_SECRET_CODE_HERE
Environment: Production, Preview, Development
```

Example bootstrap codes:
- `phoenix_bazaar_admin_2024`
- `pva_secure_key_xyz123`
- `admin_bootstrap_secret_v1`

Pick something strong and memorable.

#### 2b. Deploy Backend Changes

Once the env var is set in Vercel:
1. Your backend automatically reads it on next deployment
2. Or: Re-deploy backend via Vercel dashboard

#### 2c. Sign Up Both Email Addresses

1. Visit your admin login page (`http://localhost:5173/#/admin` or production)
2. Click **Sign Up**
3. Fill in:
   - **Name:** Your full name
   - **Email:** First email address
   - **Password:** Strong password (8+ chars)
   - **Bootstrap Code:** Paste your `ADMIN_BOOTSTRAP_CODE` value
4. Click **Sign Up**
5. Repeat for second email address

Both emails are now admin accounts.

---

## Step 3: Verify Admin Access

Once you've signed up as admin:

1. **Login** with your first admin email
2. Click the **🎯 Overview** tab to see your new admin dashboard
3. Verify you see:
   - System status showing "1 admin account(s) configured"
   - All feature tiles (Orders, Transactions, Dashboard, Users, etc.)
   - Admin Tools section
   - Real-time metrics

---

## Step 4: Restrict Overview Tab to Admin-Only (Optional but Recommended)

Currently, the Overview tab is accessible to any logged-in admin. To ensure only authorized admins can access it, add a permission check in `Frontend/src/components/OverviewTab.jsx`:

```javascript
// At the top of the component, after imports:
useEffect(() => {
  // Get current user role from localStorage
  const token = localStorage.getItem('token');
  const adminAuth = localStorage.getItem('admin-auth');
  
  if (!token && !adminAuth) {
    // Redirect to login if not authenticated
    window.location.hash = '#/admin';
    return;
  }
  
  // Optional: Check that user has admin role via token
  // (This requires decoding JWT - your backend should provide this)
}, []);
```

For full admin-only access security:
- Add backend API endpoint `GET /api/admin/verify` that returns user's role
- Call this in Overview tab on mount
- Redirect non-admins to home page

---

## Backend Configuration Details

### How Admin Authentication Works:

1. **Bootstrap Status Check** (`GET /api/admin/bootstrap-status`)
   - Returns: `{ adminCount, needsBootstrap, signupAllowed, bootstrapCodeRequired, ... }`
   - If `adminCount === 0`: Signup allowed without code (first-admin bootstrap)
   - If `adminCount > 0` AND `bootstrapCodeRequired === true`: Code is mandatory

2. **Admin Signup** (`POST /api/admin/signup`)
   - Creates new admin user with JWT token
   - Validates bootstrap code if required
   - Issues 12-hour JWT token stored in:
     - `localStorage: token`
     - `localStorage: admin-token` (optional)
     - `httpOnly: admin_token` (secure cookie)

3. **Bootstrap Code Validation**
   - Compares user-provided code against `process.env.ADMIN_BOOTSTRAP_CODE`
   - Case-sensitive, exact match required
   - Can be disabled by setting `ADMIN_SELF_SIGNUP_ENABLED=false` (requires code always)

### Environment Variables Required:

```env
# Backend (.env or Vercel)
ADMIN_BOOTSTRAP_CODE=your_secret_code_here
ADMIN_SELF_SIGNUP_ENABLED=true      # Allow self-signup (default: true)
JWT_SECRET=your_jwt_secret          # Already configured
MONGODB_URI=your_mongo_uri          # Already configured

# Frontend (.env or process.env)
VITE_API_URL=https://api.yourdomain.com
```

---

## Keyboard Shortcuts (After Admin Setup)

Once you have admin access, use these shortcuts in the admin panel:

| Key | Tab |
|-----|-----|
| **Alt+1** | Dashboard |
| **Alt+2** | Orders |
| **Alt+3** | Transactions |
| **Alt+4** | Archive |
| **Alt+5** | Marketplace |
| **Alt+6** | Users |
| **Alt+7** | Attribution |
| **Alt+8** | Payouts |
| **Alt+9** | Cloud Storage |
| **Alt+0** | Settings |

---

## Troubleshooting

### Q: "Signup is disabled" error
**A:** Admin count > 0 and bootstrap code not provided. Either:
- Set `ADMIN_BOOTSTRAP_CODE` env var and provide it during signup
- Or ask existing admin to create account for you (direct DB insertion)

### Q: Bootstrap code isn't working
**A:** Check:
1. Env var is set in Vercel **AND** backend was re-deployed
2. Code is case-sensitive - match exactly
3. Code has no leading/trailing spaces
4. Backend actually read the new env var (trigger new deploy)

### Q: Only one email has admin access
**A:** 
- Second signup didn't complete? Try again with bootstrap code
- Check MongoDB `users` collection: both should have `role: 'admin'`
- Check browsers: second email might have logged in to different browser

### Q: Overview tab shows "0 transactions" or other metrics are wrong
**A:** 
- Metrics refresh on Overview tab page load
- Check `/api/transactions`, `/api/users`, `/api/items` endpoints
- Backend might not be returning data - check network tab in DevTools

---

## Next Steps

1. ✅ Set `ADMIN_BOOTSTRAP_CODE` in Vercel environment
2. ✅ Sign up both email addresses with bootstrap code
3. ✅ Verify admin access by viewing Overview tab
4. ✅ Test all quick-access buttons (Orders, Transactions, Users, etc.)
5. ⏳ (Optional) Lock down Overview tab to admin-only access
6. ⏳ Deploy frontend to production
7. ⏳ Monitor transaction endpoint performance

---

## Resource Links

- **AdminPage Component:** `Frontend/src/pages/AdminPage.jsx`
- **OverviewTab Component:** `Frontend/src/components/OverviewTab.jsx`
- **Admin Login Route:** `backend/routes/adminLogin.js`
- **API bootstrap endpoint:** `GET /api/admin/bootstrap-status`
- **API signup endpoint:** `POST /api/admin/signup`

---

**Need help?** Check these files for more details:
- See memory file: `/memories/repo/admin-auth-session-401.md` for session handling patterns
- Backend instructions: `.github/instructions/backend.instructions.md`
- Frontend instructions: `.github/instructions/frontend.instructions.md`
