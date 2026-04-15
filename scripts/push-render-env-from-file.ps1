<#
.SYNOPSIS
  Merges variables from a local .env-style file into a Render web service via the Render REST API.

.DESCRIPTION
  Delegates to push-render-env-from-file.mjs (Node) so the request body is valid JSON (PowerShell 5.1 ConvertTo-Json can break on secrets and special characters).

.PARAMETER ServiceId
  Render service id, e.g. srv-xxxx. Sets RENDER_SERVICE_ID for the Node script. Default: $env:RENDER_SERVICE_ID

.PARAMETER EnvFile
  Path to KEY=VALUE file (default render-dashboard.env at repo root).

.PARAMETER DryRun
  List keys that would be added/changed (values never printed).

.PARAMETER AllowLocalhostMongo
  Allow MONGODB_URI pointing at localhost (normally blocked for safety).

.NOTES
  API key (pick one):
    - Environment: RENDER_API_KEY
    - File (gitignored): .render/api-key  or  render-api-key.local  (single line, no quotes)

  Requires Node.js on PATH. From repo root:
    powershell -File scripts/push-render-env-from-file.ps1 -ServiceId "srv-..."
#>
param(
  [string] $ServiceId = $env:RENDER_SERVICE_ID,
  [string] $EnvFile = "render-dashboard.env",
  [switch] $DryRun,
  [switch] $AllowLocalhostMongo
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

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw "Node.js is required on PATH to run scripts/push-render-env-from-file.mjs"
}

$env:RENDER_API_KEY = $apiKey
$env:RENDER_SERVICE_ID = $ServiceId.Trim()

$mjs = Join-Path $PSScriptRoot "push-render-env-from-file.mjs"
$envPath = Join-Path (Get-Location) $EnvFile
$args = @($mjs)
if ($DryRun) { $args += "--dry-run" }
if ($AllowLocalhostMongo) { $args += "--allow-localhost-mongo" }
$args += $envPath

& node @args
exit $LASTEXITCODE
