'use client'

import { useEffect, useState } from 'react'

type Status = {
  mediamtxRunning: boolean
  farms: { id: string; windowTitle: string; running: boolean; hlsUrl: string }[]
}

export default function LocalStreamControls() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(false)

  async function refresh() {
    const r = await fetch('/api/local/stream/status')
    const j = await r.json()
    setStatus(j.status)
  }

  async function start() {
    setLoading(true)
    try {
      await fetch('/api/local/stream/start', { method: 'POST' })
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  async function stop() {
    setLoading(true)
    try {
      await fetch('/api/local/stream/stop', { method: 'POST' })
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ padding: 16, border: '1px solid #333', borderRadius: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={start} disabled={loading} style={{ padding: '8px 12px' }}>
          Start Streaming
        </button>
        <button onClick={stop} disabled={loading} style={{ padding: '8px 12px' }}>
          Stop Streaming
        </button>
        <span style={{ opacity: 0.8 }}>
          MediaMTX: {status?.mediamtxRunning ? 'Running' : 'Stopped'}
        </span>
      </div>

      <div style={{ marginTop: 12, opacity: 0.85 }}>
        {status?.farms?.map((f) => (
          <div key={f.id} style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <b style={{ width: 80 }}>{f.id}</b>
            <span style={{ width: 180 }}>{f.windowTitle}</span>
            <span style={{ width: 90 }}>{f.running ? 'LIVE' : 'OFF'}</span>
            <a href={`/farms/${f.id}/live`} style={{ textDecoration: 'underline' }}>
              Open Live
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
