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

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const code = String(body?.code || '').trim()
  if (!code) return NextResponse.json({ ok: false, error: 'CODE_REQUIRED' }, { status: 400 })

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

  const { data: keyRow } = await adminDb
    .from('pro_keys')
    .select('code, revoked_at, is_used')
    .eq('code', code)
    .maybeSingle()

  if (!keyRow) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
  if (!keyRow.revoked_at) return NextResponse.json({ ok: false, error: 'NOT_REVOKED' }, { status: 409 })

  await adminDb.from('pro_keys').update({ revoked_at: null, revoked_by: null }).eq('code', code)

  return NextResponse.json({ ok: true, unrevoke: true, code, note: keyRow.is_used ? 'KEY_WAS_USED_NO_SUB_CHANGE' : 'RESTORED_UNUSED' })
}
