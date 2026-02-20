'use client'

import { useState, useEffect } from 'react'

type Sub = {
  id: string
  user_id: string
  email: string
  plan: string
  status: string
  current_period_end: string
  stripe_customer_id: string
  updated_at: string
}

type Lang = 'ar' | 'en' | 'ru' | 'zh'

const tr: Record<Lang, Record<string, string>> = {
  ar: {
    title: '⚡ إدارة الاشتراكات',
    subtitle: 'تفعيل وإيقاف المستخدمين يدوياً',
    email: 'البريد الإلكتروني',
    plan: 'الخطة',
    days: 'عدد الأيام',
    activate: '✅ تفعيل',
    deactivate: '❌ إيقاف',
    extend: '📅 تمديد',
    refresh: '🔄 تحديث',
    status: 'الحالة',
    expires: 'ينتهي في',
    source: 'المصدر',
    actions: 'الإجراءات',
    noSubs: 'لا يوجد اشتراكات',
    activateNew: '➕ تفعيل مستخدم جديد',
    manual: 'يدوي',
    stripe: 'Stripe',
    active: 'نشط',
    canceled: 'ملغي',
    expired: 'منتهي',
    loading: 'جاري التحميل...',
    success: 'تم بنجاح!',
  },
  en: {
    title: '⚡ Subscription Management',
    subtitle: 'Manually activate and deactivate users',
    email: 'Email',
    plan: 'Plan',
    days: 'Days',
    activate: '✅ Activate',
    deactivate: '❌ Deactivate',
    extend: '📅 Extend',
    refresh: '🔄 Refresh',
    status: 'Status',
    expires: 'Expires',
    source: 'Source',
    actions: 'Actions',
    noSubs: 'No subscriptions',
    activateNew: '➕ Activate New User',
    manual: 'Manual',
    stripe: 'Stripe',
    active: 'Active',
    canceled: 'Canceled',
    expired: 'Expired',
    loading: 'Loading...',
    success: 'Success!',
  },
  ru: {
    title: '⚡ Управление подписками',
    subtitle: 'Активация и деактивация пользователей',
    email: 'Email',
    plan: 'План',
    days: 'Дней',
    activate: '✅ Активировать',
    deactivate: '❌ Деактивировать',
    extend: '📅 Продлить',
    refresh: '🔄 Обновить',
    status: 'Статус',
    expires: 'Истекает',
    source: 'Источник',
    actions: 'Действия',
    noSubs: 'Нет подписок',
    activateNew: '➕ Активировать нового',
    manual: 'Вручную',
    stripe: 'Stripe',
    active: 'Активен',
    canceled: 'Отменён',
    expired: 'Истёк',
    loading: 'Загрузка...',
    success: 'Успешно!',
  },
  zh: {
    title: '⚡ 订阅管理',
    subtitle: '手动激活和停用用户',
    email: '邮箱',
    plan: '方案',
    days: '天数',
    activate: '✅ 激活',
    deactivate: '❌ 停用',
    extend: '📅 延期',
    refresh: '🔄 刷新',
    status: '状态',
    expires: '到期',
    source: '来源',
    actions: '操作',
    noSubs: '没有订阅',
    activateNew: '➕ 激活新用户',
    manual: '手动',
    stripe: 'Stripe',
    active: '活跃',
    canceled: '已取消',
    expired: '已过期',
    loading: '加载中...',
    success: '成功！',
  },
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [lang, setLang] = useState<Lang>('ar')

  // New activation form
  const [newEmail, setNewEmail] = useState('')
  const [newPlan, setNewPlan] = useState('pro')
  const [newDays, setNewDays] = useState('30')
  const [showForm, setShowForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const tx = tr[lang]

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vrbot_lang') as Lang
      if (saved && tr[saved]) setLang(saved)
    } catch {}
    fetchSubs()
  }, [])

  async function fetchSubs() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/subscriptions')
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSubs(data.subscriptions || [])
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function doAction(action: string, email: string, days?: number) {
    setActionLoading(true)
    setMsg('')
    setError('')
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email, plan: newPlan, days: days || parseInt(newDays) || 30 }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setMsg(data.message || tx.success)
        setNewEmail('')
        setShowForm(false)
        await fetchSubs()
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr) < new Date()
  }

  function getStatusBadge(sub: Sub) {
    if (sub.status === 'active' && !isExpired(sub.current_period_end)) {
      return { label: tx.active, bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
    }
    if (sub.status === 'canceled') {
      return { label: tx.canceled, bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
    }
    return { label: tx.expired, bg: '#fffbeb', color: '#d97706', border: '#fde68a' }
  }

  function getSource(sub: Sub) {
    if (sub.stripe_customer_id === 'admin_manual') return tx.manual
    if (sub.stripe_customer_id?.startsWith('cus_')) return tx.stripe
    return sub.stripe_customer_id || '—'
  }

  const isRtl = lang === 'ar'

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>{tx.title}</h1>
        <p style={{ color: '#666', margin: '4px 0 0', fontSize: '14px' }}>{tx.subtitle}</p>
      </div>

      {/* Messages */}
      {msg && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', marginBottom: '16px', color: '#047857', fontWeight: 600 }}>
          {msg}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', marginBottom: '16px', color: '#dc2626', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Actions Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={fetchSubs} style={btnOutline}>{tx.refresh}</button>
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>{tx.activateNew}</button>
      </div>

      {/* Activate New User Form */}
      {showForm && (
        <div style={{
          background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '14px',
          padding: '20px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>{tx.email}</label>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{tx.plan}</label>
              <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} style={inputStyle}>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
                <option value="trial">Trial</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{tx.days}</label>
              <input
                value={newDays}
                onChange={(e) => setNewDays(e.target.value)}
                type="number"
                min="1"
                max="365"
                style={{ ...inputStyle, width: '80px' }}
              />
            </div>
            <button
              onClick={() => doAction('activate', newEmail)}
              disabled={!newEmail || actionLoading}
              style={{ ...btnSuccess, opacity: (!newEmail || actionLoading) ? 0.5 : 1 }}
            >
              {actionLoading ? '...' : tx.activate}
            </button>
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>{tx.loading}</div>
      ) : subs.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#999', border: '2px dashed #e5e7eb', borderRadius: '14px' }}>
          {tx.noSubs}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>{tx.email}</th>
                <th style={thStyle}>{tx.plan}</th>
                <th style={thStyle}>{tx.status}</th>
                <th style={thStyle}>{tx.expires}</th>
                <th style={thStyle}>{tx.source}</th>
                <th style={thStyle}>{tx.actions}</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => {
                const badge = getStatusBadge(sub)
                return (
                  <tr key={sub.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{sub.email}</div>
                      <div style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>{sub.user_id.slice(0, 8)}...</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                        background: '#f0f7ff', border: '1px solid #d6e4ff', color: '#1d4ed8',
                      }}>
                        {sub.plan?.toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                        background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '13px' }}>
                        {new Date(sub.current_period_end).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {new Date(sub.current_period_end).toLocaleTimeString()}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        background: getSource(sub) === tx.manual ? '#fef3c7' : '#f0fdf4',
                        color: getSource(sub) === tx.manual ? '#92400e' : '#166534',
                      }}>
                        {getSource(sub)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {sub.status === 'active' ? (
                          <button
                            onClick={() => doAction('deactivate', sub.email)}
                            disabled={actionLoading}
                            style={btnDangerSm}
                          >
                            {tx.deactivate}
                          </button>
                        ) : (
                          <button
                            onClick={() => doAction('activate', sub.email, 30)}
                            disabled={actionLoading}
                            style={btnSuccessSm}
                          >
                            {tx.activate}
                          </button>
                        )}
                        <button
                          onClick={() => doAction('extend', sub.email, 30)}
                          disabled={actionLoading}
                          style={btnOutlineSm}
                        >
                          +30d
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = {
  padding: '12px 14px', fontSize: '13px', verticalAlign: 'middle',
}
const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px',
}
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none',
}
const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none',
  padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
}
const btnSuccess: React.CSSProperties = {
  background: '#10b981', color: '#fff', border: 'none',
  padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
}
const btnOutline: React.CSSProperties = {
  background: '#fff', color: '#374151', border: '1px solid #d1d5db',
  padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
}
const btnDangerSm: React.CSSProperties = {
  background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
  padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
}
const btnSuccessSm: React.CSSProperties = {
  background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
  padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
}
const btnOutlineSm: React.CSSProperties = {
  background: '#fff', color: '#374151', border: '1px solid #d1d5db',
  padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
}
