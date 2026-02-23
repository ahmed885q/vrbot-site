'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useLanguage, Language } from '@/lib/i18n'

const t: Record<Language, Record<string, string>> = {
  ar: { title: '\u0627\u0633\u062a\u0639\u0627\u062f\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', email: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a', btn: '\u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0627\u0633\u062a\u0639\u0627\u062f\u0629', loading: '\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0631\u0633\u0627\u0644...', success: '\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0633\u062a\u0639\u0627\u062f\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0625\u0644\u0649 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a.', back: '\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' },
  en: { title: 'Reset Password', email: 'Email', btn: 'Send Reset Link', loading: 'Sending...', success: 'Password reset link sent to your email.', back: 'Back to Login' },
  ru: { title: '\u0421\u0431\u0440\u043e\u0441 \u043f\u0430\u0440\u043e\u043b\u044f', email: '\u042d\u043b. \u043f\u043e\u0447\u0442\u0430', btn: '\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443', loading: '\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430...', success: '\u0421\u0441\u044b\u043b\u043a\u0430 \u0434\u043b\u044f \u0441\u0431\u0440\u043e\u0441\u0430 \u043f\u0430\u0440\u043e\u043b\u044f \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430.', back: '\u041d\u0430\u0437\u0430\u0434' },
  zh: { title: '\u91cd\u7f6e\u5bc6\u7801', email: '\u90ae\u7bb1', btn: '\u53d1\u9001\u91cd\u7f6e\u94fe\u63a5', loading: '\u53d1\u9001\u4e2d...', success: '\u5bc6\u7801\u91cd\u7f6e\u94fe\u63a5\u5df2\u53d1\u9001\u5230\u60a8\u7684\u90ae\u7bb1\u3002', back: '\u8fd4\u56de\u767b\u5f55' },
}

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient()
  const { lang, mounted, isRtl } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!mounted) return null
  const s = t[lang]

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.vrbot.me/reset-password',
    })
    if (error) { setError(error.message); setLoading(false); return }
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
            <p style={{ color: '#22c55e', fontWeight: 600, fontSize: 16 }}>{s.success}</p>
            <a href="/login" style={{ color: '#7c3aed', fontWeight: 600, marginTop: 16, display: 'inline-block' }}>{s.back}</a>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
            <input placeholder={s.email} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
              style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' }} />
            <button disabled={loading} type="submit"
              style={{ padding: '14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {loading ? s.loading : s.btn}
            </button>
            {error ? <p style={{ color: 'red', textAlign: 'center', margin: 0 }}>{error}</p> : null}
            <p style={{ textAlign: 'center', margin: 0 }}>
              <a href="/login" style={{ color: '#7c3aed', fontWeight: 600 }}>{s.back}</a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
