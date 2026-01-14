'use client'

import { useEffect, useState } from 'react'

type Row = {
  id: string
  email: string
  created_at: string
}

export default function EarlyAccessTable({
  data: initialData,
}: {
  data: Row[]
}) {
  const [data, setData] = useState<Row[]>(initialData)
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)

  async function search() {
    setLoading(true)

    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    const res = await fetch(
      `/api/admin/early-access/search?${params.toString()}`
    )

    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => {
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm">Search Email</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border px-2 py-1 rounded"
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="block text-sm">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>

        <div>
          <label className="block text-sm">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>

        <button
          onClick={search}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Searching…' : 'Apply'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.email}</td>
                <td className="p-2">
                  {new Date(row.created_at).toLocaleString()}
                </td>
              </tr>
            ))}

            {!data.length && (
              <tr>
                <td
                  colSpan={2}
                  className="p-6 text-center text-gray-500"
                >
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
