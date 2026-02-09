export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function isAdminEmail(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return !!email && admins.includes(email.toLowerCase())
}

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

  const cookieStore = cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: userData } = await supabaseAuth.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })
  if (!isAdminEmail(user.email)) return NextResponse.json({ ok: false, error: 'NOT_ADMIN' }, { status: 403 })

  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const rows = Array.from({ length: count }, () => ({
    code: genKey(),
    created_by: user.id,
    batch_tag: batchTag,
    note,
  }))

  const { error } = await adminDb.from('pro_keys').insert(rows)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, generated: rows.length, batchTag, note })
}
