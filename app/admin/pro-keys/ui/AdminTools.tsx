'use client'

import { useState } from 'react'

export default function AdminTools({ batch, status }: { batch?: string; status?: string }) {
  const [count, setCount] = useState(200)
  const [batchTag, setBatchTag] = useState(batch || '')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')

  async function generate() {
    setMsg('Generating...')
    const res = await fetch('/api/admin/pro-keys/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, batchTag: batchTag.trim() || null, note: note.trim() || null }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.ok) return setMsg(data?.error || 'Failed')
    setMsg(`✅ Generated ${data.generated}`)
    setTimeout(() => location.reload(), 600)
  }

  async function copyUnused(excludeDelivered = true) {
    setMsg('Loading...')
    const params = new URLSearchParams()
    if ((batch || '').trim()) params.set('batch', (batch || '').trim())
    params.set('excludeDelivered', excludeDelivered ? '1' : '0')

    const res = await fetch(`/api/admin/pro-keys/copy-unused?${params.toString()}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.ok) return setMsg(data?.error || 'Failed')
    if (!data.keys?.length) return setMsg('No unused keys')

    await navigator.clipboard.writeText(data.keys.join('\n'))
    setMsg(`✅ Copied ${data.count}`)
  }

  async function copyAndDeliver() {
    const b = (batch || '').trim()
    if (!b) return setMsg('❗ set batch_tag filter first')

    const deliveredTo = prompt('Delivered To (client/company):')?.trim() || ''
    if (!deliveredTo) return setMsg('Cancelled')

    const deliveredNote = prompt('Delivered Note (optional):')?.trim() || ''
    const limitStr = prompt('How many keys to deliver (limit)?', '200') || '200'
    const limit = Math.min(Math.max(Number(limitStr) || 200, 1), 5000)

    if (!confirm(`Copy + Deliver?\nBatch: ${b}\nTo: ${deliveredTo}\nLimit: ${limit}`)) return

    setMsg('Processing...')
    const res = await fetch('/api/admin/pro-keys/copy-and-deliver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: b, deliveredTo, deliveredNote: deliveredNote || null, limit }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.ok) return setMsg(data?.error || 'Failed')
    if (!data.keys?.length) return setMsg('No keys to deliver')

    await navigator.clipboard.writeText(data.keys.join('\n'))
    setMsg(`✅ Copied & delivered ${data.count}`)
    setTimeout(() => location.reload(), 800)
  }

  const exportHref = `/api/admin/pro-keys/export?status=${encodeURIComponent(status || 'all')}&batch=${encodeURIComponent((batch || '').trim())}`

  const exportDeliveredBatchHref = (batch || '').trim()
    ? `/api/admin/pro-keys/export?status=delivered&batch=${encodeURIComponent((batch || '').trim())}`
    : '#'

  return (
    <div style={{ padding: 12, border: '1px solid rgba(0,0,0,.12)', borderRadius: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Admin Tools</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="number"
          min={1}
          max={1000}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          style={{ width: 110, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,.15)' }}
        />
        <input
          value={batchTag}
          onChange={(e) => setBatchTag(e.target.value)}
          placeholder="batch_tag (Sale-Feb-2026)"
          style={{ width: 220, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,.15)' }}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="note (optional)"
          style={{ width: 260, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,.15)' }}
        />
        <button onClick={generate} style={btnStyle}>Generate</button>

        <button onClick={() => copyUnused(true)} style={btnStyle}>Copy Unused</button>
        <button onClick={copyAndDeliver} style={btnStyle}>Copy + Deliver</button>

        <a href={exportHref} style={{ ...btnStyle, textDecoration: 'none', display: 'inline-block' }}>Export CSV</a>

        <a
          href={exportDeliveredBatchHref}
          onClick={(e) => { if (!((batch || '').trim())) e.preventDefault() }}
          style={{
            ...btnStyle,
            textDecoration: 'none',
            display: 'inline-block',
            opacity: (batch || '').trim() ? 1 : 0.45,
            pointerEvents: (batch || '').trim() ? 'auto' : 'none',
          }}
          title={(batch || '').trim() ? 'Export delivered keys for this batch' : 'Set batch_tag filter first'}
        >
          Export Delivered Batch CSV
        </a>

        <span style={{ fontSize: 12, opacity: 0.8, marginLeft: 6 }}>{msg}</span>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,.15)',
  background: 'white',
  fontWeight: 900,
}
