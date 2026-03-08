'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid email or password')
        setLoading(false)
        return
      }

      router.push('/admin')
    } catch (err) {
      setError('Network error, please try again')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: 12,
        padding: 32,
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 24, textAlign: 'center' }}>
          Admin Login
        </h1>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
          <input
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f1f5f9',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <input
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f1f5f9',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            disabled={loading}
            type="submit"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#475569' : '#6366f1',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
          {error && (
            <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', margin: 0 }}>
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  )
      }
