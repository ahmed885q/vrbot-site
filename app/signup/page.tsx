'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useLanguage, Language } from '@/lib/i18n'

const t: Record<Language, Record<string, string>> = {
  ar: { title: '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628', name: '\u0627\u0644\u0627\u0633\u0645', email: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', password: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', confirm: '\u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', btn: '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628', loading: '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0646\u0634\u0627\u0621...', have_account: '\u0639\u0646\u062f\u0643 \u062d\u0633\u0627\u0628\u061f', login: '\u062a\u0633\u062c\u064a\u0644 \u062f\u062e\u0648\u0644', success: '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628! \u062a\u062d\u0642\u0642 \u0645\u0646 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0644\u062a\u0641\u0639\u064a\u0644 \u062d\u0633\u0627\u0628\u0643.', mismatch: '\u0643\u0644\u0645\u0627\u062a \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642\u0629' },
  en: { title: 'Create Account', name: 'Name', email: 'Email', password: 'Password', confirm: 'Confirm Password', btn: 'Sign Up', loading: 'Creating...', have_account: 'Have an account?', login: 'Login', success: 'Account created! Check your email to activate your account.', mismatch: 'Passwords do not match' },
  ru: { title: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442', name: '\u0418\u043c\u044f', email: '\u042d\u043b. \u043f\u043e\u0447\u0442\u0430', password: '\u041f\u0430\u0440\u043e\u043b\u044c', confirm: '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c', btn: '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f', loading: '\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435...', have_account: '\u0415\u0441\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442?', login: '\u0412\u043e\u0439\u0442\u0438', success: '\u0410\u043a\u043a\u0430\u0443\u043d\u0442 \u0441\u043e\u0437\u0434\u0430\u043d! \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u043e\u0447\u0442\u0443.', mismatch: '\u041f\u0430\u0440\u043e\u043b\u0438 \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u044e\u0442' },
  zh: { title: '\u521b\u5efa\u8d26\u53f7', name: '\u59d3\u540d', email: '\u90ae\u7bb1', password: '\u5bc6\u7801', confirm: '\u786e\u8ba4\u5bc6\u7801', btn: '\u6ce8\u518c', loading: '\u521b\u5efa\u4e2d...', have_account: '\u5df2\u6709\u8d26\u53f7\uff1f', login: '\u767b\u5f55', success: '\u8d26\u53f7\u5df2\u521b\u5efa\uff01\u8bf7\u68c0\u67e5\u90ae\u7bb1\u3002', mismatch: '\u5bc6\u7801\u4e0d\u4e00\u81f4' },
}

export default function SignupPage() {
  const supabase = createSupabaseBrowserClient()
  const { lang, mounted, isRtl } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!mounted) return null
  const s = t[lang]

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPw) { setError(s.mismatch); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) { setError(error.message); setLoading(false); return }

    fetch('/api/auth/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>{s.title}</h1>
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>??</div>
            <p style={{ color: '#22c55e', fontWeight: 600, fontSize: 16, lineHeight: 1.6 }}>{s.success}</p>
            <a href="/login" style={{ color: '#7c3aed', fontWeight: 600, marginTop: 16, display: 'inline-block' }}>{s.login}</a>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
            <input placeholder={s.name} value={name} onChange={(e) => setName(e.target.value)} type="text" required
              style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' }} />
            <input placeholder={s.email} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
              style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' }} />
            <input placeholder={s.password} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6}
              style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' }} />
            <input placeholder={s.confirm} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} type="password" required minLength={6}
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
        )}
      </div>
    </div>
  )
}
