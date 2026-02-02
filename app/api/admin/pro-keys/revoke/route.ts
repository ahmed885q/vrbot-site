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
    .select('code, is_used, used_by, revoked_at')
    .eq('code', code)
    .maybeSingle()

  if (!keyRow) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
  if (keyRow.revoked_at) return NextResponse.json({ ok: false, error: 'ALREADY_REVOKED' }, { status: 409 })

  await adminDb
    .from('pro_keys')
    .update({ revoked_at: new Date().toISOString(), revoked_by: adminUser.id })
    .eq('code', code)

  // إذا كان مستخدم: downgrade فقط إذا الاشتراك مرتبط بهذا المفتاح
  if (keyRow.is_used && keyRow.used_by) {
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await adminDb
      .from('subscriptions')
      .update({ plan: 'trial', status: 'trialing', current_period_end: trialEnd })
      .eq('user_id', keyRow.used_by)
      .eq('pro_key_code', code)
  }

  return NextResponse.json({ ok: true, revoked: true, code })
}
