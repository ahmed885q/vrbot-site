'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useLanguage, Language } from '@/lib/i18n'

const t: Record<Language, Record<string, string>> = {
  ar: { title: '\u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062c\u062f\u064a\u062f\u0629', password: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629', confirm: '\u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', btn: '\u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', loading: '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u063a\u064a\u064a\u0631...', success: '\u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062c\u0627\u062d!', mismatch: '\u0643\u0644\u0645\u0627\u062a \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642\u0629' },
  en: { title: 'New Password', password: 'New Password', confirm: 'Confirm Password', btn: 'Change Password', loading: 'Changing...', success: 'Password changed successfully!', mismatch: 'Passwords do not match' },
  ru: { title: '\u041d\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c', password: '\u041d\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c', confirm: '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435', btn: '\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c', loading: '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435...', success: '\u041f\u0430\u0440\u043e\u043b\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d!', mismatch: '\u041f\u0430\u0440\u043e\u043b\u0438 \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u044e\u0442' },
  zh: { title: '\u65b0\u5bc6\u7801', password: '\u65b0\u5bc6\u7801', confirm: '\u786e\u8ba4\u5bc6\u7801', btn: '\u4fee\u6539\u5bc6\u7801', loading: '\u4fee\u6539\u4e2d...', success: '\u5bc6\u7801\u4fee\u6539\u6210\u529f\uff01', mismatch: '\u5bc6\u7801\u4e0d\u4e00\u81f4' },
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { lang, mounted, isRtl } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User arrived via reset link
      }
    })
  }, [supabase.auth])

  if (!mounted) return null
  const s = t[lang]

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError(s.mismatch); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>{s.title}</h1>
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>?</div>
            <p style={{ color: '#22c55e', fontWeight: 600, fontSize: 16 }}>{s.success}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
            <input placeholder={s.password} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6}
              style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' }} />
            <input placeholder={s.confirm} value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" required minLength={6}
              style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' }} />
            <button disabled={loading} type="submit"
              style={{ padding: '14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              {loading ? s.loading : s.btn}
            </button>
            {error ? <p style={{ color: 'red', textAlign: 'center', margin: 0 }}>{error}</p> : null}
          </form>
        )}
      </div>
    </div>
  )
}
