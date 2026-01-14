#!/usr/bin/env bash

# PVA Bazaar Production Deployment Script (Vercel)

set -euo pipefail

ROOT_DIR="/workspaces/pva-bazaar-app"
FRONTEND_DIR="$ROOT_DIR/Frontend"
BACKEND_DIR="$ROOT_DIR/backend"

echo "🚀 PVA Bazaar Deployment Script"
echo "==============================="
echo "This will deploy backend and frontend to Vercel."
echo ""

# Basic checks
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
  echo "❌ Expected project structure missing: backend/ and Frontend/"
  exit 1
fi

# Ensure Vercel CLI
if ! command -v vercel >/dev/null 2>&1; then
  echo "📦 Installing Vercel CLI..."
  npm install -g vercel
  echo "✅ Vercel CLI installed"
fi

echo "🔐 Login to Vercel if prompted..."
vercel login || true

echo ""
echo "🔧 Step 1 — Deploy backend"
echo "--------------------------------"
cd "$BACKEND_DIR"

# Minimal backend vercel.json (only if missing)
if [ ! -f "vercel.json" ]; then
  cat > vercel.json <<'EOF'
{
  "version": 2,
  "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
  "routes": [
    { "src": "^/api/(.*)", "dest": "api/index.js" }
  ]
}
EOF
fi

# Deploy backend
vercel --prod --yes 2>&1 | tee /tmp/vercel_backend_output.txt

# Extract backend URL
BACKEND_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.vercel\.app" /tmp/vercel_backend_output.txt | head -n1 || true)
if [ -z "$BACKEND_URL" ]; then
  BACKEND_URL=$(grep -oE "https://[^[:space:]]+" /tmp/vercel_backend_output.txt | head -n1 || true)
fi
if [ -z "$BACKEND_URL" ]; then
  echo "❌ Could not determine backend URL from Vercel output. See /tmp/vercel_backend_output.txt"
  exit 1
fi
echo "✅ Backend deployed: $BACKEND_URL"

echo ""
echo "📦 Step 2 — Build frontend (with backend URL)"
echo "--------------------------------"
cd "$FRONTEND_DIR"

# Install deps without running husky/prepare scripts
npm install --ignore-scripts --no-audit --no-fund

# Merge legacy static frontend into Vite public assets
bash "$ROOT_DIR/scripts/merge-frontends.sh" || true

# Build with VITE_API_URL pointing at backend
VITE_API_URL="${BACKEND_URL}/api" npm run build
echo "✅ Frontend built (dist/)"

echo ""
echo "🚀 Step 3 — Deploy frontend"
echo "--------------------------------"

# Minimal frontend vercel.json (only if missing)
if [ ! -f "vercel.json" ]; then
  cat > vercel.json <<'EOF'
{
  "version": 2,
  "builds": [ { "src": "dist/**", "use": "@vercel/static" } ],
  "routes": [ { "src": "^/(.*)", "dest": "/dist/$1" } ]
}
EOF
fi

vercel --prod --yes --name pvabazaar-frontend 2>&1 | tee /tmp/vercel_frontend_output.txt

# Extract frontend URL
FRONTEND_URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.vercel\.app" /tmp/vercel_frontend_output.txt | head -n1 || true)
if [ -z "$FRONTEND_URL" ]; then
  FRONTEND_URL=$(grep -oE "https://[^[:space:]]+" /tmp/vercel_frontend_output.txt | head -n1 || true)
fi
if [ -z "$FRONTEND_URL" ]; then
  echo "❌ Could not determine frontend URL from Vercel output. See /tmp/vercel_frontend_output.txt"
  exit 1
fi
echo "✅ Frontend deployed: $FRONTEND_URL"

echo ""
echo "🔗 Step 4 — Update root project for pvabazaar.org"
echo "--------------------------------"

# Copy built frontend into root 'public/' so root Vercel project serves latest site
rsync -av --delete "$FRONTEND_DIR/dist/" "$ROOT_DIR/public/" || true

# Deploy root project which holds pvabazaar.org domain
cd "$ROOT_DIR"
vercel --prod --yes 2>&1 | tee /tmp/vercel_root_output.txt

# Extract root domain URL (should be pvabazaar.org or www)
ROOT_URL=$(grep -oE "https://[^[:space:]]+" /tmp/vercel_root_output.txt | head -n1 || true)
if [ -n "$ROOT_URL" ]; then
  echo "✅ Root project deployed: $ROOT_URL"
else
  echo "ℹ️ Root project deployed; see /tmp/vercel_root_output.txt for details"
fi

echo ""
echo "🎉 Deployment finished"
echo "======================="
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo "Root Project: pvabazaar.org (deployed)"
echo ""
echo "Next steps:"
echo "- In Vercel dashboard, set env for backend: MONGODB_URI, JWT_SECRET, ALLOWED_ORIGIN=$FRONTEND_URL"
echo "- Optionally add custom domain to frontend and backend projects"
echo "- Verify API health: ${BACKEND_URL}/api/health"

# Cleanup
rm -f /tmp/vercel_backend_output.txt /tmp/vercel_frontend_output.txt || true

exit 0
