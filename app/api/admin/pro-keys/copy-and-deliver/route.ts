import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function cleanText(v: any, max: number) {
  const s = String(v ?? '').trim()
  return s ? s.slice(0, max) : null
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  const batch = cleanText(body?.batch, 64)
  const deliveredTo = cleanText(body?.deliveredTo, 120)
  const deliveredNote = cleanText(body?.deliveredNote, 160)
  const limit = Math.min(Math.max(Number(body?.limit || 0), 1), 5000)

  if (!batch) return NextResponse.json({ ok: false, error: 'BATCH_REQUIRED' }, { status: 400 })
  if (!deliveredTo) return NextResponse.json({ ok: false, error: 'DELIVERED_TO_REQUIRED' }, { status: 400 })

  const cookieStore = cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: userData } = await supabaseAuth.auth.getUser()
  const adminUser = userData?.user
  if (!adminUser) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })
  if (!isAdminEmail(auth.user.email)) return NextResponse.json({ ok: false, error: 'NOT_ADMIN' }, { status: 403 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: rows, error: fetchErr } = await supabaseAdmin
    .from('pro_keys')
    .select('code')
    .eq('batch_tag', batch)
    .eq('is_used', false)
    .is('revoked_at', null)
    .is('delivered_at', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (fetchErr) return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 })

  const codes = (rows || []).map((r) => r.code)
  if (codes.length === 0) return NextResponse.json({ ok: true, count: 0, keys: [] })

  const updateObj = {
    delivered_at: new Date().toISOString(),
    delivered_by: auth.user.id,
    delivered_to: deliveredTo,
    delivered_note: deliveredNote,
  }

  const { error: updErr } = await supabaseAdmin
    .from('pro_keys')
    .update(updateObj)
    .in('code', codes)
    .eq('batch_tag', batch)
    .eq('is_used', false)
    .is('revoked_at', null)
    .is('delivered_at', null)

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: codes.length, keys: codes })
}
