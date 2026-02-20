'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useLanguage, Language } from '@/lib/i18n'

const t: Record<Language, Record<string, string>> = {
  ar: { title: '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628', email: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', password: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', btn: '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628', loading: '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0646\u0634\u0627\u0621...', have_account: '\u0639\u0646\u062f\u0643 \u062d\u0633\u0627\u0628\u061f', login: '\u062a\u0633\u062c\u064a\u0644 \u062f\u062e\u0648\u0644' },
  en: { title: 'Create Account', email: 'Email', password: 'Password', btn: 'Sign Up', loading: 'Creating...', have_account: 'Have an account?', login: 'Login' },
  ru: { title: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442', email: '\u042d\u043b. \u043f\u043e\u0447\u0442\u0430', password: '\u041f\u0430\u0440\u043e\u043b\u044c', btn: '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f', loading: '\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435...', have_account: '\u0415\u0441\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442?', login: '\u0412\u043e\u0439\u0442\u0438' },
  zh: { title: '\u521b\u5efa\u8d26\u53f7', email: '\u90ae\u7bb1', password: '\u5bc6\u7801', btn: '\u6ce8\u518c', loading: '\u521b\u5efa\u4e2d...', have_account: '\u5df2\u6709\u8d26\u53f7\uff1f', login: '\u767b\u5f55' },
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { lang, mounted, isRtl } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!mounted) return null
  const s = t[lang]

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>{s.title}</h1>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
          <input placeholder={s.email} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
            style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' }} />
          <input placeholder={s.password} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6}
            style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' }} />
          <button disabled={loading} type="submit"
            style={{ padding: '14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {loading ? s.loading : s.btn}
          </button>
          {error ? <p style={{ color: 'red', textAlign: 'center', margin: 0 }}>{error}</p> : null}
          <p style={{ textAlign: 'center', margin: 0, color: '#666' }}>
            {s.have_account} <a href="/login" style={{ color: '#7c3aed', fontWeight: 600 }}>{s.login}</a>
          </p>
        </form>
      </div>
    </div>
  )
}
