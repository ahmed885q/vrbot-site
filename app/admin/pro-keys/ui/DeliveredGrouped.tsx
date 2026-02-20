'use client'

import { useEffect, useMemo, useState } from 'react'

export default function DeliveredGrouped({ batch }: { batch?: string }) {
  const [msg, setMsg] = useState('')
  const [groups, setGroups] = useState<{ delivered_to: string; count: number }[]>([])

  const batchValue = useMemo(() => (batch || '').trim(), [batch])

  useEffect(() => {
    if (!batchValue) {
      setGroups([])
      setMsg('')
      return
    }

    let alive = true
    setMsg('Loading groups...')

    fetch(`/api/admin/pro-keys/delivered-groups?batch=${encodeURIComponent(batchValue)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        if (!data?.ok) {
          setMsg(data?.error || 'Failed')
          setGroups([])
          return
        }
        setGroups(data.groups || [])
        setMsg('')
      })
      .catch((e) => {
        if (!alive) return
        setMsg(e?.message || 'Failed')
        setGroups([])
      })

    return () => { alive = false }
  }, [batchValue])

  if (!batchValue) {
    return <div style={{ fontSize: 12, opacity: 0.7 }}>Set <b>batch_tag</b> filter to enable “Export Delivered Grouped”.</div>
  }

  return (
    <div style={{ padding: 12, border: '1px solid rgba(0,0,0,.12)', borderRadius: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Export Delivered Grouped</div>

      {msg ? <div style={{ fontSize: 12, opacity: 0.8 }}>{msg}</div> : null}

      {groups.length === 0 && !msg ? (
        <div style={{ fontSize: 12, opacity: 0.8 }}>No delivered groups found for this batch.</div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
        {groups.map((g) => {
          const href =
            `/api/admin/pro-keys/export?status=delivered` +
            `&batch=${encodeURIComponent(batchValue)}` +
            `&to=${encodeURIComponent(g.delivered_to)}`

          return (
            <a
              key={g.delivered_to}
              href={href}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,.15)',
                textDecoration: 'none',
                background: 'white',
                fontSize: 12,
                fontWeight: 900,
                display: 'inline-flex',
                gap: 8,
                alignItems: 'center',
              }}
              title={`Export ${g.delivered_to}`}
            >
              <span>{g.delivered_to}</span>
              <span style={{ opacity: 0.7 }}>({g.count})</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
