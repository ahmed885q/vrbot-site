'use client'

export default function BillingPage() {
  return (
    <div style={{ textAlign: 'center', marginTop: 100 }}>
      <h1>✅ Payment Successful</h1>
      <p>Your subscription is now active.</p>

      <br />

      <a
        href="/dashboard"
        style={{
          padding: '10px 20px',
          background: '#000',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: 6,
        }}
      >
        Go to Dashboard
      </a>
    </div>
  )
}
