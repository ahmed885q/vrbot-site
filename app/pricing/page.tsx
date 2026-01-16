'use client'

export default function PricingPage() {
  const handleUpgrade = async () => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
    })

    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Pricing</h1>

      <h2>Free</h2>
      <p>$0</p>
      <ul>
        <li>✓ Early Access</li>
        <li>✓ Limited Automation</li>
      </ul>

      <h2>Pro</h2>
      <p>$19 / month</p>
      <ul>
        <li>✓ Unlimited Farming</li>
        <li>✓ Auto Upgrades</li>
        <li>✓ Priority Support</li>
      </ul>

      {/* ✅ الزر الحقيقي */}
      <button
        onClick={handleUpgrade}
        style={{
          marginTop: 12,
          padding: '10px 20px',
          background: 'black',
          color: 'white',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Upgrade to Pro
      </button>

      <h2 style={{ marginTop: 40 }}>Enterprise</h2>
      <p>Custom</p>
      <ul>
        <li>✓ Alliance Support</li>
        <li>✓ Advanced AI</li>
        <li>✓ Custom Features</li>
      </ul>
    </div>
  )
}
