'use client'

import { useEffect, useMemo, useState } from 'react'

type UserRow = {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
}

export default function UserRoleManager() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        (u.email || '').toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    )
  }, [users, query])

  async function loadUsers() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/users/list', {
      cache: 'no-store',
    })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j?.error || 'Failed to load users')
      setLoading(false)
      return
    }

    const j = await res.json()
    setUsers(j.users || [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function setRole(userId: string, role: 'admin' | 'user') {
    setBusyId(userId)
    setError(null)

    const res = await fetch('/api/admin/users/set-role', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j?.error || 'Failed to set role')
      setBusyId(null)
      return
    }

    setBusyId(null)
    await loadUsers()
  }

  return (
    <div
      style={{
        marginTop: 32,
        padding: 16,
        border: '1px solid #ddd',
        borderRadius: 12,
      }}
    >
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>User Roles</h2>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <input
          placeholder="Search by email or user id…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, padding: 6 }}
        />
        <button onClick={loadUsers} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && (
        <p style={{ color: 'red', marginTop: 10 }}>{error}</p>
      )}

      {loading ? (
        <p style={{ marginTop: 12 }}>Loading…</p>
      ) : (
        <div style={{ marginTop: 12 }}>
          {filtered.map((u) => (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 10,
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {u.email || '(no email)'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {u.id}
                </div>
              </div>

              <button
                onClick={() => setRole(u.id, 'admin')}
                disabled={busyId === u.id}
              >
                {busyId === u.id ? '...' : 'Make Admin'}
              </button>

              <button
                onClick={() => setRole(u.id, 'user')}
                disabled={busyId === u.id}
              >
                {busyId === u.id ? '...' : 'Make User'}
              </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <p style={{ marginTop: 12 }}>No users found.</p>
          )}
        </div>
      )}
    </div>
  )
}
