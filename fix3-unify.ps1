# Phase 3: Unify lib/ files
# Run from: C:\Users\manso\Desktop\vrbot-site

Set-Location "C:\Users\manso\Desktop\vrbot-site"
Write-Host "=== PHASE 3: Unify lib/ ===" -ForegroundColor Blue

# 3.1 Supabase clients
Write-Host "Unifying Supabase clients (7 to 3)..."
if (-not (Test-Path "lib/supabase")) { New-Item -ItemType Directory -Path "lib/supabase" -Force | Out-Null }

# client.ts
$c = @()
$c += "import { createBrowserClient } from '@supabase/ssr'"
$c += ""
$c += "export function createSupabaseBrowserClient() {"
$c += "  return createBrowserClient("
$c += "    process.env.NEXT_PUBLIC_SUPABASE_URL!,"
$c += "    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!"
$c += "  )"
$c += "}"
$c | Out-File -FilePath "lib/supabase/client.ts" -Encoding utf8

# server.ts
$sv = @()
$sv += "import { cookies } from 'next/headers'"
$sv += "import { createServerClient } from '@supabase/ssr'"
$sv += "import { createClient } from '@supabase/supabase-js'"
$sv += ""
$sv += "export function createSupabaseServerClient() {"
$sv += "  const cookieStore = cookies()"
$sv += "  return createServerClient("
$sv += "    process.env.NEXT_PUBLIC_SUPABASE_URL!,"
$sv += "    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,"
$sv += "    {"
$sv += "      cookies: {"
$sv += "        getAll: () => cookieStore.getAll(),"
$sv += "        setAll: (cookiesToSet) => {"
$sv += "          try {"
$sv += "            cookiesToSet.forEach(({ name, value, options }) => {"
$sv += "              cookieStore.set(name, value, options)"
$sv += "            })"
$sv += "          } catch {}"
$sv += "        },"
$sv += "      },"
$sv += "    }"
$sv += "  )"
$sv += "}"
$sv += ""
$sv += "export function supabaseService() {"
$sv += "  const url = process.env.NEXT_PUBLIC_SUPABASE_URL"
$sv += "  const key = process.env.SUPABASE_SERVICE_ROLE_KEY"
$sv += "  if (!url || !key) throw new Error('Missing Supabase env vars')"
$sv += "  return createClient(url, key, { auth: { persistSession: false } })"
$sv += "}"
$sv | Out-File -FilePath "lib/supabase/server.ts" -Encoding utf8

# admin.ts
$a = @()
$a += "import { createClient } from '@supabase/supabase-js'"
$a += ""
$a += "export const supabaseAdmin = createClient("
$a += "  process.env.NEXT_PUBLIC_SUPABASE_URL!,"
$a += "  process.env.SUPABASE_SERVICE_ROLE_KEY!,"
$a += "  {"
$a += "    auth: {"
$a += "      autoRefreshToken: false,"
$a += "      persistSession: false,"
$a += "    },"
$a += "  }"
$a += ")"
$a | Out-File -FilePath "lib/supabase/admin.ts" -Encoding utf8

# Delete old supabase files
Remove-Item "lib/supabase-client.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "lib/supabase-browser.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "lib/supabase-admin.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "lib/supabaseAdmin.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "lib/supabase-server.ts" -Force -ErrorAction SilentlyContinue
Write-Host "  Supabase DONE" -ForegroundColor Green

# 3.2 Admin Guard
Write-Host "Unifying Admin Guard (6 to 1)..."
$ag = @()
$ag += "import { createSupabaseServerClient } from '@/lib/supabase/server'"
$ag += ""
$ag += "const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')"
$ag += "  .split(',')"
$ag += "  .map((s) => s.trim().toLowerCase())"
$ag += "  .filter(Boolean)"
$ag += ""
$ag += "export async function requireAdmin() {"
$ag += "  const supabase = createSupabaseServerClient()"
$ag += "  const { data: authData } = await supabase.auth.getUser()"
$ag += "  const user = authData?.user"
$ag += ""
$ag += "  if (!user || !user.email) {"
$ag += "    return { ok: false, status: 401, error: 'NOT_AUTHENTICATED' }"
$ag += "  }"
$ag += ""
$ag += "  if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {"
$ag += "    return { ok: true, user: { id: user.id, email: user.email } }"
$ag += "  }"
$ag += ""
$ag += "  const { data: roleRow } = await supabase"
$ag += "    .from('user_roles')"
$ag += "    .select('role')"
$ag += "    .eq('user_id', user.id)"
$ag += "    .maybeSingle()"
$ag += ""
$ag += "  if (roleRow?.role === 'admin') {"
$ag += "    return { ok: true, user: { id: user.id, email: user.email } }"
$ag += "  }"
$ag += ""
$ag += "  return { ok: false, status: 403, error: 'NOT_ADMIN' }"
$ag += "}"
$ag | Out-File -FilePath "lib/admin-guard.ts" -Encoding utf8

Remove-Item "lib/admin-auth.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "lib/admin_guard.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "lib/admin_guard_api.ts" -Force -ErrorAction SilentlyContinue
Remove-Item "lib/auth-admin.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "lib/security" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "lib/audit" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "lib/auth" -ErrorAction SilentlyContinue
Write-Host "  Admin Guard DONE" -ForegroundColor Green

# 3.3 Rate Limiter
Write-Host "Unifying Rate Limiter..."
$rl = @()
$rl += "import { supabaseAdmin } from '@/lib/supabase/admin'"
$rl += ""
$rl += "const MAX_REQUESTS = 50"
$rl += "const WINDOW_MS = 60000"
$rl += ""
$rl += "export async function rateLimit(ip: string) {"
$rl += "  const now = new Date()"
$rl += "  const { data } = await supabaseAdmin"
$rl += "    .from('rate_limits')"
$rl += "    .select('*')"
$rl += "    .eq('ip', ip)"
$rl += "    .single()"
$rl += ""
$rl += "  if (!data) {"
$rl += "    await supabaseAdmin.from('rate_limits').insert({"
$rl += "      ip, count: 1, last_request: now.toISOString(),"
$rl += "    })"
$rl += "    return"
$rl += "  }"
$rl += ""
$rl += "  const diff = now.getTime() - new Date(data.last_request).getTime()"
$rl += ""
$rl += "  if (diff > WINDOW_MS) {"
$rl += "    await supabaseAdmin"
$rl += "      .from('rate_limits')"
$rl += "      .update({ count: 1, last_request: now.toISOString() })"
$rl += "      .eq('ip', ip)"
$rl += "    return"
$rl += "  }"
$rl += ""
$rl += "  if (data.count >= MAX_REQUESTS) {"
$rl += "    throw new Error('RATE_LIMIT_EXCEEDED')"
$rl += "  }"
$rl += ""
$rl += "  await supabaseAdmin"
$rl += "    .from('rate_limits')"
$rl += "    .update({ count: data.count + 1 })"
$rl += "    .eq('ip', ip)"
$rl += "}"
$rl | Out-File -FilePath "lib/rate-limit.ts" -Encoding utf8
Write-Host "  Rate Limiter DONE" -ForegroundColor Green

# 3.4 Fix imports
Write-Host "Updating imports across project..."
$files = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\.next" }

$count = 0
foreach ($file in $files) {
    $txt = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $txt) { continue }
    $orig = $txt

    $txt = $txt.Replace("from '@/lib/supabase-admin'", "from '@/lib/supabase/admin'")
    $txt = $txt.Replace("from '@/lib/supabaseAdmin'", "from '@/lib/supabase/admin'")
    $txt = $txt.Replace("from '@/lib/supabase-client'", "from '@/lib/supabase/client'")
    $txt = $txt.Replace("from '@/lib/supabase-browser'", "from '@/lib/supabase/client'")
    $txt = $txt.Replace("from '@/lib/supabase-server'", "from '@/lib/supabase/server'")
    $txt = $txt.Replace("from '@/lib/admin-auth'", "from '@/lib/admin-guard'")
    $txt = $txt.Replace("from '@/lib/admin_guard'", "from '@/lib/admin-guard'")
    $txt = $txt.Replace("from '@/lib/admin_guard_api'", "from '@/lib/admin-guard'")
    $txt = $txt.Replace("from '@/lib/security/is-admin'", "from '@/lib/admin-guard'")
    $txt = $txt.Replace("from '@/lib/security/rate-limit'", "from '@/lib/rate-limit'")
    $txt = $txt.Replace("from '../../../lib/supabase-admin'", "from '@/lib/supabase/admin'")
    $txt = $txt.Replace("from '../../../../lib/supabase-admin'", "from '@/lib/supabase/admin'")
    $txt = $txt.Replace("from '../../../../../lib/supabase-admin'", "from '@/lib/supabase/admin'")
    $txt = $txt.Replace("from '../../../lib/admin-auth'", "from '@/lib/admin-guard'")
    $txt = $txt.Replace("from '../../../../lib/admin-auth'", "from '@/lib/admin-guard'")
    $txt = $txt.Replace("from '../../../../../lib/admin-auth'", "from '@/lib/admin-guard'")
    $txt = $txt.Replace("from '../../../lib/rate-limit'", "from '@/lib/rate-limit'")
    $txt = $txt.Replace("from '../../../../lib/rate-limit'", "from '@/lib/rate-limit'")
    $txt = $txt.Replace("from '../../../../../lib/rate-limit'", "from '@/lib/rate-limit'")
    $txt = $txt.Replace("{ adminGuard }", "{ requireAdmin }")
    $txt = $txt.Replace("{ adminGuardApi }", "{ requireAdmin }")
    $txt = $txt.Replace("{ isAdmin }", "{ requireAdmin }")

    if ($txt -ne $orig) {
        [System.IO.File]::WriteAllText($file.FullName, $txt)
        $count++
    }
}
Write-Host "  Updated $count files" -ForegroundColor Green

git add -A
git commit -m "refactor: unify supabase, admin-guard, rate-limit"
Write-Host "PHASE 3 DONE" -ForegroundColor Green
Write-Host ""
Write-Host "ALL DONE! Now run:" -ForegroundColor Cyan
Write-Host "  git push origin main --force"
Write-Host "  Then change ALL API keys!" -ForegroundColor Red
