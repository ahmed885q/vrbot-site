import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function csvEscape(v: any) {
  const s = String(v ?? '')
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function safeSlug(s: string, max = 40) {
  const t = String(s || '').trim()
  if (!t) return ''
  return t.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, max)
}

function yyyymmdd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const status = (url.searchParams.get('status') || 'all').toLowerCase()
  const batch = (url.searchParams.get('batch') || '').trim()
  const deliveredTo = (url.searchParams.get('to') || '').trim()

  const cookieStore = cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: userData } = await supabaseAuth.auth.getUser()
  const user = userData?.user
  if (!user) return new NextResponse('NOT_AUTHENTICATED', { status: 401 })
  if (!isAdminEmail(user.email)) return new NextResponse('NOT_ADMIN', { status: 403 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  let q = supabaseAdmin
    .from('pro_keys')
    .select('code, batch_tag, note, is_used, used_by, used_at, created_at, created_by, revoked_at, revoked_by, delivered_at, delivered_by, delivered_to, delivered_note')
    .order('created_at', { ascending: false })

  if (batch) q = q.eq('batch_tag', batch)

  if (status === 'revoked') q = q.not('revoked_at', 'is', null)
  if (status === 'used') q = q.eq('is_used', true).is('revoked_at', null)
  if (status === 'unused') q = q.eq('is_used', false).is('revoked_at', null).is('delivered_at', null)

  if (status === 'delivered') {
    q = q.eq('is_used', false).is('revoked_at', null).not('delivered_at', 'is', null)
    if (deliveredTo) q = q.eq('delivered_to', deliveredTo)
  }

  const { data: rows, error } = await q
  if (error) return new NextResponse(error.message, { status: 500 })

  const header = [
    'code','batch_tag','note',
    'is_used','used_by','used_at',
    'created_at','created_by',
    'revoked_at','revoked_by',
    'delivered_at','delivered_by','delivered_to','delivered_note'
  ]

  const lines = [header.join(',')]
  for (const r of rows || []) lines.push(header.map((h) => csvEscape((r as any)[h])).join(','))

  // filename
  const statusSlug = safeSlug((status || 'all').toUpperCase(), 20) || 'ALL'
  const batchSlug = safeSlug(batch, 40)
  const toSlug = safeSlug(deliveredTo, 30)
  const dateSlug = yyyymmdd()

  const parts = ['pro_keys', statusSlug]
  if (batchSlug) parts.push(batchSlug)
  if (toSlug) parts.push(toSlug)
  parts.push(dateSlug)

  const filename = `${parts.join('_')}.csv`

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
