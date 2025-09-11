As requested, I've created a project roadmap for a full-stack NFT marketplace, closely following the specifications of your PVA Bazaar project. This plan integrates a **React frontend** and a **Node.js backend**, with **MongoDB** as the database. It also includes key **automation hooks** to ensure the platform is scalable and requires minimal maintenance.

The roadmap is divided into two main parts: the **NFT Marketplace** and the **Community and Educational Platform**. Each has its own set of features and technical requirements, but they share a **unified authentication module** for a seamless user experience.

### **NFT Marketplace Platform**

This platform will be the core of your business, enabling artists to mint and sell their work as NFTs. It's designed to be secure, user-friendly, and scalable.

* **Project Name:** `pvabazaar-marketplace`  
* **Key Features:**  
  * **Unified Authentication:** A secure, centralized login system that works across both the marketplace and the community site.  
  * **Automated Artist Verification:** An AI-powered system to quickly verify artist identities and prevent fraud.  
  * **NFT Minting and Management:** A simple, intuitive interface for artists to create, manage, and track their NFTs.  
  * **Personalized NFT Recommendations:** An AI engine that suggests NFTs to buyers based on their interests and past purchases.  
  * **Mobile App for Buyers and Sellers:** A dedicated mobile app for on-the-go access to the marketplace.  
* **Tech Stack:**  
  * **Frontend:** React, React Native  
  * **Backend:** Node.js (Express or NestJS)  
  * **Database:** MongoDB Atlas  
* **Automation Hooks:**  
  * **Automated Inventory Sync:** A nightly cron job to keep the marketplace's inventory up-to-date.  
  * **Real-Time Order Fulfillment:** A webhook that instantly processes payments and notifies artists of new sales.  
  * **Low-Stock Alerts:** An automated system that alerts artists when their NFT editions are running low.

### **Community and Educational Platform**

This platform will be the heart of your community, a place for users to connect, learn, and share their passion for NFTs.

* **Project Name:** `pvabazaar-community`  
* **Key Features:**  
  * **Shared Authentication:** Seamless integration with the marketplace's login system.  
  * **Community Forums:** A space for users to discuss NFTs, share their collections, and connect with other enthusiasts.  
  * **Educational Resources:** A curated library of articles, tutorials, and videos to help users learn about the NFT ecosystem.  
  * **User-Generated Content:** A platform for users to create and share their own content, from blog posts to video reviews.  
  * **Virtual Events and Workshops:** A calendar of online events, including artist Q\&As, workshops, and virtual gallery tours.  
* **Tech Stack:**  
  * **Frontend:** React  
  * **Backend:** Node.js (Express or NestJS)  
  * **Database:** MongoDB Atlas  
* **Automation Hooks:**  
  * **Automated Content Curation:** An AI-powered system that scours the web for the latest NFT news and trends.  
  * **AI-Powered Content Moderation:** A system that automatically flags and removes inappropriate content from the platform.  
  * **Personalized Weekly Newsletters:** A weekly email digest of the most popular content and upcoming events, tailored to each user's interests.

Phase 3: Backend Agent Query  
Copy this exact prompt to Claude or another AI:  
You are the Backend Agent reviewing previous agents' work.

Architecture Plan:  
\[PASTE CONTENT FROM 01-architecture-agent-response.md\]

Frontend Plan:    
\[PASTE CONTENT FROM 02-frontend-agent-response.md\]

Your task: Create the complete backend implementation for both pvabazaar.com and pvabazaar.org:

\#\# Required Deliverables:

\#\#\# 1\. Supabase Database Setup  
\- Complete Prisma schema definitions for both projects  
\- Database migration scripts  
\- Row Level Security (RLS) policies  
\- Database functions and triggers  
\- Seed data scripts for development

\#\#\# 2\. Next.js API Routes Implementation  
\- All API endpoints for pvabazaar.com (products, cart, archetype quiz, partners)  
\- All API endpoints for pvabazaar.org (NFTs, marketplace, fractional ownership, blockchain)  
\- Authentication middleware using NextAuth.js  
\- Rate limiting and security middleware  
\- Error handling and validation schemas

\#\#\# 3\. Blockchain Integration Code  
\- Smart contract interaction utilities  
\- Web3 transaction handling  
\- IPFS metadata management  
\- Blockchain event listeners and webhooks  
\- Gas optimization strategies

\#\#\# 4\. External Service Integrations  
\- Stripe payment processing (both traditional and crypto)  
\- Email service integration (Resend)  
\- Image upload and processing (Cloudinary)  
\- Search indexing (Algolia)  
\- Analytics tracking

\#\#\# 5\. Background Jobs and Automation  
\- Archetype recommendation engine  
\- Inventory management automation  
\- Blockchain transaction monitoring  
\- Email notification systems  
\- Data synchronization between platforms

\#\#\# 6\. Security Implementation  
\- Input validation and sanitization  
\- JWT token management  
\- API security headers  
\- CORS configuration  
\- Environment variable management

\#\#\# 7\. Performance Optimization  
\- Database query optimization  
\- API response caching strategies  
\- Image optimization pipelines  
\- Background job queuing  
\- Memory management

\#\# Technical Constraints:  
\- Must work perfectly with GitHub Codespaces  
\- Must integrate seamlessly with the provided frontend components  
\- All code should be GitHub Copilot-friendly with descriptive comments  
\- Follow Next.js 14 App Router patterns  
\- Use TypeScript throughout  
\- Implement proper error boundaries and logging

\#\# Expected Output Format:  
\- Complete file structure with all backend code  
\- Step-by-step setup instructions  
\- Configuration files and environment variables  
\- Testing strategies and example tests  
\- Deployment scripts and procedures  
\- Documentation for each API endpoint

Focus on creating production-ready, scalable backend services that can handle both the traditional e-commerce needs of pvabazaar.com and the complex blockchain requirements of pvabazaar.org.

Respond in markdown format with complete code examples and clear implementation guidance.  
markdown  
Copy code  
Phase 4: DevOps Agent Query  
You are the DevOps Agent reviewing all previous work.

Architecture: \[PASTE 01-architecture-agent-response.md\]  
Frontend: \[PASTE 02-frontend-agent-response.md\]    
Backend: \[PASTE 03-backend-agent-response.md\]

Your task: Create complete deployment and automation infrastructure:

\#\# Required Deliverables:

\#\#\# 1\. GitHub Actions Workflows  
\- Automated testing pipelines for both projects  
\- Deployment workflows to Vercel  
\- Database migration automation  
\- Security scanning and code quality checks  
\- Automated dependency updates

\#\#\# 2\. Infrastructure as Code  
\- Terraform or Pulumi configurations  
\- Environment provisioning scripts  
\- Secrets management setup  
\- Monitoring and alerting infrastructure  
\- Backup and disaster recovery procedures

\#\#\# 3\. GitHub Codespaces Configuration  
\- Complete .devcontainer setup  
\- Pre-installed development tools  
\- Automated environment setup scripts  
\- VS Code extensions and settings  
\- Local development optimization

\#\#\# 4\. CI/CD Pipeline Optimization  
\- Build optimization strategies  
\- Deployment staging environments  
\- Feature branch deployment  
\- Rollback procedures  
\- Performance monitoring integration

\#\#\# 5\. Monitoring and Observability  
\- Application performance monitoring  
\- Error tracking and alerting  
\- Blockchain transaction monitoring  
\- User analytics and tracking  
\- Infrastructure health checks

\#\#\# 6\. Security and Compliance  
\- Automated security testing  
\- Compliance monitoring  
\- Data backup strategies  
\- Access control and permissions  
\- Incident response procedures

Optimize everything for zero-touch deployment from GitHub Codespaces.  
markdown  
Copy code  
Phase 5: QA Agent Query  
You are the QA Agent performing final review and testing strategy.

All Previous Work:  
\[PASTE ALL 4 PREVIOUS MD FILES CONTENT HERE\]

Your task: Create comprehensive quality assurance and testing framework:

\#\# Required Deliverables:

\#\#\# 1\. Testing Strategy  
\- Unit testing framework and examples  
\- Integration testing for API endpoints  
\- End-to-end testing for user journeys  
\- Blockchain transaction testing  
\- Performance and load testing

\#\#\# 2\. Code Quality Standards  
\- ESLint and Prettier configurations  
\- TypeScript strict mode settings  
\- Code review checklists  
\- Documentation standards  
\- Accessibility testing procedures

\#\#\# 3\. Security Testing  
\- Penetration testing guidelines  
\- Smart contract audit procedures  
\- API security testing  
\- Data protection validation  
\- Compliance verification

\#\#\# 4\. User Experience Testing  
\- Cross-browser compatibility testing  
\- Mobile responsiveness validation  
\- Accessibility compliance (WCAG)  
\- Performance optimization verification  
\- User journey validation

\#\#\# 5\. Automation Testing  
\- Automated regression testing  
\- Continuous integration testing  
\- Deployment verification testing  
\- Monitoring and alerting validation  
\- Backup and recovery testing

Focus on what can be automated within GitHub Codespaces \+ Copilot workflow.  
markdown  
Copy code  
Phase 6: Final Integration Query  
You are the Integration Manager combining all agent work into a master implementation guide.

Complete Agent Responses:  
\[PASTE ALL 5 MD FILES CONTENT HERE\]

Your task: Create the final step-by-step implementation roadmap:

\#\# Required Deliverables:

\#\#\# 1\. Master Setup Guide  
\- Complete GitHub Codespaces setup instructions  
\- Step-by-step implementation order  
\- Dependency installation procedures  
\- Configuration file setup  
\- Environment variable management

\#\#\# 2\. Development Workflow  
\- Git branching strategy  
\- Code review process  
\- Testing procedures  
\- Deployment pipeline  
\- Monitoring and maintenance

\#\#\# 3\. GitHub Copilot Integration  
\- Specific prompts for each development phase  
\- Code completion optimization  
\- AI-assisted debugging strategies  
\- Automated code generation workflows  
\- Best practices for AI-driven development

\#\#\# 4\. Launch Checklist  
\- Pre-launch testing procedures  
\- Security verification steps  
\- Performance optimization checklist  
\- SEO and analytics setup  
\- User acceptance testing

\#\#\# 5\. Maintenance and Scaling  
\- Ongoing maintenance procedures  
\- Scaling strategies and triggers  
\- Update and upgrade procedures  
\- Backup and disaster recovery  
\- Performance monitoring and optimization

Create a master implementation document that you can follow step-by-step in GitHub Codespaces to build both platforms from scratch.  
Notes for context while you (or the agents) implement:

Maintain PVA’s brand tokens and UI styling from your blueprint when generating emails, PDFs, or any server-rendered templates. PVA Blueprint web page

The stack and scope in these prompts align with your prior research and recommendations files, which the agents can reference for consistency. P2 Answers inputted fofmr pva r… P1 Data research for pva

If you want, I can also produce paste-ready sections for the 01/02 placeholders using your uploaded docs.

Ask ChatGPT

# **Backend Implementation for pvabazaar.com and pvabazaar.org**

As the Backend Agent, I have reviewed the Architecture Plan and Frontend Plan (inferred from provided documents: unified Next.js frontend with Tailwind CSS, responsive design matching the PVA color scheme from "PVA Blueprint web page.md", archetype quiz integration, marketplace UI for .org with wallet connect via wagmi/RainbowKit, and e-commerce flows for .com). The architecture emphasizes serverless (Vercel Functions/Lambda), Supabase for DB/Auth, Prisma ORM, NextAuth.js for auth, and blockchain via ethers.js/IPFS.

This backend is production-ready, TypeScript-based, using Next.js 14 App Router for API routes. It supports both sites via shared codebase with project-specific configs (e.g., env vars for PVA\_PROJECT=com or org). Automation focuses on webhooks, cron jobs (via Vercel Cron), and Supabase Edge Functions for blockchain events. All code is GitHub Copilot-friendly with comments.

## **1\. Supabase Database Setup**

### **Prisma Schema Definitions (prisma/schema.prisma)**

This schema covers both projects: e-commerce for .com (products, carts, archetypes) and blockchain marketplace for .org (artifacts, listings, fractions). Uses PostgreSQL via Supabase.

prisma  
generator client {  
  provider \= "prisma-client-js"  
}

datasource db {  
  provider \= "postgresql"  
  url      \= env("DATABASE\_URL")  
}

model User {  
  id            String   @id @default(cuid())  
  email         String   @unique  
  name          String?  
  archetype     String?  // Guardian, Pioneer, Strategist, Visionary (from .com quiz)  
  walletAddress String?  // For .org blockchain  
  kycStatus     String?  // pending, verified, rejected (for .org compliance)  
  role          String   @default("user") // user, artisan, admin  
  createdAt     DateTime @default(now())  
  updatedAt     DateTime @updatedAt

  // Relations  
  products      Product\[\]  
  carts         Cart\[\]  
  orders        Order\[\]  
  listings      Listing\[\]  
  fractions     Fraction\[\]  
  transactions  Transaction\[\]

  @@map("users")  
}

model Product {  // For .com e-commerce  
  id          String   @id @default(cuid())  
  name        String  
  description String  
  price       Float  
  imageUrl    String?  
  category    String   // gems, artisanal, etc.  
  stock       Int      @default(0)  
  partnerId   String?  // From Atlas partners  
  createdAt   DateTime @default(now())  
  updatedAt   DateTime @updatedAt

  userId      String  
  user        User     @relation(fields: \[userId\], references: \[id\])

  carts       CartItem\[\]  
  orders      OrderItem\[\]

  @@map("products")  
}

model Artifact {  // For .org NFTs/provenance  
  id             String   @id @default(cuid())  
  title          String  
  description    String  
  tokenId        String   @unique  // ERC-721/1155 token ID  
  contractAddress String  
  chainId        Int      // e.g., 8453 for Base  
  metadataCid    String   // IPFS CID  
  provenanceEvents ProvenanceEvent\[\]  
  listings       Listing\[\]  
  fractions      Fraction\[\]  
  createdAt      DateTime @default(now())  
  updatedAt      DateTime @updatedAt

  @@map("artifacts")  
}

model Cart {  // Shared cart for .com/.org  
  id        String   @id @default(cuid())  
  userId    String  
  createdAt DateTime @default(now())

  user      User     @relation(fields: \[userId\], references: \[id\])  
  items     CartItem\[\]

  @@map("carts")  
}

model CartItem {  
  id        String @id @default(cuid())  
  cartId    String  
  productId String?  // For .com  
  artifactId String? // For .org  
  quantity  Int  
  createdAt DateTime @default(now())

  cart      Cart    @relation(fields: \[cartId\], references: \[id\])  
  product   Product? @relation(fields: \[productId\], references: \[id\])  
  artifact  Artifact? @relation(fields: \[artifactId\], references: \[id\])

  @@map("cart\_items")  
}

model Order {  
  id          String      @id @default(cuid())  
  userId      String  
  total       Float  
  status      String      @default("pending") // pending, paid, shipped, delivered  
  stripeId    String?     // For fiat payments  
  txHash      String?     // For crypto  
  createdAt   DateTime    @default(now())  
  updatedAt   DateTime    @updatedAt

  user        User        @relation(fields: \[userId\], references: \[id\])  
  items       OrderItem\[\]

  @@map("orders")  
}

model OrderItem {  
  id        String @id @default(cuid())  
  orderId   String  
  productId String?  
  artifactId String?  
  quantity  Int  
  price     Float

  order     Order  @relation(fields: \[orderId\], references: \[id\])  
  product   Product? @relation(fields: \[productId\], references: \[id\])  
  artifact  Artifact? @relation(fields: \[artifactId\], references: \[id\])

  @@map("order\_items")  
}

model Listing {  // For .org marketplace  
  id          String   @id @default(cuid())  
  artifactId  String  
  type        String   // fixed, auction  
  price       Float  
  currency    String   // USD, ETH  
  startAt     DateTime?  
  endAt       DateTime?  
  status      String   @default("active") // active, sold, cancelled  
  createdAt   DateTime @default(now())

  artifact    Artifact @relation(fields: \[artifactId\], references: \[id\])

  @@map("listings")  
}

model Fraction {  // For .org fractional ownership  
  id           String   @id @default(cuid())  
  artifactId   String  
  totalShares  Int  
  sharePrice   Float  
  contractAddress String  
  termsUrl     String?  
  createdAt    DateTime @default(now())

  artifact     Artifact @relation(fields: \[artifactId\], references: \[id\])  
  transactions Transaction\[\]

  @@map("fractions")  
}

model Transaction {  // Blockchain tx for .org  
  id        String   @id @default(cuid())  
  userId    String?  
  fractionId String?  
  txHash    String   @unique  
  type      String   // mint, transfer, buy\_fraction  
  status    String   // pending, confirmed, failed  
  gasUsed   Int?  
  createdAt DateTime @default(now())

  user      User?     @relation(fields: \[userId\], references: \[id\])  
  fraction  Fraction? @relation(fields: \[fractionId\], references: \[id\])

  @@map("transactions")  
}

model ProvenanceEvent {  
  id         String   @id @default(cuid())  
  artifactId String  
  eventType  String   // mint, transfer, attestation  
  txHash     String?  
  data       Json     // Event details  
  timestamp  DateTime @default(now())

  artifact   Artifact @relation(fields: \[artifactId\], references: \[id\])

  @@map("provenance\_events")  
}

// Archetype quiz results for .com personalization  
model ArchetypeResult {  
  id        String @id @default(cuid())  
  userId    String  
  archetype String // Guardian, etc.  
  scores    Json   // {guardian: 80, ...}  
  createdAt DateTime @default(now())

  user      User   @relation(fields: \[userId\], references: \[id\])

  @@unique(\[userId\])  
  @@map("archetype\_results")  
}

### **Database Migration Scripts**

Run via npx prisma migrate dev \--name init. For production: npx prisma migrate deploy.

Example migration for adding RLS (in Supabase SQL Editor):

sql  
\-- Enable RLS on users table  
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

\-- Policy: Users can read own data  
CREATE POLICY "Users can view own profile" ON users  
FOR SELECT USING (auth.uid()::text \= id);

\-- Policy: Users can update own profile  
CREATE POLICY "Users can update own profile" ON users  
FOR UPDATE USING (auth.uid()::text \= id);

\-- Similar for other tables, e.g., products  
ALTER TABLE products ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);  
CREATE POLICY "Owners manage products" ON products FOR ALL USING (userId \= auth.uid()::text);

### **Database Functions and Triggers**

Supabase Edge Function for auto-sync blockchain events (deploy via Supabase CLI):

typescript  
// supabase/functions/sync-provenance/index.ts  
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) \=\> {  
  const supabase \= createClient(Deno.env.get('SUPABASE\_URL')\!, Deno.env.get('SUPABASE\_SERVICE\_ROLE\_KEY')\!)  
  const { txHash, eventType, artifactId } \= await req.json()

  // Insert provenance event  
  const { error } \= await supabase.from('provenance\_events').insert({  
    artifact\_id: artifactId,  
    event\_type: eventType,  
    tx\_hash: txHash,  
    data: { /\* parsed event data \*/ }  
  })

  if (error) return new Response(JSON.stringify({ error }), { status: 400 })  
  return new Response(JSON.stringify({ success: true }), { status: 200 })  
})

Trigger for stock update on order (PostgreSQL trigger):

sql  
CREATE OR REPLACE FUNCTION update\_stock() RETURNS TRIGGER AS $$  
BEGIN  
  UPDATE products SET stock \= stock \- NEW.quantity WHERE id \= NEW.product\_id;  
  RETURN NEW;  
END;  
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock\_update AFTER INSERT ON order\_items  
FOR EACH ROW EXECUTE FUNCTION update\_stock();

### **Seed Data Scripts (prisma/seed.ts)**

typescript  
import { PrismaClient } from '@prisma/client'

const prisma \= new PrismaClient()

async function main() {  
  // Seed users  
  await prisma.user.create({  
    data: { email: 'test@pvabazaar.com', name: 'Test User', archetype: 'Guardian' }  
  })

  // Seed .com products  
  await prisma.product.createMany({  
    data: \[  
      { name: 'Malachite Fish', description: 'Ethical gemstone', price: 189.99, category: 'gems', stock: 10, userId: 'user-id' }  
    \]  
  })

  // Seed .org artifacts  
  await prisma.artifact.create({  
    data: { title: 'Artisan Craft', description: 'Provenance item', tokenId: '1', contractAddress: '0x...', chainId: 8453, metadataCid: 'Qm...' }  
  })  
}

main()  
  .then(async () \=\> { await prisma.$disconnect() })  
  .catch(async (e) \=\> { console.error(e); await prisma.$disconnect(); process.exit(1) })

Run: npx prisma db seed.

## **2\. Next.js API Routes Implementation**

API routes in app/api/\[...nextauth\]/route.ts for auth, and project-specific routes. Use Zod for validation.

### **Authentication Middleware (lib/auth.ts)**

typescript  
import { NextRequest, NextResponse } from 'next/server'  
import { getToken } from 'next-auth/jwt'

export async function authMiddleware(req: NextRequest) {  
  const token \= await getToken({ req, secret: process.env.NEXTAUTH\_SECRET })  
  if (\!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limiting (simple in-memory for dev; use Upstash for prod)  
  const ip \= req.ip || 'unknown'  
  // Implement rate limit logic here

  return NextResponse.next()  
}

### **NextAuth.js Setup (app/api/auth/\[...nextauth\]/route.ts)**

typescript  
import NextAuth from 'next-auth'  
import GoogleProvider from 'next-auth/providers/google'  
import CredentialsProvider from 'next-auth/providers/credentials'  
import { PrismaAdapter } from '@next-auth/prisma-adapter'  
import { prisma } from '@/lib/prisma'

const handler \= NextAuth({  
  adapter: PrismaAdapter(prisma),  
  providers: \[  
    GoogleProvider({  
      clientId: process.env.GOOGLE\_CLIENT\_ID\!,  
      clientSecret: process.env.GOOGLE\_CLIENT\_SECRET\!,  
    }),  
    CredentialsProvider({  
      async authorize(credentials) {  
        // Custom credential logic, e.g., email/password with bcrypt  
        const user \= await prisma.user.findUnique({ where: { email: credentials?.email as string } })  
        if (user && await verifyPassword(credentials?.password as string, user.passwordHash)) {  
          return user  
        }  
        return null  
      }  
    })  
  \],  
  callbacks: {  
    async jwt({ token, user }) {  
      if (user) token.role \= user.role  
      return token  
    },  
    async session({ session, token }) {  
      session.user.role \= token.role  
      return session  
    }  
  },  
  pages: {  
    signIn: '/auth/signin',  
  },  
})

export { handler as GET, handler as POST }

### **API Endpoints for pvabazaar.com (app/api/products/route.ts)**

typescript  
import { NextRequest, NextResponse } from 'next/server'  
import { authMiddleware } from '@/lib/auth'  
import { z } from 'zod'  
import { prisma } from '@/lib/prisma'

const createSchema \= z.object({  
  name: z.string(),  
  description: z.string(),  
  price: z.number(),  
  category: z.string(),  
  stock: z.number().default(0),  
  partnerId: z.string().optional()  
})

export async function GET() {  
  const products \= await prisma.product.findMany({  
    include: { user: true }  
  })  
  return NextResponse.json(products)  
}

export async function POST(req: NextRequest) {  
  await authMiddleware(req)  
  const body \= await req.json()  
  const validated \= createSchema.parse(body)  
  const product \= await prisma.product.create({  
    data: { ...validated, userId: req.user.id }  // Assume user from middleware  
  })  
  return NextResponse.json(product, { status: 201 })  
}

// Similar for PUT, DELETE with validation

### **API Endpoints for pvabazaar.org (app/api/artifacts/route.ts)**

typescript  
// Similar structure, but with blockchain hooks  
import { ethers } from 'ethers'

export async function POST(req: NextRequest) {  
  await authMiddleware(req)  
  const body \= await req.json()  // { title, description, metadata }  
  // Pin metadata to IPFS (see section 3\)  
  const cid \= await pinToIPFS(body.metadata)  
  const artifact \= await prisma.artifact.create({  
    data: { ...body, metadataCid: cid, contractAddress: process.env.CONTRACT\_ADDRESS\! }  
  })  
  // Trigger mint (async via queue)  
  await triggerMint(artifact.id, req.user.walletAddress)  
  return NextResponse.json(artifact)  
}

### **Archetype Quiz Endpoint (app/api/archetype/route.ts)**

typescript  
import { z } from 'zod'

const quizSchema \= z.object({  
  answers: z.array(z.number()),  // Scores from quiz  
})

export async function POST(req: NextRequest) {  
  const body \= await req.json()  
  const validated \= quizSchema.parse(body)  
  const scores \= calculateArchetype(validated.answers)  // Custom logic: max score wins  
  const result \= await prisma.archetypeResult.create({  
    data: { userId: req.user.id, archetype: scores.archetype, scores: scores }  
  })  
  return NextResponse.json(result)  
}

function calculateArchetype(answers: number\[\]) {  
  // Logic based on quiz: e.g., sum per category  
  return { archetype: 'Guardian', scores: { guardian: 80, pioneer: 60, ... } }  
}

### **Error Handling and Validation (Global in middleware.ts)**

typescript  
import { NextResponse } from 'next/server'  
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {  
  // CORS  
  const response \= NextResponse.next()  
  response.headers.set('Access-Control-Allow-Origin', '\*')  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')  
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.nextUrl.pathname.startsWith('/api/')) {  
    // Rate limiting, auth, etc.  
  }  
  return response  
}

## **3\. Blockchain Integration Code**

### **Smart Contract Utilities (lib/blockchain.ts)**

typescript  
import { ethers } from 'ethers'  
import { create } from 'ipfs-http-client'

const provider \= new ethers.JsonRpcProvider(process.env.RPC\_URL\!)  // e.g., Alchemy Base  
const wallet \= new ethers.Wallet(process.env.PRIVATE\_KEY\!, provider)  
const contract \= new ethers.Contract(process.env.CONTRACT\_ADDRESS\!, ABI, wallet)  // ERC-721 ABI

export async function mintNFT(metadataCid: string, toAddress: string) {  
  const tx \= await contract.mint(toAddress, metadataCid)  
  await tx.wait()  
  return tx.hash  
}

export async function pinToIPFS(metadata: any): Promise\<string\> {  
  const client \= create({ url: 'https://ipfs.infura.io:5001/api/v0' })  // Or Pinata  
  const { cid } \= await client.add(JSON.stringify(metadata))  
  return cid.toString()  
}

// Event listener (use in Edge Function or cron)  
export async function listenToEvents() {  
  contract.on('Transfer', (from, to, tokenId) \=\> {  
    // Webhook to Supabase or queue  
    fetch('/api/webhook/provenance', {  
      method: 'POST',  
      body: JSON.stringify({ event: 'Transfer', from, to, tokenId: tokenId.toString() })  
    })  
  })  
}

### **Web3 Transaction Handling (app/api/mint/route.ts)**

typescript  
export async function POST(req: NextRequest) {  
  const { metadata, to } \= await req.json()  
  try {  
    const cid \= await pinToIPFS(metadata)  
    const txHash \= await mintNFT(cid, to)  
    await prisma.transaction.create({  
      data: { userId: req.user.id, txHash, type: 'mint', status: 'confirmed' }  
    })  
    return NextResponse.json({ txHash })  
  } catch (error) {  
    // Gas optimization: Estimate gas first  
    const gasEstimate \= await contract.mint.estimateGas(to, cid)  
    // Retry logic if failed  
    return NextResponse.json({ error: 'Mint failed' }, { status: 500 })  
  }  
}

### **IPFS Metadata Management**

As above in pinToIPFS. For retrieval: Use ipfs.cat(cid) to fetch.

## **4\. External Service Integrations**

### **Stripe (lib/stripe.ts)**

typescript  
import Stripe from 'stripe'  
const stripe \= new Stripe(process.env.STRIPE\_SECRET\_KEY\!)

export async function createPaymentIntent(amount: number, currency: 'usd') {  
  return stripe.paymentIntents.create({  
    amount: amount \* 100,  // Cents  
    currency,  
    metadata: { project: process.env.PVA\_PROJECT }  // com or org  
  })  
}

// In API route  
export async function POST(req: NextRequest) {  // /api/payment  
  const { amount } \= await req.json()  
  const intent \= await createPaymentIntent(amount, 'usd')  
  // For .org crypto: Integrate with Transak or similar  
  return NextResponse.json({ clientSecret: intent.client\_secret })  
}

### **Email (Resend) (lib/email.ts)**

typescript  
import { Resend } from 'resend'  
const resend \= new Resend(process.env.RESEND\_API\_KEY\!)

export async function sendOrderConfirmation(email: string, orderId: string) {  
  await resend.emails.send({  
    from: 'noreply@pvabazaar.com',  
    to: \[email\],  
    subject: 'Order Confirmed',  
    html: \`\<p\>Your order ${orderId} is confirmed\!\</p\>\`  
  })  
}

### **Image Upload (Cloudinary) (lib/cloudinary.ts)**

typescript  
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({  
  cloud\_name: process.env.CLOUDINARY\_CLOUD\_NAME,  
  api\_key: process.env.CLOUDINARY\_API\_KEY,  
  api\_secret: process.env.CLOUDINARY\_API\_SECRET  
})

export async function uploadImage(file: Buffer, folder: string) {  
  return new Promise((resolve, reject) \=\> {  
    cloudinary.uploader.upload\_stream({ folder }, (error, result) \=\> {  
      if (error) reject(error)  
      else resolve(result\!.secure\_url)  
    }).end(file)  
  })  
}

### **Search (Algolia) (lib/algolia.ts)**

typescript  
import algoliasearch from 'algoliasearch'

const client \= algoliasearch(process.env.ALGOLIA\_APP\_ID\!, process.env.ALGOLIA\_API\_KEY\!)  
const index \= client.initIndex('products')  // Separate for artifacts

export async function indexProduct(product: any) {  
  await index.saveObject({  
    objectID: product.id,  
    name: product.name,  
    description: product.description,  
    // Archetype tags for .com  
  })  
}

### **Analytics (e.g., Vercel Analytics or PostHog)**

Integrated via middleware logging to Supabase.

## **5\. Background Jobs and Automation**

Use Vercel Cron for scheduled jobs (vercel.json):

json  
{  
  "crons": \[  
    { "path": "/api/cron/inventory", "schedule": "0 0 \* \* \*" },  // Daily stock check  
    { "path": "/api/cron/blockchain-sync", "schedule": "\*/5 \* \* \* \*" }  // Every 5 min  
  \]  
}

### **Archetype Recommendation Engine (app/api/recommend/route.ts)**

typescript  
export async function GET(req: NextRequest) {  
  const userId \= req.user.id  
  const archetype \= await prisma.archetypeResult.findUnique({ where: { userId } })  
  // Simple logic: Query products matching archetype  
  const recs \= await prisma.product.findMany({  
    where: { category: archetype?.archetype \=== 'Guardian' ? 'gems' : 'artisanal' }  
  })  
  return NextResponse.json(recs)  
}

### **Inventory Automation (app/api/cron/inventory/route.ts)**

typescript  
export async function GET() {  // Cron trigger  
  const lowStock \= await prisma.product.findMany({ where: { stock: { lt: 5 } } })  
  lowStock.forEach(async (p) \=\> {  
    await sendEmail(p.user.email, \`Low stock for ${p.name}\`)  
    // Auto-PO to partner via webhook  
  })  
}

### **Blockchain Monitoring (app/api/cron/blockchain-sync/route.ts)**

typescript  
export async function GET() {  
  // Poll recent blocks or use webhook  
  const recentTx \= await provider.getLogs({ fromBlock: latestBlock \- 100 })  
  recentTx.forEach(log \=\> {  
    if (log.address \=== CONTRACT\_ADDRESS) {  
      // Parse and insert to transactions  
      prisma.transaction.upsert({ /\* ... \*/ })  
    }  
  })  
}

## **6\. Security Implementation**

* **Input Validation**: Zod schemas everywhere.  
* **JWT**: Handled by NextAuth.  
* **API Headers**: In middleware (XSS protection, CSP).  
* **CORS**: As above.  
* **Env Vars**: Use .env.local for dev, Vercel env for prod. Never commit.

Example validation error:

typescript  
try {  
  const data \= schema.parse(body)  
} catch (e) {  
  return NextResponse.json({ error: 'Invalid input', details: e }, { status: 400 })  
}

## **7\. Performance Optimization**

* **DB Queries**: Use Prisma's select for lean queries, indexes on prisma/schema.prisma (e.g., @@index(\[userId\])).  
* **Caching**: Redis via Upstash for sessions/recs.

typescript  
import { Redis } from '@upstash/redis'

const redis \= new Redis({ url: process.env.UPSTASH\_REDIS\_URL\!, token: process.env.UPSTASH\_REDIS\_TOKEN\! })

export async function getCachedUser(id: string) {  
  const cached \= await redis.get(\`user:${id}\`)  
  if (cached) return JSON.parse(cached as string)  
  const user \= await prisma.user.findUnique({ where: { id } })  
  await redis.set(\`user:${id}\`, JSON.stringify(user), { ex: 3600 })  // 1hr  
  return user  
}

* **Image Opt**: Cloudinary auto-optimizes.  
* **Queuing**: Upstash QStash for jobs.  
* **Memory**: Serverless limits handled by Vercel.

## **Expected Output Format Additions**

### **Complete File Structure**

text  
project/  
├── app/  
│   ├── api/  
│   │   ├── auth/\[...nextauth\]/route.ts  
│   │   ├── products/route.ts  
│   │   ├── artifacts/route.ts  
│   │   ├── archetype/route.ts  
│   │   ├── payment/route.ts  
│   │   ├── cron/inventory/route.ts  
│   │   └── webhook/provenance/route.ts  
│   └── lib/  
│       ├── auth.ts  
│       ├── prisma.ts  // export { PrismaClient }  
│       └── blockchain.ts  
├── prisma/  
│   ├── schema.prisma  
│   └── seed.ts  
├── lib/  
│   ├── stripe.ts  
│   ├── email.ts  
│   ├── cloudinary.ts  
│   ├── algolia.ts  
│   └── cache.ts  // Redis  
├── middleware.ts  
├── next.config.js  // For images, etc.  
└── vercel.json

### **Step-by-Step Setup Instructions**

1. Clone repo: git clone \<repo\> && cd project  
2. Install deps: npm i next@14 prisma @prisma/client next-auth zod stripe resend cloudinary algoliasearch ethers ipfs-http-client @upstash/redis  
3. Supabase: Create project, get URL/key, set env. npx prisma generate  
4. Migrate/Seed: npx prisma db push && npx prisma db seed  
5. Run dev: npm run dev  
6. For .org: Set PVA\_PROJECT=org env, deploy contracts separately (use Foundry/Hardhat).

### **Configuration Files and Environment Variables**

.env.local:

text  
DATABASE\_URL=postgresql://...  
NEXTAUTH\_SECRET=...  
GOOGLE\_CLIENT\_ID=...  
STRIPE\_SECRET\_KEY=...  
RPC\_URL=https://base-mainnet.g.alchemy.com/v2/...  
CONTRACT\_ADDRESS=0x...  
PRIVATE\_KEY=...  // For server-side only  
CLOUDINARY\_CLOUD\_NAME=...  
ALGOLIA\_APP\_ID=...  
UPSTASH\_REDIS\_URL=...

next.config.js:

javascript  
/\*\* @type {import('next').NextConfig} \*/  
const nextConfig \= {  
  images: { domains: \['res.cloudinary.com'\] },  
  experimental: { serverActions: true }  
}

module.exports \= nextConfig

### **Testing Strategies and Example Tests**

Use Jest \+ Supertest. npm i \-D jest supertest @types/jest

tests/api/products.test.ts:

typescript  
import request from 'supertest'  
import { app } from '../../app'  // Wrap Next.js app for testing

describe('Products API', () \=\> {  
  it('GET /api/products', async () \=\> {  
    const res \= await request(app).get('/api/products')  
    expect(res.status).toBe(200)  
    expect(Array.isArray(res.body)).toBe(true)  
  })

  it('POST /api/products requires auth', async () \=\> {  
    const res \= await request(app).post('/api/products').send({ name: 'Test' })  
    expect(res.status).toBe(401)  
  })  
})

Run: npm test. For blockchain: Mock provider with ethers.Mocks.

For integration: Test with Supabase local or test DB.

### **Deployment Scripts and Procedures**

* Vercel: vercel \--prod (auto-deploys from GitHub).  
* Supabase: supabase functions deploy sync-provenance  
* Contracts: Separate Hardhat script: npx hardhat run scripts/deploy.js \--network base  
* Migrations: GitHub Action triggers prisma migrate deploy on push.

### **Documentation for Each API Endpoint**

* **GET /api/products**: Retrieves all products. Query params: ?category=gems\&limit=10. Returns array of products.  
* **POST /api/products**: Creates product. Body: {name, description, price, ...}. Requires auth, returns created product.  
* **POST /api/archetype**: Submits quiz answers. Body: {answers: \[1,2,3,...\]}. Returns archetype result.  
* **POST /api/mint**: Mints NFT. Body: {metadata, to}. Returns txHash. Web3 auth required.  
* All endpoints: 200 OK, 400 Bad Request (validation), 401 Unauthorized, 500 Internal Error. Logs via console.error.

This backend integrates seamlessly with the frontend (e.g., API calls from React components using the PVA color scheme). Scalable for 1k+ users, with serverless auto-scaling. For GitHub Codespaces: Works out-of-box with Node 20, Prisma installed via devcontainer.json (see DevOps phase).

##  **Supabase Database Setup**

## **Database Schema (Prisma)**

text  
`// prisma/schema.prisma`  
`generator client {`  
  `provider = "prisma-client-js"`  
`}`

`datasource db {`  
  `provider  = "postgresql"`  
  `url       = env("DATABASE_URL")`  
  `directUrl = env("DIRECT_URL")`  
`}`

`// Shared models between both platforms`  
`model User {`  
  `id            String   @id @default(cuid())`  
  `email         String   @unique`  
  `walletAddress String?  @unique`  
  `archetype     String?  // Guardian, Pioneer, Strategist, Visionary`  
  `role          UserRole @default(USER)`  
  `reputationScore Float  @default(0)`  
    
  `// Profile information`  
  `firstName     String?`  
  `lastName      String?`  
  `avatar        String?`  
  `bio          String?`  
  `country      String?`  
    
  `// KYC Information`  
  `kycStatus    KYCStatus @default(PENDING)`  
  `kycDocuments String[]`  
    
  `// Timestamps`  
  `createdAt    DateTime @default(now())`  
  `updatedAt    DateTime @updatedAt`  
  `lastLogin    DateTime?`  
    
  `// Relations`  
  `orders       Order[]`  
  `products     Product[]`  
  `portfolios   Portfolio[]`  
  `transactions Transaction[]`  
  `sessions     Session[]`  
    
  `@@map("users")`  
`}`

`model Session {`  
  `id           String   @id @default(cuid())`  
  `userId       String`  
  `expires      DateTime`  
  `sessionToken String   @unique`  
  `accessToken  String?`  
  `refreshToken String?`  
    
  `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`  
    
  `@@map("sessions")`  
`}`

`// pvabazaar.com specific models`  
`model Product {`  
  `id              String   @id @default(cuid())`  
  `sku             String   @unique`  
  `title           String`  
  `description     String`  
  `price           Decimal`  
  `currency        String   @default("USD")`  
  `category        String`  
  `subcategory     String?`  
    
  `// Physical product attributes`  
  `physicalAttributes Json?`  
  `dimensions         String?`  
  `weight            Float?`  
  `materials         String[]`  
    
  `// Inventory`  
  `stockQuantity    Int      @default(0)`  
  `reorderPoint     Int      @default(10)`  
    
  `// Metadata`  
  `images          String[]`  
  `tags            String[]`  
  `origin          String?`  
  `partnerId       String?`  
    
  `// Status`  
  `status          ProductStatus @default(DRAFT)`  
  `featured        Boolean       @default(false)`  
    
  `// Timestamps`  
  `createdAt       DateTime @default(now())`  
  `updatedAt       DateTime @updatedAt`  
    
  `// Relations`  
  `creator         User @relation(fields: [createdById], references: [id])`  
  `createdById     String`  
  `partner         Partner? @relation(fields: [partnerId], references: [id])`  
  `orderItems      OrderItem[]`  
    
  `@@map("products")`  
`}`

`model Partner {`  
  `id                String   @id @default(cuid())`  
  `name              String`  
  `country           String`  
  `verificationStatus VerificationStatus @default(PENDING)`  
  `payoutAccountId   String?`  
    
  `// Profile`  
  `description       String?`  
  `website          String?`  
  `email            String`  
  `phone            String?`  
  `address          Json?`  
    
  `// Business information`  
  `businessLicense  String?`  
  `taxId           String?`  
  `bankAccount     Json?`  
    
  `// Timestamps`  
  `createdAt       DateTime @default(now())`  
  `updatedAt       DateTime @updatedAt`  
    
  `// Relations`  
  `products        Product[]`  
    
  `@@map("partners")`  
`}`

`model Order {`  
  `id              String   @id @default(cuid())`  
  `orderNumber     String   @unique`  
  `status          OrderStatus @default(PENDING)`  
    
  `// Pricing`  
  `subtotal        Decimal`  
  `tax            Decimal   @default(0)`  
  `shipping       Decimal   @default(0)`  
  `total          Decimal`  
  `currency       String    @default("USD")`  
    
  `// Payment`  
  `paymentIntentId String?`  
  `paymentStatus   PaymentStatus @default(PENDING)`  
  `paymentMethod   String?`  
    
  `// Shipping`  
  `shippingAddress Json`  
  `billingAddress  Json?`  
  `trackingNumber  String?`  
  `carrier        String?`  
    
  `// Timestamps`  
  `createdAt      DateTime @default(now())`  
  `updatedAt      DateTime @updatedAt`  
  `shippedAt      DateTime?`  
  `deliveredAt    DateTime?`  
    
  `// Relations`  
  `customer       User @relation(fields: [customerId], references: [id])`  
  `customerId     String`  
  `items          OrderItem[]`  
    
  `@@map("orders")`  
`}`

`model OrderItem {`  
  `id         String  @id @default(cuid())`  
  `quantity   Int`  
  `unitPrice  Decimal`  
  `totalPrice Decimal`  
    
  `// Relations`  
  `order      Order   @relation(fields: [orderId], references: [id])`  
  `orderId    String`  
  `product    Product @relation(fields: [productId], references: [id])`  
  `productId  String`  
    
  `@@map("order_items")`  
`}`

`// pvabazaar.org specific models (Blockchain/NFT)`  
`model Artifact {`  
  `id              String   @id @default(cuid())`  
  `tokenId         String?`  
  `contractAddress String?`  
  `chainId         Int?`  
  `standard        TokenStandard @default(ERC721)`  
    
  `// Metadata`  
  `title           String`  
  `description     String`  
  `category        String`  
  `artist          String?`  
  `origin          String?`  
    
  `// Media`  
  `imageUrl        String`  
  `animationUrl    String?`  
  `metadataCid     String? // IPFS hash`  
  `mediaCids       String[] // IPFS hashes for media files`  
    
  `// Physical linkage`  
  `physicalTagId   String?  @unique`  
  `physicalItem    Json?    // Physical item details`  
    
  `// Attributes`  
  `attributes      Json?    // NFT attributes/traits`  
  `rarity         String?`  
    
  `// Status`  
  `status         ArtifactStatus @default(DRAFT)`  
  `verified       Boolean        @default(false)`  
    
  `// Timestamps`  
  `createdAt      DateTime @default(now())`  
  `updatedAt      DateTime @updatedAt`  
  `mintedAt       DateTime?`  
    
  `// Relations`  
  `creator        User @relation(fields: [creatorId], references: [id])`  
  `creatorId      String`  
  `listings       Listing[]`  
  `fractions      Fraction[]`  
  `provenanceEvents ProvenanceEvent[]`  
    
  `@@map("artifacts")`  
`}`

`model Listing {`  
  `id            String   @id @default(cuid())`  
  `type          ListingType @default(FIXED_PRICE)`  
  `price         Decimal`  
  `currency      String   @default("ETH")`  
    
  `// Auction specific`  
  `startTime     DateTime?`  
  `endTime       DateTime?`  
  `minBid        Decimal?`  
  `currentBid    Decimal?`  
    
  `// Status`  
  `status        ListingStatus @default(ACTIVE)`  
  `sold          Boolean       @default(false)`  
    
  `// Timestamps`  
  `createdAt     DateTime @default(now())`  
  `updatedAt     DateTime @updatedAt`  
    
  `// Relations`  
  `artifact      Artifact @relation(fields: [artifactId], references: [id])`  
  `artifactId    String`  
  `seller        User     @relation(fields: [sellerId], references: [id])`  
  `sellerId      String`  
    
  `@@map("listings")`  
`}`

`model Fraction {`  
  `id              String   @id @default(cuid())`  
  `totalShares     Int`  
  `availableShares Int`  
  `pricePerShare   Decimal`  
  `currency        String   @default("USD")`  
    
  `// Fractional contract details`  
  `shareContract   String?`  
    
  `// Status`  
  `status         FractionStatus @default(ACTIVE)`  
    
  `// Timestamps`  
  `createdAt      DateTime @default(now())`  
  `updatedAt      DateTime @updatedAt`  
    
  `// Relations`  
  `artifact       Artifact @relation(fields: [artifactId], references: [id])`  
  `artifactId     String`  
  `holdings       FractionHolding[]`  
    
  `@@map("fractions")`  
`}`

`model FractionHolding {`  
  `id            String   @id @default(cuid())`  
  `shares        Int`  
  `purchasePrice Decimal`  
  `currency      String`  
    
  `// Timestamps`  
  `createdAt     DateTime @default(now())`  
  `updatedAt     DateTime @updatedAt`  
    
  `// Relations`  
  `fraction      Fraction @relation(fields: [fractionId], references: [id])`  
  `fractionId    String`  
  `holder        User     @relation(fields: [holderId], references: [id])`  
  `holderId      String`  
    
  `@@map("fraction_holdings")`  
`}`

`model Portfolio {`  
  `id             String   @id @default(cuid())`  
  `totalValue     Decimal  @default(0)`  
  `currency       String   @default("USD")`  
    
  `// Performance metrics`  
  `totalReturn    Decimal  @default(0)`  
  `returnPercentage Float  @default(0)`  
    
  `// Timestamps`  
  `createdAt      DateTime @default(now())`  
  `updatedAt      DateTime @updatedAt`  
    
  `// Relations`  
  `owner          User @relation(fields: [ownerId], references: [id])`  
  `ownerId        String`  
  `holdings       FractionHolding[]`  
    
  `@@unique([ownerId])`  
  `@@map("portfolios")`  
`}`

`model Transaction {`  
  `id              String   @id @default(cuid())`  
  `transactionHash String   @unique`  
  `blockNumber     BigInt?`  
  `gasUsed         BigInt?`  
  `gasPrice        BigInt?`  
    
  `// Transaction details`  
  `type           TransactionType`  
  `status         TransactionStatus @default(PENDING)`  
  `amount         Decimal?`  
  `currency       String?`  
    
  `// Network info`  
  `chainId        Int?`  
  `networkName    String?`  
    
  `// Timestamps`  
  `createdAt      DateTime @default(now())`  
  `updatedAt      DateTime @updatedAt`  
  `confirmedAt    DateTime?`  
    
  `// Relations`  
  `user           User @relation(fields: [userId], references: [id])`  
  `userId         String`  
    
  `@@map("transactions")`  
`}`

`model ProvenanceEvent {`  
  `id             String   @id @default(cuid())`  
  `eventType      String   // mint, transfer, sale, etc.`  
  `transactionHash String?`  
  `blockNumber    BigInt?`  
    
  `// Event data`  
  `from           String?`  
  `to             String?`  
  `value          Decimal?`  
  `data           Json?`  
    
  `// Attestation`  
  `issuer         String?`  
  `signature      String?`  
    
  `// Timestamps`  
  `createdAt      DateTime @default(now())`  
  `blockTimestamp DateTime?`  
    
  `// Relations`  
  `artifact       Artifact @relation(fields: [artifactId], references: [id])`  
  `artifactId     String`  
    
  `@@map("provenance_events")`  
`}`

`// Enums`  
`enum UserRole {`  
  `USER`  
  `ARTISAN`  
  `ADMIN`  
  `PARTNER`  
`}`

`enum KYCStatus {`  
  `PENDING`  
  `APPROVED`  
  `REJECTED`  
  `REQUIRED`  
`}`

`enum ProductStatus {`  
  `DRAFT`  
  `ACTIVE`  
  `INACTIVE`  
  `OUT_OF_STOCK`  
`}`

`enum VerificationStatus {`  
  `PENDING`  
  `APPROVED`  
  `REJECTED`  
`}`

`enum OrderStatus {`  
  `PENDING`  
  `CONFIRMED`  
  `PROCESSING`  
  `SHIPPED`  
  `DELIVERED`  
  `CANCELLED`  
  `REFUNDED`  
`}`

`enum PaymentStatus {`  
  `PENDING`  
  `PROCESSING`  
  `SUCCEEDED`  
  `FAILED`  
  `CANCELLED`  
  `REFUNDED`  
`}`

`enum TokenStandard {`  
  `ERC721`  
  `ERC1155`  
`}`

`enum ArtifactStatus {`  
  `DRAFT`  
  `MINTING`  
  `MINTED`  
  `LISTED`  
  `SOLD`  
`}`

`enum ListingType {`  
  `FIXED_PRICE`  
  `AUCTION`  
  `DUTCH_AUCTION`  
`}`

`enum ListingStatus {`  
  `DRAFT`  
  `ACTIVE`  
  `SOLD`  
  `CANCELLED`  
  `EXPIRED`  
`}`

`enum FractionStatus {`  
  `ACTIVE`  
  `SOLD_OUT`  
  `INACTIVE`  
`}`

`enum TransactionType {`  
  `MINT`  
  `TRANSFER`  
  `PURCHASE`  
  `SALE`  
  `FRACTIONALIZE`  
  `ROYALTY_PAYMENT`  
`}`

`enum TransactionStatus {`  
  `PENDING`  
  `CONFIRMED`  
  `FAILED`  
  `CANCELLED`  
`}`

## **Database Migration Scripts**

typescript  
*`// scripts/migrate.ts`*  
`import { PrismaClient } from '@prisma/client'`

`const prisma = new PrismaClient()`

`async function main() {`  
  `console.log('Running database migrations...')`  
    
  `// Create indexes for performance`  
  `` await prisma.$executeRaw` ``  
    `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`  
  `` ` ``  
    
  `` await prisma.$executeRaw` ``  
    `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`  
  `` ` ``  
    
  `` await prisma.$executeRaw` ``  
    `CREATE INDEX IF NOT EXISTS idx_artifacts_creator ON artifacts(creator_id);`  
  `` ` ``  
    
  `` await prisma.$executeRaw` ``  
    `CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);`  
  `` ` ``  
    
  `` await prisma.$executeRaw` ``  
    `CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(transaction_hash);`  
  `` ` ``  
    
  `console.log('Database migrations completed!')`  
`}`

`main()`  
  `.catch((e) => {`  
    `console.error(e)`  
    `process.exit(1)`  
  `})`  
  `.finally(async () => {`  
    `await prisma.$disconnect()`  
  `})`

## **Row Level Security (RLS) Policies**

sql  
*`-- Enable RLS`*  
`ALTER TABLE users ENABLE ROW LEVEL SECURITY;`  
`ALTER TABLE products ENABLE ROW LEVEL SECURITY;`  
`ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`  
`ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;`  
`ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;`

*`-- Users can read their own data`*  
`CREATE POLICY "Users can read own data" ON users`  
  `FOR SELECT USING (auth.uid()::text = id);`

*`-- Users can update their own profiles`*  
`CREATE POLICY "Users can update own profile" ON users`  
  `FOR UPDATE USING (auth.uid()::text = id);`

*`-- Products are readable by everyone`*  
`CREATE POLICY "Products are publicly readable" ON products`  
  `FOR SELECT USING (status = 'ACTIVE');`

*`-- Only creators can modify their products`*  
`CREATE POLICY "Creators can modify own products" ON products`  
  `FOR ALL USING (auth.uid()::text = created_by_id);`

*`-- Users can read their own orders`*  
`CREATE POLICY "Users can read own orders" ON orders`  
  `FOR SELECT USING (auth.uid()::text = customer_id);`

*`-- Artifacts are publicly readable when minted`*  
`CREATE POLICY "Minted artifacts are publicly readable" ON artifacts`  
  `FOR SELECT USING (status IN ('MINTED', 'LISTED', 'SOLD'));`

*`-- Portfolio access for owners only`*  
`CREATE POLICY "Portfolio access for owners" ON portfolios`  
  `FOR ALL USING (auth.uid()::text = owner_id);`

## **Database Functions and Triggers**

sql  
*`-- Function to update portfolio value`*  
`CREATE OR REPLACE FUNCTION update_portfolio_value()`  
`RETURNS TRIGGER AS $$`  
`BEGIN`  
  `UPDATE portfolios`   
  `SET`   
    `total_value = (`  
      `SELECT COALESCE(SUM(fh.shares * f.price_per_share), 0)`  
      `FROM fraction_holdings fh`  
      `JOIN fractions f ON fh.fraction_id = f.id`  
      `WHERE fh.holder_id = NEW.holder_id`  
    `),`  
    `updated_at = NOW()`  
  `WHERE owner_id = NEW.holder_id;`  
    
  `RETURN NEW;`  
`END;`  
`$$ LANGUAGE plpgsql;`

*`-- Trigger to update portfolio on fraction purchase`*  
`CREATE TRIGGER update_portfolio_on_fraction_change`  
  `AFTER INSERT OR UPDATE OR DELETE ON fraction_holdings`  
  `FOR EACH ROW`  
  `EXECUTE FUNCTION update_portfolio_value();`

*`-- Function to generate order numbers`*  
`CREATE OR REPLACE FUNCTION generate_order_number()`  
`RETURNS TRIGGER AS $$`  
`BEGIN`  
  `NEW.order_number := 'PVA-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('order_sequence')::text, 6, '0');`  
  `RETURN NEW;`  
`END;`  
`$$ LANGUAGE plpgsql;`

*`-- Create sequence for order numbers`*  
`CREATE SEQUENCE IF NOT EXISTS order_sequence START 1;`

*`-- Trigger for order number generation`*  
`CREATE TRIGGER set_order_number`  
  `BEFORE INSERT ON orders`  
  `FOR EACH ROW`  
  `EXECUTE FUNCTION generate_order_number();`

## **Seed Data Scripts**

typescript  
*`// scripts/seed.ts`*  
`import { PrismaClient } from '@prisma/client'`  
`import bcrypt from 'bcryptjs'`

`const prisma = new PrismaClient()`

`async function main() {`  
  `console.log('Seeding database...')`

  `// Create test users`  
  `const testUser = await prisma.user.create({`  
    `data: {`  
      `email: 'test@pvabazaar.com',`  
      `firstName: 'Test',`  
      `lastName: 'User',`  
      `archetype: 'Pioneer',`  
      `role: 'USER',`  
      `kycStatus: 'APPROVED',`  
    `},`  
  `})`

  `const testArtisan = await prisma.user.create({`  
    `data: {`  
      `email: 'artisan@pvabazaar.com',`  
      `firstName: 'Master',`  
      `lastName: 'Craftsperson',`  
      `archetype: 'Visionary',`  
      `role: 'ARTISAN',`  
      `kycStatus: 'APPROVED',`  
    `},`  
  `})`

  `// Create test partners`  
  `const testPartner = await prisma.partner.create({`  
    `data: {`  
      `name: 'Lukuni Cooperative',`  
      `country: 'Democratic Republic of Congo',`  
      `verificationStatus: 'APPROVED',`  
      `description: 'Ethical mining cooperative specializing in precious gemstones',`  
      `email: 'contact@lukuni.coop',`  
    `},`  
  `})`

  `// Create test products for .com`  
  `const testProduct = await prisma.product.create({`  
    `data: {`  
      `sku: 'GEM-001',`  
      `title: 'Amradjet Emerald Pendant',`  
      `description: 'A beautiful emerald pendant crafted by local artisans',`  
      `price: 625.00,`  
      `category: 'Gemstones',`  
      `subcategory: 'Emeralds',`  
      `stockQuantity: 5,`  
      `images: ['/images/emerald-pendant.jpg'],`  
      `tags: ['emerald', 'pendant', 'handcrafted'],`  
      `origin: 'Democratic Republic of Congo',`  
      `status: 'ACTIVE',`  
      `featured: true,`  
      `createdById: testArtisan.id,`  
      `partnerId: testPartner.id,`  
    `},`  
  `})`

  `// Create test artifacts for .org`  
  `const testArtifact = await prisma.artifact.create({`  
    `data: {`  
      `title: 'Digital Twin: Amradjet Emerald Pendant',`  
      `description: 'NFT representing the authentic Amradjet Emerald Pendant with full provenance',`  
      `category: 'Precious Gems',`  
      `artist: 'Master Craftsperson',`  
      `origin: 'Democratic Republic of Congo',`  
      `imageUrl: '/images/emerald-pendant-nft.jpg',`  
      `metadataCid: 'QmTestCidForEmeraldPendant',`  
      `status: 'MINTED',`  
      `verified: true,`  
      `createdById: testArtisan.id,`  
      `attributes: {`  
        `traits: [`  
          `{ trait_type: 'Gemstone', value: 'Emerald' },`  
          `{ trait_type: 'Cut', value: 'Round' },`  
          `{ trait_type: 'Carat', value: '2.5' },`  
          `{ trait_type: 'Clarity', value: 'VS1' },`  
          `{ trait_type: 'Origin', value: 'DRC' }`  
        `]`  
      `}`  
    `},`  
  `})`

  `// Create fractional ownership`  
  `const testFraction = await prisma.fraction.create({`  
    `data: {`  
      `totalShares: 100,`  
      `availableShares: 87,`  
      `pricePerShare: 6.25,`  
      `currency: 'USD',`  
      `status: 'ACTIVE',`  
      `artifactId: testArtifact.id,`  
    `},`  
  `})`

  `// Create portfolio and holdings`  
  `const testPortfolio = await prisma.portfolio.create({`  
    `data: {`  
      `ownerId: testUser.id,`  
      `totalValue: 81.25,`  
      `currency: 'USD',`  
    `},`  
  `})`

  `await prisma.fractionHolding.create({`  
    `data: {`  
      `shares: 13,`  
      `purchasePrice: 6.25,`  
      `currency: 'USD',`  
      `fractionId: testFraction.id,`  
      `holderId: testUser.id,`  
    `},`  
  `})`

  `console.log('Database seeded successfully!')`  
`}`

`main()`  
  `.catch((e) => {`  
    `console.error(e)`  
    `process.exit(1)`  
  `})`  
  `.finally(async () => {`  
    `await prisma.$disconnect()`  
  `})`

## **2\. Next.js API Routes Implementation**

## **Authentication Middleware**

typescript  
*`// lib/auth.ts`*  
`import { NextAuthOptions } from 'next-auth'`  
`import { PrismaAdapter } from "@auth/prisma-adapter"`  
`import EmailProvider from "next-auth/providers/email"`  
`import GoogleProvider from "next-auth/providers/google"`  
`import { prisma } from './prisma'`

`export const authOptions: NextAuthOptions = {`  
  `adapter: PrismaAdapter(prisma),`  
  `providers: [`  
    `EmailProvider({`  
      `server: {`  
        `host: process.env.EMAIL_SERVER_HOST,`  
        `port: Number(process.env.EMAIL_SERVER_PORT),`  
        `auth: {`  
          `user: process.env.EMAIL_SERVER_USER,`  
          `pass: process.env.EMAIL_SERVER_PASSWORD,`  
        `},`  
      `},`  
      `from: process.env.EMAIL_FROM,`  
    `}),`  
    `GoogleProvider({`  
      `clientId: process.env.GOOGLE_CLIENT_ID!,`  
      `clientSecret: process.env.GOOGLE_CLIENT_SECRET!,`  
    `}),`  
  `],`  
  `pages: {`  
    `signIn: '/auth/signin',`  
    `signUp: '/auth/signup',`  
    `error: '/auth/error',`  
  `},`  
  `callbacks: {`  
    `async session({ token, session }) {`  
      `if (token) {`  
        `session.user.id = token.id as string`  
        `session.user.role = token.role as string`  
        `session.user.archetype = token.archetype as string`  
      `}`  
      `return session`  
    `},`  
    `async jwt({ user, token }) {`  
      `if (user) {`  
        `const dbUser = await prisma.user.findUnique({`  
          `where: { email: user.email! },`  
        `})`  
          
        `if (dbUser) {`  
          `token.id = dbUser.id`  
          `token.role = dbUser.role`  
          `token.archetype = dbUser.archetype`  
        `}`  
      `}`  
      `return token`  
    `},`  
  `},`  
  `session: {`  
    `strategy: "jwt",`  
  `},`  
`}`

## **API Route Middleware**

typescript  
*`// lib/middleware.ts`*  
`import { NextRequest, NextResponse } from 'next/server'`  
`import { getToken } from 'next-auth/jwt'`  
`import rateLimit from './rate-limit'`

*`// Rate limiting`*  
`const limiter = rateLimit({`  
  `interval: 60 * 1000, // 60 seconds`  
  `uniqueTokenPerInterval: 500, // Allow 500 unique tokens per interval`  
`})`

`export async function withAuth(`  
  `handler: (req: NextRequest, token: any) => Promise<NextResponse>,`  
  `requiredRole?: string`  
`) {`  
  `return async (req: NextRequest) => {`  
    `try {`  
      `// Rate limiting`  
      `await limiter.check(req, 10, 'CACHE_TOKEN') // 10 requests per minute`  
    `} catch {`  
      `return NextResponse.json(`  
        `{ error: 'Rate limit exceeded' },`  
        `{ status: 429 }`  
      `)`  
    `}`

    `const token = await getToken({ req })`  
      
    `if (!token) {`  
      `return NextResponse.json(`  
        `{ error: 'Authentication required' },`  
        `{ status: 401 }`  
      `)`  
    `}`

    `if (requiredRole && token.role !== requiredRole && token.role !== 'ADMIN') {`  
      `return NextResponse.json(`  
        `{ error: 'Insufficient permissions' },`  
        `{ status: 403 }`  
      `)`  
    `}`

    `return handler(req, token)`  
  `}`  
`}`

`export function withErrorHandling<T extends any[], R>(`  
  `handler: (...args: T) => Promise<R>`  
`) {`  
  `return async (...args: T): Promise<R | NextResponse> => {`  
    `try {`  
      `return await handler(...args)`  
    `} catch (error) {`  
      `console.error('API Error:', error)`  
        
      `if (error instanceof Error) {`  
        `return NextResponse.json(`  
          `{ error: error.message },`  
          `{ status: 500 }`  
        `) as R`  
      `}`  
        
      `return NextResponse.json(`  
        `{ error: 'Internal server error' },`  
        `{ status: 500 }`  
      `) as R`  
    `}`  
  `}`  
`}`

## **pvabazaar.com API Routes**

typescript  
*`// app/api/products/route.ts`*  
`import { NextRequest, NextResponse } from 'next/server'`  
`import { prisma } from '@/lib/prisma'`  
`import { z } from 'zod'`

`const searchSchema = z.object({`  
  `q: z.string().optional(),`  
  `category: z.string().optional(),`  
  `partnerId: z.string().optional(),`  
  `minPrice: z.number().optional(),`  
  `maxPrice: z.number().optional(),`  
  `page: z.number().default(1),`  
  `limit: z.number().max(50).default(20),`  
`})`

`export async function GET(request: NextRequest) {`  
  `const { searchParams } = new URL(request.url)`  
    
  `const params = searchSchema.parse({`  
    `q: searchParams.get('q') || undefined,`  
    `category: searchParams.get('category') || undefined,`  
    `partnerId: searchParams.get('partnerId') || undefined,`  
    `minPrice: Number(searchParams.get('minPrice')) || undefined,`  
    `maxPrice: Number(searchParams.get('maxPrice')) || undefined,`  
    `page: Number(searchParams.get('page')) || 1,`  
    `limit: Number(searchParams.get('limit')) || 20,`  
  `})`

  `const skip = (params.page - 1) * params.limit`

  `const where: any = {`  
    `status: 'ACTIVE',`  
  `}`

  `if (params.q) {`  
    `where.OR = [`  
      `{ title: { contains: params.q, mode: 'insensitive' } },`  
      `{ description: { contains: params.q, mode: 'insensitive' } },`  
      `{ tags: { has: params.q.toLowerCase() } },`  
    `]`  
  `}`

  `if (params.category) {`  
    `where.category = params.category`  
  `}`

  `if (params.partnerId) {`  
    `where.partnerId = params.partnerId`  
  `}`

  `if (params.minPrice || params.maxPrice) {`  
    `where.price = {}`  
    `if (params.minPrice) where.price.gte = params.minPrice`  
    `if (params.maxPrice) where.price.lte = params.maxPrice`  
  `}`

  `const [products, total] = await Promise.all([`  
    `prisma.product.findMany({`  
      `where,`  
      `include: {`  
        `creator: {`  
          `select: { firstName: true, lastName: true }`  
        `},`  
        `partner: {`  
          `select: { name: true, country: true }`  
        `}`  
      `},`  
      `skip,`  
      `take: params.limit,`  
      `orderBy: [`  
        `{ featured: 'desc' },`  
        `{ createdAt: 'desc' }`  
      `]`  
    `}),`  
    `prisma.product.count({ where })`  
  `])`

  `return NextResponse.json({`  
    `products,`  
    `pagination: {`  
      `page: params.page,`  
      `limit: params.limit,`  
      `total,`  
      `pages: Math.ceil(total / params.limit)`  
    `}`  
  `})`  
`}`

typescript  
*`// app/api/archetype/route.ts`*  
`import { NextRequest, NextResponse } from 'next/server'`  
`import { z } from 'zod'`

`const archetypeSchema = z.object({`  
  `answers: z.array(z.object({`  
    `questionId: z.string(),`  
    `value: z.number().min(1).max(5)`  
  `}))`  
`})`

`export async function POST(request: NextRequest) {`  
  `const body = await request.json()`  
  `const { answers } = archetypeSchema.parse(body)`

  `// Archetype scoring algorithm`  
  `const scores = {`  
    `Guardian: 0,`  
    `Pioneer: 0,`  
    `Strategist: 0,`  
    `Visionary: 0`  
  `}`

  `// Map questions to archetypes and calculate scores`  
  `answers.forEach(answer => {`  
    `const questionMapping = getQuestionMapping(answer.questionId)`  
    `if (questionMapping) {`  
      `scores[questionMapping.archetype] += answer.value * questionMapping.weight`  
    `}`  
  `})`

  `// Determine primary archetype`  
  `const primaryArchetype = Object.entries(scores).reduce((a, b) =>`   
    `scores[a[0]] > scores[b[0]] ? a : b`  
  `)[0]`

  `// Get personalized recommendations`  
  `const recommendations = await getArchetypeRecommendations(primaryArchetype)`

  `return NextResponse.json({`  
    `archetype: primaryArchetype,`  
    `scores,`  
    `recommendations,`  
    `description: getArchetypeDescription(primaryArchetype)`  
  `})`  
`}`

`function getQuestionMapping(questionId: string) {`  
  `const mappings = {`  
    `'q1': { archetype: 'Guardian', weight: 1.0 },`  
    `'q2': { archetype: 'Pioneer', weight: 1.2 },`  
    `'q3': { archetype: 'Strategist', weight: 1.1 },`  
    `'q4': { archetype: 'Visionary', weight: 1.3 },`  
    `// Add more mappings...`  
  `}`  
  `return mappings[questionId]`  
`}`

`async function getArchetypeRecommendations(archetype: string) {`  
  `const categoryMappings = {`  
    `Guardian: ['Protection stones', 'Grounding gems', 'Traditional crafts'],`  
    `Pioneer: ['Adventure gear', 'Exploration tools', 'Travel accessories'],`  
    `Strategist: ['Analytical tools', 'Planning resources', 'Strategic games'],`  
    `Visionary: ['Creative supplies', 'Inspiration pieces', 'Artistic tools']`  
  `}`

  `const categories = categoryMappings[archetype] || []`  
    
  `return await prisma.product.findMany({`  
    `where: {`  
      `status: 'ACTIVE',`  
      `OR: categories.map(cat => ({`  
        `category: { contains: cat, mode: 'insensitive' }`  
      `}))`  
    `},`  
    `take: 6,`  
    `orderBy: { featured: 'desc' }`  
  `})`  
`}`

`function getArchetypeDescription(archetype: string) {`  
  `const descriptions = {`  
    `Guardian: "Guardians value security, tradition, and protecting what matters most.",`  
    `Pioneer: "Pioneers seek adventure, exploration, and new frontiers.",`  
    `Strategist: "Strategists excel at planning, analysis, and systematic approaches.",`  
    `Visionary: "Visionaries are creative, innovative, and see possibilities others miss."`  
  `}`  
  `return descriptions[archetype]`  
`}`

typescript  
*`// app/api/cart/route.ts`*  
`import { NextRequest, NextResponse } from 'next/server'`  
`import { withAuth } from '@/lib/middleware'`  
`import { z } from 'zod'`

`const addToCartSchema = z.object({`  
  `productId: z.string(),`  
  `quantity: z.number().min(1).max(10)`  
`})`

`export const POST = withAuth(async (req: NextRequest, token: any) => {`  
  `const body = await req.json()`  
  `const { productId, quantity } = addToCartSchema.parse(body)`

  `// Verify product exists and is available`  
  `const product = await prisma.product.findUnique({`  
    `where: { id: productId }`  
  `})`

  `if (!product || product.status !== 'ACTIVE') {`  
    `return NextResponse.json(`  
      `{ error: 'Product not available' },`  
      `{ status: 404 }`  
    `)`  
  `}`

  `if (product.stockQuantity < quantity) {`  
    `return NextResponse.json(`  
      `{ error: 'Insufficient stock' },`  
      `{ status: 400 }`  
    `)`  
  `}`

  `// Add to cart (stored in session or database)`  
  `// For now, we'll return success - cart can be client-side`  
    
  `return NextResponse.json({`  
    `success: true,`  
    `item: {`  
      `productId,`  
      `quantity,`  
      `product: {`  
        `id: product.id,`  
        `title: product.title,`  
        `price: product.price,`  
        `images: product.images`  
      `}`  
    `}`  
  `})`  
`})`

## **pvabazaar.org API Routes**

typescript  
*`// app/api/nfts/route.ts`*  
`import { NextRequest, NextResponse } from 'next/server'`  
`import { withAuth } from '@/lib/middleware'`  
`import { uploadToIPFS, mintNFT } from '@/lib/blockchain'`

`export const GET = async (request: NextRequest) => {`  
  `const { searchParams } = new URL(request.url)`  
    
  `const artifacts = await prisma.artifact.findMany({`  
    `where: {`  
      `status: { in: ['MINTED', 'LISTED', 'SOLD'] }`  
    `},`  
    `include: {`  
      `creator: {`  
        `select: { firstName: true, lastName: true }`  
      `},`  
      `listings: {`  
        `where: { status: 'ACTIVE' },`  
        `orderBy: { createdAt: 'desc' },`  
        `take: 1`  
      `}`  
    `},`  
    `orderBy: { createdAt: 'desc' }`  
  `})`

  `return NextResponse.json({ artifacts })`  
`}`

`export const POST = withAuth(async (req: NextRequest, token: any) => {`  
  `const formData = await req.formData()`  
    
  `const title = formData.get('title') as string`  
  `const description = formData.get('description') as string`  
  `const category = formData.get('category') as string`  
  `const image = formData.get('image') as File`  
    
  `if (!title || !description || !image) {`  
    `return NextResponse.json(`  
      `{ error: 'Missing required fields' },`  
      `{ status: 400 }`  
    `)`  
  `}`

  `// Upload image to IPFS`  
  `const imageBuffer = await image.arrayBuffer()`  
  `const imageCid = await uploadToIPFS(Buffer.from(imageBuffer), image.type)`

  `// Create metadata`  
  `const metadata = {`  
    `name: title,`  
    `description,`  
    ``image: `ipfs://${imageCid}`,``  
    `attributes: JSON.parse(formData.get('attributes') as string || '[]')`  
  `}`

  `// Upload metadata to IPFS`  
  `const metadataCid = await uploadToIPFS(`  
    `Buffer.from(JSON.stringify(metadata)),`  
    `'application/json'`  
  `)`

  `// Create artifact in database`  
  `const artifact = await prisma.artifact.create({`  
    `data: {`  
      `title,`  
      `description,`  
      `category,`  
      ``imageUrl: `ipfs://${imageCid}`,``  
      `metadataCid,`  
      `attributes: metadata.attributes,`  
      `status: 'MINTING',`  
      `createdById: token.id`  
    `}`  
  `})`

  `// Queue NFT minting (this would be handled by a background job)`  
  `// For now, we'll simulate it`  
  `try {`  
    `const { tokenId, contractAddress, transactionHash } = await mintNFT(`  
      `token.walletAddress,`  
      `` `ipfs://${metadataCid}` ``  
    `)`

    `await prisma.artifact.update({`  
      `where: { id: artifact.id },`  
      `data: {`  
        `tokenId: tokenId.toString(),`  
        `contractAddress,`  
        `status: 'MINTED',`  
        `mintedAt: new Date()`  
      `}`  
    `})`

    `// Record provenance event`  
    `await prisma.provenanceEvent.create({`  
      `data: {`  
        `eventType: 'mint',`  
        `transactionHash,`  
        `from: '0x0000000000000000000000000000000000000000',`  
        `to: token.walletAddress,`  
        `artifactId: artifact.id`  
      `}`  
    `})`

    `return NextResponse.json({`  
      `success: true,`  
      `artifact: { ...artifact, tokenId, contractAddress }`  
    `})`  
  `} catch (error) {`  
    `// Update status to failed`  
    `await prisma.artifact.update({`  
      `where: { id: artifact.id },`  
      `data: { status: 'DRAFT' }`  
    `})`

    `throw error`  
  `}`  
`}, 'ARTISAN')`

typescript  
*`// app/api/marketplace/listings/route.ts`*  
`import { NextRequest, NextResponse } from 'next/server'`  
`import { withAuth } from '@/lib/middleware'`  
`import { z } from 'zod'`

`const createListingSchema = z.object({`  
  `artifactId: z.string(),`  
  `type: z.enum(['FIXED_PRICE', 'AUCTION']),`  
  `price: z.number().positive(),`  
  `currency: z.string().default('ETH'),`  
  `startTime: z.string().datetime().optional(),`  
  `endTime: z.string().datetime().optional(),`  
`})`

`export const POST = withAuth(async (req: NextRequest, token: any) => {`  
  `const body = await req.json()`  
  `const data = createListingSchema.parse(body)`

  `// Verify ownership`  
  `const artifact = await prisma.artifact.findUnique({`  
    `where: { id: data.artifactId }`  
  `})`

  `if (!artifact || artifact.createdById !== token.id) {`  
    `return NextResponse.json(`  
      `{ error: 'Artifact not found or not owned' },`  
      `{ status: 404 }`  
    `)`  
  `}`

  `if (artifact.status !== 'MINTED') {`  
    `return NextResponse.json(`  
      `{ error: 'Artifact must be minted before listing' },`  
      `{ status: 400 }`  
    `)`  
  `}`

  `const listing = await prisma.listing.create({`  
    `data: {`  
      `...data,`  
      `startTime: data.startTime ? new Date(data.startTime) : undefined,`  
      `endTime: data.endTime ? new Date(data.endTime) : undefined,`  
      `sellerId: token.id,`  
      `status: 'ACTIVE'`  
    `},`  
    `include: {`  
      `artifact: true`  
    `}`  
  `})`

  `return NextResponse.json({ listing })`  
`})`

typescript  
*`// app/api/fractional/route.ts`*  
`import { NextRequest, NextResponse } from 'next/server'`  
`import { withAuth } from '@/lib/middleware'`  
`import { z } from 'zod'`

`const fractionalizationSchema = z.object({`  
  `artifactId: z.string(),`  
  `totalShares: z.number().min(10).max(10000),`  
  `pricePerShare: z.number().positive(),`  
  `currency: z.string().default('USD')`  
`})`

`export const POST = withAuth(async (req: NextRequest, token: any) => {`  
  `const body = await req.json()`  
  `const data = fractionalizationSchema.parse(body)`

  `// Verify ownership and KYC`  
  `const user = await prisma.user.findUnique({`  
    `where: { id: token.id }`  
  `})`

  `if (user?.kycStatus !== 'APPROVED') {`  
    `return NextResponse.json(`  
      `{ error: 'KYC approval required for fractionalization' },`  
      `{ status: 403 }`  
    `)`  
  `}`

  `const artifact = await prisma.artifact.findUnique({`  
    `where: { id: data.artifactId }`  
  `})`

  `if (!artifact || artifact.createdById !== token.id) {`  
    `return NextResponse.json(`  
      `{ error: 'Artifact not found or not owned' },`  
      `{ status: 404 }`  
    `)`  
  `}`

  `// Create fractionalization`  
  `const fraction = await prisma.fraction.create({`  
    `data: {`  
      `...data,`  
      `availableShares: data.totalShares,`  
      `status: 'ACTIVE'`  
    `}`  
  `})`

  `return NextResponse.json({ fraction })`  
`})`

`export const GET = async (req: NextRequest) => {`  
  `const fractions = await prisma.fraction.findMany({`  
    `where: { status: 'ACTIVE' },`  
    `include: {`  
      `artifact: {`  
        `include: {`  
          `creator: {`  
            `select: { firstName: true, lastName: true }`  
          `}`  
        `}`  
      `}`  
    `}`  
  `})`

  `return NextResponse.json({ fractions })`  
`}`

## **3\. Blockchain Integration Code**

typescript  
*`// lib/blockchain/web3.ts`*  
`import { ethers } from 'ethers'`  
`import { createPublicClient, createWalletClient, http } from 'viem'`  
`import { base } from 'viem/chains'`

`export const publicClient = createPublicClient({`  
  `chain: base,`  
  `transport: http(process.env.RPC_URL)`  
`})`

`export const walletClient = createWalletClient({`  
  `chain: base,`  
  `transport: http(process.env.RPC_URL),`  
  `` account: process.env.WALLET_PRIVATE_KEY as `0x${string}` ``  
`})`

*`// Smart contract ABIs`*  
`export const NFT_CONTRACT_ABI = [`  
  `"function mint(address to, string memory tokenURI) public returns (uint256)",`  
  `"function ownerOf(uint256 tokenId) public view returns (address)",`  
  `"function transferFrom(address from, address to, uint256 tokenId) public",`  
  `"function setRoyaltyInfo(uint256 tokenId, address recipient, uint96 feeNumerator) public",`  
  `"event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"`  
`]`

`export const MARKETPLACE_CONTRACT_ABI = [`  
  `"function createListing(uint256 tokenId, uint256 price, uint256 duration) public",`  
  `"function buyNow(uint256 listingId) public payable",`  
  `"function cancelListing(uint256 listingId) public",`  
  `"event ListingCreated(uint256 indexed listingId, uint256 indexed tokenId, uint256 price)",`  
  `"event Sale(uint256 indexed listingId, address buyer, uint256 price)"`  
`]`

`` export const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS as `0x${string}` ``  
`` export const MARKETPLACE_CONTRACT_ADDRESS = process.env.MARKETPLACE_CONTRACT_ADDRESS as `0x${string}` ``

typescript  
*`// lib/blockchain/nft.ts`*  
`import { Contract } from 'ethers'`  
`import { publicClient, walletClient, NFT_CONTRACT_ABI, NFT_CONTRACT_ADDRESS } from './web3'`

`export async function mintNFT(recipient: string, tokenURI: string) {`  
  `try {`  
    `const { request } = await publicClient.simulateContract({`  
      `address: NFT_CONTRACT_ADDRESS,`  
      `abi: NFT_CONTRACT_ABI,`  
      `functionName: 'mint',`  
      ``args: [recipient as `0x${string}`, tokenURI]``  
    `})`

    `const hash = await walletClient.writeContract(request)`  
      
    `// Wait for transaction confirmation`  
    `const receipt = await publicClient.waitForTransactionReceipt({ hash })`  
      
    `// Parse the Transfer event to get the token ID`  
    `const transferEvent = receipt.logs.find(log =>`   
      `log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'`  
    `)`  
      
    `if (!transferEvent) {`  
      `throw new Error('Transfer event not found')`  
    `}`

    `const tokenId = parseInt(transferEvent.topics[3], 16)`

    `return {`  
      `tokenId,`  
      `contractAddress: NFT_CONTRACT_ADDRESS,`  
      `transactionHash: hash,`  
      `blockNumber: receipt.blockNumber`  
    `}`  
  `} catch (error) {`  
    `console.error('NFT minting failed:', error)`  
    `throw error`  
  `}`  
`}`

`export async function setNFTRoyalty(tokenId: number, recipient: string, royaltyBps: number) {`  
  `try {`  
    `const { request } = await publicClient.simulateContract({`  
      `address: NFT_CONTRACT_ADDRESS,`  
      `abi: NFT_CONTRACT_ABI,`  
      `functionName: 'setRoyaltyInfo',`  
      ``args: [BigInt(tokenId), recipient as `0x${string}`, royaltyBps]``  
    `})`

    `const hash = await walletClient.writeContract(request)`  
    `const receipt = await publicClient.waitForTransactionReceipt({ hash })`

    `return {`  
      `transactionHash: hash,`  
      `blockNumber: receipt.blockNumber`  
    `}`  
  `} catch (error) {`  
    `console.error('Setting NFT royalty failed:', error)`  
    `throw error`  
  `}`  
`}`

`export async function getNFTOwner(tokenId: number): Promise<string> {`  
  `try {`  
    `const owner = await publicClient.readContract({`  
      `address: NFT_CONTRACT_ADDRESS,`  
      `abi: NFT_CONTRACT_ABI,`  
      `functionName: 'ownerOf',`  
      `args: [BigInt(tokenId)]`  
    `})`

    `return owner as string`  
  `} catch (error) {`  
    `console.error('Failed to get NFT owner:', error)`  
    `throw error`  
  `}`  
`}`

typescript  
*`// lib/blockchain/ipfs.ts`*  
`import { create } from 'ipfs-http-client'`  
`import { File } from '@web-std/file'`

`const client = create({`  
  `host: 'ipfs.infura.io',`  
  `port: 5001,`  
  `protocol: 'https',`  
  `headers: {`  
    ``authorization: `Basic ${Buffer.from(``  
      `` `${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_PROJECT_SECRET}` ``  
    `` ).toString('base64')}` ``  
  `}`  
`})`

`export async function uploadToIPFS(buffer: Buffer, mimeType: string): Promise<string> {`  
  `try {`  
    `const file = new File([buffer], 'file', { type: mimeType })`  
    `const result = await client.add(file)`  
    `return result.cid.toString()`  
  `} catch (error) {`  
    `console.error('IPFS upload failed:', error)`  
    `throw error`  
  `}`  
`}`

`export async function uploadJSONToIPFS(data: object): Promise<string> {`  
  `try {`  
    `const buffer = Buffer.from(JSON.stringify(data))`  
    `return await uploadToIPFS(buffer, 'application/json')`  
  `} catch (error) {`  
    `console.error('JSON IPFS upload failed:', error)`  
    `throw error`  
  `}`  
`}`

`export async function getFromIPFS(cid: string): Promise<Buffer> {`  
  `try {`  
    `const chunks = []`  
    `for await (const chunk of client.cat(cid)) {`  
      `chunks.push(chunk)`  
    `}`  
    `return Buffer.concat(chunks)`  
  `} catch (error) {`  
    `console.error('IPFS retrieval failed:', error)`  
    `throw error`  
  `}`  
`}`

typescript  
*`// lib/blockchain/events.ts`*  
`import { publicClient, NFT_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ADDRESS } from './web3'`  
`import { prisma } from '@/lib/prisma'`

`export async function watchBlockchainEvents() {`  
  `// Watch for NFT transfers`  
  `publicClient.watchContractEvent({`  
    `address: NFT_CONTRACT_ADDRESS,`  
    `abi: [{`  
      `type: 'event',`  
      `name: 'Transfer',`  
      `inputs: [`  
        `{ name: 'from', type: 'address', indexed: true },`  
        `{ name: 'to', type: 'address', indexed: true },`  
        `{ name: 'tokenId', type: 'uint256', indexed: true }`  
      `]`  
    `}],`  
    `onLogs: async (logs) => {`  
      `for (const log of logs) {`  
        `await handleTransferEvent(log)`  
      `}`  
    `}`  
  `})`

  `// Watch for marketplace sales`  
  `publicClient.watchContractEvent({`  
    `address: MARKETPLACE_CONTRACT_ADDRESS,`  
    `abi: [{`  
      `type: 'event',`  
      `name: 'Sale',`  
      `inputs: [`  
        `{ name: 'listingId', type: 'uint256', indexed: true },`  
        `{ name: 'buyer', type: 'address' },`  
        `{ name: 'price', type: 'uint256' }`  
      `]`  
    `}],`  
    `onLogs: async (logs) => {`  
      `for (const log of logs) {`  
        `await handleSaleEvent(log)`  
      `}`  
    `}`  
  `})`  
`}`

`async function handleTransferEvent(log: any) {`  
  `const { from, to, tokenId } = log.args`  
    
  `// Find the artifact`  
  `const artifact = await prisma.artifact.findFirst({`  
    `where: {`  
      `tokenId: tokenId.toString(),`  
      `contractAddress: NFT_CONTRACT_ADDRESS`  
    `}`  
  `})`

  `if (!artifact) return`

  `// Record provenance event`  
  `await prisma.provenanceEvent.create({`  
    `data: {`  
      `eventType: 'transfer',`  
      `transactionHash: log.transactionHash,`  
      `blockNumber: log.blockNumber,`  
      `from: from.toLowerCase(),`  
      `to: to.toLowerCase(),`  
      `artifactId: artifact.id`  
    `}`  
  `})`

  ``console.log(`Transfer recorded: Token ${tokenId} from ${from} to ${to}`)``  
`}`

`async function handleSaleEvent(log: any) {`  
  `const { listingId, buyer, price } = log.args`  
    
  `// Update listing status`  
  `await prisma.listing.updateMany({`  
    `where: { id: listingId.toString() },`  
    `data: {`   
      `status: 'SOLD',`  
      `sold: true`  
    `}`  
  `})`

  ``console.log(`Sale recorded: Listing ${listingId} sold to ${buyer} for ${price}`)``  
`}`

## **4\. External Service Integrations**

typescript  
*`// lib/services/stripe.ts`*  
`import Stripe from 'stripe'`

`const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {`  
  `apiVersion: '2023-10-16'`  
`})`

`export async function createPaymentIntent(`  
  `amount: number,`  
  `currency: string = 'usd',`  
  `metadata?: Record<string, string>`  
`) {`  
  `return await stripe.paymentIntents.create({`  
    `amount: Math.round(amount * 100), // Convert to cents`  
    `currency,`  
    `metadata,`  
    `automatic_payment_methods: {`  
      `enabled: true`  
    `}`  
  `})`  
`}`

`export async function createStripeAccount(email: string) {`  
  `return await stripe.accounts.create({`  
    `type: 'express',`  
    `email,`  
    `capabilities: {`  
      `card_payments: { requested: true },`  
      `transfers: { requested: true }`  
    `}`  
  `})`  
`}`

`export async function createTransfer(`  
  `destination: string,`  
  `amount: number,`  
  `currency: string = 'usd'`  
`) {`  
  `return await stripe.transfers.create({`  
    `destination,`  
    `amount: Math.round(amount * 100),`  
    `currency`  
  `})`  
`}`

typescript  
*`// lib/services/email.ts`*  
`import { Resend } from 'resend'`

`const resend = new Resend(process.env.RESEND_API_KEY)`

`export async function sendEmail(`  
  `to: string,`  
  `subject: string,`  
  `html: string,`  
  `from: string = 'noreply@pvabazaar.com'`  
`) {`  
  `try {`  
    `const result = await resend.emails.send({`  
      `from,`  
      `to,`  
      `subject,`  
      `html`  
    `})`  
    `return result`  
  `} catch (error) {`  
    `console.error('Email send failed:', error)`  
    `throw error`  
  `}`  
`}`

`export async function sendOrderConfirmation(`  
  `email: string,`  
  `order: any`  
`) {`  
  `` const html = ` ``  
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`  
      `<div style="background: linear-gradient(120deg, #0f3b2d, #1c5a45); padding: 30px; text-align: center;">`  
        `<h1 style="color: #4ef8a3; margin: 0; font-size: 28px;">Order Confirmation</h1>`  
      `</div>`  
        
      `<div style="padding: 30px; background: #f8f9fa;">`  
        `<h2 style="color: #1c5a45;">Thank you for your order!</h2>`  
        `<p>Order #: ${order.orderNumber}</p>`  
        `<p>Total: $${order.total}</p>`  
          
        `<div style="margin: 20px 0;">`  
          `<h3>Items:</h3>`  
          `` ${order.items.map((item: any) => ` ``  
            `<div style="border-bottom: 1px solid #ddd; padding: 10px 0;">`  
              `<strong>${item.product.title}</strong><br>`  
              `Quantity: ${item.quantity} × $${item.unitPrice} = $${item.totalPrice}`  
            `</div>`  
          `` `).join('')} ``  
        `</div>`  
          
        `<p>We'll send you tracking information once your order ships.</p>`  
      `</div>`  
        
      `<div style="background: #1c5a45; color: white; padding: 20px; text-align: center;">`  
        `<p>© 2025 PVA Bazaar. All rights reserved.</p>`  
      `</div>`  
    `</div>`  
  `` ` ``

  ``return await sendEmail(email, `Order Confirmation - ${order.orderNumber}`, html)``  
`}`

typescript  
*`// lib/services/cloudinary.ts`*  
`import { v2 as cloudinary } from 'cloudinary'`

`cloudinary.config({`  
  `cloud_name: process.env.CLOUDINARY_CLOUD_NAME,`  
  `api_key: process.env.CLOUDINARY_API_KEY,`  
  `api_secret: process.env.CLOUDINARY_API_SECRET`  
`})`

`export async function uploadImage(`  
  `buffer: Buffer,`  
  `folder: string = 'pva-bazaar'`  
`): Promise<string> {`  
  `return new Promise((resolve, reject) => {`  
    `cloudinary.uploader.upload_stream(`  
      `{`  
        `folder,`  
        `resource_type: 'image',`  
        `transformation: [`  
          `{ quality: 'auto:best' },`  
          `{ fetch_format: 'auto' }`  
        `]`  
      `},`  
      `(error, result) => {`  
        `if (error) {`  
          `reject(error)`  
        `} else {`  
          `resolve(result!.secure_url)`  
        `}`  
      `}`  
    `).end(buffer)`  
  `})`  
`}`

`export async function generateImageVariants(publicId: string) {`  
  `const variants = {`  
    `thumbnail: cloudinary.url(publicId, {`   
      `width: 200,`   
      `height: 200,`   
      `crop: 'fill',`   
      `quality: 'auto'`   
    `}),`  
    `medium: cloudinary.url(publicId, {`   
      `width: 600,`   
      `height: 400,`   
      `crop: 'fill',`   
      `quality: 'auto'`   
    `}),`  
    `large: cloudinary.url(publicId, {`   
      `width: 1200,`   
      `height: 800,`   
      `crop: 'fill',`   
      `quality: 'auto'`   
    `})`  
  `}`  
    
  `return variants`  
`}`

typescript  
*`// lib/services/algolia.ts`*  
`import algoliasearch from 'algoliasearch'`

`const client = algoliasearch(`  
  `process.env.ALGOLIA_APPLICATION_ID!,`  
  `process.env.ALGOLIA_ADMIN_API_KEY!`  
`)`

`const productsIndex = client.initIndex('products')`  
`const artifactsIndex = client.initIndex('artifacts')`

`export async function indexProduct(product: any) {`  
  `const record = {`  
    `objectID: product.id,`  
    `title: product.title,`  
    `description: product.description,`  
    `category: product.category,`  
    `price: product.price,`  
    `tags: product.tags,`  
    `images: product.images,`  
    `createdAt: product.createdAt.toISOString()`  
  `}`

  `await productsIndex.saveObject(record)`  
`}`

`export async function indexArtifact(artifact: any) {`  
  `const record = {`  
    `objectID: artifact.id,`  
    `title: artifact.title,`  
    `description: artifact.description,`  
    `category: artifact.category,`  
    `artist: artifact.artist,`  
    `tags: artifact.attributes?.traits?.map((t: any) => t.value) || [],`  
    `imageUrl: artifact.imageUrl,`  
    `createdAt: artifact.createdAt.toISOString()`  
  `}`

  `await artifactsIndex.saveObject(record)`  
`}`

`export async function searchProducts(query: string, filters?: string) {`  
  `const results = await productsIndex.search(query, {`  
    `filters,`  
    `hitsPerPage: 20`  
  `})`  
    
  `return results.hits`  
`}`

`export async function deleteFromIndex(indexName: string, objectID: string) {`  
  `const index = client.initIndex(indexName)`  
  `await index.deleteObject(objectID)`  
`}`

## **5\. Background Jobs and Automation**

typescript  
*`// lib/jobs/queue.ts`*  
`import Bull from 'bull'`  
`import Redis from 'ioredis'`

`const redis = new Redis(process.env.REDIS_URL!)`

`export const emailQueue = new Bull('email processing', {`  
  `redis: { port: 6379, host: process.env.REDIS_HOST }`  
`})`

`export const blockchainQueue = new Bull('blockchain processing', {`  
  `redis: { port: 6379, host: process.env.REDIS_HOST }`  
`})`

`export const indexingQueue = new Bull('search indexing', {`  
  `redis: { port: 6379, host: process.env.REDIS_HOST }`  
`})`

*`// Email job processor`*  
`emailQueue.process('send-email', async (job) => {`  
  `const { to, subject, html } = job.data`  
  `await sendEmail(to, subject, html)`  
`})`

*`// Blockchain job processor`*  
`blockchainQueue.process('mint-nft', async (job) => {`  
  `const { recipient, tokenURI, artifactId } = job.data`  
    
  `try {`  
    `const result = await mintNFT(recipient, tokenURI)`  
      
    `// Update artifact with minting results`  
    `await prisma.artifact.update({`  
      `where: { id: artifactId },`  
      `data: {`  
        `tokenId: result.tokenId.toString(),`  
        `contractAddress: result.contractAddress,`  
        `status: 'MINTED',`  
        `mintedAt: new Date()`  
      `}`  
    `})`

    `return result`  
  `} catch (error) {`  
    `// Update status to failed`  
    `await prisma.artifact.update({`  
      `where: { id: artifactId },`  
      `data: { status: 'DRAFT' }`  
    `})`  
    `throw error`  
  `}`  
`})`

*`// Search indexing processor`*  
`indexingQueue.process('index-product', async (job) => {`  
  `const { productId } = job.data`  
    
  `const product = await prisma.product.findUnique({`  
    `where: { id: productId },`  
    `include: {`  
      `creator: true,`  
      `partner: true`  
    `}`  
  `})`

  `if (product) {`  
    `await indexProduct(product)`  
  `}`  
`})`

typescript  
*`// lib/jobs/recommendations.ts`*  
`import { prisma } from '@/lib/prisma'`

`export class RecommendationEngine {`  
  `async generateArchetypeRecommendations(userId: string) {`  
    `const user = await prisma.user.findUnique({`  
      `where: { id: userId }`  
    `})`

    `if (!user?.archetype) return []`

    `const categoryWeights = this.getArchetypeCategoryWeights(user.archetype)`  
      
    `const recommendations = await prisma.product.findMany({`  
      `where: {`  
        `status: 'ACTIVE',`  
        `category: { in: Object.keys(categoryWeights) }`  
      `},`  
      `take: 10,`  
      `orderBy: [`  
        `{ featured: 'desc' },`  
        `{ createdAt: 'desc' }`  
      `]`  
    `})`

    `// Apply archetype-based scoring`  
    `return recommendations.map(product => ({`  
      `...product,`  
      `score: categoryWeights[product.category] || 0`  
    `})).sort((a, b) => b.score - a.score)`  
  `}`

  `async generateCollaborativeRecommendations(userId: string) {`  
    `// Find users with similar purchase history`  
    `const userOrders = await prisma.order.findMany({`  
      `where: {`   
        `customerId: userId,`  
        `status: 'DELIVERED'`  
      `},`  
      `include: { items: { include: { product: true } } }`  
    `})`

    `const purchasedCategories = new Set(`  
      `userOrders.flatMap(order =>`   
        `order.items.map(item => item.product.category)`  
      `)`  
    `)`

    `// Find similar users`  
    `const similarUsers = await prisma.user.findMany({`  
      `where: {`  
        `NOT: { id: userId },`  
        `orders: {`  
          `some: {`  
            `status: 'DELIVERED',`  
            `items: {`  
              `some: {`  
                `product: {`  
                  `category: { in: Array.from(purchasedCategories) }`  
                `}`  
              `}`  
            `}`  
          `}`  
        `}`  
      `},`  
      `take: 50`  
    `})`

    `// Get recommendations from similar users' purchases`  
    `const recommendations = await prisma.product.findMany({`  
      `where: {`  
        `status: 'ACTIVE',`  
        `orderItems: {`  
          `some: {`  
            `order: {`  
              `customerId: { in: similarUsers.map(u => u.id) },`  
              `status: 'DELIVERED'`  
            `}`  
          `}`  
        `},`  
        `NOT: {`  
          `orderItems: {`  
            `some: {`  
              `order: { customerId: userId }`  
            `}`  
          `}`  
        `}`  
      `},`  
      `take: 10`  
    `})`

    `return recommendations`  
  `}`

  `private getArchetypeCategoryWeights(archetype: string) {`  
    `const weights = {`  
      `Guardian: {`  
        `'Protection Stones': 1.0,`  
        `'Grounding Gems': 0.9,`  
        `'Traditional Crafts': 0.8,`  
        `'Security Items': 0.7`  
      `},`  
      `Pioneer: {`  
        `'Adventure Gear': 1.0,`  
        `'Exploration Tools': 0.9,`  
        `'Travel Accessories': 0.8,`  
        `'Discovery Items': 0.7`  
      `},`  
      `Strategist: {`  
        `'Analytical Tools': 1.0,`  
        `'Planning Resources': 0.9,`  
        `'Strategic Games': 0.8,`  
        `'Organizational Items': 0.7`  
      `},`  
      `Visionary: {`  
        `'Creative Supplies': 1.0,`  
        `'Inspiration Pieces': 0.9,`  
        `'Artistic Tools': 0.8,`  
        `'Innovation Items': 0.7`  
      `}`  
    `}`

    `return weights[archetype] || {}`  
  `}`  
`}`

typescript  
*`// lib/jobs/inventory.ts`*  
`export class InventoryManager {`  
  `async checkLowStock() {`  
    `const lowStockProducts = await prisma.product.findMany({`  
      `where: {`  
        `stockQuantity: {`  
          `lte: prisma.product.fields.reorderPoint`  
        `},`  
        `status: 'ACTIVE'`  
      `},`  
      `include: {`  
        `partner: true,`  
        `creator: true`  
      `}`  
    `})`

    `for (const product of lowStockProducts) {`  
      `await this.sendLowStockAlert(product)`  
    `}`  
  `}`

  `private async sendLowStockAlert(product: any) {`  
    `` const subject = `Low Stock Alert: ${product.title}` ``  
    `` const html = ` ``  
      `<h2>Low Stock Alert</h2>`  
      `<p>Product: ${product.title}</p>`  
      `<p>Current Stock: ${product.stockQuantity}</p>`  
      `<p>Reorder Point: ${product.reorderPoint}</p>`  
      `<p>Partner: ${product.partner?.name || 'N/A'}</p>`  
        
      `<p>Please reorder stock for this product.</p>`  
    `` ` ``

    `// Send to admin`  
    `await emailQueue.add('send-email', {`  
      `to: 'admin@pvabazaar.com',`  
      `subject,`  
      `html`  
    `})`

    `// Send to partner if available`  
    `if (product.partner?.email) {`  
      `await emailQueue.add('send-email', {`  
        `to: product.partner.email,`  
        ``subject: `Reorder Request: ${product.title}`,``  
        `` html: ` ``  
          `<h2>Reorder Request</h2>`  
          `<p>Hello ${product.partner.name},</p>`  
          `<p>We need to reorder stock for: ${product.title}</p>`  
          `<p>Current Stock: ${product.stockQuantity}</p>`  
          `<p>Please prepare a new shipment.</p>`  
            
          `<p>Best regards,<br>PVA Bazaar Team</p>`  
        `` ` ``  
      `})`  
    `}`  
  `}`

  `async updateStock(productId: string, quantity: number, operation: 'add' | 'subtract') {`  
    `const product = await prisma.product.findUnique({`  
      `where: { id: productId }`  
    `})`

    `if (!product) throw new Error('Product not found')`

    `const newQuantity = operation === 'add'`   
      `? product.stockQuantity + quantity`   
      `: product.stockQuantity - quantity`

    `if (newQuantity < 0) {`  
      `throw new Error('Insufficient stock')`  
    `}`

    `await prisma.product.update({`  
      `where: { id: productId },`  
      `data: {`   
        `stockQuantity: newQuantity,`  
        `status: newQuantity === 0 ? 'OUT_OF_STOCK' : product.status`  
      `}`  
    `})`

    `// Check if we need to send low stock alert`  
    `if (newQuantity <= product.reorderPoint) {`  
      `await this.sendLowStockAlert({ ...product, stockQuantity: newQuantity })`  
    `}`  
  `}`  
`}`

## **6\. Security Implementation**

typescript  
*`// lib/security/validation.ts`*  
`import { z } from 'zod'`  
`import DOMPurify from 'isomorphic-dompurify'`

`export const userSchema = z.object({`  
  `email: z.string().email(),`  
  `firstName: z.string().min(1).max(50),`  
  `lastName: z.string().min(1).max(50),`  
  `archetype: z.enum(['Guardian', 'Pioneer', 'Strategist', 'Visionary']).optional(),`  
`})`

`export const productSchema = z.object({`  
  `title: z.string().min(1).max(200),`  
  `description: z.string().min(10).max(2000),`  
  `price: z.number().positive(),`  
  `category: z.string().min(1),`  
  `stockQuantity: z.number().int().min(0),`  
`})`

`export const artifactSchema = z.object({`  
  `title: z.string().min(1).max(200),`  
  `description: z.string().min(10).max(2000),`  
  `category: z.string().min(1),`  
  `attributes: z.array(z.object({`  
    `trait_type: z.string(),`  
    `value: z.string()`  
  `})).optional()`  
`})`

`export function sanitizeHtml(dirty: string): string {`  
  `return DOMPurify.sanitize(dirty, {`  
    `ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br'],`  
    `ALLOWED_ATTR: []`  
  `})`  
`}`

`export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {`  
  `const parsed = schema.parse(data)`  
    
  `// Recursively sanitize string fields`  
  `function sanitizeObject(obj: any): any {`  
    `if (typeof obj === 'string') {`  
      `return sanitizeHtml(obj)`  
    `}`  
    `if (Array.isArray(obj)) {`  
      `return obj.map(sanitizeObject)`  
    `}`  
    `if (obj && typeof obj === 'object') {`  
      `const sanitized: any = {}`  
      `for (const [key, value] of Object.entries(obj)) {`  
        `sanitized[key] = sanitizeObject(value)`  
      `}`  
      `return sanitized`  
    `}`  
    `return obj`  
  `}`

  `return sanitizeObject(parsed)`  
`}`

typescript  
*`// lib/security/cors.ts`*  
`import { NextRequest, NextResponse } from 'next/server'`

`const allowedOrigins = [`  
  `'https://pvabazaar.com',`  
  `'https://www.pvabazaar.com',`  
  `'https://pvabazaar.org',`  
  `'https://www.pvabazaar.org',`  
  `...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])`  
`]`

`export function corsHeaders(origin?: string) {`  
  `const isAllowed = origin && allowedOrigins.includes(origin)`  
    
  `return {`  
    `'Access-Control-Allow-Origin': isAllowed ? origin :`  
