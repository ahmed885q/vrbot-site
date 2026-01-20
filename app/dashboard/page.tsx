import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import UpgradeButton from '@/components/UpgradeButton'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // إنشاء Supabase server client
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  // جلب المستخدم الحالي
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div style={{ padding: 24 }}>Not authenticated</div>
  }

  // ✅ fetch برابط نسبي (يمرر cookies تلقائياً)
  const res = await fetch('/api/subscription/status', {
    cache: 'no-store',
  })

  if (!res.ok) {
    return <div style={{ padding: 24 }}>Failed to load subscription</div>
  }

  const data = await res.json()

  const plan = data.plan ?? 'free'
  const status = data.status ?? '-'
  const periodEnd = data.current_period_end ?? '-'
  const email = data.email ?? user.email

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