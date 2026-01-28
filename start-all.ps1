# Quick Start - PVA Bazaar Full Stack (Windows PowerShell)
# Runs all three projects in separate windows

Write-Host "🚀 Starting PVA Bazaar Full Stack..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend") -or -not (Test-Path "Frontend") -or -not (Test-Path "pvabazaar-livestream")) {
    Write-Host "❌ Error: Must run from pva-bazaar-app root directory" -ForegroundColor Red
    exit 1
}

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

Write-Host "✅ Starting services in separate windows..." -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "📦 Starting Backend API (port 5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '🔧 Backend API Server' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

# Start Frontend
Write-Host "🎨 Starting Frontend (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\Frontend'; Write-Host '🎨 Vite Frontend' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

# Start Next.js Livestream
Write-Host "🎬 Starting Livestream App (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\pvabazaar-livestream'; Write-Host '🎬 Next.js Livestream App' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ All services started in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Cyan
Write-Host "  Backend:    http://localhost:5001" -ForegroundColor White
Write-Host "  Frontend:   http://localhost:5173" -ForegroundColor White
Write-Host "  Livestream: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop all services:" -ForegroundColor Yellow
Write-Host "  Close each PowerShell window or press Ctrl+C in each" -ForegroundColor Gray
Write-Host ""

# Wait and do health check
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "🔍 Health Check:" -ForegroundColor Cyan
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:5001/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($backend.StatusCode -eq 200) {
        Write-Host "  ✅ Backend: Running" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⏳ Backend: Starting... (check backend window)" -ForegroundColor Yellow
}

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($frontend.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend: Running" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⏳ Frontend: Starting... (check frontend window)" -ForegroundColor Yellow
}

try {
    $livestream = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($livestream.StatusCode -eq 200) {
        Write-Host "  ✅ Livestream: Running" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⏳ Livestream: Starting... (check livestream window)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Check each window for startup status" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Open http://localhost:3000 for the new Livestream app" -ForegroundColor White
Write-Host "  2. Open http://localhost:5173 for the existing Frontend" -ForegroundColor White
Write-Host "  3. Backend API is available at http://localhost:5001/api" -ForegroundColor White
Write-Host ""
