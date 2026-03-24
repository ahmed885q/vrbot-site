import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase/admin'
import crypto from 'crypto'

export const runtime = 'nodejs'

function genKey() {
  return crypto.randomBytes(16).toString('hex').toUpperCase()
}

function cleanTag(input: any) {
  const s = String(input || '').trim()
  if (!s) return null
  const ok = /^[a-zA-Z0-9_-]{1,64}$/.test(s)
  return ok ? s : null
}

function cleanNote(input: any) {
  const s = String(input || '').trim()
  if (!s) return null
  return s.slice(0, 160)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const count = Math.min(Math.max(Number(body?.count || 0), 1), 1000)
  const batchTag = cleanTag(body?.batchTag)
  const note = cleanNote(body?.note)

  if (!count) return NextResponse.json({ ok: false, error: 'COUNT_REQUIRED' }, { status: 400 })
  if (body?.batchTag && !batchTag) {
    return NextResponse.json({ ok: false, error: 'INVALID_BATCH_TAG (use letters/numbers/_- max64)' }, { status: 400 })
  }

  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status })

  const rows = Array.from({ length: count }, () => ({
    code: genKey(),
    created_by: admin.user!.id,
    batch_tag: batchTag,
    note,
  }))

  const { error } = await supabaseAdmin.from('pro_keys').insert(rows)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, generated: rows.length, batchTag, note })
}
