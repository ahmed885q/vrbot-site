// app/dashboard/page.tsx
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import UpgradeButton from '@/components/UpgradeButton'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function DashboardPage() {
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
          // في Server Component أحياناً ممنوع تعديل الكوكيز، فنحاول بأمان
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
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>
        <p style={{ marginTop: 12 }}>You are not logged in.</p>
      </div>
    )
  }

  // 2) قراءة الاشتراك من جدول subscriptions مباشرة
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = sub?.plan ?? 'free'
  const status = sub?.status ?? '-'
  const periodEnd = sub?.current_period_end ?? null
  const email = user.email ?? '-'

  const formattedPeriodEnd = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '-'

  // ✅ Styles + Icons (بدون مكتبات)
  const planStyles: Record<string, { bg: string; color: string; label: string; icon: string }> = {
    free: { bg: '#e5e7eb', color: '#374151', label: 'FREE', icon: '•' },
    pro: { bg: '#dcfce7', color: '#166534', label: 'PRO', icon: '★' },
    enterprise: { bg: '#ede9fe', color: '#5b21b6', label: 'ENTERPRISE', icon: '◆' },
  }

  const statusStyles: Record<
    string,
    { bg: string; color: string; label: string; icon: string }
  > = {
    active: { bg: '#dcfce7', color: '#166534', label: 'ACTIVE', icon: '✓' },
    trialing: { bg: '#e0f2fe', color: '#075985', label: 'TRIAL', icon: '⏳' },
    canceled: { bg: '#fee2e2', color: '#991b1b', label: 'CANCELED', icon: '✕' },
    incomplete: { bg: '#fef3c7', color: '#92400e', label: 'INCOMPLETE', icon: '!' },
    past_due: { bg: '#fef3c7', color: '#92400e', label: 'PAST DUE', icon: '!' },
    unpaid: { bg: '#fee2e2', color: '#991b1b', label: 'UNPAID', icon: '!' },
    '-': { bg: '#e5e7eb', color: '#374151', label: 'NONE', icon: '•' },
  }

  const planBadge = planStyles[plan] ?? {
    bg: '#e5e7eb',
    color: '#374151',
    label: plan.toUpperCase(),
    icon: '•',
  }

  const statusBadge = statusStyles[status] ?? {
    bg: '#e5e7eb',
    color: '#374151',
    label: String(status).toUpperCase(),
    icon: '•',
  }

  const badgeStyleBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>

      {/* ✅ Badges جنب بعض + مناسب للموبايل */}
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap', // ✅ مهم للموبايل
        }}
      >
        <span style={{ fontWeight: 700 }}>Plan:</span>

        {/* Plan Badge */}
        <span
          style={{
            ...badgeStyleBase,
            backgroundColor: planBadge.bg,
            color: planBadge.color,
          }}
        >
          <span aria-hidden="true">{planBadge.icon}</span>
          {planBadge.label}
        </span>

        {/* Status Badge */}
        <span
          style={{
            ...badgeStyleBase,
            backgroundColor: statusBadge.bg,
            color: statusBadge.color,
          }}
        >
          <span aria-hidden="true">{statusBadge.icon}</span>
          {statusBadge.label}
        </span>
      </div>

      {/* ✅ Expiry Badge */}
      <div style={{ marginTop: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: periodEnd ? '#f3f4f6' : '#f1f1f1',
            color: '#111827',
          }}
        >
          <span aria-hidden="true">🗓</span>
          {periodEnd ? `Active until ${formattedPeriodEnd}` : 'No expiry'}
        </span>
      </div>

      <p style={{ marginTop: 14 }}>Email: {email}</p>

      {/* ✅ زر الترقية يظهر فقط لو مو Pro */}
      {plan !== 'pro' && (
        <div style={{ marginTop: 16 }}>
          <UpgradeButton userId={user.id} email={email} />
        </div>
      )}
    </div>
  )
}
