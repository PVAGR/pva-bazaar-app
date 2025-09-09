# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PVA Bazaar is an artisan marketplace with digital provenance, built as a full-stack web application that combines traditional crafts with blockchain technology for provenance tracking and fractional ownership.

## Architecture

The project follows a traditional full-stack architecture with separate frontend and backend components:

### Backend (`/backend/`)
- **Framework**: Express.js with MongoDB (Mongoose ODM)
- **Key Models**: 
  - `Artifact.js`: Core artifact model with blockchain integration, fractionalization support, and ownership history
  - `User.js`: User authentication and management
- **API Structure**: RESTful API with route modules in `/routes/`
- **Blockchain Integration**: Web3.js integration for on-chain verification (`utils/blockchain.js`)
- **Additional Services**: IPFS integration, vector database, and embedding services

### Frontend (`/Frontend/`)
- **Framework**: Vanilla JavaScript with Vite build system
- **Structure**: HTML pages in `/pages/` with shared assets in `/src/`
- **Key Pages**: artifact viewer, portfolio, dashboard, checkout/mint, provenance tracking

### Deployment
- **Platform**: Vercel (serverless functions)
- **Entry Points**: 
  - `/backend/api/index.js`: Main serverless API handler
  - `/Frontend/server.js`: Alternative server configuration
- **Database**: MongoDB with connection caching for serverless optimization

## Development Commands

```bash
# Development server (frontend)
npm run dev          # Vite dev server on port 3000

# Build
npm run build        # Build frontend for production

# Preview
npm run preview      # Preview production build

# Database seeding
node seed.js         # Populate database with sample data
```

## Key Configuration Files

- `vercel.json`: Vercel deployment configuration with API routing
- `Frontend/vite.config.js`: Vite build configuration
- `pva-bazaar-app.env`: Environment variables template

## Database Setup

The application uses MongoDB with the database name `pvabazaar`. Run `node seed.js` to populate with sample artifacts and a test user (admin@pvabazaar.org / admin123).

## Blockchain Integration

The system supports:
- ERC-721 NFTs for artifact tokenization
- On-chain ownership verification via Web3.js
- Base network as default blockchain
- Smart contract ABI loaded from `backend/utils/abi/`

## API Endpoints Structure

- `/api/artifacts`: CRUD operations for artifacts
- `/api/users`: User management
- `/api/auth`: Authentication endpoints  
- `/api/health`: Health check endpoints
- `/api/transactions`: Transaction handling
- `/api/certificates`: Certificate management

## Environment Variables Required

- `MONGODB_URI`: MongoDB connection string
- `ETHEREUM_RPC_URL`: Blockchain RPC endpoint
- `NODE_ENV`: Environment (development/production)
- Additional blockchain and service API keys as needed

## Testing Data

Use the seeded data for development:
- Test user: admin@pvabazaar.org / admin123  
- Sample artifacts include Afghan crafts with fractionalization enabled