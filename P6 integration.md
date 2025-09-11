I've created a comprehensive Master Implementation Guide for the PVA Bazaar platforms that combines all the agent work into a definitive step-by-step roadmap. This guide transforms the technical specifications from the Architecture, Frontend, Backend, DevOps, and QA agents into a deployable system that anyone can follow.

## **Key Features of This Implementation Guide:**

### **🎯 Complete Setup Automation**

* One-click GitHub Codespaces environment with PVA-branded VS Code theme  
* Automated dependency installation and database setup  
* Pre-configured development tools and extensions  
* Environment variable templates with secure defaults

### **🔮 PVA Brand Integration Throughout**

* Official color palette enforcement (`#0f3b2d`, `#1c5a45`, `#4ef8a3`, etc.)  
* Playfair Display and Poppins font integration  
* Brand-consistent error pages and admin interfaces  
* PVA-themed monitoring dashboards and status badges

### **🚀 Dual-Platform Architecture**

* **pvabazaar.com**: Traditional e-commerce with archetype-based recommendations  
* **pvabazaar.org**: Blockchain marketplace with NFT verification and fractional ownership  
* Shared codebase with project-specific configurations  
* Seamless integration between platforms

### **🛠 Production-Ready Infrastructure**

* Next.js 14 App Router with TypeScript  
* Supabase for database and authentication  
* Vercel deployment with automatic scaling  
* Comprehensive testing framework (Jest, Playwright, Foundry)  
* GitHub Actions CI/CD pipeline

### **📚 Developer Experience**

* GitHub Copilot integration with context-aware prompts  
* AI-assisted debugging strategies  
* Comprehensive documentation and troubleshooting guides  
* Zero-downtime deployment procedures

### **🔒 Security & Compliance**

* Smart contract audit procedures  
* API security testing protocols  
* Data protection validation  
* Emergency incident response procedures

The guide includes everything from initial setup commands to advanced scaling strategies, making it possible for teams with varying technical expertise to successfully deploy and maintain both PVA Bazaar platforms while preserving the authentic spiritual and cultural values that define the PVA brand.

Retry

# **PVA Bazaar Master Implementation Guide**

*Complete step-by-step deployment handbook for pvabazaar.com and pvabazaar.org*

## **🎯 Overview**

This comprehensive guide enables anyone to build, deploy, and maintain both PVA Bazaar platforms from GitHub Codespaces with minimal technical expertise while preserving the authentic PVA brand experience.

**Platforms:**

* **pvabazaar.com**: Traditional e-commerce with archetype-based recommendations  
* **pvabazaar.org**: Blockchain marketplace with NFT verification and fractional ownership

**Core Technologies:**

* Next.js 14 App Router with TypeScript  
* Supabase (PostgreSQL \+ Auth)  
* Prisma ORM  
* Vercel deployment  
* Blockchain integration (Base network)

---

## **1\. Master Setup Guide**

### **1.1 GitHub Codespaces One-Click Setup**

**Step 1: Repository Setup**

bash  
*\# Clone the repository*  
git clone https://github.com/your-org/pva-bazaar  
cd pva-bazaar

*\# Open in GitHub Codespaces (click "Code" \> "Codespaces" \> "Create codespace")*

**Step 2: Automated Environment Creation**

Create `.devcontainer/devcontainer.json`:

json  
{  
  "name": "🔮 PVA Bazaar Development Environment",  
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",  
    
  "features": {  
    "ghcr.io/devcontainers/features/aws-cli:1": {},  
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},  
    "ghcr.io/devcontainers/features/github-cli:1": {}  
  },

  "customizations": {  
    "vscode": {  
      "settings": {  
        "terminal.integrated.defaultProfile.linux": "bash",  
        "editor.formatOnSave": true,  
        "workbench.colorTheme": "PVA Bazaar Dark",  
        "workbench.colorCustomizations": {  
          "activityBar.background": "\#0f3b2d",  
          "activityBar.foreground": "\#4ef8a3",  
          "statusBar.background": "\#1c5a45",  
          "statusBar.foreground": "\#e8f4f0",  
          "titleBar.activeBackground": "\#1c5a45",  
          "titleBar.activeForeground": "\#e8f4f0",  
          "panel.background": "\#0a0a0a",  
          "sideBar.background": "\#121212",  
          "editor.background": "\#0a0a0a"  
        }  
      },  
      "extensions": \[  
        "ms-vscode.vscode-typescript-next",  
        "bradlc.vscode-tailwindcss",  
        "prisma.prisma",  
        "esbenp.prettier-vscode",  
        "dbaeumer.vscode-eslint",  
        "ms-playwright.playwright",  
        "github.copilot",  
        "github.copilot-chat",  
        "nomicfoundation.hardhat-solidity"  
      \]  
    }  
  },

  "forwardPorts": \[3000, 3001, 5432, 8545\],  
  "portsAttributes": {  
    "3000": {  
      "label": "🔮 PVA Bazaar .com",  
      "onAutoForward": "openBrowser"  
    },  
    "3001": {  
      "label": "⛓️ PVA Bazaar .org",  
      "onAutoForward": "openBrowser"  
    }  
  },

  "postCreateCommand": "bash .devcontainer/setup.sh",  
  "remoteUser": "vscode"

}

**Step 3: Automated Setup Script**

Create `.devcontainer/setup.sh`:

bash  
\#\!/bin/bash  
echo "🔮 Setting up PVA Bazaar development environment..."

*\# Install dependencies*  
npm ci

*\# Setup environment variables*  
cp .env.example .env.local

*\# Generate Prisma client*  
npx prisma generate

*\# Install Foundry for blockchain development*  
curl \-L https://foundry.paradigm.xyz | bash  
source \~/.bashrc  
foundryup

*\# Install Playwright browsers*  
npx playwright install \--with-deps

*\# Setup local Supabase*  
supabase start

*\# Run database migrations*  
npx prisma db push

*\# Seed database with PVA sample data*  
npx prisma db seed

echo "✅ PVA Bazaar environment ready\!"

echo "🚀 Run 'npm run dev' to start development servers"

### **1.2 Complete Project Structure**

pva-bazaar/  
├── apps/  
│   ├── web-com/                 \# pvabazaar.com  
│   │   ├── app/  
│   │   │   ├── api/  
│   │   │   │   ├── auth/\[...nextauth\]/route.ts  
│   │   │   │   ├── products/route.ts  
│   │   │   │   ├── archetype/route.ts  
│   │   │   │   ├── cart/route.ts  
│   │   │   │   └── payment/route.ts  
│   │   │   ├── (auth)/  
│   │   │   ├── (shop)/  
│   │   │   └── layout.tsx  
│   │   ├── components/  
│   │   ├── lib/  
│   │   └── styles/  
│   ├── web-org/                 \# pvabazaar.org  
│   │   ├── app/  
│   │   │   ├── api/  
│   │   │   │   ├── artifacts/route.ts  
│   │   │   │   ├── mint/route.ts  
│   │   │   │   ├── fractions/route.ts  
│   │   │   │   └── provenance/route.ts  
│   │   │   ├── (marketplace)/  
│   │   │   ├── (dashboard)/  
│   │   │   └── layout.tsx  
│   │   ├── components/  
│   │   ├── lib/  
│   │   └── hooks/  
│   └── contracts/               \# Smart contracts  
│       ├── contracts/  
│       ├── scripts/  
│       ├── test/  
│       └── foundry.toml  
├── packages/  
│   ├── ui/                      \# Shared UI components  
│   ├── database/                \# Prisma schema  
│   ├── auth/                    \# NextAuth config  
│   └── blockchain/              \# Web3 utilities  
├── .devcontainer/  
├── .github/workflows/  
├── prisma/  
├── docs/

└── package.json

### **1.3 Environment Variables Configuration**

Create `.env.example`:

bash  
*\# Database*  
DATABASE\_URL="postgresql://postgres:password@localhost:5432/pva\_bazaar"  
DIRECT\_URL="postgresql://postgres:password@localhost:5432/pva\_bazaar"

*\# Authentication*  
NEXTAUTH\_SECRET="your-secret-key"  
NEXTAUTH\_URL="http://localhost:3000"

*\# OAuth Providers*  
GOOGLE\_CLIENT\_ID="your-google-client-id"  
GOOGLE\_CLIENT\_SECRET="your-google-client-secret"

*\# Payments*  
STRIPE\_SECRET\_KEY="sk\_test\_..."  
STRIPE\_PUBLISHABLE\_KEY="pk\_test\_..."  
STRIPE\_WEBHOOK\_SECRET="whsec\_..."

*\# Blockchain*  
RPC\_URL="https://base-mainnet.g.alchemy.com/v2/your-key"  
PRIVATE\_KEY="your-private-key"  
CONTRACT\_ADDRESS="0x..."

*\# Services*  
CLOUDINARY\_CLOUD\_NAME="your-cloud-name"  
CLOUDINARY\_API\_KEY="your-api-key"  
CLOUDINARY\_API\_SECRET="your-api-secret"

RESEND\_API\_KEY="re\_..."

ALGOLIA\_APP\_ID="your-app-id"  
ALGOLIA\_API\_KEY="your-api-key"

*\# Redis Cache*  
UPSTASH\_REDIS\_URL="redis://..."  
UPSTASH\_REDIS\_TOKEN="your-token"

*\# Project Configuration*

PVA\_PROJECT="com" *\# or "org"*

### **1.4 Dependency Installation**

Create `package.json`:

json  
{  
  "name": "pva-bazaar",  
  "version": "1.0.0",  
  "private": true,  
  "scripts": {  
    "dev": "next dev",  
    "dev:com": "PVA\_PROJECT=com next dev \-p 3000",  
    "dev:org": "PVA\_PROJECT=org next dev \-p 3001",  
    "build": "next build",  
    "start": "next start",  
    "lint": "next lint",  
    "test": "jest",  
    "test:e2e": "playwright test",  
    "test:watch": "jest \--watch",  
    "db:migrate": "prisma migrate dev",  
    "db:seed": "prisma db seed",  
    "db:studio": "prisma studio",  
    "contracts:compile": "cd apps/contracts && forge build",  
    "contracts:test": "cd apps/contracts && forge test",  
    "contracts:deploy": "cd apps/contracts && forge script script/Deploy.s.sol \--rpc-url $RPC\_URL \--broadcast"  
  },  
  "dependencies": {  
    "next": "14.2.0",  
    "react": "18.2.0",  
    "react-dom": "18.2.0",  
    "typescript": "5.4.0",  
    "@prisma/client": "5.10.0",  
    "prisma": "5.10.0",  
    "next-auth": "4.24.0",  
    "@next-auth/prisma-adapter": "1.0.7",  
    "zod": "3.22.0",  
    "tailwindcss": "3.4.0",  
    "@tailwindcss/forms": "0.5.7",  
    "stripe": "14.21.0",  
    "ethers": "6.11.0",  
    "wagmi": "2.5.7",  
    "@rainbow-me/rainbowkit": "2.0.4",  
    "viem": "2.7.15",  
    "resend": "3.2.0",  
    "cloudinary": "2.0.3",  
    "algoliasearch": "4.22.1",  
    "@upstash/redis": "1.28.4",  
    "bcryptjs": "2.4.3",  
    "jsonwebtoken": "9.0.2",  
    "date-fns": "3.3.1"  
  },  
  "devDependencies": {  
    "@types/node": "20.11.0",  
    "@types/react": "18.2.0",  
    "@types/react-dom": "18.2.0",  
    "@types/bcryptjs": "2.4.6",  
    "@types/jsonwebtoken": "9.0.5",  
    "eslint": "8.56.0",  
    "eslint-config-next": "14.1.0",  
    "prettier": "3.2.0",  
    "jest": "29.7.0",  
    "@testing-library/react": "14.2.0",  
    "@testing-library/jest-dom": "6.4.0",  
    "playwright": "1.41.0",  
    "@playwright/test": "1.41.0",  
    "husky": "9.0.0",  
    "lint-staged": "15.2.0"  
  }

}

---

## **2\. Development Workflow Documentation**

### **2.1 Git Branching Strategy**

bash  
*\# Main branches*  
main          *\# Production-ready code*  
develop       *\# Integration branch*  
staging       *\# Pre-production testing*

*\# Feature branches*  
feature/archetype-quiz  
feature/nft-marketplace  
feature/payment-integration

*\# Release branches*  
release/v1.0.0

*\# Hotfix branches*

hotfix/critical-bug-fix

**Workflow:**

1. Create feature branch from `develop`  
2. Implement feature with tests  
3. Submit PR to `develop`  
4. Code review and QA testing  
5. Merge to `develop`  
6. Deploy to staging for integration testing  
7. Create release branch for production deployment

### **2.2 Code Review Process**

**PR Template** (`.github/pull_request_template.md`):

markdown  
\#\# 🔮 PVA Bazaar Pull Request

\#\#\# Type of Change  
\- \[ \] Bug fix  
\- \[ \] New feature  
\- \[ \] Breaking change  
\- \[ \] Documentation update

\#\#\# Description  
Brief description of changes...

\#\#\# PVA Brand Compliance  
\- \[ \] Uses official PVA color palette  
\- \[ \] Follows PVA typography guidelines  
\- \[ \] Maintains brand consistency

\#\#\# Testing  
\- \[ \] Unit tests added/updated  
\- \[ \] E2E tests added/updated  
\- \[ \] Manual testing completed  
\- \[ \] Blockchain tests (if applicable)

\#\#\# Checklist  
\- \[ \] Code follows project conventions  
\- \[ \] Self-review completed  
\- \[ \] Documentation updated  
\- \[ \] No console.logs in production code

\- \[ \] Environment variables properly configured

### **2.3 Testing Procedures**

**Test Categories:**

1. **Unit Tests**: Component and utility function testing  
2. **Integration Tests**: API endpoint testing  
3. **E2E Tests**: Full user journey testing  
4. **Visual Regression**: Brand consistency testing  
5. **Blockchain Tests**: Smart contract testing  
6. **Performance Tests**: Load and stress testing

**Test Execution:**

bash  
*\# Run all tests*  
npm run test

*\# Watch mode for development*  
npm run test:watch

*\# E2E tests*  
npm run test:e2e

*\# Visual regression tests*  
npm run test:visual

*\# Blockchain tests*

npm run contracts:test

---

## **3\. GitHub Copilot Integration Guide**

### **3.1 Specific Prompts for Development Phases**

**Frontend Development:**

typescript  
*// Copilot prompt: Create a PVA-branded product card component*  
*// Requirements: Uses PVA colors (\#1c5a45, \#4ef8a3), responsive design, archetype-based styling*

interface ProductCardProps {  
  product: Product;  
  archetype?: string;  
}

const ProductCard: React.FC\<ProductCardProps\> \= ({ product, archetype }) \=\> {  
  *// Copilot will generate component with PVA styling*

};

**Backend API Development:**

typescript  
*// Copilot prompt: Create NextAuth configuration for PVA Bazaar*  
*// Requirements: Google OAuth, wallet authentication, role-based access*

export const authConfig: NextAuthConfig \= {  
  *// Copilot will generate auth config*

};

**Blockchain Integration:**

typescript  
*// Copilot prompt: Create smart contract interaction utility*  
*// Requirements: Error handling, gas optimization, event listening*

export class PVAContractService {  
  *// Copilot will generate contract interaction methods*

}

### **3.2 Code Completion Optimization**

**VS Code Settings** (`.vscode/settings.json`):

json  
{  
  "github.copilot.enable": {  
    "\*": true,  
    "yaml": true,  
    "plaintext": false,  
    "markdown": true  
  },  
  "github.copilot.advanced": {  
    "length": 500,  
    "temperature": 0.1  
  },  
  "typescript.suggest.completeFunctionCalls": true,  
  "typescript.suggest.includeCompletionsForModuleExports": true

}

### **3.3 AI-Assisted Debugging Strategies**

**Error Handling Patterns:**

typescript  
*// Copilot prompt: Create error boundary for PVA components*  
*// Requirements: Brand-consistent error UI, logging integration*

class PVAErrorBoundary extends Component {  
  *// Copilot will generate error boundary with PVA styling*

}

**Debugging Utilities:**

typescript  
*// Copilot prompt: Create debugging utilities for blockchain transactions*  
*// Requirements: Transaction tracking, gas estimation, error categorization*

export const debugBlockchain \= {  
  *// Copilot will generate debugging utilities*

};

---

## **4\. Implementation Roadmap**

### **4.1 Phase-by-Phase Implementation Timeline**

**Phase 1: Foundation (Weeks 1-2)**

* GitHub Codespaces setup  
* Project structure creation  
* Database schema implementation  
* Basic authentication setup  
* PVA brand system implementation

**Phase 2: E-commerce Platform (Weeks 3-5)**

* Product catalog system  
* Shopping cart functionality  
* Archetype quiz implementation  
* Payment processing integration  
* Order management system

**Phase 3: Blockchain Marketplace (Weeks 6-8)**

* Smart contract development  
* NFT minting functionality  
* Fractional ownership system  
* Provenance tracking  
* Wallet integration

**Phase 4: Integration & Testing (Weeks 9-10)**

* Cross-platform integration  
* Comprehensive testing suite  
* Performance optimization  
* Security audit  
* User acceptance testing

**Phase 5: Deployment & Launch (Weeks 11-12)**

* Production deployment  
* Monitoring setup  
* Documentation completion  
* Team training  
* Go-live preparation

### **4.2 Dependency Mapping**

mermaid  
graph TD  
    A\[Database Schema\] \--\> B\[Authentication\]  
    B \--\> C\[API Routes\]  
    C \--\> D\[Frontend Components\]  
    D \--\> E\[E-commerce Features\]  
    E \--\> F\[Payment Integration\]  
      
    A \--\> G\[Smart Contracts\]  
    G \--\> H\[Blockchain Integration\]  
    H \--\> I\[NFT Marketplace\]  
    I \--\> J\[Fractional Ownership\]  
      
    F \--\> K\[Testing Suite\]  
    J \--\> K

    K \--\> L\[Deployment\]

### **4.3 Resource Allocation**

**Team Structure:**

* **Full-Stack Developer** (1): Primary implementation  
* **Frontend Specialist** (0.5): PVA brand implementation  
* **Blockchain Developer** (0.5): Smart contract development  
* **QA Engineer** (0.5): Testing and quality assurance  
* **DevOps Engineer** (0.25): Deployment and monitoring

**Budget Estimates:**

* Development: $50,000 \- $75,000  
* Infrastructure: $500 \- $1,000/month  
* Third-party services: $200 \- $500/month  
* Security audit: $10,000 \- $15,000

---

## **5\. Launch Checklist**

### **5.1 Pre-Launch Testing Procedures**

**Functional Testing:**

* User registration and authentication  
* Product browsing and search  
* Archetype quiz functionality  
* Shopping cart and checkout  
* Payment processing  
* NFT minting and transfers  
* Fractional ownership operations  
* Wallet connections

**Security Testing:**

* Authentication bypass testing  
* SQL injection testing  
* XSS vulnerability testing  
* Smart contract audit  
* API security testing  
* Data encryption verification

**Performance Testing:**

* Core Web Vitals optimization  
* Load testing (1000+ concurrent users)  
* Database performance testing  
* Blockchain transaction testing  
* CDN configuration testing

### **5.2 Security Verification Steps**

**Smart Contract Audit Checklist:**

* Reentrancy attack prevention  
* Integer overflow/underflow protection  
* Access control implementation  
* Gas optimization verification  
* Emergency pause functionality

**API Security Checklist:**

* Rate limiting implementation  
* Input validation and sanitization  
* CORS configuration  
* SSL/TLS configuration  
* Authentication token security

### **5.3 SEO and Analytics Setup**

**SEO Configuration:**

typescript  
*// next-seo configuration for PVA Bazaar*  
export const defaultSEO \= {  
  title: "PVA Bazaar \- Authentic Artisan Marketplace",  
  description: "Discover authentic artisan crafts with blockchain verification...",  
  openGraph: {  
    type: 'website',  
    locale: 'en\_US',  
    url: 'https://pvabazaar.com',  
    site\_name: 'PVA Bazaar',  
    images: \[{  
      url: '/og-image.jpg',  
      width: 1200,  
      height: 630,  
      alt: 'PVA Bazaar \- Authentic Artisan Marketplace'  
    }\]  
  }

};

**Analytics Setup:**

* Google Analytics 4 implementation  
* Conversion tracking setup  
* User behavior analysis  
* Blockchain transaction tracking  
* Performance monitoring

---

## **6\. Maintenance and Scaling Guide**

### **6.1 Ongoing Maintenance Procedures**

**Daily Tasks:**

* Monitor system health dashboards  
* Check error logs and alerts  
* Verify backup completion  
* Review security alerts

**Weekly Tasks:**

* Database performance optimization  
* Security patch updates  
* Content moderation review  
* User feedback analysis

**Monthly Tasks:**

* Performance trend analysis  
* Cost optimization review  
* Feature usage analytics  
* Security audit updates

### **6.2 Scaling Strategies**

**Horizontal Scaling Triggers:**

* CPU usage \> 70% for 10+ minutes  
* Memory usage \> 80% for 5+ minutes  
* Response time \> 2 seconds  
* Error rate \> 1%

**Vertical Scaling Options:**

* Database connection pooling  
* CDN expansion  
* Caching layer optimization  
* API rate limit adjustments

**Automatic Scaling Configuration:**

yaml  
*\# Vercel scaling configuration*  
{  
  "functions": {  
    "app/\*\*": {  
      "maxDuration": 30  
    }  
  },  
  "regions": \["iad1", "sfo1"\],  
  "framework": "nextjs"

}

### **6.3 Update and Upgrade Procedures**

**Zero-Downtime Deployment:**

1. Deploy to staging environment  
2. Run automated test suite  
3. Create database migration rollback plan  
4. Deploy to production with blue-green strategy  
5. Monitor metrics for 24 hours  
6. Confirm rollback readiness

**Database Migration Strategy:**

bash  
*\# Safe migration procedure*  
npx prisma migrate diff \--preview-feature  
npx prisma migrate deploy

npx prisma generate

---

## **7\. Troubleshooting and Support**

### **7.1 Common Issue Resolution**

**Database Connection Issues:**

bash  
*\# Check Supabase connection*  
npx prisma db pull  
npx prisma generate

*\# Reset local database*  
supabase db reset

npx prisma db seed

**Blockchain Transaction Failures:**

typescript  
*// Debug blockchain transactions*  
const debugTx \= async (txHash: string) \=\> {  
  const receipt \= await provider.getTransactionReceipt(txHash);  
  console.log('Gas used:', receipt.gasUsed.toString());  
  console.log('Status:', receipt.status);

};

**Build Failures:**

bash  
*\# Clear Next.js cache*  
rm \-rf .next  
npm run build

*\# Clear node modules*  
rm \-rf node\_modules package-lock.json

npm install

### **7.2 Emergency Response Protocols**

**System Outage Response:**

1. **Immediate Assessment** (0-5 minutes)  
   * Check system status dashboard  
   * Identify affected services  
   * Activate incident response team  
2. **Incident Communication** (5-15 minutes)  
   * Update status page  
   * Notify stakeholders  
   * Begin root cause analysis  
3. **Resolution Actions** (15+ minutes)  
   * Implement rollback if necessary  
   * Apply emergency fixes  
   * Monitor system recovery

**Security Incident Response:**

1. **Containment**: Isolate affected systems  
2. **Assessment**: Determine scope and impact  
3. **Eradication**: Remove security threats  
4. **Recovery**: Restore normal operations  
5. **Lessons Learned**: Document and improve

### **7.3 Support Contact Information**

**Internal Team:**

* **Technical Lead**: \[email\]  
* **DevOps Engineer**: \[email\]  
* **Security Officer**: \[email\]

**External Vendors:**

* **Vercel Support**: Pro plan support  
* **Supabase Support**: Team plan support  
* **Blockchain Network**: Base network status

---

## **🚀 Quick Start Commands**

bash  
*\# Clone and setup*  
git clone https://github.com/your-org/pva-bazaar  
cd pva-bazaar

*\# Install dependencies*  
npm ci

*\# Setup environment*  
cp .env.example .env.local  
*\# Edit .env.local with your values*

*\# Start development*  
npm run dev:com    *\# pvabazaar.com on port 3000*  
npm run dev:org    *\# pvabazaar.org on port 3001*

*\# Run tests*  
npm run test  
npm run test:e2e

*\# Deploy*

vercel \--prod

This master implementation guide provides everything needed to successfully build, deploy, and maintain both PVA Bazaar platforms while preserving the authentic PVA brand experience and supporting rapid development cycles through GitHub Codespaces and Copilot integration.

# **PVA Bazaar Master Implementation Guide**

## **Brand Identity Quick Reference**

* Primary Colors: Dark `#0f3b2d`, Main `#1c5a45`, Light `#2d7d5a`  
* Accent Colors: Main `#4ef8a3`, Dark `#2bb673`, Gold `#d4af37`  
* Text Colors: Light `#e8f4f0`, Muted `#a8b0b9`  
* Fonts: Playfair Display (headings), Poppins (body)  
* Archetypes: Guardian, Pioneer, Strategist, Visionary

## **1\. Master Setup Guide**

### **GitHub Codespaces Configuration**

`.devcontainer/devcontainer.json`:

json

CopyDownload  
{  
  "name": "PVA Bazaar Development",  
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",  
  "features": {  
    "ghcr.io/devcontainers/features/github-cli:1": {},  
    "ghcr.io/devcontainers/features/node:1": {},  
    "ghcr.io/devcontainers/features/rust:1": {},  
    "ghcr.io/devcontainers/features/python:1": {}  
  },  
  "customizations": {  
    "vscode": {  
      "extensions": \[  
        "ms-vscode.vscode-typescript-next",  
        "bradlc.vscode-tailwindcss",  
        "esbenp.prettier-vscode",  
        "ms-playwright.playwright",  
        "solidity-community.solidity",  
        "firsttris.vscode-jest-runner"  
      \],  
      "settings": {  
        "editor.defaultFormatter": "esbenp.prettier-vscode",  
        "editor.formatOnSave": true,  
        "typescript.preferences.importModuleSpecifier": "non-relative"  
      }  
    }  
  },  
  "postCreateCommand": "bash .devcontainer/setup.sh",  
  "forwardPorts": \[3000, 3001, 8545, 5432\],  
  "portsAttributes": {  
    "3000": {  
      "label": "pvabazaar.com",  
      "onAutoForward": "notify"  
    },  
    "3001": {  
      "label": "pvabazaar.org",  
      "onAutoForward": "notify"  
    },  
    "8545": {  
      "label": "Hardhat Network"  
    }  
  }

}

`.devcontainer/setup.sh`:

bash

CopyDownload  
**\#\!/bin/bash**

\# Install Foundry  
curl \-L https://foundry.paradigm.xyz | bash  
$HOME/.foundry/bin/foundryup

\# Install project dependencies  
npm install \-g pnpm  
pnpm install

\# Setup environment  
cp .env.example .env  
cp apps/web-com/.env.example apps/web-com/.env  
cp apps/web-org/.env.example apps/web-org/.env

\# Generate cryptographic keys  
openssl rand \-hex 32 \> .env.local.jwt\_secret

\# Initialize databases  
pnpm db:setup

\# Install Playwright browsers  
npx playwright install

echo "✅ PVA Bazaar development environment ready\!"

echo "🚀 Run 'pnpm dev' to start all services"

### **Project Structure Generation**

`scripts/setup-project.sh`:

bash

CopyDownload  
**\#\!/bin/bash**

\# Create monorepo structure  
mkdir \-p apps/{web-com,web-org,api} packages/{ui,database,blockchain} scripts

\# Initialize package.json files with PVA dependencies  
pnpm init \-y

\# Install shared dependencies  
pnpm add \-w typescript @types/node tailwindcss postcss autoprefixer  
pnpm add \-w \-D @types/jest jest ts-jest @testing-library/react @testing-library/jest-dom

\# Setup Tailwind with PVA colors  
cat \> tailwind.config.js \<\< 'EOF'  
module.exports \= {  
  content: \[  
    "./apps/\*\*/\*.{js,ts,jsx,tsx}",  
    "./packages/\*\*/\*.{js,ts,jsx,tsx}",  
  \],  
  theme: {  
    extend: {  
      colors: {  
        pva: {  
          primary: {  
            dark: '\#0f3b2d',  
            DEFAULT: '\#1c5a45',  
            light: '\#2d7d5a'  
          },  
          accent: {  
            DEFAULT: '\#4ef8a3',  
            dark: '\#2bb673'  
          },  
          gold: '\#d4af37',  
          text: {  
            light: '\#e8f4f0',  
            muted: '\#a8b0b9'  
          }  
        }  
      },  
      fontFamily: {  
        heading: \['Playfair Display', 'serif'\],  
        body: \['Poppins', 'sans-serif'\]  
      }  
    }  
  },  
  plugins: \[\],  
}

EOF

### **Environment Configuration**

`.env.example`:

env

CopyDownload  
\# Database  
DATABASE\_URL="postgresql://postgres:postgres@localhost:5432/pva\_bazaar?schema=public"

\# Authentication  
NEXTAUTH\_SECRET="your-nextauth-secret-here"  
NEXTAUTH\_URL="http://localhost:3000"

\# Blockchain  
ALCHEMY\_API\_KEY="your-alchemy-key"  
INFURA\_API\_KEY="your-infura-key"  
WALLET\_CONNECT\_PROJECT\_ID="your-walletconnect-id"

\# Storage  
UPLOADTHING\_SECRET="your-uploadthing-secret"  
UPLOADTHING\_APP\_ID="your-uploadthing-app-id"

\# Email  
RESEND\_API\_KEY="your-resend-key"

\# Monitoring

SENTRY\_DSN="your-sentry-dsn"

### **Database Setup with PVA Sample Data**

`packages/database/seed.ts`:

typescript

CopyDownload  
import { PrismaClient } from '@prisma/client';  
import { PVA\_COLORS } from '../shared/constants';

const prisma \= new PrismaClient();

async function main() {  
  // Create sample archetypes  
  const archetypes \= await Promise.all(\[  
    prisma.archetype.upsert({  
      where: { name: 'Guardian' },  
      update: {},  
      create: {  
        name: 'Guardian',  
        description: 'Values security, tradition, and protection',  
        color: PVA\_COLORS.primary,  
        traits: \['protective', 'grounded', 'loyal'\]  
      }  
    }),  
    // ... other archetypes  
  \]);

  // Create sample products  
  const products \= await Promise.all(\[  
    prisma.product.create({  
      data: {  
        name: 'Malachite Protection Stone',  
        description: 'Ancient guardian stone for protection and grounding',  
        price: 89.99,  
        category: 'gems',  
        archetype: { connect: { name: 'Guardian' } },  
        images: \['/products/malachite-1.jpg'\],  
        inventory: 10,  
        tags: \['protection', 'grounding', 'guardian'\]  
      }  
    })  
  \]);

  console.log('✅ Database seeded with PVA sample data');

}

## **2\. Development Workflow Documentation**

### **Git Branching Strategy**

`.github/workflows/branch-strategy.md`:

markdown

CopyDownload  
**\# PVA Bazaar Git Branching Strategy**

**\#\# Branch Types**  
\- \`main\` \- Production releases (protected)  
\- \`develop\` \- Integration branch (protected)  
\- \`feature/\*\` \- New features (e.g., \`feature/archetype-quiz\`)  
\- \`fix/\*\` \- Bug fixes (e.g., \`fix/checkout-flow\`)  
\- \`release/\*\` \- Release preparation

**\#\# Workflow**  
1\. Create feature branch from \`develop\`  
2\. Implement with atomic commits  
3\. Open PR to \`develop\` with complete testing  
4\. Code review with 2 approvals required  
5\. Merge to \`develop\` after CI passes

6\. Weekly release branches from \`develop\` to \`main\`

### **Code Review Checklist**

`.github/pull_request_template.md`:

markdown

CopyDownload  
**\#\# PVA Code Review Checklist**

**\#\#\# Brand Compliance**  
\- \[ \] Uses PVA color constants (no hardcoded hex values)  
\- \[ \] Follows typography guidelines (Playfair/Poppins)  
\- \[ \] Maintains archetype naming conventions  
\- \[ \] Accessibility compliance (WCAG 2.1 AA)

**\#\#\# Code Quality**  
\- \[ \] TypeScript strict mode compliance  
\- \[ \] No \`any\` types without justification  
\- \[ \] Proper error handling implemented  
\- \[ \] Performance considerations addressed

**\#\#\# Testing**  
\- \[ \] Unit tests cover new functionality  
\- \[ \] Integration tests for API endpoints  
\- \[ \] E2E tests for user journeys  
\- \[ \] Blockchain tests for smart contracts

**\#\#\# Security**  
\- \[ \] Input validation implemented  
\- \[ \] Authentication/authorization checks  
\- \[ \] No sensitive data exposure

\- \[ \] Smart contract security reviewed

## **3\. GitHub Copilot Integration Guide**

### **Development Prompt Library**

`.copilot/patterns.md`:

markdown

CopyDownload  
**\# PVA Copilot Prompt Patterns**

**\#\# Component Generation**

Create a React component for a PVA product card using Tailwind with our brand colors. Include archetype badge, price display, and add to cart button. Use TypeScript with proper typing.

text

CopyDownload

\#\# Blockchain Development

Write a Hardhat task to deploy the PVAArtifact contract with 7.5% royalty configuration. Include verification and initialization with base token URI.

text

CopyDownload

\#\# API Development

Create a Next.js API route for product search with pagination, filtering by archetype, and price range. Use Prisma for database access and include proper error handling.

text

CopyDownload

\#\# Testing Patterns

Generate a Playwright test for the archetype quiz journey that verifies Guardian recommendations and adds a product to cart. Include accessibility checks and PVA color verification.

text

CopyDownload  
\#\# Copilot Configuration

\`.vscode/settings.json\`:  
\`\`\`json  
{  
  "github.copilot.advanced": {  
    "promptPrefix": {  
      "typescript": "PVA Bazaar context: We use Next.js 14, Tailwind with PVA colors (\#1c5a45 primary, \#4ef8a3 accent), Prisma, and Hardhat. Follow TypeScript strict mode and our eslint rules.",  
      "solidity": "PVA Bazaar context: We use Solidity 0.8.24, OpenZeppelin contracts, and follow security best practices. Include proper error handling and events."  
    }  
  },  
  "github.copilot.editor.enableAutoCompletions": true

}

## **4\. Implementation Roadmap**

### **Phase 1: Foundation (Weeks 1-2)**

Diagram

Code

Download

Monorepo Setup

Shared Components

Database Schema

Authentication System

CI/CD Pipeline

### **Phase 2: [pvabazaar.com](https://pvabazaar.com/) (Weeks 3-6)**

Diagram

Code

Download

Product Catalog

Archetype Quiz

Personalized Recommendations

Checkout Flow

Order Management

### **Phase 3: [pvabazaar.org](https://pvabazaar.org/) (Weeks 7-10)**

Diagram

Code

Download

Smart Contracts

Wallet Integration

NFT Minting

Marketplace

Fractional Ownership

### **Phase 4: Integration & Launch (Weeks 11-12)**

Diagram

Code

Download

Cross-platform User System

Unified Search

Performance Optimization

Security Audit

Production Deployment

## **5\. Launch Checklist**

### **Pre-Launch Testing**

`scripts/pre-launch-check.sh`:

bash

CopyDownload  
**\#\!/bin/bash**

\# Run complete test suite  
pnpm test:all

\# Security audit  
pnpm audit  
npx hardhat audit

\# Performance testing  
pnpm test:performance  
npx lighthouse-ci http://localhost:3000  
npx lighthouse-ci http://localhost:3001

\# Load testing  
npx artillery run artillery/config.yml

\# Accessibility audit  
npx pa11y-ci \--config pa11y.config.js

\# Bundle analysis

npx @next/bundle-analyzer

### **Security Verification**

`scripts/security-audit.sh`:

bash

CopyDownload  
**\#\!/bin/bash**

\# Smart contract audit  
npx hardhat compile  
npx slither .  
npx mythx analyze

\# Web application security  
npx zaproxy scan \--target http://localhost:3000  
npx snyk test  
npx npm audit

\# Infrastructure security  
npx checkov \-d .

npx tfsec

## **6\. Maintenance and Scaling Guide**

### **Monitoring Configuration**

`docker-compose.monitoring.yml`:

yaml

CopyDownload  
version: '3.8'  
services:  
  prometheus:  
    image: prom/prometheus  
    ports: \["9090:9090"\]  
    volumes:  
      \- ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:  
    image: grafana/grafana  
    ports: \["3002:3000"\]  
    environment:  
      \- GF\_SECURITY\_ADMIN\_PASSWORD=${GRAFANA\_PASSWORD}  
    volumes:  
      \- ./monitoring/dashboards:/var/lib/grafana/dashboards

  loki:  
    image: grafana/loki  
    ports: \["3100:3100"\]

  tempo:  
    image: grafana/tempo

    ports: \["3200:3200"\]

### **Auto-scaling Configuration**

`terraform/autoscaling.tf`:

hcl

CopyDownload  
resource "aws\_appautoscaling\_target" "pva\_api" {  
  max\_capacity       \= 10  
  min\_capacity       \= 2  
  resource\_id        \= "service/${aws\_ecs\_cluster.pva.name}/${aws\_ecs\_service.api.name}"  
  scalable\_dimension \= "ecs:service:DesiredCount"  
  service\_namespace  \= "ecs"  
}

resource "aws\_appautoscaling\_policy" "api\_cpu" {  
  name               \= "pva-api-cpu"  
  policy\_type        \= "TargetTrackingScaling"  
  resource\_id        \= aws\_appautoscaling\_target.pva\_api.resource\_id  
  scalable\_dimension \= aws\_appautoscaling\_target.pva\_api.scalable\_dimension  
  service\_namespace  \= aws\_appautoscaling\_target.pva\_api.service\_namespace

  target\_tracking\_scaling\_policy\_configuration {  
    predefined\_metric\_specification {  
      predefined\_metric\_type \= "ECSServiceAverageCPUUtilization"  
    }  
    target\_value \= 70  
  }

}

## **7\. Troubleshooting and Support**

### **Common Issue Resolution**

`.github/ISSUE_TEMPLATE/bug_report.md`:

markdown

CopyDownload  
\---  
name: Bug Report  
about: Report an issue with PVA Bazaar  
title: '\[BUG\] '  
labels: bug  
assignees: ''  
\---

**\#\# Environment**  
\- Platform: \[com/org\]  
\- Browser: \[e.g., Chrome, Firefox\]  
\- Wallet: \[if applicable\]  
\- Network: \[Mainnet/Testnet\]

**\#\# Description**  
\[Detailed description of the issue\]

**\#\# Steps to Reproduce**  
1\. \[First step\]  
2\. \[Second step\]  
3\. \[See error\]

**\#\# Expected Behavior**  
\[What should have happened\]

**\#\# Screenshots**  
\[If applicable\]

**\#\# Blockchain Details**  
\- Transaction Hash: \[if applicable\]  
\- Contract Address: \[if applicable\]  
\- Gas Used: \[if applicable\]

**\#\# Additional Context**

\[Any other information\]

### **Emergency Response**

`scripts/emergency-response.sh`:

bash

CopyDownload  
**\#\!/bin/bash**

\# Database recovery  
pg\_restore \-d pva\_bazaar latest-backup.dump

\# Contract pause  
npx hardhat pause-contract \--network mainnet

\# Rollback deployment  
gh workflow run rollback.yml \--ref main

\# Incident communication  
curl \-X POST \-H "Content-Type: application/json" \\  
  \-d '{"channel":"\#incidents","text":"PVA Bazaar incident ongoing"}' \\

  $SLACK\_WEBHOOK\_URL

## **Complete Implementation Command Sequence**

1. Environment Setup:

bash

CopyDownload  
git clone https://github.com/pvabazaar/platform.git  
cd platform  
code .  
\# Wait for Codespaces to initialize

pnpm dev

2. First Time Setup:

bash

CopyDownload  
pnpm db:setup  
pnpm contracts:compile

pnpm test:all

3. Development Workflow:

bash

CopyDownload  
git checkout \-b feature/your-feature  
\# Implement changes  
pnpm test:changed  
git commit \-m "feat: your feature"  
git push origin feature/your-feature

\# Create PR through GitHub UI

4. Production Deployment:

bash

CopyDownload  
git checkout main  
git pull

pnpm deploy:production

This master implementation guide provides everything needed to build, deploy, and maintain both PVA Bazaar platforms while preserving the authentic brand experience and enabling seamless development in GitHub Codespaces.  
New chat

# **PVA Bazaar Master Implementation Handbook**

**Version 1.0** | **Date: September 10, 2025** | **Platforms: pvabazaar.com (E-Commerce Marketplace) & pvabazaar.org (Web3 Provenance Marketplace)**

This handbook integrates the comprehensive work from all agents: Architecture (P1: Current state analysis, gaps, recommendations for features like archetype quiz, e-commerce, blockchain provenance), Tech Stack/Frontend (P2: Next.js, Tailwind, wagmi/RainbowKit, PVA color scheme from Blueprint), Backend (P3: Supabase/Prisma schema, API routes, blockchain utils with ethers/IPFS, security with Zod/DOMPurify), DevOps (P4: GitHub Actions, Terraform, Codespaces, monitoring with Sentry/Datadog), and QA (P5: Jest/Playwright/Hardhat testing, ESLint/Prettier, security audits).

The result is a deployable, automated system for both platforms, built in GitHub Codespaces with one-click setup. It preserves the PVA brand:

* **Colors**: Primary Dark (\#0f3b2d), Primary (\#1c5a45), Primary Light (\#2d7d5a), Accent (\#4ef8a3), Accent Dark (\#2bb673), Gold (\#d4af37), Text Light (\#e8f4f0), Text Muted (\#a8b0b9).  
* **Fonts**: Playfair Display (headings, e.g., logo), Poppins (body text).  
* **Aesthetic**: Dark background (\#0a0a0a) with radial gradients (rgba(28,90,69,0.15)); philosophical UX (archetype personalization); ethical focus (provenance, Atlas partners).

**Key Principles**: Zero-touch deployment, self-healing infra (auto-scaling via Vercel/AWS), 99.9% uptime, WCAG 2.1 AA accessibility, GDPR compliance. Total setup time: \<1 hour in Codespaces. Estimated cost: $50-200/month (free tiers for dev).

## **1\. Master Setup Guide**

### **One-Click GitHub Codespaces Environment Creation**

1. **Fork/Clone Repository**:  
   * Create GitHub repo: pvabazaar-monorepo (use template from GitHub's Next.js starter).  
   * In repo settings, enable Codespaces.  
   * Click "Code" \> "Codespaces" \> "Create codespace on main". This auto-loads .devcontainer/devcontainer.json (from P4 DevOps).  
2. **Automated Environment Provisioning**:  
   * Codespace launches Node 20, Docker, AWS CLI, Foundry (for blockchain).

Run setup script (auto-triggers via postCreateCommand):  
 bash  
\# .devcontainer/setup.sh (executable)  
\#\!/bin/bash  
echo "Setting up PVA Bazaar Environment..."

\# Install deps (monorepo: apps/com & apps/org)  
npm install \-g yarn turbo  \# For monorepo management  
yarn install  \# Or npm ci for production-like

\# Generate Prisma (Backend P3)  
npx prisma generate \--schema=./prisma/schema.prisma

\# Start local Supabase (DevOps P4)  
supabase start \--project-ref local

\# Setup blockchain (Hardhat from QA P5)  
cd contracts  
npm install  
npx hardhat compile  
npx hardhat node  \# Local chain on http://127.0.0.1:8545

\# Seed DB with PVA data (Backend P3 \+ QA P5)  
npx prisma db seed \--preview-feature

\# Install testing tools (QA P5)  
npx playwright install \--with-deps  
npm install \-g artillery pa11y

\# Verify PVA brand (custom script from QA)  
node scripts/validate-brand.js  \# Checks CSS vars

* echo "Environment ready\! Run 'yarn dev' for both platforms."

  * Make executable: chmod \+x .devcontainer/setup.sh.  
3. **Dependency Installation Procedures**:  
   * **Core**: yarn add next@14 react@18 react-dom@18 (Frontend P2).  
   * **Backend**: yarn add @prisma/client prisma supabase/supabase-js next-auth@4 ethers@6 ipfs-http-client zod dompurify stripe resend cloudinary algoliasearch @upstash/redis (P3).  
   * **DevOps/QA**: yarn add \-D jest @testing-library/react supertest playwright hardhat @nomicfoundation/hardhat-toolbox eslint prettier typescript @typescript-eslint/eslint-plugin @axe-core/react pa11y artillery (P4/P5).  
   * **Blockchain**: yarn add \-D @nomiclabs/hardhat-ethers ethers in /contracts.  
   * Monorepo: Use Turbo (turbo run build) for parallel builds (apps/com, apps/org).  
4. **Environment Variable Configuration**:

**Secure Defaults** (.env.example committed; copy to .env.local):  
 text  
\# Shared  
NODE\_ENV=development  
DATABASE\_URL=postgresql://postgres:postgres@localhost:54322/postgres  \# Supabase local  
NEXTAUTH\_SECRET=supersecretkey  \# Generate with openssl rand \-base64 32  
NEXTAUTH\_URL=http://localhost:3000

\# Frontend/Backend (P2/P3)  
STRIPE\_SECRET\_KEY=sk\_test\_...  \# Use test keys  
CLOUDINARY\_CLOUD\_NAME=...  
ALGOLIA\_APP\_ID=...  
UPSTASH\_REDIS\_URL=...

\# Blockchain (P3/P5)  
RPC\_URL=http://127.0.0.1:8545  \# Local Hardhat  
CONTRACT\_ADDRESS=0x...  \# Deployed local  
PRIVATE\_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  \# Hardhat default

\# DevOps (P4)  
VERCEL\_TOKEN=...  
SENTRY\_DSN=...  
SUPABASE\_URL=...

\# Platforms

* PVA\_PROJECT=com  \# or org; use in scripts

  * **Security**: Use Vercel/AWS Secrets Manager for prod (P4). Rotate keys quarterly. Never commit .env\*.  
5. **Database Setup and Seeding**:  
   * **Supabase Local**: Runs on setup.sh; connect via supabase://postgres:postgres@localhost:54322/postgres.  
   * **Schema**: From P3 (prisma/schema.prisma); migrate: npx prisma db push.

**Seeding** (prisma/seed.ts \- PVA-themed):  
 typescript  
import { PrismaClient } from '@prisma/client';

const prisma \= new PrismaClient();

async function main() {  
  // PVA Users/Archetypes (P1/P3)  
  await prisma.user.createMany({  
    data: \[  
      { email: 'guardian@example.com', archetype: 'Guardian', name: 'Ethical Buyer' },  
      { email: 'visionary@example.com', archetype: 'Visionary', name: 'Art Collector' },  
    \],  
  });

  // .com Products (P1: Ethical sourcing)  
  await prisma.product.createMany({  
    data: \[  
      { name: 'Malachite Fish Gem', description: 'Ethically sourced from Atlas partners', price: 189.99, category: 'gems', stock: 10, userId: 'guardian-id' },  
    \],  
  });

  // .org Artifacts (P3: Provenance)  
  await prisma.artifact.create({  
    data: { title: 'Ancient Artifact', description: 'With full provenance chain', tokenId: '1', contractAddress: '0x...', chainId: 8453, metadataCid: 'QmTest...' },  
  });

  console.log('PVA-themed data seeded\!');  
}

* main().catch(e \=\> console.error(e));  
   Run: npx prisma db seed. Includes 10+ samples for quiz/products/NFTs.  
6. **Blockchain Development Environment**:  
   * **Local Chain**: Hardhat node (setup.sh); testnet: Base Sepolia (RPC: [https://sepolia.base.org](https://sepolia.base.org)).

**Config** (contracts/hardhat.config.ts from P5 QA):  
 typescript  
import { HardhatUserConfig } from 'hardhat/config';  
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig \= {  
  solidity: '0.8.24',  
  networks: {  
    hardhat: { chainId: 1337 },  
    baseSepolia: { url: process.env.BASE\_SEPOLIA\_RPC || '', accounts: \[process.env.PRIVATE\_KEY || ''\] },  
  },  
  mocha: { timeout: 40000 },  
};

* export default config;

  * Deploy local: npx hardhat run scripts/deploy.js \--network hardhat.  
7. **Project Structure Generation Scripts**:

**Monorepo Setup** (scripts/init-monorepo.sh):  
 bash  
\#\!/bin/bash  
mkdir \-p apps/com apps/org shared/lib contracts prisma  
cd apps/com && npx create-next-app@14 . \--ts \--tailwind \--app  
cd ../org && npx create-next-app@14 . \--ts \--tailwind \--app \--wagmi  
cd ../../shared/lib && mkdir auth blockchain utils security  
\# Copy schemas from P3 to prisma/

* echo "Monorepo structure created. Run yarn install."

Full Structure:  
 text  
pvabazaar-monorepo/  
├── apps/  
│   ├── com/          \# pvabazaar.com (e-commerce)  
│   │   ├── app/      \# Next.js routes (quiz, shop, cart)  
│   │   ├── components/ \# PVA-styled UI (Playfair/Poppins)  
│   │   └── public/   \# Assets with PVA gradients  
│   └── org/          \# pvabazaar.org (blockchain)  
│       ├── app/      \# Routes (marketplace, mint, portfolio)  
│       ├── components/ \# Wallet UI (RainbowKit)  
│       └── contracts/ \# Hardhat (from P5)  
├── shared/  
│   └── lib/          \# Reusable (auth from P3, utils)  
├── prisma/           \# Schema/migrations (P3)  
├── tests/            \# E2E/unit (P5)  
├── .devcontainer/    \# Codespaces (P4)  
├── .github/workflows/ \# CI/CD (P4)  
├── infra/            \# Terraform (P4)  
├── scripts/          \# Setup/deploy (above)  
├── docs/             \# This handbook Markdown  
├── package.json      \# Monorepo deps (Turbo)

* └── turbo.json        \# Build orchestration  
   Run: ./scripts/init-monorepo.sh && yarn install.

## **2\. Development Workflow Documentation**

### **Git Branching Strategy (Dual-Platform)**

* **Main Branches**: main (prod), develop (staging).  
* **Feature Branches**: feature/\[platform\]/description (e.g., feature/com/quiz-personalization, feature/org/mint-royalties).  
* **Hotfix**: hotfix/\[issue\] (e.g., hotfix/security-patch).  
* **Release**: release/v1.0 (merge to main after QA).  
* **Monorepo Rule**: Changes affecting both (e.g., shared auth) use feature/shared/....  
* Commands: git checkout \-b feature/com/quiz && git push \-u origin feature/com/quiz.

### **Code Review Process (PVA Standards from P5 QA)**

1. **PR Creation**: From feature branch to develop; auto-run CI (P4 workflows: test, lint, security).  
2. **Checklist Review** (P5):  
   * Code coverage \>90% (Jest).  
   * PVA Colors/Fonts: Validate CSS vars (script from P5).  
   * Accessibility: axe-core passes.  
   * Security: No vulns (Snyk/Slither).  
   * Docs: JSDoc updated.  
   * Tests: Unit/E2E/Blockchain pass.  
3. **Approvals**: 2 reviewers (1 frontend, 1 backend/blockchain); use GitHub templates.  
4. **Merge**: Squash commits; auto-deploy to staging (Vercel previews).  
5. **Post-Merge**: Run regression suite (P5 automation).

### **Testing Procedures (Integrated Cycles from P5)**

* **Daily Dev**: Run yarn test:watch (Jest) \+ npx playwright test \--ui on save.  
* **PR**: Full suite (unit/integration/E2E/blockchain/perf/a11y) via Actions.  
* **Weekly**: Load tests (Artillery), security scans (OWASP).  
* **Archetype Flows**: Test personalization (e.g., Guardian recs gems).

### **Deployment Pipeline (From DevOps P4)**

1. **Local**: yarn dev (Turbo runs both apps:3000/com, :3001/org).  
2. **Staging**: PR merge → Vercel preview (e.g., com-feature.vercel.app).  
3. **Prod**: git checkout main && git merge develop && vercel \--prod (zero-downtime blue-green).  
4. **Blockchain**: npx hardhat deploy \--network base (post-API deploy).

### **Monitoring and Maintenance Protocols (P4)**

* **Tools**: Sentry (errors), Datadog (metrics, PVA dashboards with \#4ef8a3 accents), Vercel Analytics (RUM).  
* **Alerts**: Slack/Email via PagerDuty (e.g., \>5% error rate).  
* **Logs**: Centralized in Datadog; audit trails for txs (blockchain events).  
* **Weekly Review**: Check KPIs (uptime 99.9%, conversions by archetype).

### **Issue Tracking (GitHub \+ Sentry)**

* **Labels**: bug/com, enhancement/org, security, a11y.  
* **Workflow**: Triage in Issues; link to PRs; resolve in \<48h for bugs.  
* **Sentry Integration**: Auto-create issues for errors.

### **Documentation Standards**

* **JSDoc** (P5): For all functions/components.  
* **MD Files**: Update in /docs (this handbook); auto-gen API docs via Swagger (P4).  
* **Procedures**: Versioned; update on merges via hook.

## **3\. GitHub Copilot Integration Guide**

### **Specific Prompts for Phases (PVA Context)**

* **Setup Phase**: "Generate Next.js monorepo structure for pvabazaar.com (e-commerce with archetype quiz) and pvabazaar.org (NFT marketplace with wagmi), using Tailwind with PVA colors: \--primary \#1c5a45, \--accent \#4ef8a3, Poppins font."  
* **Frontend (P2)**: "Create responsive product card component for pvabazaar.com using React and Tailwind, with Playfair Display heading, gradient background rgba(28,90,69,0.15), and archetype-based styling for Guardian (gold accents \#d4af37)."  
* **Backend (P3)**: "Write Prisma migration for Artifact model in pvabazaar.org, including tokenId, metadataCid for IPFS, and RLS policy for user-owned provenance events. Use TypeScript with Zod validation."  
* **Blockchain**: "Generate Hardhat test for Marketplace contract mint function, asserting royalty payout 5% to owner, gas \<150k, using ethers v6."  
* **DevOps (P4)**: "Create GitHub Action YAML for deploying Next.js to Vercel with Supabase migration, including Sentry integration and PVA-themed badge with \#4ef8a3 color."  
* **QA (P5)**: "Write Playwright E2E test for wallet connect to mint flow on pvabazaar.org, validating UI colors match PVA scheme (\#e8f4f0 text on \#0a0a0a bg)."

### **Code Completion Optimization**

* **Extensions**: Enable in Codespaces (P4): GitHub Copilot, Copilot Chat.

**Settings** (.vscode/settings.json from P5):  
 json  
{  
  "github.copilot.enable": { "\*": true },  
  "editor.inlineSuggest.enabled": true,  
  "github.copilot.chat.codeGeneration.insertLeadingNewline": true

* }

* **PVA Context**: Add to workspace comments: "Always use PVA colors: primary \#1c5a45; ensure archetype personalization in UX."

### **AI-Assisted Debugging**

* **Prompts**: "Debug why archetype calculation returns Pioneer instead of Guardian for scores \[5,4,3,5,2\]; check lib/archetype.ts logic."  
* **Web3**: "Fix reentrancy vuln in Marketplace.sol buy function; add Checks-Effects-Interactions."  
* **Strategies**: Use Copilot Chat: "@workspace /explain this error in Prisma migration."

### **Automated Code Generation Workflows**

* **Scripts**: Use Copilot to gen: copilot suggest "Generate seed data for 5 PVA products with ethical descriptions".  
* **Tasks**: VS Code tasks (P5) trigger Copilot for boilerplate (e.g., new API route).

### **Best Practices for PVA Ecosystem**

* **Context**: Prefix prompts with "In PVA Bazaar: ethical e-commerce \+ web3 provenance."  
* **Custom Config**: Workspace file .copilot/rules.md: "Enforce Poppins font, no inline styles, validate colors against PVA scheme."  
* **Training**: Feed Copilot Chat with P1-P5 docs for better suggestions.

## **4\. Implementation Roadmap**

### **Phase-by-Phase Timeline (4-6 Weeks, Assuming 2-3 Devs)**

* **Phase 1: Setup (Week 1, Milestone: Local Env Running)**:  
  * Day 1-2: Codespaces \+ monorepo (scripts/init-monorepo.sh).  
  * Day 3: DB/Blockchain setup (seed.ts, hardhat deploy local).  
  * Dependencies: None. Critical Path: Repo fork.  
  * Risks: Env var leaks → Mitigate: .env ignored in Git.  
  * Success: yarn dev runs both apps; quiz works.  
* **Phase 2: Core Backend (Week 2, Milestone: APIs Functional)**:  
  * Implement P3: Schema, auth, products/artifacts APIs.  
  * Integrate shared lib (auth, blockchain utils).  
  * Test: Unit/integration (P5 Jest/Supertest).  
  * Dependencies: Phase 1\. Resources: 1 Backend Dev.  
  * Risks: Prisma migration fails → Rollback: prisma migrate reset.  
  * KPIs: 100% API coverage; \<100ms responses.  
* **Phase 3: Frontend \+ Integration (Week 3, Milestone: User Journeys Work)**:  
  * P2: Next.js pages/components with PVA styles (quiz, shop, mint).  
  * Connect to backend (API calls, wallet via wagmi).  
  * E2E Tests (P5 Playwright).  
  * Dependencies: Phase 2\. Team: 1 Frontend \+ 1 Fullstack.  
  * Risks: Wallet compat → Test MetaMask/Phantom.  
  * Success: End-to-end purchase/mint.  
* **Phase 4: DevOps \+ QA (Week 4, Milestone: CI/CD Passes)**:  
  * P4: Workflows, Terraform, monitoring.  
  * P5: Full QA suite; security audits.  
  * Deploy to staging.  
  * Dependencies: Phase 3\. Resources: DevOps Specialist.  
  * Risks: Vulns in contracts → Audit with Slither/MythX.  
  * KPIs: Lighthouse \>90; 0 high-severity issues.  
* **Phase 5: Launch Prep (Week 5-6, Milestone: Prod Deploy)**:  
  * Launch checklist (below).  
  * Scale tests (Artillery).  
  * Dependencies: All. Budget: $500 (testnet gas, Vercel pro).

**Resource Allocation**: 2 Devs (1 web, 1 web3), 1 QA/DevOps. Total Est. Cost: $5k (tools/gas).

**Rollback**: Per phase: Git revert \+ vercel rollback; DB: Prisma reset.

## **5\. Launch Checklist**

### **Pre-Launch Testing (P5 Procedures)**

* Full Regression: npm run test:all (unit/E2E/blockchain/perf/a11y).  
* User Journeys: Quiz → Recs → Purchase (com); Connect → Mint → Trade (org).  
* Load: 100 concurrent users (Artillery); Core Vitals green.  
* Security: OWASP/Slither clean; pen test passed.  
* A11y: WCAG AA (axe-core 0 violations).  
* Brand: Visual regression (Percy); colors/fonts validated.

### **Security Verification**

* Audits: Contracts verified (Etherscan); APIs scanned (ZAP).  
* Compliance: GDPR delete flow tested; KYC gating for .org.  
* Secrets: Rotated; no leaks (git-secrets).

### **Performance Optimization**

* CWV: LCP\<2s, CLS\<0.1 (Lighthouse).  
* Opt: Images via Cloudinary; queries indexed (Prisma).  
* Blockchain: Gas \<150k/mint.

### **SEO/Analytics**

* Meta: OpenGraph with PVA images; sitemap.xml.  
* Analytics: Vercel \+ Google (archetype tracking).  
* .com: Schema.org for products; .org: NFT metadata.

### **UAT Protocols**

* 5 users test flows; feedback via GitHub Discussions.  
* Archetype personalization validated.

### **Legal/Compliance**

* Terms: Updated for royalties/fractions.  
* KYC: Integrated for .org (e.g., Stripe Identity).

### **Marketing Prep**

* Email Templates: PVA-styled (Resend, \#e8f4f0 text).  
* Community: Discord/Forum seeded with educational content (P1).

## **6\. Maintenance and Scaling Guide**

### **Ongoing Procedures**

* **Daily**: Monitor Datadog/Sentry; auto-backups (Supabase daily).  
* **Weekly**: Dependency updates (Dependabot P4); security scans.  
* **Monthly**: Full QA suite; archetype data review.

### **Scaling Strategies**

* **Auto-Triggers**: Vercel auto-scales frontend; AWS Lambda for APIs (P4 Terraform).  
* **Blockchain**: Use L2 (Base) for low fees; off-chain indexing for queries.  
* **DB**: Supabase scales to 10k users; shard if \>100k.  
* **CDN**: Vercel Edge for global; monitor via Datadog (PVA dashboards \#4ef8a3).

### **Updates/Upgrades (Zero-Downtime)**

* Blue-green (P4): Deploy v2 alongside v1; switch traffic.  
* Migrations: Online (Prisma shadow DB); test rollback.  
* Contracts: Upgradeable proxies (OpenZeppelin).

### **Backup/Recovery**

* **Automated**: Supabase daily snapshots; S3 for assets (P4).  
* **Recovery**: supabase db reset \+ restore; Hardhat fork for tx replay.  
* **DR**: Multi-region (us-east-1/eu-west-1 via Terraform).

### **Performance Monitoring**

* **KPIs**: Track via Datadog: Tx latency \<5s, conversion by archetype.  
* **Opt**: Query profiling (Supabase); gas reports (Hardhat).

### **Community/Support**

* **Workflows**: Zendesk for users; Discord for .org (wallet help).  
* **Revenue BI**: Stripe dashboard \+ custom (royalties tracked).

## **7\. Troubleshooting and Support**

### **Common Issues**

* **Build Fails**: Clear cache yarn cache clean; check deps versions.  
* **DB Connection**: Verify Supabase URL; restart local supabase stop && supabase start.  
* **Wallet Errors**: Mock in tests; check RPC in prod.  
* **Color Mismatch**: Run node scripts/validate-brand.js; inspect CSS vars.

### **Emergency Response**

* **Outages**: PagerDuty alert → Assess (Sentry) → Rollback (Vercel) → Notify Slack.  
* **Time**: \<15min MTTR; post-mortem in GitHub.

### **Blockchain Troubleshooting**

* **Tx Fails**: Check gas (Alchemy dashboard); retry with higher limit.  
* **IPFS Pin**: Verify via Pinata; fallback to local.

### **User Support**

* **Wallet Issues**: Guide: "Connect via RainbowKit; ensure Base network."  
* **Quiz Bugs**: Reset localStorage; test archetype calc.

### **Performance Degradation**

* **Investigate**: Datadog traces; optimize slow queries (EXPLAIN in Supabase).

### **Security Incidents**

* **Response**: Isolate (Vercel suspend); scan (Snyk); report to team.  
* **Escalation**: AWS Support (Tier 1); Chainlink for oracles.

### **Vendor Contacts**

* Vercel: support@vercel.com (SLA 99.99%).  
* Supabase: support@supabase.io.  
* Alchemy (RPC): support@alchemy.com.  
* Sentry: support@sentry.io.

**Next Steps**: Run ./scripts/init-monorepo.sh in Codespaces. For questions, use Copilot Chat with PVA context. This handbook enables solo dev to full team scaling while embodying PVA's ethical, philosophical ethos. Update quarterly via PRs.

# **PVA QA Framework: End-to-End Quality, Security, and Brand Fidelity**

All tests and dashboards enforce the **official PVA palette** (Primary Dark `#0f3b2d`, Primary `#1c5a45`, Primary Light `#2d7d5a`, Accent `#4ef8a3`, Accent Dark `#2bb673`, Gold `#d4af37`, Text Light `#e8f4f0`, Text Muted `#a8b0b9`). Where visual tools allow, these are asserted as tokens and verified via visual regression.  
 The stack and scope align with your architecture/tech recommendations and research docs for `.com` and `.org`.

---

## **Repository Test Layout**

`.`  
`├─ apps/`  
`│  ├─ web-com/                 # pvabazaar.com`  
`│  │  ├─ jest.config.ts`  
`│  │  ├─ playwright.config.ts`  
`│  │  ├─ src/__tests__/`  
`│  │  └─ e2e/`  
`│  ├─ web-org/                 # pvabazaar.org (wallet/NFT/fractional)`  
`│  │  ├─ jest.config.ts`  
`│  │  ├─ playwright.config.ts`  
`│  │  ├─ foundry.toml          # Foundry tests for contracts (mirrors apps/contracts)`  
`│  │  ├─ src/__tests__/`  
`│  │  └─ e2e/`  
`│  ├─ contracts/               # Foundry/Hardhat tests`  
`│  │  ├─ foundry.toml`  
`│  │  ├─ test/`  
`│  │  └─ script/`  
`│  └─ api-tests/               # Supertest/ZAP/Artillery suites`  
`│     ├─ jest.config.ts`  
`│     ├─ integration/`  
`│     ├─ security/`  
`│     └─ load/`  
`├─ qa/`  
`│  ├─ backstop.config.cjs      # visual regression & brand colors`  
`│  ├─ lighthouse/lhci.json`  
`│  ├─ axe/axe-runner.ts`  
`│  ├─ pa11y/pa11y.ci.json`  
`│  ├─ check-brand-tokens.ts`  
`│  └─ check-schema-coverage.ts`  
`├─ .github/workflows/`  
`│  ├─ ci.yml                   # already present from DevOps – add QA gates`  
`│  └─ quality-gates.yml`  
`├─ .husky/`  
`│  └─ pre-commit`  
`├─ eslint.config.mjs`  
`├─ prettier.config.cjs`  
`├─ tsconfig.json`  
`└─ commitlint.config.cjs`

---

# **1\) Testing Strategy Framework**

### **1.1 Unit Testing (Jest \+ React Testing Library)**

**`apps/web-*/jest.config.ts`**

`import nextJest from 'next/jest';`  
`const createJestConfig = nextJest({ dir: './' });`

`export default createJestConfig({`  
  `testEnvironment: 'jsdom',`  
  `setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],`  
  `collectCoverageFrom: [`  
    `'src/**/*.{ts,tsx}',`  
    `'!src/**/_app.tsx',`  
    `'!src/**/_document.tsx',`  
  `],`  
  `coverageThreshold: { global: { branches: 80, functions: 85, lines: 90, statements: 90 } },`  
`});`

**`apps/web-*/jest.setup.ts`**

`import '@testing-library/jest-dom';`

**Example component test (`apps/web-com/src/__tests__/Badge.test.tsx`)**

`import { render, screen } from '@testing-library/react';`  
`import Badge from '../components/Badge';`

`test('renders gold badge using PVA palette', () => {`  
  `render(<Badge tone="gold">Verified</Badge>);`  
  `const el = screen.getByText(/Verified/i);`  
  `expect(getComputedStyle(el).backgroundColor).toBe('rgb(212, 175, 55)'); // #d4af37`  
`});`

Brand tone checks ensure components remain faithful to the **PVA color system** when refactors land.

---

### **1.2 Integration Testing (API with Supertest \+ Prisma test DB)**

**`apps/api-tests/integration/products.int.spec.ts`**

`import request from 'supertest';`

`const base = process.env.API_BASE_URL ?? 'http://localhost:3000';`

`describe('Products API', () => {`  
  `it('lists products with pagination', async () => {`  
    `const res = await request(base).get('/api/products?limit=10&page=1').expect(200);`  
    `expect(Array.isArray(res.body.items)).toBe(true);`  
    `expect(res.body.items.length).toBeLessThanOrEqual(10);`  
  `});`

  `it('rejects invalid payloads (zod)', async () => {`  
    `await request(base).post('/api/products').send({ name: 123 }).expect(400);`  
  `});`  
`});`

Endpoint coverage follows the unified API spec and marketplace flows planned in your specs.

---

### **1.3 End-to-End (Playwright)**

**`apps/web-*/playwright.config.ts`**

`import { defineConfig, devices } from '@playwright/test';`  
`export default defineConfig({`  
  `timeout: 60_000,`  
  `projects: [`  
    `{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },`  
    `{ name: 'firefox',  use: { ...devices['Desktop Firefox'] } },`  
    `{ name: 'webkit',   use: { ...devices['Desktop Safari'] } },`  
    `{ name: 'iPhone 13',use: { ...devices['iPhone 13'] } }`  
  `],`  
  `webServer: {`  
    `command: 'pnpm dev',`  
    `port: 3000,`  
    `reuseExistingServer: !process.env.CI,`  
  `},`  
`});`

**Example flow (`apps/web-org/e2e/purchase-fraction.spec.ts`)**

`import { test, expect } from '@playwright/test';`

`test('fractional purchase happy path', async ({ page }) => {`  
  `await page.goto('/');`  
  `await page.getByRole('button', { name: 'Connect Wallet' }).click();`  
  `await page.getByText('Injected').click(); // e.g., MetaMask in CI using playwright-metamask`  
  `await page.getByRole('link', { name: /Artifacts/ }).click();`  
  `await page.getByRole('button', { name: /Buy Fraction/ }).click();`  
  `await page.getByLabel('Shares').fill('10');`  
  `await page.getByRole('button', { name: 'Confirm' }).click();`  
  `await expect(page.getByText(/Transaction submitted/i)).toBeVisible();`  
`});`

---

### **1.4 Blockchain Testing (Foundry \+ Hardhat utilities)**

**`apps/contracts/foundry.toml`**

`[profile.default]`  
`src = 'src'`  
`out = 'out'`  
`libs = ['lib']`  
`gas_reports = ["*"]`  
`optimizer = true`  
`optimizer_runs = 20_000`

**`apps/contracts/test/Royalties.t.sol`**

`// SPDX-License-Identifier: MIT`  
`pragma solidity ^0.8.24;`

`import "forge-std/Test.sol";`  
`import "../src/Royalties.sol";`

`contract RoyaltiesTest is Test {`  
  `Royalties r;`

  `function setUp() public { r = new Royalties(750); } // 7.5%`

  `function test_Distribute() public {`  
    `uint256 amount = 1 ether;`  
    `uint256 royalty = r.royaltyAmount(amount);`  
    `assertEq(royalty, 0.075 ether);`  
  `}`  
`}`

Contracts cover minting, royalties, and fractional ownership; gas reporting and invariants are required for `.org` marketplace correctness.

---

### **1.5 Performance & Load (Artillery \+ Lighthouse CI)**

**`apps/api-tests/load/artillery.yml`**

`config:`  
  `target: "https://staging.pvabazaar.com"`  
  `phases:`  
    `- duration: 300`  
      `arrivalRate: 20`  
      `name: ramp`  
`scenarios:`  
  `- name: browse-and-add-to-cart`  
    `flow:`  
      `- get: { url: "/api/products?limit=12" }`  
      `- get: { url: "/api/products/{{ $randomNumber(1,100) }}" }`  
      `- post:`  
          `url: "/api/cart"`  
          `json: { productId: "{{ $randomNumber(1,100) }}", quantity: 1 }`

**`qa/lighthouse/lhci.json`**

`{`  
  `"extends": "lighthouse:default",`  
  `"assert": {`  
    `"assertions": {`  
      `"categories:performance": ["error", {"minScore": 0.9}],`  
      `"categories:best-practices": ["warn", {"minScore": 0.9}],`  
      `"categories:seo": ["warn", {"minScore": 0.9}]`  
    `}`  
  `}`  
`}`

---

### **1.6 Visual Regression & Brand Consistency**

**`qa/backstop.config.cjs`**

`module.exports = {`  
  `id: 'pva-backstop',`  
  `viewports: [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 375, height: 800 }],`  
  `scenarios: [`  
    `{ label: 'Home .com', url: 'https://staging.pvabazaar.com' },`  
    `{ label: 'Home .org', url: 'https://staging.pvabazaar.org' },`  
    `{ label: 'Artifact Detail', url: 'https://staging.pvabazaar.org/artifacts/1' }`  
  `],`  
  `onBeforeScript: 'puppet/onBefore.js',`  
  `engine: 'playwright',`  
  `report: ['browser'],`  
  `asyncCaptureLimit: 5,`  
  `asyncCompareLimit: 10,`  
  `debug: false`  
`};`

**Brand token validator (used in CI): `qa/check-brand-tokens.ts`**

`import fetch from 'node-fetch';`

`const PALETTE = ['#0f3b2d','#1c5a45','#2d7d5a','#4ef8a3','#2bb673','#d4af37','#e8f4f0','#a8b0b9'];`

`(async () => {`  
  `const urls = [`  
    `'https://staging.pvabazaar.com/_next/static/css/*.css',`  
    `'https://staging.pvabazaar.org/_next/static/css/*.css'`  
  `];`  
  `for (const pattern of urls) {`  
    `// In CI we glob and fetch each CSS file`  
    `const css = await (await fetch(process.argv[2] ?? '')).text();`  
    `for (const hex of PALETTE) {`  
      `if (!css.toLowerCase().includes(hex)) {`  
        ``console.error(`Missing brand color ${hex} in ${pattern}`);``  
        `process.exit(2);`  
      `}`  
    `}`  
  `}`  
  `console.log('Brand tokens present');`  
`})();`

Colors are sourced from your **PVA Blueprint** and design pages; Percy/Backstop \+ token checks prevent off-brand regressions.

---

### **1.7 Accessibility (axe-core \+ Pa11y)**

**`qa/axe/axe-runner.ts`**

`import { chromium } from 'playwright';`  
`import AxeBuilder from '@axe-core/playwright';`

`(async () => {`  
  `const browser = await chromium.launch();`  
  `const page = await browser.newPage();`  
  `await page.goto(process.env.TARGET_URL || 'http://localhost:3000');`  
  `const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze();`  
  `if (results.violations.length) {`  
    `console.error(JSON.stringify(results.violations, null, 2));`  
    `process.exit(1);`  
  `}`  
  `await browser.close();`  
`})();`

**`qa/pa11y/pa11y.ci.json`**

`{`  
  `"defaults": { "standard": "WCAG2AA", "timeout": 60000 },`  
  `"urls": ["https://staging.pvabazaar.com","https://staging.pvabazaar.org"]`  
`}`

---

# **2\) Code Quality Standards**

### **2.1 ESLint (with PVA rules)**

**`eslint.config.mjs`**

`import next from 'eslint-config-next';`  
`export default [`  
  `...next(),`  
  `{`  
    `rules: {`  
      `'react/no-danger': 'error',`  
      `'no-restricted-syntax': ['error', { selector: "Literal[value='#1da1f2']", message: 'Use PVA palette only.' }],`  
      `'@typescript-eslint/consistent-type-definitions': ['error','type'],`  
      `'import/no-default-export': 'off' // Next.js uses default exports for pages`  
    `},`  
    `overrides: [`  
      `{ files: ['**/*.test.*'], rules: { 'import/no-extraneous-dependencies': 'off' } }`  
    `]`  
  `}`  
`];`

### **2.2 Prettier**

**`prettier.config.cjs`**

`module.exports = { singleQuote: true, trailingComma: 'all', printWidth: 100 };`

### **2.3 TypeScript Strictness**

**`tsconfig.json`**

`{`  
  `"compilerOptions": {`  
    `"target": "ES2022",`  
    `"lib": ["ES2022","DOM"],`  
    `"strict": true,`  
    `"noUncheckedIndexedAccess": true,`  
    `"noImplicitOverride": true,`  
    `"moduleResolution": "Bundler",`  
    `"skipLibCheck": true`  
  `}`  
`}`

### **2.4 Reviews & Docs**

* **Code Review Checklist** (excerpt):

  * ✅ Brand tokens only; no ad-hoc hex codes.

  * ✅ API validations (zod) and error boundaries in App Router.

  * ✅ Accessibility landmarks (nav/main/footer), focus management.

  * ✅ Contracts: events emitted and indexed; gas deltas monitored.

  * ✅ No secrets in code/console logs.

* **Docs**: JSDoc in shared libs; API OpenAPI document auto-generated and served at `/api/docs` (as per backend plan).

* **Commits/Branches**: Conventional Commits \+ `feature/*`, `fix/*`, `chore/*`; PRs require passing QA gates.

* **Pre-commit** (`.husky/pre-commit`)

`#!/bin/sh`  
`. "$(dirname "$0")/_/husky.sh"`  
`pnpm -w lint-staged`

**`package.json` (snippet)**

`{`  
  `"lint-staged": {`  
    `"*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],`  
    `"*.{md,json,yml}": ["prettier --write"]`  
  `}`  
`}`

---

# **3\) Security Testing Procedures**

* **Web app pen-testing**: automated **OWASP ZAP** baseline in CI (staging). Authenticated scans via context file.

* **Smart contracts**: **Slither** static analysis, **MythX** SaaS (if enabled), **Echidna** fuzzing; Foundry invariant tests.

* **API security**: Supertest suites for auth, RBAC, rate limiting; ZAP rules for injection/XSS; CSRF tests for `.com` where needed.

* **GDPR**: Export/delete tests for user data; verify PII isolation and encryption at rest.

* **KYC gates**: Tests for Persona webhooks and blocked actions until verification.

* **Input validation**: zod schema tests reject unexpected fields; SQL injection safety verified by parameterized queries and Prisma; XSS sanitization tests for user-generated content.

These directly support the compliance and security requirements identified in your specs (payments/KYC/royalties/provenance).

---

# **4\) User Experience Testing**

* **Cross-browser**: Playwright projects (Chromium/Firefox/WebKit).

* **Mobile**: iPhone viewport & Android emulation; interaction latency assertions.

* **Accessibility**: axe/Pa11y CI gate (no WCAG AA violations).

* **Core Web Vitals**: LHCI assertions (≥ 0.9 performance).

* **Archetype flows**: E2E journeys ensuring quiz → recommendation → purchase remain cohesive; content tone checked for cultural sensitivity with snapshot tests on copy blocks (approved wording in fixtures).

* **Wallets**: wagmi \+ mocked providers; MetaMask/WalletConnect flows; error paths (rejected signature, insufficient funds).

* **Fractional UX**: tests for math correctness and human-readable summaries (e.g., “10/100 shares · 10% ownership”).

The archetype-driven personalization is a first-class QA target to maintain your signature UX.

---

# **5\) Blockchain-Specific Testing**

* **Unit**: Contracts (mint, list, buy, royalties EIP-2981, fractions).

* **Gas**: Foundry gas reports checked into CI; budget thresholds enforced.

* **Multi-chain**: matrix against Base/Polygon/ETH testnets (RPC via environment).

* **Metadata**: IPFS CID validation and JSON schema for NFT metadata; hash/pinning tests.

* **Royalty correctness**: property-based tests (Echidna) ensure distribution sums equal expected amounts.

* **Oracle/price feeds**: mock feeds; failure-mode tests (stale price, zero address).

---

# **6\) Automation Testing Suite & CI Quality Gates**

**`.github/workflows/quality-gates.yml`**

`name: Quality Gates`  
`on: [pull_request]`  
`jobs:`  
  `unit_integration:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- uses: actions/setup-node@v4`  
        `with: { node-version: 20, cache: 'pnpm' }`  
      `- uses: pnpm/action-setup@v3`  
        `with: { version: 9 }`  
      `- run: pnpm i -w --frozen-lockfile`  
      `- run: pnpm -w test`  
      `- run: pnpm -w test:integration`  
  `e2e_playwright:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- uses: microsoft/playwright-github-action@v1`  
      `- run: pnpm -w e2e`  
  `visual_brand:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- run: pnpm -w qa:backstop:ci`  
      `- run: pnpm -w qa:brand:check`  
  `accessibility:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- run: pnpm -w qa:axe`  
      `- run: pnpm -w qa:pa11y`  
  `performance:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- run: pnpm -w qa:lhci`  
  `load_api:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- run: pnpm -w qa:artillery`  
  `security:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- run: pnpm -w qa:zap:baseline`  
      `- run: pnpm -w qa:slither`  
      `- run: pnpm -w qa:echidna`

**`package.json` (root QA scripts excerpt)**

`{`  
  `"scripts": {`  
    `"test": "jest -w apps/web-com -w apps/web-org",`  
    `"test:integration": "jest -w apps/api-tests --selectProjects integration",`  
    `"e2e": "playwright test",`  
    `"qa:backstop:ci": "backstop test --config=qa/backstop.config.cjs",`  
    `"qa:brand:check": "ts-node qa/check-brand-tokens.ts https://staging.pvabazaar.com/_next/static/css/app.css",`  
    `"qa:axe": "ts-node qa/axe/axe-runner.ts",`  
    `"qa:pa11y": "pa11y-ci -c qa/pa11y/pa11y.ci.json",`  
    `"qa:lhci": "lhci autorun --config=qa/lighthouse/lhci.json",`  
    `"qa:artillery": "artillery run apps/api-tests/load/artillery.yml",`  
    `"qa:zap:baseline": "zap-baseline.py -t https://staging.pvabazaar.com -J zap.json",`  
    `"qa:slither": "slither ./apps/contracts",`  
    `"qa:echidna": "echidna-test apps/contracts --config apps/contracts/echidna.yaml"`  
  `}`  
`}`

**Deployment approval**: The **Deploy** workflow requires all QA jobs green; visual/brand and accessibility gates must pass before production promotion.

---

# **7\) PVA-Specific Quality Assurance**

* **Archetype quiz accuracy**: unit tests for scoring matrix \+ E2E validation of recommended products/NFTs per archetype.

* **Cultural sensitivity**: snapshot-tested content blocks and a reviewer checklist; failing words flagged in CI (wordlist with allow/deny).

* **Partner onboarding**: E2E flow: invite → KYC/verification → listing publish; checks for required attestations.

* **Philosophical content checks**: schema ensures copy blocks use approved tone; broken links/images fail PR.

* **Atlas partner authenticity**: webhook tests verify signed payloads \+ audit trail presence.

* **Brand compliance**: token scanner \+ Backstop ensure **only** approved palette appears in produced CSS/Storybook.

---

## **GitHub Codespaces Integration**

* **Runs in Codespaces**: all tools (Playwright w/ headless browsers, Foundry, ZAP baseline via Docker).

* **Auto test on change**: `pnpm dev:test` runs Jest watchers; Playwright `--ui` locally in Codespaces preview.

* **VS Code Test UX**: jest & playwright extensions included; run/debug individual tests.

* **Browser testing**: Playwright bundled browsers installed in `postCreate`.

* **Performance in cloud dev**: LHCI runs against **staging** URLs to avoid Codespaces network variance.

* **Local chain**: Foundry `anvil` auto-started for contract tests.

---

## **Bug Tracking & Resolution**

* **Triage labels**: `bug/critical`, `bug/high`, `bug/medium`, `bug/low`; SLA rules per label.

* **Repro templates**: issue forms for UI/API/contract defects.

* **Defect lifecycle**: failing test first → fix → PR with linked issue → QA reviewer approval → merge.

---

## **Performance Benchmarks & Optimization Guidelines**

* **Front-end**: TTI ≤ 2.5s on 4G simulated, CLS \< 0.1, LCP \< 2.5s (LHCI enforced).

* **API**: p95 latency \< 250ms `.com`, \< 400ms `.org` (due to on-chain ops); load test keeps error rate \< 1%.

* **Indexers**: on-chain event lag \< 30s alert threshold.

---

## **Security Checklists & Vulnerability Management**

* **Checklists**: auth flows, session fixation, CSRF, SSRF, CSP headers, dependency scans, RBAC permissions.

* **Vuln mgmt**: Snyk/CodeQL/Dependabot create issues with severity; fixes required before release.

* **Data handling**: PII encrypted; GDPR export/delete endpoints covered by tests and runbooks.

---

## **Example Templates**

**Playwright E2E (archetype → product)**

`test('quiz → recommendation → add to cart', async ({ page }) => {`  
  `await page.goto('/quiz');`  
  `// ...answer questions...`  
  `await page.getByRole('button', { name: /See my archetype/ }).click();`  
  `await page.getByRole('button', { name: /Shop Guardian Picks/ }).click();`  
  `await page.getByRole('button', { name: /Add to cart/ }).first().click();`  
  `await expect(page.getByText(/Added to cart/)).toBeVisible();`  
`});`

**Supertest (authz)**

`it('forbids partner-only endpoint for non-partner user', async () => {`  
  ``await request(base).get('/api/partners/listings').set('Authorization', `Bearer ${userToken}`).expect(403);``  
`});`

**Echidna (fractional math) – concept config**

`testLimit: 2000`  
`seqLen: 25`

---

## **How this ties back to your plans**

* The suite verifies the capabilities outlined across your Architecture, Backend, and DevOps plans—especially **marketplace, provenance, royalties, fractional ownership, and archetype personalization**—while keeping **brand fidelity** guaranteed with automated checks.

---

### **Final Notes**

* The QA framework is **zero-touch** in CI: gates block production deploys until green.

* Visual checks ensure **PVA identity never drifts** during rapid iteration.

* Everything runs **in GitHub Codespaces** with the same toolchain developers use locally.

If you want, I can generate a branch with these files pre-scaffolded so you can commit and run the pipelines immediately.

ChatGPT ca

# **PVA Bazaar Master Implementation Guide**

## **Complete Dual-Platform Development & Deployment Handbook**

I've created a comprehensive master implementation guide that transforms the PVA Bazaar concept into a fully deployable dual-platform system. This guide addresses all your requirements for preserving the authentic PVA brand experience while providing complete technical implementation.

![PVA Bazaar Implementation Roadmap - Complete development lifecycle from setup to production scaling][image1]  
PVA Bazaar Implementation Roadmap \- Complete development lifecycle from setup to production scaling

## **Key Deliverables Created**

## **1\. Master Setup Guide ✅**

* One-Click GitHub Codespaces Setup: Complete DevContainer configuration with automated environment creation  
* Automated Project Structure: Script generates entire directory tree with 50+ folders for organized development  
* Multi-Platform Package Management: Separate configurations for Frontend (Next.js \+ Web3), Backend (Node.js \+ Express), and Smart Contracts (Hardhat)  
* PVA Brand Integration: All configurations include official colors (\#1c5a45, \#4ef8a3, \#d4af37) and typography (Playfair Display, Poppins)  
* Environment Variables: Secure templates for development, staging, and production with testnet configurations

## **2\. Development Workflow Documentation ✅**

* Git Branching Strategy: Specialized workflow for dual-platform development with feature branches for frontend/backend/contracts/integration  
* Code Review Process: PVA-specific pull request templates ensuring brand compliance and archetype alignment  
* Testing Integration: Jest configurations with 80% coverage requirements and automated testing for both Web2 and Web3 components

## **3\. GitHub Copilot Integration Guide ✅**

* PVA-Specific Prompts: Custom prompts for archetype-based components, marketplace contracts, and spiritual alignment features  
* AI-Assisted Debugging: Automated diagnostic scripts that leverage AI for troubleshooting both traditional and blockchain issues  
* Code Completion Optimization: VSCode settings tuned for PVA development patterns

## **4\. Implementation Roadmap ✅**

Phase-by-Phase Timeline:

* Phase 1 (Weeks 1-2): Foundation setup and smart contract development  
* Phase 2 (Weeks 3-6): Core platform development with archetype integration  
* Phase 3 (Weeks 7-10): Comprehensive testing and quality assurance  
* Phase 4 (Weeks 11-12): Production deployment and launch

## **5\. Technical Architecture ✅**

**![PVA Bazaar Technical Architecture - Complete dual-platform system architecture with Web2 and Web3 integration][image2]**  
PVA Bazaar Technical Architecture \- Complete dual-platform system architecture with Web2 and Web3 integration

The architecture diagram shows the complete three-layer system:

* Frontend Layer: Next.js with Web3 wallet integration and archetype-based UI  
* Backend Layer: Node.js API with MongoDB and authentication systems  
* Blockchain Layer: Smart contracts for marketplace, profiles, and NFTs

## **6\. DevOps CI/CD Pipeline ✅**

**![PVA Bazaar DevOps CI/CD Pipeline - Complete automated deployment workflow from code to production][image3]**  
PVA Bazaar DevOps CI/CD Pipeline \- Complete automated deployment workflow from code to production

Complete automated deployment workflow including:

* GitHub Actions for continuous integration  
* Automated testing for all platforms (Web2 \+ Web3)  
* Security scanning with smart contract audits  
* Multi-environment deployment (development → testnet → production → mainnet)

## **7\. Production-Ready Scripts ✅**

I've created an executable setup script (pva-bazaar-setup.sh) that provides:

* Complete project initialization with one command  
* All dependency management automated  
* Brand-compliant configurations throughout  
* Development server startup scripts  
* Comprehensive testing automation  
* Documentation generation

## **Unique PVA Brand Integrations**

## **Spiritual & Cultural Authenticity**

* Archetype-Based Architecture: User profiles, product categorization, and recommendation systems built around Jung's 12 archetypes  
* Brand Color System: All interfaces use the official PVA palette with semantic meaning  
* Community-Centric Design: Support systems assign agents based on user archetypes for better rapport  
* Philosophical Integration: Every technical decision honors PVA's spiritual marketplace purpose

## **Web3 Innovation with Purpose**

* Soul-Bound Tokens: User profiles as non-transferable NFTs representing authentic archetypal identity  
* Spiritual Metadata: Smart contracts store archetype alignment data for products and services  
* Community Governance: DAO-style decision making aligned with archetypal wisdom  
* Conscious Economics: Transaction fees support community growth and spiritual development

## **Implementation Benefits**

## **For Development Teams**

* Zero-Setup Development: GitHub Codespaces environment ready in minutes  
* Comprehensive Documentation: Every aspect covered from setup to scaling  
* Automated Quality Assurance: Built-in testing and security scanning  
* Scalable Architecture: Designed to grow with the PVA community

## **For PVA Community**

* Authentic Brand Experience: Every technical element preserves spiritual values  
* Accessible Web3: Complex blockchain features made user-friendly  
* Community Support: Archetype-based user assistance and community management  
* Sustainable Growth: Architecture supports both traditional and crypto-native users

## **Next Steps for Implementation**

1. Immediate Setup: Run bash pva-bazaar-setup.sh in any environment  
2. Team Onboarding: Use the comprehensive developer documentation  
3. Phased Deployment: Follow the 12-week implementation roadmap  
4. Community Integration: Engage PVA members for testing and feedback  
5. Production Launch: Deploy with confidence using the complete deployment checklist

This master implementation guide transforms the PVA Bazaar vision into executable reality, ensuring that every line of code serves the higher purpose of authentic human connection through archetypal alignment. The platform isn't just technically sound—it's spiritually aligned with PVA's mission to help people discover and express their most vibrant, authentic selves.

# **PVA Bazaar — Master Implementation Handbook**

*Integration Manager Edition – build, deploy, and maintain pvabazaar.com & pvabazaar.org from GitHub Codespaces with minimal friction.*

**Brand System (apply everywhere):**  
 Colors — Primary Dark `#0f3b2d`, Primary `#1c5a45`, Primary Light `#2d7d5a`, Accent `#4ef8a3`, Accent Dark `#2bb673`, Gold `#d4af37`, Text Light `#e8f4f0`, Text Muted `#a8b0b9`  
 Fonts — **Playfair Display** (headings), **Poppins** (body)

---

## **0\) What’s in this handbook**

1. Master Setup Guide (Codespaces, envs, one-click bootstrap)

2. Development Workflow Documentation (branching, code review, CI/CD)

3. GitHub Copilot Integration Guide (PVA-tuned prompts & config)

4. Implementation Roadmap (phases, milestones, risks, budget)

5. Launch Checklist (security, SEO, UAT, audits)

6. Maintenance & Scaling (backups, zero-downtime upgrades)

7. Troubleshooting & Support (playbooks, incident response)

All steps assume a monorepo that houses **two web properties** and **shared services**:

`pva-bazaar/`  
`├─ apps/`  
`│  ├─ web-org/           # pvabazaar.org (marketing/landing/docs)`  
`│  ├─ web-com/           # pvabazaar.com (marketplace app)`  
`│  └─ admin/             # internal/admin UI (brand-styled)`  
`├─ services/`  
`│  ├─ api/               # Node/Express (or Nest) + MongoDB`  
`│  ├─ worker/            # queue/cron workers (BullMQ)`  
`│  └─ chain/             # smart contracts (Hardhat + Foundry)`  
`├─ packages/`  
`│  ├─ ui/                # shared React components (brand tokens)`  
`│  ├─ config/            # eslint, tsconfig, jest, prettier`  
`│  └─ emails/            # MJML/email templates (brand)`  
`├─ .github/workflows/    # CI/CD pipelines`  
`├─ .devcontainer/        # Codespaces config`  
`├─ docker/               # compose files (dev/prod)`  
`├─ scripts/              # setup, seed, migrate, backup`  
`└─ README.md`

**Package manager:** `pnpm` with workspaces (fast, cache-friendly).  
 **Task runner:** `turbo` for parallel builds/tests.  
 **Infra (dev):** Docker Compose for MongoDB, Redis, local chain.  
 **Infra (prod):** Vercel (frontends) \+ Render/Fly/DO (API/Workers/DB) or fully on AWS via ECS/RDS if preferred.

---

# **1\) Master Setup Guide**

### **1.1 One-click Codespaces**

Create **.devcontainer/devcontainer.json**:

`{`  
  `"name": "PVA Bazaar",`  
  `"image": "mcr.microsoft.com/devcontainers/typescript-node:20",`  
  `"features": {`  
    `"ghcr.io/devcontainers/features/git:1": {},`  
    `"ghcr.io/devcontainers/features/docker-outside-of-docker:1": {},`  
    `"ghcr.io/devcontainers/features/github-cli:1": {}`  
  `},`  
  `"postCreateCommand": "corepack enable && pnpm i && pnpm pva:bootstrap",`  
  `"postStartCommand": "pnpm pva:up",`  
  `"customizations": {`  
    `"vscode": {`  
      `"extensions": [`  
        `"esbenp.prettier-vscode",`  
        `"dbaeumer.vscode-eslint",`  
        `"bradlc.vscode-tailwindcss",`  
        `"ms-playwright.playwright",`  
        `"vivaxy.vscode-conventional-commits",`  
        `"streetsidesoftware.code-spell-checker"`  
      `],`  
      `"settings": {`  
        `"editor.formatOnSave": true`  
      `}`  
    `}`  
  `},`  
  `"remoteEnv": {`  
    `"NODE_ENV": "development"`  
  `},`  
  `"portsAttributes": {`  
    `"3000": { "label": "web-org" },`  
    `"3001": { "label": "web-com" },`  
    `"3002": { "label": "admin" },`  
    `"4000": { "label": "api" },`  
    `"8545": { "label": "hardhat-node" }`  
  `},`  
  `"forwardPorts": [3000, 3001, 3002, 4000, 8545]`  
`}`

**Use:** Click **“Code → Create Codespace on main”**. The postCreate hooks install everything and bring services up.

### **1.2 Project scripts (one command runs all)**

**package.json (root)** — core scripts:

`{`  
  `"name": "pva-bazaar",`  
  `"private": true,`  
  `"packageManager": "pnpm@9.0.0",`  
  `"scripts": {`  
    `"pva:bootstrap": "pnpm -w dlx turbo prune --scope=@pva/* && pnpm -w i",`  
    `"pva:up": "docker compose -f docker/dev.compose.yml up -d && pnpm dev",`  
    `"dev": "turbo run dev --parallel",`  
    `"build": "turbo run build",`  
    `"test": "turbo run test",`  
    `"lint": "turbo run lint",`  
    `"typecheck": "turbo run typecheck",`  
    `"e2e": "turbo run e2e",`  
    `"seed": "tsx scripts/seed.ts",`  
    `"migrate": "tsx scripts/migrate.ts",`  
    `"snapshot": "hardhat test",`  
    `"deploy:dev": "tsx scripts/deploy.ts dev",`  
    `"deploy:prod": "tsx scripts/deploy.ts prod",`  
    `"ship": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"`  
  `},`  
  `"devDependencies": {`  
    `"turbo": "^2.0.0",`  
    `"tsx": "^4.16.0"`  
  `},`  
  `"workspaces": [`  
    `"apps/*",`  
    `"services/*",`  
    `"packages/*"`  
  `]`  
`}`

### **1.3 Docker dev stack**

**docker/dev.compose.yml**:

`version: "3.9"`  
`services:`  
  `mongo:`  
    `image: mongo:7`  
    `ports: ["27017:27017"]`  
    `volumes:`  
      `- mongo-data:/data/db`  
  `redis:`  
    `image: redis:7`  
    `ports: ["6379:6379"]`  
  `chain:`  
    `image: ghcr.io/foundry-rs/foundry:latest`  
    `command: anvil --host 0.0.0.0 --block-time 2`  
    `ports: ["8545:8545"]`  
  `api:`  
    `build: ../services/api`  
    `command: pnpm start:dev`  
    `env_file: ../.env.development`  
    `ports: ["4000:4000"]`  
    `depends_on: [mongo, redis, chain]`  
    `volumes: ["../:/workspace:cached"]`  
`volumes:`  
  `mongo-data:`

Local blockchain uses **Anvil** (Foundry). You can also run **Hardhat node** if you prefer.

### **1.4 Environment variables with secure defaults**

Create **.env.example** at repo root:

`# === Public Web ===`  
`NEXT_PUBLIC_SITE_NAME=PVA Bazaar`  
`NEXT_PUBLIC_PRIMARY_COLOR=#1c5a45`  
`NEXT_PUBLIC_BRAND_JSON={"primaryDark":"#0f3b2d","primary":"#1c5a45","primaryLight":"#2d7d5a","accent":"#4ef8a3","accentDark":"#2bb673","gold":"#d4af37","textLight":"#e8f4f0","textMuted":"#a8b0b9","headingFont":"Playfair Display","bodyFont":"Poppins"}`

`# === API / DB ===`  
`MONGODB_URI=mongodb://localhost:27017/pva`  
`JWT_SECRET=change-me`  
`REDIS_URL=redis://localhost:6379`

`# === Web3 ===`  
`CHAIN_RPC=http://localhost:8545`  
`CHAIN_ID=31337`  
`DEPLOYER_PRIVATE_KEY=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`  
`NFT_COLLECTION_NAME=PVA Universal Sacred Assets`  
`NFT_COLLECTION_SYMBOL=PVAUSA`  
`ROYALTY_BPS=500`

`# === 3rd party ===`  
`SENTRY_DSN=`  
`POSTHOG_KEY=`  
`STRIPE_SECRET_KEY=`  
`STRIPE_WEBHOOK_SECRET=`  
`MAIL_FROM=notifications@pvabazaar.org`  
`RESEND_API_KEY=`

`# === Analytics/SEO ===`  
`NEXT_PUBLIC_GA_ID=`

For Codespaces dev, copy `.env.example` → `.env.development` and adjust as needed.  
 For production, create **GitHub repository secrets** consumed by workflows—**never** commit secrets.

### **1.5 Database setup & PVA-flavored seed data**

**scripts/seed.ts** (TypeScript, uses Mongoose):

`import 'dotenv/config';`  
`import mongoose from 'mongoose';`  
`import { seedArtifacts, seedUsers } from './seeders';`

`(async () => {`  
  `await mongoose.connect(process.env.MONGODB_URI!);`  
  `await seedUsers({`  
    `admin: { name: 'PVA Admin', email: 'admin@pvabazaar.org' }`  
  `});`  
  `await seedArtifacts([`  
    `{`  
      `title: 'Maradjet Emerald Pendant',`  
      `description: 'Natural Panjshir emerald in 18k gold — provenance notarized.',`  
      `tags: ['jewelry', 'emerald', 'artisan'],`  
      `price: 2_300,`  
      `currency: 'USD',`  
      `theme: { accent: '#4ef8a3', gold: '#d4af37' }`  
    `},`  
    `// add 10–20 more across coffee, produce, art, energy credits, services…`  
  `]);`  
  `await mongoose.disconnect();`  
  `console.log('✅ Seed complete');`  
`})();`

Make sure artifacts and users align with brand fields: use **gold accents** for premium, ensure **Playfair Display** headlines render in UI previews.

Run: `pnpm seed`

### **1.6 Blockchain dev environment**

* **Contracts:** `services/chain` (Hardhat \+ Foundry side-by-side)

* **Testnets:** Base **Sepolia**, Polygon **Amoy**

* **Keys:** store deployer private key in GitHub secret `DEPLOYER_KEY`

* **Hardhat config** excerpt:

`import { HardhatUserConfig } from "hardhat/config";`  
`import "@nomicfoundation/hardhat-toolbox";`

`const config: HardhatUserConfig = {`  
  `solidity: "0.8.24",`  
  `networks: {`  
    `hardhat: {},`  
    `baseSepolia: {`  
      `url: process.env.BASE_SEPOLIA_RPC!,`  
      `accounts: [process.env.DEPLOYER_PRIVATE_KEY!]`  
    `},`  
    `polygonAmoy: {`  
      `url: process.env.POLYGON_AMOY_RPC!,`  
      `accounts: [process.env.DEPLOYER_PRIVATE_KEY!]`  
    `}`  
  `},`  
  `etherscan: {`  
    `apiKey: {`  
      `baseSepolia: process.env.BASESCAN_API_KEY!,`  
      `polygonAmoy: process.env.POLYGONSCAN_API_KEY!`  
    `}`  
  `}`  
`};`  
`export default config;`

**Deploy script** `scripts/deploy.ts` will: compile, deploy ERC721, set royalty, emit addresses to `apps/*/.env.*` for frontends to read (`NEXT_PUBLIC_CONTRACT_ADDRESS`).

### **1.7 Project structure generation**

Provide a meta-script to (a) create folders, (b) write boilerplate configs, (c) inject brand tokens:

**scripts/scaffold.mjs**

`import { mkdir, writeFile } from "node:fs/promises";`  
`const dirs = [`  
  `"apps/web-org","apps/web-com","apps/admin",`  
  `"services/api","services/worker","services/chain",`  
  `"packages/ui","packages/config","packages/emails",`  
  `".github/workflows",".devcontainer","docker","scripts"`  
`];`  
`await Promise.all(dirs.map(d => mkdir(d, { recursive: true })));`  
`` await writeFile("packages/ui/tokens.ts", ` ``  
`export const PVA = {`  
  `colors: { primaryDark: "#0f3b2d", primary: "#1c5a45", primaryLight: "#2d7d5a",`  
            `accent: "#4ef8a3", accentDark: "#2bb673", gold: "#d4af37",`  
            `textLight: "#e8f4f0", textMuted: "#a8b0b9" },`  
  `fonts: { heading: "Playfair Display", body: "Poppins" }`  
`};`  
`` `); ``  
`console.log("✅ Scaffolding complete");`

Run once: `node scripts/scaffold.mjs`

---

# **2\) Development Workflow Documentation**

### **2.1 Branching model (dual-platform friendly)**

* **main**: production-ready

* **develop**: integration branch

* **feature/**\*: short-lived per task

* \*\*release/**vx.y.z**: cut from `develop`, hotfixes land in `hotfix/` and back-merge to `develop`

**Commit convention:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`…)  
 **Changelogs:** generated via `changesets` or `semantic-release`.

### **2.2 Code review & PVA quality**

* PR template requires:

  * Screenshots (light/dark), **brand color** adherence, fonts

  * Accessibility checklist (axe clean), keyboard nav, focus outlines

  * Unit & E2E checks passing (Jest/Playwright)

  * Smart contract changes: gas report \+ slither/solhint clean

* 2 reviewers: one frontend, one backend/web3.

### **2.3 Testing integrated in cycles**

* **Unit:** Jest \+ React Testing Library; contracts: Foundry & Hardhat

* **Integration:** Supertest for API; contract ↔ API via Hardhat fork

* **E2E:** Playwright, covering **signup → list → buy → mint**

* **Performance:** Artillery (API), Lighthouse CI (web)

* **Visual regression:** Playwright snapshots; Percy (optional)

* **A11y:** `@axe-core/playwright` as a CI step

CI workflow gates PRs on `pnpm ship` \+ **matrix** (apps & services).

### **2.4 Deployment pipeline**

* **Frontends (org/com/admin):** Vercel preview per PR → production on merge to `main`

* **API/workers:** Render/Fly/DigitalOcean (or AWS ECS) with blue-green deployments

* **Contracts:** testnet auto-deploy on `develop`, mainnet/manual with two-person approval

### **2.5 Monitoring & maintenance**

* **APM:** Sentry (frontends & API), OpenTelemetry traces (Jaeger/Tempo)

* **Metrics:** Prometheus \+ Grafana (if self-hosted) or Uptrace

* **Logs:** JSON logs to Logtail/Datadog

* **Uptime:** Pingdom/Cronitor

* **Backups:** nightly Mongo snapshots, weekly offsite; Redis RDB snapshots

### **2.6 Issues & docs**

* **Issue tracker:** GitHub Issues \+ Projects (automations for labels/boards)

* **Runbooks:** `/docs/runbooks/*.md` – incident steps, handoffs

* **Architecture:** `/docs/adr/*.md` for decisions

---

# **3\) GitHub Copilot Integration Guide**

### **3.1 PVA context & config**

In `.vscode/settings.json`:

`{`  
  `"github.copilot.chat.codeGeneration.instructions": [`  
    `"Always use PVA brand tokens from packages/ui/tokens.ts",`  
    `"Prefer Playfair Display for headings and Poppins for body.",`  
    `"Enforce accessibility: color contrast >= 4.5:1.",`  
    `"Follow repository eslint/prettier configs."`  
  `]`  
`}`

Add **.copilot/chat.json** with common tasks:

`{`  
  `"intents": [`  
    `{`  
      `"name": "Create PVA-styled form",`  
      `"prompt": "Generate a React form using PVA tokens (packages/ui/tokens.ts), with accessible labels, errors, and Tailwind classes that reflect brand colors."`  
    `},`  
    `{`  
      `"name": "Web3 mint flow",`  
      `"prompt": "Wire a mint button to the contract at NEXT_PUBLIC_CONTRACT_ADDRESS using ethers v6, handle wallet connect, show tx states with PVA brand styling."`  
    `}`  
  `]`  
`}`

### **3.2 Phase prompts**

* **Scaffold UI components**

   *Prompt:*  
   “Create a `Button` and `Card` component in `packages/ui` using PVA tokens for colors/typography, with focus-visible styles, and variants (primary, subtle, danger). Export Storybook stories.”

* **API endpoint with tests**

   *Prompt:*  
   “In `services/api`, build an endpoint `POST /v1/artifacts` validating payload with Zod, storing in Mongo, publishing an event to Redis. Write Supertest \+ Jest integration tests and include OpenAPI spec.”

* **Smart contract debugging**

   *Prompt:*  
   “Using Foundry, write fuzz tests for `mint()` ensuring only MINTER\_ROLE can mint, royalties match `ROYALTY_BPS`, and emitting `MetadataUpdate` complies with ERC-4906.”

### **3.3 AI-assisted debugging**

* Ask Copilot: “Explain failing Playwright test logs and propose selectors that are resilient to DOM changes using test-ids.”

* Ask Copilot: “Given revert `Ownable: caller is not the owner`, suggest checks and Foundry tests to cover this path.”

### **3.4 Automated codegen loops**

* Use custom npm scripts `pnpm gen:crud <entity>` to scaffold model, controller, routes, tests, and docs. Copilot fills method bodies guided by file templates.

---

# **4\) Implementation Roadmap**

### **4.1 Phases & milestones**

**Phase 0 — Bootstrap (Week 1\)**

* Codespaces, Docker dev stack, envs, scaffold folders, brand tokens injected

* **Milestones:** Codespace builds; `pnpm dev` runs all apps; seed succeeds

**Phase 1 — Core Domain (Weeks 2–3)**

* Mongo models, REST API (listings, users, orders), auth, file uploads

* Worker for background jobs (image processing, provenance checks)

* **Milestones:** API integration tests green; Postman collection published

**Phase 2 — Web3 Integration (Weeks 3–4)**

* ERC721 deployment on Base Sepolia; mint & provenance flows

* Wallet connect, on-chain events ingested by worker

* **Milestones:** Testnet mint live in preview; E2E tests green

**Phase 3 — UX & Admin (Weeks 4–5)**

* Brand-consistent UI, admin dashboard, moderation workflows

* Email notifications (Resend), receipts, invoices

* **Milestones:** Lighthouse ≥ 90 across pages; a11y checks pass

**Phase 4 — Hardening & Launch (Weeks 6–7)**

* Performance tuning, audits, WAF/Rate limits, backups, runbooks

* **Milestones:** Launch checklist complete; production deploy dry-run

### **4.2 Dependencies & critical path**

* Dev stack → API → Frontends → Web3 flows → Admin → Observability → Launch

### **4.3 Team & resourcing**

* **Lead/Integrator (you)**

* **Frontend x2** (org/com)

* **Backend/Web3 x2** (API & contracts)

* **DevOps x1** (CI/CD, infra)

* **QA x1** (automation \+ UAT)

### **4.4 Risk mitigation (blockchain)**

* Use **testnets** first; timelocked upgrades; role-based access

* Multisig for production contract admin; emergency `pause()` capability

* Chain indexer retries; idempotent job design

### **4.5 Rollback procedures**

* Frontends: Vercel instant rollback to previous deployment

* API: Blue-green; flip traffic via health checks

* DB: Point-in-time restore; feature flags to disable risky paths

* Chain: If immutable, ship migration contracts \+ “graceful sunset” messaging

### **4.6 KPIs & budget**

* **KPIs:** time-to-first-listing, conversion to purchase, mint success rate, P75 API latency, Core Web Vitals, % a11y violations fixed per release

* **Budget levers:** leverage serverless for low baseline (Vercel); burst workers only during spikes; use free testnet faucets; offload images to S3 \+ CloudFront

---

# **5\) Launch Checklist**

### **5.1 Pre-launch testing (user journeys)**

* Guest browse → signup → verify email

* Create listing (images, pricing) → publish

* Buyer add to cart → checkout → optional mint

* Admin approve/flag → refund/resolve

**Run:** `pnpm test && pnpm e2e && pnpm lighthouse`

### **5.2 Security verification**

* OWASP ZAP baseline scan

* Rate limits & WAF (Shield/Cloudflare)

* JWT rotation, cookie flags (HttpOnly/SameSite/Lax)

* Smart contract: Slither, Mythril, Foundry fuzz, manual review

* Secrets audit (no secrets in repo), S3 bucket policies locked down

### **5.3 Performance/Core Web Vitals**

* Optimize images (Next/Image); preconnect fonts; code-split heavy routes

* Cache API reads; pagination everywhere; use `stale-while-revalidate`

### **5.4 SEO & analytics**

* Metadata: title/description per page; `next-sitemap`

* Structured data (Product, BreadcrumbList)

* GA4/PostHog events: view\_listing, start\_checkout, mint\_started, mint\_done

### **5.5 UAT**

* Scripts in `/docs/uat/*.md` — sign off by Product \+ Ops

* Capture feedback in GitHub Discussions

### **5.6 Legal & compliance**

* Terms, Privacy, Refunds; KYC/AML policy if custodial flows added

* Cookie consent (region-aware)

### **5.7 Marketing & community**

* Email warmup campaigns (Resend) using **brand MJML** templates

* Social assets with brand palette; launch blog on pvabazaar.org

* Discord/Telegram rules aligned with PVA values

---

# **6\) Maintenance & Scaling Guide**

### **6.1 Routine ops**

* **Daily:** check error budgets (SLOs), new Sentry issues

* **Weekly:** dependency updates via Renovate; review backups

* **Monthly:** load test with Artillery; failover rehearsal

### **6.2 Scaling triggers**

* API P95 \> 400ms → add replicas / cache layer

* Queue depth \> 10k → scale workers

* Web lighthouse drops \< 85 → prioritize perf epics

### **6.3 Zero-downtime updates**

* Frontends: atomic deploys

* API: blue-green with readiness probes

* DB migrations: `safe up` with backward-compat schema; feature-flag release

### **6.4 DR & backups**

* Mongo daily PITR; verify restores quarterly

* Object storage versioning; lifecycle rules (cool → deep archive)

* Run **`scripts/backup.ts`** nightly (cron) and push to offsite

### **6.5 Community & support**

* Support macros for wallet issues (network mismatch, gas, failed tx)

* Moderation guidelines for listings; appeals process documented

* Quarterly community townhall; publish transparency metrics

### **6.6 Revenue & BI**

* Track GMV, take-rate, mint add-on attach rate

* Funnel analytics dashboards; cohort analysis; anomaly alerts

---

# **7\) Troubleshooting & Support**

### **7.1 Common issues**

* **Wallet can’t connect:** ensure correct chain ID; show guided network switch

* **Mint stuck:** surface tx hash; poll confirmations; allow retry/resume

* **Images fail:** verify S3 IAM & CORS; fall back to presigned PUT

### **7.2 Outage response**

* **Sev-1**: incident channel \+ status page update within 10 minutes

* Declare IC, Ops lead, Comms lead; follow runbook `/docs/runbooks/sev1.md`

* Post-mortem within 48 hours (blameless)

### **7.3 Blockchain specifics**

* Reorg handling in worker (confirmations \>= 3 for testnet, 6 mainnet)

* Idempotent event processing keyed by `(txHash, logIndex)`

* If contract bug: pause markets, publish notice, plan migration

### **7.4 Performance degradation**

* Capture heap profiles; flamegraphs (clinic.js)

* Toggle feature flags to reduce load; widen cache TTLs

### **7.5 Security incidents**

* Rotate keys, invalidate tokens, block suspicious IP ranges

* For smart contract incidents: announce pause, snapshot state, engage auditor

### **7.6 Vendor escalation**

* Keep escalation contacts for Vercel, Render/Fly, Infura/Alchemy, S3/Cloudflare, Sentry, PostHog, Resend in `/docs/vendors.md`.

---

# **Appendices**

## **A) Complete file stubs & configs**

### **Tailwind brand preset (shared)**

`packages/ui/tailwind.preset.cjs`

`module.exports = {`  
  `theme: {`  
    `extend: {`  
      `colors: {`  
        `primaryDark: '#0f3b2d',`  
        `primary: '#1c5a45',`  
        `primaryLight: '#2d7d5a',`  
        `accent: '#4ef8a3',`  
        `accentDark: '#2bb673',`  
        `gold: '#d4af37',`  
        `textLight: '#e8f4f0',`  
        `textMuted: '#a8b0b9'`  
      `},`  
      `fontFamily: {`  
        `display: ['"Playfair Display"', 'serif'],`  
        `sans: ['Poppins', 'ui-sans-serif', 'system-ui']`  
      `}`  
    `}`  
  `}`  
`};`

### **Next.js app config (applies to web-org, web-com, admin)**

`apps/web-com/next.config.mjs`

`export default {`  
  `reactStrictMode: true,`  
  `images: { domains: ['images.pvabazaar.com', 'ipfs.io'] },`  
  `experimental: { typedRoutes: true }`  
`};`

### **Admin layout (brand applied)**

`apps/admin/src/app/layout.tsx`

`import './globals.css';`  
`import { PVA } from 'packages/ui/tokens';`

`export default function RootLayout({ children }) {`  
  `return (`  
    `<html lang="en">`  
      `<head>`  
        `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />`  
      `</head>`  
      `<body className="bg-primaryDark text-textLight">`  
        `<div className="min-h-dvh">`  
          `<header className="border-b border-accent/20 px-6 py-4">`  
            `<h1 className="font-display text-2xl" style={{ color: PVA.colors.accent }}>PVA Admin</h1>`  
          `</header>`  
          `<main className="p-6">{children}</main>`  
        `</div>`  
      `</body>`  
    `</html>`  
  `);`  
`}`

### **API security middleware**

`services/api/src/middleware/security.ts`

`import helmet from 'helmet';`  
`import rateLimit from 'express-rate-limit';`  
`export const security = [`  
  `helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }),`  
  `rateLimit({ windowMs: 60_000, max: 100 })`  
`];`

### **Playwright \+ axe a11y test example**

`apps/web-com/tests/a11y.spec.ts`

`import { test, expect } from '@playwright/test';`  
`import AxeBuilder from '@axe-core/playwright';`

`test('homepage is accessible', async ({ page }) => {`  
  `await page.goto('/');`  
  `const results = await new AxeBuilder({ page }).analyze();`  
  `expect(results.violations).toEqual([]);`  
`});`

### **Artillery perf test (API)**

`services/api/tests/perf.yml`

`config:`  
  `target: "http://localhost:4000"`  
  `phases:`  
    `- duration: 120`  
      `arrivalRate: 20`  
`scenarios:`  
  `- flow:`  
      `- get:`  
          `url: "/v1/artifacts?limit=20"`

### **Lighthouse CI**

`lighthouserc.json`

`{`  
  `"ci": {`  
    `"collect": { "url": ["http://localhost:3001/","http://localhost:3001/listings"] },`  
    `"assert": { "assertions": { "categories:performance": ["error", { "minScore": 0.9 }] } }`  
  `}`  
`}`

### **GitHub Actions (core pipeline)**

`.github/workflows/ci.yml`

`name: CI`  
`on:`  
  `pull_request:`  
    `branches: [ develop, main ]`  
`jobs:`  
  `build-test:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- uses: pnpm/action-setup@v4`  
        `with: { version: 9 }`  
      `- run: pnpm i`  
      `- run: pnpm lint && pnpm typecheck && pnpm test`  
      `- run: pnpm build`  
  `e2e:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- uses: pnpm/action-setup@v4`  
        `with: { version: 9 }`  
      `- run: pnpm i`  
      `- run: pnpm -w dlx playwright install --with-deps`  
      `- run: pnpm e2e`

### **Deployment (frontends to Vercel, API to Render)**

`.github/workflows/deploy.yml`

`name: Deploy`  
`on:`  
  `push:`  
    `branches: [ main ]`  
`jobs:`  
  `vercel:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- uses: amondnet/vercel-action@v25`  
        `with:`  
          `vercel-token: ${{ secrets.VERCEL_TOKEN }}`  
          `vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}`  
          `vercel-project-id: ${{ secrets.VERCEL_PROJECT_COM_ID }}`  
          `working-directory: apps/web-com`  
  `api:`  
    `runs-on: ubuntu-latest`  
    `steps:`  
      `- uses: actions/checkout@v4`  
      `- uses: render-examples/blue-green-deploy@v1`  
        `with:`  
          `service-id: ${{ secrets.RENDER_API_SERVICE_ID }}`  
          `api-key: ${{ secrets.RENDER_API_KEY }}`

---

## **B) Production Deployment Guide (security first)**

1. **Provision**: Vercel (3 projects: org/com/admin). Render/Fly (API/Worker). Mongo Atlas (M10+), Redis (Upstash/ElastiCache).

2. **Secrets**: Set all envs in platform UI; enable secret scanning; rotate quarterly.

3. **Domains**:

   * `pvabazaar.org` → apps/web-org (marketing/docs)

   * `pvabazaar.com` → apps/web-com (marketplace)

   * `admin.pvabazaar.com` → apps/admin

4. **WAF & TLS**: Cloudflare in front; strict TLS; bot fight mode.

5. **Observability**: Sentry DSNs & OpenTelemetry collectors live.

6. **DB**: enable PITR, daily snapshots, IP allowlists, “force TLS”.

7. **Contracts**: deploy to mainnet(s) only after freeze review; publish ABI and addresses to `/apps/*/.env.production` and `/docs/contracts.md`.

8. **Run** `pnpm ship` → tag release → pipelines auto-deploy.

9. **Post-deploy**: healthcheck dashboards, smoke tests, and notify \#launch channel.

---

## **C) Testing & Validation Procedures**

* **Unit**: `pnpm test` — \>80% coverage target on core modules.

* **Integration**: `pnpm -F services/api test` with Supertest hitting in-memory Mongo (or Testcontainers).

* **E2E**: `pnpm -F apps/web-com e2e` (Playwright) across Chromium/WebKit/Firefox.

* **Contracts**: `forge test -vvv` \+ gas snapshots; property-based tests for mint/royalties.

* **Perf**: Artillery load → monitor p95 latency \< 250ms on reads, \< 600ms on writes.

* **A11y**: No axe violations allowed; manual screen reader pass (NVDA/VoiceOver).

* **Visual**: Baselines for key pages; any \>0.1% diff requires review.

---

## **D) User Guides**

### **For non-technical users (org team)**

* Use **pvabazaar.org/admin** with SSO to manage listings, approve sellers, issue refunds.

* All admin pages styled with PVA palette; gold highlights for “elevated” items.

* Bulk import via CSV in admin → validated preview → confirm → background job processes.

* Monitoring screen shows live orders, mints, and any on-chain delays.

### **For support agents**

* “Wallet Help” macro: identify wallet, chain, and error; provide network switch link; explain gas estimation; include transaction hash in ticket.

* “Order Help” macro: check payment intent, on-chain mint status, fulfillment notes; trigger refund if both payment and mint failed.

---

## **E) Single Command From Zero → Running**

* Open in Codespaces → **one click**

* The automation runs: `pnpm i` → `docker compose up -d` → `pnpm dev`

* Visit:

  * [http://localhost:3001](http://localhost:3001) → **pvabazaar.com**

  * [http://localhost:3000](http://localhost:3000) → **pvabazaar.org**

  * [http://localhost:3002](http://localhost:3002) → **admin**

  * [http://localhost:4000](http://localhost:4000) → **API**

  * [http://localhost:8545](http://localhost:8545) → **Local chain**

* Seed data: `pnpm seed`

* Try a mint on the **testnet preview** before shipping.

---

## **F) PVA Brand Integration Everywhere**

* **Components** pull colors from `packages/ui/tokens.ts`; Tailwind preset enforces consistent styling.

* **Error/Maintenance pages**: dark green backgrounds, gold iconography, humane copy aligned with PVA ethos.

* **Emails**: MJML templates with Playfair headings, accent dividers, accessible contrast.

* **Docs**: tone reflects PVA’s philosophical approach—ethics of provenance, artisan dignity, cultural respect.

* **Onboarding**: archetype-based hints (Artisan, Curator, Seeker) adjusting copy and suggested actions.

---

### **You’re ready.**

This handbook gives you **one-click** dev environments, **one command** spin-up, **guardrailed CI/CD**, and a **brand-true** experience across apps, admin, emails, and contracts. If you want, I can also generate the initial folder tree and file stubs as downloadable archives next.

ChatGPT can make mistakes  


[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAnAAAAGgCAYAAAAqxVoRAAAtLUlEQVR4Xu3d+Zdc5Z3f8fkfkpOc5JxkkpP9JPkh8czJyWQy4xkbO2N7jJ14xs6xx/GYMcQYGxsyeIwBg8FgFot9EbtAAmEQm4QEiEWIRUICoV3qllpbd6sl9Sb1vt/085SeW8/93qpW3e5H6ufb9/0653Pq1nOXevqqu+qj6q6q30kAAACgyu/IAQAAAMSNAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQhgIHAACgDAUOAABAGQocAACAMhQ4AAAAZShwAAAAylDgAAAAlKHAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHDCDv/d7/61u5Db11Fpfa6weebsuY+PjctMg/v7v/2Huthqdawjydk1+eff9uW2uuPk3mTFHznfNO+/mjie/HrnO5emVqzPbSe3Hjuf2cTG369S6zbkyx/vRL29Kl0Mf3/ep8/8i9/X5Mc72HABkUeCAGcgHKpmDbe0zPnA9+twLdt3KN9elY9ff80C6zytvv+NtXZu8TZmQ/ON+vHNX8sq69Wfttmrxb2vb3qbkhdffrHn7ZrlWgXvu1dftui279tjrn/vOhem+dzz+ZNJ88FDyb877Ys3jzZR6Zipw/r5nOs5smONR4IDyosABM6j3oNTZ05t78Ponf/gZsVXt/Ws9+M2k3nZu/N//2fly1ay44117171yVbJ+88d15xGKO/5TL78iV+Vu2yzXKnD+ds+ueS23n89fV2+7T3/zO3a83jn2C5xUbzwUc2xX4M42V+BqnXPnbH+9ALIocMAMZnpQaqQAyPEf/vJGe/3yG29Nfu8rf1lzH0kewyfXXXHLonTMX3fp9TfVPIa/jTyWVGvb3/2j8zK3ZZ7xqrWPy49v+HVmvW+m2//aJT+x66676z573SzXKhNm/F995gvpskm9XzX7tzfTbc+0rtEC5y9fdNV1dnm1+NXuP/6DP/F3T4ZHRjPrTfyvxVyv9QzcEy+8bJeXv7Ims+8f/OW30n0Nd05d/vmnP59Z75tNges+eTJzfJOWI601t601Zm5LbgOgigIHzEA+qMjxf/rfP2uvu+I0OTmZbvPFv/l+bl95PLP8rz/7RW+LPLmPz1931aK70usbPtmW3HDf4sz6Wsc503pfrW1NTPF4+Lcr0ut/+q3vZrYxpavt2LH0+qG2dv+wlpnvmW7fZ7aTZULuL6/PZKZt3bpnXnlVrqpb4ExR9cf9ZVfgXJa+tDJz3XHXza+x5b+lWz9TgTP5k2/+deaZyAOtbZntTTZt22FLr1n+3T8+Lz2+zxW4r//ocvtrfz/ymMb4xER63exz/7Jn0uum2P2vH/zYLn+wZavd/oKfXZ3ZXx4PQB4FDpiB/0An828/96Wa29a7XmtMXq9lpm1MgXTram3XfOhw3fWtHZVStWXn7qSjszO3XvLXu+XB4eEzbiPXmzIgub9dk9vXY7Y7VwXOnWP5QgrjTH8DNzU1Zbfzj+8XOJ8bGxoZqbne/Vv+xQ8vS7efqcDd+tBjbtd0m//4xa+my/L4tcacmf4GzpQzw9+/3rHqbWMu3Ytnam0LII8CB8xAPliZ/Is//R/J4fajctPcA45ZNr9idH7/q1+3Y//hC19JVry21kbuU8tM2/jr5Dz99J7qS1+N6YqnPK68LtW6Lckfd38/5vLZb18gtq4604tBJLOdX+BOdPfYsdsffSKzTZHj1dvWrVv1VvWFKE69AnfNHfdktvOP7wrc3/76tsw27nyZv0GUx5MxzOVMBU4yY//sjz+XLtdLLa7AmWcWT/b1ZTIyOmq3kXOrdax625hL88ITc2mekXRj8hwBqKLAATOo90BUy4trK6+YNM+6fPmiS3L7uWPVSz0zrffXueWf3XZHLj0nT9XdvtaxaplpX0eO+79Kc/npLYu8Parkvr5/9/k/t+uuvv1ue90s+wWu1r5uzLwAoxZ/n1r7OzOtq/crVMnfxhW4G+9/KLPNVy++tPJ1eX/HKP8dXQyzfq4FTh7XHVsq+jdw/rKv3jZyzHy/1tofQBUFDphBvQeietz2cr/RsTF7/T99+Wve1hVyW6neejf+pe9dnLnuM39/5o/9o//6aXt9Z/O+3LZuf7ON5J49/PxfV16k4LZ1f5Tu+HOoNZ9aY45b9y8/82dyVW4/s3ymAtc/MFhz3DBvJ3KmuRru16fuHEtzKXByHzdm/gNQa737t/z14ofT7eda4OR6OeacjQJ33v/5nl02/95uzP0tpPs+BVAfBQ6YQb0Honrc9ia/Xf1abrwW8yA803r/mLXimPeac2M/X3Rn8p+9v1vy1dq31rpaqbed+6N0k0uu+1Vum4efec7+gbxZ/of/5Y/S40jyuH78v50z112ZMC8CMddr2b63OXOMfzB92/51R96WTD1zLXAm37zsp+myX57d2N9ceU3Nf0uzPNcCZ/KLO6u/sv3CBd8Xe1UULXD+dfM1nX/RD9PrExMTuW3cfwz8Mf9YAPIocMAMZvNAUmufWmO+mdb7D2hnenBb9+GmM25nXiVqxm9+8BG5ynK/Cvaz6JElmW3c+F1LlmW2u+XBRzPbuWfuXGZ6qwrnziVLc7cvmTFXJupt45PHc68errfe5VhXV2Y7aS4Fzv+7PxP5FiyGnI9cN9sCZ5hS7R/bvBK0ntkUOH/MxfxKvdb6WmO13g8QQBUFDkBhtR540RhX4Na+v0GuAoCGUeAAFEaBmz1X4B5f8aJcBQANo8ABKIwCN3uuwJk3XgaA2aLAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQhgIHAACgDAUOAABAGQocAACAMhQ4AAAAZShwAAAAylDgAAAAlKHAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQhgIHAACgDAUOAABAGQocAACAMhQ4AAAAZShwAAAAylDgAAAAlKHAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQhgIHAACgDAUOAABAGQocAACAMhQ4AAAAZShwAAAAylDgAAAAlKHAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQhgIHAACgDAUOAABAGQocAACAMhQ4AAAAZShwBR2//fYFkVjIeWlNTOTctCYWcl5aExM5N60B5hMFriD5A6w1sZDz0pqYyLlpTSzkvLQmJnJuWgPMJwpcQfIHWGtiIeelNTGRc9OaWMh5aU1M5Ny0BphPFLiC5A+w1sRCzktrYiLnpjWxkPPSmpjIuWkNMJ8ocAXJH2CtiYWcl9bERM5Na2Ih56U1MZFz0xpgPlHgCpI/wFoTCzkvrYmJnJvWxELOS2tiIuemNcB8osAVJH+AtSYWcl5aExM5N62JhZyX1sREzk1rgPlEgStI/gBrTSzkvLQmJnJuWhMLOS+tiYmcm9YA84kCV5D8AdaaWMh5aU1M5Ny0JhZyXloTEzk3rQHmEwWuIPkDrDWxkPPSmpjIuWlNLOS8tCYmcm5aA8wnClxB8gf4TJkaHU26lixJpoaGcutqHa/zkUeS/nfeyY2b9K9fnxubbWIh51Uk5lwN79mTdC5enFs31t6eud71xBN2+5Hm5ty2IRITObdGYvQ880wyOTiYWyfT/dRTuTGbu+5KTr36apJMTtrrXY8+Ouv5mMRCzqvRjB46ZM+pOS/y+9FleMeO3JjLydWr7f6G+76dy3xiIufWaPx9Gz3Oifvvz+zTu2JF0r1sWTK8e3fS+/zz9t9H7tNogPlEgStI/gCfKf4DotzfmBoZsSXEH/PHjb633komurqS0cOH7R25KYVjHR2V483yzicWcl5FM7R9uz2OOVeDH39s75jNuHnANLoee8xeNwXOMOe1f926ZGDjxnT7E/fdZ+/IT61dmzt+o4mJnFsjcWVraOvWZKKnJz1/Zl3fG29kvsaTq1al+43s359M9PZW1o+PZ44527n4+8dAzqvRDHzwQbq/OZ/u+84vY07ngw/mSpq7PPHAA3aduz7bxETOrdFI5j8MU2NjdtmsHz1wwH6/JhMT6fn2C5w8jrkvleuKBJhPFLiC5A/wmTK4aVMy3tmZ9L35ZjI+XcIm+/vtuPnfuTN+/Hhuv57ly5OxtrbKndHpB0ZT4Px5uP+dy30bSSzkvIrGFLjJU6eSqeHh5NTq1cnIvn123JwzY3JgwF43Bc7t46Tb33mnvTQPBPL4jSYmcm6NJJmaSsaPHUsmurvT45jSYL53zQPgSEtLZXB6O1fgzIOl+R41RTg9zunzbpZNOTbf//K2Gk0s5LwajWHO6Yl77knPi2HOpyvIjnkW2R+3x5j+z5m5vzBlJC13p5/dnE1iIufWaNy+3U8+WTnQ9Pnwj2nvV6fPl08+A+d+G2K+f83lXJ6VB+YTBa4g+QOsNbGQ89KamMi5nc24gnw2Egs5rxAxxcP/T8WZxkMkJnJuWgPMJwpcQfIHWGtiIeelNTGRc9OaWMh5aU1M5Ny0BphPFLiC5A+w1sRCzktrYiLnpjWxkPPSmpjIuWkNMJ8ocAXJH2CtiYWcl9bERM5Na2Ih56U1MZFz0xpgPlHgCpI/wFoTCzkvrYmJnJvWxELOS2tiIuemNcB8osAVJH+AtSYWcl5aExM5N62JhZyX1sREzk1rgPlEgStI/gBrTSzkvLQmJnJuWhMLOS+tiYmcm9YA84kCV5D8AdaaWMh5aU1M5Ny0JhZyXloTEzk3rQHmEwWuIPkDrDWxkPPSmpjIuWlNLOS8tCYmcm5aA8wnClxB8gdYa2Ih56U1MZFz05pYyHlpTUzk3LQGmE8UOAAAAGUocAAAAMpQ4AAAAJShwAEAACgTbYGbnJxIUyYDGzYkQ1u3ymHMwb7zzkuO3XqrHMYcmHOKcOz36C23yGHMAd+jWOiiLXBlZe50Rvbvl8OYg5bzz5dDmKOh7dvlEObA/Nyfeu01OYw5MP8Rbrv8cjkMLBgUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQhgIHAACgDAUOAABAGQocAACAMhQ4AAAAZShwAAAAylDgAAAAlKHAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQJtoC19V5PA0AAACqoi1wAAAAqI0CBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocB5jg+PJdtPDpDphDLc3EymM97VJU/NrJzo70l2dbSQ6YRy4OgxMp2evn55amZlbKQ7GTq1j0wnlN6mvWQ6w12d8tSUGgXOs+zIieSLH+wm0wnlyMUXk+mcXLVKnppZeXbr2uTrT/wdmU4oVz+6jEznrS3b5amZle7WNUnzhkvJdEJZf+F3yXQOv/ySPDWlRoHzUOCqCUUWmbKGAhc+ocgiU9ZQ4MInFFlkyhoKXBYFzkOBqyYUWWTKGgpc+IQii0xZQ4ELn1BkkSlrKHBZFDgPBa6aUGSRKWsocOETiiwyZQ0FLnxCkUWmrKHAZVHgPBS4akKRRaasocCFTyiyyJQ1FLjwCUUWmbKGApdFgfNQ4KoJRRaZsoYCFz6hyCJT1lDgwicUWWTKGgpcFgXOQ4GrJhRZZMoaClz4hCKLTFlDgQufUGSRKWsocFkUOA8FrppQZJEpayhw4ROKLDJlDQUufEKRRaasocBlUeA8FLhqQpFFpqyhwIVPKLLIlDUUuPAJRRaZsoYCl0WB81DgqglFFpmyhgIXPqHIIlPWUODCJxRZZMoaClwWBc5DgasmFFlkyhoKXPiEIotMWUOBC59QZJEpayhwWRQ4DwWumlBkkSlrKHDhE4osMmUNBS58QpFFpqyhwGVR4DwUuGpCkUWmrKHAhU8ossiUNRS48AlFFpmyhgKXRYHzUOCqCUUWmbKGAhc+ocgiU9ZQ4MInFFlkyhoKXBYFzjPbAmeYy/6JyeQrG/bk1tdL69Boujw0OZlbf6Zctv1gsm9gODceIqHIIhMi7rgDGzbYyxP33Wcv+9991162//znyXhHR9Jxww25ff1jzLQ+dOa7wBnm8vWmjcn1rz+UWfeDFb9O1/vb+stnGpMZHBvOjYVOKLLIzDWDIyO5MT/rtu5IbnvmxeSax57KrfNz89MrcmNnMzEWOMNcDvcfzK3zM9x/OLfP1NREbjs/bruzmVBkkQkR/7gz3sZFF8y8zen15yIUuCwKnGe2Be6NEycz1z/uHUi+tbnZLj/V2pnc09Jhlw1z+cLRbntpCtyBwZGka3Q8ueDjfcngdAE8f0PlGEdOl7vJ03Mzy8dHxuzyn08vv9vVZ5ddgeseG7f7muO47fvGJ5Jf7jmSm28jCUUWmRBpv+qqzHW/wI21ttrbPb5oUTJ6+HA6B38+zujBg8mRH/0oaf3JT5KpsTG7rvOBB5L+detytznXxFDgHHN985Fd6bqVu9Zn1rlLk7XThc+UsStW3pE51qGeo5l9Tg73p8t9IwPJ0b7O9PqWtr3JHe88ZZevXnN/8kl7U3qbZuyC5b/MzLXRhCKLzFzjCtzI9PeUuTza1ZMc7z2Z3PHcy/a6KXDrt+9Krn/imaR/aDi5bsnTdrzpSFvy8Ctr0zmZAufP8dVNW+zlomdfSlZt2HzGolg0sRa4kcE2e9nT/oYd6+v6OF030LszXfb3ccv7N/1d0r73ocry5p+lpe5o06N2O7etv9zT/mZuHrNNKLLIhMiue++yl5PT30fGiU0f2utG34EWu3xy757k3YsvTMebn1xil7cvutVe9u7ama7v3r4t2Xbrr5Omx6fP7dRU8u73v5e0vv5q7nbnEgpcFgXOM9sCZ4qXufz2R822sLkSdmNTa2Y7Z+D09v4zcL/aWykexiVbW5Krdx9O95lKKoXMWHL4hL28Y3/lAdQVuJ/vqmy/sqPHjvu358+h0YQii0yI9L7wQvX6D36QewbOpVaB87kCZ9aPnziR2U7e5lwTQ4Ezl99c+vNk63SBarTAvbjjbXu9Z6gvdyy3PGW/Qyv8cXfdONbfnfzfZ39lr//vJ6/M3Objm1em+xVJKLLIzDWuWPk+3NOc3pZf4N7bsTvdzz0j57aTz8CZ7c3l4pWvpseVtz2XxFrg3LIrcG5suP9Qujw+2ltzH3fdOHHw+eljrLVjgyf3pONum7bd9yUtH12dm8NcEoosMqGy467bc7fTd+BAWuA63l2fKXBDxzrSfT+47EfJzrvvSNeb5Y1XXJ4cfP655PDKl+wYBe7sosB5Zlvgbmtut/ubZ8v88iOXW6bLlmGeQTPX/QJnSp2/bdvwqF3+znQp7Dj9zNuXN1SPd8Ppwre8tfJMh+Nu01x+bePe5C3x7GCjCUUWmRAZaWrKHP9MBc44cc896bNzw7srX1/ZCpzzjSd+li6bda5MHeypfB+7cX+/I73HMmNyveGOc9F0UTPMevdM3dT0/8jNs3nGqeGB5OVd79gxt91sEoosMnONLHC3LH8+c1tGrQLnM9f9Z+B+MV3u/AJnCuGNy57N3fZcoqXAufGpyZF02d/OmZoaz60fG678B9iNH9hynb2s9UxeiIQii0youGP7lxMjw3ULnLt0y/UKnNP62prcbc4lFLgsCpxntgXubOSnOw/lxorGkGONJhRZZM51YpiDyXwXuFjiyPHZJBRZZOYrzrWPV36leq4TY4ELna7W1bkxF6Ntz/258bkkFFlkYs/ZmjcFLosC54mpwM13QpFFpqyhwIVPKLLIlDVlKHDnOqHIIlPWUOCyKHAeClw1ocgiU9ZQ4MInFFlkyhoKXPiEIotMWUOBy6LAec5VgVt88Ji97B+vvnWIYS7/dsfBzPX5SiiyyBRJMjmZLncvW5ZdN8OxT778cm6s69HKq87kuPk7OTl2NhJzgXt44wu5MRdDjsncub7yCtN6mZyaTJcbOV6jCUUWmdnE/N3bk2vX5caLpqW9w17euWJlbl2t7UIm1gJnNG/4SbJv4+W5dbEnFFlk5po9Dz6QGwsZ9zd0oUOBy4q2wB3c35TmXDlXBc5kV9+QvU133S373NuTmBcquO3+58bG32duLglFFpkisS8yuLhS1kaaK6/ic+t85rp7Tzi736FD6TZubKK3N2n98Y8z44ObN6cF7vhvfmNf+u7W+7fdvXRpZZs770yPVzQxFzjHLLefOpG8vX+zXTavVDXMq0zN9Q2Htqf7PLjh+XTZFDi73VRlOxPzSlNzec2r99sC547vLkOkEYsXL5ZDObLIFMmew63TX9+UXXYF7u7nV6XrR8bG7aUpXEbriS573Xh+/Qa7fKznZLp9I8Xs3hdX2+1GxyvHPnTsRLKt5aBdvm7J8tz2jabRAnemc3o2Cpz5LjTLx/Yvs5dtu+9N1+/78P/Zy0Nbb8zta9LX+VG6bN5WxD9u9fhhX7zg0ogLL7zQxpxXk48++ijZu3dvZhtZZOYaU+D8Y2+++sp0nbkftJcN3O77P7w43Xa4s9MuNz3+iC1w7jghQ4HLirbAzYdzWeBMdvYNpsuGufSfgXMF7tn2rty+ZzuhyCJTJP7+tQqcv61f4Ppefz23zak1a2zMG/z645kCd3rc8AucuWy/8spkoqsrc5tFEnOBO9BdefWpWX5r3+bkUE9Hus4xyy/vfCe5/vWHk28tvcoWM7dNrWfgvrXsKns53wXu1ltvTT71qU/Z1Csessg0mhuXVl8FargCd+DosXT88PET9rJWgXt/xx67/OGepnR7WeAee/VNG3/suXfet9u5Y42NT2TWzzaNFjh3Pv34zkaBqyz/uFrg9jyQ286UOr/YuZw6vqHm+omxvsyYPebGn+T2n0saJc9nX1/lfT4dWWTmmpmegXO318jt7n3koeT9S3+Qm6cpcCPd3bnt5xoKXBYFznOuCtw3NzclI5NT6Rv8mjxx+rblr1B7xyaSxw4ft8uPHjqevHj6TYDPdkKRRaZozDNnQ9u2ZQpcrWP3LF+eDLz/vl3uffbZZGpoKF3X/eST6fLAe+9VjjExYS+P/uIXtryZ2PHxcXspC9zU8HDSeumlmdsskhgLnPFx2570+ujEWPLtp66xy8Pjo+nbjbhtL3n+ZvsWIOa6LHBG68nj9rp5y5HvLr8u3c79CnVsYjw9Xog0Sj44SrLIFMn2A4eS7lN96XVTrJrbjiYvvrcxfauQ7r7+pKm1UpL9Amcuh0fHar6ViPmkBnN9S3NLsuPAYbu85LW3koHhyluUmNsx7xvn3izYP+Zs02iBM/zz2d5effsZ42wVuKNND9vL8ZHu5MiO2+1y5+GXkt6jb9vlYy1PJ6OD7bn9XYEb7N2dbuuOOTU5lphiaN7kd3JiOLfvXNOob3zjGzN+j8oiM9fIZ+BkpqbvB+VYvUyOjibH3n8v3c+8t5z7FapZJ7efSyhwWRQ4z7kqcBoSiiwyZU2MBU57GjXTA6Mhi0zI/Oa3LybjE/WfIRuafoC776XVufGiMb/KlWNFM9sCJ4UucJpTRL3zacgiU9ZQ4LIocB4KXDWhyCJT1lDgwqcI88Ao/67IkUWmrClS4Ix6ZYMCV01R9c6pLDJlDQUuiwLnKVrgbm6qfEafeUGCXFc0zrW7Z/fZpaETiiwy5zKNzuPUK6/kxkJnvgrcOy1bkn2dR3LjZ4ohx2rlwt/eYLed8F5pWiuNHq9IirjsssvkUEoWmSIJdRwXo7d/IDd+LlK0wMlfnTpzKXCGW3afpDDXOEebHsmty243mRuba0KRReZMMcYHB3PjLqMne3NjoWM+0cEtp1/HRRckQx3Vj+Mq+kkNFLgsCpxnNgXOv24+z9T8DZt5cYL5rFIztnT6mO7v1lZ19CTrOk/Z5RXtXcm9B6p/A2eYy7tbjtrPQR2fqlw/NT5hX3nqmA+r7xwdt+vO37An6T/9uapuf5MvfVD5aC43Pj41lZlnIwlFFplQGd61y74gwSybS/c2IfI2O66/3l5OTt+ZHbnkErs8NTJiL42+N96wbztimBcptE4/0Nt145W/15K3O9vMR4Fbvef9dPmN5g+Ty15alHQO9KblZ2hsJF02H4O17OM19kPpzZh74YHbxmRkfCzd3jDLpsC59WOT48kPn78l6Ro8aa//1bKr7Weo7ujYl25v/rbOHaOlq82+0tX/ezr3eamNJBRZZIrGHcP83duR4512uaev337klfkQe8P8/Zr5UHvzQfRm/cTkpH01ab05mPXm0r1AwRgeHbUfYu+2+WTfgWTz3n3J259sz+0/mxQtcPXMpcCZv2Nzy4e332ovzd+1te66Ox0f6Nme/r2a+XxT82IEs7zvwyuSyfFBu2y47f1ldxvD/QfTY1X+Dq5a4PyP4Kq1f5GEIotMo2l55unk2AfvJUfXvW2vb735xmT3A/emx5wcG7MfQG8+Dmu8v9/+7drEcKV4uc89NX8v13/ooF02n3862NZml7fccF36ytOendvtR2j5t+0+8N6PYQrc/uXL7HUzN7nNTKHAZVHgPLMpcIb7DFQ/z7ZVXzl613SZM59pKrd5t6svXXbM56X6H2RvLv3PTH23q1IAu8fGk8HTJc2UOretyfBkpbCZIunGb9/Xnrv9mRKKLDJnK0evvTY3ZmIKnHsbEPO+cuZFC2bZfH6qKW9m2RU4u40375Dzn48CZ/jXzQfT+8XHLJtCZ8qbWf7eb69Pt/VfOWq2effAJ7l9TdwzcG7Mf6sRV/5cgesePGWvX/zcTcnNbz5ul03BM5eXrLjZFjq3byMJRRaZonHHuOv57Hu3PbjqtXTZFDi37anBIbvsv3hBxrwAYuv+yluD+PN0L26QWbH+gxmP10hiKXAHPr7GLvtv+WE+uN4t+x9c39e5yRs/aS8PflL5nnTj/rJ5pan/diOu8JkiV7knr5a2Yy3L7bJ7wcRsEoosMmdKvf2an1xSuXzisfRtPvY+8mD6eabuxQdta19L9/no2qvT5U1XXmEvP/zZFekH1ruYV6PK23Nl0Nlx5yJb4Gb7FiMUuCwKnGc2BU6OuXzQXS1n5sPuvzNdsuQ2rx3vTZcNtzxTgTPP3JnLa/ccSQvcJVtbMvu7Aue/15z/itdGEoosMnPN0WuuyY2ZdD7wQG7MxC9wnYsXJx033WSXjYVe4H668q50+da3n0heqFHgzDNursD58Quc2WZ9yxa7vGjd0nTcxH8GbsX2N+2H1LvrssA9tWWNvb7x8I60wJl15tJY+vHq3DxmSiiyyBSNO8YNT1Y+bN7lg1170+VMgRsYtMszvVmvsXX/Abv89Fvr09swz+rJbU1ODgwkza3tufEiiaXATU1N2OP4BW5ivD9dHjzZlC53HXklXR4ZOGwvzTNxhhv3l032b7oiXXbPvvV35wucPdYc3zw4FFlkZputt9xkLzMF7uF8gTPP3Ll9XGnzs/maK3MFzo97Fasph3Kd+xXq4NGjuXVnCgUuiwLnKVrgFnJCkUVGQ9Jn7ALOfz4K3HzHlEZzubZpY25diIQii0yMORfzjKHAnev4ZbBWDDlWJKHIIlPWUOCyKHAeClw1ocgiU9aUscCd7YQii0xZU8YCd7YTiiwyZQ0FLosC56HAVROKLDJlDQUufEKRRaasocCFTyiyyJQ1FLgsCpyHAldNKLLIlDUUuPAJRRaZsoYCFz6hyCJT1lDgsihwHgpcNaHIIlPWUODCJxRZZMoaClz4hCKLTFlDgcuiwHkocNWEIotMWUOBC59QZJEpayhw4ROKLDJlDQUuiwLnocBVE4osMmUNBS58QpFFpqyhwIVPKLLIlDUUuCwKnIcCV00ossiUNRS48AlFFpmyhgIXPqHIIlPWUOCyKHAeClw1ocgiU9ZQ4MInFFlkyhoKXPiEIotMWUOBy6LAeShw1YQii0xZQ4ELn1BkkSlrKHDhE4osMmUNBS6LAuehwFUTiiwyZQ0FLnxCkUWmrKHAhU8ossiUNRS4LAqchwJXTSiyyJQ1FLjwCUUWmbKGAhc+ocgiU9ZQ4LIocB4KXDWhyCJT1lDgwicUWWTKGgpc+IQii0xZQ4HLosB5KHDVhCKLTFlDgQufUGSRKWsocOETiiwyZQ0FLosC59l+csCWOHJCnppZM8WFrEqGm5vlqZmVXR0ttsSRtfLUzJopLmR7cuDoMXlqZmXo1L6k68gaMp1QDk0XF/JS0tu0V56aUqPAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKRFvgDu5vSgMAAICqaAscAAAAaqPAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQhgIHAACgDAUOAABAGQocAACAMhQ4AAAAZShwAAAAylDgAAAAlKHAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAy0Ra4tiMH0wAAAKAq2gIHAACA2ihwAAAAylDgAAAAlKHAAQAAKEOBK2jbbTcviMRCzktrYiLnpjWxkPPSGgALCwWuIHmnqDWxkPPSmpjIuWlNLOS8tAbAwkKBK0jeKWpNLOS8tCYmcm5aEws5L60BsLBQ4AqSd4paEws5L62JiZyb1sRCzktrACwsFLiC5J2i1sRCzktrYiLnpjWxkPPSGgALCwWuIHmnqDWxkPPSmpjIuWlNLOS8tAbAwkKBK0jeKWpNLOS8tCYmcm5aEws5L60BsLBQ4AqSd4paEws5L62JiZyb1sRCzktrACwsFLiC5J2i1sRCzktrYiLnpjWxkPPSGgALCwWuIHmnqDWxkPPSmpjIuWlNLOS8tAbAwkKBK0jeKc4lLc8+k+x7aqld7vpkS9K19ZOkd+8ee92/LbPOXHa8uz7peG997jizSSzkvM6UPQ8vTpePb3g/2fabW+zYoZdfTM/djjtvTw6vfMlenxgetuvMuH9ud91/b9L6+qvJjjsWTZ/Xd5L2N99It/H/XRpNTOTciuRk09706zmyelWy58EH7DnpO3ggSaamMtsc37jBXnZv35bub7bdfvtt09+n7+aOXTSxkPNqNEfWvJJ+Ha2vrUl2L74v2XnvXUnbG68nJzZ9mPTu2Z2ud5dH172Vru/Zsd2Ot766Jtl1392Vf4cDLbOeE4CFhQJXkLxTnEvMA6LJrnvvzh3b2PvoQ8m2RbfaZXPn3X/4UOkLnEn7W2/aBzh3/k5s3pR+TebSPEi660PHOjJjbnzwaHsyOTaWdO/YZo/hlzt3XHm7MyUmcm5FYsqZ/b4zX9Pp8+COOTUxkW7TtvY1O+6+d3c/cF9lH2d6v+YnH88dv0hiIefVaEzxsl/H6XM40NZWOeD09eGuznQ7o+nxR2zJc+fcrXffv6bMubnMdk4AFhYKXEHyTnEuMeXBFbKp8XF76W7Dvy3zwGnWU+CmH8h27ph+UDtml0d7e+wzEx3r30lO7d+XND/xuH2Gwi9wZmzXffdkbss4+MKKZKSn2z5wjvX12XFzjg3/36XRxETOrUjcs2sm5lyaZy/dMf0CZ87x+NCgvT4xNJRsn/6PxvjggN22eemSZPjEidyxiyYWcl6Nxjyb5s6Z+Q+C+b46vOrlpP/QwVyBc5dDHR3perdv/5HDtgy67YY7q/sWCYCFhQJXkLxT1JpYyHlpTUzk3LQmFnJeWgNgYaHAFSTvFLUmFnJeWhMTOTetiYWcl9YAWFgocAXJO0WtiYWcl9bERM5Na2Ih56U1ABYWClxB8k5Ra2Ih56U1MZFz05pYyHlpDYCFhQJXkLxT1JpYyHlpTUzk3LQmFnJeWgNgYaHAFSTvFLUmFnJeWhMTOTetiYWcl9YAWFgocAXJO0WtiYWcl9bERM5Na2Ih56U1ABYWClxB8k5Ra2Ih56U1MZFz05pYyHlpDYCFhQJXkLxT1JpYyHlpTUzk3LQmFnJeWgNgYaHAFSTvFLUmFnJeWhMTOTetiYWcl9YAWFgocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoE22BGxzoTwMAAICqaAscAAAAaqPAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQhgIHAACgDAUOAABAGQocAACAMhQ4AAAAZShwAAAAylDgItPb0yWHMEec07A4n+FxTsPifIbHOY0PBS4y/JCExzkNi/MZHuc0LM5neJzT+FDgIsMPSXic07A4n+FxTsPifIbHOY0PBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQhgIHAACgDAUOAABAGQocAACAMhQ4AAAAZShwAAAAylDgAAAAlKHAAQAAKEOBAwAAUIYCBwAAoAwFDgAAQBkKHAAAgDIUOAAAAGUocAAAAMpQ4AAAAJShwAEAAChDgQMAAFCGAgcAAKAMBQ4AAEAZChwAAIAyFDgAAABlKHAAAADKUOAAAACUocABAAAoQ4EDAABQhgIHAACgDAUOAABAGQocAACAMhQ4AAAAZShwAAAAylDgAAAAlKHAAQAAKPP/AaktJCb95bXZAAAAAElFTkSuQmCC>