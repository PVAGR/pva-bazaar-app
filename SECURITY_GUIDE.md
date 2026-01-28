# 🔐 SECURITY GUIDE - Production Hardening

**Status:** Complete security implementation guide  
**Last Updated:** January 23, 2026  
**Compliance:** OWASP Top 10, GDPR, CCPA

---

## Overview

This guide ensures PVABazaar is production-hardened against common security threats. Follow each section before deploying to production.

---

## 1. Secrets Management

### ❌ NEVER Do This

```javascript
// WRONG - Secrets in code
const JWT_SECRET = "my-secret-key-12345";
const MONGODB_URI = "mongodb://user:pass@localhost";
const API_KEY = "sk-1234567890";
```

### ✅ DO This Instead

**Backend (.env)**
```bash
# backend/.env (NEVER commit this file)
JWT_SECRET=<generated-secret-256-bit>
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
PINATA_API_KEY=your_key_here
PINATA_API_SECRET=your_secret_here
NODE_ENV=production
```

**Gitignore**
```bash
# .gitignore
.env
.env.local
.env.*.local
*.env
secrets/
```

**Verify**
```bash
# Ensure .env is NOT committed
git status | grep .env
# Should be empty

# Check git history for secrets
git log -p | grep -i "password\|secret\|api.key"
# Should find nothing
```

### Secret Rotation Policy

```bash
# Rotate every 90 days
# 1. Generate new secret
openssl rand -hex 32

# 2. Update in Vercel dashboard
# 3. Redeploy application
vercel --prod

# 4. Update documentation
echo "Secrets rotated: $(date)" >> SECURITY.log
```

---

## 2. Authentication & Authorization

### JWT Configuration

**Secure Token Generation**
```javascript
// backend/middleware/auth.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ✅ DO: Use cryptographically secure secrets
const SECRET = process.env.JWT_SECRET; // 256+ bits

// ✅ DO: Set token expiration
const TOKEN_EXPIRY = '24h'; // Expire daily

function generateToken(userId) {
  return jwt.sign(
    { userId, iat: Math.floor(Date.now() / 1000) },
    SECRET,
    { 
      algorithm: 'HS256',
      expiresIn: TOKEN_EXPIRY,
      issuer: 'pvabazaar',
      audience: 'pvabazaar-users'
    }
  );
}

// ✅ DO: Verify token signature
function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET, {
      algorithms: ['HS256'],
      issuer: 'pvabazaar',
      audience: 'pvabazaar-users'
    });
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}

module.exports = { generateToken, verifyToken };
```

### Password Security

**Hashing Configuration**
```javascript
// backend/routes/auth.js
const bcrypt = require('bcryptjs');

// ✅ DO: Use bcryptjs with high salt rounds
const SALT_ROUNDS = 12; // Higher = slower (good!)

async function hashPassword(password) {
  // Validate password strength
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters');
  }
  
  if (!hasUpperCase(password) || !hasNumbers(password)) {
    throw new Error('Password must contain uppercase letters and numbers');
  }

  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function hasUpperCase(str) {
  return /[A-Z]/.test(str);
}

function hasNumbers(str) {
  return /[0-9]/.test(str);
}

module.exports = { hashPassword, verifyPassword };
```

**Hash Verification Time**
```
With SALT_ROUNDS=12:
- Password hashing takes ~250ms per attempt
- Makes brute force attacks impractical (~160 years for 10^12 attempts)
- Still fast enough for user login (~0.5s total)
```

### Session Management

```javascript
// ✅ DO: Use HttpOnly cookies (not localStorage)
res.cookie('token', jwt, {
  httpOnly: true,      // Can't access via JavaScript
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
});

// ✅ DO: Implement logout (token invalidation list)
const INVALIDATED_TOKENS = new Set();

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies.token;
  INVALIDATED_TOKENS.add(token);
  
  // Or store in Redis for distributed systems
  // redis.sadd('invalidated_tokens', token);
  // redis.expire('invalidated_tokens', 86400); // 24 hours
  
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});
```

---

## 3. API Security

### Rate Limiting

**Configuration**
```javascript
// backend/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// ✅ DO: Implement tiered rate limiting

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                   // 100 requests per window
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful attempts
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts. Please try again after 15 minutes.'
    });
  }
});

// Apply limiters
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

module.exports = { generalLimiter, authLimiter };
```

### CORS Configuration

**Whitelist Specific Origins**
```javascript
// backend/middleware/cors.js
const cors = require('cors');

// ✅ DO: Whitelist specific origins
const ALLOWED_ORIGINS = [
  'http://localhost:5173',           // Local dev
  'http://localhost:3000',           // Local dev (Next.js)
  'https://pvabazaar.org',           // Production
  'https://pvabazaar-livestream.vercel.app', // Next.js production
];

const corsOptions = {
  origin: (origin, callback) => {
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Allow credentials (cookies)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// ❌ WRONG: Don't do this
// app.use(cors()); // Allows ANY origin

module.exports = corsOptions;
```

### Input Validation

```javascript
// backend/middleware/validation.js
const { body, validationResult, param } = require('express-validator');

// ✅ DO: Validate all inputs
const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .trim();

const validatePassword = body('password')
  .isLength({ min: 12 })
  .withMessage('Password must be at least 12 characters')
  .matches(/[A-Z]/)
  .withMessage('Password must contain uppercase letters')
  .matches(/[0-9]/)
  .withMessage('Password must contain numbers');

const validateTitle = body('title')
  .trim()
  .isLength({ min: 3, max: 200 })
  .withMessage('Title must be 3-200 characters');

// Use in routes
app.post('/api/auth/register',
  validateEmail,
  validatePassword,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
);

// ✅ DO: Sanitize HTML to prevent XSS
const sanitizeHtml = require('sanitize-html');

const CLEAN_HTML_OPTIONS = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes: {
    'a': ['href', 'target']
  }
};

function cleanUserContent(html) {
  return sanitizeHtml(html, CLEAN_HTML_OPTIONS);
}
```

### SQL/NoSQL Injection Prevention

```javascript
// ✅ DO: Use parameterized queries (Mongoose does this automatically)

// WRONG - Vulnerable to injection
const userInput = req.body.email;
User.findOne({ email: userInput }); // Potentially vulnerable

// RIGHT - Safe (Mongoose validates)
const userInput = req.body.email;
User.findOne({ email: userInput.toLowerCase() }); // Safe

// Extra protection with validation
const { validationResult } = require('express-validator');
const emailSchema = body('email').isEmail();

// Use in middleware
app.post('/api/auth/register', emailSchema, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  // Safe to use req.body.email
});
```

---

## 4. Data Protection

### Encryption at Rest

**Database Field Encryption**
```javascript
// backend/models/User.js
const crypto = require('crypto');
const mongoose = require('mongoose');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // ✅ DO: Encrypt sensitive fields
  bio: {
    type: String,
    get: function(value) {
      return value ? decrypt(value) : value;
    },
    set: function(value) {
      return value ? encrypt(value) : value;
    }
  }
});

module.exports = mongoose.model('User', userSchema);
```

### Encryption in Transit

```javascript
// backend/middleware/https.js

// ✅ DO: Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// ✅ DO: Set security headers
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.pinata.cloud'],
    }
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

### Data Export & GDPR Compliance

```javascript
// backend/routes/users.js

// ✅ DO: Allow data export (GDPR right to portability)
app.get('/api/users/export', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const streams = await Stream.find({ userId: req.user.id });
    const journals = await JournalEntry.find({ userId: req.user.id });
    
    const exportData = {
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
        // Include all non-sensitive fields
      },
      streams: streams.map(s => ({...s.toObject()})),
      journals: journals.map(j => ({...j.toObject()})),
      exportedAt: new Date()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="export.json"');
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// ✅ DO: Allow account deletion (GDPR right to be forgotten)
app.delete('/api/users/account', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    
    const user = await User.findById(req.user.id);
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Delete all user data
    await User.deleteOne({ _id: req.user.id });
    await Stream.deleteMany({ userId: req.user.id });
    await JournalEntry.deleteMany({ userId: req.user.id });
    
    res.json({ message: 'Account deleted permanently' });
  } catch (error) {
    res.status(500).json({ error: 'Deletion failed' });
  }
});
```

---

## 5. Database Security

### MongoDB Atlas Configuration

```bash
# ✅ DO: IP Whitelist
MongoDB Atlas → Project → Network Access
- Add only your Vercel IP ranges
- Add only your development IP
- Remove 0.0.0.0/0 (allows everyone)

# ✅ DO: Strong Credentials
- Use random 32-character username and password
- Store in Vercel environment variables
- Rotate every 6 months

# ✅ DO: Enable Encryption
MongoDB Atlas → Project → Database → Edit
- Encryption at Rest: Enabled
- Encryption in Transit: Required

# ✅ DO: Backup & Recovery
MongoDB Atlas → Backup → Enable Automated Backup
- Daily snapshots (30-day retention)
- Test recovery procedure quarterly
```

### Connection Security

```javascript
// lib/mongodb.ts
import mongoose from 'mongoose';

export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  
  try {
    // ✅ DO: Require TLS
    await mongoose.connect(process.env.MONGODB_URI, {
      retryWrites: true,
      w: 'majority',
      ssl: true,
      authSource: 'admin',
      // ✅ DO: Set timeouts
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}
```

---

## 6. Third-Party Security

### IPFS/Pinata Configuration

```bash
# ✅ DO: Use API Keys (not master keys)
Pinata Dashboard → API Keys → Create Key
- Limit to specific origins
- Set expiration dates
- Restrict to read/write only

# ✅ DO: Monitor usage
Pinata Dashboard → Usage Stats
- Track uploads monthly
- Set alerts at 80% quota
- Have backup IPFS provider

# ❌ DON'T: Share credentials
- Never commit Pinata keys
- Never expose in frontend code
- Never share in logs
```

### Streaming Platform Security

```bash
# Twitch OAuth
1. Register app at https://dev.twitch.tv
2. Generate Client Secret (keep secret)
3. Set OAuth Redirect URL: https://pvabazaar.org/auth/twitch
4. Verify HTTPS is enforced
5. Enable webhook signing

# Livepeer Integration
1. Get API key from https://livepeer.org
2. Restrict key to specific operations
3. Monitor usage in dashboard
4. Set spending limits
```

---

## 7. Logging & Monitoring

### Secure Logging

```javascript
// backend/middleware/logging.js

// ✅ DO: Log security events
function logSecurityEvent(eventType, details, severity = 'info') {
  const logEntry = {
    timestamp: new Date(),
    type: eventType,
    severity,
    userId: details.userId || 'unknown',
    details: {
      // ✅ DO: Never log passwords or sensitive data
      path: details.path,
      method: details.method,
      status: details.status,
      ip: details.ip,
      error: details.error
    }
  };
  
  // Store in database or log service
  console.log(JSON.stringify(logEntry));
}

// ✅ DO: Log authentication attempts
app.post('/api/auth/login', (req, res) => {
  try {
    // ... authentication logic
    logSecurityEvent('login_success', {
      userId: user._id,
      ip: req.ip,
      path: req.path,
      method: req.method
    });
  } catch (error) {
    logSecurityEvent('login_failed', {
      email: req.body.email,
      ip: req.ip,
      error: error.message
    }, 'warning');
  }
});

// ✅ DO: Log security-relevant actions
app.delete('/api/users/account', (req, res) => {
  logSecurityEvent('account_deleted', {
    userId: req.user.id,
    ip: req.ip
  }, 'warning');
});

// ❌ DON'T: Log sensitive information
// logSecurityEvent('login', {
//   password: req.body.password,  // NEVER
//   token: jwt,                    // NEVER
//   creditCard: '1234-5678'        // NEVER
// });
```

---

## 8. Dependency Management

### Keep Dependencies Updated

```bash
# ✅ DO: Regular audits
npm audit

# ✅ DO: Check for vulnerabilities
npm audit fix

# ✅ DO: Update dependencies
npm outdated
npm update

# ✅ DO: Automate with Dependabot
# Add .github/dependabot.yml

version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
    allow:
      - dependency-type: "all"
    reviewers:
      - "security-team"
```

### Lock File Management

```bash
# ✅ DO: Commit package-lock.json
git add package-lock.json
git commit -m "chore: update dependencies"

# ✅ DO: Verify integrity
npm ci  # Uses exact versions from lock file

# ❌ DON'T: Use npm install in production
# Use npm ci instead (more secure, reproducible)
```

---

## 9. Security Checklist

### Before Each Deployment

- [ ] Run `npm audit` - fix all critical/high
- [ ] Check `.env` file not in git
- [ ] Verify CORS whitelist
- [ ] Test rate limiting
- [ ] Verify HTTPS enabled
- [ ] Check helmet security headers
- [ ] Verify input validation
- [ ] Test authentication flow
- [ ] Verify database encryption
- [ ] Check API key rotation schedule

### Monthly

- [ ] Review access logs
- [ ] Audit user permissions
- [ ] Verify backups working
- [ ] Check for data leaks
- [ ] Update dependencies
- [ ] Review security policies

### Quarterly

- [ ] Penetration testing
- [ ] Security audit
- [ ] Rotate secrets
- [ ] Review compliance
- [ ] Update disaster recovery plan

---

## 10. Incident Response Plan

### If Data Breach Suspected

1. **Immediate (0-1 hour)**
   - [ ] Activate incident response team
   - [ ] Take affected systems offline
   - [ ] Preserve logs and evidence
   - [ ] Contact security team

2. **Short-term (1-24 hours)**
   - [ ] Determine scope of breach
   - [ ] Identify compromised data
   - [ ] Notify affected users
   - [ ] Rotate all credentials
   - [ ] Patch vulnerability

3. **Medium-term (1-7 days)**
   - [ ] Complete forensic analysis
   - [ ] Implement fixes
   - [ ] Re-enable services
   - [ ] Monitor for reinfection

4. **Long-term (1 month+)**
   - [ ] Regulatory reporting (if required)
   - [ ] System hardening
   - [ ] Process improvements
   - [ ] Public communication

---

## Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Node.js Security:** https://nodejs.org/en/docs/guides/security/
- **MongoDB Security:** https://docs.mongodb.com/manual/security/
- **JWT Best Practices:** https://tools.ietf.org/html/rfc8725

---

**Ready for production?** Run through the checklist above before deploying! 🔐

**Questions?** Open an issue or contact security@pvabazaar.org
