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
  const codes: string[] = Array.isArray(body?.codes) ? body.codes.map((x: any) => String(x).trim()).filter(Boolean) : []
  const deliveredTo = cleanText(body?.deliveredTo, 120)
  const deliveredNote = cleanText(body?.deliveredNote, 160)
  const force = Boolean(body?.force)

  if (!deliveredTo) return NextResponse.json({ ok: false, error: 'DELIVERED_TO_REQUIRED' }, { status: 400 })
  if (!batch && codes.length === 0) return NextResponse.json({ ok: false, error: 'BATCH_OR_CODES_REQUIRED' }, { status: 400 })

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

  const updateObj: any = {
    delivered_at: new Date().toISOString(),
    delivered_by: adminUser.id,
    delivered_to: deliveredTo,
    delivered_note: deliveredNote,
  }

  let q = adminDb
    .from('pro_keys')
    .update(updateObj, { count: 'exact' })
    .eq('is_used', false)
    .is('revoked_at', null)

  if (!force) q = q.is('delivered_at', null)
  if (batch) q = q.eq('batch_tag', batch)
  if (codes.length > 0) q = q.in('code', codes)

  const { count, error } = await q.select('code')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, marked: count ?? 0 })
}
