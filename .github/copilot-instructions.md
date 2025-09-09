# PVA Bazaar - GitHub Copilot Instructions

PVA Bazaar is an artisan marketplace with digital provenance, built as a full-stack web application that combines traditional crafts with blockchain technology for provenance tracking and fractional ownership.

**ALWAYS follow these instructions first and only fallback to search or bash commands when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap and Setup
1. **CRITICAL**: Always start by installing dependencies in the correct order:
   ```bash
   cd /path/to/pva-bazaar-app
   rm -rf node_modules package-lock.json  # If you encounter rollup/build issues
   npm install                            # Root dependencies (takes ~15 seconds)
   cd Frontend && npm install             # Frontend dependencies (takes ~3 seconds)
   cd ../backend && npm install           # Backend dependencies (takes ~6 seconds)
   ```

2. **Environment Setup**:
   ```bash
   cp pva-bazaar-app.env .env
   echo "MONGODB_URI=mongodb://localhost:27017/pvabazaar" > .env
   echo "JWT_SECRET=07c285d1e54044356c0f3a1000e19cb3" >> .env
   ```

3. **Database Setup** (requires MongoDB running):
   ```bash
   # Start MongoDB via Docker (NEVER CANCEL - takes 30-60 seconds)
   docker run -d --name mongo-test -p 27017:27017 mongo:5.0
   
   # Seed database with test data (takes ~10 seconds)
   # NOTE: Use .cjs extension due to ESM conflicts
   mv seed.js seed.cjs  # If not already renamed
   # Fix import path: change './backend/models/User' to './backend/models/user'
   node seed.cjs
   ```

### Build Process
- **Frontend Build**: 
  ```bash
  cd Frontend
  npm run build  # Takes ~1 second. NEVER CANCEL.
  ```
  **CRITICAL**: Build MUST be run from Frontend directory, NOT root directory
  
- **Root-level build fails** - do not use `npm run build` from repository root

### Development Servers

#### Frontend Development
```bash
cd Frontend
npm run dev  # Starts Vite dev server on http://localhost:3000 (takes ~2 seconds)
```
**NEVER CANCEL** - Server starts immediately but keep running for development

#### Backend Development  
```bash
cd backend
npm start    # Starts Express server on port 5000 (takes ~3 seconds)
# OR use different port if 5000 is busy:
PORT=5001 npm start
```

#### Preview Production Build
```bash
cd Frontend  
npm run preview  # Starts preview server on http://localhost:4173 (takes ~1 second)
```

### Testing and Validation

#### Health Check Validation
After starting backend server, ALWAYS test the API:
```bash
curl http://localhost:5001/api/health
# Should return: {"ok":true,"message":"PVA Bazaar API is running","mongo":true,"timestamp":"..."}
```

#### Manual Frontend Validation
1. Start frontend dev server: `cd Frontend && npm run dev`
2. Navigate to http://localhost:3000
3. **EXPECTED RESULT**: Should display PVA Bazaar homepage with green theme, navigation menu, and "Where Artistry Meets Blockchain" heading
4. **VALIDATION SCENARIO**: Verify page loads completely with no console errors (some CDN blocking is expected in sandbox environments)

#### Database Validation
Test user credentials for development:
- **Email**: admin@pvabazaar.org  
- **Password**: admin123

## Project Structure

### Frontend (`/Frontend/`)
- **Framework**: Vanilla JavaScript with Vite build system
- **Port**: 3000 (development), 4173 (preview)
- **Key Files**: 
  - `vite.config.js`: Build configuration
  - `package.json`: Frontend-specific dependencies (type: "module")
  - `index.html`: Main entry point
  - `pages/`: HTML pages
  - `src/`: Shared assets and JavaScript

### Backend (`/backend/`)
- **Framework**: Express.js with MongoDB (Mongoose ODM)
- **Port**: 5000 (default), 5001 (alternate)
- **Key Files**:
  - `package.json`: Backend dependencies (CommonJS)
  - `server.js`: Main Express server
  - `models/`: Mongoose models (Artifact.js, user.js)
  - `api/index.js`: Serverless handler for Vercel

### Root Configuration
- **package.json**: Contains frontend Vite scripts ("type": "module")
- **vercel.json**: Vercel deployment configuration  
- **seed.cjs**: Database seeding script (renamed to .cjs due to ESM conflicts)

## Common Issues and Solutions

### Build Failures
- **"Cannot find module @rollup/rollup-linux-x64-gnu"**: Run `rm -rf node_modules package-lock.json && npm install`
- **"Could not resolve entry module index.html"**: Must run build from `Frontend/` directory, not root
- **ESM/CommonJS conflicts**: Use `.cjs` extension for CommonJS files in root directory

### Database Issues
- **"Operation buffering timed out"**: Ensure MongoDB is running and accessible
- **Connection failures**: Verify MONGODB_URI is set correctly in .env file
- **Import errors**: User model is `user.js` (lowercase), not `User.js`

### Port Conflicts
- **EADDRINUSE errors**: Use different ports (PORT=5001) or stop conflicting processes

## API Endpoints Structure
- `/api/artifacts`: CRUD operations for artifacts
- `/api/users`: User management  
- `/api/auth`: Authentication endpoints
- `/api/health`: Health check (always test this first)
- `/api/transactions`: Transaction handling
- `/api/certificates`: Certificate management

## Blockchain Integration
- **Network**: Base blockchain (default)
- **Standards**: ERC-721 NFTs for artifact tokenization
- **Verification**: Web3.js integration for on-chain verification
- **Smart Contracts**: ABI files in `backend/utils/abi/`

## Development Workflow
1. **ALWAYS** start by running the bootstrap steps above
2. **ALWAYS** validate both frontend and backend work independently  
3. **ALWAYS** test the health endpoint after starting backend
4. **ALWAYS** run manual validation scenarios after making changes
5. For production deployment: Build frontend then deploy to Vercel

## File Structure Reference
```
pva-bazaar-app/
├── .github/copilot-instructions.md    # This file
├── package.json                       # Frontend build scripts (Vite)
├── vercel.json                        # Deployment config
├── pva-bazaar-app.env                # Environment template
├── seed.cjs                          # Database seeding (CommonJS)
├── Frontend/                         # Vite frontend application
│   ├── package.json                  # Frontend dependencies
│   ├── vite.config.js               # Vite configuration
│   └── server.js                    # Alternative server (has path issues)
├── backend/                          # Express.js API server
│   ├── package.json                 # Backend dependencies  
│   ├── server.js                    # Main Express server
│   ├── models/                      # Mongoose models
│   └── api/index.js                 # Serverless entry point
└── routes/                          # API route definitions
```

## Timing Expectations
- **Dependency Installation**: 15-25 seconds total
- **Frontend Build**: 1-2 seconds  
- **Frontend Dev Server**: 2-3 seconds to start
- **Backend Server**: 3-5 seconds to start  
- **Database Seeding**: 5-10 seconds
- **Docker MongoDB**: 30-60 seconds to initialize

**NEVER CANCEL** any of these operations even if they seem to hang - wait the full expected time plus 50% buffer.