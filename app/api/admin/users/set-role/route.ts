export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const body = await req.json().catch(() => null)
  const userId = body?.userId as string | undefined
  const role = body?.role as 'admin' | 'user' | undefined

  if (!userId || !role || !['admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (userId === gate.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'You cannot remove your own admin role' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
