'use client'

export default function PayPalButton() {
  return (
    <button
      type="button"
      onClick={() => alert('Payments will be enabled after launch (PayPal).')}
      style={{
        padding: '10px 14px',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        background: '#fff',
        fontWeight: 800,
        cursor: 'pointer',
      }}
    >
      Pay with PayPal (Soon)
    </button>
  )
}
