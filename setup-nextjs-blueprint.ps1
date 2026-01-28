# PVABazaar Next.js Blueprint - Automated Setup (Windows PowerShell)
# Run this script to set up your Next.js livestreaming platform

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "PVABazaar Next.js Blueprint v1 Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js version
Write-Host "[1/6] Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

$versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($versionNumber -lt 18) {
    Write-Host "❌ Node.js $nodeVersion detected. Please upgrade to Node.js 18+" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green

# Step 2: Create Next.js project
Write-Host ""
Write-Host "[2/6] Creating Next.js project..." -ForegroundColor Yellow
$projectName = "pvabazaar-livestream"

if (Test-Path $projectName) {
    Write-Host "⚠️  Directory '$projectName' already exists. Skipping project creation." -ForegroundColor Yellow
} else {
    Write-Host "Creating Next.js app with TypeScript, Tailwind, and App Router..." -ForegroundColor Gray
    npx create-next-app@latest $projectName --typescript --tailwind --app-router --eslint --no-src-dir --import-alias "@/*"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create Next.js project" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Next.js project created" -ForegroundColor Green
}

# Step 3: Navigate to project and install dependencies
Write-Host ""
Write-Host "[3/6] Installing dependencies..." -ForegroundColor Yellow
Set-Location $projectName

$dependencies = @(
    "mongoose",
    "next-auth",
    "@pinata/sdk",
    "hls.js",
    "axios",
    "dotenv",
    "bcryptjs",
    "form-data"
)

$devDependencies = @(
    "@types/bcryptjs"
)

Write-Host "Installing production dependencies..." -ForegroundColor Gray
npm install $dependencies
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Installing dev dependencies..." -ForegroundColor Gray
npm install --save-dev $devDependencies
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dev dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ All dependencies installed" -ForegroundColor Green

# Step 4: Create folder structure
Write-Host ""
Write-Host "[4/6] Creating folder structure..." -ForegroundColor Yellow

$folders = @(
    "lib",
    "models",
    "components/ui",
    "app/api/auth/[...nextauth]",
    "app/api/auth/signup",
    "app/api/streams",
    "app/api/journals",
    "app/api/webhooks/twitch",
    "app/api/users/export",
    "app/dashboard/streams",
    "app/dashboard/journals",
    "app/dashboard/settings",
    "app/auth/signin",
    "app/auth/signup",
    "public"
)

foreach ($folder in $folders) {
    $path = Join-Path -Path "." -ChildPath $folder
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}
Write-Host "✅ Folder structure created" -ForegroundColor Green

# Step 5: Create .env.local template
Write-Host ""
Write-Host "[5/6] Creating .env.local template..." -ForegroundColor Yellow

if (Test-Path ".env.local") {
    Write-Host "⚠️  .env.local already exists. Skipping..." -ForegroundColor Yellow
} else {
    $envContent = @"
# ===== DATABASE =====
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/pvabazaar?retryWrites=true&w=majority

# ===== AUTHENTICATION =====
NEXTAUTH_SECRET=your_secret_here_generate_with_openssl_rand_hex_32
NEXTAUTH_URL=http://localhost:3000

# ===== PINATA (IPFS) =====
PINATA_API_KEY=your_pinata_key
PINATA_API_SECRET=your_pinata_secret
PINATA_API_JWT=your_jwt_from_pinata

# ===== STREAMING PLATFORMS (OPTIONAL FOR v1) =====
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_secret
LIVEPEER_API_KEY=your_livepeer_key
"@
    
    $envContent | Out-File -FilePath ".env.local" -Encoding utf8
    Write-Host "✅ .env.local template created" -ForegroundColor Green
}

# Step 6: Generate NEXTAUTH_SECRET
Write-Host ""
Write-Host "[6/6] Generating NEXTAUTH_SECRET..." -ForegroundColor Yellow

$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$secret = [System.BitConverter]::ToString($bytes) -replace '-', ''
$secret = $secret.ToLower()

Write-Host "✅ Generated NEXTAUTH_SECRET:" -ForegroundColor Green
Write-Host "   $secret" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Copy this and paste it into .env.local" -ForegroundColor Yellow

# Final summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure .env.local with your credentials:" -ForegroundColor White
Write-Host "   - Get MongoDB URI from https://mongodb.com/atlas" -ForegroundColor Gray
Write-Host "   - Get Pinata keys from https://pinata.cloud" -ForegroundColor Gray
Write-Host "   - Paste the NEXTAUTH_SECRET shown above" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Copy the code from COPY_PASTE_BUILD_GUIDE.md:" -ForegroundColor White
Write-Host "   - Follow Steps 4-12 to create all files" -ForegroundColor Gray
Write-Host "   - Each step shows the exact file location" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Run the development server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "📚 Full documentation: COPY_PASTE_BUILD_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Ready to build your decentralized livestreaming platform!" -ForegroundColor Green
Write-Host ""
