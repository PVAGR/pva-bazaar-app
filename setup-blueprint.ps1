# Blueprint v1 Setup Script (PowerShell)
# Automated setup for PVA Bazaar Decentralized Platform

Write-Host "🌊 PVA Bazaar Blueprint v1 Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
try {
    $nodeVersion = (node -v).Trim('v').Split('.')[0]
    if ([int]$nodeVersion -lt 18) {
        Write-Host "⚠️  Node.js version $nodeVersion detected. Blueprint v1 requires Node.js 18+" -ForegroundColor Yellow
        Write-Host "   Please upgrade: https://nodejs.org"
        exit 1
    }
    Write-Host "✅ Node.js $(node -v) detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location ..\Frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

# Check for environment files
Set-Location ..
Write-Host "🔧 Checking environment configuration..." -ForegroundColor Yellow

if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  backend\.env not found" -ForegroundColor Yellow
    Write-Host "   Copying template from .env.example.blueprint"
    Copy-Item .env.example.blueprint backend\.env
    Write-Host "   ⚠️  IMPORTANT: Edit backend\.env with your actual credentials:" -ForegroundColor Yellow
    Write-Host "      - MONGODB_URI (get from mongodb.com/atlas)"
    Write-Host "      - JWT_SECRET (generate with PowerShell or Node.js)"
    Write-Host "      - PINATA_API_KEY & PINATA_API_SECRET (get from pinata.cloud)"
    Write-Host ""
}

if (-not (Test-Path "Frontend\.env.development")) {
    Write-Host "⚠️  Frontend\.env.development not found" -ForegroundColor Yellow
    Write-Host "   Creating default configuration..."
    "VITE_API_URL=http://localhost:5001/api" | Out-File -FilePath "Frontend\.env.development" -Encoding UTF8
    Write-Host "✅ Frontend\.env.development created" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📖 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Configure backend\.env with your credentials (MongoDB, Pinata)"
Write-Host "   2. Start backend:  cd backend; npm run dev"
Write-Host "   3. Start frontend: cd Frontend; npm run dev"
Write-Host "   4. Open http://localhost:5173/dashboard.html"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   • Quick Start: QUICKSTART.md"
Write-Host "   • Full Docs:   BLUEPRINT_V1_README.md"
Write-Host "   • Architecture: ARCHITECTURE.md"
Write-Host ""
Write-Host "🤝 Need help? https://github.com/yourusername/pva-bazaar-app/discussions"
Write-Host ""
