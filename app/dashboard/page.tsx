export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const res = await fetch('/api/subscription/status', {
    cache: 'no-store',
  })

  if (!res.ok) {
    return <div>Failed to load subscription</div>
  }

  const { plan } = await res.json()

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Subscription: {plan}</p>
        <a href="/auth/logout" className="underline">
          Logout
        </a>
      </div>
    </div>
  )
}
