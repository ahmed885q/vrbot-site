'use client'

import { useState } from 'react'

export default function ActivationTokenBox() {
  const [token, setToken] = useState('')
  const [proKey, setProKey] = useState('')
  const [msg, setMsg] = useState('')

  async function issue() {
    setMsg('Generating...')
    const res = await fetch('/api/license/issue', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.ok) return setMsg(data?.error || 'Failed')
    setToken(data.token)
    setMsg('✅ Token generated')
  }

  async function copy() {
    await navigator.clipboard.writeText(token)
    setMsg('✅ Copied')
  }

  async function redeem() {
    setMsg('Redeeming...')
    const res = await fetch('/api/license/redeem-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: proKey }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.ok) return setMsg(data?.error || 'Failed')
    setMsg('✅ Upgraded to PRO')
  }

  return (
    <div style={{ marginTop: 16, padding: 14, border: '1px solid rgba(0,0,0,.12)', borderRadius: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Desktop Activation</div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={issue} style={{ padding: '10px 14px', borderRadius: 10 }}>Generate Token</button>
        <button onClick={copy} disabled={!token} style={{ padding: '10px 14px', borderRadius: 10 }}>Copy</button>
      </div>

      <textarea value={token} readOnly style={{ width: '100%', marginTop: 10, height: 120 }} />

      <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          value={proKey}
          onChange={(e) => setProKey(e.target.value)}
          placeholder="Enter Pro Key"
          style={{ flex: 2, minWidth: 260, padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,.15)' }}
        />
        <button onClick={redeem} style={{ padding: '10px 14px', borderRadius: 10 }}>Redeem</button>
      </div>

      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>{msg}</div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
        Trial: 7 days, 1 device, max 2 farms. Pro: unlimited farms on the same device.
      </div>
    </div>
  )
}
