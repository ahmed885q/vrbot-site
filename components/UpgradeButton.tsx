'use client'

import { useState } from 'react'

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onClick = async () => {
    setLoading(true)
    setErr(null)

    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data?.error || 'Failed to create checkout session')
      if (!data?.url) throw new Error('No checkout URL returned')

      window.location.href = data.url
    } catch (e: any) {
      setErr(e.message || 'Error')
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={onClick} disabled={loading}>
        {loading ? 'Redirecting…' : 'Upgrade to Pro'}
      </button>
      {err ? <p style={{ marginTop: 8, color: 'red' }}>{err}</p> : null}
    </div>
  )
}
