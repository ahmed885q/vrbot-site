'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

type Lang = 'ar' | 'en' | 'ru' | 'zh'

const navItems = [
  { href: '/admin/diagnostics', icon: '🔧', label: { ar: 'لوحة التحكم', en: 'Diagnostics', ru: 'Диагностика', zh: '诊断' } },
  { href: '/admin/orchestrator', icon: '📦', label: { ar: 'جدولة الدُفعات', en: 'Batch Scheduler', ru: 'Планировщик', zh: '批次调度' } },
  { href: '/admin/nifling', icon: '⚡', label: { ar: 'Nifling', en: 'Nifling Queue', ru: 'Нифлинг', zh: 'Nifling' } },
  { href: '/admin/scaler', icon: '📊', label: { ar: 'التحجيم', en: 'Auto-Scaler', ru: 'Масштабирование', zh: '自动扩缩' } },
  { href: '/admin/logs', icon: '📋', label: { ar: 'السجلات', en: 'Logs', ru: 'Логи', zh: '日志' } },
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
