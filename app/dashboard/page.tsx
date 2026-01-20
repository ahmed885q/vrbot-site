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
  const status = sub?.status ?? '-'
  const periodEnd = sub?.current_period_end ?? '-'
  const email = user.email ?? '-'

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>

      <p style={{ marginTop: 12 }}>Plan: {plan}</p>
      <p>Status: {status}</p>
      <p>Period End: {periodEnd}</p>
      <p>Email: {email}</p>

      {plan !== 'pro' && (
        <div style={{ marginTop: 16 }}>
          <UpgradeButton userId={user.id} email={email} />
        </div>
      )}
    </div>
  )
}
