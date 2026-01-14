import Header from './components/Header'
import StatCard from './components/StatCard'
import EmailsTable from './components/EmailsTable'
import { headers } from 'next/headers'

async function getData() {
  const h = headers()
  const host = h.get('host')
  const res = await fetch(`http://${host}/api/admin/early-access`, { cache: 'no-store' })
  return res.json()
}

export default async function AdminPage() {
  const { data } = await getData()
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Header />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Total Emails" value={data.length} />
          <StatCard label="Last 24h" value="—" />
          <StatCard label="Last 7d" value="—" />
          <StatCard label="Last 30d" value="—" />
        </div>
        <EmailsTable data={data} />
      </div>
    </div>
  )
}
