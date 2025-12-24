# PVA Bazaar Operations & Monitoring Guide

## Overview

This guide provides comprehensive information about monitoring, maintaining, and ensuring 24/7 availability of the PVA Bazaar application.

## Table of Contents

1. [Health Monitoring System](#health-monitoring-system)
2. [Uptime Monitoring](#uptime-monitoring)
3. [Auto-Recovery Features](#auto-recovery-features)
4. [Logging & Metrics](#logging--metrics)
5. [Rate Limiting](#rate-limiting)
6. [Troubleshooting](#troubleshooting)
7. [Incident Response](#incident-response)

---

## Health Monitoring System

### Health Check Endpoints

The application provides multiple health check endpoints for different monitoring scenarios:

#### 1. Comprehensive Health Check
```bash
GET /api/health
```

**Response:**
```json
{
  "ok": true,
  "message": "PVA Bazaar API is healthy",
  "timestamp": "2024-12-24T23:00:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "state": "connected",
    "type": "mongodb",
    "responsive": true
  },
  "memory": {
    "heapUsed": "85 MB",
    "heapTotal": "120 MB",
    "rss": "150 MB",
    "external": "5 MB"
  },
  "responseTime": "45 ms"
}
```

**Use Case:** Detailed health monitoring and diagnostics

#### 2. Ping Endpoint (Quick Check)
```bash
GET /api/health/ping
```

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-12-24T23:00:00.000Z"
}
```

**Use Case:** Fast uptime checks, minimal overhead

#### 3. Readiness Check
```bash
GET /api/health/ready
```

**Returns:**
- `200 OK` when service is ready to handle traffic
- `503 Service Unavailable` when service is not ready

**Use Case:** Load balancer health checks, Kubernetes readiness probes

#### 4. Liveness Check
```bash
GET /api/health/live
```

**Returns:**
- `200 OK` if the process is alive

**Use Case:** Container orchestration liveness probes

### Health Monitoring Script

A comprehensive monitoring script is available at `scripts/monitor-health.sh`.

#### Basic Usage

```bash
# Monitor local development server
./scripts/monitor-health.sh http://localhost:5001

# Monitor production
./scripts/monitor-health.sh https://api.pvabazaar.org

# Verbose output
./scripts/monitor-health.sh https://api.pvabazaar.org --verbose

# JSON output for automation
./scripts/monitor-health.sh https://api.pvabazaar.org --json

# With Slack alerts
./scripts/monitor-health.sh https://api.pvabazaar.org --slack https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### Output Interpretation

The script checks:
- ✅ Basic connectivity
- ✅ Detailed health status
- ✅ Service readiness
- ✅ Critical API endpoints
- ✅ Response time performance

**Status Levels:**
- **HEALTHY** (exit code 0): All systems operational
- **DEGRADED** (exit code 1): Service running but with issues
- **UNHEALTHY** (exit code 2): Critical failures detected

---

## Uptime Monitoring

### GitHub Actions Workflow

Automated monitoring runs every 5 minutes via GitHub Actions (`.github/workflows/uptime-monitoring.yml`).

#### Features

- ✅ **Continuous Monitoring**: Checks every 5 minutes
- ✅ **Multi-Service Checks**: Backend API, Frontend sites
- ✅ **Automatic Alerting**: Creates GitHub issues on failures
- ✅ **Slack Notifications**: Real-time alerts to team
- ✅ **Health Reports**: Detailed artifacts for debugging
- ✅ **Status Badges**: Real-time status indicators

#### Manual Trigger

You can manually trigger monitoring from GitHub Actions:

1. Go to **Actions** tab in GitHub
2. Select **Uptime Monitoring** workflow
3. Click **Run workflow**
4. Choose environment (production/staging)
5. Click **Run workflow** button

#### Monitoring Alerts

When issues are detected:

1. **GitHub Issue**: Auto-created with label `health-alert`, `production`, `urgent`
2. **Slack Message**: Sent to monitoring channel (if configured)
3. **Workflow Artifact**: Health report available for download

### Status Badge

Add status badge to your README:

```markdown
[![Status](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/YOUR_USERNAME/YOUR_GIST_ID/raw/pva-bazaar-uptime.json)](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/uptime-monitoring.yml)
```

---

## Auto-Recovery Features

### Database Connection Retry

The application automatically retries database connections with exponential backoff:

- **Max Attempts**: 3
- **Delay**: 2s, 4s, 6s (exponential backoff)
- **Fallback**: In-memory DB (development only)

**Configuration:**
```javascript
// In backend/api/index.js
MAX_RETRY_ATTEMPTS = 3
RETRY_DELAY_MS = 2000
```

### Connection Monitoring

The system monitors MongoDB connection state and automatically:
- Logs connection events
- Clears cache on disconnection
- Attempts reconnection on next request

### Docker Auto-Restart

All services are configured with `restart: unless-stopped`:

```yaml
services:
  backend:
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "http://localhost:5001/api/health/ping"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Docker will automatically restart services that:**
- Crash or exit unexpectedly
- Fail health checks 3 times in a row

### Graceful Shutdown

The application handles `SIGINT` signals gracefully:
- Closes database connections
- Completes pending requests
- Logs shutdown status

---

## Logging & Metrics

### Request Logging

All API requests are logged automatically:

**Console Output:**
```
GET /api/artifacts 200 45ms
POST /api/auth/login [REDACTED] 200 123ms
```

**Log Files:**
- `backend/logs/access.log` - All requests
- `backend/logs/error.log` - Error details
- `backend/logs/slow-requests.log` - Performance issues

### Performance Monitoring

Requests slower than 1000ms are automatically flagged:

```json
{
  "timestamp": "2024-12-24T23:00:00.000Z",
  "method": "GET",
  "path": "/api/search",
  "duration": "1234ms",
  "status": 200,
  "warning": "SLOW_REQUEST"
}
```

### Metrics Endpoint

Access detailed metrics (requires authentication):

```bash
curl -H "X-Metrics-Key: YOUR_METRICS_KEY" \
  https://api.pvabazaar.org/api/metrics
```

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-12-24T23:00:00.000Z",
  "uptime": 3600.5,
  "metrics": {
    "total": 1523,
    "byMethod": {
      "GET": 1200,
      "POST": 300,
      "PUT": 20,
      "DELETE": 3
    },
    "byStatus": {
      "2xx": 1450,
      "4xx": 50,
      "5xx": 23
    },
    "errors": 23
  },
  "rateLimits": {
    "totalKeys": 45,
    "topOffenders": [...]
  },
  "database": {
    "connected": true,
    "state": "connected"
  },
  "memory": {
    "heapUsed": "85 MB",
    "heapTotal": "120 MB"
  }
}
```

---

## Rate Limiting

### Protection Levels

Different endpoints have different rate limits:

| Endpoint Type | Limit | Window | Purpose |
|--------------|-------|--------|---------|
| Health checks | 1000/min | 1 minute | High availability monitoring |
| Authentication | 5 requests | 15 minutes | Brute force protection |
| General API | 100/min | 1 minute | Standard protection |
| Search | 50/min | 1 minute | Resource intensive queries |
| Creation | 20 requests | 5 minutes | Spam prevention |

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-12-24T23:01:00.000Z
```

### Rate Limit Exceeded

When limit is exceeded:

```json
{
  "ok": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please slow down.",
  "retryAfter": 45
}
```

**HTTP Status:** `429 Too Many Requests`

### Monitoring Rate Limits

Check rate limit statistics via metrics endpoint:

```bash
curl -H "X-Metrics-Key: YOUR_KEY" \
  https://api.pvabazaar.org/api/metrics | jq '.rateLimits'
```

---

## Troubleshooting

### Common Issues

#### 1. Service Not Responding

**Symptoms:**
- Health check returns timeout
- Frontend cannot connect to API

**Diagnosis:**
```bash
# Check if service is running
docker-compose ps

# View logs
docker-compose logs backend

# Run health check
./scripts/monitor-health.sh http://localhost:5001 --verbose
```

**Solutions:**
- Restart services: `docker-compose restart`
- Check environment variables
- Verify database connection
- Review error logs

#### 2. Database Connection Issues

**Symptoms:**
- Health check shows `"database.connected": false`
- Error: "Database not connected"

**Diagnosis:**
```bash
# Check MongoDB status
docker-compose ps mongo

# Check MongoDB logs
docker-compose logs mongo

# Test connection
mongosh mongodb://localhost:27017/pvabazaar
```

**Solutions:**
- Restart MongoDB: `docker-compose restart mongo`
- Check `MONGODB_URI` environment variable
- Verify network connectivity
- Check MongoDB disk space

#### 3. High Response Times

**Symptoms:**
- Health check shows high response time
- Slow request warnings in logs

**Diagnosis:**
```bash
# Check system resources
docker stats

# Review slow request log
tail -f backend/logs/slow-requests.log

# Check metrics
curl -H "X-Metrics-Key: KEY" http://localhost:5001/api/metrics
```

**Solutions:**
- Scale up resources (CPU/Memory)
- Optimize database queries
- Add caching layer
- Review and optimize slow endpoints

#### 4. Rate Limiting Issues

**Symptoms:**
- 429 Too Many Requests errors
- Users blocked unexpectedly

**Diagnosis:**
```bash
# Check rate limit stats
curl -H "X-Metrics-Key: KEY" http://localhost:5001/api/metrics | jq '.rateLimits'

# Review access logs
tail -f backend/logs/access.log | grep 429
```

**Solutions:**
- Adjust rate limits if needed
- Implement caching on client side
- Use batch requests where possible
- Contact admin to reset specific IP

---

## Incident Response

### Severity Levels

**P0 - Critical (Production Down)**
- All production services unavailable
- **Response Time:** Immediate
- **Action:** Page on-call engineer

**P1 - High (Degraded Service)**
- One or more services degraded
- **Response Time:** Within 1 hour
- **Action:** Create incident ticket

**P2 - Medium (Non-Critical Issues)**
- Minor issues, workarounds available
- **Response Time:** Within 4 hours
- **Action:** Create issue in backlog

### Response Procedures

#### 1. Detection
- Automated monitoring alerts
- Manual reports from users/team
- Health check failures

#### 2. Acknowledgement
- Acknowledge alert within 5 minutes
- Update team in Slack/communication channel
- Create incident tracking issue

#### 3. Investigation
- Review health check reports
- Check error logs
- Review metrics
- Test affected endpoints

#### 4. Mitigation
- Apply immediate fixes
- Restart affected services
- Rollback if needed
- Scale resources if necessary

#### 5. Resolution
- Verify fix with health checks
- Monitor for 30 minutes
- Update incident status
- Notify stakeholders

#### 6. Post-Mortem
- Document root cause
- Identify prevention measures
- Update runbooks
- Implement monitoring improvements

### Emergency Contacts

**On-Call Rotation:** [Configure your team's on-call schedule]

**Escalation Path:**
1. Primary On-Call Engineer
2. Backup On-Call Engineer  
3. Engineering Manager
4. CTO

### Useful Commands

```bash
# Quick health check
curl -s https://api.pvabazaar.org/api/health/ping

# Detailed health check
./scripts/monitor-health.sh https://api.pvabazaar.org --verbose

# View recent logs
docker-compose logs --tail=100 backend

# Restart all services
docker-compose restart

# View metrics
curl -H "X-Metrics-Key: KEY" https://api.pvabazaar.org/api/metrics | jq

# Check container health
docker-compose ps

# View resource usage
docker stats
```

---

## Monitoring Best Practices

### 1. Regular Reviews
- Weekly: Review slow request logs
- Weekly: Check rate limit patterns
- Monthly: Review and tune alert thresholds
- Quarterly: Conduct disaster recovery drills

### 2. Proactive Monitoring
- Set up alerts before issues occur
- Monitor trends, not just absolute values
- Test monitoring system regularly
- Keep runbooks up to date

### 3. Continuous Improvement
- Learn from incidents
- Update monitoring based on learnings
- Add new health checks as needed
- Optimize based on metrics

### 4. Documentation
- Keep this guide updated
- Document new procedures
- Share learnings with team
- Maintain contact lists

---

## Additional Resources

- **GitHub Actions Workflows:** `.github/workflows/`
- **Health Monitoring Script:** `scripts/monitor-health.sh`
- **Deployment Guide:** `DEPLOYMENT_CHECKLIST.md`
- **CI/CD Setup:** `CICD_SETUP.md`

---

**Last Updated:** December 24, 2024  
**Version:** 1.0.0  
**Maintained By:** PVA DevOps Team
