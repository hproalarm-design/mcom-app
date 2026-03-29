# Mcom App - Keep Alive Script
# Keeps backend, frontend, and tunnel running automatically

Write-Host "Starting Mcom App Keep-Alive..." -ForegroundColor Cyan
Set-Location $PSScriptRoot

function Is-PortListening($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return $conn -ne $null
}

# Start backend if not running
if (-not (Is-PortListening 3001)) {
    Write-Host "[Backend] Starting server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npx tsx watch server/index.ts" -WindowStyle Minimized
    Start-Sleep 3
}

# Start frontend if not running
if (-not (Is-PortListening 5173)) {
    Write-Host "[Frontend] Starting Vite..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npx vite --host 0.0.0.0" -WindowStyle Minimized
    Start-Sleep 3
}

Write-Host "[Tunnel] Starting tunnel watcher..." -ForegroundColor Yellow

# Tunnel watchdog loop
while ($true) {
    Write-Host "[Tunnel] $(Get-Date -Format 'HH:mm:ss') - Connecting to loca.lt..." -ForegroundColor Green
    & npx localtunnel --port 5173 --subdomain mcom-app
    Write-Host "[Tunnel] $(Get-Date -Format 'HH:mm:ss') - Tunnel dropped, restarting in 5s..." -ForegroundColor Red
    Start-Sleep 5
}
