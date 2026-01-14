export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/subscription/status`,
    { cache: 'no-store' }
  )
  const { plan } = await res.json()

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Subscription: {plan}</p>
        <a href="/auth/logout" className="underline">Logout</a>
      </div>
    </div>
  )
}
