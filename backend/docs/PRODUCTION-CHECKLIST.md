# 📋 Production Deployment Checklist

## Pre-Deployment (LOCAL TESTING)

### ✅ Code Quality
- [x] All tests passing: `npm test`
- [x] Type checking: `npm run typecheck`
- [x] Linting: `npm run lint:check`
- [x] No security issues: `npm run qa:secrets:scan`
- [x] Brand compliance: `npm run qa:brand:check`

### ✅ API Verification (Local)
```bash
# Start backend
npm run dev:backend

# In another terminal, verify all endpoints
npm run deploy:verify
```

Expected output:
- ✅ API Health
- ✅ Express Ping
- ✅ Version Info
- ✅ Full Health Check
- ✅ Endpoint List
- ✅ Integration Tests
- ✅ OpenAPI Spec
- ✅ Swagger UI

### ✅ Database Setup
```bash
# Seed with sample data
npm run seed:db

# Verify database connection
npm run db:check
```

Expected output:
```
✅ Connected to MongoDB
✅ Created 6 users
✅ Created 3 shops
✅ Created 6 products
✅ SEEDING COMPLETE
```

### ✅ Frontend Components
```bash
# Build frontend
npm run build:frontend

# Verify components compile
npm run typecheck:frontend
```

### ✅ Documentation
- [x] OpenAPI spec: `/api/openapi.json`
- [x] Swagger UI: `/api/docs`
- [x] Markdown guide: `backend/docs/API-DOCS.md`
- [x] Health endpoints: `/api/health-check`

### ✅ Git Status
```bash
# Verify all changes committed
git status
# Expected: nothing to commit, working tree clean

# Check logs
git log --oneline -5
```

---

## Deployment to Vercel

### Step 1: Fix Vercel Account
- [ ] Check billing status: https://vercel.com/settings/billing
- [ ] Update payment method if needed
- [ ] Re-enable project

### Step 2: Set Environment Variables on Vercel
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pvabazaar
JWT_SECRET=your-secret-key
ETHEREUM_RPC_URL=https://rpc.example.com
NODE_ENV=production
```

### Step 3: Deploy
```bash
# Deploy is automatic on push to main
git push origin main

# Monitor deployment at: https://vercel.com/dashboard
```

### Step 4: Post-Deployment Verification
```bash
# Set API_URL to production
export API_URL=https://api.pvabazaar.org

# Run verification script
npm run deploy:verify

# Start monitoring
npm run monitor:prod
```

---

## Post-Deployment

### ✅ Verify Production
```bash
# Health check
curl https://api.pvabazaar.org/api/health

# Full system check
curl https://api.pvabazaar.org/api/health-check

# View documentation
https://api.pvabazaar.org/api/docs
```

### ✅ Monitor Production
```bash
# Start continuous monitoring
npm run monitor:prod
```

This will:
- Check all endpoints every 30 seconds
- Log results to `logs/monitor.log`
- Save status to `logs/status.json`
- Alert on consecutive failures

### ✅ Database Verification
```bash
# Verify production database
npm run db:check
```

---

## Rollback Plan

### If Production Fails
```bash
# 1. Check logs
https://vercel.com/dashboard/YOUR_PROJECT/deployments

# 2. Revert to previous commit
git revert HEAD
git push origin main

# 3. Redeploy
# Vercel auto-redeploys on push

# 4. Verify
npm run deploy:verify
```

---

## Performance Targets

### API Response Times
- Health check: < 100ms
- Endpoint list: < 200ms
- OpenAPI spec: < 300ms
- Docs UI: < 500ms

### Availability
- Target: 99.5% uptime
- Max consecutive failures before alert: 3
- Monitor interval: 30 seconds

### Database
- Connection time: < 500ms
- Query timeout: 30 seconds
- Connection pool: 10 connections

---

## Alert Conditions

### Critical (Immediate Action)
- ❌ API health endpoint down
- ❌ Database disconnected
- ❌ 3+ consecutive failures
- ❌ Response time > 5 seconds

### Warning (Monitor)
- ⚠️ Response time > 1 second
- ⚠️ Single endpoint down
- ⚠️ Memory usage > 80%

### Info (Log Only)
- ℹ️ Unusual traffic patterns
- ℹ️ Slow queries detected
- ℹ️ Rate limiting triggered

---

## Monitoring Dashboard

### View Status
```bash
# Check current status
cat logs/status.json

# View logs
tail -f logs/monitor.log
```

Expected output:
```json
{
  "timestamp": "2026-04-14T12:30:00Z",
  "healthy": true,
  "endpoints_healthy": 8,
  "total_endpoints": 8,
  "avg_response_time": 145,
  "results": [
    {
      "endpoint": "/api/health",
      "status": 200,
      "success": true,
      "responseTime": 42
    },
    ...
  ]
}
```

---

## Ongoing Maintenance

### Daily
- [ ] Check monitoring logs
- [ ] Verify health endpoints
- [ ] Review error logs

### Weekly
- [ ] Performance analysis
- [ ] Database backups check
- [ ] Security scan

### Monthly
- [ ] Full testing suite
- [ ] Capacity planning
- [ ] Dependency updates

---

## Documentation Links

- 🌐 **Swagger UI**: https://api.pvabazaar.org/api/docs
- 📋 **OpenAPI Spec**: https://api.pvabazaar.org/api/openapi.json
- 📚 **Full Guide**: https://github.com/PVAGR/pva-bazaar-app/blob/main/backend/docs/API-DOCS.md
- 🔍 **Health Status**: https://api.pvabazaar.org/api/health-check
- 📊 **Monitoring**: Local logs at `logs/monitor.log`

---

## Support Contacts

- **Tech**: Claude Code (@anthropic)
- **Deployment**: Vercel (https://vercel.com/support)
- **Database**: MongoDB Atlas (https://www.mongodb.com/support)

---

## Sign-off

- [ ] All local tests passing
- [ ] All code committed
- [ ] Documentation complete
- [ ] Environment variables set
- [ ] Monitoring configured
- [ ] Ready for production deployment

**Last Updated**: April 14, 2026
**Status**: 🟢 READY FOR PRODUCTION

---

**Next Step**: Fix Vercel billing → Deploy → Verify → Monitor
