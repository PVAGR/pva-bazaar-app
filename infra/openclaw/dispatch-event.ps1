# OpenClaw Event Dispatcher
# Sends events to OpenClaw via PVA Bazaar backend

param(
    [Parameter(Mandatory=$true)]
    [string]$Event,
    
    [Parameter(Mandatory=$true)]
    [string]$Message,
    
    [hashtable]$Metadata = @{},
    
    [string]$BackendUrl = "http://localhost:5000",
    [string]$AdminToken,
    [switch]$Production
)

if ($Production) {
    $BackendUrl = "https://api.pvabazaar.org"
}

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              OpenClaw Event Dispatcher                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Add timestamp to metadata if not present
if (-not $Metadata.ContainsKey("timestamp")) {
    $Metadata.timestamp = (Get-Date).ToString("o")
}

# Add source if not present
if (-not $Metadata.ContainsKey("source")) {
    $Metadata.source = "dispatch-event.ps1"
}

$payload = @{
    event = $Event
    message = $Message
    metadata = $Metadata
}

Write-Host "Event Details:" -ForegroundColor Yellow
Write-Host "  Event:   $Event" -ForegroundColor White
Write-Host "  Message: $Message" -ForegroundColor White
Write-Host "  Metadata:" -ForegroundColor White
$Metadata.GetEnumerator() | ForEach-Object {
    Write-Host "    $($_.Key): $($_.Value)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Dispatching to: $BackendUrl/api/openclaw/dispatch" -ForegroundColor Yellow
Write-Host ""

try {
    $headers = @{}
    if ($AdminToken) {
        $headers["Authorization"] = "Bearer $AdminToken"
    }

    $response = Invoke-RestMethod `
        -Uri "$BackendUrl/api/openclaw/dispatch" `
        -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body ($payload | ConvertTo-Json -Depth 10)
    
    if ($response.ok -and $response.forwarded) {
        Write-Host "✓ Success!" -ForegroundColor Green
        Write-Host "  Status:    $($response.status)" -ForegroundColor Green
        Write-Host "  Forwarded: $($response.forwarded)" -ForegroundColor Green
        Write-Host "  Timestamp: $($response.timestamp)" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "⚠ Partial Success" -ForegroundColor Yellow
        Write-Host "  Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Yellow
        exit 0
    }
    
} catch {
    Write-Host "✗ Failed to dispatch event" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        try {
            $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "  Detail: $($errorDetail.message)" -ForegroundColor Red
        } catch {
            Write-Host "  Detail: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    
    exit 1
}
