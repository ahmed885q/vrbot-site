'use client'

import { useState } from 'react'

export default function ManageBillingButton({
  userId,
}: {
  userId: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openPortal = async () => {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    const j = await res.json().catch(() => ({}))

    if (!res.ok || !j?.url) {
      setError(j?.error || 'Unable to open billing portal')
      setLoading(false)
      return
    }

    window.location.href = j.url
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={openPortal} disabled={loading}>
        {loading ? 'Opening…' : 'Manage Billing'}
      </button>

      {error ? (
        <p style={{ marginTop: 8, color: 'red' }}>{error}</p>
      ) : null}
    </div>
  )
}
