'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Event = {
  id: string
  farm_name: string
  event_type: string
  message: string
  tasks?: string[]
  created_at: string
}

const EVENT_ICONS: Record<string, string> = {
  task_complete: '✅',
  task_failed:   '❌',
  farm_started:  '▶️',
  farm_stopped:  '⏹️',
  error:         '⚠️',
  offline:       '🔴',
  crash:         '💥',
  recovery:      '🟢',
}

const EVENT_COLORS: Record<string, string> = {
  task_complete: '#3fb950',
  task_failed:   '#f85149',
  farm_started:  '#58a6ff',
  farm_stopped:  '#8b949e',
  error:         '#f0a500',
  offline:       '#f85149',
  crash:         '#f85149',
  recovery:      '#3fb950',
}

export default function NotificationsPage() {
  const [events, setEvents]   = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/farms/events?limit=50')
      const d   = await res.json()
      setEvents(d.events || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const filtered = filter === 'all'
    ? events
    : events.filter(e => e.event_type === filter)

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', background: '#161b22', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#f0a500', fontSize: 18, fontWeight: 700, margin: 0 }}>🔔 الإشعارات</h1>
          <p style={{ color: '#8b949e', fontSize: 12, margin: '2px 0 0' }}>{events.length} حدث</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all','task_complete','task_failed','error'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', background: filter === f ? '#f0a500' : '#21262d', color: filter === f ? '#0d1117' : '#8b949e', border: '1px solid #30363d', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              {f === 'all' ? 'الكل' : f === 'task_complete' ? '✅ نجح' : f === 'task_failed' ? '❌ فشل' : '⚠️ أخطاء'}
            </button>
          ))}
          <Link href="/dashboard" style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 12 }}>← رجوع</Link>
        </div>
      </div>

      {/* Events */}
      <div style={{ maxWidth: 800, margin: '24px auto', padding: '0 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8b949e' }}>⏳ جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8b949e' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <p>لا توجد إشعارات بعد</p>
          </div>
        ) : filtered.map(ev => (
          <div key={ev.id} style={{ background: '#161b22', border: `1px solid ${EVENT_COLORS[ev.event_type] || '#21262d'}20`, borderRadius: 10, padding: '14px 18px', marginBottom: 10, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, marginTop: 2 }}>{EVENT_ICONS[ev.event_type] || '📌'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: EVENT_COLORS[ev.event_type] || '#e6edf3' }}>{ev.farm_name}</span>
                <span style={{ fontSize: 11, color: '#8b949e' }}>{new Date(ev.created_at).toLocaleString('ar-SA')}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#e6edf3' }}>{ev.message}</p>
              {ev.tasks && ev.tasks.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ev.tasks.map(t => (
                    <span key={t} style={{ fontSize: 11, padding: '2px 8px', background: '#21262d', borderRadius: 4, color: '#8b949e' }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
