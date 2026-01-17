'use client'

export default function PricingPage() {
  async function handleUpgrade() {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Stripe checkout failed')
      }
    } catch (error) {
      console.error(error)
      alert('Something went wrong')
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Pricing</h1>

      {/* Free */}
      <h2>Free</h2>
      <p>$0</p>
      <ul>
        <li>✓ Early Access</li>
        <li>✓ Limited Automation</li>
      </ul>

      {/* Pro */}
      <h2>Pro</h2>
      <p>$19 / month</p>
      <ul>
        <li>✓ Unlimited Farming</li>
        <li>✓ Auto Upgrades</li>
        <li>✓ Priority Support</li>
      </ul>

      <button
        onClick={handleUpgrade}
        style={{
          marginTop: 12,
          padding: '10px 20px',
          background: 'black',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Upgrade to Pro
      </button>

      {/* Enterprise */}
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
