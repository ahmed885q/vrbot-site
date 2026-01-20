import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import UpgradeButton from '@/components/UpgradeButton'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type SubscriptionStatus = {
  plan: 'free' | 'pro'
  status?: string | null
  currentPeriodEnd?: string | null
  userId?: string | null
  email?: string | null
}

export default async function DashboardPage() {
  // ✅ تحقق تسجيل الدخول
  const supabase = createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) redirect('/login?next=/dashboard')

  // ✅ جلب بيانات الاشتراك من API مع تمرير كوكي الجلسة
  const h = headers()
  const host = h.get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const cookie = h.get('cookie') ?? ''

  const res = await fetch(`${protocol}://${host}/api/subscription/status`, {
    cache: 'no-store',
    headers: { cookie },
  })

  const data: SubscriptionStatus = res.ok ? await res.json() : { plan: 'free' }
  const plan = data.plan ?? 'free'

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>

      <p>Plan: {plan}</p>
      <p>Status: {data.status ?? '-'}</p>
      <p>Period End: {data.currentPeriodEnd ?? '-'}</p>

      {/* ✅ هذا هو المهم: الإيميل من جلسة Supabase مباشرة */}
      <p>Email: {user.email ?? '-'}</p>

      {plan !== 'pro' ? (
        <div style={{ marginTop: 16 }}>
          <UpgradeButton />
        </div>
      ) : (
        <p style={{ marginTop: 16, color: 'green', fontWeight: 600 }}>
          ✅ Pro features are enabled
        </p>
      )}
    </div>
  )
}
