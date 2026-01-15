export const dynamic = 'force-dynamic'

export default function BillingPage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>Billing</h1>
      <p>Upgrade to Pro</p>

      <form action="/api/stripe/checkout" method="POST">
        <button type="submit">
          Upgrade to Pro
        </button>
      </form>
    </main>
  )
}
