// app/dashboard/page.tsx
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { CSSProperties } from 'react'

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
          // في Server Component أحياناً ممنوع تعديل الكوكيز، فنحاول بأمان
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
        <p style={{ marginTop: 10, color: '#6b7280' }}>You are not logged in.</p>
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
  const periodEnd = sub?.current_period_end ?? null
  const email = user.email ?? '-'

  // تنسيق التاريخ (DD/MM/YYYY)
  const formattedPeriodEnd = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '-'

  // 🎨 Styles + Icons (بدون مكتبات)
  const planStyles: Record<
    string,
    { bg: string; border: string; color: string; label: string; icon: string }
  > = {
    free: { bg: '#f3f4f6', border: '#e5e7eb', color: '#374151', label: 'FREE', icon: '🆓' },
    pro: { bg: '#ecfeff', border: '#a5f3fc', color: '#0e7490', label: 'PRO', icon: '⚡' },
    enterprise: {
      bg: '#f5f3ff',
      border: '#ddd6fe',
      color: '#5b21b6',
      label: 'ENTERPRISE',
      icon: '🏢',
    },
  }

  const statusStyles: Record<
    string,
    { bg: string; border: string; color: string; label: string; icon: string }
  > = {
    active: { bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46', label: 'ACTIVE', icon: '✅' },
    trialing: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'TRIAL', icon: '⏳' },
    canceled: {
      bg: '#fef2f2',
      border: '#fecaca',
      color: '#991b1b',
      label: 'CANCELED',
      icon: '⛔',
    },
    incomplete: {
      bg: '#fffbeb',
      border: '#fde68a',
      color: '#92400e',
      label: 'INCOMPLETE',
      icon: '⚠️',
    },
    past_due: {
      bg: '#fffbeb',
      border: '#fde68a',
      color: '#92400e',
      label: 'PAST DUE',
      icon: '⚠️',
    },
    unpaid: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', label: 'UNPAID', icon: '❌' },
    '-': { bg: '#f3f4f6', border: '#e5e7eb', color: '#374151', label: 'NONE', icon: '•' },
  }

  const planBadge = planStyles[plan] ?? {
    bg: '#f3f4f6',
    border: '#e5e7eb',
    color: '#374151',
    label: String(plan).toUpperCase(),
    icon: '•',
  }

  const statusBadge = statusStyles[status] ?? {
    bg: '#f3f4f6',
    border: '#e5e7eb',
    color: '#374151',
    label: String(status).toUpperCase(),
    icon: '•',
  }

  const badgeBase: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.3,
    whiteSpace: 'nowrap',
    border: '1px solid',
  }

  const pageWrap: CSSProperties = {
    minHeight: '100vh',
    padding: 16,
    background: '#f8fafc',
    color: '#111827',
  }

  const container: CSSProperties = {
    maxWidth: 860,
    margin: '0 auto',
  }

  const headerRow: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  }

  const title: CSSProperties = {
    fontSize: 30,
    fontWeight: 900,
    margin: 0,
  }

  const subtitle: CSSProperties = {
    marginTop: 6,
    marginBottom: 0,
    color: '#6b7280',
    fontSize: 14,
  }

  const card: CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    boxShadow: '0 6px 16px rgba(15, 23, 42, 0.06)',
    padding: 16,
  }

  const cardHead: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 12,
  }

  const cardTitle: CSSProperties = {
    margin: 0,
    fontSize: 16,
    fontWeight: 900,
  }

  const cardDesc: CSSProperties = {
    margin: '6px 0 0',
    color: '#6b7280',
    fontSize: 13,
  }

  const badgeRow: CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap', // مهم للموبايل
    justifyContent: 'flex-end',
  }

  const grid: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 12,
    marginTop: 12,
  }

  const itemRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 12,
    background: '#f9fafb',
    border: '1px solid #eef2f7',
    flexWrap: 'wrap',
  }

  const label: CSSProperties = {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.4,
  }

  const value: CSSProperties = {
    fontSize: 13,
    fontWeight: 800,
    color: '#111827',
    overflowWrap: 'anywhere',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  }

  const notice: CSSProperties = {
    marginTop: 12,
    padding: '12px 12px',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    background: '#f3f4f6',
    color: '#111827',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  }

  return (
    <div style={pageWrap}>
      <div style={container}>
        <div style={headerRow}>
          <div>
            <h1 style={title}>Dashboard</h1>
            <p style={subtitle}>Manage your plan & subscription status</p>
          </div>

          <div style={badgeRow}>
            <span
              style={{
                ...badgeBase,
                backgroundColor: planBadge.bg,
                borderColor: planBadge.border,
                color: planBadge.color,
              }}
              title="Plan"
            >
              <span aria-hidden="true">{planBadge.icon}</span>
              {planBadge.label}
            </span>

            <span
              style={{
                ...badgeBase,
                backgroundColor: statusBadge.bg,
                borderColor: statusBadge.border,
                color: statusBadge.color,
              }}
              title="Status"
            >
              <span aria-hidden="true">{statusBadge.icon}</span>
              {statusBadge.label}
            </span>
          </div>
        </div>

        <div style={card}>
          <div style={cardHead}>
            <div>
              <h2 style={cardTitle}>Subscription</h2>
              <p style={cardDesc}>Your plan and current billing state</p>
            </div>
          </div>

          <div style={grid}>
            <div style={itemRow}>
              <div style={label}>PERIOD END</div>
              <div style={value}>
                <span aria-hidden="true">🗓️</span>
                {formattedPeriodEnd}
              </div>
            </div>

            <div style={itemRow}>
              <div style={label}>EMAIL</div>
              <div style={value}>
                <span aria-hidden="true">📧</span>
                {email}
              </div>
            </div>
          </div>

          {/* ✅ تأجيل الدفع حالياً */}
          <div style={notice}>
            <div style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true">
              🧪
            </div>
            <div>
              <div style={{ fontWeight: 900, marginBottom: 4 }}>Payments are paused for now</div>
              <div style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>
                We’re launching first to validate the product. Payment (PayPal) will be enabled after
                the official release.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, color: '#6b7280', fontSize: 12 }}>
            Tip: If status is not correct, try refreshing after checkout/tests.
            <span aria-hidden="true"> ✅</span>
          </div>
        </div>
      </div>
    </div>
  )
}
