<#
.SYNOPSIS
  Merges variables from a local .env-style file into a Render web service via the Render REST API (no dashboard paste).

.PARAMETER ServiceId
  Render service id, e.g. srv-xxxx. Default: $env:RENDER_SERVICE_ID

.PARAMETER EnvFile
  Path to KEY=VALUE file (default: render-dashboard.env at repo root).

.PARAMETER DryRun
  List keys that would be added/changed (values never printed).

.PARAMETER AllowLocalhostMongo
  Allow MONGODB_URI pointing at localhost (normally blocked for safety).

.PARAMETER TriggerDeploy
  POST deploys after a successful env update (Render may still auto-redeploy on env change).

.NOTES
  API key (pick one):
    - Environment: RENDER_API_KEY
    - File (gitignored): .render/api-key  or  render-api-key.local  (single line, no quotes)

  Never commit secrets. From repo root:
    powershell -File scripts/push-render-env-from-file.ps1 -ServiceId "srv-..."
#>
param(
  [string] $ServiceId = $env:RENDER_SERVICE_ID,
  [string] $EnvFile = "render-dashboard.env",
  [switch] $DryRun,
  [switch] $AllowLocalhostMongo,
  [switch] $TriggerDeploy
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Get-RenderApiKey {
  if ($env:RENDER_API_KEY -and $env:RENDER_API_KEY.Trim().Length -gt 0) {
    return $env:RENDER_API_KEY.Trim()
  }
  $candidates = @(
    (Join-Path (Get-Location) ".render\api-key"),
    (Join-Path (Get-Location) "render-api-key.local"),
    (Join-Path $env:USERPROFILE ".render\api-key")
  )
  foreach ($p in $candidates) {
    if (Test-Path -LiteralPath $p) {
      $t = (Get-Content -LiteralPath $p -Raw).Trim()
      if ($t.Length -gt 0) { return $t }
    }
  }
  return $null
}

function Read-DotEnvMap([string] $Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Env file not found: $Path"
  }
  $map = @{}
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.TrimEnd()
    if ($line -match '^\s*#' -or $line -match '^\s*$') { return }
    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { return }
    $k = $line.Substring(0, $eq).Trim()
    $v = $line.Substring($eq + 1).Trim()
    if ($v.Length -ge 2) {
      if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
        $v = $v.Substring(1, $v.Length - 2)
      }
    }
    if ($k) { $map[$k] = $v }
  }
  return $map
}

function Get-RenderServiceEnvVars {
  param([string] $Sid, [hashtable] $Headers)
  $out = [System.Collections.Generic.List[object]]::new()
  $cursor = $null
  do {
    $q = "https://api.render.com/v1/services/$Sid/env-vars?limit=100"
    if ($cursor) {
      $q = $q + "&cursor=" + [uri]::EscapeDataString($cursor)
    }
    $resp = Invoke-RestMethod -Uri $q -Headers $Headers -Method GET
    if ($resp.PSObject.Properties.Name -contains 'envVars' -and $resp.envVars) {
      foreach ($item in $resp.envVars) { $out.Add($item) }
    }
    elseif ($resp -is [array]) {
      foreach ($item in $resp) { $out.Add($item) }
    }
    $cursor = $null
    if ($resp.PSObject.Properties.Name -contains 'cursor') { $cursor = $resp.cursor }
  } while ($cursor)
  return $out
}

$apiKey = Get-RenderApiKey
if (-not $apiKey) {
  throw @"
RENDER_API_KEY is not set and no key file was found.

Create one of:
  - Set environment variable RENDER_API_KEY for this shell, or
  - Write your Render API key (one line) to .render/api-key (gitignored) at repo root.

Dashboard: https://dashboard.render.com/u/settings?add-api-key
"@
}

if (-not $ServiceId -or $ServiceId.Trim().Length -eq 0) {
  throw "ServiceId is required (parameter -ServiceId or env RENDER_SERVICE_ID)."
}

$headers = @{
  Authorization = "Bearer $apiKey"
  Accept        = "application/json"
}

$fileMap = Read-DotEnvMap (Join-Path (Get-Location) $EnvFile)

if ($fileMap.ContainsKey('MONGODB_URI')) {
  $mongo = $fileMap['MONGODB_URI']
  if (-not $AllowLocalhostMongo -and ($mongo -match '127\.0\.0\.1|localhost')) {
    throw "MONGODB_URI in $EnvFile still points at localhost. Fix the file to use Atlas (mongodb+srv://...) or pass -AllowLocalhostMongo to override."
  }
}

$remoteList = Get-RenderServiceEnvVars -Sid $ServiceId -Headers $headers
$remoteByKey = @{}
foreach ($r in $remoteList) {
  if ($r.key) { $remoteByKey[$r.key] = $r.value }
}

$changes = [System.Collections.Generic.List[string]]::new()
foreach ($k in $fileMap.Keys) {
  $newV = $fileMap[$k]
  if (-not $remoteByKey.ContainsKey($k)) {
    [void]$changes.Add("+ $k")
  }
  elseif ($remoteByKey[$k] -cne $newV) {
    [void]$changes.Add("~ $k")
  }
}

if ($changes.Count -eq 0) {
  Write-Host "No changes: Render already matches $EnvFile for all keys present in the file."
  exit 0
}

Write-Host "Planned updates ($($changes.Count) keys):"
$changes | Sort-Object | ForEach-Object { Write-Host "  $_" }

if ($DryRun) {
  Write-Host "DryRun: no API writes performed."
  exit 0
}

foreach ($k in $fileMap.Keys) {
  $remoteByKey[$k] = $fileMap[$k]
}

$bodyObjects = foreach ($key in ($remoteByKey.Keys | Sort-Object)) {
  [ordered]@{ key = $key; value = $remoteByKey[$key] }
}
$json = ConvertTo-Json -InputObject @($bodyObjects) -Depth 8 -Compress

$putHeaders = $headers.Clone()
$putHeaders['Content-Type'] = 'application/json'

Invoke-RestMethod `
  -Uri "https://api.render.com/v1/services/$ServiceId/env-vars" `
  -Headers $putHeaders `
  -Method PUT `
  -Body $json | Out-Null

Write-Host "PUT env-vars succeeded for service $ServiceId."

if ($TriggerDeploy) {
  $deployBody = '{"clearCache":"do_not_clear"}'
  Invoke-RestMethod `
    -Uri "https://api.render.com/v1/services/$ServiceId/deploys" `
    -Headers $putHeaders `
    -Method POST `
    -Body $deployBody | Out-Null
  Write-Host "Deploy trigger POST sent."
}
