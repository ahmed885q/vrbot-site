// app/bot/page.tsx
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import BotPanel from '@/components/BotPanel'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default async function BotPage() {
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

  // 1) المستخدم الحالي
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>VRBOT</h1>
        <p style={{ marginTop: 10 }}>You are not logged in.</p>
      </div>
    )
  }

  // 2) جلب الاشتراك
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  const now = new Date()
  const currentPeriodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null

  let plan = sub?.plan ?? 'free'
  let status = sub?.status ?? '-'
  let periodEndISO: string | null = currentPeriodEnd ? currentPeriodEnd.toISOString() : null

  // 3) Trial تلقائي 7 أيام إذا ما عنده اشتراك
  const hasPro = plan === 'pro' && status === 'active'
  const hasActiveTrial =
    plan === 'trial' && status === 'active' && currentPeriodEnd && currentPeriodEnd > now

  if (!hasPro && !hasActiveTrial) {
    // إذا ما فيه صف أصلًا أو free -> نبدأ Trial
    if (!sub || plan === 'free' || status === '-' || status === 'inactive') {
      const trialEnd = addDays(now, 7)
      await supabase.from('subscriptions').upsert(
        {
          user_id: user.id,
          plan: 'trial',
          status: 'active',
          current_period_end: trialEnd.toISOString(),
        },
        { onConflict: 'user_id' }
      )

      plan = 'trial'
      status = 'active'
      periodEndISO = trialEnd.toISOString()
    } else {
      // إذا موجود لكنه منتهي (مثلاً trial انتهى) نقفل
      if (currentPeriodEnd && currentPeriodEnd <= now && plan !== 'pro') {
        await supabase
          .from('subscriptions')
          .update({ status: 'expired', plan: 'free' })
          .eq('user_id', user.id)

        plan = 'free'
        status = 'expired'
      }
    }
  }

  const allowed =
    plan === 'pro'
      ? status === 'active'
      : plan === 'trial' && status === 'active' && periodEndISO && new Date(periodEndISO) > now

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>VRBOT Control</h1>
      <p style={{ marginTop: 8, color: '#4b5563' }}>
        Start/Stop the bot, view logs, and verify your 7-day trial access.
      </p>

      <BotPanel
        userEmail={user.email ?? ''}
        plan={plan}
        status={status}
        periodEndISO={periodEndISO}
        allowed={allowed}
      />
    </div>
  )
}
