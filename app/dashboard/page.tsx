// app/dashboard/page.tsx
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import LocalStreamControls from '@/components/LocalStreamControls'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export function LocalStreamPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>VR Farm Manager</h1>
      <div style={{ marginTop: 16 }}>
        <LocalStreamControls />
      </div>
    </div>
  )
}
const TRIAL_DAYS = 7

function isExpired(periodEnd: string | null) {
  if (!periodEnd) return true
  return new Date(periodEnd).getTime() < Date.now()
}

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

  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Dashboard</h1>
        <p style={{ marginTop: 12 }}>You are not logged in.</p>
      </div>
    )
  }

  let { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  // إذا ما فيه سجل: أنشئ Trial أسبوع
  if (!sub) {
    const end = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
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
  const email = user.email ?? '-'

  const expired = isExpired(periodEnd)
  const effectiveStatus =
    plan === 'trial' && expired ? 'expired' : status

  const formattedPeriodEnd = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '-'

  // Styles + Icons
  const planStyles: Record<string, { bg: string; color: string; label: string; icon: string }> = {
    trial: { bg: '#e0f2fe', color: '#075985', label: 'TRIAL', icon: '⏳' },
    free: { bg: '#e5e7eb', color: '#374151', label: 'FREE', icon: '•' },
    pro: { bg: '#dcfce7', color: '#166534', label: 'PRO', icon: '⚡' },
    enterprise: { bg: '#ede9fe', color: '#5b21b6', label: 'ENTERPRISE', icon: '◆' },
  }

  const statusStyles: Record<string, { bg: string; color: string; label: string; icon: string }> = {
    active: { bg: '#dcfce7', color: '#166534', label: 'ACTIVE', icon: '✓' },
    trialing: { bg: '#e0f2fe', color: '#075985', label: 'TRIALING', icon: '⏳' },
    expired: { bg: '#fee2e2', color: '#991b1b', label: 'EXPIRED', icon: '✕' },
    canceled: { bg: '#fee2e2', color: '#991b1b', label: 'CANCELED', icon: '✕' },
    past_due: { bg: '#fef3c7', color: '#92400e', label: 'PAST DUE', icon: '!' },
    '-': { bg: '#e5e7eb', color: '#374151', label: 'NONE', icon: '•' },
  }

  const planBadge = planStyles[plan] ?? {
    bg: '#e5e7eb',
    color: '#374151',
    label: String(plan).toUpperCase(),
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
    padding: '7px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    border: '1px solid rgba(0,0,0,0.06)',
  }

  const cardStyle: React.CSSProperties = {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    background: '#fff',
    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 0',
    borderTop: '1px solid #f1f5f9',
    flexWrap: 'wrap',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    letterSpacing: 0.6,
    fontWeight: 900,
    color: '#334155',
    textTransform: 'uppercase',
  }

  const valueStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    wordBreak: 'break-word',
  }

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Dashboard</h1>
      <p style={{ marginTop: 6, color: '#475569', fontWeight: 600 }}>
        Manage your plan & subscription status
      </p>

      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#0f172a' }}>
              Subscription
            </div>
            <div style={{ marginTop: 4, color: '#64748b', fontWeight: 600, fontSize: 13 }}>
              Your plan and current billing state
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ ...badgeStyleBase, backgroundColor: planBadge.bg, color: planBadge.color }}>
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
            </span>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={rowStyle}>
            <div style={labelStyle}>PERIOD END</div>
            <div style={valueStyle}>{formattedPeriodEnd}</div>
          </div>

          <div style={rowStyle}>
            <div style={labelStyle}>EMAIL</div>
            <div style={valueStyle}>{email}</div>
          </div>
        </div>

        {/* أزرار */}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="/bot"
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #0f172a',
              background: '#0f172a',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            Open Bot
          </a>

          <a
            href="mailto:ahmed85q@hotmail.com?subject=VRBOT%20Trial%20Access"
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: '#f8fafc',
              color: '#0f172a',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            Request Access
          </a>
        </div>

        <div style={{ marginTop: 10, color: '#64748b', fontSize: 13, fontWeight: 600 }}>
          ✅ Tip: If status is not correct, try refreshing after login.
          <span style={{ marginLeft: 8 }}>🟩</span>
        </div>

        <div style={{ marginTop: 8, color: '#64748b', fontSize: 13, fontWeight: 600 }}>
          💳 Payments are disabled now. PayPal will be enabled after launch.
        </div>
      </div>
    </div>
  )
}
