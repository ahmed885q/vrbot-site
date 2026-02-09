export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const code = String(body?.code || '').trim()
  if (!code) return NextResponse.json({ ok: false, error: 'CODE_REQUIRED' }, { status: 400 })

  const cookieStore = cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: userData } = await supabaseAuth.auth.getUser()
  const user = userData?.user
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })

  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: keyRow } = await adminDb
    .from('pro_keys')
    .select('id, code, is_used, revoked_at')
    .eq('code', code)
    .maybeSingle()

  if (!keyRow) return NextResponse.json({ ok: false, error: 'INVALID_CODE' }, { status: 404 })
  if (keyRow.revoked_at) return NextResponse.json({ ok: false, error: 'CODE_REVOKED' }, { status: 403 })
  if (keyRow.is_used) return NextResponse.json({ ok: false, error: 'CODE_ALREADY_USED' }, { status: 409 })

  await adminDb
    .from('pro_keys')
    .update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() })
    .eq('id', keyRow.id)

  const farFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString()

  const { data: sub0 } = await adminDb
    .from('subscriptions')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!sub0) {
    await adminDb.from('subscriptions').insert({
      user_id: user.id,
      plan: 'pro',
      status: 'active',
      current_period_end: farFuture,
      pro_key_code: code,
      pro_key_activated_at: new Date().toISOString(),
    })
  } else {
    await adminDb
      .from('subscriptions')
      .update({
        plan: 'pro',
        status: 'active',
        current_period_end: farFuture,
        pro_key_code: code,
        pro_key_activated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true, plan: 'pro' })
}
