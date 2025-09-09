#!/bin/bash

# Script to test the PVA Bazaar App
echo "🧪 Testing PVA Bazaar App..."

# 1. Clean up any running processes on our ports
echo "🧹 Cleaning up any running processes..."
pkill -f "node api/index.js" || true
pkill -f "vite" || true
sleep 2

# 2. Fix the imports (Stage 1)
echo "🔄 Stage 1: Fixing case-sensitivity imports..."
cd /workspaces/pva-bazaar-app
grep -l "require.*models.*User" /workspaces/pva-bazaar-app/backend/**/*.js 2>/dev/null | while read file; do
  sed -i 's/require(['"'"'"]\.\.\/models\/User['"'"'"]\)/require(\1\.\.\/models\/user\1)/g' "$file"
done
grep -l "require.*models.*User" /workspaces/pva-bazaar-app/*.js /workspaces/pva-bazaar-app/routes/*.js 2>/dev/null | while read file; do
  sed -i 's/require(['"'"'"]\.\.\/.*\/models\/User['"'"'"]\)/require(\1\.\.\/backend\/models\/user\1)/g' "$file"
done
echo "✅ Fixed User model imports"

# 3. Install backend dependencies and test
echo "📦 Installing backend dependencies..."
cd /workspaces/pva-bazaar-app/backend
npm install

# 4. Start backend server
echo "🚀 Starting backend server on port 5001..."
cd /workspaces/pva-bazaar-app/backend
PORT=5001 NODE_ENV=development USE_MEMORY_DB=true DEV_AUTO_SEED=true node api/index.js > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Test backend health
echo "🔍 Testing backend health..."
HEALTH_RESPONSE=$(curl -s http://localhost:5001/api/health)
echo "$HEALTH_RESPONSE"

if [[ "$HEALTH_RESPONSE" != *"\"ok\":true"* ]]; then
  echo "❌ Backend health check failed! Check backend.log for details."
  cat backend.log
  exit 1
fi

# Test artifacts endpoint
echo "🔍 Testing artifacts endpoint..."
ARTIFACTS_RESPONSE=$(curl -s http://localhost:5001/api/artifacts)
echo "$ARTIFACTS_RESPONSE" | head -20  # Show just the beginning

if [[ "$ARTIFACTS_RESPONSE" != *"\"artifacts\":"* ]]; then
  echo "❌ Artifacts endpoint failed! Check backend.log for details."
  cat backend.log
  exit 1
fi

# 5. Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd /workspaces/pva-bazaar-app/Frontend
npm install

# 6. Start frontend server
echo "🚀 Starting frontend server on port 3000..."
cd /workspaces/pva-bazaar-app/Frontend
VITE_API_URL=http://localhost:5001 npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 10

# Check if frontend is running
if ! curl -s http://localhost:3000/ > /dev/null; then
  echo "❌ Frontend failed to start! Check frontend.log for details."
  cat frontend.log
  exit 1
fi

echo "✅ App is now running!"
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend: http://localhost:5001"
echo "👤 Dev Login: admin@pvabazaar.org / admin123"
echo ""
echo "📄 Available Pages:"
echo "- Portfolio: http://localhost:3000/pages/portfolio.html"
echo "- Dashboard: http://localhost:3000/pages/pvadashboard.html"
echo ""
echo "Testing portfolio page connection..."
curl -s http://localhost:3000/pages/portfolio.html | grep -q "My Portfolio" && echo "✅ Portfolio page loads correctly" || echo "❌ Portfolio page error"
echo ""
echo "Press Ctrl+C to stop all services"

# Get artifact ID for testing other pages
ARTIFACT_ID=$(curl -s http://localhost:5001/api/artifacts | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$ARTIFACT_ID" ]; then
  echo "Sample artifact ID for testing: $ARTIFACT_ID"
  echo "- Product Showcase: http://localhost:3000/pages/productshowcase.html?id=$ARTIFACT_ID"
  echo "- Provenance: http://localhost:3000/pages/provenance.html?id=$ARTIFACT_ID"
fi

# Keep the script running until Ctrl+C
wait $BACKEND_PID $FRONTEND_PID
