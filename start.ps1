# Start all ZKSentinel services in separate terminal windows

$root = $PSScriptRoot

Write-Host ""
Write-Host "Starting ZKSentinel..." -ForegroundColor Cyan

# 1. Dashboard server (port 3000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dashboard" -WindowStyle Normal

Start-Sleep -Seconds 2

# 2. Trading agent
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run run-agent" -WindowStyle Normal

# 3. React frontend (port 5173)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\zk-agent-frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "All services started:" -ForegroundColor Green
Write-Host "  Dashboard   -> http://localhost:3000" -ForegroundColor White
Write-Host "  Frontend    -> http://localhost:5174" -ForegroundColor White
Write-Host "  Agent       -> running in background" -ForegroundColor White
Write-Host ""
Write-Host "Close the opened terminal windows to stop each service." -ForegroundColor DarkGray
