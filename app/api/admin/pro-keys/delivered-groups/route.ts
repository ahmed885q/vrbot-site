import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const batch = (url.searchParams.get('batch') || '').trim()
  if (!batch) return NextResponse.json({ ok: false, error: 'BATCH_REQUIRED' }, { status: 400 })

  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status })

  const { data: rows, error } = await supabaseAdmin
    .from('pro_keys')
    .select('delivered_to')
    .eq('batch_tag', batch)
    .eq('is_used', false)
    .is('revoked_at', null)
    .not('delivered_at', 'is', null)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const map = new Map<string, number>()
  for (const r of rows || []) {
    const key = String(r.delivered_to || '').trim() || '(unknown)'
    map.set(key, (map.get(key) || 0) + 1)
  }

  const groups = Array.from(map.entries())
    .map(([delivered_to, count]) => ({ delivered_to, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ ok: true, batch, groups })
}
