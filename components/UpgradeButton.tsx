'use client'

import { useState } from 'react'

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j?.error || 'Failed to start checkout')
      setLoading(false)
      return
    }

    const j = await res.json()
    const url = j?.url as string | undefined
    if (!url) {
      setError('Missing checkout url')
      setLoading(false)
      return
    }

    window.location.href = url
  }

  return (
    <div>
      <button onClick={onClick} disabled={loading}>
        {loading ? 'Redirecting…' : 'Upgrade to Pro'}
      </button>
      {error ? <p style={{ color: 'red', marginTop: 8 }}>{error}</p> : null}
    </div>
  )
}
