'use client'
import { useMemo } from 'react'

interface AnalyticsProps {
  data: any
}

function groupByDate(items: any[], dateField: string, days: number = 30): Record<string, number> {
  const map: Record<string, number> = {}
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    map[d.toISOString().slice(0, 10)] = 0
  }
  for (const item of items) {
    const val = item[dateField]
    if (!val) continue
    const key = new Date(val).toISOString().slice(0, 10)
    if (key in map) map[key]++
  }
  return map
}

function groupByMonth(items: any[], dateField: string, months: number = 6): Record<string, number> {
  const map: Record<string, number> = {}
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toISOString().slice(0, 7)
    map[key] = 0
  }
  for (const item of items) {
    const val = item[dateField]
    if (!val) continue
    const key = new Date(val).toISOString().slice(0, 7)
    if (key in map) map[key]++
  }
  return map
}

// ===== CHART COMPONENTS =====

function BarChart({ data, color, label }: { data: Record<string, number>; color: string; label: string }) {
  const entries = Object.entries(data)
  const max = Math.max(...entries.map(([_, v]) => v), 1)

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color, marginBottom: '12px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px', padding: '0 4px' }}>
        {entries.map(([key, val], i) => (
          <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div
              title={`${key}: ${val}`}
              style={{
                width: '100%',
                maxWidth: '24px',
                height: `${Math.max((val / max) * 100, 2)}%`,
                background: val > 0 ? `linear-gradient(180deg, ${color}, ${color}80)` : '#1a1a2a',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s ease',
                cursor: 'pointer',
                minHeight: '2px',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontSize: '10px', color: '#555' }}>{entries[0]?.[0]?.slice(5) || ''}</span>
        <span style={{ fontSize: '10px', color: '#555' }}>{entries[entries.length - 1]?.[0]?.slice(5) || ''}</span>
      </div>
    </div>
  )
}

function MonthBarChart({ data, color, label }: { data: Record<string, number>; color: string; label: string }) {
  const entries = Object.entries(data)
  const max = Math.max(...entries.map(([_, v]) => v), 1)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color, marginBottom: '12px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
        {entries.map(([key, val]) => {
          const monthIdx = parseInt(key.slice(5, 7)) - 1
          return (
            <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color, marginBottom: '4px' }}>{val}</div>
              <div
                style={{
                  width: '100%',
                  maxWidth: '48px',
                  height: `${Math.max((val / max) * 80, 4)}%`,
                  background: `linear-gradient(180deg, ${color}, ${color}60)`,
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.3s ease',
                }}
              />
              <div style={{ fontSize: '11px', color: '#888', marginTop: '6px', fontWeight: 600 }}>
                {monthNames[monthIdx]}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DonutChart({ segments, size = 140, label }: { segments: { value: number; color: string; label: string }[]; size?: number; label: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  if (total === 0) return <div style={{ textAlign: 'center', color: '#555', padding: '20px' }}>No data</div>

  const radius = size / 2 - 10
  const cx = size / 2
  const cy = size / 2
  let cumAngle = -90

  const paths = segments.filter(s => s.value > 0).map((seg) => {
    const angle = (seg.value / total) * 360
    const startRad = (cumAngle * Math.PI) / 180
    const endRad = ((cumAngle + angle) * Math.PI) / 180
    const largeArc = angle > 180 ? 1 : 0
    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    cumAngle += angle
    return { d, color: seg.color, label: seg.label, value: seg.value, pct: ((seg.value / total) * 100).toFixed(0) }
  })

  return (
    <div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#ccc', marginBottom: '12px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} stroke="#141420" strokeWidth="2" />
          ))}
          <circle cx={cx} cy={cy} r={radius * 0.55} fill="#141420" />
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="800">{total}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#888" fontSize="10">Total</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {paths.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: p.color, flexShrink: 0 }} />
              <span style={{ color: '#ccc' }}>{p.label}</span>
              <span style={{ color: '#888', fontWeight: 600 }}>{p.value} ({p.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatRow({ items }: { items: { value: string | number; label: string; color: string; trend?: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
      {items.map((item, i) => (
        <div key={i} style={{
          flex: '1', minWidth: '140px', background: item.color + '10', border: '1px solid ' + item.color + '30',
          borderRadius: '12px', padding: '16px',
        }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: item.color }}>{item.value}</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{item.label}</div>
          {item.trend && <div style={{ fontSize: '11px', color: item.trend.startsWith('+') ? '#22c55e' : '#ef4444', marginTop: '4px', fontWeight: 600 }}>{item.trend}</div>}
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ value, max, color, label, sublabel }: { value: number; max: number; color: string; label: string; sublabel?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: '#ccc' }}>{label}</span>
        <span style={{ fontSize: '13px', color, fontWeight: 700 }}>{value} / {max} ({pct.toFixed(0)}%)</span>
      </div>
      <div style={{ height: '8px', background: '#1a1a2a', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: '4px', transition: 'width 0.5s ease' }} />
      </div>
      {sublabel && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{sublabel}</div>}
    </div>
  )
}

// ===== MAIN ANALYTICS COMPONENT =====

export default function AnalyticsTab({ data }: AnalyticsProps) {
  const users = data?.users ?? []
  const farms = data?.farms ?? []
  const subs = data?.subscriptions ?? []
  const tokens = data?.tokens ?? []
  const keys = data?.proKeys ?? []

  // ===== Computed Stats =====
  const now = new Date()
  const last7d = new Date(now.getTime() - 7 * 86400000)
  const last30d = new Date(now.getTime() - 30 * 86400000)

  const newUsersWeek = users.filter((u: any) => new Date(u.created_at) > last7d).length
  const newUsersMonth = users.filter((u: any) => new Date(u.created_at) > last30d).length
  const activeUsersWeek = users.filter((u: any) => u.last_sign_in && new Date(u.last_sign_in) > last7d).length

  const activeSubs = subs.filter((s: any) => s.status === 'active').length
  const canceledSubs = subs.filter((s: any) => s.status === 'canceled' || s.status === 'cancelled').length
  const expiredSubs = subs.filter((s: any) => s.status === 'expired').length

  const totalTokens = tokens.reduce((a: number, t: any) => a + (t.tokens_total || 0), 0)
  const usedTokens = tokens.reduce((a: number, t: any) => a + (t.tokens_used || 0), 0)
  const trialUsers = tokens.filter((t: any) => t.trial_granted).length

  const totalKeys = keys.length
  const usedKeys = keys.filter((k: any) => k.is_used).length
  const revokedKeys = keys.filter((k: any) => k.revoked).length
  const availableKeys = keys.filter((k: any) => !k.is_used && !k.revoked).length
  const deliveredKeys = keys.filter((k: any) => k.delivered_at).length

  const activeFarms = farms.filter((f: any) => f.bot_enabled).length
  const newFarmsWeek = farms.filter((f: any) => new Date(f.created_at) > last7d).length

  // ===== Time series =====
  const usersByDay = useMemo(() => groupByDate(users, 'created_at', 30), [users])
  const farmsByDay = useMemo(() => groupByDate(farms, 'created_at', 30), [farms])
  const keysByDay = useMemo(() => groupByDate(keys.filter((k: any) => k.is_used), 'used_at', 30), [keys])

  const usersByMonth = useMemo(() => groupByMonth(users, 'created_at', 6), [users])
  const subsByMonth = useMemo(() => groupByMonth(subs, 'updated_at', 6), [subs])
  const farmsByMonth = useMemo(() => groupByMonth(farms, 'created_at', 6), [farms])

  // ===== Subscription source breakdown =====
  const subSources = useMemo(() => {
    const map: Record<string, number> = { PayPal: 0, 'Pro Key': 0, Manual: 0, Other: 0 }
    for (const s of subs) {
      if (s.stripe_customer_id === 'admin_manual') map.Manual++
      else if (s.pro_key_code) map['Pro Key']++
      else if (s.stripe_customer_id?.startsWith('PAYID') || s.stripe_customer_id?.includes('paypal')) map.PayPal++
      else map.Other++
    }
    return map
  }, [subs])

  // ===== Top servers =====
  const serverStats = useMemo(() => {
    const map: Record<string, number> = {}
    for (const f of farms) {
      const srv = f.server || 'Unknown'
      map[srv] = (map[srv] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [farms])

  const S = {
    card: { background: '#141420', border: '1px solid #2a2a3a', borderRadius: '12px', padding: '20px', marginBottom: '16px' } as React.CSSProperties,
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '16px' } as React.CSSProperties,
    sectionTitle: { fontSize: '16px', fontWeight: 700, color: '#888', marginBottom: '16px', textTransform: 'uppercase' as const, letterSpacing: '1px', borderBottom: '1px solid #2a2a3a', paddingBottom: '8px' },
  }

  return (
    <div>
      {/* Overview Stats */}
      <StatRow items={[
        { value: users.length, label: 'Total Users', color: '#3b82f6', trend: `+${newUsersWeek} this week` },
        { value: activeSubs, label: 'Active Subscriptions', color: '#22c55e' },
        { value: farms.length, label: 'Total Farms', color: '#8b5cf6', trend: `+${newFarmsWeek} this week` },
        { value: activeUsersWeek, label: 'Active Users (7d)', color: '#f59e0b' },
      ]} />

      {/* Growth Charts */}
      <div style={S.sectionTitle}>📈 Growth Trends</div>
      <div style={S.grid2}>
        <div style={S.card}>
          <MonthBarChart data={usersByMonth} color="#3b82f6" label="User Signups (6 months)" />
        </div>
        <div style={S.card}>
          <MonthBarChart data={subsByMonth} color="#22c55e" label="Subscriptions (6 months)" />
        </div>
      </div>

      {/* Daily Activity */}
      <div style={S.sectionTitle}>📊 Daily Activity (Last 30 Days)</div>
      <div style={S.grid2}>
        <div style={S.card}>
          <BarChart data={usersByDay} color="#3b82f6" label="New Users / Day" />
        </div>
        <div style={S.card}>
          <BarChart data={farmsByDay} color="#8b5cf6" label="New Farms / Day" />
        </div>
        <div style={S.card}>
          <BarChart data={keysByDay} color="#a855f7" label="Keys Used / Day" />
        </div>
      </div>

      {/* Breakdowns */}
      <div style={S.sectionTitle}>🔍 Breakdowns</div>
      <div style={S.grid2}>
        <div style={S.card}>
          <DonutChart
            label="Subscription Status"
            segments={[
              { value: activeSubs, color: '#22c55e', label: 'Active' },
              { value: canceledSubs, color: '#ef4444', label: 'Canceled' },
              { value: expiredSubs, color: '#f59e0b', label: 'Expired' },
            ]}
          />
        </div>
        <div style={S.card}>
          <DonutChart
            label="Pro Keys Status"
            segments={[
              { value: availableKeys, color: '#22c55e', label: 'Available' },
              { value: usedKeys, color: '#f59e0b', label: 'Used' },
              { value: revokedKeys, color: '#ef4444', label: 'Revoked' },
            ]}
          />
        </div>
        <div style={S.card}>
          <DonutChart
            label="Subscription Sources"
            segments={[
              { value: subSources.PayPal, color: '#0070ba', label: 'PayPal' },
              { value: subSources['Pro Key'], color: '#a855f7', label: 'Pro Key' },
              { value: subSources.Manual, color: '#f59e0b', label: 'Manual' },
              { value: subSources.Other, color: '#888', label: 'Other' },
            ]}
          />
        </div>
        <div style={S.card}>
          <DonutChart
            label="Farm Status"
            segments={[
              { value: activeFarms, color: '#22c55e', label: 'Active (Bot ON)' },
              { value: farms.length - activeFarms, color: '#888', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      {/* Token & Resource Usage */}
      <div style={S.sectionTitle}>⚡ Resource Usage</div>
      <div style={S.card}>
        <ProgressBar value={usedTokens} max={totalTokens} color="#06b6d4" label="Token Usage" sublabel={`${totalTokens - usedTokens} tokens remaining across all users`} />
        <ProgressBar value={usedKeys} max={totalKeys} color="#a855f7" label="Pro Keys Used" sublabel={`${availableKeys} keys available for distribution`} />
        <ProgressBar value={deliveredKeys} max={totalKeys} color="#14b8a6" label="Pro Keys Delivered" sublabel={`${totalKeys - deliveredKeys} keys not yet delivered`} />
        <ProgressBar value={trialUsers} max={users.length} color="#f59e0b" label="Trial Users" sublabel={`${users.length - trialUsers} users without trial`} />
      </div>

      {/* Server Distribution */}
      {serverStats.length > 0 && (
        <>
          <div style={S.sectionTitle}>🌍 Server Distribution</div>
          <div style={S.card}>
            {serverStats.map(([srv, count], i) => {
              const maxCount = serverStats[0][1] as number
              const pct = (count / (maxCount as number)) * 100
              const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6']
              return (
                <div key={srv} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#ccc', width: '120px', textAlign: 'right', flexShrink: 0 }}>{srv}</span>
                  <div style={{ flex: 1, height: '24px', background: '#1a1a2a', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}80)`,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '8px',
                      transition: 'width 0.5s ease',
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{count} farms</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* User Engagement Summary */}
      <div style={S.sectionTitle}>👥 User Engagement</div>
      <StatRow items={[
        { value: newUsersMonth, label: 'New Users (30d)', color: '#3b82f6' },
        { value: activeUsersWeek, label: 'Active (7d)', color: '#22c55e' },
        { value: trialUsers, label: 'Trial Users', color: '#f59e0b' },
        { value: users.filter((u: any) => u.banned).length, label: 'Banned', color: '#ef4444' },
      ]} />
    </div>
  )
}
