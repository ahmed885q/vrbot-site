'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createSupabaseBrowserClient } from '../../../lib/supabase/client'
import Link from 'next/link'

const supabase = createSupabaseBrowserClient()

// WebSocket: use wss:// in production, ws:// in dev
const WS_HOST = process.env.NEXT_PUBLIC_HETZNER_IP || '88.99.64.19'
const WS_PORT = '8889'

type Farm = {
  farm_id: string
  nickname: string
  igg_email: string
  live_status: 'online' | 'idle' | 'offline'
  tasks_today: number
  success_rate: number
  adb_port: number
  status: string
}

/* ─── Farm Card ─── */
function FarmCard({
  farm, focused, onFocus, onAction,
}: {
  farm: Farm
  focused: boolean
  onFocus: () => void
  onAction: (id: string, a: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [fps, setFps] = useState(0)
  const [conn, setConn] = useState(false)
  const [tapFx, setTapFx] = useState<{ id: number; x: number; y: number }[]>([])
  const fpsCount = useRef(0)
  const tapId = useRef(0)
  const drag = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const wsUrl = typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? `wss://${window.location.host}/ws/stream/${farm.farm_id}`
      : `ws://${WS_HOST}:${WS_PORT}/stream/${farm.farm_id}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    const t = setInterval(() => {
      setFps(fpsCount.current)
      fpsCount.current = 0
    }, 1000)

    ws.onopen = () => setConn(true)
    ws.onclose = () => {
      setConn(false)
      clearInterval(t)
    }
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type !== 'frame') return
      fpsCount.current++
      const img = new Image()
      img.onload = () => {
        const cv = canvasRef.current
        if (cv) {
          const ctx = cv.getContext('2d')
          ctx?.drawImage(img, 0, 0, cv.width, cv.height)
        }
        URL.revokeObjectURL(img.src)
      }
      const b = atob(msg.data)
      const arr = new Uint8Array(b.length)
      for (let i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i)
      img.src = URL.createObjectURL(new Blob([arr], { type: 'image/jpeg' }))
    }
    return () => {
      ws.close()
      clearInterval(t)
    }
  }, [farm.farm_id])

  const tap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!focused) {
      onFocus()
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.round((e.clientX - r.left) * (1280 / r.width))
    const y = Math.round((e.clientY - r.top) * (720 / r.height))
    fetch('/api/farms/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farm_id: farm.farm_id, action: 'tap', x, y }),
    })
    const id = ++tapId.current
    const lx = e.clientX - r.left
    const ly = e.clientY - r.top
    setTapFx((p) => [...p, { id, x: lx, y: ly }])
    setTimeout(() => setTapFx((p) => p.filter((t) => t.id !== id)), 500)
  }

  const sc =
    farm.live_status === 'online'
      ? '#3fb950'
      : farm.live_status === 'idle'
        ? '#d29922'
        : '#f85149'

  return (
    <div
      style={{
        borderRadius: 10,
        border: `2px solid ${focused ? '#f0a500' : '#21262d'}`,
        overflow: 'hidden',
        background: '#161b22',
        cursor: focused ? 'crosshair' : 'pointer',
        boxShadow: focused ? '0 0 20px #f0a50025' : 'none',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '16/9' }}>
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onClick={tap}
          onMouseDown={(e) => {
            if (focused) drag.current = { x: e.clientX, y: e.clientY }
          }}
          onMouseUp={(e) => {
            if (!focused || !drag.current) return
            const r = e.currentTarget.getBoundingClientRect()
            const s = (v: number, max: number, d: number) => Math.round(v * (max / d))
            if (
              Math.abs(e.clientX - drag.current.x) > 15 ||
              Math.abs(e.clientY - drag.current.y) > 15
            ) {
              fetch('/api/farms/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  farm_id: farm.farm_id,
                  action: 'swipe',
                  x1: s(drag.current.x - r.left, 1280, r.width),
                  y1: s(drag.current.y - r.top, 720, r.height),
                  x2: s(e.clientX - r.left, 1280, r.width),
                  y2: s(e.clientY - r.top, 720, r.height),
                }),
              })
            }
            drag.current = null
          }}
        />

        {/* Offline overlay */}
        {!conn && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#0d1117ee',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>
              {farm.live_status === 'offline' ? '😴' : '📡'}
            </span>
            <span style={{ color: sc, fontSize: 12, fontFamily: 'monospace' }}>
              {farm.live_status === 'offline' ? 'المزرعة متوقفة' : 'جارٍ الاتصال...'}
            </span>
          </div>
        )}

        {/* Tap effects */}
        {tapFx.map((t) => (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              left: t.x - 14,
              top: t.y - 14,
              width: 28,
              height: 28,
              border: '2px solid #f0a500',
              borderRadius: '50%',
              pointerEvents: 'none',
              animation: 'ripple 0.5s ease-out forwards',
            }}
          />
        ))}

        {/* Header overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(180deg,#0d111799 0%,transparent 100%)',
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#e6edf3',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: sc,
                display: 'inline-block',
              }}
            />
            {farm.nickname || farm.farm_id}
          </span>
          <span style={{ color: '#8b949e', fontSize: 11, fontFamily: 'monospace' }}>
            {conn ? `${fps} FPS` : '—'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #21262d',
        }}
      >
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ fontSize: 12 }}>
            <span style={{ color: '#58a6ff' }}>⚡ {farm.tasks_today || 0}</span>
            <span style={{ color: '#8b949e' }}> اليوم</span>
          </span>
          <span style={{ fontSize: 12 }}>
            <span style={{ color: '#3fb950' }}>{farm.success_rate?.toFixed(0) || 100}%</span>
            <span style={{ color: '#8b949e' }}> نجاح</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {farm.live_status !== 'online' ? (
            <button
              onClick={() => onAction(farm.farm_id, 'start')}
              style={{
                background: '#3fb95018',
                border: '1px solid #3fb95050',
                color: '#3fb950',
                padding: '5px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'monospace',
              }}
            >
              ▶ تشغيل
            </button>
          ) : (
            <button
              onClick={() => onAction(farm.farm_id, 'stop')}
              style={{
                background: '#f8514918',
                border: '1px solid #f8514950',
                color: '#f85149',
                padding: '5px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'monospace',
              }}
            >
              ■ إيقاف
            </button>
          )}
          <button
            onClick={() => onAction(farm.farm_id, 'restart_game')}
            style={{
              background: '#d2992218',
              border: '1px solid #d2992250',
              color: '#d29922',
              padding: '5px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            ↻
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Live Page ─── */
export default function LivePage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoad] = useState(true)
  const [focused, setFoc] = useState<string | null>(null)
  const [cols, setCols] = useState(2)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/farms/list')
      const d = await res.json()
      setFarms(d.farms || [])
    } catch {}
    setLoad(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  async function action(farmId: string, act: string) {
    setMsg(
      `جارٍ ${act === 'start' ? 'تشغيل' : act === 'stop' ? 'إيقاف' : 'إعادة تشغيل'} المزرعة...`
    )
    try {
      await fetch(`/api/farms/${act === 'restart_game' ? 'control' : act}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          act === 'restart_game'
            ? { farm_id: farmId, action: 'key', key: 'KEYCODE_HOME' }
            : { farm_id: farmId }
        ),
      })
    } catch {}
    await load()
    setMsg('')
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: '#0d1117',
        color: '#e6edf3',
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
      }}
    >
      <style>{`
        @keyframes ripple{0%{transform:scale(.5);opacity:1}100%{transform:scale(2.5);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '14px 24px',
          background: '#161b22',
          borderBottom: '1px solid #21262d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <h1
            style={{
              color: '#f0a500',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2,
              margin: 0,
            }}
          >
            ⚔️ مزارعي — بث مباشر
          </h1>
          <p
            style={{
              color: '#8b949e',
              fontSize: 12,
              margin: '2px 0 0',
              fontFamily: 'monospace',
            }}
          >
            <span style={{ color: '#3fb950' }}>
              ● {farms.filter((f) => f.live_status === 'online').length}
            </span>{' '}
            شغّالة ·{' '}
            <span style={{ color: '#58a6ff' }}>
              ⚡ {farms.reduce((s, f) => s + (f.tasks_today || 0), 0)}
            </span>{' '}
            مهمة اليوم
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            href="/dashboard"
            style={{
              background: '#21262d',
              border: '1px solid #30363d',
              color: '#8b949e',
              padding: '6px 14px',
              borderRadius: 4,
              textDecoration: 'none',
              fontSize: 12,
            }}
          >
            ← لوحة التحكم
          </Link>
          <Link
            href="/dashboard/notifications"
            style={{
              background: '#21262d',
              border: '1px solid #30363d',
              color: '#8b949e',
              padding: '6px 14px',
              borderRadius: 4,
              textDecoration: 'none',
              fontSize: 12,
            }}
          >
            🔔 إشعارات
          </Link>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setCols(n)}
              style={{
                background: cols === n ? '#f0a500' : '#21262d',
                color: cols === n ? '#0d1117' : '#8b949e',
                border: '1px solid #30363d',
                padding: '5px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: cols === n ? 700 : 400,
              }}
            >
              {n === 1 ? '⊡' : n === 2 ? '⊞' : '⊟'}
            </button>
          ))}
          {focused && (
            <button
              onClick={() => setFoc(null)}
              style={{
                background: '#f0a50015',
                border: '1px solid #f0a50050',
                color: '#f0a500',
                padding: '5px 14px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              ✕ إلغاء التركيز
            </button>
          )}
        </div>
      </div>

      {/* Status message */}
      {msg && (
        <div
          style={{
            background: '#58a6ff15',
            borderBottom: '1px solid #58a6ff30',
            color: '#58a6ff',
            padding: '8px 24px',
            fontSize: 13,
            fontFamily: 'monospace',
          }}
        >
          ⟳ {msg}
        </div>
      )}

      {/* Grid */}
      <div style={{ padding: focused ? '20px 24px 90px' : '20px 24px' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60vh',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 40 }}>⚔️</div>
            <p style={{ color: '#8b949e', fontSize: 13, fontFamily: 'monospace' }}>
              جارٍ تحميل مزارعك...
            </p>
          </div>
        ) : farms.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60vh',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ fontSize: 52 }}>🏰</div>
            <h2 style={{ color: '#e6edf3', margin: 0 }}>لا توجد مزارع بعد</h2>
            <p style={{ color: '#8b949e', fontSize: 14 }}>
              أضف مزرعة من{' '}
              <Link href="/dashboard" style={{ color: '#58a6ff' }}>
                لوحة التحكم
              </Link>{' '}
              لتبدأ البث المباشر
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 16,
            }}
          >
            {farms.map((farm, i) => (
              <div key={farm.farm_id} style={{ animation: `fadeUp 0.3s ${i * 0.06}s both` }}>
                <FarmCard
                  farm={farm}
                  focused={focused === farm.farm_id}
                  onFocus={() => setFoc(farm.farm_id)}
                  onAction={action}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Control Bar (when focused) */}
      {focused && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#161b22ee',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid #f0a50030',
            padding: '10px 24px',
            display: 'flex',
            gap: 10,
            justifyContent: 'center',
            zIndex: 20,
          }}
        >
          <span
            style={{
              color: '#f0a500',
              fontSize: 12,
              fontFamily: 'monospace',
              alignSelf: 'center',
              marginLeft: 8,
            }}
          >
            🎮 {farms.find((f) => f.farm_id === focused)?.nickname || focused}
          </span>
          {[
            { l: '← رجوع', k: 'KEYCODE_BACK' },
            { l: '⌂ رئيسية', k: 'KEYCODE_HOME' },
            { l: '▲', k: 'KEYCODE_DPAD_UP' },
            { l: '▼', k: 'KEYCODE_DPAD_DOWN' },
          ].map((btn) => (
            <button
              key={btn.k}
              onClick={() =>
                fetch('/api/farms/control', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ farm_id: focused, action: 'key', key: btn.k }),
                })
              }
              style={{
                background: '#21262d',
                border: '1px solid #30363d',
                color: '#e6edf3',
                padding: '7px 18px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {btn.l}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}