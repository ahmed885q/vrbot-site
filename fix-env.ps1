# Fix .env.local - ensure Supabase keys exist
# Run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\fix-env.ps1

Write-Host "`n=== Checking .env files ===" -ForegroundColor Yellow

# ── Read all possible env files ───────────────────────────────
$envFiles = @(".env.local", ".env", ".env.development", ".env.development.local")
$allVars = @{}

foreach ($f in $envFiles) {
    if (Test-Path $f) {
        Write-Host "  Found: $f" -ForegroundColor Cyan
        Get-Content $f | ForEach-Object {
            if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
                $key = $matches[1].Trim()
                $val = $matches[2].Trim()
                if (-not $allVars.ContainsKey($key) -and $val -ne "") {
                    $allVars[$key] = $val
                }
            }
        }
    }
}

# ── Check required keys ───────────────────────────────────────
$required = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)

$missing = @()
foreach ($key in $required) {
    if ($allVars.ContainsKey($key)) {
        $val = $allVars[$key]
        $preview = if ($val.Length -gt 20) { $val.Substring(0, 20) + "..." } else { $val }
        Write-Host "  OK  $key = $preview" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $key" -ForegroundColor Red
        $missing += $key
    }
}

# ── If keys found in other files, copy to .env.local ─────────
if ($missing.Count -eq 0) {
    Write-Host "`n  All keys found!" -ForegroundColor Green

    # Make sure they're in .env.local specifically
    $localContent = if (Test-Path ".env.local") { Get-Content ".env.local" -Raw } else { "" }
    $added = @()

    foreach ($key in $required) {
        if ($localContent -notmatch [regex]::Escape($key)) {
            $added += "$key=$($allVars[$key])"
        }
    }

    if ($added.Count -gt 0) {
        $toAdd = "`n# Supabase (copied from other env file)`n" + ($added -join "`n")
        Add-Content ".env.local" $toAdd
        Write-Host "  Copied missing keys to .env.local" -ForegroundColor Green
        foreach ($line in $added) { Write-Host "  + $line" -ForegroundColor Cyan }
    } else {
        Write-Host "  .env.local already has all keys" -ForegroundColor Green
    }

} else {
    # ── Keys not found anywhere - ask user to enter them ─────
    Write-Host "`n  Keys not found in any env file." -ForegroundColor Red
    Write-Host "  Get them from: https://supabase.com/dashboard/project/xmanyfpojzkjlwatkrcc/settings/api" -ForegroundColor Yellow
    Write-Host ""

    $url  = Read-Host "  Paste NEXT_PUBLIC_SUPABASE_URL"
    $anon = Read-Host "  Paste NEXT_PUBLIC_SUPABASE_ANON_KEY"

    if ($url -and $anon) {
        $localContent = if (Test-Path ".env.local") { Get-Content ".env.local" -Raw } else { "" }
        $toAdd = "`n# Supabase`nNEXT_PUBLIC_SUPABASE_URL=$url`nNEXT_PUBLIC_SUPABASE_ANON_KEY=$anon"

        if ($localContent -notmatch "NEXT_PUBLIC_SUPABASE_URL") {
            Add-Content ".env.local" $toAdd
            Write-Host "  Added to .env.local" -ForegroundColor Green
        } else {
            # Replace existing empty values
            $localContent = $localContent -replace "NEXT_PUBLIC_SUPABASE_URL=.*", "NEXT_PUBLIC_SUPABASE_URL=$url"
            $localContent = $localContent -replace "NEXT_PUBLIC_SUPABASE_ANON_KEY=.*", "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon"
            [System.IO.File]::WriteAllText((Resolve-Path ".env.local"), $localContent, [System.Text.Encoding]::UTF8)
            Write-Host "  Updated .env.local" -ForegroundColor Green
        }
    }
}

# ── Show final .env.local ─────────────────────────────────────
Write-Host "`n=== Current .env.local ===" -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match "KEY|SECRET|PRIVATE") {
            # Mask sensitive values
            if ($_ -match "^([^=]+=)(.{8})(.*)$") {
                Write-Host "  $($matches[1])$($matches[2])..." -ForegroundColor Gray
            } else { Write-Host "  $_" -ForegroundColor Gray }
        } else {
            Write-Host "  $_" -ForegroundColor White
        }
    }
}

Write-Host "`n=== Done! Run: npm run dev ===" -ForegroundColor Green
