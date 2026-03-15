'use client'
import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '../../../lib/supabase/client'
import Link from 'next/link'

const supabase = createSupabaseBrowserClient()

type NotifPrefs = {
  web_push: boolean
  email_alerts: boolean
  telegram_chat_id: string
  alert_on_offline: boolean
  alert_on_crash: boolean
  alert_on_recovery: boolean
}

type Alert = {
  id: string
  farm_id: string
  alert_type: string
  message: string
  created_at: string
}

const DEFAULT_PREFS: NotifPrefs = {
  web_push: false,
  email_alerts: true,
  telegram_chat_id: '',
  alert_on_offline: true,
  alert_on_crash: true,
  alert_on_recovery: true,
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [pushSupported, setPushSupported] = useState(false)

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load prefs
    const { data: prefsData } = await supabase
      .from('notification_prefs')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (prefsData) {
      setPrefs({
        web_push: prefsData.web_push ?? false,
        email_alerts: prefsData.email_alerts ?? true,
        telegram_chat_id: prefsData.telegram_chat_id ?? '',
        alert_on_offline: prefsData.alert_on_offline ?? true,
        alert_on_crash: prefsData.alert_on_crash ?? true,
        alert_on_recovery: prefsData.alert_on_recovery ?? true,
      })
    }

    // Load alerts (last 50)
    const { data: alertsData } = await supabase
      .from('farm_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (alertsData) setAlerts(alertsData)

    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function savePrefs() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('notification_prefs')
      .upsert({
        user_id: user.id,
        ...prefs,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) {
      setMsg('❌ خطأ في الحفظ: ' + error.message)
    } else {
      setMsg('✅ تم حفظ الإعدادات')
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function enablePush() {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.subscribe({
        userPushService: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      } as any)

      // Save subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      setPrefs((p) => ({ ...p, web_push: true }))
      setMsg('✅ تم تفعيل الإشعارات')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setMsg('❌ فشل تفعيل الإشعارات — تأكد من السماح في المتصفح')
      setTimeout(() => setMsg(''), 5000)
    }
  }

  function alertIcon(type: string) {
    switch (type) {
      case 'offline': return '🔴'
      case 'crash': return '💥'
      case 'recovery': return '🟢'
      case 'task_complete': return '✅'
      default: return '🔔'
    }
  }

  function alertColor(type: string) {
    switch (type) {
      case 'offline': return '#f85149'
      case 'crash': return '#f85149'
      case 'recovery': return '#3fb950'
      case 'task_complete': return '#58a6ff'
      default: return '#8b949e'
    }
  }

  if (loading) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔔</div>
        <p style={{ color: '#8b949e', fontFamily: 'monospace', fontSize: 13 }}>جارٍ التحميل...</p>
      </div>
    )
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3',
      fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', background: '#161b22', borderBottom: '1px solid #21262d',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 style={{ color: '#f0a500', fontSize: 18, fontWeight: 700, letterSpacing: 2, margin: 0 }}>
          🔔 الإشعارات والتنبيهات
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard" style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e',
            padding: '6px 14px', borderRadius: 4, textDecoration: 'none', fontSize: 12 }}>
            ← لوحة التحكم
          </Link>
          <Link href="/dashboard/live" style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e',
            padding: '6px 14px', borderRadius: 4, textDecoration: 'none', fontSize: 12 }}>
            📺 بث مباشر
          </Link>
        </div>
      </div>

      {/* Status msg */}
      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#3fb95015' : '#f8514915',
          borderBottom: `1px solid ${msg.startsWith('✅') ? '#3fb95030' : '#f8514930'}`,
          color: msg.startsWith('✅') ? '#3fb950' : '#f85149',
          padding: '8px 24px', fontSize: 13, fontFamily: 'monospace' }}>
          {msg}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
        {/* Settings */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: 24, marginBottom: 24 }}>
          <h2 style={{ color: '#e6edf3', fontSize: 16, margin: '0 0 16px', fontWeight: 600 }}>⚙️ إعدادات التنبيهات</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Web Push */}
            <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>🌐 إشعارات المتصفح</span>
                {pushSupported ? (
                  prefs.web_push ? (
                    <span style={{ color: '#3fb950', fontSize: 12, fontFamily: 'monospace' }}>● مفعّلة</span>
                  ) : (
                    <button onClick={enablePush} style={{ background: '#3fb95018', border: '1px solid #3fb95050',
                      color: '#3fb950', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                      تفعيل
                    </button>
                  )
                ) : (
                  <span style={{ color: '#8b949e', fontSize: 11 }}>غير مدعوم</span>
                )}
              </div>
            </div>

            {/* Email */}
            <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13 }}>📧 تنبيهات البريد</span>
                <label style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={prefs.email_alerts}
                    onChange={(e) => setPrefs((p) => ({ ...p, email_alerts: e.target.checked }))}
                    style={{ accentColor: '#f0a500', width: 18, height: 18 }} />
                </label>
              </div>
            </div>

            {/* Telegram */}
            <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: 16, gridColumn: '1/3' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>📱 تلقرام Chat ID</span>
                <input
                  type="text" value={prefs.telegram_chat_id} placeholder="123456789"
                  onChange={(e) => setPrefs((p) => ({ ...p, telegram_chat_id: e.target.value }))}
                  style={{ flex: 1, background: '#161b22', border: '1px solid #30363d', borderRadius: 4,
                    padding: '6px 12px', color: '#e6edf3', fontSize: 13, fontFamily: 'monospace', direction: 'ltr' }}
                />
              </div>
            </div>
          </div>

          {/* Alert types */}
          <h3 style={{ color: '#8b949e', fontSize: 13, margin: '20px 0 12px', fontWeight: 500 }}>أنواع التنبيهات:</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { key: 'alert_on_offline' as const, label: '🔴 المزرعة متوقفة', desc: 'تنبيه عند انقطاع المزرعة' },
              { key: 'alert_on_crash' as const, label: '💥 كراش اللعبة', desc: 'تنبيه عند تعطل اللعبة' },
              { key: 'alert_on_recovery' as const, label: '🟢 عودة المزرعة', desc: 'تنبيه عند عودة المزرعة للعمل' },
            ].map((item) => (
              <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8,
                background: prefs[item.key] ? '#f0a50010' : '#0d1117',
                border: `1px solid ${prefs[item.key] ? '#f0a50030' : '#21262d'}`,
                borderRadius: 8, padding: '10px 16px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="checkbox" checked={prefs[item.key]}
                  onChange={(e) => setPrefs((p) => ({ ...p, [item.key]: e.target.checked }))}
                  style={{ accentColor: '#f0a500', width: 16, height: 16 }} />
                <div>
                  <div style={{ fontSize: 13 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#8b949e' }}>{item.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <button onClick={savePrefs} disabled={saving}
            style={{ marginTop: 20, background: 'linear-gradient(135deg, #f0a500, #e05c2a)', color: '#0d1117',
              border: 'none', padding: '10px 28px', borderRadius: 6, cursor: saving ? 'wait' : 'pointer',
              fontSize: 14, fontWeight: 700, letterSpacing: 1, opacity: saving ? 0.7 : 1 }}>
            {saving ? '⟳ جارٍ الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
        </div>

        {/* Alert History */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: 24 }}>
          <h2 style={{ color: '#e6edf3', fontSize: 16, margin: '0 0 16px', fontWeight: 600 }}>📋 سجل التنبيهات</h2>

          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔕</div>
              <p style={{ color: '#8b949e', fontSize: 13 }}>لا توجد تنبيهات حتى الآن</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map((alert) => (
                <div key={alert.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12,
                    background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: '10px 14px' }}>
                  <span style={{ fontSize: 18 }}>{alertIcon(alert.alert_type)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: alertColor(alert.alert_type), fontWeight: 600 }}>
                        مزرعة {alert.farm_id}
                      </span>
                      {' — '}
                      {alert.message}
                    </div>
                  </div>
                  <span style={{ color: '#484f58', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {new Date(alert.created_at).toLocaleString('ar-SA', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}