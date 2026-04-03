# Dual Dashboard Architecture - User vs. Admin

## Overview

PVA Bazaar now has **two completely separate dashboard systems**:

1. **User Dashboard** (`/dashboard`) - Public-facing, safe, personal data only
2. **Admin Dashboard** (`/admin`) - Protected, admin-only access, system controls

---

## 🟢 User Dashboard (`/dashboard`)

### What It Is
A public-facing dashboard for **all registered users** to view their personal marketplace activity.

### Access Rules
- ✅ **Accessible to:** All logged-in users
- ✅ **Route protection:** Requires valid JWT token (via `RequireUserAuth`)
- ✅ **URL:** `http://localhost:5173/#/dashboard` or production domain `/dashboard`
- ❌ **Not accessible to:** Unauthenticated users (redirects to login)

### Features (Safe & Personal Only)

#### My Orders
- User's purchase history
- Order status, items, dates, amounts
- Limited to user's own orders only

#### My Items/Artifacts
- User's own marketplace listings
- Prices, status, images
- Quick "View" links to marketplace
- "Create Listing" CTA if empty

#### My Activity/Transactions
- User's buy/sell transactions
- Income (sales) vs. expense (purchases) tracking
- Date, item, user, amount
- Read-only data

#### Marketplace Stats
- Public aggregates (total items, recent sales)
- NOT per-user overviews
- Informational only

#### Escrow Status
- User's own escrow-protected transactions
- Release dates, protection status
- No system-wide escrow data

#### Sales Dashboard
- Lifetime sales metrics (personal)
- This month / this week breakdowns
- Active listings count
- Sales tips (read-only)

#### Analytics Preview
- Simple charts showing sales trends
- Top performing items (user's only)
- No real-time data required
- Educational charts only

### What It CANNOT Do
- ❌ Modify system settings
- ❌ Create new admin accounts
- ❌ Access other users' data
- ❌ Delete orders or items (would need separate confirmation)
- ❌ Refund money or process payments
- ❌ View transaction history of other users
- ❌ Manage user accounts (except own account info)

### Data Isolation

**Backend Responsibility:**
When API endpoints like `/orders`, `/items/mine`, `/transactions`, `/sales/metrics` are called from a user, the backend MUST:
1. Verify JWT token and extract user ID
2. Return ONLY that user's data
3. Never return other users' information
4. Never expose sensitive fields (passwords, API keys, etc.)

Example safe backend response:
```javascript
// GET /api/orders (for logged-in user)
{
  ok: true,
  orders: [
    {
      _id: "order123",
      userID: "user456", // Must match JWT user ID
      itemName: "Afghan Rug",
      totalPrice: 150.00,
      status: "shipped",
      createdAt: "2026-04-02T10:00:00Z"
    }
  ]
}
```

---

## 🔴 Admin Dashboard (`/admin`)

### What It Is
A **protected, admin-only** control panel for system management and business oversight.

### Access Rules
- ✅ **Accessible to:** Admin users only (requires bootstrap code to create)
- ✅ **Requires:** Valid admin JWT token
- ✅ **Route protection:** `RequireAdminAuth` guard component
- ❌ **Not accessible to:** Regular users, unauthenticated visitors
- ❌ **Redirect behavior:** Non-admins redirected to home page (`/`)

### Admin Authentication Flow
1. **First Admin Setup:** If no admins exist, first signup is approved without code
2. **Subsequent Admins:** Need `ADMIN_BOOTSTRAP_CODE` from environment
3. **Protected:** Only you can create other admins via bootstrap code

### Admin Features (Full System Control)

#### 🎯 Overview Tab (NEW)
- System status at a glance
- All users, items, orders, transactions counts
- Quick links to all admin tools
- Feature checklist

#### Orders Management (`/admin?tab=orders`)
- All marketplace orders (not just personal)
- Refund processing
- Order status updates
- User order history

#### Transactions Tracking
- Complete transaction ledger
- Buy/sell activity of all users
- Financial oversight
- Settlement tracking

#### User Management
- Create, edit, disable user accounts
- View all user data
- Manage user roles

#### Marketplace Control
- All artifacts/items (not just personal listings)
- Approve/reject listings
- Feature or de-list items
- Inventory management

#### Payment & Payouts
- Commission calculations
- Payout processing
- Settlement contracts
- Financial reporting

#### Cloud Storage Management
- File upload limits
- Storage quotas
- Backup controls

#### Health & Monitoring
- System status
- API health
- Database monitoring
- Performance metrics

#### Settings
- Admin configuration
- Security settings
- System preferences

#### Additional Admin Tabs
- Archive Management
- Attribution & Credits
- Blockchain Integration
- API Documentation
- Knowledge Library
- OpenClaw Gateway
- Bounty Hunter Integration
- Royalty Analytics

### What Admin Can Do
- ✅ View ALL user data
- ✅ Process refunds and payments
- ✅ Manage all marketplace items
- ✅ Create other admin accounts
- ✅ Configure system settings
- ✅ View analacencies  and settle balances
- ✅ Manage storage and backups
- ✅ Monitor system health
- ✅ Access sensitive business data

---

## 🔐 Security Architecture

### Route Protection
```javascript
// User Dashboard - Protected with RequireUserAuth
<Route path="/dashboard" element={<RequireUserAuth><UserDashboard /></RequireUserAuth>} />

// Admin Dashboard - Protected with RequireAdminAuth
<Route path="/admin" element={<RequireAdminAuth><AdminPage /></RequireAdminAuth>} />
<Route path="/admin/orders" element={<RequireAdminAuth><AdminOrdersPage /></RequireAdminAuth>} />
```

### RequireUserAuth Component
- Checks for valid user token
- Allows all authenticated users
- Redirects to `/login?next=/dashboard` if not authenticated

### RequireAdminAuth Component (NEW)
- Checks for admin token
- Only allows admin users
- Redirects to `/` (home) if not admin
- Non-admins cannot access `/admin` routes

### Token Management
- **User tokens:** Standard JWT in `localStorage: token`
- **Admin tokens:** Admin-specific JWT in `localStorage: admin-token`
- **Token expiration:** 12 hours for both
- **Cleanup:** Both cleared from `localStorage` on 401 response

### Backend API Protection
- All `/admin/*` endpoints require admin role verification
- All `/api/*` endpoints must validate JWT and return only authorized data
- User isolation enforced server-side (not client-side)
- Sensitive fields never returned to frontend

---

## 🚀 Deployment Checklist

Before deploying this dual-dashboard system:

### Frontend
- [ ] Build passes: `npm run build` ✅ (completed)
- [ ] No ESLint errors
- [ ] No TypeScript errors
- [ ] Routing correctly configured in App.jsx ✅
- [ ] RequireAdminAuth guard in place ✅
- [ ] RequireUserAuth guard in place (existing)
- [ ] UserDashboard component created ✅
- [ ] User Dashboard CSS styled ✅
- [ ] Admin Dashboard still works ✅

### Backend API
- [ ] `/dashboard` routes validate user JWT
- [ ] `/admin` routes validate admin JWT
- [ ] `/api/admin/*` endpoints restrict to admin role (verify JWT + check role field)
- [ ] `/api/orders`, `/api/items`, `/api/transactions` return only user's data
- [ ] No API endpoint leaks other users' data
- [ ] 401 responses returned for unauthorized access
- [ ] CORS configured for both dashboard domains

### Environment Variables
```env
# Backend (already configured)
JWT_SECRET=your_secret
ADMIN_BOOTSTRAP_CODE=your_bootstrap_code
MONGODB_URI=your_mongo_uri

# Frontend (Vite env)
VITE_API_URL=https://api.yourdomain.com
```

### Testing
- [ ] User Dashboard loads at `/dashboard` for logged-in users
- [ ] User Dashboard redirects to login at `/login` for guests
- [ ] Admin Dashboard loads at `/admin` for admin users only
- [ ] Non-admin users redirected from `/admin` to `/`
- [ ] User data isolation verified (user only sees own orders/items)
- [ ] Admin can see all orders/items/users
- [ ] JWT tokens correctly set/cleared in localStorage

---

## 📍 URL Map

| Route | Access | Purpose | Component |
|-------|--------|---------|-----------|
| `/` | Public | Home page | ArchiveLibraryPage |
| `/library` | Public | Archive content | ArchiveLibraryPage |
| `/marketplace` | Public | Browse items | MarketplacePage |
| `/login` | Public | Sign in | LoginPage |
| `/register` | Public | Create account | RegisterPage |
| `/dashboard` | Users only | Personal dashboard | **UserDashboard** |
| `/admin` | Admins only | Admin panel | **AdminPage** (protected) |
| `/admin/orders` | Admins only | Order management | **AdminOrdersPage** (protected) |
| `/account` | Users only | Account settings | AccountPage |
| `/items/new` | Users only | Create listing | ListItemPage |
| `/items/mine` | Users only | My listings | MyListingsPage |

---

## 🔄 Data Flow

### User Dashboard Flow
```
User @ /dashboard
         ↓
RequireUserAuth checks token
         ↓
User has token → Load UserDashboard
         ↓
UserDashboard calls:
  - GET /api/orders (returns USER's orders only)
  - GET /api/items/mine (returns USER's items)
  - GET /api/transactions (returns USER's transactions)
  - GET /api/sales/metrics (returns USER's metrics)
  - GET /api/orders/escrow (returns USER's escrow)
         ↓
Backend verifies JWT, extracts userID, returns filtered data
         ↓
Display results (safe, personal data)
```

### Admin Dashboard Flow
```
Admin @ /admin
         ↓
RequireAdminAuth checks admin token
         ↓
Admin has admin token → Load AdminPage
         ↓
AdminPage renders multiple tabs:
  - Overview (system-wide metrics)
  - Orders (ALL orders, can process refunds)
  - Transactions (all marketplace activity)
  - Users (manage all users)
  - Marketplace (all items)
  - Payouts (settlement, payments)
         ↓
Backend verifies JWT + role="admin"
         ↓
Returns all system data (no filtering)
```

---

## 🛡️ Escrow Integration

The User Dashboard includes **Escrow Status** showing user's escrow-protected transactions:
- Funds held in escrow during transaction
- Release dates visible to both parties
- Status tracking (held → released → complete)
- No access to other users' escrow (backend filters)

---

## ✅ Testing Scenarios

### Test Case 1: User Access
```
1. Register new user at /register
2. Login at /login
3. Navigate to /dashboard
4. Should see: My Orders (empty), My Items (empty), etc.
5. Create a listing at /items/new
6. Back to /dashboard → Should see item in "My Items"
```

### Test Case 2: Admin Access
```
1. Login as admin (or register first admin)
2. Navigate to /admin
3. Should see: Overview tab with system stats
4. Click "Orders" tab → See ALL orders (not just personal)
5. Verify user dashboard not accessible as admin
```

### Test Case 3: Security - Unauthorized Access
```
1. Guest user tries to visit /dashboard → Redirected to /login
2. Regular user tries to visit /admin → Redirected to /
3. Access /admin/orders without token → Redirected to /
```

### Test Case 4: Token Expiration
```
1. Login, access /dashboard
2. Clear localStorage token
3. Page should detect missing token and redirect
4. Or: API returns 401 → Global handler clears session
```

---

## 📚 File Structure

```
Frontend/
├── src/
│   ├── pages/
│   │   ├── AdminPage.jsx          (Protected admin shell)
│   │   ├── AdminOrdersPage.jsx    (Protected order management)
│   │   ├── UserDashboard.jsx      (NEW - Public user dashboard)
│   │   ├── UserDashboard.css      (NEW - User dashboard styles)
│   │   └── ...
│   ├── components/
│   │   ├── AdminTabs.jsx          (Admin tab navigation)
│   │   ├── RequireUserAuth.jsx    (User protection guard)
│   │   ├── RequireAdminAuth.jsx   (NEW - Admin protection guard)
│   │   ├── NavLink.jsx            (NEW - Navigation helper)
│   │   ├── AdminNav.jsx
│   │   ├── DashboardTab.jsx
│   │   ├── TransactionsTab.jsx
│   │   ├── OverviewTab.jsx
│   │   └── ...
│   ├── lib/
│   │   ├── api.js                 (API helpers)
│   │   ├── auth.js                (Token management)
│   │   └── axios.js               (HTTP client with interceptors)
│   ├── App.jsx                     (Routing - UPDATED)
│   └── base.css                    (Theme variables)
└── dist/                           (Built output)
```

---

## 🎯 Next Steps

1. ✅ Build complete - both dashboards working
2. **Deploy** frontend to production
3. **Verify** backend API filters user data correctly
4. **Test** admin bootstrap code works
5. **Monitor** escrow system and transactions
6. **Document** for users where to find `/dashboard`

---

## ❓ Support

### Common Issues

**Q: I go to `/admin` and get redirected to home**
A: You don't have admin access. Use the bootstrap code to create an admin account at `/admin/signup`

**Q: User Dashboard is empty**
A: Check API endpoints are returning data. Make sure backend filters by user ID.

**Q: Can't create 2nd admin account**
A: Check `ADMIN_BOOTSTRAP_CODE` is set in Vercel environment and backend was re-deployed.

**Q: Regular user can see other user's orders on `/dashboard`**
A: Backend is not filtering! Ensure `/api/orders` extracts userID from JWT and filters results.

---

## References

- [ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md) - Admin account creation
- [Frontend Instructions](./github/instructions/frontend.instructions.md) - Frontend rules
- [Backend Instructions](./github/instructions/backend.instructions.md) - Backend rules
- Session memory: `/memories/repo/admin-auth-session-401.md` - Auth patterns
