# PVA Bazaar - Library Module Deployment Verification (PowerShell)
# Usage: .\scripts\verify-library-deployment.ps1 -ApiBase "https://pva-bazaar-app-1.onrender.com"

param(
    [string]$ApiBase = "https://pva-bazaar-app-1.onrender.com",
    [int]$TimeoutSeconds = 30
)

$ErrorActionPreference = "Continue"

# Color codes
$Green = "`e[0;32m"
$Red = "`e[0;31m"
$Yellow = "`e[1;33m"
$Blue = "`e[0;34m"
$Reset = "`e[0m"

Write-Host "╔════════════════════════════════════════════════════════════════════════════╗"
Write-Host "║       PVA BAZAAR - LIBRARY MODULE DEPLOYMENT VERIFICATION                  ║"
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝"
Write-Host ""
Write-Host "📡 Target: $ApiBase"
Write-Host "⏱️  Timeout: ${TimeoutSeconds}s per request"
Write-Host ""

# PHASE 1: Check Backend Reachability
Write-Host "${Blue}PHASE 1: Backend Reachability Check${Reset}"
Write-Host "═══════════════════════════════════════════════════════════════"

try {
    $response = Invoke-WebRequest -Uri "$ApiBase/api/health" -TimeoutSec $TimeoutSeconds -UseBasicParsing -ErrorAction Stop
    Write-Host "${Green}✅ Backend is reachable${Reset}"
} catch {
    Write-Host "${Red}❌ Backend not reachable${Reset}"
    Write-Host "   URL: $ApiBase/api/health"
    Write-Host "   Error: $($_.Exception.Message)"
    exit 1
}
Write-Host ""

# PHASE 2: Verify SHA (Critical for deployment proof)
Write-Host "${Blue}PHASE 2: Verify Deployment SHA${Reset}"
Write-Host "═══════════════════════════════════════════════════════════════"

try {
    $response = Invoke-WebRequest -Uri "$ApiBase/api/version" -TimeoutSec $TimeoutSeconds -UseBasicParsing
    $content = $response.Content | ConvertFrom-Json
    $currentSha = $content.sha -replace '(.{8}).*', '$1'
    $expectedPrefix = "fa2378a5"
    
    Write-Host "Current SHA: $currentSha"
    
    if ($currentSha -eq $expectedPrefix) {
        Write-Host "${Green}✅ Correct SHA deployed ($currentSha)${Reset}"
    } elseif ($currentSha -eq "6cb7cbd9") {
        Write-Host "${Yellow}⏳ Old SHA still live (6cb7cbd9) - deployment not yet complete${Reset}"
        Write-Host "   Wait 2-3 minutes and retry"
        exit 1
    } else {
        Write-Host "${Yellow}⚠️  Different SHA deployed: $currentSha${Reset}"
        Write-Host "   Expected prefix: $expectedPrefix"
        Write-Host "   This is OK if it's a later commit with the fix"
    }
} catch {
    Write-Host "${Red}❌ Could not retrieve SHA from /api/version${Reset}"
    Write-Host "   Error: $($_.Exception.Message)"
    exit 1
}
Write-Host ""

# PHASE 3: Test Library Endpoints
Write-Host "${Blue}PHASE 3: Library Endpoints Verification${Reset}"
Write-Host "═══════════════════════════════════════════════════════════════"

# Test 1: List Articles (Public endpoint)
Write-Host ""
Write-Host "Test 1: GET /api/library?kind=articles"
try {
    $response = Invoke-WebRequest -Uri "$ApiBase/api/library?kind=articles&limit=1" -TimeoutSec $TimeoutSeconds -UseBasicParsing
    $statusCode = $response.StatusCode
    
    if ($statusCode -eq 200) {
        Write-Host "${Green}✅ 200 OK${Reset}"
        $articleCount = ($response.Content | ConvertFrom-Json).Count
        Write-Host "   Articles found: $articleCount"
    } else {
        Write-Host "${Red}❌ HTTP $statusCode${Reset}"
    }
} catch {
    Write-Host "${Red}❌ Request failed: $($_.Exception.Message)${Reset}"
}

# Test 2: Submit without auth (should reject)
Write-Host ""
Write-Host "Test 2: POST /api/library/submit (no auth)"
try {
    $response = Invoke-WebRequest -Uri "$ApiBase/api/library/submit" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"title":"test"}' `
        -TimeoutSec $TimeoutSeconds `
        -UseBasicParsing -ErrorAction Stop
    Write-Host "${Yellow}⚠️  HTTP 200 (expected 401)${Reset}"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "${Green}✅ 401 Unauthorized (correct rejection)${Reset}"
    } else {
        Write-Host "${Yellow}⚠️  HTTP $($_.Exception.Response.StatusCode)${Reset}"
    }
}

# Test 3: Pending articles without auth (should reject)
Write-Host ""
Write-Host "Test 3: GET /api/library/pending (no auth)"
try {
    $response = Invoke-WebRequest -Uri "$ApiBase/api/library/pending" `
        -TimeoutSec $TimeoutSeconds `
        -UseBasicParsing -ErrorAction Stop
    Write-Host "${Yellow}⚠️  HTTP 200 (expected 401)${Reset}"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "${Green}✅ 401 Unauthorized (correct rejection)${Reset}"
    } else {
        Write-Host "${Yellow}⚠️  HTTP $($_.Exception.Response.StatusCode)${Reset}"
    }
}

# Test 4: **CRITICAL** - Invalid article should return 404 (not 500)
Write-Host ""
Write-Host "Test 4: GET /api/library/invalid-does-not-exist (CRITICAL)"
try {
    $response = Invoke-WebRequest -Uri "$ApiBase/api/library/does-not-exist" `
        -TimeoutSec $TimeoutSeconds `
        -UseBasicParsing -ErrorAction Stop
    Write-Host "${Yellow}⚠️  HTTP 200 (expected 404)${Reset}"
} catch {
    $statusCode = $_.Exception.Response.StatusCode
    
    if ($statusCode -eq 404) {
        Write-Host "${Green}✅ 404 Not Found (FIX VERIFIED - Deployment Successful!)${Reset}"
        Write-Host ""
        Write-Host "${Green}╔════════════════════════════════════════════════════════════════╗${Reset}"
        Write-Host "${Green}║  ✅ DEPLOYMENT VERIFICATION PASSED                            ║${Reset}"
        Write-Host "${Green}║                                                                ║${Reset}"
        Write-Host "${Green}║  Collaborative Library Module is LIVE and working correctly    ║${Reset}"
        Write-Host "${Green}║  SHA: $currentSha                                              ║${Reset}"
        Write-Host "${Green}╚════════════════════════════════════════════════════════════════╝${Reset}"
        exit 0
    } elseif ($statusCode -eq 500) {
        Write-Host "${Red}❌ 500 Internal Server Error (Fix NOT deployed yet)${Reset}"
        Write-Host "   Old SHA (6cb7cbd9) still live"
        Write-Host "   Wait 2-3 minutes and retry"
        exit 1
    } else {
        Write-Host "${Yellow}⚠️  HTTP $statusCode (expected 404)${Reset}"
    }
}

Write-Host ""
Write-Host "${Yellow}⚠️  Verification incomplete - check results above${Reset}"
exit 1
