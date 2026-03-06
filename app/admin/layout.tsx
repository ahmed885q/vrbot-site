'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

type Lang = 'ar' | 'en' | 'ru' | 'zh'

const navItems = [
  { href: '/admin/diagnostics', icon: '🔧', label: { ar: 'لوحة التحكم', en: 'Diagnostics', ru: 'Диагностика', zh: '诊断' } },
]

const titles: Record<Lang, Record<string, string>> = {
  ar: { admin: 'لوحة الإدارة', back: '← العودة للموقع', collapse: 'طي', expand: 'توسيع' },
  en: { admin: 'Admin Panel', back: '← Back to Site', collapse: 'Collapse', expand: 'Expand' },
  ru: { admin: 'Панель админа', back: '← На сайт', collapse: 'Свернуть', expand: 'Развернуть' },
  zh: { admin: '管理面板', back: '← 返回网站', collapse: '折叠', expand: '展开' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [lang, setLang] = useState<Lang>('ar')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vrbot_lang') as Lang
      if (saved && titles[saved]) setLang(saved)
    } catch {}
  }, [])

  const tx = titles[lang]
  const isRtl = lang === 'ar'

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
      <aside style={{
        width: collapsed ? '64px' : '220px',
        background: 'linear-gradient(180deg, #0f0c29 0%, #1a1a3e 50%, #24243e 100%)',
        color: '#fff',
        transition: 'width 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        zIndex: 50,
      }}>
        <div style={{
          padding: collapsed ? '20px 12px' : '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          {!collapsed && (
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '1px' }}>VRBOT</div>
              <div style={{ fontSize: '11px', opacity: 0.6 }}>{tx.admin}</div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '12px' : '12px 16px',
                borderRadius: '10px',
                textDecoration: 'none',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                background: isActive ? 'rgba(59,130,246,0.3)' : 'transparent',
                border: isActive ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.15s ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label[lang]}</span>}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{
            width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            {collapsed ? '→' : '←'} {!collapsed && tx.collapse}
          </button>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px', padding: '10px', marginTop: '8px',
            borderRadius: '8px', textDecoration: 'none',
            color: 'rgba(255,255,255,0.5)', fontSize: '12px',
          }}>
            {collapsed ? '🌐' : tx.back}
          </Link>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
