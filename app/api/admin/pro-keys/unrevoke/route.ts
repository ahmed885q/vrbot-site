import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const code = String(body?.code || '').trim()
  if (!code) return NextResponse.json({ ok: false, error: 'CODE_REQUIRED' }, { status: 400 })

  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status })

  const { data: keyRow } = await supabaseAdmin
    .from('pro_keys')
    .select('code, revoked_at, is_used')
    .eq('code', code)
    .maybeSingle()

  if (!keyRow) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
  if (!keyRow.revoked_at) return NextResponse.json({ ok: false, error: 'NOT_REVOKED' }, { status: 409 })

  await supabaseAdmin.from('pro_keys').update({ revoked_at: null, revoked_by: null }).eq('code', code)

  return NextResponse.json({ ok: true, unrevoke: true, code, note: keyRow.is_used ? 'KEY_WAS_USED_NO_SUB_CHANGE' : 'RESTORED_UNUSED' })
}
