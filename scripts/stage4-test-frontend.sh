#!/bin/bash

# Stage 4: Test frontend-backend connection
echo "🔄 Stage 4: Testing frontend-backend connection..."

# Install frontend dependencies
cd /workspaces/pva-bazaar-app/Frontend
echo "Installing frontend dependencies..."
npm install

# Start backend in dev mode with in-memory DB
cd /workspaces/pva-bazaar-app/backend
echo "Starting backend in dev mode..."
PORT=5001 NODE_ENV=development USE_MEMORY_DB=true DEV_AUTO_SEED=true node api/index.js &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Start frontend
cd /workspaces/pva-bazaar-app/Frontend
echo "Starting frontend..."
VITE_API_URL=http://localhost:5001/api npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 10

# Test frontend connection
echo "Testing frontend-backend connection..."
echo "Frontend should be available at: http://localhost:3000"
echo "Try accessing these pages:"
echo "- Portfolio: http://localhost:3000/pages/portfolio.html"
echo "- Dashboard: http://localhost:3000/pages/pvadashboard.html"

# Keep running for manual testing
echo -e "\nPress Enter to shut down services..."
read

# Cleanup
echo "Shutting down services..."
kill $BACKEND_PID $FRONTEND_PID

echo "✅ Stage 4 complete!"
echo "👉 If the tests worked, you can commit with:"
echo "git add -A && git commit -m 'Fix: Frontend-backend connection working'"
