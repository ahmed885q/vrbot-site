'use client'

import { useState } from 'react'
import { useLanguage, Language } from '@/lib/i18n'

const t: Record<Language, Record<string, string>> = {
  ar: { title: '\u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0645\u0628\u0643\u0631', placeholder: 'you@email.com', btn: '\u0627\u0646\u0636\u0645', ok: '\u062a\u0645 \u062a\u0633\u062c\u064a\u0644\u0643 \u0628\u0646\u062c\u0627\u062d!', err: '\u062d\u062f\u062b \u062e\u0637\u0623\u060c \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649' },
  en: { title: 'Early Access', placeholder: 'you@email.com', btn: 'Join', ok: 'You are on the list!', err: 'Something went wrong' },
  ru: { title: '\u0420\u0430\u043d\u043d\u0438\u0439 \u0434\u043e\u0441\u0442\u0443\u043f', placeholder: 'you@email.com', btn: '\u041f\u0440\u0438\u0441\u043e\u0435\u0434\u0438\u043d\u0438\u0442\u044c\u0441\u044f', ok: '\u0412\u044b \u0432 \u0441\u043f\u0438\u0441\u043a\u0435!', err: '\u0427\u0442\u043e-\u0442\u043e \u043f\u043e\u0448\u043b\u043e \u043d\u0435 \u0442\u0430\u043a' },
  zh: { title: '\u62a2\u5148\u4f53\u9a8c', placeholder: 'you@email.com', btn: '\u52a0\u5165', ok: '\u60a8\u5df2\u52a0\u5165\u540d\u5355\uff01', err: '\u51fa\u9519\u4e86\uff0c\u8bf7\u91cd\u8bd5' },
}

export default function EarlyAccessPage() {
  const { lang, mounted, isRtl } = useLanguage()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  if (!mounted) return null
  const s = t[lang]

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
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{'\uD83D\uDE80'}</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>{s.title}</h1>
        <input type="email" required placeholder={s.placeholder} value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none', marginBottom: 14 }} />
        <button type="submit"
          style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          {s.btn}
        </button>
        {status === 'ok' && <p style={{ color: '#22c55e', marginTop: 14, fontWeight: 600 }}>{s.ok}</p>}
        {status === 'error' && <p style={{ color: '#ef4444', marginTop: 14 }}>{s.err}</p>}
      </form>
    </div>
  )
}
