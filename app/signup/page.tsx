'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // إذا عندك Email confirmation مفعّل، ممكن يحتاج تأكيد
    router.push('/dashboard')
  }

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Create account</h1>

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
          minLength={6}
        />

        <button disabled={loading} type="submit">
          {loading ? 'Creating…' : 'Sign up'}
        </button>

        {error ? <p style={{ color: 'red' }}>{error}</p> : null}
        <p style={{ marginTop: 8 }}>
          Have an account? <a href="/login">Login</a>
        </p>
      </form>
    </div>
  )
}
