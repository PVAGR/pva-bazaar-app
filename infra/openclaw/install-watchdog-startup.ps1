param(
  [string]$BackendBaseUrl = "http://localhost:5001",
  [string]$BridgeSecret = "",
  [int]$IntervalSeconds = 60,
  [switch]$DispatchHeartbeat,
  [string]$HeartbeatMessage = "PVA Bazaar OpenClaw watchdog heartbeat",
  [int]$FailureAlertThreshold = 3,
  [int]$AlertCooldownMinutes = 15,
  [switch]$EnableDesktopToast,
  [string]$AlertWebhookUrl = "",
  [string]$AlertWebhookFormat = "auto"
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "[watchdog-startup] $Message" -ForegroundColor Cyan
}

function Escape-ForDoubleQuotes {
  param([string]$Value)
  if ($null -eq $Value) {
    return ""
  }
  return $Value.Replace('"', '""')
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$watchdogScript = Join-Path $repoRoot "infra\openclaw\watchdog-bridge.ps1"

if (-not (Test-Path $watchdogScript)) {
  throw "Watchdog script not found at $watchdogScript"
}

$startupDir = [Environment]::GetFolderPath('Startup')
if (-not (Test-Path $startupDir)) {
  New-Item -Path $startupDir -ItemType Directory -Force | Out-Null
}

$launcherPath = Join-Path $startupDir "PVABazaar-OpenClaw-Watchdog.cmd"

$dispatchArg = ""
if ($DispatchHeartbeat) {
  $dispatchArg = " -DispatchHeartbeat"
}

$toastArg = ""
if ($EnableDesktopToast) {
  $toastArg = " -EnableDesktopToast"
}

$safeWatchdog = Escape-ForDoubleQuotes -Value $watchdogScript
$safeBase = Escape-ForDoubleQuotes -Value $BackendBaseUrl
$safeSecret = Escape-ForDoubleQuotes -Value $BridgeSecret
$safeMessage = Escape-ForDoubleQuotes -Value $HeartbeatMessage
$safeWebhookUrl = Escape-ForDoubleQuotes -Value $AlertWebhookUrl
$safeWebhookFormat = Escape-ForDoubleQuotes -Value $AlertWebhookFormat

$launcher = @(
  "@echo off",
  "setlocal",
  "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"$safeWatchdog\" -BackendBaseUrl \"$safeBase\" -BridgeSecret \"$safeSecret\" -IntervalSeconds $IntervalSeconds -HeartbeatMessage \"$safeMessage\" -FailureAlertThreshold $FailureAlertThreshold -AlertCooldownMinutes $AlertCooldownMinutes -AlertWebhookUrl \"$safeWebhookUrl\" -AlertWebhookFormat \"$safeWebhookFormat\"$dispatchArg$toastArg",
  "endlocal"
) -join [Environment]::NewLine

Set-Content -Path $launcherPath -Value $launcher -Encoding ASCII

Write-Step "Startup launcher installed: $launcherPath"
Write-Step "It will run on next sign-in for user: $env:USERNAME"
Write-Step "To remove it later, delete: $launcherPath"
