'use client'
import { useState } from 'react'

export default function EmailsTable({ data }: { data: any[] }) {
  const [sel, setSel] = useState<string[]>([])
  const toggle = (id: string) =>
    setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  async function del() {
    if (!confirm(`Delete ${sel.length}?`)) return
    await fetch('/api/admin/early-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: sel })
    })
    location.reload()
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between mb-3">
        <button onClick={del} disabled={!sel.length}
          className="px-3 py-1 bg-red-600 text-white rounded">
          Delete ({sel.length})
        </button>
      </div>
      <table className="w-full text-sm">
        <thead><tr><th></th><th>Email</th><th>Date</th></tr></thead>
        <tbody>
          {data.map(r => (
            <tr key={r.id} className="border-t">
              <td><input type="checkbox" onChange={() => toggle(r.id)} /></td>
              <td>{r.email}</td>
              <td>{new Date(r.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
