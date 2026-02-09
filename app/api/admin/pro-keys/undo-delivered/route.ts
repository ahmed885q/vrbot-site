export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function isAdminEmail(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return !!email && admins.includes(email.toLowerCase())
}

function cleanText(v: any, max: number) {
  const s = String(v ?? '').trim()
  return s ? s.slice(0, max) : null
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const batch = cleanText(body?.batch, 64)
  const code = cleanText(body?.code, 64)

  if (!batch && !code) return NextResponse.json({ ok: false, error: 'BATCH_OR_CODE_REQUIRED' }, { status: 400 })

  const cookieStore = cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: userData } = await supabaseAuth.auth.getUser()
  const adminUser = userData?.user
  if (!adminUser) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })
  if (!isAdminEmail(adminUser.email)) return NextResponse.json({ ok: false, error: 'NOT_ADMIN' }, { status: 403 })

  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  let q = adminDb
    .from('pro_keys')
    .update({ delivered_at: null, delivered_by: null, delivered_to: null, delivered_note: null }, { count: 'exact' })
    .is('revoked_at', null)
    .eq('is_used', false)
    .not('delivered_at', 'is', null)

  if (batch) q = q.eq('batch_tag', batch)
  if (code) q = q.eq('code', code)

  const { count, error } = await q.select('code')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, undone: count ?? 0 })
}
