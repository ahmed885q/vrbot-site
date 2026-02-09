export const dynamic = "force-dynamic";
// app/api/subscription/ensure-trial/route.ts
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

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  const user = userData?.user

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 })
  }

  // هل عنده اشتراك؟
  const { data: existing, error: readErr } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  if (readErr) {
    return NextResponse.json(
      { ok: false, error: 'READ_SUBSCRIPTION_FAILED', details: readErr.message },
      { status: 500 }
    )
  }

  // إذا موجود رجّعه
  if (existing) {
    return NextResponse.json({
      ok: true,
      userId: user.id,
      email: user.email,
      ...existing,
      trialCreated: false,
    })
  }

  // إذا غير موجود: أنشئ Trial أسبوع
  const end = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: created, error: insErr } = await supabase
    .from('subscriptions')
    .insert({
      user_id: user.id,
      plan: 'trial',
      status: 'trialing',
      current_period_end: end,
    })
    .select('plan,status,current_period_end')
    .single()

  if (insErr) {
    return NextResponse.json(
      { ok: false, error: 'CREATE_TRIAL_FAILED', details: insErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    userId: user.id,
    email: user.email,
    ...created,
    trialCreated: true,
  })
}
