# Phase 2: Cleanup Duplicates
# Run from: C:\Users\manso\Desktop\vrbot-site

Set-Location "C:\Users\manso\Desktop\vrbot-site"
Write-Host "=== PHASE 2: Cleanup ===" -ForegroundColor Yellow

# Delete duplicate root files
Write-Host "Deleting duplicate root files..."
Remove-Item "globals.css" -Force -ErrorAction SilentlyContinue
Remove-Item "install-service.js" -Force -ErrorAction SilentlyContinue
Remove-Item "install.bat" -Force -ErrorAction SilentlyContinue
Remove-Item "uninstall.bat" -Force -ErrorAction SilentlyContinue
Remove-Item "update-agent.js" -Force -ErrorAction SilentlyContinue
Remove-Item "ws-server.js" -Force -ErrorAction SilentlyContinue
Remove-Item "remote-config.json" -Force -ErrorAction SilentlyContinue

# Delete duplicate desktop/
Write-Host "Deleting duplicate desktop/..."
Remove-Item -Recurse -Force "desktop" -ErrorAction SilentlyContinue

# Backup then remove directories
Write-Host "Backing up agent-windows..."
$bk1 = Join-Path $env:USERPROFILE "Desktop\vrbot-agent-windows-backup"
if ((Test-Path "agent-windows") -and (-not (Test-Path $bk1))) {
    Copy-Item -Recurse "agent-windows" $bk1
}
Remove-Item -Recurse -Force "agent-windows" -ErrorAction SilentlyContinue

Write-Host "Backing up backend..."
$bk2 = Join-Path $env:USERPROFILE "Desktop\vrbot-backend-backup"
if ((Test-Path "backend") -and (-not (Test-Path $bk2))) {
    Copy-Item -Recurse "backend" $bk2
}
Remove-Item -Recurse -Force "backend" -ErrorAction SilentlyContinue

Write-Host "Backing up api..."
$bk3 = Join-Path $env:USERPROFILE "Desktop\vrbot-api-backup"
if ((Test-Path "api") -and (-not (Test-Path $bk3))) {
    Copy-Item -Recurse "api" $bk3
}
Remove-Item -Recurse -Force "api" -ErrorAction SilentlyContinue

Write-Host "Removing packages..."
Remove-Item -Recurse -Force "packages" -ErrorAction SilentlyContinue

git add -A
git commit -m "cleanup: remove duplicate files and directories"
Write-Host "PHASE 2 DONE" -ForegroundColor Green
