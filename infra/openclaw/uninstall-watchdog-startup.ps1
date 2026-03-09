$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "[watchdog-startup] $Message" -ForegroundColor Cyan
}

$startupDir = [Environment]::GetFolderPath('Startup')
$launcherPath = Join-Path $startupDir "PVABazaar-OpenClaw-Watchdog.cmd"

if (Test-Path $launcherPath) {
  Remove-Item -Path $launcherPath -Force
  Write-Step "Removed startup launcher: $launcherPath"
} else {
  Write-Step "No startup launcher found at: $launcherPath"
}
