# Security Policy

## Supported Versions

| Version | Status  | Support             |
| ------- | ------- | ------------------- |
| 1.0.x   | Current | ✅ Security updates |
| 0.9.x   | Old     | ⚠️ Limited support  |

## Reporting Security Vulnerabilities

**🔐 PLEASE DO NOT open a public issue for security vulnerabilities**

Instead, please email security@pvabazaar.org with:

- Vulnerability description
- Affected component/version
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

**Response Timeline:**

- Acknowledgment: Within 24 hours
- Investigation: 3-7 days
- Fix released: Within 30 days
- Public disclosure: After patch is released

## Security Practices

### Code Security

✅ **What we do:**

- Pre-commit secret scanning (gitleaks)
- No secrets in Git history
- Environment variables for sensitive data
- HTTPS/TLS encryption in production
- Regular dependency updates

### Authentication & Authorization

✅ **User Security:**

- Password hashing with bcryptjs
- JWT token authentication
- Session management
- Role-based access control (RBAC)
- Admin secret code verification

### Data Protection

✅ **Data Safety:**

- Database encryption at rest
- HTTPS in transit
- Input validation on all endpoints
- SQL injection prevention
- XSS protection with Helmet

### API Security

✅ **API Protection:**

- CORS validation
- Rate limiting (300 req/15min)
- Request authentication
- Payload validation
- Error handling without leaking info

### Payment Security

✅ **Stripe Integration:**

- Webhook signature validation
- PCI DSS compliance
- Encrypted payment data
- No storing of card numbers
- Secure token handling

### Error Handling

✅ **Safe Error Messages:**

- No sensitive data in errors
- Sentry PII scrubbing enabled
- Generic error messages to users
- Detailed logs for admins only

## Dependencies

### Vulnerability Management

- All dependencies from official npm registry
- Regular security audits (`npm audit`)
- Automated updates with Dependabot
- Manual review before updates

### Production Dependencies

```json
{
  "express": "production API",
  "mongoose": "database ORM",
  "stripe": "payments",
  "jsonwebtoken": "authentication",
  "bcryptjs": "password hashing",
  "helmet": "security headers",
  "cors": "cross-origin requests",
  "rate-limit": "endpoint protection"
}
```

## Infrastructure Security

### Hosting

- **Backend (Vercel):** Zero-trust security model
- **Frontend (GitHub Pages):** CDN-delivered, DDoS protected
- **Database (MongoDB Atlas):** TLS encryption, IP whitelisting
- **Payments (Stripe):** PCI DSS Level 1 compliance

### Access Control

✅ **Production Access:**

- GitHub CODEOWNERS protection
- Required code review (1+ approver)
- Status checks required
- Branch protection on main

### Monitoring

✅ **Security Monitoring:**

- Sentry error tracking
- Failed login detection
- Rate limit alerts
- Payment anomaly detection

## Security Checklist for Deployments

Before deploying to production, verify:

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS/TLS enabled
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Database credentials rotated
- [ ] Webhook endpoints verified
- [ ] Admin code changed from default
- [ ] Sentry configured
- [ ] Backups configured
- [ ] Monitoring alerts set

## Known Issues & Mitigations

### Issue: Chroma Vector DB Optional

- **Status:** Non-blocking (optional feature)
- **Mitigation:** Falls back to MongoDB text search
- **Impact:** No user impact

### Issue: Testing Framework Not Implemented

- **Status:** In progress
- **Mitigation:** Manual testing + CI/CD checks
- **Impact:** Code quality (improvement planned)

## Incident Response

### If You Discover a Vulnerability:

1. **Stop immediately** - Don't exploit it further
2. **Document it** - Note what you found
3. **Report privately** - Email security@pvabazaar.org
4. **Don't discuss** - Keep it confidential
5. **Be patient** - We'll investigate thoroughly

### Our Response:

1. **Acknowledge** - Within 24 hours
2. **Investigate** - Determine scope and severity
3. **Fix** - Develop and test a patch
4. **Release** - Deploy fix to production
5. **Disclose** - Public announcement after patch
6. **Credit** - Recognition in release notes (if desired)

## Security Headers

Production deployments include:

```
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

## Authentication Security

### Password Requirements:

- ✅ At least 8 characters
- ✅ Hashed with bcryptjs (10 salt rounds)
- ✅ Never logged or stored in plaintext
- ✅ Secure password reset via email

### Token Security:

- ✅ JWT with HS256 algorithm
- ✅ 24-hour expiration
- ✅ Refresh token support
- ✅ Server-side token validation

## API Rate Limiting

Production rate limits per IP:

- **General endpoints:** 300 requests / 15 minutes
- **Auth endpoints:** 20 requests / 15 minutes
- **Checkout endpoints:** 30 requests / 15 minutes
- **Webhook endpoints:** 1000 requests / 15 minutes

## Regular Security Audits

We conduct security reviews:

- **Frequency:** Quarterly
- **Scope:** Code, dependencies, infrastructure
- **Tools:** npm audit, Snyk, manual review
- **Reporting:** Published in release notes

## Third-Party Services

### External Dependencies:

- **Stripe** - Payment processing (PCI DSS Level 1)
- **MongoDB Atlas** - Database hosting (SOC 2 certified)
- **Sentry** - Error tracking (GDPR compliant)
- **GitHub** - Version control (SOC 2 compliant)
- **Vercel** - Backend hosting (SOC 2 compliant)

All third-party services are regularly audited.

## Compliance

### Standards We Follow:

- OWASP Top 10 - Secure coding practices
- GDPR - Data privacy (EU users)
- PCI DSS - Payment security
- HTTPS everywhere - Transport security

## Security Tips for Users

### If You're Using PVA Bazaar:

1. **Use strong passwords** - Unique, 12+ characters
2. **Enable notifications** - Alert on suspicious activity
3. **Keep software updated** - Browser & OS updates
4. **Report issues** - Use GitHub Issues for bugs
5. **Check URLs** - Always use HTTPS
6. **Be cautious** - Don't trust external links

## Contact

- **Security Issues:** security@pvabazaar.org
- **General Questions:** support@pvabazaar.org
- **GitHub Issues:** [Report Bug](https://github.com/PVAGR/pva-bazaar-app/issues)

---

**Last Updated:** January 21, 2026  
**Version:** 1.0.0  
**Status:** Active ✅
