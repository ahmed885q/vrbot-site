import { headers } from 'next/headers'
import UserRoleManager from './components/UserRoleManager'

export const dynamic = 'force-dynamic'

type EarlyAccessRow = {
  id: string
  email: string
  created_at: string
}

async function getData(): Promise<EarlyAccessRow[]> {
  const h = headers()
  const host = h.get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'

  const res = await fetch(
    `${protocol}://${host}/api/admin/early-access`,
    { cache: 'no-store' }
  )

  if (!res.ok) return []
  return res.json()
}

export default async function AdminPage() {
  const data = await getData()

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>Admin Dashboard</h1>

      {/* قسم Early Access */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Early Access</h2>

        {data.length === 0 ? (
          <p style={{ marginTop: 12 }}>No early access entries.</p>
        ) : (
          <table
            style={{
              width: '100%',
              marginTop: 12,
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                  Email
                </th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>
                  Created At
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                    {row.email}
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* قسم إدارة المستخدمين والأدوار */}
      <UserRoleManager />
    </div>
  )
}
