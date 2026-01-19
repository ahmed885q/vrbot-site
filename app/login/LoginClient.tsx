'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function LoginClient() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createSupabaseBrowserClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const next = params.get('next') || '/dashboard'
    router.push(next)
  }

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Login</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <input
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />

        <button disabled={loading} type="submit">
          {loading ? 'Signing in…' : 'Login'}
        </button>

        {error ? <p style={{ color: 'red' }}>{error}</p> : null}

        <p style={{ marginTop: 8 }}>
          New? <a href="/signup">Create account</a>
        </p>

        <p style={{ marginTop: 8 }}>
          Admin? <a href="/admin/login">Admin Login</a>
        </p>
      </form>
    </div>
  )
}
