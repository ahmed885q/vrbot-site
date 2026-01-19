import { headers } from 'next/headers'
import UpgradeButton from '@/components/UpgradeButton'

export const dynamic = 'force-dynamic'

type SubscriptionStatus = {
  plan: 'free' | 'pro'
  status?: string | null
  currentPeriodEnd?: string | null
  userId?: string | null
  email?: string | null
}

export default async function DashboardPage() {
  const host = headers().get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'

  const res = await fetch(`${protocol}://${host}/api/subscription/status`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>
        <p style={{ marginTop: 12, color: 'red' }}>
          Failed to load subscription status
        </p>
      </div>
    )
  }

  const data = (await res.json()) as SubscriptionStatus
  const plan = data.plan ?? 'free'

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>

      {/* معلومات الاشتراك */}
      <div style={{ marginTop: 16 }}>
        <p>
          <strong>Subscription:</strong> {plan}
        </p>
        <p>
          <strong>Status:</strong> {data.status ?? '-'}
        </p>
        <p>
          <strong>Period End:</strong>{' '}
          {data.currentPeriodEnd
            ? new Date(data.currentPeriodEnd).toLocaleDateString()
            : '-'}
        </p>
      </div>

      {/* زر الترقية */}
      {plan !== 'pro' && data.userId ? (
        <div style={{ marginTop: 24 }}>
          <UpgradeButton />
        </div>
      ) : null}

      {/* حالة Pro */}
      {plan === 'pro' ? (
        <p style={{ marginTop: 24, color: 'green', fontWeight: 600 }}>
          ✅ Pro features are enabled
        </p>
      ) : (
        <p style={{ marginTop: 24, color: '#555' }}>
          Upgrade to Pro to unlock all features
        </p>
      )}
    </div>
  )
}
