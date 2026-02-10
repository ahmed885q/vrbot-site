'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Lang = 'ar' | 'en' | 'ru' | 'zh'

const tr: Record<Lang, Record<string, string>> = {
  ar: {
    title: '🏠 لوحة الإدارة',
    subtitle: 'مرحباً بك في لوحة تحكم VRBOT',
    subs: 'إدارة الاشتراكات',
    subsDesc: 'تفعيل وإيقاف وتمديد اشتراكات المستخدمين',
    proKeys: 'مفاتيح Pro',
    proKeysDesc: 'إنشاء وإدارة مفاتيح التفعيل',
    licenses: 'التراخيص',
    licensesDesc: 'عرض حالة التراخيص المستخدمة',
    earlyAccess: 'الوصول المبكر',
    earlyAccessDesc: 'قائمة المسجلين للوصول المبكر',
    protection: 'الحماية',
    protectionDesc: 'إعدادات Anti-Detection والحماية',
    users: 'المستخدمون',
    usersDesc: 'إدارة أدوار المستخدمين',
    totalUsers: 'إجمالي المستخدمين',
    activeSubs: 'اشتراكات نشطة',
    revenue: 'الإيرادات',
    loading: 'جاري التحميل...',
  },
  en: {
    title: '🏠 Admin Dashboard',
    subtitle: 'Welcome to VRBOT Control Panel',
    subs: 'Subscriptions',
    subsDesc: 'Activate, deactivate and extend user subscriptions',
    proKeys: 'Pro Keys',
    proKeysDesc: 'Generate and manage activation keys',
    licenses: 'Licenses',
    licensesDesc: 'View license usage status',
    earlyAccess: 'Early Access',
    earlyAccessDesc: 'Early access registrations list',
    protection: 'Protection',
    protectionDesc: 'Anti-Detection & protection settings',
    users: 'Users',
    usersDesc: 'Manage user roles',
    totalUsers: 'Total Users',
    activeSubs: 'Active Subscriptions',
    revenue: 'Revenue',
    loading: 'Loading...',
  },
  ru: {
    title: '🏠 Панель администратора',
    subtitle: 'Добро пожаловать в панель управления VRBOT',
    subs: 'Подписки',
    subsDesc: 'Активация, деактивация и продление подписок',
    proKeys: 'Pro ключи',
    proKeysDesc: 'Генерация и управление ключами',
    licenses: 'Лицензии',
    licensesDesc: 'Статус использования лицензий',
    earlyAccess: 'Ранний доступ',
    earlyAccessDesc: 'Список зарегистрированных',
    protection: 'Защита',
    protectionDesc: 'Настройки Anti-Detection',
    users: 'Пользователи',
    usersDesc: 'Управление ролями',
    totalUsers: 'Всего пользователей',
    activeSubs: 'Активных подписок',
    revenue: 'Доход',
    loading: 'Загрузка...',
  },
  zh: {
    title: '🏠 管理面板',
    subtitle: '欢迎来到 VRBOT 控制面板',
    subs: '订阅管理',
    subsDesc: '激活、停用和延期用户订阅',
    proKeys: 'Pro密钥',
    proKeysDesc: '生成和管理激活密钥',
    licenses: '许可证',
    licensesDesc: '查看许可证使用状态',
    earlyAccess: '抢先体验',
    earlyAccessDesc: '抢先体验注册列表',
    protection: '防护',
    protectionDesc: 'Anti-Detection 和防护设置',
    users: '用户',
    usersDesc: '管理用户角色',
    totalUsers: '总用户',
    activeSubs: '活跃订阅',
    revenue: '收入',
    loading: '加载中...',
  },
}

type Stats = {
  totalUsers: number
  activeSubs: number
  totalKeys: number
}

export default function AdminOverviewPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const tx = tr[lang]
  const isRtl = lang === 'ar'

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vrbot_lang') as Lang
      if (saved && tr[saved]) setLang(saved)
    } catch {}
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  const cards = [
    { href: '/admin/subscriptions', icon: '⚡', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', title: tx.subs, desc: tx.subsDesc },
    { href: '/admin/pro-keys', icon: '🔑', color: '#d97706', bg: '#fffbeb', border: '#fde68a', title: tx.proKeys, desc: tx.proKeysDesc },
    { href: '/admin/licenses', icon: '📜', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', title: tx.licenses, desc: tx.licensesDesc },
    { href: '/admin/early-access', icon: '🚀', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', title: tx.earlyAccess, desc: tx.earlyAccessDesc },
    { href: '/admin/protection', icon: '🛡️', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', title: tx.protection, desc: tx.protectionDesc },
  ]

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{tx.title}</h1>
        <p style={{ color: '#64748b', margin: '8px 0 0', fontSize: '15px' }}>{tx.subtitle}</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={statCard}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{tx.totalUsers}</div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {loading ? '...' : stats?.totalUsers ?? '—'}
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{tx.activeSubs}</div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
            {loading ? '...' : stats?.activeSubs ?? '—'}
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{tx.proKeys}</div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {loading ? '...' : stats?.totalKeys ?? '—'}
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {cards.map((card) => (
          <Link key={card.href} href={card.href} style={{
            textDecoration: 'none',
            padding: '24px',
            borderRadius: '16px',
            background: card.bg,
            border: `2px solid ${card.border}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', flexShrink: 0, border: `1px solid ${card.border}`,
            }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: card.color }}>{card.title}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>{card.desc}</div>
            </div>
            <div style={{ marginInlineStart: 'auto', fontSize: '20px', color: card.color, opacity: 0.5, alignSelf: 'center' }}>→</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

const statCard: React.CSSProperties = {
  background: '#fff',
  borderRadius: '16px',
  padding: '20px 24px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}
