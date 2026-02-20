# Phase 7: Improve next.config.js
# Run from: C:\Users\manso\Desktop\vrbot-site

Set-Location "C:\Users\manso\Desktop\vrbot-site"
Write-Host "=== PHASE 7: Improve Config ===" -ForegroundColor Cyan

# Update next.config.js with security headers
Write-Host "Updating next.config.js..."
$config = @()
$config += "/** @type {import('next').NextConfig} */"
$config += "const nextConfig = {"
$config += "  typescript: {"
$config += "    ignoreBuildErrors: true,"
$config += "  },"
$config += "  eslint: {"
$config += "    ignoreDuringBuilds: true,"
$config += "  },"
$config += "  async headers() {"
$config += "    return ["
$config += "      {"
$config += "        source: '/(.*)',"
$config += "        headers: ["
$config += "          { key: 'X-Frame-Options', value: 'DENY' },"
$config += "          { key: 'X-Content-Type-Options', value: 'nosniff' },"
$config += "          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },"
$config += "          { key: 'X-XSS-Protection', value: '1; mode=block' },"
$config += "          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },"
$config += "        ],"
$config += "      },"
$config += "    ]"
$config += "  },"
$config += "}"
$config += ""
$config += "module.exports = nextConfig"
$config | Out-File -FilePath "next.config.js" -Encoding utf8
Write-Host "  Security headers added" -ForegroundColor Green

# Clean up remaining unnecessary files
Write-Host "Cleaning remaining files..."
Remove-Item "components/PROTECTION_README.md" -Force -ErrorAction SilentlyContinue
Remove-Item "types/next-auth.d.ts" -Force -ErrorAction SilentlyContinue
Write-Host "  Cleaned" -ForegroundColor Green

git add -A
git commit -m "config: add security headers, cleanup"
git push origin main
Write-Host "PHASE 7 DONE" -ForegroundColor Green
Write-Host ""
Write-Host "=== ALL PHASES COMPLETE ===" -ForegroundColor Green
Write-Host "Check Vercel for build status" -ForegroundColor Cyan
