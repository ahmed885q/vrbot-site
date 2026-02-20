'use client'

import { useEffect, useMemo, useState } from 'react'

type Props = {
  userEmail: string
  plan: string
  status: string
  periodEndISO: string | null
  allowed: boolean
}

type BotStatus = {
  running: boolean
}

type BotLog = {
  ts: string
  level: 'info' | 'warn' | 'error'
  msg: string
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function BotPanel({ userEmail, plan, status, periodEndISO, allowed }: Props) {
  const [botStatus, setBotStatus] = useState<BotStatus>({ running: false })
  const [logs, setLogs] = useState<BotLog[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const planBadge = useMemo(() => {
    const map: Record<string, { bg: string; fg: string; icon: string; label: string }> = {
      pro: { bg: '#dcfce7', fg: '#166534', icon: '⚡', label: 'PRO' },
      trial: { bg: '#e0f2fe', fg: '#075985', icon: '⏳', label: 'TRIAL' },
      free: { bg: '#e5e7eb', fg: '#374151', icon: '•', label: 'FREE' },
    }
    return map[plan] ?? { bg: '#e5e7eb', fg: '#374151', icon: '•', label: String(plan).toUpperCase() }
  }, [plan])

  const statusBadge = useMemo(() => {
    const map: Record<string, { bg: string; fg: string; icon: string; label: string }> = {
      active: { bg: '#dcfce7', fg: '#166534', icon: '✅', label: 'ACTIVE' },
      expired: { bg: '#fee2e2', fg: '#991b1b', icon: '⛔', label: 'EXPIRED' },
      canceled: { bg: '#fee2e2', fg: '#991b1b', icon: '✖', label: 'CANCELED' },
      '-': { bg: '#e5e7eb', fg: '#374151', icon: '•', label: 'NONE' },
    }
    return map[status] ?? { bg: '#e5e7eb', fg: '#374151', icon: '•', label: String(status).toUpperCase() }
  }, [status])

  async function fetchStatus() {
    const r = await fetch('/api/bot/status', { cache: 'no-store' })
    if (!r.ok) throw new Error('Failed to load bot status')
    const j = await r.json()
    setBotStatus({ running: !!j.running })
  }

  async function fetchLogs() {
    const r = await fetch('/api/bot/logs', { cache: 'no-store' })
    if (!r.ok) throw new Error('Failed to load logs')
    const j = await r.json()
    setLogs(Array.isArray(j.logs) ? j.logs : [])
  }

  async function startBot() {
    const r = await fetch('/api/bot/start', { method: 'POST' })
    if (!r.ok) throw new Error('Failed to start bot')
  }

  async function stopBot() {
    const r = await fetch('/api/bot/stop', { method: 'POST' })
    if (!r.ok) throw new Error('Failed to stop bot')
  }

  async function refreshAll() {
    setErr(null)
    try {
      await Promise.all([fetchStatus(), fetchLogs()])
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong')
    }
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  }

  const card: React.CSSProperties = {
    marginTop: 14,
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 16,
    background: '#fff',
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
  }

  const btn: React.CSSProperties = {
    border: '1px solid #d1d5db',
    borderRadius: 12,
    padding: '10px 12px',
    fontWeight: 800,
    cursor: 'pointer',
    background: '#fff',
  }

  const btnPrimary: React.CSSProperties = {
    ...btn,
    border: '1px solid #111827',
    background: '#111827',
    color: '#fff',
  }

  return (
    <div style={card}>
      {/* Header badges */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ ...badgeBase, background: planBadge.bg, color: planBadge.fg }}>
          <span aria-hidden="true">{planBadge.icon}</span> {planBadge.label}
        </span>

        <span style={{ ...badgeBase, background: statusBadge.bg, color: statusBadge.fg }}>
          <span aria-hidden="true">{statusBadge.icon}</span> {statusBadge.label}
        </span>

        <span style={{ ...badgeBase, background: '#f3f4f6', color: '#111827' }}>
          <span aria-hidden="true">📅</span> Until: {formatDate(periodEndISO)}
        </span>

        <span style={{ ...badgeBase, background: '#f3f4f6', color: '#111827' }}>
          <span aria-hidden="true">📧</span> {userEmail || '-'}
        </span>
      </div>

      {/* Gate */}
      {!allowed ? (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: '#fff7ed', border: '1px solid #fed7aa' }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Access Locked</div>
          <div style={{ color: '#7c2d12' }}>
            Your trial ended. Payment will be enabled later via PayPal after launch.
          </div>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <button
              style={botStatus.running ? btn : btnPrimary}
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setErr(null)
                try {
                  await startBot()
                  await refreshAll()
                } catch (e: any) {
                  setErr(e?.message ?? 'Failed')
                } finally {
                  setBusy(false)
                }
              }}
            >
              ▶ Start Bot
            </button>

            <button
              style={!botStatus.running ? btn : btnPrimary}
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setErr(null)
                try {
                  await stopBot()
                  await refreshAll()
                } catch (e: any) {
                  setErr(e?.message ?? 'Failed')
                } finally {
                  setBusy(false)
                }
              }}
            >
              ⏹ Stop Bot
            </button>

            <button
              style={btn}
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                await refreshAll()
                setBusy(false)
              }}
            >
              ↻ Refresh
            </button>

            <span style={{ marginLeft: 6, fontWeight: 800 }}>
              Status: {botStatus.running ? 'RUNNING ✅' : 'STOPPED ⏸'}
            </span>
          </div>

          {/* Error */}
          {err && (
            <div style={{ marginTop: 12, color: '#991b1b', fontWeight: 700 }}>
              {err}
            </div>
          )}

          {/* Logs */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Logs</div>
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 14,
                padding: 12,
                background: '#0b1220',
                color: '#e5e7eb',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 12,
                maxHeight: 320,
                overflow: 'auto',
              }}
            >
              {logs.length === 0 ? (
                <div style={{ color: '#9ca3af' }}>No logs yet — start the bot to generate logs.</div>
              ) : (
                logs
                  .slice()
                  .reverse()
                  .map((l, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#93c5fd' }}>[{l.ts}]</span>{' '}
                      <span style={{ color: l.level === 'error' ? '#fca5a5' : l.level === 'warn' ? '#fde68a' : '#86efac' }}>
                        {l.level.toUpperCase()}
                      </span>{' '}
                      {l.msg}
                    </div>
                  ))
              )}
            </div>
          </div>

          <div style={{ marginTop: 10, color: '#6b7280', fontSize: 13 }}>
            Tip: إذا شفت “No logs yet”، اضغط <b>Start Bot</b> ثم <b>Refresh</b>.
          </div>
        </>
      )}
    </div>
  )
}
