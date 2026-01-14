'use client'

import { useState } from 'react'

export default function EarlyAccessPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')

    const res = await fetch('/api/early-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setStatus(res.ok ? 'ok' : 'error')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={submit}
        className="border rounded p-6 space-y-4 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-center">
          Early Access
        </h1>

        <input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />

        <button className="w-full bg-black text-white py-2 rounded">
          Join
        </button>

        {status === 'ok' && (
          <p className="text-green-600 text-center">
            You are on the list!
          </p>
        )}

        {status === 'error' && (
          <p className="text-red-600 text-center">
            Something went wrong
          </p>
        )}
      </form>
    </div>
  )
}
