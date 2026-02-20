'use client'
import { useState } from 'react'

export function RevokeButton({ code, isUsed }: { code: string; isUsed: boolean }) {
  const [msg, setMsg] = useState('')

  async function revoke() {
    const warn = isUsed
      ? `هذا المفتاح مستخدم وسيتم خفض المستخدم إلى Trial (إذا كان Pro من هذا المفتاح).\n\nRevoke?\n${code}`
      : `Revoke?\n${code}`

    if (!confirm(warn)) return

    setMsg('...')
    const res = await fetch('/api/admin/pro-keys/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.ok) return setMsg(data?.error || 'Failed')

    setMsg('✅ Revoked')
    setTimeout(() => location.reload(), 600)
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button onClick={revoke} style={smallBtn}>Revoke</button>
      <span style={{ fontSize: 11, opacity: 0.75 }}>{msg}</span>
    </div>
  )
}

export function UnrevokeButton({ code, isUsed }: { code: string; isUsed: boolean }) {
  const [msg, setMsg] = useState('')

  async function unrevoke() {
    const warn = isUsed
      ? `Undo Revoke?\n\n${code}\n\nملاحظة: لن نعيد Pro تلقائياً.`
      : `Undo Revoke?\n\n${code}`

    if (!confirm(warn)) return

    setMsg('...')
    const res = await fetch('/api/admin/pro-keys/unrevoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.ok) return setMsg(data?.error || 'Failed')

    setMsg('✅ Restored')
    setTimeout(() => location.reload(), 600)
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button onClick={unrevoke} style={smallBtn}>Undo</button>
      <span style={{ fontSize: 11, opacity: 0.75 }}>{msg}</span>
    </div>
  )
}

const smallBtn: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,.15)',
  background: 'white',
  fontWeight: 900,
}
