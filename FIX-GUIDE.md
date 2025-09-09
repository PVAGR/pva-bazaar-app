# PVA Bazaar App - Staged Fix Process

This guide will help you fix and test the PVA Bazaar App in stages, allowing you to verify each change independently.

## Quick Start

To run through all stages with guidance:

```bash
./run-fixes.sh
```

## Staged Approach

### Stage 1: Fix Case-Sensitivity Imports
Addresses the issue with inconsistent case in imports (`user.js` vs `User.js`).

```bash
./scripts/stage1-fix-imports.sh
```

### Stage 2: Ensure Environment Setup
Sets up the proper environment variables and cleans hardcoded secrets.

```bash
./scripts/stage2-fix-env.sh
```

### Stage 3: Test Backend Connectivity
Verifies that the backend APIs work correctly with the fixed imports.

```bash
./scripts/stage3-test-backend.sh
```

### Stage 4: Test Frontend-Backend Connection
Verifies that the frontend can connect to the backend and display data.

```bash
./scripts/stage4-test-frontend.sh
```

### Stage 5: Final Integration Test
Runs the complete application to verify all components work together.

```bash
./scripts/stage5-final-test.sh
```

## Running the Complete App

After fixing all issues, you can run the complete app with:

```bash
./run-app.sh
```

## Available Pages

- Portfolio: http://localhost:3000/pages/portfolio.html
- Product Showcase: http://localhost:3000/pages/productshowcase.html?id=[artifact_id]
- Provenance: http://localhost:3000/pages/provenance.html?id=[artifact_id]
- Dashboard: http://localhost:3000/pages/pvadashboard.html

## Dev Login

- Email: admin@pvabazaar.org
- Password: admin123

## Project Structure

- **Frontend**: Located in `/Frontend`. Uses Vite. Run with `cd Frontend && npm install && npm run dev`.
- **Backend**: Located in `/backend`. Uses Express.js + MongoDB. Run with `cd backend && npm install && npm run dev`.
- **Secrets**: Require a `.env` file in `backend` with configuration variables.

## Development Features

- **In-memory DB**: Set `USE_MEMORY_DB=true` in `.env` to use an in-memory MongoDB for development.
- **Auto-seed**: Set `DEV_AUTO_SEED=true` in `.env` to automatically seed sample data.
