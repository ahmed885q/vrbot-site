'use client'

export default function BillingPage() {
  async function upgrade() {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
    })

    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Failed to start checkout')
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Upgrade to Pro 🚀</h1>
      <p>Unlock full bot features</p>

      <button
        onClick={upgrade}
        style={{
          padding: '12px 24px',
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        Upgrade to Pro
      </button>
    </div>
  )
}
