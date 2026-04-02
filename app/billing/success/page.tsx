'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Lang = 'ar' | 'en' | 'ru' | 'zh'

const t: Record<Lang, Record<string, string>> = {
  ar: {
    loading: 'جارٍ تفعيل اشتراكك...',
    wait: 'انتظر لحظة',
    title: 'تم الدفع بنجاح!',
    subtitle: 'مزارعك السحابية جاهزة الآن',
    farms: 'عدد المزارع',
    txn: 'رقم العملية',
    expires: 'ينتهي في',
    live: 'افتح Live',
    manage: 'إدارة المزارع',
    dashboard: 'الداشبورد',
  },
  en: {
    loading: 'Activating your subscription...',
    wait: 'Please wait',
    title: 'Payment Successful!',
    subtitle: 'Your cloud farms are ready',
    farms: 'Farms',
    txn: 'Transaction',
    expires: 'Expires',
    live: 'Open Live',
    manage: 'Manage Farms',
    dashboard: 'Dashboard',
  },
  ru: {
    loading: 'Активация подписки...',
    wait: 'Подождите',
    title: 'Оплата прошла!',
    subtitle: 'Ваши облачные фермы готовы',
    farms: 'Фермы',
    txn: 'Транзакция',
    expires: 'Истекает',
    live: 'Открыть Live',
    manage: 'Управление фермами',
    dashboard: 'Панель',
  },
  zh: {
    loading: '正在激活订阅...',
    wait: '请稍候',
    title: '支付成功！',
    subtitle: '您的云农场已就绪',
    farms: '农场数量',
    txn: '交易编号',
    expires: '到期',
    live: '打开 Live',
    manage: '管理农场',
    dashboard: '控制面板',
  },
}

export default function BillingSuccess() {
  const [status, setStatus] = useState<'loading' | 'success'>('loading')
  const [lang, setLang] = useState<Lang>('ar')
  const searchParams = useSearchParams()

  const farms = searchParams.get('farms') || '1'
  const txn = searchParams.get('txn') || ''

  useEffect(() => {
    const saved = localStorage.getItem('vrbot_lang') as Lang
    if (saved && t[saved]) setLang(saved)
    setTimeout(() => setStatus('success'), 1500)
  }, [])

  const s = t[lang]
  const isRtl = lang === 'ar'

  const expiryDate = new Date()
  expiryDate.setMonth(expiryDate.getMonth() + 1)
  const expiryStr = expiryDate.toLocaleDateString(
    lang === 'ar' ? 'ar-SA' : lang === 'zh' ? 'zh-CN' : lang === 'ru' ? 'ru-RU' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      background: '#0d1117',
      color: '#e6edf3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: 500,
        padding: 32,
        background: '#161b22',
        border: '1px solid #21262d',
        borderRadius: 16,
        transition: 'all 0.5s',
      }}>
        {status === 'loading' ? (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
            <h2 style={{ color: '#f0a500', margin: '0 0 8px' }}>{s.loading}</h2>
            <p style={{ color: '#8b949e' }}>{s.wait}</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ color: '#3fb950', fontSize: 26, margin: '0 0 8px' }}>{s.title}</h2>
            <p style={{ color: '#8b949e', marginBottom: 28 }}>{s.subtitle}</p>

            {/* Details */}
            <div style={{
              background: '#0d1117',
              border: '1px solid #21262d',
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 28,
              textAlign: isRtl ? 'right' : 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#8b949e' }}>{s.farms}</span>
                <span style={{ color: '#e6edf3', fontWeight: 700 }}>{farms} 🌾</span>
              </div>
              {txn && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: '#8b949e' }}>{s.txn}</span>
                  <span style={{ color: '#e6edf3', fontFamily: 'monospace', fontSize: 12 }}>
                    {txn.length > 18 ? txn.slice(0, 18) + '...' : txn}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8b949e' }}>{s.expires}</span>
                <span style={{ color: '#f0a500', fontWeight: 600 }}>{expiryStr}</span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <Link href="/dashboard/live" style={{
                flex: 1,
                background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                color: '#fff',
                padding: '13px 16px',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'center',
              }}>
                📺 {s.live}
              </Link>
              <Link href="/dashboard/farms" style={{
                flex: 1,
                background: '#3fb950',
                color: '#0d1117',
                padding: '13px 16px',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'center',
              }}>
                🌾 {s.manage}
              </Link>
            </div>

            <Link href="/dashboard" style={{ color: '#8b949e', fontSize: 13, textDecoration: 'none' }}>
              {s.dashboard}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
