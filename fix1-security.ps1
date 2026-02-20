# Phase 1: Security Fixes
# Run from: C:\Users\manso\Desktop\vrbot-site

Set-Location "C:\Users\manso\Desktop\vrbot-site"
Write-Host "=== PHASE 1: Security ===" -ForegroundColor Red

# Delete junk files
Write-Host "Deleting junk files..."
Remove-Item "h --force" -Force -ErrorAction SilentlyContinue
Remove-Item "vrbot_fixed" -Force -ErrorAction SilentlyContinue
Remove-Item "{" -Force -ErrorAction SilentlyContinue
Remove-Item "vrbot-site-main-professional.zip" -Force -ErrorAction SilentlyContinue
Remove-Item "tsconfig.tsbuildinfo" -Force -ErrorAction SilentlyContinue

# Remove from git
git rm --cached .env.local 2>$null
git rm -r --cached .next 2>$null
git rm -r --cached .vscode 2>$null

# Fix .gitignore
Write-Host "Fixing .gitignore..."
$gi = @()
$gi += "node_modules/"
$gi += ".next/"
$gi += "out/"
$gi += "dist/"
$gi += "build/"
$gi += "*.tsbuildinfo"
$gi += ".env"
$gi += ".env.local"
$gi += ".env.*.local"
$gi += ".vscode/"
$gi += ".idea/"
$gi += ".DS_Store"
$gi += "Thumbs.db"
$gi += "*.exe"
$gi += "*.msi"
$gi += "*.dmg"
$gi += "*.AppImage"
$gi += ".vercel/"
$gi += "npm-debug.log*"
$gi += "*.zip"
$gi += "*.tar.gz"
$gi | Out-File -FilePath ".gitignore" -Encoding utf8

# Fix session.ts (CRITICAL)
Write-Host "Fixing lib/session.ts..." -ForegroundColor Yellow
$s = @()
$s += "import { cookies } from 'next/headers'"
$s += "import crypto from 'crypto'"
$s += ""
$s += "export type Session = {"
$s += "  userId: string"
$s += "  email: string"
$s += "  role: 'admin' | 'user'"
$s += "}"
$s += ""
$s += "export async function validateSession(): Promise<Session | null> {"
$s += "  const token = cookies().get('admin_session')?.value"
$s += "  if (!token) return null"
$s += ""
$s += "  const parts = token.split('.')"
$s += "  if (parts.length !== 3) return null"
$s += ""
$s += "  const [email, timestamp, signature] = parts"
$s += ""
$s += "  const secret = process.env.ADMIN_SESSION_SECRET"
$s += "  if (!secret) return null"
$s += ""
$s += "  const expected = crypto"
$s += "    .createHmac('sha256', secret)"
$s += "    .update(email + timestamp)"
$s += "    .digest('hex')"
$s += ""
$s += "  if (signature !== expected) return null"
$s += ""
$s += "  const age = Date.now() - parseInt(timestamp)"
$s += "  if (isNaN(age) || age > 86400000) return null"
$s += ""
$s += "  return { userId: email, email, role: 'admin' }"
$s += "}"
$s | Out-File -FilePath "lib/session.ts" -Encoding utf8

# Delete hardcoded credentials
Write-Host "Deleting lib/auth.ts..." -ForegroundColor Yellow
Remove-Item "lib/auth.ts" -Force -ErrorAction SilentlyContinue

# Delete insecure login route
Write-Host "Deleting app/api/login/..."
Remove-Item -Recurse -Force "app/api/login" -ErrorAction SilentlyContinue

# Delete test routes
Remove-Item -Recurse -Force "app/api/some-route" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "app/api/admin/test" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "app/api/admin/example" -ErrorAction SilentlyContinue

git add -A
git commit -m "security: fix session, remove credentials and junk"
Write-Host "PHASE 1 DONE" -ForegroundColor Green
