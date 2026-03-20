'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

type Lang = 'ar' | 'en' | 'ru' | 'zh'

const navItems = [
  { href: '/admin/diagnostics', icon: '🔧', label: { ar: 'لوحة التحكم', en: 'Diagnostics', ru: 'Диагностика', zh: '诊断' } },
  { href: '/admin/farms', icon: '🏰', label: { ar: 'إدارة المزارع', en: 'Farm Manager', ru: 'Управление фермами', zh: '农场管理' } },
  { href: '/admin/orchestrator', icon: '📦', label: { ar: 'جدولة الدُفعات', en: 'Batch Scheduler', ru: 'Планировщик', zh: '批次调度' } },
  { href: '/admin/nifling', icon: '⚡', label: { ar: 'Nifling', en: 'Nifling Queue', ru: 'Нифлинг', zh: 'Nifling' } },
  { href: '/admin/scaler', icon: '📊', label: { ar: 'التحجيم', en: 'Auto-Scaler', ru: 'Масштабирование', zh: '自动扩缩' } },
  { href: '/admin/logs', icon: '📋', label: { ar: 'السجلات', en: 'Logs', ru: 'Логи', zh: '日志' } },
  { href: '/admin/monitor', icon: '📡', label: { ar: 'المراقبة', en: 'Monitor', ru: 'Мониторинг', zh: '监控' } },
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
        {/* Header */}
        <div style={{ padding: '16px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!collapsed && <span style={{ fontSize: '14px', fontWeight: 700, color: '#a78bfa' }}>{tx.admin}</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
            title={collapsed ? tx.expand : tx.collapse}
          >
            {collapsed ? '☰' : '✕'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: collapsed ? '12px 0' : '10px 16px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
                borderInlineStart: active ? '3px solid #6366f1' : '3px solid transparent',
                color: active ? '#a78bfa' : '#94a3b8',
                textDecoration: 'none',
                fontSize: '13px',
                transition: 'all 0.15s ease',
              }}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {!collapsed && <span>{item.label[lang]}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Language selector */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {!collapsed && (
            <select
              value={lang}
              onChange={(e) => {
                const v = e.target.value as Lang
                setLang(v)
                try { localStorage.setItem('vrbot_lang', v) } catch {}
              }}
              style={{ width: '100%', background: '#1e1e3f', color: '#cbd5e1', border: '1px solid #334155', borderRadius: '6px', padding: '6px 8px', fontSize: '12px' }}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="zh">中文</option>
            </select>
          )}
        </div>

        {/* Back link */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/dashboard" style={{
            color: '#64748b', textDecoration: 'none', fontSize: '12px',
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            {collapsed ? '←' : tx.back}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '24px', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
