import { NextResponse } from 'next/server'
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

export async function GET(req: Request) {
  const url = new URL(req.url)
  const batch = (url.searchParams.get('batch') || '').trim()
  if (!batch) return NextResponse.json({ ok: false, error: 'BATCH_REQUIRED' }, { status: 400 })

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

  const { data: rows, error } = await adminDb
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
