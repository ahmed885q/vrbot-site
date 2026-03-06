# Fix lib/chat.js - use existing Supabase client
# Run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\fix-chat-client.ps1

$file = "lib\chat.js"

if (-not (Test-Path $file)) {
    Write-Host "ERROR: $file not found!" -ForegroundColor Red
    exit 1
}

$content = Get-Content $file -Raw

$oldImport = @'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
'@

$newImport = @'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
const supabase = createSupabaseBrowserClient()
'@

if ($content -notmatch "createSupabaseBrowserClient") {
    $content = $content.Replace($oldImport.Trim(), $newImport.Trim())
    [System.IO.File]::WriteAllText((Resolve-Path $file), $content, [System.Text.Encoding]::UTF8)
    Write-Host "OK  Fixed lib/chat.js" -ForegroundColor Green
} else {
    Write-Host ">>  Already fixed, skipping" -ForegroundColor Cyan
}

Write-Host "Done! Restart: npm run dev" -ForegroundColor Yellow
