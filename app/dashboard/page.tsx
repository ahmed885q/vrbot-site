import { headers } from 'next/headers'
import UpgradeButton from '@/components/UpgradeButton'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // حماية الصفحة
  const supabase = createSupabaseServerClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) redirect('/login?next=/dashboard')

  const host = headers().get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'

  const res = await fetch(`${protocol}://${host}/api/subscription/status`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    return <div style={{ padding: 24 }}>Failed to load subscription</div>
  }

  const data = await res.json()

  const plan = data.plan ?? 'free'
  const email = data.email ?? authData.user.email ?? '-'
  const userId = data.userId ?? authData.user.id

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Dashboard</h1>

      <p>Plan: {plan}</p>
      <p>Status: {data.status ?? '-'}</p>
      <p>Period End: {data.currentPeriodEnd ?? '-'}</p>
      <p>Email: {email}</p>

      {plan !== 'pro' && userId && email ? (
        <UpgradeButton userId={userId} email={email} />
      ) : null}
    </div>
  )
}
