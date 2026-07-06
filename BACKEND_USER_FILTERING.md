# Backend User Data Filtering - Critical for Dual Dashboard Security

## ⚠️ CRITICAL REQUIREMENT

For the User Dashboard to work securely, **every API endpoint must filter data by the logged-in user's ID**.

If the backend returns ALL users' data instead of just the current user's, users will see each other's private information. This is a **security vulnerability**.

---

## How It Should Work

### Request Flow

```
1. User logs in → receives JWT token with { id: 'user123', role: 'user' }
2. JWT stored in localStorage
3. Frontend sends request: GET /api/orders
   Headers: { Authorization: 'Bearer eyJhb...' }
4. Backend middleware decodes JWT → extracts user ID
5. Backend queries: Order.find({ userId: 'user123' })
6. Returns ONLY that user's orders
7. User Dashboard displays filtered results
```

---

## Backend Filtering Implementation

### 1. Auth Middleware (Already exists)

File: `backend/middleware/auth.js` or similar

```javascript
// Verify JWT and attach user ID to request
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 2. Update Each Endpoint

#### GET /api/orders

```javascript
// ❌ WRONG - Returns ALL orders
router.get('/orders', (req, res) => {
  Order.find().then((orders) => res.json({ orders }));
});

// ✅ CORRECT - Returns only user's orders
router.get('/orders', authMiddleware, (req, res) => {
  const userId = req.user.id; // Extract from JWT
  Order.find({ userId }).then((orders) => {
    res.json({ ok: true, orders });
  });
});
```

#### GET /api/items/mine

```javascript
// ✅ CORRECT - Returns only user's items
router.get('/items/mine', authMiddleware, (req, res) => {
  const userId = req.user.id;
  Item.find({ creatorId: userId }).then((items) => {
    res.json({ ok: true, items });
  });
});
```

#### GET /api/transactions

```javascript
// ✅ CORRECT - Returns only user's transactions
router.get('/transactions', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const limit = req.query.limit || 10;

  Transaction.find({
    $or: [{ buyerId: userId }, { sellerId: userId }],
  })
    .limit(limit)
    .sort({ createdAt: -1 })
    .then((txs) => res.json(txs));
});
```

#### GET /api/sales/metrics

```javascript
// ✅ CORRECT - Returns only user's sales metrics
router.get('/sales/metrics', authMiddleware, (req, res) => {
  const userId = req.user.id;

  Transaction.aggregate([
    { $match: { sellerId: new ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$amount' },
        thisMonth: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', new Date(new Date().setDate(1))] }, '$amount', 0],
          },
        },
        thisWeek: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
              '$amount',
              0,
            ],
          },
        },
      },
    },
  ]).then((metrics) => {
    res.json(metrics[0] || { totalSales: 0, thisMonth: 0, thisWeek: 0 });
  });
});
```

#### GET /api/orders/escrow

```javascript
// ✅ CORRECT - Returns only user's escrow orders
router.get('/orders/escrow', authMiddleware, (req, res) => {
  const userId = req.user.id;

  Order.find({
    $or: [
      { buyerId: userId, hasEscrow: true },
      { sellerId: userId, hasEscrow: true },
    ],
  })
    .select('_id itemName totalPrice status releaseDate')
    .then((escrows) => {
      res.json(escrows);
    });
});
```

---

## Admin Endpoints (No Filtering)

Admin endpoints should **NOT filter by user** - admins see everything:

```javascript
// Admin: See ALL orders
router.get('/admin/orders', authMiddleware, adminRequired, (req, res) => {
  Order.find().then((orders) => {
    res.json({ ok: true, orders }); // No userId filter
  });
});

// Admin: See ALL transactions
router.get('/admin/transactions', authMiddleware, adminRequired, (req, res) => {
  Transaction.find().then((txs) => {
    res.json(txs); // No userId filter
  });
});
```

---

## Sensitive Fields to NEVER Return

Even when filtering by user ID, never return:

```javascript
// ❌ DON'T include these fields in response:
- password
- passwordHash
- securityQuestion
- securityAnswer
- creditCard
- bankAccount
- apiKey
- adminSecret
- jwtSecret
- privateKey
- stripeToken

// ✅ Safe to include:
- name
- email (user can see own)
- phone (if shared)
- address (if shared)
- avatar
- createdAt
- items (user's own only)
- orders (user's own only)
- transactions (user's own only)
```

---

## Field Mappings

Ensure your database has correct user ID fields:

| Collection  | User ID Field          | Example Query                          |
| ----------- | ---------------------- | -------------------------------------- |
| Order       | `userId` or `buyerId`  | `{ userId: 'user123' }`                |
| Item        | `creatorId`            | `{ creatorId: 'user123' }`             |
| Transaction | `buyerId` & `sellerId` | `{ $or: [{ buyerId }, { sellerId }] }` |
| Escrow      | `buyerId` & `sellerId` | Same as transaction                    |
| SalesMetric | `sellerId`             | `{ sellerId: 'user123' }`              |

---

## Testing Data Isolation

### Test Script

```javascript
// Test that API correctly filters data

// 1. Create two users
const user1 = await User.create({ email: 'user1@test.com' });
const user2 = await User.create({ email: 'user2@test.com' });

// 2. Create orders for both
const order1 = await Order.create({ userId: user1._id, totalPrice: 100 });
const order2 = await Order.create({ userId: user2._id, totalPrice: 200 });

// 3. Test endpoints with user1's token
const response1 = await GET('/api/orders', { token: user1Token });
// ✅ Should return: [order1] only, NOT order2

// 4. Test endpoints with user2's token
const response2 = await GET('/api/orders', { token: user2Token });
// ✅ Should return: [order2] only, NOT order1

// 5. Test admin endpoint
const adminResponse = await GET('/admin/orders', { token: adminToken });
// ✅ Should return: [order1, order2] - all orders
```

---

## Checklist Before Launch

- [ ] Auth middleware properly decodes JWT
- [ ] `req.user.id` contains correct user ID
- [ ] GET `/api/orders` filters by userId
- [ ] GET `/api/items/mine` filters by creatorId
- [ ] GET `/api/transactions` filters by buyerId/sellerId
- [ ] GET `/api/sales/metrics` returns only user's metrics
- [ ] GET `/api/orders/escrow` filters by userId
- [ ] Admin endpoints (`/admin/*`) do NOT filter
- [ ] Admin require role==='admin' check
- [ ] Sensitive fields never returned
- [ ] Test with 2+ users to verify isolation
- [ ] 401 returned for missing/invalid tokens

---

## Common Issues & Fixes

### Issue: User sees other users' orders

**Solution:** Add `{ userId: req.user.id }` filter to `Order.find()`

### Issue: User sees all items in `/dashboard`

**Solution:** Add `{ creatorId: req.user.id }` filter to `Item.find({ creatorId: req.user.id })`

### Issue: Transactions endpoint returns empty

**Solution:** Use `$or` to match buyerId OR sellerId:

```javascript
Transaction.find({
  $or: [{ buyerId: userId }, { sellerId: userId }],
});
```

### Issue: Admin can't see all data

**Solution:** Don't filter in `/admin/*` endpoints:

```javascript
// ❌ Wrong
router.get('/admin/orders', (req, res) => {
  Order.find({ userId: req.user.id }); // This filters!
});

// ✅ Correct
router.get('/admin/orders', (req, res) => {
  Order.find({}); // Return all
});
```

---

## Security Best Practices

1. **Always extract user ID from JWT** - never trust client-provided userID
2. **Filter at database level** - never retrieve all, then filter in code
3. **Test with multiple users** - ensure one user can't see another's data
4. **Use `.select()` to exclude fields** - never return passwords or secrets
5. **Log unauthorized access attempts** - track who tries to access other users' data
6. **Rate limit** - prevent brute force attacks on endpoints
7. **Use HTTPS/SSL** - tokens vulnerable in plaintext

---

## References

- Backend instructions: `.github/instructions/backend.instructions.md`
- JWT decode example: `backend/middleware/auth.js`
- Models reference: `backend/models/Order.js`, `Transaction.js`, etc.
- API routes: `backend/routes/*`
