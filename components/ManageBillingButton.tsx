'use client'

import { useState } from 'react'

type Props = {
  userId: string
}

export default function ManageBillingButton({ userId }: Props) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const openPortal = async () => {
    setLoading(true)
    setErr(null)

    try {
      const res = await fetch('/billing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to create portal session')

      if (!data?.url) throw new Error('No portal url returned')

      window.location.href = data.url
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPortal}
        disabled={loading}
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          background: '#fff',
          fontWeight: 900,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Openingâ€¦' : 'Manage Billing'}
      </button>

      {err ? <p style={{ marginTop: 10, color: 'red' }}>{err}</p> : null}
    </div>
  )
}
