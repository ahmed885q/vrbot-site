# Phase 6: Clean Dependencies
# Run from: C:\Users\manso\Desktop\vrbot-site

Set-Location "C:\Users\manso\Desktop\vrbot-site"
Write-Host "=== PHASE 6: Clean Dependencies ===" -ForegroundColor Cyan

# Remove unused/incompatible packages
Write-Host "Removing unused packages..."
npm uninstall puppeteer puppeteer-core canvas usb jimp next-auth node-cron stripe tsx hls.js
Write-Host "  Runtime packages removed" -ForegroundColor Green

Write-Host "Removing unused dev packages..."
npm uninstall @types/puppeteer @types/node-cron @types/stripe @types/jest jest ts-jest playwright
Write-Host "  Dev packages removed" -ForegroundColor Green

# Also remove auth-helpers (replaced by @supabase/ssr)
Write-Host "Removing old auth helpers..."
npm uninstall @supabase/auth-helpers-nextjs
Write-Host "  Old auth helpers removed" -ForegroundColor Green

git add package.json package-lock.json
git commit -m "deps: remove unused packages (puppeteer, canvas, next-auth, stripe)"
Write-Host "PHASE 6 DONE" -ForegroundColor Green
