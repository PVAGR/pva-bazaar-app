#!/bin/bash

# Script to test the PVA Bazaar App locally (mimics production setup)
echo "🧪 Testing PVA Bazaar App..."

# 1. Clean up any running processes on our ports
echo "🧹 Cleaning up any running processes..."
pkill -f "node api/index.js" || true
pkill -f "vite" || true
sleep 2

# 2. Install backend dependencies and start
echo "📦 Installing backend dependencies..."
cd /workspaces/pva-bazaar-app/backend
npm install

# 3. Start backend server on port 5001
echo "🚀 Starting backend server on port 5001..."
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

echo "✅ Backend is healthy!"

# 4. Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd /workspaces/pva-bazaar-app/Frontend
npm install

# 5. Start frontend server on port 3000
echo "🚀 Starting frontend server on port 3000..."
VITE_API_URL=http://localhost:5001/api npm run dev > frontend.log 2>&1 &
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

echo ""
echo "✅ App is now running!"
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:5001/api"
echo "👤 Dev Login: admin@pvabazaar.org / admin123"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running
wait
  echo "- Provenance: http://localhost:3000/pages/provenance.html?id=$ARTIFACT_ID"
fi

# Keep the script running until Ctrl+C
wait $BACKEND_PID $FRONTEND_PID
