'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setLoading(false)
    if (res.ok) router.push('/dashboard')
    else setError('Login failed')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="border p-6 rounded w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold text-center">Login</h1>
        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <button className="w-full bg-black text-white py-2 rounded" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="text-red-600 text-center">{error}</p>}
      </form>
    </div>
  )
}
