<#
.SYNOPSIS
  Builds ./render-dashboard.env (gitignored) from a local Vercel CLI export for Render Environment bulk paste.

.PARAMETER Source
  Path to .env.production.local or similar. Default: .tmp-vercel-pva-backend/.env.production.local

.NOTES
  Does not commit secrets. Run from repo root: powershell -File scripts/sync-render-dashboard-env.ps1
#>
param(
  [string] $Source = ".tmp-vercel-pva-backend/.env.production.local",
  [string] $OutFile = "render-dashboard.env"
)

$ErrorActionPreference = "Stop"
# Repo root (parent of /scripts)
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path $Source)) {
  Write-Error "Source not found: $Source - copy your Vercel env export there first."
}

$skip = '^(VERCEL_|TURBO_|NX_|VERCEL_URL=|VERCEL=)'

Get-Content -LiteralPath $Source | ForEach-Object {
  $line = $_
  if ($line -match '^\s*#') { return }
  if ($line -match '^\s*$') { return }
  if ($line -match $skip) { return }
  # Strip accidental CRLF tokens inside quoted values
  $line = $line -replace '\\r\\n', ''
  $line
} | Set-Content -LiteralPath $OutFile -Encoding utf8

Write-Host ('Wrote ' + $OutFile + ' (gitignored). Import in Render Environment tab.')
