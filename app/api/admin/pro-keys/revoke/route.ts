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
    .select('code, is_used, used_by, revoked_at')
    .eq('code', code)
    .maybeSingle()

  if (!keyRow) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
  if (keyRow.revoked_at) return NextResponse.json({ ok: false, error: 'ALREADY_REVOKED' }, { status: 409 })

  await supabaseAdmin
    .from('pro_keys')
    .update({ revoked_at: new Date().toISOString(), revoked_by: admin.user!.id })
    .eq('code', code)

  // Ø¥Ø°Ø§ ÙƒØ§Ù† Ù…Ø³ØªØ®Ø¯Ù…: downgrade ÙÙ‚Ø· Ø¥Ø°Ø§ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ù…Ø±ØªØ¨Ø· Ø¨Ù‡Ø°Ø§ Ø§Ù„Ù…ÙØªØ§Ø­
  if (keyRow.is_used && keyRow.used_by) {
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await supabaseAdmin
      .from('subscriptions')
      .update({ plan: 'trial', status: 'trialing', current_period_end: trialEnd })
      .eq('user_id', keyRow.used_by)
      .eq('pro_key_code', code)
  }

  return NextResponse.json({ ok: true, revoked: true, code })
}
