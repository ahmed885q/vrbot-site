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
  const codes: string[] = Array.isArray(body?.codes) ? body.codes.map((x: any) => String(x).trim()).filter(Boolean) : []
  const deliveredTo = cleanText(body?.deliveredTo, 120)
  const deliveredNote = cleanText(body?.deliveredNote, 160)
  const force = Boolean(body?.force)

  if (!deliveredTo) return NextResponse.json({ ok: false, error: 'DELIVERED_TO_REQUIRED' }, { status: 400 })
  if (!batch && codes.length === 0) return NextResponse.json({ ok: false, error: 'BATCH_OR_CODES_REQUIRED' }, { status: 400 })

  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status })

  const updateObj: any = {
    delivered_at: new Date().toISOString(),
    delivered_by: admin.user!.id,
    delivered_to: deliveredTo,
    delivered_note: deliveredNote,
  }

  let q = supabaseAdmin
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
