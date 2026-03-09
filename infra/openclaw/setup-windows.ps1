param(
  [switch]$RunOnboard,
  [switch]$InstallDaemon,
  [string]$OpenClawVersion = "2026.3.2"
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "[openclaw-setup] $Message" -ForegroundColor Cyan
}

function Get-NodeMajorVersion {
  $version = node --version
  if (-not $version) {
    throw "Node.js is required but was not found in PATH. Install Node 22+ first."
  }

  $clean = $version.Trim().TrimStart('v')
  $major = [int]($clean.Split('.')[0])
  return $major
}

function Ensure-OpenClawCli {
  param(
    [string]$CliRoot,
    [string]$Version
  )

  if (-not (Test-Path $CliRoot)) {
    New-Item -ItemType Directory -Path $CliRoot -Force | Out-Null
  }

  Push-Location $CliRoot
  try {
    if (-not (Test-Path (Join-Path $CliRoot "package.json"))) {
      npm init -y | Out-Null
    }

    Write-Step "Installing OpenClaw CLI locally at $CliRoot (version: $Version)"
    npm install "openclaw@$Version" --no-audit --no-fund
  }
  finally {
    Pop-Location
  }
}

function Get-OpenClawBinary {
  param([string]$CliRoot)
  $bin = Join-Path $CliRoot "node_modules\.bin\openclaw.cmd"
  if (-not (Test-Path $bin)) {
    throw "OpenClaw binary not found at $bin"
  }
  return $bin
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$cliRoot = Join-Path $repoRoot ".tmp\openclaw-cli"

Write-Step "Checking Node.js version"
$nodeMajor = Get-NodeMajorVersion
if ($nodeMajor -lt 22) {
  throw "OpenClaw requires Node 22+. Detected Node major version: $nodeMajor"
}

Ensure-OpenClawCli -CliRoot $cliRoot -Version $OpenClawVersion
$openclaw = Get-OpenClawBinary -CliRoot $cliRoot

Write-Step "OpenClaw CLI version"
& $openclaw --version

if ($RunOnboard) {
  if ($InstallDaemon) {
    Write-Step "Launching onboarding with daemon install"
    & $openclaw onboard --install-daemon
  } else {
    Write-Step "Launching onboarding"
    & $openclaw onboard
  }
}

Write-Step "Done. Next: run backend smoke test (cd backend; npm run smoke:openclaw)"
