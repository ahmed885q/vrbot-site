'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

type Lang = 'ar' | 'en' | 'ru' | 'zh'

const navItems = [
  { href: '/admin', icon: '🏠', label: { ar: 'الرئيسية', en: 'Overview', ru: 'Обзор', zh: '概览' } },
  { href: '/admin/subscriptions', icon: '⚡', label: { ar: 'الاشتراكات', en: 'Subscriptions', ru: 'Подписки', zh: '订阅' } },
  { href: '/admin/pro-keys', icon: '🔑', label: { ar: 'مفاتيح Pro', en: 'Pro Keys', ru: 'Pro Ключи', zh: 'Pro密钥' } },
  { href: '/admin/licenses', icon: '📜', label: { ar: 'التراخيص', en: 'Licenses', ru: 'Лицензии', zh: '许可证' } },
  { href: '/admin/early-access', icon: '🚀', label: { ar: 'الوصول المبكر', en: 'Early Access', ru: 'Ранний доступ', zh: '抢先体验' } },
  { href: '/admin/protection', icon: '🛡️', label: { ar: 'الحماية', en: 'Protection', ru: 'Защита', zh: '防护' } },
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
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? '64px' : '240px',
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
        {/* Logo */}
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

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '12px' : '12px 16px',
                borderRadius: '10px',
                textDecoration: 'none',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                background: isActive ? 'rgba(168,85,247,0.3)' : 'transparent',
                border: isActive ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent',
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

        {/* Bottom */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Collapse Toggle */}
          <button onClick={() => setCollapsed(!collapsed)} style={{
            width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            {collapsed ? '→' : '←'} {!collapsed && (collapsed ? tx.expand : tx.collapse)}
          </button>

          {/* Back to site */}
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

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
