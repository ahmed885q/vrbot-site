// app/dashboard/page.tsx
import type React from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import UpgradeButton from '@/components/UpgradeButton'
import ManageBillingButton from '@/components/ManageBillingButton'

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
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Dashboard</h1>
        <p style={{ marginTop: 12, opacity: 0.8 }}>You are not logged in.</p>
      </div>
    )
  }

  // 2) قراءة الاشتراك (مع trial_ends_at)
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end,trial_ends_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = sub?.plan ?? 'free'
  const status = sub?.status ?? '-'
  const periodEnd = sub?.current_period_end ?? null
  const trialEndsAt = sub?.trial_ends_at ?? null
  const email = user.email ?? '-'

  // 3) حساب الحالة الفعلية: Trial 7 أيام ثم Free
  const now = new Date()

  let effectivePlan = plan
  let effectiveStatus = status

  let trialDaysLeft: number | null = null
  if (trialEndsAt && String(trialEndsAt).length > 0) {
    const tEnd = new Date(trialEndsAt)
    const diffMs = tEnd.getTime() - now.getTime()
    trialDaysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (trialDaysLeft < 0) trialDaysLeft = 0

    if (status === 'trialing' && now > tEnd) {
      effectivePlan = 'free'
      effectiveStatus = 'expired'
    }
  }

  const formattedPeriodEnd = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '-'

  const formattedTrialEnd = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : null

  // 4) Styles + Icons (بدون مكتبات)
  const planStyles: Record<
    string,
    { bg: string; color: string; label: string; icon: string }
  > = {
    free: { bg: '#e5e7eb', color: '#374151', label: 'FREE', icon: '•' },
    pro: { bg: '#dcfce7', color: '#166534', label: 'PRO', icon: '⚡' },
    enterprise: { bg: '#ede9fe', color: '#5b21b6', label: 'ENTERPRISE', icon: '◆' },
  }

  const statusStyles: Record<
    string,
    { bg: string; color: string; label: string; icon: string }
  > = {
    active: { bg: '#dcfce7', color: '#166534', label: 'ACTIVE', icon: '✓' },
    trialing: { bg: '#e0f2fe', color: '#075985', label: 'TRIAL', icon: '⏳' },
    expired: { bg: '#fee2e2', color: '#991b1b', label: 'TRIAL ENDED', icon: '⛔' },
    canceled: { bg: '#fee2e2', color: '#991b1b', label: 'CANCELED', icon: '✕' },
    past_due: { bg: '#fef3c7', color: '#92400e', label: 'PAST DUE', icon: '!' },
    unpaid: { bg: '#fee2e2', color: '#991b1b', label: 'UNPAID', icon: '!' },
    '-': { bg: '#e5e7eb', color: '#374151', label: 'NONE', icon: '•' },
  }

  const planBadge = planStyles[effectivePlan] ?? {
    bg: '#e5e7eb',
    color: '#374151',
    label: String(effectivePlan).toUpperCase(),
    icon: '•',
  }

  const statusBadge = statusStyles[effectiveStatus] ?? {
    bg: '#e5e7eb',
    color: '#374151',
    label: String(effectiveStatus).toUpperCase(),
    icon: '•',
  }

  const badgeStyleBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  }

  // Layout styles (موبايل)
  const pageWrap: React.CSSProperties = {
    minHeight: '100vh',
    padding: 18,
    background:
      'radial-gradient(80% 50% at 50% 0%, rgba(59,130,246,0.10) 0%, rgba(255,255,255,0) 70%), #f8fafc',
  }

  const card: React.CSSProperties = {
    maxWidth: 860,
    margin: '18px auto 0',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
    overflow: 'hidden',
  }

  const cardHeader: React.CSSProperties = {
    padding: 16,
    borderBottom: '1px solid #eef2f7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  }

  const metaGrid: React.CSSProperties = {
    padding: 16,
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 12,
  }

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    border: '1px solid #eef2f7',
    borderRadius: 12,
    background: '#fbfdff',
    flexWrap: 'wrap',
  }

  const label: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    color: '#64748b',
    textTransform: 'uppercase',
  }

  const value: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 800,
    color: '#0f172a',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  }

  const hint: React.CSSProperties = {
    fontSize: 12,
    color: '#64748b',
    marginTop: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  }

  // 5) عرض
  return (
    <div style={pageWrap}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0, color: '#0f172a' }}>
          Dashboard
        </h1>
        <p style={{ marginTop: 6, marginBottom: 0, color: '#64748b', fontWeight: 600 }}>
          Manage your plan & subscription status
        </p>
      </div>

      <div style={card}>
        <div style={cardHeader}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
              Subscription
            </div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
              Your plan and current billing state
            </div>
          </div>

          {/* Badges جنب بعض */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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

            <span
              style={{
                ...badgeStyleBase,
                backgroundColor: statusBadge.bg,
                color: statusBadge.color,
              }}
            >
              <span aria-hidden="true">{statusBadge.icon}</span>
              {statusBadge.label}
              {effectiveStatus === 'trialing' && typeof trialDaysLeft === 'number' ? (
                <span style={{ opacity: 0.85, fontWeight: 900 }}>
                  • {trialDaysLeft}d left
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <div style={metaGrid}>
          <div style={row}>
            <div style={label}>Period End</div>
            <div style={value}>
              <span aria-hidden="true">🗓</span>
              {formattedPeriodEnd}
            </div>
          </div>

          {/* Trial info */}
          {formattedTrialEnd ? (
            <div style={row}>
              <div style={label}>Trial ends</div>
              <div style={value}>
                <span aria-hidden="true">⏳</span>
                {formattedTrialEnd}
              </div>
            </div>
          ) : null}

          <div style={row}>
            <div style={label}>Email</div>
            <div style={value}>
              <span aria-hidden="true">📧</span>
              {email}
            </div>
          </div>

          {/* أزرار */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Manage Billing (موجود فقط لو Pro/Active أو Pro/Trialing) */}
            {(effectivePlan === 'pro' && (effectiveStatus === 'active' || effectiveStatus === 'trialing')) ? (
              <ManageBillingButton userId={user.id} />
            ) : null}

            {/* Upgrade يظهر إذا انتهت التجربة أو Free */}
            {effectivePlan !== 'pro' ? (
              <UpgradeButton userId={user.id} email={email} />
            ) : null}
          </div>

          {/* Hint */}
          <div style={hint}>
            <span aria-hidden="true">✅</span>
            Tip: If status is not correct, try refreshing after checkout.
            {effectiveStatus === 'expired' ? (
              <span style={{ color: '#991b1b', fontWeight: 800 }}>
                • Trial ended — upgrade to continue (payments will be enabled later via PayPal)
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
