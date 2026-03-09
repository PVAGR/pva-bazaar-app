param(
  [string]$TaskName = "PVABazaar-OpenClaw-Watchdog",
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
  Write-Host "[watchdog-task] $Message" -ForegroundColor Cyan
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$scriptPath = Join-Path $repoRoot "infra\openclaw\watchdog-bridge.ps1"

if (-not (Test-Path $scriptPath)) {
  throw "Watchdog script not found at $scriptPath"
}

$dispatchArg = ""
if ($DispatchHeartbeat) {
  $dispatchArg = " -DispatchHeartbeat"
}

$toastArg = ""
if ($EnableDesktopToast) {
  $toastArg = " -EnableDesktopToast"
}

$escapedMessage = $HeartbeatMessage.Replace('"', '`"')
$escapedSecret = $BridgeSecret.Replace('"', '`"')
$escapedWebhookUrl = $AlertWebhookUrl.Replace('"', '`"')
$escapedWebhookFormat = $AlertWebhookFormat.Replace('"', '`"')

$argument = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -BackendBaseUrl `"$BackendBaseUrl`" -BridgeSecret `"$escapedSecret`" -IntervalSeconds $IntervalSeconds -HeartbeatMessage `"$escapedMessage`" -FailureAlertThreshold $FailureAlertThreshold -AlertCooldownMinutes $AlertCooldownMinutes -AlertWebhookUrl `"$escapedWebhookUrl`" -AlertWebhookFormat `"$escapedWebhookFormat`"$dispatchArg$toastArg"

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argument
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Write-Step "Updating existing task: $TaskName"
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
}

try {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -ErrorAction Stop | Out-Null
} catch {
  $message = $_.Exception.Message
  throw "Failed to register task '$TaskName'. If you see access denied, run PowerShell as Administrator and retry, or use install-watchdog-startup.ps1 for no-admin auto-start. Detail: $message"
}

if (-not (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue)) {
  throw "Task '$TaskName' was not found after registration."
}

Write-Step "Task installed: $TaskName"
Write-Step "Start immediately with: Start-ScheduledTask -TaskName `"$TaskName`""
Write-Step "View logs in: .\\infra\\openclaw\\logs\\watchdog.log"
