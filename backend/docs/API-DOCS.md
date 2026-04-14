# PVA Bazaar API - Complete Documentation

> **Version**: 8.0.0 | **Status**: ✅ All 8 Phases Complete

---

## 🚀 Quick Start

### Installation
```bash
# Install dependencies
npm install
# or
cd backend && npm install
cd ../Frontend && npm install
```

### Environment Setup
Create a `.env` file in the project root:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pvabazaar
JWT_SECRET=your-jwt-secret-key
NODE_ENV=production
ETHEREUM_RPC_URL=https://rpc.example.com
```

### Run Locally
```bash
# Start backend (port 5001)
npm run dev:backend

# Start frontend (port 5173)
npm run dev:frontend

# Seed database with sample data
npm run seed:db

# Run tests
npm run test:phases-6-8
```

### API Documentation
- **Swagger UI**: http://localhost:5001/api/docs
- **OpenAPI Spec**: http://localhost:5001/api/openapi.json
- **Health Check**: http://localhost:5001/api/health-check

---

## 📊 Architecture Overview

### 8 Complete Marketplace Phases

```
┌─────────────────────────────────────────────────────┐
│ Phase 1: Foundation (Provenance, Payments, Voting) │
└─────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ Phase 2: Shop Builder    │ Phase 3: Multi-Product Support  │
│ • Shops                  │ • Physical Goods                 │
│ • Shop Analytics         │ • Digital Downloads              │
│ • Seller Profiles        │ • Courses                        │
│ • Shop Pages             │ • Expertise Services             │
│ • Followers              │ • NFTs                           │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ Phase 4: Seller Features │ Phase 5: Community Platform    │
│ • Reviews & Ratings      │ • Forums & Discussions           │
│ • Direct Messaging       │ • Events & Workshops             │
│ • Testimonials           │ • Knowledge Base Articles        │
│ • Seller Analytics       │ • Knowledge Graph                │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────────┐
│ Phase 6a: Dynamic Pricing  │ Phase 6b: Global Fulfillment      │
│ • Fair Price Calculator    │ • Fulfillment Centers             │
│ • Market Intelligence      │ • Inventory Management            │
│ • Fraud Detection          │ • Shipment Tracking               │
│ • Price Recommendations    │ • Multi-Carrier Shipping          │
│ • Market Reports           │ • Returns Management              │
└───────────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ Phase 7: AI Helper       │ Phase 8: Open API & Partners   │
│ • Onboarding Guide       │ • Developer API Keys             │
│ • Pricing Suggestions    │ • Shopify Integration            │
│ • Compliance Checklist   │ • Amazon Marketplace             │
│ • Performance Insights   │ • OpenSea NFT Platform           │
│ • Live Chat Assistant    │ • WeChat Mini-Program            │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints by Phase

### Phase 2: Shop Builder
```
POST   /api/shops                 - Create shop
GET    /api/shops                 - List shops
GET    /api/shops/:id             - Get shop details
PUT    /api/shops/:id             - Update shop
POST   /api/shops/:id/follow      - Follow/unfollow shop
GET    /api/shops/:id/products    - List shop products
```

### Phase 3: Multi-Product
```
POST   /api/products              - Create product (any type)
GET    /api/products              - List products (with filtering)
GET    /api/products/:id          - Get product details
POST   /api/courses/:id/enroll    - Enroll in course
POST   /api/expertise/:id/book    - Book expert session
POST   /api/digital/:id/download  - Download digital product
```

### Phase 4: Seller Features
```
POST   /api/reviews               - Create product review
GET    /api/reviews               - List reviews (product/seller)
POST   /api/reviews/:id/helpful   - Mark review helpful
POST   /api/reviews/:id/response  - Seller response to review
POST   /api/messages              - Send message
GET    /api/messages/threads      - Get conversations
GET    /api/messages/unread       - Get unread count
POST   /api/testimonials          - Submit testimonial
GET    /api/testimonials/:shopId  - Get shop testimonials
GET    /api/analytics             - Get seller analytics
GET    /api/analytics/history     - Analytics history
```

### Phase 5: Community
```
POST   /api/forums/threads        - Create forum thread
GET    /api/forums/:category/threads - List category threads
POST   /api/forums/:id/reply      - Reply to thread
POST   /api/events                - Create event
GET    /api/events                - List events
POST   /api/events/:id/register   - Register for event
POST   /api/articles              - Publish article
GET    /api/articles              - Search articles
```

### Phase 6a: Pricing
```
POST   /api/pricing/calculate     - Calculate fair price
POST   /api/pricing/recommend     - Get pricing recommendation
GET    /api/pricing/history/:id   - Pricing history
GET    /api/admin/intelligence/dashboard - Market dashboard
GET    /api/admin/intelligence/fraud-summary - Fraud trends
```

### Phase 6b: Fulfillment
```
POST   /api/fulfillment/select-center      - Find best warehouse
POST   /api/fulfillment/calculate-shipping - Get shipping quote
POST   /api/fulfillment/shipping-rates     - List carrier options
POST   /api/fulfillment/reserve-inventory  - Hold inventory
POST   /api/fulfillment/create-shipment    - Create shipment
GET    /api/fulfillment/track-shipment/:id - Track status
POST   /api/fulfillment/initiate-return    - Start return
POST   /api/fulfillment/process-return     - Process return
```

### Phase 7: AI Helper
```
POST   /api/ai-help/ask                    - Ask AI question
GET    /api/ai-help/guides/:topic          - Get topic guide
POST   /api/ai-help/pricing-suggest        - Pricing recommendations
GET    /api/ai-help/compliance-checklist   - Legal requirements
GET    /api/ai-help/performance-insights   - AI seller insights
```

### Phase 8: Open API
```
# OAuth Keys
POST   /api/v1/keys                        - Create API key
GET    /api/v1/keys                        - List API keys
DELETE /api/v1/keys/:id                    - Revoke API key

# Partner Integrations
POST   /api/integrations/connect/:partner  - Connect partner account
GET    /api/integrations                   - List integrations
POST   /api/integrations/:partner/sync     - Trigger sync

# Public API v1 (requires API key)
GET    /api/v1/products                    - List products
GET    /api/v1/products/:id                - Get product details
GET    /api/v1/orders                      - List orders
GET    /api/v1/orders/:id                  - Get order details
POST   /api/v1/orders/:id/fulfill          - Mark fulfilled
POST   /api/v1/inventory/sync              - Sync inventory
GET    /api/v1/analytics                   - Get analytics
POST   /api/v1/webhooks/register           - Register webhook
```

---

## 📚 Database Models (74 Total)

### Core Models
- `Artifact` - Blockchain-verified items
- `User` - Authentication & profiles
- `Order` - Purchase orders & fulfillment

### Phase 2: Shops
- `Shop` - Seller storefronts
- `ShopFollower` - Shop followers

### Phase 3: Products
- `ProductType` - Unified product model (discriminator)
- `Course` - Educational products
- `ExpertService` - Consultation services
- `DigitalProduct` - Digital downloads & files

### Phase 4: Community Features
- `Review` - Product & seller reviews
- `DirectMessage` - Buyer-seller messaging
- `Testimonial` - Case studies & testimonials
- `SellerAnalytics` - KPI tracking (30+ metrics)

### Phase 5: Community Platform
- `ForumThread` - Discussion threads
- `Event` - Community events
- `Article` - Knowledge base articles
- `KnowledgeNode` - Knowledge graph

### Phase 6a: Pricing
- `PricingHistory` - Historical pricing data
- `MarketData` - Real-time market statistics
- `PricingRecommendation` - AI pricing suggestions
- `FraudFlag` - Suspicious pricing detection
- `MarketIntelligence` - Daily reports

### Phase 6b: Fulfillment
- `FulfillmentCenter` - Warehouse locations
- `InventoryLocation` - Stock levels by location
- `ShipmentTracking` - Real-time tracking
- `ShippingRate` - Dynamic shipping quotes

### Phase 7: AI Helper
- `AIAgentBot` - Help conversations

### Phase 8: Open API
- `APIKey` - Developer authentication
- `PartnerIntegration` - Partner sync tracking

---

## 🔐 Authentication

### Bearer Token (JWT)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.pvabazaar.org/api/protected-endpoint
```

### API Key (for v1 public API)
```bash
curl -H "Authorization: Bearer pk_live_xxxxx" \
  https://api.pvabazaar.org/api/v1/products
```

---

## 📦 Sample Data

### Seed Database
```bash
npm run seed:db
```

Creates:
- 3 seller users (Zara, Omar, Yuki)
- 3 shops with full profiles
- 6 products across all types
- 4 reviews with ratings
- 3 fulfillment centers
- Market data & analytics
- Community content

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Test Phase 6-8 Endpoints
```bash
npm run test:phases-6-8
```

### Health Check
```bash
curl http://localhost:5001/api/health-check
curl http://localhost:5001/api/health-check/endpoints
curl http://localhost:5001/api/health-check/test
```

---

## 🚢 Deployment

### Vercel
```bash
# Push to GitHub (triggers auto-deploy)
git push origin main
```

### Environment Variables (Required)
- `MONGODB_URI` - MongoDB Atlas connection
- `JWT_SECRET` - JWT signing key
- `ETHEREUM_RPC_URL` - Blockchain RPC endpoint
- `SENTRY_DSN` - Error monitoring (optional)

### Build
```bash
npm run build
```

### Verify Production
```bash
npm run verify:prod
```

---

## 📊 Key Features

### ✅ 100% Cloud-Based
- Zero laptop dependency
- MongoDB Atlas for data
- Vercel for serverless
- S3 for file storage

### ✅ Global Fulfillment
- Multi-warehouse network
- Real-time inventory tracking
- Dynamic shipping rates
- Multi-carrier integration
- Return management

### ✅ Smart Pricing
- AI fair price calculator
- Market intelligence dashboard
- Fraud detection (anomalies)
- Seller recommendations

### ✅ AI-Powered Assistance
- Onboarding guides
- Pricing suggestions
- Compliance checklists
- Performance insights

### ✅ Partner Integrations
- Shopify sync
- Amazon marketplace
- OpenSea NFTs
- WeChat mini-programs
- OAuth 2.0 flow

### ✅ Professional Features
- Real-time analytics (30+ KPIs)
- Seller reviews & testimonials
- Direct messaging
- Community forums
- Knowledge base
- Dynamic pricing

---

## 📈 Rate Limiting

- **General**: 100 requests/minute
- **Auth**: 20 requests/minute
- **Checkout**: 10 requests/minute
- **Webhooks**: 500 requests/minute

---

## 🔗 Resources

- **Documentation**: `/api/docs` (Swagger UI)
- **OpenAPI Spec**: `/api/openapi.json`
- **Health Status**: `/api/health-check`
- **Status Page**: `/api/health`

---

## 📞 Support

- **Email**: support@pvabazaar.org
- **Chat**: Available in seller dashboard
- **Documentation**: https://docs.pvabazaar.org

---

**Built with ❤️ for artisans, creators, and sellers worldwide.**

*Last Updated: April 2026 | All 8 Phases Complete ✅*
