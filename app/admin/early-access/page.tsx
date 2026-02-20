import { supabaseAdmin } from '@/lib/supabase/admin'


export const dynamic = 'force-dynamic'

export default async function EarlyAccessAdminPage() {
  const { data } = await supabaseAdmin
    .from('early_access')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Early Access Emails</h1>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Email</th>
            <th className="border p-2">IP</th>
            <th className="border p-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((row) => (
            <tr key={row.id}>
              <td className="border p-2">{row.email}</td>
              <td className="border p-2">{row.ip}</td>
              <td className="border p-2">
                {new Date(row.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
