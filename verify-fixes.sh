#!/bin/bash

echo "🔍 Verifying Configuration Fixes..."
echo ""

# 1. Check Vite base path
echo "1️⃣ Checking Vite base path..."
if grep -q "base: '/'" Frontend/vite.config.js 2>/dev/null; then
  echo "   ✅ Base path is correctly set to '/'"
else
  echo "   ❌ Base path is NOT set to '/'"
fi

# 2. Check local .env
echo "2️⃣ Checking Frontend local .env..."
if grep -q "VITE_API_URL=http://localhost:5001/api" Frontend/.env 2>/dev/null; then
  echo "   ✅ Local API URL points to port 5001"
else
  echo "   ⚠️  Local .env might need update"
fi

# 3. Check production .env
echo "3️⃣ Checking Frontend production .env..."
if [ -f Frontend/.env.production ]; then
  echo "   ✅ .env.production exists"
  grep "VITE_API_URL" Frontend/.env.production
else
  echo "   ⚠️  .env.production not found (may be gitignored)"
fi

# 4. Check root vercel.json removed
echo "4️⃣ Checking root vercel.json..."
if [ ! -f vercel.json ]; then
  echo "   ✅ Root vercel.json has been removed/renamed"
else
  echo "   ❌ Root vercel.json still exists (should be removed for GitHub Pages)"
fi

# 5. Check backend vercel.json
echo "5️⃣ Checking backend vercel.json..."
if [ -f backend/vercel.json ]; then
  echo "   ✅ Backend vercel.json exists"
  if grep -q "ALLOWED_ORIGIN.*pvabazaar.org" backend/vercel.json; then
    echo "   ✅ CORS configured for pvabazaar.org"
  fi
else
  echo "   ❌ Backend vercel.json not found"
fi

# 6. Check backend default port
echo "6️⃣ Checking backend default port..."
if grep -q "PORT || 5001" backend/api/index.js 2>/dev/null; then
  echo "   ✅ Backend defaults to port 5001"
else
  echo "   ⚠️  Backend port might be different"
fi

# 7. Check API integration in frontend
echo "7️⃣ Checking frontend API integration..."
if grep -q "import.meta.env.VITE_API_URL" Frontend/src/lib/api.js 2>/dev/null; then
  echo "   ✅ Frontend uses VITE_API_URL environment variable"
else
  echo "   ⚠️  Frontend API integration needs verification"
fi

# 8. Test site availability
echo "8️⃣ Testing site availability..."
if command -v curl &> /dev/null; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://pvabazaar.org 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Site responds with HTTP 200 OK"
  else
    echo "   ⚠️  Site returned HTTP $HTTP_CODE (may still be deploying)"
  fi
else
  echo "   ⚠️  curl not available, skipping site test"
fi

echo ""
echo "9️⃣ Checking gh-pages deployment..."
if git ls-remote --heads origin gh-pages &>/dev/null; then
  echo "   ✅ gh-pages branch exists"
  # Fetch and check gh-pages content
  git fetch origin gh-pages --quiet 2>/dev/null || true
  
  # Get list of files at root of gh-pages
  files=$(git ls-tree -r origin/gh-pages --name-only 2>/dev/null)
  
  # Check for index.html at root
  if echo "$files" | grep -q '^index.html$'; then
    echo "   ✅ gh-pages has index.html at root"
  else
    echo "   ❌ gh-pages missing index.html at root (deployment issue)"
  fi
  
  # Check for src/ or public/ directories (should NOT exist)
  if echo "$files" | grep -q '^src/'; then
    echo "   ❌ Source directories (src/) present in gh-pages - needs force clean"
  else
    echo "   ✅ No source directories in gh-pages (clean deployment)"
  fi
  
  # Check for assets directory (should exist)
  if echo "$files" | grep -q '^assets/'; then
    echo "   ✅ Built assets directory present"
  else
    echo "   ⚠️  No assets directory found"
  fi
else
  echo "   ⚠️  gh-pages branch not yet created (will be created on first deploy)"
fi

echo ""
echo "📊 Verification Complete!"
echo ""
echo "Next steps:"
echo "  1. Run './test-app.sh' to test locally"
echo "  2. Push to main to trigger GitHub Actions deployment"
echo "  3. Monitor: https://github.com/PVAGR/pva-bazaar-app/actions"
echo "  4. Check artifacts in Actions for debugging"
echo "  5. Deploy backend folder to Vercel"
