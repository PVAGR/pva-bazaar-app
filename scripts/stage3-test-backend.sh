#!/bin/bash

# Stage 3: Test backend connectivity
echo "🔄 Stage 3: Testing backend connectivity..."

# Install backend dependencies
cd /workspaces/pva-bazaar-app/backend
echo "Installing backend dependencies..."
npm install

# Start backend in dev mode with in-memory DB
echo "Starting backend in dev mode..."
NODE_ENV=development USE_MEMORY_DB=true DEV_AUTO_SEED=true node api/index.js &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Test health endpoint
echo "Testing backend health endpoint..."
curl -s http://localhost:5000/api/health

# Test users endpoint
echo -e "\n\nTesting users endpoint..."
curl -s http://localhost:5000/api/users

# Test artifacts endpoint
echo -e "\n\nTesting artifacts endpoint..."
curl -s http://localhost:5000/api/artifacts

# Cleanup
echo -e "\n\nShutting down backend..."
kill $BACKEND_PID

echo "✅ Stage 3 complete!"
echo "👉 If the tests worked, you can commit with:"
echo "git add -A && git commit -m 'Fix: Backend connectivity and API endpoints'"
