// app/bot/page.tsx
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TRIAL_DAYS = 7

function isExpired(periodEnd: string | null) {
  if (!periodEnd) return true
  return new Date(periodEnd).getTime() < Date.now()
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
            // ignore (Server Components sometimes can't set cookies)
          }
        },
      },
    }
  )

  // 1) المستخدم
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>VRBOT</h1>
        <p style={{ marginTop: 10 }}>Please login to access the bot.</p>
        <a
          href="/auth"
          style={{
            display: 'inline-block',
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #111827',
            textDecoration: 'none',
            fontWeight: 700,
            color: '#111827',
            background: '#fff',
          }}
        >
          Go to login
        </a>
      </div>
    )
  }

  // 2) قراءة الاشتراك
  let { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  // 3) إذا ما فيه سجل: أنشئ Trial أسبوع
  if (!sub) {
    const end = new Date(
      Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

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

    sub = created ?? { plan: 'trial', status: 'trialing', current_period_end: end }
  }

  const plan = sub?.plan ?? 'free'
  const status = sub?.status ?? '-'
  const periodEnd = sub?.current_period_end ?? null

  // ✅ السماح فقط إذا Trial/Active ولم تنتهي المدة
  const allowed: boolean =
    (status === 'trialing' || status === 'active') && !isExpired(periodEnd)

  // ✅ إذا غير مسموح -> اقفل البوت
  if (!allowed) {
    return (
      <div style={{ padding: 24, maxWidth: 720 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Bot Access Locked</h1>
        <p style={{ marginTop: 10 }}>
          Your free trial has ended. Payments will be enabled later via PayPal.
        </p>

        <div
          style={{
            marginTop: 14,
            padding: 14,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            background: '#fafafa',
          }}
        >
          <p style={{ margin: 0, fontWeight: 700 }}>Current status</p>

          <p style={{ margin: '8px 0 0' }}>
            Plan: <b>{String(plan)}</b> — Status: <b>{String(status)}</b>
          </p>

          <p style={{ margin: '8px 0 0' }}>
            Period End:{' '}
            <b>{periodEnd ? new Date(periodEnd).toLocaleString() : '-'}</b>
          </p>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="/dashboard"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #111827',
              textDecoration: 'none',
              fontWeight: 700,
              color: '#111827',
              background: '#fff',
            }}
          >
            Go to Dashboard
          </a>

          <a
            href="mailto:ahmed85q@hotmail.com?subject=VRBOT%20Access%20Request"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              textDecoration: 'none',
              fontWeight: 700,
              color: '#111827',
              background: '#f3f4f6',
            }}
          >
            Request Access
          </a>
        </div>
      </div>
    )
  }

  // ✅ هنا مكان البوت الحقيقي
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>VRBOT</h1>
      <p style={{ marginTop: 10 }}>Bot is enabled ✅</p>
      <p style={{ marginTop: 8, opacity: 0.8 }}>(Put your bot UI here)</p>
    </div>
  )
}
