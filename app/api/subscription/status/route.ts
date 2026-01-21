import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
        setAll() {},
      },
    }
  )

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) {
    return NextResponse.json(
      { entitled: false, plan: 'free', status: 'unauthenticated' },
      { status: 200 }
    )
  }

  // اقرأ الاشتراك
  const { data: sub, error } = await supabaseAdmin
    .from('subscriptions')
    .select('plan,status,trial_ends_at,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // احتياط: لو ما فيه سجل (لو التريجر ما اشتغل لأي سبب)
  let subscription = sub
  if (!subscription) {
    const trialEnds = new Date()
    trialEnds.setDate(trialEnds.getDate() + 7)

    await supabaseAdmin.from('subscriptions').insert({
      user_id: user.id,
      plan: 'pro',
      status: 'trialing',
      trial_ends_at: trialEnds.toISOString(),
    })

    const { data: sub2 } = await supabaseAdmin
      .from('subscriptions')
      .select('plan,status,trial_ends_at,current_period_end')
      .eq('user_id', user.id)
      .maybeSingle()

    subscription = sub2 ?? null
  }

  const plan = subscription?.plan ?? 'free'
  let status = subscription?.status ?? '-'
  const trialEndsAt = subscription?.trial_ends_at ?? null

  const now = new Date()

  // entitlement rules:
  // - active => مسموح
  // - trialing + trial_ends_at > now => مسموح
  // - otherwise => ممنوع
  let entitled = false
  let daysLeft: number | null = null

  if (status === 'active') {
    entitled = true
  } else if (status === 'trialing' && trialEndsAt) {
    const end = new Date(trialEndsAt)
    const diffMs = end.getTime() - now.getTime()
    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) daysLeft = 0

    if (now < end) {
      entitled = true
    } else {
      // انتهت التجربة: حوّله expired + free (مرة واحدة)
      status = 'expired'
      entitled = false

      await supabaseAdmin
        .from('subscriptions')
        .update({
          plan: 'free',
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
    }
  } else {
    entitled = false
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email ?? null,
    plan,
    status,
    trialEndsAt,
    daysLeft,
    entitled,
    paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
  })
}
