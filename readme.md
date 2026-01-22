# 🛍️ PVA Bazaar - Sacred Marketplace for Authentic Artifacts

[![Production Status](https://img.shields.io/badge/status-production%20ready-brightgreen)](https://pvabazaar.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-success)](https://www.mongodb.com/)
[![Secret Scan](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/PVAGR/pva-bazaar-app/actions/workflows/secret-scan.yml)

> A full-stack marketplace for authentic artifacts with real-time inventory, secure payments, and admin controls. Built with React, Express, MongoDB, and Stripe.

**[🚀 Live Demo](https://pvabazaar.org)** | **[📖 Full Documentation](./PRODUCTION_DEPLOYMENT_GUIDE.md)** | **[🐛 Report Issues](https://github.com/PVAGR/pva-bazaar-app/issues)**

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🛒 Marketplace
- Browse & search artifacts
- Real-time inventory tracking
- Product details & specifications
- Shopping cart functionality
- Secure checkout process

### 💳 Payments
- Stripe integration
- Secure payment processing
- Webhook validation
- Transaction history
- Multiple payment methods

### 👥 User Management
- User registration & authentication
- JWT-based security
- Password hashing (bcryptjs)
- User profiles
- Order history

### 🔐 Admin Dashboard
- Product management
- Order management
- User management
- Analytics & metrics
- System settings

### 📚 Content
- Archive library
- Blog pages
- Biography section
- Research materials
- Writings collection

### 🔒 Security
- HTTPS/TLS encryption
- Rate limiting (300 req/15min)
- CORS protection
- Admin secret code
- PII scrubbing
- Stripe webhook validation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x
- npm 10.x
- MongoDB Atlas account (or local MongoDB)
- Stripe account (for payments)

### Local Development

**Clone the repository:**
```bash
git clone https://github.com/PVAGR/pva-bazaar-app.git
cd pva-bazaar-app
```

**Install dependencies:**
```bash
npm install
```

**Create environment files:**
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp Frontend/.env.example Frontend/.env.development
```

**Start development servers:**
```bash
# Terminal 1 - Backend
npm run dev:backend
# Output: 🚀 Server running on http://localhost:5001

# Terminal 2 - Frontend
npm run dev:frontend
# Output: ➜  Local:   http://localhost:5173/
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001
- Admin: http://localhost:5173/admin

**Dev Login Credentials:**
- Email: `admin@pvabazaar.org`
- Password: `admin123`

### Using Docker

```bash
docker compose up -d --build
# Frontend: http://localhost:5173
# Backend: http://localhost:5001
# MongoDB: localhost:27017
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│      Frontend (React + Vite)                                │
│      🌐 localhost:5173 (local) / pvabazaar.org (prod)       │
│      📍 Hosted on GitHub Pages                              │
│      ✓ Static SPA with client-side routing                  │
└────────────────┬────────────────────────────────────────────┘
                 │ API Calls (HTTPS)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│      Backend (Express.js)                                   │
│      🌐 localhost:5001 (local) / api.pvabazaar.org (prod)  │
│      📍 Hosted on Vercel (Serverless)                       │
│      ✓ RESTful API with CORS & rate limiting               │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
    MongoDB         Stripe API
    (Atlas)         (Payments)
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18.3.1
- **Build Tool:** Vite 5.0.0
- **Routing:** React Router 6.30.3
- **Styling:** CSS/SCSS
- **Error Tracking:** Sentry
- **Deployment:** GitHub Pages

### Backend
- **Runtime:** Node.js 20.x
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT
- **Password Hashing:** bcryptjs
- **Payments:** Stripe
- **Security:** Helmet, CORS, Rate Limiting
- **Logging:** Sentry
- **Deployment:** Vercel (Serverless)

### Database
- **MongoDB Atlas** (Cloud-hosted)
- **8 Models:** User, Artifact, Order, Comment, Blog, EditablePage, StripeEventLog, ArchiveEntry
- **Connection Pooling:** Optimized for serverless

### Hosting
- **Frontend:** GitHub Pages (CDN-delivered)
- **Backend:** Vercel (Serverless functions)
- **Database:** MongoDB Atlas
- **Payments:** Stripe
- **Error Tracking:** Sentry

---

## 🚀 Deployment

### Production Ready ✅
The application is production-ready and can be deployed in ~30 minutes.

### Deploy to Production

**Step 1: Backend to Vercel**
```bash
cd backend
npx vercel --prod
```

Then add environment variables in Vercel dashboard:
```env
NODE_ENV=production
MONGODB_URI=<your-connection-string>
JWT_SECRET=<generate-random>
STRIPE_SECRET_KEY=<your-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
SENTRY_DSN=<your-sentry-dsn>
CORS_ALLOWED_ORIGINS=https://pvabazaar.org
ADMIN_SECRET_CODE=<secure-code>
```

**Step 2: Frontend to GitHub Pages**
```bash
# Update API URL in Frontend/.env.production
echo 'VITE_API_URL=https://api.pvabazaar.org' > Frontend/.env.production

# Commit and push
git add .
git commit -m "feat: production deployment"
git push origin main
```

GitHub Actions automatically deploys to GitHub Pages.

**Step 3: Configure Custom Domain**
- Add CNAME records for your domain
- Configure in Vercel & GitHub Pages dashboards
- (Optional) Enable HTTPS with Let's Encrypt

### Verify Deployment
```bash
# Check frontend
curl -I https://pvabazaar.org

# Check backend
curl https://api.pvabazaar.org/health

# Check API
curl https://api.pvabazaar.org/marketplace/stats
```

See [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 📖 Documentation

### Main Guides
- **[PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)** - Comprehensive deployment guide
- **[QUICK_DEPLOYMENT_CHECKLIST.md](./QUICK_DEPLOYMENT_CHECKLIST.md)** - Quick reference
- **[GO_LIVE_GUIDE.md](./GO_LIVE_GUIDE.md)** - Fast 3-step deployment
- **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** - Local development setup

### Technical Documentation
- **[COMPREHENSIVE_FINDINGS_REPORT.md](./COMPREHENSIVE_FINDINGS_REPORT.md)** - Code review findings
- **[TROUBLESHOOTING_PERFORMANCE.md](./TROUBLESHOOTING_PERFORMANCE.md)** - Performance guide
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Architecture & integration
- **[Copilot Instructions](./.github/copilot-instructions.md)** - AI assistant guidelines

### Configuration Files
- **[Frontend/.env.example](./Frontend/.env.example)** - Frontend environment template
- **[backend/.env.example](./backend/.env.example)** - Backend environment template
- **[vercel.json](./vercel.json)** - Vercel deployment config
- **[Frontend/vite.config.js](./Frontend/vite.config.js)** - Vite configuration

---

## 💻 Development

### Available Commands

**Root Level:**
```bash
npm run dev              # Start both frontend & backend
npm run dev:backend     # Start backend only
npm run dev:frontend    # Start frontend only
npm run build:backend   # Build backend
npm run build:frontend  # Build frontend
npm run lint            # Lint all code
npm run format          # Format code with Prettier
npm run test            # Run tests
npm run test:ci         # Run tests in CI mode
```

**Backend (cd backend):**
```bash
npm run dev             # Start dev server with nodemon
npm install             # Install dependencies
npm run build           # Build for production
```

**Frontend (cd Frontend):**
```bash
npm run dev             # Start Vite dev server
npm run build           # Build for production
npm run preview         # Preview production build
npm install             # Install dependencies
```

### Project Structure

```
pva-bazaar-app/
├── Frontend/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Page components
│   │   ├── lib/                # Utilities & API client
│   │   └── config/             # Configuration
│   ├── public/                 # Static assets
│   └── vite.config.js          # Vite configuration
│
├── backend/                     # Express backend
│   ├── api/
│   │   └── index.js            # Express app & routes
│   ├── routes/                 # API routes (25+)
│   ├── models/                 # MongoDB schemas
│   ├── middleware/             # Express middleware
│   ├── lib/                    # Utilities & services
│   └── .env.example            # Environment template
│
├── .github/
│   ├── workflows/              # GitHub Actions
│   ├── instructions/           # Guidelines
│   └── copilot-instructions.md # AI assistant config
│
├── docs/                        # Documentation
├── scripts/                     # Utility scripts
└── package.json                # Root package.json
```

### Database Models

- **User** - User accounts & authentication
- **Artifact** - Products/items for sale
- **Order** - Purchase orders & transactions
- **Comment** - User reviews & comments
- **Blog** - Blog posts
- **EditablePage** - Dynamic content pages
- **StripeEventLog** - Payment webhooks
- **ArchiveEntry** - Archive catalog

### API Routes

**Marketplace:**
- `GET /marketplace/stats` - Marketplace statistics
- `GET /marketplace/listings` - Browse listings

**Orders:**
- `POST /orders` - Create order
- `GET /orders/:id` - Get order details
- `PUT /orders/:id` - Update order

**Products:**
- `GET /artifacts` - List artifacts
- `POST /artifacts` - Create artifact (admin)
- `PUT /artifacts/:id` - Update artifact
- `DELETE /artifacts/:id` - Delete artifact

**Users:**
- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `GET /users/:id` - Get user profile

**Payments:**
- `POST /checkout/create-session` - Create Stripe session
- `POST /webhooks/stripe` - Stripe webhook

**Admin:**
- `GET /admin/users` - List users (admin)
- `GET /admin/orders` - List orders (admin)
- `GET /admin/products` - List products (admin)

See code for complete API documentation.

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Write descriptive commit messages
- Add comments for complex logic

### Commit Message Format
```
feat: add new feature
fix: fix a bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add/update tests
chore: maintenance tasks
```

### Pull Request Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing-feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Pre-Commit Hooks
This repo uses Husky for pre-commit checks:
- Formatting (Prettier)
- Linting (ESLint)
- Type checking
- Secret scanning (gitleaks)

To bypass checks (use sparingly):
```bash
HUSKY=0 git commit -m "your message"
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 🔒 Security

- **No secrets in Git** - Use `.env` files (gitignored)
- **Pre-commit scanning** - gitleaks scans for secrets
- **HTTPS only** - All traffic encrypted
- **Rate limiting** - Protects against abuse
- **Password hashing** - bcryptjs with salt
- **JWT tokens** - Secure authentication
- **CORS validation** - Prevents cross-origin abuse
- **Admin verification** - Secret code required

See [SECURITY.md](./SECURITY.md) for security policy.

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

### Summary
- ✅ Free to use
- ✅ Free to modify
- ✅ Free to distribute
- ⚠️ Include original license & copyright notice
- ⚠️ No warranty provided

---

## 🙏 Acknowledgments

- React & Vite teams for excellent tools
- MongoDB & Stripe for reliable services
- GitHub for version control & hosting
- Vercel for serverless backend hosting
- All contributors who have helped improve this project

---

## 📞 Support

### Documentation
- Read the comprehensive guides in the `/docs` folder
- Check [TROUBLESHOOTING_PERFORMANCE.md](./TROUBLESHOOTING_PERFORMANCE.md) for common issues
- Review [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for architecture details

### Issues & Bugs
- [Report issues on GitHub](https://github.com/PVAGR/pva-bazaar-app/issues)
- Include error messages, steps to reproduce, and environment info

### Discussions
- [GitHub Discussions](https://github.com/PVAGR/pva-bazaar-app/discussions)
- Ask questions and share ideas

---

## 🎯 Roadmap

### Completed ✅
- [x] Full-stack marketplace
- [x] User authentication
- [x] Payment processing
- [x] Admin dashboard
- [x] Production deployment
- [x] Comprehensive documentation

### In Progress 🔄
- [ ] Advanced testing suite
- [ ] Performance optimization
- [ ] Extended admin features
- [ ] Mobile app

### Planned 📅
- [ ] Advanced analytics
- [ ] AI-powered recommendations
- [ ] Real-time notifications
- [ ] API rate limiting dashboard
- [ ] Advanced search filters

---

## 📊 Project Status

| Component | Status | Details |
|-----------|--------|---------|
| **Frontend** | ✅ Production Ready | React 18 + Vite 5 |
| **Backend** | ✅ Production Ready | Express.js on Vercel |
| **Database** | ✅ Production Ready | MongoDB Atlas |
| **Payments** | ✅ Production Ready | Stripe integrated |
| **Security** | ✅ Production Ready | Full HTTPS, JWT, rate limiting |
| **Documentation** | ✅ Complete | Deployment, API, architecture guides |
| **Testing** | ⚠️ Partial | Ready for tests to be added |
| **Monitoring** | ✅ Active | Sentry error tracking |

---

## 🚀 Get Started Now!

1. **Clone the repo:** `git clone https://github.com/PVAGR/pva-bazaar-app.git`
2. **Read:** [LOCAL_SETUP.md](./LOCAL_SETUP.md)
3. **Install:** `npm install && npm run dev`
4. **Deploy:** Follow [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)

Your marketplace will be live in 30 minutes! 🎉

---

**Made with ❤️ by PVA Bazaar Team**

[⬆ back to top](#-pva-bazaar---sacred-marketplace-for-authentic-artifacts)
