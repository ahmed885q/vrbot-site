# Phase 4: Fix API Routes
# Run from: C:\Users\manso\Desktop\vrbot-site

Set-Location "C:\Users\manso\Desktop\vrbot-site"
Write-Host "=== PHASE 4: Fix API Routes ===" -ForegroundColor Cyan

# 4.1 Clean remaining Stripe files
Write-Host "[4.1] Removing remaining Stripe files..."
Remove-Item -Recurse -Force "app/api/stripe" -ErrorAction SilentlyContinue
Remove-Item "lib/stripe.ts" -Force -ErrorAction SilentlyContinue
Write-Host "  Stripe routes deleted" -ForegroundColor Green

# 4.2 Remove next-auth type definitions
Write-Host "[4.2] Removing next-auth types..."
Remove-Item "types/next-auth.d.ts" -Force -ErrorAction SilentlyContinue
Write-Host "  next-auth types deleted" -ForegroundColor Green

# 4.3 Fix pro-keys files (remove duplicated admin check)
Write-Host "[4.3] Fixing pro-keys files (9 files)..."

$proKeysDirs = @(
    "app/api/admin/pro-keys/generate",
    "app/api/admin/pro-keys/copy-unused",
    "app/api/admin/pro-keys/copy-and-deliver",
    "app/api/admin/pro-keys/delivered-groups",
    "app/api/admin/pro-keys/export",
    "app/api/admin/pro-keys/mark-delivered",
    "app/api/admin/pro-keys/revoke",
    "app/api/admin/pro-keys/undo-delivered",
    "app/api/admin/pro-keys/unrevoke"
)

foreach ($dir in $proKeysDirs) {
    $file = Join-Path $dir "route.ts"
    if (-not (Test-Path $file)) { continue }

    $content = Get-Content $file -Raw

    # Remove old imports
    $content = $content.Replace("import { cookies } from 'next/headers'`r`n", "")
    $content = $content.Replace("import { createServerClient } from '@supabase/ssr'`r`n", "")
    $content = $content.Replace("import { createClient } from '@supabase/supabase-js'`r`n", "")

    # Add new imports after NextResponse import
    if ($content -notmatch "requireAdmin") {
        $content = $content.Replace("import { NextResponse } from 'next/server'", "import { NextResponse } from 'next/server'`r`nimport { requireAdmin } from '@/lib/admin-guard'`r`nimport { supabaseAdmin } from '@/lib/supabase/admin'")
        # Handle export route where import order is different
        $content = $content.Replace("import { cookies } from 'next/headers'`nimport { NextResponse } from 'next/server'", "import { NextResponse } from 'next/server'`nimport { requireAdmin } from '@/lib/admin-guard'`nimport { supabaseAdmin } from '@/lib/supabase/admin'")
    }

    # Remove isAdminEmail function (7 lines)
    $content = $content -replace "(?s)function isAdminEmail\(email\?: string \| null\) \{[^}]+\}\r?\n\r?\n", ""

    # Replace auth check block - pattern 1 (with user variable)
    $content = $content -replace "(?s)\s*const cookieStore = cookies\(\)\r?\n\s*const supabaseAuth = createServerClient\([^)]+\)\r?\n[^)]*\)\r?\n\r?\n\s*const \{ data: userData \} = await supabaseAuth\.auth\.getUser\(\)\r?\n\s*const user = userData\?\.user\r?\n\s*if \(!user\)[^\r\n]+\r?\n\s*if \(!isAdminEmail\(user\.email\)\)[^\r\n]+\r?\n\r?\n\s*const adminDb = createClient\([^)]+\)\r?\n[^)]*\)\r?\n", "`r`n  const auth = await requireAdmin()`r`n  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })`r`n`r`n"

    # Replace auth check block - pattern 2 (with adminUser variable)
    $content = $content -replace "(?s)\s*const cookieStore = cookies\(\)\r?\n\s*const supabaseAuth = createServerClient\([^)]+\)\r?\n[^)]*\)\r?\n\r?\n\s*const \{ data: userData \} = await supabaseAuth\.auth\.getUser\(\)\r?\n\s*const adminUser = userData\?\.user\r?\n\s*if \(!adminUser\)[^\r\n]+\r?\n\s*if \(!isAdminEmail\(adminUser\.email\)\)[^\r\n]+\r?\n\r?\n\s*const adminDb = createClient\([^)]+\)\r?\n[^)]*\)\r?\n", "`r`n  const auth = await requireAdmin()`r`n  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })`r`n`r`n"

    # Replace adminDb with supabaseAdmin
    $content = $content.Replace("adminDb", "supabaseAdmin")

    # Replace adminUser references with auth.user
    $content = $content.Replace("adminUser.id", "auth.user.id")
    $content = $content.Replace("adminUser.email", "auth.user.email")

    # Replace user.id / user.email in admin context
    $content = $content.Replace("created_by: user.id", "created_by: auth.user.id")

    [System.IO.File]::WriteAllText((Resolve-Path $file).Path, $content)
    Write-Host "  Fixed: $dir" -ForegroundColor Green
}

# 4.4 Remove stripe references from other files
Write-Host "[4.4] Cleaning Stripe references..."

# Clean ManageBillingButton - replace stripe portal with simple message
if (Test-Path "components/ManageBillingButton.tsx") {
    $content = Get-Content "components/ManageBillingButton.tsx" -Raw
    $content = $content.Replace("/api/stripe/portal", "/billing")
    [System.IO.File]::WriteAllText((Resolve-Path "components/ManageBillingButton.tsx").Path, $content)
    Write-Host "  Fixed ManageBillingButton" -ForegroundColor Green
}

# Clean subscription sync route
if (Test-Path "app/api/subscription/sync/route.ts") {
    $content = Get-Content "app/api/subscription/sync/route.ts" -Raw
    $content = $content.Replace("from '@/lib/stripe'", "// stripe removed")
    $content = $content.Replace('from "@/lib/stripe"', "// stripe removed")
    [System.IO.File]::WriteAllText((Resolve-Path "app/api/subscription/sync/route.ts").Path, $content)
    Write-Host "  Fixed subscription/sync" -ForegroundColor Green
}

# Clean pricing page
if (Test-Path "app/pricing/page.tsx") {
    $content = Get-Content "app/pricing/page.tsx" -Raw
    $content = $content.Replace("/api/stripe/checkout", "/billing")
    [System.IO.File]::WriteAllText((Resolve-Path "app/pricing/page.tsx").Path, $content)
    Write-Host "  Fixed pricing page" -ForegroundColor Green
}

# Clean admin subscriptions page
if (Test-Path "app/admin/subscriptions/page.tsx") {
    $content = Get-Content "app/admin/subscriptions/page.tsx" -Raw
    $content = $content.Replace("stripe_customer_id", "paypal_customer_id")
    $content = $content.Replace("stripe_subscription_id", "paypal_subscription_id")
    [System.IO.File]::WriteAllText((Resolve-Path "app/admin/subscriptions/page.tsx").Path, $content)
    Write-Host "  Fixed admin subscriptions" -ForegroundColor Green
}

git add -A
git commit -m "fix: clean pro-keys duplication, remove stripe remnants"
Write-Host "PHASE 4 DONE" -ForegroundColor Green
