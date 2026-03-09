# OpenClaw Event Integration Guide

## Overview

PVA Bazaar now dispatches OpenClaw events from key application routes, providing real-time visibility into user actions, transactions, and system activities. Events are dispatched asynchronously and non-blocking to ensure user requests complete successfully even if OpenClaw is unavailable.

## Integrated Routes

### Authentication Events (`backend/routes/auth.js`)

#### User Registration
```javascript
dispatchToOpenClaw(createUserEvent('registered', userId, {
  email: user.email,
  name: user.name
}));
```

**Triggered on:** `POST /api/auth/register`  
**Event Type:** `user.registered`  
**Payload:**
- `userId`: MongoDB ObjectId
- `email`: User email address
- `name`: User display name

#### User Authentication
```javascript
dispatchToOpenClaw(createUserEvent('authenticated', userId, {
  email: user.email,
  method: 'password'
}));
```

**Triggered on:** `POST /api/auth/login`  
**Event Type:** `user.authenticated`  
**Payload:**
- `userId`: MongoDB ObjectId
- `email`: User email address
- `method`: Authentication method (currently 'password')

### Transaction Events (`backend/routes/checkout.js`)

#### Transaction Creation
```javascript
dispatchToOpenClaw(createTransactionEvent('created', orderId, {
  itemId: item.id,
  itemName: item.name,
  amountCents: item.priceCents,
  currency: item.currency,
  sessionId: session.id
}));
```

**Triggered on:** `POST /api/checkout/create-session`  
**Event Type:** `transaction.created`  
**Payload:**
- `orderId`: MongoDB ObjectId
- `itemId`: Artifact/item identifier
- `itemName`: Human-readable item name
- `amountCents`: Transaction amount in cents
- `currency`: ISO currency code (e.g., 'USD')
- `sessionId`: Stripe Checkout session ID

### Artifact Events (`backend/routes/artifacts.js`)

#### Artifact Creation
```javascript
dispatchToOpenClaw(createArtifactEvent('created', artifactId, {
  name: artifact.name,
  slug: artifact.slug,
  status: artifact.status
}));
```

**Triggered on:** `POST /api/artifacts`  
**Event Type:** `artifact.created`  
**Payload:**
- `artifactId`: MongoDB ObjectId
- `name`: Artifact name
- `slug`: URL-friendly slug
- `status`: Publication status ('draft', 'published', etc.)

## Event Creators Reference

All event creators are available from `backend/utils/openclaw-events.js`:

### Available Event Types

| Event Creator | Action Types | Use Case |
|---------------|--------------|----------|
| `createArtifactEvent()` | `created`, `updated`, `deleted`, `published` | Artifact lifecycle |
| `createUserEvent()` | `registered`, `authenticated`, `updated`, `deleted` | User lifecycle |
| `createTransactionEvent()` | `created`, `completed`, `failed`, `refunded` | Payment flow |
| `createFractionalEvent()` | `ownership_created`, `ownership_transferred`, `share_purchased` | Fractional ownership |
| `createProvenanceEvent()` | `verified`, `updated`, `blockchain_anchored` | Provenance tracking |
| `createSystemEvent()` | `startup`, `shutdown`, `error`, `warning`, `info` | System monitoring |

## Adding Events to New Routes

### Step 1: Import Event Creators
```javascript
const { createUserEvent, dispatchToOpenClaw } = require('../utils/openclaw-events');
```

### Step 2: Dispatch Events After Success
```javascript
router.post('/some-route', async (req, res) => {
  try {
    // Your business logic here
    const result = await doSomething();
    
    // Dispatch event (non-blocking)
    dispatchToOpenClaw(createUserEvent('action_name', userId, {
      customField: 'value'
    }));
    
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});
```

### Step 3: Test Event Dispatching
```powershell
# Use the CLI dispatcher to test
.\infra\openclaw\dispatch-event.ps1 `
  -EventType "user.test" `
  -Message "Testing event integration" `
  -Severity "info" `
  -ProductionMode
```

## Event Payload Best Practices

### ✅ Do:
- Include essential identifiers (IDs, slugs, emails)
- Add human-readable labels (names, descriptions)
- Include status/state information
- Keep payloads under 10KB
- Use ISO standards (ISO 4217 for currency, ISO 8601 for dates)

### ❌ Don't:
- Include sensitive data (passwords, tokens, PII)
- Add large binary data
- Include deeply nested objects (> 3 levels)
- Send duplicate information already in event metadata

## Monitoring Event Delivery

### View Recent Events
```bash
# API endpoint
curl http://localhost:3000/api/openclaw/recent-events?limit=20

# Admin panel
# Navigate to Admin → OpenClaw Summary → Recent Events
```

### Check Event Metrics
```bash
# Prometheus metrics
curl http://localhost:3000/api/openclaw/metrics

# Look for:
# openclaw_events_total{type="user.registered"}
# openclaw_dispatch_success_total
# openclaw_dispatch_failure_total
```

### Integration Tests
```powershell
# Run full integration test suite
.\infra\openclaw\test-integration.ps1 -Verbose -ProductionMode
```

## Error Handling

Events are dispatched with automatic retry and graceful degradation:

1. **Non-blocking**: User requests complete successfully even if event dispatch fails
2. **Automatic retry**: Failed dispatches retry up to 3 times with exponential backoff
3. **Error logging**: Failures are logged to `openclaw-dispatch-errors.log`
4. **Metrics tracking**: `openclaw_dispatch_failure_total` increments on permanent failure

## Public Status Page

View live event activity at:
```
https://pvabazaar.org/status.html
```

The status page displays:
- OpenClaw health indicator
- Recent system events (last 5)
- API and database status
- System uptime

## Further Reading

- [OpenClaw Integration Guide](./OPENCLAW_INTEGRATION.md)
- [OpenClaw Architecture](./OPENCLAW_ARCHITECTURE.md)
- [OpenClaw Quick Reference](./OPENCLAW_QUICK_REFERENCE.md)
- [Event Creators Source](./backend/utils/openclaw-events.js)

## Summary

✅ **3 routes now dispatch events:**
- `auth.js` → User registration & authentication
- `checkout.js` → Transaction creation
- `artifacts.js` → Artifact creation

✅ **Non-blocking architecture:** User requests never fail due to event issues

✅ **Full observability:** Events visible in admin panel, metrics endpoint, and logs

✅ **Public monitoring:** [status.html](./Frontend/pages/status.html) provides external visibility
