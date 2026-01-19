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
  // 🔐 تحقق تسجيل الدخول
  const supabase = createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()

  if (!authData?.user) {
    redirect('/login?next=/dashboard')
  }

  // 📦 جلب حالة الاشتراك
  const h = headers()
  const host = h.get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'

  const res = await fetch(`${protocol}://${host}/api/subscription/status`, {
    cache: 'no-store',
  })

  const data = (await res.json()) as SubscriptionStatus
  const plan = data.plan ?? 'free'

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>

      <div style={{ marginTop: 12 }}>
        <p>
          <strong>Plan:</strong> {plan}
        </p>
        <p>
          <strong>Status:</strong> {data.status ?? '-'}
        </p>
        <p>
          <strong>Period End:</strong> {data.currentPeriodEnd ?? '-'}
        </p>
        <p>
          <strong>Email:</strong> {data.email ?? '-'}
        </p>
      </div>

      {plan !== 'pro' ? (
        <div style={{ marginTop: 24 }}>
          <UpgradeButton />
        </div>
      ) : (
        <p style={{ marginTop: 24, color: 'green', fontWeight: 600 }}>
          ✅ Pro features are enabled
        </p>
      )}
    </div>
  )
}
