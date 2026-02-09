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
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const tokenHash = sha256(token)

  const { data: dev, error: findErr } = await supabaseAdmin
    .from('bot_devices')
    .select('id,user_id')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
  if (!dev) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('bot_devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', dev.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
