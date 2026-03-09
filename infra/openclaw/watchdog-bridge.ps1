param(
  [string]$BackendBaseUrl = "http://localhost:5001",
  [string]$BridgeSecret = "",
  [int]$IntervalSeconds = 60,
  [switch]$DispatchHeartbeat,
  [string]$HeartbeatMessage = "PVA Bazaar OpenClaw watchdog heartbeat",
  [string]$LogFile = ".\\infra\\openclaw\\logs\\watchdog.log",
  [string]$AlertFile = ".\\infra\\openclaw\\logs\\watchdog.alert.log",
  [int]$FailureAlertThreshold = 3,
  [int]$AlertCooldownMinutes = 15,
  [switch]$EnableDesktopToast,
  [string]$AlertWebhookUrl = "",
  [string]$AlertWebhookFormat = "auto"
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param(
    [string]$Level,
    [string]$Message,
    [string]$Path
  )

  $timestamp = (Get-Date).ToUniversalTime().ToString("o")
  $line = "[$timestamp][$Level] $Message"
  Write-Host $line

  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  Add-Content -Path $Path -Value $line
}

function Send-DesktopToast {
  param(
    [string]$Title,
    [string]$Body,
    [string]$LogPath
  )

  if (-not $EnableDesktopToast) {
    return
  }

  try {
    if (Get-Command New-BurntToastNotification -ErrorAction SilentlyContinue) {
      New-BurntToastNotification -Text $Title, $Body | Out-Null
      Write-Log -Level "INFO" -Message "desktop toast sent" -Path $LogPath
    } else {
      Write-Log -Level "WARN" -Message "desktop toast requested but BurntToast module is not installed" -Path $LogPath
    }
  }
  catch {
    Write-Log -Level "WARN" -Message "desktop toast failed: $($_.Exception.Message)" -Path $LogPath
  }
}

function Send-WebhookAlert {
  param(
    [string]$Title,
    [string]$Body,
    [string]$WebhookUrl,
    [string]$WebhookFormat,
    [string]$LogPath
  )

  if (-not $WebhookUrl) {
    return
  }

  try {
    $format = $WebhookFormat.ToLowerInvariant()
    $resolved = $format
    if ($resolved -eq "auto") {
      if ($WebhookUrl -match "discord") {
        $resolved = "discord"
      } elseif ($WebhookUrl -match "slack") {
        $resolved = "slack"
      } else {
        $resolved = "generic"
      }
    }

    $payload = $null
    switch ($resolved) {
      "discord" {
        $payload = @{
          content = "[$Title] $Body"
          username = "PVA OpenClaw Watchdog"
        }
      }
      "slack" {
        $payload = @{
          text = "*$Title*`n$Body"
          username = "PVA OpenClaw Watchdog"
        }
      }
      default {
        $payload = @{
          title = $Title
          message = $Body
          source = "infra/openclaw/watchdog-bridge.ps1"
          timestamp = (Get-Date).ToUniversalTime().ToString("o")
        }
      }
    }

    $json = $payload | ConvertTo-Json -Depth 8
    Invoke-RestMethod -Method Post -Uri $WebhookUrl -ContentType "application/json" -Body $json -TimeoutSec 20 | Out-Null
    Write-Log -Level "INFO" -Message "webhook alert sent format=$resolved" -Path $LogPath
  }
  catch {
    Write-Log -Level "WARN" -Message "webhook alert failed: $($_.Exception.Message)" -Path $LogPath
  }
}

function Write-Alert {
  param(
    [string]$Message,
    [string]$Path
  )

  $timestamp = (Get-Date).ToUniversalTime().ToString("o")
  $line = "[$timestamp][ALERT] $Message"

  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  Add-Content -Path $Path -Value $line
  Write-Host $line -ForegroundColor Yellow
}

function Invoke-WatchdogCycle {
  param(
    [string]$BaseUrl,
    [string]$Secret,
    [switch]$DoDispatch,
    [string]$Message,
    [string]$Path
  )

  $base = $BaseUrl.TrimEnd('/')
  $statusUrl = "$base/api/openclaw/status"

  try {
    $status = Invoke-RestMethod -Method Get -Uri $statusUrl -TimeoutSec 20
    $reachable = $false
    if ($status.PSObject.Properties.Name -contains 'reachable') {
      $reachable = [bool]$status.reachable
    }
    $configured = $false
    if ($status.PSObject.Properties.Name -contains 'configured') {
      $configured = [bool]$status.configured
    }

    Write-Log -Level "INFO" -Message "status configured=$configured reachable=$reachable" -Path $Path

    if ($DoDispatch) {
      $dispatchUrl = "$base/api/openclaw/dispatch"
      $headers = @{ "Content-Type" = "application/json" }
      if ($Secret) {
        $headers["X-OpenClaw-Secret"] = $Secret
      }

      $payload = @{
        event = "pvabazaar.watchdog.heartbeat"
        message = $Message
        metadata = @{
          source = "infra/openclaw/watchdog-bridge.ps1"
          timestamp = (Get-Date).ToUniversalTime().ToString("o")
        }
      } | ConvertTo-Json -Depth 8

      $dispatch = Invoke-RestMethod -Method Post -Uri $dispatchUrl -Headers $headers -Body $payload -TimeoutSec 25
      $forwarded = $false
      if ($dispatch.PSObject.Properties.Name -contains 'forwarded') {
        $forwarded = [bool]$dispatch.forwarded
      }
      Write-Log -Level "INFO" -Message "dispatch forwarded=$forwarded" -Path $Path

      if (-not $forwarded) {
        return $false
      }
    }

    return $true
  }
  catch {
    Write-Log -Level "ERROR" -Message "watchdog cycle failed: $($_.Exception.Message)" -Path $Path
    return $false
  }
}

if ($IntervalSeconds -lt 10) {
  throw "IntervalSeconds must be >= 10"
}

if ($FailureAlertThreshold -lt 1) {
  throw "FailureAlertThreshold must be >= 1"
}

if ($AlertCooldownMinutes -lt 1) {
  throw "AlertCooldownMinutes must be >= 1"
}

$allowedFormats = @("auto", "discord", "slack", "generic")
if (-not ($allowedFormats -contains $AlertWebhookFormat.ToLowerInvariant())) {
  throw "AlertWebhookFormat must be one of: auto, discord, slack, generic"
}

$consecutiveFailures = 0
$lastAlertAt = $null

Write-Log -Level "INFO" -Message "watchdog start baseUrl=$BackendBaseUrl interval=${IntervalSeconds}s dispatchHeartbeat=$DispatchHeartbeat failureAlertThreshold=$FailureAlertThreshold cooldownMinutes=$AlertCooldownMinutes webhookEnabled=$([bool]$AlertWebhookUrl) webhookFormat=$AlertWebhookFormat" -Path $LogFile

while ($true) {
  $ok = Invoke-WatchdogCycle -BaseUrl $BackendBaseUrl -Secret $BridgeSecret -DoDispatch:$DispatchHeartbeat -Message $HeartbeatMessage -Path $LogFile

  if ($ok) {
    if ($consecutiveFailures -gt 0) {
      Write-Log -Level "INFO" -Message "watchdog recovered after $consecutiveFailures consecutive failures" -Path $LogFile
    }
    $consecutiveFailures = 0
  } else {
    $consecutiveFailures++
    Write-Log -Level "WARN" -Message "consecutive failures=$consecutiveFailures" -Path $LogFile

    if ($consecutiveFailures -ge $FailureAlertThreshold) {
      $now = Get-Date
      $canAlert = $true
      if ($lastAlertAt) {
        $elapsed = ($now - $lastAlertAt).TotalMinutes
        if ($elapsed -lt $AlertCooldownMinutes) {
          $canAlert = $false
        }
      }

      if ($canAlert) {
        $alertMessage = "OpenClaw watchdog failure threshold reached ($consecutiveFailures consecutive failures). backend=$BackendBaseUrl"
        Write-Alert -Message $alertMessage -Path $AlertFile
        Send-DesktopToast -Title "PVA OpenClaw Watchdog Alert" -Body $alertMessage -LogPath $LogFile
        Send-WebhookAlert -Title "PVA OpenClaw Watchdog Alert" -Body $alertMessage -WebhookUrl $AlertWebhookUrl -WebhookFormat $AlertWebhookFormat -LogPath $LogFile
        $lastAlertAt = $now
      }
    }
  }

  Start-Sleep -Seconds $IntervalSeconds
}
