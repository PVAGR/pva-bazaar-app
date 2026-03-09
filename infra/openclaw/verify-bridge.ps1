param(
  [string]$BackendBaseUrl = "http://localhost:5001",
  [switch]$Dispatch,
  [string]$BridgeSecret = "",
  [string]$Message = "PVA Bazaar bridge verification event"
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "[openclaw-verify] $Message" -ForegroundColor Cyan
}

$base = $BackendBaseUrl.TrimEnd('/')
$statusUrl = "$base/api/openclaw/status"
$dispatchUrl = "$base/api/openclaw/dispatch"

Write-Step "Checking bridge status: $statusUrl"
$statusResponse = Invoke-RestMethod -Method Get -Uri $statusUrl -TimeoutSec 20
$statusResponse | ConvertTo-Json -Depth 8

if (-not $Dispatch) {
  Write-Step "Dispatch skipped. Pass -Dispatch to send a test event."
  exit 0
}

$headers = @{
  "Content-Type" = "application/json"
}
if ($BridgeSecret) {
  $headers["X-OpenClaw-Secret"] = $BridgeSecret
}

$payload = @{
  event = "pvabazaar.powershell.verify"
  message = $Message
  metadata = @{
    source = "infra/openclaw/verify-bridge.ps1"
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
  }
} | ConvertTo-Json -Depth 8

Write-Step "Dispatching test event: $dispatchUrl"
$dispatchResponse = Invoke-RestMethod -Method Post -Uri $dispatchUrl -Headers $headers -Body $payload -TimeoutSec 25
$dispatchResponse | ConvertTo-Json -Depth 8

Write-Step "Bridge verification complete"
