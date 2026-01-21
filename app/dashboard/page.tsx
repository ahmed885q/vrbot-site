// app/dashboard/page.tsx
import React from 'react'
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
            // ignore (Server Components may block cookie writes)
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
        <p style={{ marginTop: 12, color: '#6b7280' }}>You are not logged in.</p>
      </div>
    )
  }

  // 2) قراءة الاشتراك من جدول subscriptions
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan,status,current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = (sub?.plan ?? 'free').toLowerCase()
  const status = (sub?.status ?? '-').toLowerCase()
  const periodEnd = sub?.current_period_end ?? null
  const email = user.email ?? '-'

  const formattedPeriodEnd = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '-'

  // ✅ مظهر عام
  const colors = {
    text: '#111827',
    muted: '#6b7280',
    border: '#e5e7eb',
    card: '#ffffff',
    bg: '#f8fafc',
  }

  // ✅ ألوان الخطة
  const planStyles: Record<
    string,
    { bg: string; fg: string; label: string; icon: string; ring: string }
  > = {
    free: { bg: '#eef2ff', fg: '#3730a3', label: 'FREE', icon: '🆓', ring: '#c7d2fe' },
    pro: { bg: '#ecfdf5', fg: '#065f46', label: 'PRO', icon: '⚡', ring: '#bbf7d0' },
    enterprise: {
      bg: '#f5f3ff',
      fg: '#5b21b6',
      label: 'ENTERPRISE',
      icon: '🏢',
      ring: '#ddd6fe',
    },
  }

  // ✅ ألوان الحالة (مرتبطة بالحالة فعلاً)
  const statusStyles: Record<
    string,
    { bg: string; fg: string; label: string; icon: string; ring: string }
  > = {
    active: { bg: '#ecfdf5', fg: '#065f46', label: 'ACTIVE', icon: '✅', ring: '#bbf7d0' },
    trialing: { bg: '#e0f2fe', fg: '#075985', label: 'TRIAL', icon: '⏳', ring: '#bae6fd' },
    canceled: { bg: '#fef2f2', fg: '#991b1b', label: 'CANCELED', icon: '✖️', ring: '#fecaca' },
    incomplete: {
      bg: '#fffbeb',
      fg: '#92400e',
      label: 'INCOMPLETE',
      icon: '⚠️',
      ring: '#fde68a',
    },
    past_due: { bg: '#fffbeb', fg: '#92400e', label: 'PAST DUE', icon: '⚠️', ring: '#fde68a' },
    unpaid: { bg: '#fef2f2', fg: '#991b1b', label: 'UNPAID', icon: '⛔', ring: '#fecaca' },
    '-': { bg: '#f3f4f6', fg: '#374151', label: 'NONE', icon: '•', ring: '#e5e7eb' },
  }

  const planBadge = planStyles[plan] ?? {
    bg: '#f3f4f6',
    fg: '#374151',
    label: plan.toUpperCase(),
    icon: '•',
    ring: '#e5e7eb',
  }

  const statusBadge = statusStyles[status] ?? {
    bg: '#f3f4f6',
    fg: '#374151',
    label: String(status).toUpperCase(),
    icon: '•',
    ring: '#e5e7eb',
  }

  const badgeBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    border: `1px solid ${colors.border}`,
  }

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap', // ✅ للموبايل
  }

  const label: React.CSSProperties = {
    fontSize: 12,
    color: colors.muted,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  }

  const value: React.CSSProperties = {
    fontSize: 14,
    color: colors.text,
    fontWeight: 700,
    wordBreak: 'break-word',
  }

  const card: React.CSSProperties = {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
  }

  const sectionTitle: React.CSSProperties = {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    color: colors.text,
  }

  const divider: React.CSSProperties = {
    height: 1,
    background: colors.border,
    margin: '14px 0',
  }

  return (
    <div
      style={{
        padding: 16,
        background: colors.bg,
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 720 }}>
        {/* Header */}
        <div style={{ padding: '12px 4px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: colors.text }}>
            Dashboard
          </h1>
          <p style={{ marginTop: 6, color: colors.muted, marginBottom: 0 }}>
            Manage your plan & subscription status
          </p>
        </div>

        {/* Main Card */}
        <div style={card}>
          <div style={{ ...row, alignItems: 'flex-start' }}>
            <div>
              <h2 style={sectionTitle}>Subscription</h2>
              <p style={{ margin: '6px 0 0', color: colors.muted, fontSize: 13 }}>
                Your plan and current billing state
              </p>
            </div>

            {/* ✅ الخطة + الحالة جنب بعض */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span
                style={{
                  ...badgeBase,
                  backgroundColor: planBadge.bg,
                  color: planBadge.fg,
                  border: `1px solid ${planBadge.ring}`,
                }}
              >
                <span aria-hidden="true">{planBadge.icon}</span>
                {planBadge.label}
              </span>

              <span
                style={{
                  ...badgeBase,
                  backgroundColor: statusBadge.bg,
                  color: statusBadge.fg,
                  border: `1px solid ${statusBadge.ring}`,
                }}
              >
                <span aria-hidden="true">{statusBadge.icon}</span>
                {statusBadge.label}
              </span>
            </div>
          </div>

          <div style={divider} />

          {/* ✅ بيانات بشكل موبايل مرتب */}
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={row}>
              <div style={label}>Period End</div>
              <div style={value}>
                {periodEnd ? `🗓 ${formattedPeriodEnd}` : '—'}
              </div>
            </div>

            <div style={row}>
              <div style={label}>Email</div>
              <div style={value}>📧 {email}</div>
            </div>
          </div>

          <div style={divider} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {plan === 'pro' && (
              <div style={{ flex: '1 1 220px' }}>
                <ManageBillingButton userId={user.id} />
              </div>
            )}

            {plan !== 'pro' && (
              <div style={{ flex: '1 1 220px' }}>
                <UpgradeButton userId={user.id} email={email} />
              </div>
            )}
          </div>

          {/* Hint */}
          <p style={{ marginTop: 12, marginBottom: 0, color: colors.muted, fontSize: 12 }}>
            Tip: If status is not active, try refreshing after checkout. ✅
          </p>
        </div>
      </div>
    </div>
  )
}
