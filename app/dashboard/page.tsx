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
          // في Server Component أحيانًا ممنوع تعديل الكوكيز، فنسويها بأمان
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
  const planStyles: Record<string, { bg: string; color: string; label: string }> = {
  free: {
    bg: '#e5e7eb',     // رمادي فاتح
    color: '#374151',  // رمادي غامق
    label: 'FREE',
  },
  pro: {
    bg: '#dcfce7',     // أخضر فاتح
    color: '#166534',  // أخضر غامق
    label: 'PRO',
  },
}

const status = sub?.status ?? '-'
const periodEnd = sub?.current_period_end ?? null
const formattedPeriodEnd = periodEnd
  ? new Date(periodEnd).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  : '-'
const email = user.email ?? '-'


  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>

     <p style={{ marginTop: 12 }}>
  Plan:{' '}
  <span
    style={{
      backgroundColor: planStyles[plan]?.bg ?? '#e5e7eb',
      color: planStyles[plan]?.color ?? '#374151',
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      marginLeft: 6,
    }}
  >
    {planStyles[plan]?.label ?? plan.toUpperCase()}
  </span>
</p>

    <p>Status: {status}</p>

<div style={{ marginTop: 8 }}>
  <span
    style={{
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: 999,
      fontSize: 14,
      fontWeight: 600,
      backgroundColor: periodEnd ? '#e6f4ea' : '#f1f1f1',
      color: periodEnd ? '#137333' : '#555',
    }}
  >
    {periodEnd ? `Active until ${formattedPeriodEnd}` : 'No expiry'}
  </span>
</div>
      <p>Email: {email}</p>

      {plan !== 'pro' && (
        <div style={{ marginTop: 16 }}>
          <UpgradeButton userId={user.id} email={email} />
        </div>
      )}
    </div>
  )
}
