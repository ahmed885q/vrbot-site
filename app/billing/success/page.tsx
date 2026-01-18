'use client'

export default function BillingSuccessPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <h1>✅ Payment Successful</h1>
      <p>Your subscription has been activated.</p>

      <a
        href="/dashboard"
        style={{
          padding: '10px 20px',
          background: '#000',
          color: '#fff',
          borderRadius: 6,
          textDecoration: 'none',
        }}
      >
        Go to Dashboard
      </a>
    </div>
  )
}
