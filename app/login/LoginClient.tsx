'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useLanguage, Language } from '@/lib/i18n'

const t: Record<Language, Record<string, string>> = {
  ar: { title: '\u062a\u0633\u062c\u064a\u0644 \u062f\u062e\u0648\u0644', email: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', password: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', btn: '\u062f\u062e\u0648\u0644', loading: '\u062c\u0627\u0631\u064a \u0627\u0644\u062f\u062e\u0648\u0644...', new_user: '\u062c\u062f\u064a\u062f\u061f', create: '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628', admin: '\u0645\u0634\u0631\u0641\u061f', admin_login: '\u062f\u062e\u0648\u0644 \u0627\u0644\u0645\u0634\u0631\u0641' },
  en: { title: 'Login', email: 'Email', password: 'Password', btn: 'Login', loading: 'Signing in...', new_user: 'New?', create: 'Create account', admin: 'Admin?', admin_login: 'Admin Login' },
  ru: { title: '\u0412\u0445\u043e\u0434', email: '\u042d\u043b. \u043f\u043e\u0447\u0442\u0430', password: '\u041f\u0430\u0440\u043e\u043b\u044c', btn: '\u0412\u043e\u0439\u0442\u0438', loading: '\u0412\u0445\u043e\u0434...', new_user: '\u041d\u043e\u0432\u044b\u0439?', create: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442', admin: '\u0410\u0434\u043c\u0438\u043d?', admin_login: '\u0412\u0445\u043e\u0434 \u0430\u0434\u043c\u0438\u043d\u0430' },
  zh: { title: '\u767b\u5f55', email: '\u90ae\u7bb1', password: '\u5bc6\u7801', btn: '\u767b\u5f55', loading: '\u767b\u5f55\u4e2d...', new_user: '\u65b0\u7528\u6237\uff1f', create: '\u521b\u5efa\u8d26\u53f7', admin: '\u7ba1\u7406\u5458\uff1f', admin_login: '\u7ba1\u7406\u5458\u767b\u5f55' },
}

export default function LoginClient() {
  const router = useRouter()
  const params = useSearchParams()
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    const next = params.get('next') || '/dashboard'
    router.push(next)
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>{s.title}</h1>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
          <input placeholder={s.email} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
            style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' }} />
          <input placeholder={s.password} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
            style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' }} />
          <button disabled={loading} type="submit"
            style={{ padding: '14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {loading ? s.loading : s.btn}
          </button>
          {error ? <p style={{ color: 'red', textAlign: 'center', margin: 0 }}>{error}</p> : null}
          <p style={{ textAlign: 'center', margin: 0, color: '#666' }}>
            {s.new_user} <a href="/signup" style={{ color: '#7c3aed', fontWeight: 600 }}>{s.create}</a>
          </p>
          <p style={{ textAlign: 'center', margin: 0, color: '#999', fontSize: 13 }}>
            {s.admin} <a href="/admin/login" style={{ color: '#999' }}>{s.admin_login}</a>
          </p>
        </form>
      </div>
    </div>
  )
}
