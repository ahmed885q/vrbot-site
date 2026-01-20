'use client'

import { useState } from 'react'

type Props = {
  userId: string
  email: string
}

export default function UpgradeButton({ userId, email }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId }),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j?.error || 'Failed to start checkout')
        setLoading(false)
        return
      }

      const url = j?.url as string | undefined
      if (!url) {
        setError('Missing checkout url')
        setLoading(false)
        return
      }

      window.location.href = url
    } catch (e: any) {
      setError(e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={onClick} disabled={loading}>
        {loading ? 'Loading...' : 'Upgrade to Pro'}
      </button>

      {error ? (
        <p style={{ color: 'crimson', marginTop: 8 }}>{error}</p>
      ) : null}
    </div>
  )
}
