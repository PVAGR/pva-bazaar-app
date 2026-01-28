#!/bin/bash
# Quick Start - PVA Bazaar Full Stack
# Runs all three projects in the background

echo "🚀 Starting PVA Bazaar Full Stack..."
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "Frontend" ] || [ ! -d "pvabazaar-livestream" ]; then
    echo "❌ Error: Must run from pva-bazaar-app root directory"
    exit 1
fi

# Function to check if port is in use
check_port() {
    lsof -i :$1 >/dev/null 2>&1
    return $?
}

# Kill existing processes on our ports
echo "🧹 Cleaning up existing processes..."
if check_port 5001; then
    echo "  Stopping process on port 5001..."
    lsof -ti:5001 | xargs kill -9 2>/dev/null
fi
if check_port 5173; then
    echo "  Stopping process on port 5173..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null
fi
if check_port 3000; then
    echo "  Stopping process on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
fi

echo ""
echo "✅ Starting services..."
echo ""

# Start Backend
echo "📦 Starting Backend API (port 5001)..."
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 2

# Start Frontend
echo "🎨 Starting Frontend (port 5173)..."
cd Frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 2

# Start Next.js Livestream
echo "🎬 Starting Livestream App (port 3000)..."
cd pvabazaar-livestream
npm run dev > ../logs/livestream.log 2>&1 &
LIVESTREAM_PID=$!
cd ..
sleep 3

echo ""
echo "✅ All services started!"
echo ""
echo "📊 Service Status:"
echo "  Backend:    http://localhost:5001    (PID: $BACKEND_PID)"
echo "  Frontend:   http://localhost:5173    (PID: $FRONTEND_PID)"
echo "  Livestream: http://localhost:3000    (PID: $LIVESTREAM_PID)"
echo ""
echo "📝 Logs:"
echo "  Backend:    tail -f logs/backend.log"
echo "  Frontend:   tail -f logs/frontend.log"
echo "  Livestream: tail -f logs/livestream.log"
echo ""
echo "🛑 To stop all services:"
echo "  kill $BACKEND_PID $FRONTEND_PID $LIVESTREAM_PID"
echo "  Or run: ./stop-all.sh"
echo ""
echo "Press Ctrl+C to stop monitoring (services will keep running)"
echo ""

# Save PIDs to file for stop script
mkdir -p logs
echo "$BACKEND_PID $FRONTEND_PID $LIVESTREAM_PID" > logs/pids.txt

# Monitor health
sleep 5
echo "🔍 Health Check:"
curl -s http://localhost:5001/api/health > /dev/null && echo "  ✅ Backend: Running" || echo "  ❌ Backend: Failed"
curl -s http://localhost:5173 > /dev/null && echo "  ✅ Frontend: Running" || echo "  ❌ Frontend: Failed"
curl -s http://localhost:3000 > /dev/null && echo "  ✅ Livestream: Running" || echo "  ❌ Livestream: Failed"
echo ""
echo "✨ All systems operational!"
