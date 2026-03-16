'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function BillingSuccess() {
  const [status, setStatus] = useState<'loading'|'success'>('loading')

  useEffect(() => {
    setTimeout(() => setStatus('success'), 2000)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 32 }}>
        {status === 'loading' ? (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
            <h2 style={{ color: '#f0a500' }}>جارٍ تفعيل اشتراكك...</h2>
            <p style={{ color: '#8b949e' }}>انتظر لحظة</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
            <h2 style={{ color: '#3fb950' }}>تم تفعيل اشتراكك بنجاح!</h2>
            <p style={{ color: '#8b949e', marginBottom: 24 }}>مزارعك السحابية جاهزة الآن.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link href="/dashboard" style={{ background: 'linear-gradient(135deg,#f0a500,#e05c2a)', color: '#0d1117', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>
                🏠 الداشبورد
              </Link>
              <Link href="/dashboard/live" style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', padding: '12px 28px', borderRadius: 8, textDecoration: 'none' }}>
                ⚔️ مزارعي
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
