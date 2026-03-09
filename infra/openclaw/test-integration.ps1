# OpenClaw Integration Test Suite
# Tests the complete OpenClaw integration end-to-end

param(
    [string]$BackendUrl = "http://localhost:5000",
    [switch]$Production,
    [switch]$Verbose
)

if ($Production) {
    $BackendUrl = "https://api.pvabazaar.org"
}

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         OpenClaw Integration Test Suite                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: $BackendUrl" -ForegroundColor White
Write-Host "Mode: $(if ($Production) { 'Production' } else { 'Development' })" -ForegroundColor White
Write-Host ""

$testResults = @()
$testCount = 0
$passCount = 0
$failCount = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body = $null,
        [scriptblock]$Validator
    )
    
    $script:testCount++
    Write-Host "[$script:testCount] Testing: $Name" -ForegroundColor Yellow -NoNewline
    
    try {
        $uri = "$BackendUrl$Endpoint"
        $params = @{
            Uri = $uri
            Method = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        if ($Verbose) {
            Write-Host ""
            Write-Host "  Request: $Method $uri" -ForegroundColor Gray
            if ($Body) {
                Write-Host "  Body: $($params.Body)" -ForegroundColor Gray
            }
        }
        
        $response = Invoke-RestMethod @params
        
        if ($Verbose) {
            Write-Host "  Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
        
        # Run validator if provided
        if ($Validator) {
            $validationResult = & $Validator $response
            if (-not $validationResult) {
                throw "Validation failed"
            }
        }
        
        Write-Host " ✓ PASS" -ForegroundColor Green
        $script:passCount++
        $script:testResults += @{
            Name = $Name
            Status = "PASS"
            Endpoint = $Endpoint
            Duration = 0
        }
        return $true
        
    } catch {
        Write-Host " ✗ FAIL" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($Verbose) {
            Write-Host "  Details: $($_ | Out-String)" -ForegroundColor DarkRed
        }
        $script:failCount++
        $script:testResults += @{
            Name = $Name
            Status = "FAIL"
            Endpoint = $Endpoint
            Error = $_.Exception.Message
        }
        return $false
    }
}

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "PHASE 1: Basic Health Checks" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Test 1: Main health endpoint
Test-Endpoint `
    -Name "Main health endpoint" `
    -Method "GET" `
    -Endpoint "/api/health" `
    -Validator {
        param($r)
        return $r.ok -eq $true
    }

# Test 2: Ping endpoint
Test-Endpoint `
    -Name "Ping endpoint" `
    -Method "GET" `
    -Endpoint "/api/ping" `
    -Validator {
        param($r)
        return $r.ok -eq $true -and $r.message -eq "pong"
    }

# Test 3: Version endpoint
Test-Endpoint `
    -Name "Version endpoint" `
    -Method "GET" `
    -Endpoint "/api/version" `
    -Validator {
        param($r)
        return $r.ok -eq $true -and $r.version
    }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "PHASE 2: OpenClaw Bridge Endpoints" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Test 4: OpenClaw status
Test-Endpoint `
    -Name "OpenClaw status endpoint" `
    -Method "GET" `
    -Endpoint "/api/openclaw/status" `
    -Validator {
        param($r)
        return $r.ok -eq $true -and ($r.PSObject.Properties.Name -contains "configured")
    }

# Test 5: OpenClaw watchdog status
Test-Endpoint `
    -Name "OpenClaw watchdog status" `
    -Method "GET" `
    -Endpoint "/api/openclaw/watchdog-status" `
    -Validator {
        param($r)
        return $r.ok -eq $true
    }

# Test 6: OpenClaw recent events
Test-Endpoint `
    -Name "OpenClaw recent events" `
    -Method "GET" `
    -Endpoint "/api/openclaw/recent-events?limit=10" `
    -Validator {
        param($r)
        return $r.ok -eq $true -and ($r.PSObject.Properties.Name -contains "events")
    }

# Test 7: OpenClaw dispatch (if not production)
if (-not $Production) {
    Test-Endpoint `
        -Name "OpenClaw dispatch (test event)" `
        -Method "POST" `
        -Endpoint "/api/openclaw/dispatch" `
        -Body @{
            event = "pvabazaar.integration_test"
            message = "Test event from integration test suite"
            metadata = @{
                source = "test-integration.ps1"
                timestamp = (Get-Date).ToString("o")
                testId = [guid]::NewGuid().ToString()
            }
        } `
        -Validator {
            param($r)
            # Accept either successful forward or "not configured" error
            return $r.ok -eq $true -or $r.message -like "*not configured*"
        }
} else {
    Write-Host "[Skipped] OpenClaw dispatch (production mode)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "PHASE 3: Health Endpoint OpenClaw Integration" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Test 8: Health endpoint includes OpenClaw status
Test-Endpoint `
    -Name "Health includes OpenClaw field" `
    -Method "GET" `
    -Endpoint "/api/health" `
    -Validator {
        param($r)
        $hasOpenClaw = $r.PSObject.Properties.Name -contains "openclaw"
        if ($Verbose -and $hasOpenClaw) {
            Write-Host "  OpenClaw status: $($r.openclaw.status)" -ForegroundColor Gray
        }
        return $hasOpenClaw
    }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Tests:  $testCount" -ForegroundColor White
Write-Host "Passed:       $passCount" -ForegroundColor Green
Write-Host "Failed:       $failCount" -ForegroundColor Red
Write-Host "Success Rate: $(if ($testCount -gt 0) { [math]::Round(($passCount / $testCount) * 100, 2) } else { 0 })%" -ForegroundColor White
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ Some tests failed. Review errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Failed tests:" -ForegroundColor Yellow
    $testResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  • $($_.Name) - $($_.Endpoint)" -ForegroundColor Red
        Write-Host "    Error: $($_.Error)" -ForegroundColor DarkRed
    }
    exit 1
}
