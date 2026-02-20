// app/api/subscription/status/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

const TRIAL_DAYS = 7

export async function GET() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore
          }
        },
      },
    }
  )

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  // إذا ما فيه سجل: أنشئ Trial تلقائياً (نفس منطق ensure-trial)
  if (!sub) {
    const end = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { data: created } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan: 'trial',
        status: 'trialing',
        current_period_end: end,
      })
      .select('plan,status,current_period_end')
      .single()

    return NextResponse.json({
      ok: true,
      userId: user.id,
      email: user.email,
      plan: created?.plan ?? 'trial',
      status: created?.status ?? 'trialing',
      current_period_end: created?.current_period_end ?? end,
    })
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    email: user.email,
    plan: sub.plan ?? 'free',
    status: sub.status ?? '-',
    current_period_end: sub.current_period_end ?? null,
  })
}
