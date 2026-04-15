<#
.SYNOPSIS
  Builds ./render-dashboard.env (gitignored) from your Vercel CLI export for Render "Environment" bulk paste.

.PARAMETER Source
  Path to .env.production.local (Vercel pull). Default: .tmp-vercel-pva-backend/.env.production.local

.PARAMETER ServicePublicUrl
  Public base URL of this API on Render, e.g. https://pva-bazaar-app-1.onrender.com
  Replaces https://api.pvabazaar.org in webhook/OpenClaw/health URLs so Telegram and OpenClaw hit the live host.

.PARAMETER OutFile
  Output path (default render-dashboard.env at repo root, gitignored).

.NOTES
  Never commits secrets. Run from repo root:
    powershell -File scripts/sync-render-dashboard-env.ps1 -ServicePublicUrl "https://YOUR-SERVICE.onrender.com"
#>
param(
  [string] $Source = ".tmp-vercel-pva-backend/.env.production.local",
  [string] $ServicePublicUrl = "",
  [string] $OutFile = "render-dashboard.env"
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path $Source)) {
  Write-Error "Source not found: $Source - copy your Vercel env export there first."
}

$skip = '^(VERCEL_|TURBO_|NX_|VERCEL_URL=|VERCEL=)'

function Normalize-MongoLine([string] $line) {
  if ($line -notmatch '^MONGODB_URI=') { return $line }
  # Atlas URIs like ...mongodb.net/?appName=... should name a database (mongoose / Atlas best practice).
  if ($line -match '\.mongodb\.net/\?') {
    return $line -replace '(\.mongodb\.net)/\?', '$1/pvabazaar?'
  }
  return $line
}

function Maybe-RewriteApiHost([string] $line) {
  if (-not $ServicePublicUrl) { return $line }
  $old = 'https://api.pvabazaar.org'
  if ($line.Contains($old)) {
    return $line.Replace($old, $ServicePublicUrl.TrimEnd('/'))
  }
  return $line
}

$lines = [System.Collections.Generic.List[string]]::new()
$seen = @{}

Get-Content -LiteralPath $Source | ForEach-Object {
  $line = $_
  if ($line -match '^\s*#') { return }
  if ($line -match '^\s*$') { return }
  if ($line -match $skip) { return }
  $line = $line -replace '\\r\\n', ''
  $line = Normalize-MongoLine $line
  $line = Maybe-RewriteApiHost $line
  if ($line -match '^([A-Za-z][A-Za-z0-9_]*)=') {
    $seen[$matches[1]] = $true
  }
  $lines.Add($line)
}

# Ensure OpenClaw gateway exists (backend admin + workers expect these when set).
if (-not $seen['OPENCLAW_GATEWAY_URL']) {
  $base = if ($ServicePublicUrl) { $ServicePublicUrl.TrimEnd('/') } else { 'https://api.pvabazaar.org' }
  $lines.Add("OPENCLAW_GATEWAY_URL=`"${base}/api/openclaw`"")
}
if (-not $seen['OPENCLAW_WEBHOOK_URL']) {
  $base = if ($ServicePublicUrl) { $ServicePublicUrl.TrimEnd('/') } else { 'https://api.pvabazaar.org' }
  $lines.Add("OPENCLAW_WEBHOOK_URL=`"${base}/api/openclaw/webhook`"")
}
if (-not $seen['OPENCLAW_HEALTH_URL']) {
  $base = if ($ServicePublicUrl) { $ServicePublicUrl.TrimEnd('/') } else { 'https://api.pvabazaar.org' }
  $lines.Add("OPENCLAW_HEALTH_URL=`"${base}/api/health-check`"")
}

$lines | Set-Content -LiteralPath $OutFile -Encoding utf8

Write-Host ('Wrote ' + $OutFile + ' (gitignored).')
if ($ServicePublicUrl) {
  Write-Host ('Rewrote ' + 'https://api.pvabazaar.org' + ' -> ' + $ServicePublicUrl.TrimEnd('/') + ' for service-bound URLs.')
}
Write-Host 'In Render: Environment -> paste all lines (or bulk import), then Save and redeploy.'
