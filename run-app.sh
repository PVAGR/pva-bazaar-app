#!/bin/bash

# Script to run the PVA Bazaar App

echo "🚀 Starting PVA Bazaar App..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd /workspaces/pva-bazaar-app/backend
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd /workspaces/pva-bazaar-app/Frontend
npm install

# Ensure MongoDB is running via Docker and start backend against it
echo "🧰 Ensuring local MongoDB (Docker) is running..."
cd /workspaces/pva-bazaar-app
docker compose up -d mongo >/dev/null 2>&1 || true

echo "🔧 Starting backend server (Mongo on localhost:27017)..."
cd /workspaces/pva-bazaar-app/backend
# Seed sample data (non-fatal if it fails)
PORT=5001 NODE_ENV=development USE_MEMORY_DB=false MONGODB_URI=mongodb://localhost:27017/pvabazaar npm run seed || true

# Start dev server
PORT=5001 NODE_ENV=development USE_MEMORY_DB=false MONGODB_URI=mongodb://localhost:27017/pvabazaar DEV_AUTO_SEED=true ENABLE_QUICK_PUBLISH=true npm run dev &
BACKEND_PID=$!

# Start frontend in dev mode (proxy /api -> backend)
echo "💻 Starting frontend server..."
cd /workspaces/pva-bazaar-app/Frontend
VITE_API_URL=http://localhost:5001 npm run dev &
FRONTEND_PID=$!

# Function to handle script termination
cleanup() {
  echo "🛑 Stopping services..."
  kill $BACKEND_PID $FRONTEND_PID
  exit 0
}

# Register the cleanup function for when script is terminated
trap cleanup SIGINT SIGTERM

echo "✅ PVA Bazaar App is running!"
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend: http://localhost:5001"
echo "👤 Dev Login: admin@pvabazaar.org / admin123"
echo ""
echo "📄 Available Pages:"
echo "- Portfolio: http://localhost:3000/pages/portfolio.html"
echo "- Product Showcase: http://localhost:3000/pages/productshowcase.html?id=[artifact_id]"
echo "- Provenance: http://localhost:3000/pages/provenance.html?id=[artifact_id]"
echo "- Dashboard: http://localhost:3000/pages/pvadashboard.html"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep the script running
wait
