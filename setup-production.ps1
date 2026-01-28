#!/usr/bin/env pwsh
# Quick Production Setup Script
# Run this to configure livestream environment variables

Write-Host "🔧 PVA Bazaar Production Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Generated secrets
$NEXTAUTH_SECRET = "yIklmeTFv8pLDoY6Qu7SEbRzK5nBCgqJZjXtW2cUdr3MGs4OxHPw1Af0haN9"
$DID_SEED = "2668c0dee48b9810fda17ec69c95f489a5c031fa15e650dc7fda528c5ff5c646"
$BACKEND_URL = "https://pva-backend-h6zkzdmjy-pvagrs-projects.vercel.app"
$LIVESTREAM_URL = "https://pvabazaar-livestream-o3okjf15o-pvagrs-projects.vercel.app"

Write-Host "📦 Deployment URLs:" -ForegroundColor Green
Write-Host "  Backend:    $BACKEND_URL"
Write-Host "  Livestream: $LIVESTREAM_URL"
Write-Host "  Frontend:   https://pvabazaar.org`n"

Write-Host "🔐 Generated Secrets:" -ForegroundColor Yellow
Write-Host "  NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
Write-Host "  DID_SEED:        $DID_SEED`n"

Write-Host "⚙️  Setup Options:`n" -ForegroundColor Magenta

Write-Host "Option 1: Manual Setup (Recommended)" -ForegroundColor White
Write-Host "  1. Go to: https://vercel.com/pvagrs-projects/pvabazaar-livestream/settings/environment-variables"
Write-Host "  2. Add these variables (all environments: Production, Preview, Development):`n"
Write-Host "     NEXTAUTH_URL=$LIVESTREAM_URL"
Write-Host "     NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
Write-Host "     NEXT_PUBLIC_API_URL=$BACKEND_URL"
Write-Host "     DID_SEED=$DID_SEED"
Write-Host "     NODE_ENV=production"
Write-Host "     MONGODB_URI=<copy from backend project>`n"
Write-Host "  3. Redeploy: cd pvabazaar-livestream && vercel --prod`n"

Write-Host "Option 2: CLI Setup (Advanced)" -ForegroundColor White
Write-Host "  Run these commands:"
Write-Host "  cd pvabazaar-livestream"
Write-Host "  vercel link"
Write-Host "  echo '$NEXTAUTH_SECRET' | vercel env add NEXTAUTH_SECRET production"
Write-Host "  echo '$DID_SEED' | vercel env add DID_SEED production"
Write-Host "  echo '$BACKEND_URL' | vercel env add NEXT_PUBLIC_API_URL production"
Write-Host "  echo '$LIVESTREAM_URL' | vercel env add NEXTAUTH_URL production"
Write-Host "  # Then add MONGODB_URI manually from backend project"
Write-Host "  vercel --prod`n"

Write-Host "🔓 Remove Deployment Protection:" -ForegroundColor Red
Write-Host "  Backend:    https://vercel.com/pvagrs-projects/pva-backend-api/settings/deployment-protection"
Write-Host "  Livestream: https://vercel.com/pvagrs-projects/pvabazaar-livestream/settings/deployment-protection"
Write-Host "  Set both to: 'Only Preview Deployments' or 'None'`n"

Write-Host "🧪 Test Commands (after setup):" -ForegroundColor Cyan
Write-Host "  curl $BACKEND_URL/api/health"
Write-Host "  curl -I $LIVESTREAM_URL"
Write-Host "  curl -I https://pvabazaar.org`n"

Write-Host "📚 Documentation:" -ForegroundColor Blue
Write-Host "  See: DEPLOYMENT_STATUS_LIVE.md"
Write-Host "  See: PRODUCTION_DEPLOYED.md`n"

$choice = Read-Host "Open Vercel dashboard to configure variables? (y/n)"
if ($choice -eq 'y') {
    Start-Process "https://vercel.com/pvagrs-projects/pvabazaar-livestream/settings/environment-variables"
    Write-Host "`n✅ Dashboard opened. Configure variables and redeploy!" -ForegroundColor Green
} else {
    Write-Host "`n✅ Setup complete! Follow Option 1 or 2 above." -ForegroundColor Green
}
