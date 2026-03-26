import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const batch = (url.searchParams.get('batch') || '').trim()
  const excludeDelivered = (url.searchParams.get('excludeDelivered') || '1') === '1'

  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status })

  let q = supabaseAdmin
    .from('pro_keys')
    .select('code')
    .eq('is_used', false)
    .is('revoked_at', null)
    .order('created_at', { ascending: true })

  if (excludeDelivered) q = q.is('delivered_at', null)
  if (batch) q = q.eq('batch_tag', batch)

  const { data: rows, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const keys = (rows || []).map((r) => r.code)
  return NextResponse.json({ ok: true, count: keys.length, keys })
}
