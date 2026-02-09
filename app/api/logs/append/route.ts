export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const token = String(body?.token ?? '').trim()
  const message = String(body?.message ?? '').trim()
  const level = String(body?.level ?? 'info').trim()
  const farmId = body?.farmId ? String(body.farmId) : null

  if (!token || !message) {
    return NextResponse.json({ error: 'Missing token/message' }, { status: 400 })
  }

  const tokenHash = sha256(token)

  const { data: dev } = await supabaseAdmin
    .from('bot_devices')
    .select('id,user_id')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!dev) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { error } = await supabaseAdmin.from('bot_logs').insert({
    user_id: dev.user_id,
    farm_id: farmId,
    level,
    message,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
