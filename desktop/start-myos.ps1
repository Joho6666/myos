param(
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $PSScriptRoot "logs"
$AppUrl = "http://localhost:3000/app"
$WebPort = 3000
$AgentPort = 43110

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Test-PortListening {
  param([int]$Port)
  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return [bool]$connection
}

function Wait-Port {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 45
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening -Port $Port) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Start-HiddenPowerShell {
  param(
    [string]$Name,
    [string]$Command,
    [string]$LogFile
  )

  $escapedRoot = $ProjectRoot.Replace("'", "''")
  $escapedLog = $LogFile.Replace("'", "''")
  $fullCommand = "Set-Location -LiteralPath '$escapedRoot'; $Command *> '$escapedLog'"

  Start-Process `
    -FilePath "powershell.exe" `
    -WindowStyle Hidden `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $fullCommand) `
    -WorkingDirectory $ProjectRoot `
    -PassThru | Out-Null
}

if (-not (Test-Path (Join-Path $ProjectRoot "local-agent\agent.config.json"))) {
  Copy-Item `
    -LiteralPath (Join-Path $ProjectRoot "local-agent\agent.config.example.json") `
    -Destination (Join-Path $ProjectRoot "local-agent\agent.config.json") `
    -Force
}

if (-not (Test-PortListening -Port $AgentPort)) {
  Start-HiddenPowerShell `
    -Name "MyOS Local Agent" `
    -Command "pnpm local-agent" `
    -LogFile (Join-Path $LogDir "local-agent.log")
}

if (-not (Test-Path (Join-Path $ProjectRoot ".next"))) {
  Push-Location $ProjectRoot
  try {
    pnpm build *> (Join-Path $LogDir "build.log")
  } finally {
    Pop-Location
  }
}

if (-not (Test-PortListening -Port $WebPort)) {
  Start-HiddenPowerShell `
    -Name "MyOS Web" `
    -Command "pnpm start" `
    -LogFile (Join-Path $LogDir "myos-web.log")
}

$webReady = Wait-Port -Port $WebPort -TimeoutSeconds 60
$agentReady = Wait-Port -Port $AgentPort -TimeoutSeconds 20
$webState = if ($webReady) { "ready" } else { "not ready" }
$agentState = if ($agentReady) { "ready" } else { "not ready" }

$status = @(
  "MyOS desktop launcher"
  "Project: $ProjectRoot"
  "Web: $webState"
  "Local Agent: $agentState"
  "Time: $(Get-Date -Format s)"
) -join [Environment]::NewLine

Set-Content -Path (Join-Path $LogDir "launcher-status.txt") -Value $status -Encoding UTF8

if (-not $NoOpen) {
  Start-Process $AppUrl
}
