'use client'

import { useState, useEffect, useCallback } from 'react'

type Lang = 'ar' | 'en' | 'ru' | 'zh'

const tr: Record<Lang, Record<string, string>> = {
  ar: {
    title: '🔧 تشخيص النظام',
    subtitle: 'مراقبة وإصلاح جميع مكونات VRBOT',
    refresh: '🔄 تحديث',
    loading: 'جاري التحميل...',
    hubStatus: '🌐 حالة Hub',
    online: 'متصل',
    offline: 'غير متصل',
    stats: '📊 إحصائيات عامة',
    users: 'المستخدمين',
    farms: 'المزارع',
    activeFarms: 'مزارع نشطة',
    activeSubs: 'اشتراكات فعّالة',
    tokensUsed: 'توكنز مستخدمة',
    tokensTotal: 'إجمالي التوكنز',
    farmsList: '🏠 المزارع',
    tokensList: '🪙 التوكنز',
    subsList: '💳 الاشتراكات',
    usersList: '👥 المستخدمين',
    email: 'البريد',
    name: 'الاسم',
    server: 'السيرفر',
    status: 'الحالة',
    botEnabled: 'البوت',
    lastActivity: 'آخر نشاط',
    actions: 'إجراءات',
    total: 'الإجمالي',
    used: 'المستخدم',
    remaining: 'المتبقي',
    trial: 'تجريبي',
    plan: 'الخطة',
    expires: 'ينتهي',
    source: 'المصدر',
    created: 'التسجيل',
    lastLogin: 'آخر دخول',
    disable: '⛔ تعطيل',
    enable: '✅ تفعيل',
    delete: '🗑️ حذف',
    resetTokens: '🔄 إعادة تعيين',
    cancelSub: '❌ إلغاء',
    confirmDelete: 'هل أنت متأكد من الحذف؟',
    success: '✅ تم بنجاح',
    error: '❌ خطأ',
    connections: 'الاتصالات',
    agents: 'الوكلاء',
    dashboards: 'لوحات التحكم',
    uptime: 'مدة التشغيل',
    errors: '⚠️ أخطاء',
    noErrors: 'لا توجد أخطاء',
    hubHealth: 'فحص Hub',
    yes: 'نعم',
    no: 'لا',
  },
  en: {
    title: '🔧 System Diagnostics',
    subtitle: 'Monitor and fix all VRBOT components',
    refresh: '🔄 Refresh',
    loading: 'Loading...',
    hubStatus: '🌐 Hub Status',
    online: 'Online',
    offline: 'Offline',
    stats: '📊 Overview',
    users: 'Users',
    farms: 'Farms',
    activeFarms: 'Active Farms',
    activeSubs: 'Active Subs',
    tokensUsed: 'Tokens Used',
    tokensTotal: 'Total Tokens',
    farmsList: '🏠 Farms',
    tokensList: '🪙 Tokens',
    subsList: '💳 Subscriptions',
    usersList: '👥 Users',
    email: 'Email',
    name: 'Name',
    server: 'Server',
    status: 'Status',
    botEnabled: 'Bot',
    lastActivity: 'Last Activity',
    actions: 'Actions',
    total: 'Total',
    used: 'Used',
    remaining: 'Remaining',
    trial: 'Trial',
    plan: 'Plan',
    expires: 'Expires',
    source: 'Source',
    created: 'Created',
    lastLogin: 'Last Login',
    disable: '⛔ Disable',
    enable: '✅ Enable',
    delete: '🗑️ Delete',
    resetTokens: '🔄 Reset',
    cancelSub: '❌ Cancel',
    confirmDelete: 'Are you sure you want to delete?',
    success: '✅ Success',
    error: '❌ Error',
    connections: 'Connections',
    agents: 'Agents',
    dashboards: 'Dashboards',
    uptime: 'Uptime',
    errors: '⚠️ Errors',
    noErrors: 'No errors',
    hubHealth: 'Hub Check',
    yes: 'Yes',
    no: 'No',
  },
  ru: {
    title: '🔧 Диагностика системы',
    subtitle: 'Мониторинг и исправление компонентов VRBOT',
    refresh: '🔄 Обновить',
    loading: 'Загрузка...',
    hubStatus: '🌐 Статус Hub',
    online: 'Онлайн',
    offline: 'Офлайн',
    stats: '📊 Обзор',
    users: 'Пользователи',
    farms: 'Фермы',
    activeFarms: 'Активные фермы',
    activeSubs: 'Активные подписки',
    tokensUsed: 'Использовано токенов',
    tokensTotal: 'Всего токенов',
    farmsList: '🏠 Фермы',
    tokensList: '🪙 Токены',
    subsList: '💳 Подписки',
    usersList: '👥 Пользователи',
    email: 'Email',
    name: 'Имя',
    server: 'Сервер',
    status: 'Статус',
    botEnabled: 'Бот',
    lastActivity: 'Активность',
    actions: 'Действия',
    total: 'Всего',
    used: 'Использовано',
    remaining: 'Остаток',
    trial: 'Пробный',
    plan: 'План',
    expires: 'Истекает',
    source: 'Источник',
    created: 'Создан',
    lastLogin: 'Последний вход',
    disable: '⛔ Отключить',
    enable: '✅ Включить',
    delete: '🗑️ Удалить',
    resetTokens: '🔄 Сброс',
    cancelSub: '❌ Отмена',
    confirmDelete: 'Вы уверены что хотите удалить?',
    success: '✅ Успешно',
    error: '❌ Ошибка',
    connections: 'Соединения',
    agents: 'Агенты',
    dashboards: 'Панели',
    uptime: 'Время работы',
    errors: '⚠️ Ошибки',
    noErrors: 'Нет ошибок',
    hubHealth: 'Проверка Hub',
    yes: 'Да',
    no: 'Нет',
  },
  zh: {
    title: '🔧 系统诊断',
    subtitle: '监控和修复VRBOT所有组件',
    refresh: '🔄 刷新',
    loading: '加载中...',
    hubStatus: '🌐 Hub状态',
    online: '在线',
    offline: '离线',
    stats: '📊 概览',
    users: '用户',
    farms: '农场',
    activeFarms: '活跃农场',
    activeSubs: '活跃订阅',
    tokensUsed: '已用令牌',
    tokensTotal: '总令牌',
    farmsList: '🏠 农场',
    tokensList: '🪙 令牌',
    subsList: '💳 订阅',
    usersList: '👥 用户',
    email: '邮箱',
    name: '名称',
    server: '服务器',
    status: '状态',
    botEnabled: '机器人',
    lastActivity: '最后活动',
    actions: '操作',
    total: '总计',
    used: '已用',
    remaining: '剩余',
    trial: '试用',
    plan: '计划',
    expires: '到期',
    source: '来源',
    created: '创建',
    lastLogin: '最后登录',
    disable: '⛔ 禁用',
    enable: '✅ 启用',
    delete: '🗑️ 删除',
    resetTokens: '🔄 重置',
    cancelSub: '❌ 取消',
    confirmDelete: '确定要删除吗？',
    success: '✅ 成功',
    error: '❌ 错误',
    connections: '连接',
    agents: '代理',
    dashboards: '仪表板',
    uptime: '运行时间',
    errors: '⚠️ 错误',
    noErrors: '无错误',
    hubHealth: 'Hub检查',
    yes: '是',
    no: '否',
  },
}

export default function DiagnosticsPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [actionErr, setActionErr] = useState('')
  const [activeTab, setActiveTab] = useState<'farms' | 'tokens' | 'subs' | 'users'>('farms')

  const tx = tr[lang]
  const isRtl = lang === 'ar'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/diagnostics')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setActionErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const stored = localStorage.getItem('vrbot-lang') as Lang
    if (stored && tr[stored]) setLang(stored)
  }, [fetchData])

  async function doAction(action: string, params: Record<string, string> = {}) {
    setActionMsg('')
    setActionErr('')
    try {
      const res = await fetch('/api/admin/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      })
      const json = await res.json()
      if (json.error) setActionErr(json.error)
      else {
        setActionMsg(json.message || tx.success)
        await fetchData()
      }
    } catch (e: any) {
      setActionErr(e.message)
    }
  }

  function timeAgo(dateStr: string) {
    if (!dateStr) return '—'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  function shortDate(dateStr: string) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  // Styles
  const page: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0a0a0f',
    color: '#e0e0e0',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    padding: '24px',
    direction: isRtl ? 'rtl' : 'ltr',
  }

  const card: React.CSSProperties = {
    background: '#141420',
    border: '1px solid #2a2a3a',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  }

  const statCard = (color: string): React.CSSProperties => ({
    background: `linear-gradient(135deg, ${color}15, ${color}08)`,
    border: `1px solid ${color}30`,
    borderRadius: '10px',
    padding: '16px',
    textAlign: 'center' as const,
    flex: '1',
    minWidth: '140px',
  })

  const btnBase: React.CSSProperties = {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    transition: 'all 0.2s',
  }

  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    background: '#3b82f6',
    color: '#fff',
  }

  const btnDanger: React.CSSProperties = {
    ...btnBase,
    background: '#ef4444',
    color: '#fff',
  }

  const btnSuccess: React.CSSProperties = {
    ...btnBase,
    background: '#22c55e',
    color: '#fff',
  }

  const btnWarning: React.CSSProperties = {
    ...btnBase,
    background: '#f59e0b',
    color: '#000',
  }

  const tab = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    background: active ? '#3b82f6' : '#1a1a2e',
    color: active ? '#fff' : '#888',
    border: active ? '1px solid #3b82f6' : '1px solid #2a2a3a',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: active ? 700 : 400,
    transition: 'all 0.2s',
  })

  const th: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid #2a2a3a',
    textAlign: isRtl ? 'right' : 'left',
    fontSize: '12px',
    color: '#888',
    fontWeight: 600,
    textTransform: 'uppercase',
  }

  const td: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid #1a1a2a',
    fontSize: '13px',
  }

  const badge = (color: string, bg: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color,
    background: bg,
  })

  if (loading && !data) {
    return (
      <div style={{ ...page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '20px', color: '#888' }}>{tx.loading}</div>
      </div>
    )
  }

  const hub = data?.hub ?? {}
  const stats = data?.stats ?? {}
  const hubOnline = !hub.error && hub.status !== 'offline'

  return (
    <div style={page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {tx.title}
          </h1>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: '14px' }}>{tx.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={lang}
            onChange={(e) => { setLang(e.target.value as Lang); localStorage.setItem('vrbot-lang', e.target.value) }}
            style={{ padding: '8px 12px', background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '6px', color: '#e0e0e0', fontSize: '13px' }}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="zh">中文</option>
          </select>
          <button onClick={fetchData} style={btnPrimary} disabled={loading}>
            {loading ? '⏳' : tx.refresh}
          </button>
        </div>
      </div>

      {/* Messages */}
      {actionMsg && (
        <div style={{ ...card, background: '#052e16', borderColor: '#22c55e40', color: '#4ade80', padding: '12px 16px' }}>
          {tx.success}: {actionMsg}
        </div>
      )}
      {actionErr && (
        <div style={{ ...card, background: '#2a0a0a', borderColor: '#ef444440', color: '#f87171', padding: '12px 16px' }}>
          {tx.error}: {actionErr}
        </div>
      )}

      {/* Hub Status */}
      <div style={{ ...card, borderColor: hubOnline ? '#22c55e40' : '#ef444440' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>{tx.hubStatus}</h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%',
              background: hubOnline ? '#22c55e' : '#ef4444',
              boxShadow: hubOnline ? '0 0 12px #22c55e80' : '0 0 12px #ef444480',
              animation: hubOnline ? 'pulse 2s infinite' : 'none',
            }} />
            <span style={{ fontWeight: 700, fontSize: '16px', color: hubOnline ? '#4ade80' : '#f87171' }}>
              {hubOnline ? tx.online : tx.offline}
            </span>
          </div>
          {hubOnline && hub.connections !== undefined && (
            <>
              <div>
                <span style={{ color: '#888', fontSize: '12px' }}>{tx.connections}: </span>
                <span style={{ fontWeight: 700 }}>{hub.connections ?? 0}</span>
              </div>
              {hub.agents !== undefined && (
                <div>
                  <span style={{ color: '#888', fontSize: '12px' }}>{tx.agents}: </span>
                  <span style={{ fontWeight: 700, color: '#3b82f6' }}>{hub.agents}</span>
                </div>
              )}
              {hub.dashboards !== undefined && (
                <div>
                  <span style={{ color: '#888', fontSize: '12px' }}>{tx.dashboards}: </span>
                  <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{hub.dashboards}</span>
                </div>
              )}
              {hub.uptime && (
                <div>
                  <span style={{ color: '#888', fontSize: '12px' }}>{tx.uptime}: </span>
                  <span style={{ fontWeight: 700 }}>{hub.uptime}</span>
                </div>
              )}
            </>
          )}
          {hub.error && (
            <div style={{ color: '#f87171', fontSize: '13px' }}>
              {hub.error}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={statCard('#3b82f6')}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#3b82f6' }}>{stats.totalUsers}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{tx.users}</div>
        </div>
        <div style={statCard('#8b5cf6')}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6' }}>{stats.totalFarms}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{tx.farms}</div>
        </div>
        <div style={statCard('#22c55e')}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e' }}>{stats.activeFarms}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{tx.activeFarms}</div>
        </div>
        <div style={statCard('#f59e0b')}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{stats.activeSubs}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{tx.activeSubs}</div>
        </div>
        <div style={statCard('#06b6d4')}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#06b6d4' }}>{stats.totalTokensUsed}/{stats.totalTokensAvail}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{tx.tokensUsed}/{tx.tokensTotal}</div>
        </div>
      </div>

      {/* Errors */}
      {data?.errors && Object.values(data.errors).some(Boolean) && (
        <div style={{ ...card, borderColor: '#ef444440', background: '#1a0a0a' }}>
          <h3 style={{ margin: '0 0 8px', color: '#f87171' }}>{tx.errors}</h3>
          {Object.entries(data.errors).filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ fontSize: '13px', color: '#f87171' }}>• {k}: {v as string}</div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
        <div style={tab(activeTab === 'farms')} onClick={() => setActiveTab('farms')}>{tx.farmsList} ({data?.farms?.length ?? 0})</div>
        <div style={tab(activeTab === 'tokens')} onClick={() => setActiveTab('tokens')}>{tx.tokensList} ({data?.tokens?.length ?? 0})</div>
        <div style={tab(activeTab === 'subs')} onClick={() => setActiveTab('subs')}>{tx.subsList} ({data?.subscriptions?.length ?? 0})</div>
        <div style={tab(activeTab === 'users')} onClick={() => setActiveTab('users')}>{tx.usersList} ({data?.users?.length ?? 0})</div>
      </div>

      {/* Tab Content */}
      <div style={{ ...card, borderTopLeftRadius: 0, marginTop: 0, overflowX: 'auto' }}>
        {/* Farms Table */}
        {activeTab === 'farms' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>{tx.email}</th>
                <th style={th}>{tx.name}</th>
                <th style={th}>{tx.server}</th>
                <th style={th}>{tx.botEnabled}</th>
                <th style={th}>{tx.status}</th>
                <th style={th}>{tx.lastActivity}</th>
                <th style={th}>{tx.actions}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.farms ?? []).map((f: any) => (
                <tr key={f.id} style={{ transition: 'background 0.2s' }}>
                  <td style={td}><span style={{ fontSize: '12px' }}>{f.email}</span></td>
                  <td style={{ ...td, fontWeight: 600 }}>{f.name}</td>
                  <td style={td}>{f.server || '—'}</td>
                  <td style={td}>
                    <span style={f.bot_enabled ? badge('#22c55e', '#052e16') : badge('#888', '#1a1a2a')}>
                      {f.bot_enabled ? tx.yes : tx.no}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={badge(
                      f.bot_status === 'running' ? '#3b82f6' : f.bot_status === 'error' ? '#ef4444' : '#888',
                      f.bot_status === 'running' ? '#1e3a5f' : f.bot_status === 'error' ? '#2a0a0a' : '#1a1a2a'
                    )}>
                      {f.bot_status || 'idle'}
                    </span>
                  </td>
                  <td style={{ ...td, fontSize: '12px', color: '#888' }}>{timeAgo(f.last_bot_activity)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {f.bot_enabled ? (
                        <button style={btnWarning} onClick={() => doAction('disable_farm', { farmId: f.id })}>
                          {tx.disable}
                        </button>
                      ) : (
                        <button style={btnSuccess} onClick={() => doAction('enable_farm', { farmId: f.id })}>
                          {tx.enable}
                        </button>
                      )}
                      <button style={btnDanger} onClick={() => {
                        if (confirm(tx.confirmDelete)) doAction('delete_farm', { farmId: f.id })
                      }}>
                        {tx.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.farms || data.farms.length === 0) && (
                <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#666' }}>—</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Tokens Table */}
        {activeTab === 'tokens' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>{tx.email}</th>
                <th style={th}>{tx.total}</th>
                <th style={th}>{tx.used}</th>
                <th style={th}>{tx.remaining}</th>
                <th style={th}>{tx.trial}</th>
                <th style={th}>{tx.actions}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.tokens ?? []).map((t: any) => (
                <tr key={t.user_id}>
                  <td style={td}><span style={{ fontSize: '12px' }}>{t.email}</span></td>
                  <td style={{ ...td, fontWeight: 700, color: '#3b82f6' }}>{t.tokens_total}</td>
                  <td style={{ ...td, fontWeight: 700, color: '#f59e0b' }}>{t.tokens_used}</td>
                  <td style={{ ...td, fontWeight: 700, color: '#22c55e' }}>{t.tokens_total - t.tokens_used}</td>
                  <td style={td}>
                    <span style={t.trial_granted ? badge('#f59e0b', '#2a1a00') : badge('#888', '#1a1a2a')}>
                      {t.trial_granted ? tx.yes : tx.no}
                    </span>
                  </td>
                  <td style={td}>
                    <button style={btnWarning} onClick={() => doAction('reset_tokens', { userId: t.user_id })}>
                      {tx.resetTokens}
                    </button>
                  </td>
                </tr>
              ))}
              {(!data?.tokens || data.tokens.length === 0) && (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#666' }}>—</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Subscriptions Table */}
        {activeTab === 'subs' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>{tx.email}</th>
                <th style={th}>{tx.plan}</th>
                <th style={th}>{tx.status}</th>
                <th style={th}>{tx.expires}</th>
                <th style={th}>{tx.source}</th>
                <th style={th}>{tx.actions}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.subscriptions ?? []).map((s: any) => {
                const isActive = s.status === 'active' && new Date(s.current_period_end) > new Date()
                const src = s.stripe_customer_id === 'admin_manual' ? 'Manual'
                  : s.pro_key_code ? 'Pro Key'
                  : s.stripe_customer_id?.startsWith('cus_') ? 'Stripe'
                  : 'PayPal'
                return (
                  <tr key={s.id}>
                    <td style={td}><span style={{ fontSize: '12px' }}>{s.email}</span></td>
                    <td style={{ ...td, fontWeight: 600 }}>{s.plan || '—'}</td>
                    <td style={td}>
                      <span style={isActive ? badge('#22c55e', '#052e16') : badge('#ef4444', '#2a0a0a')}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ ...td, fontSize: '12px' }}>{shortDate(s.current_period_end)}</td>
                    <td style={td}>
                      <span style={badge('#06b6d4', '#0a2a3a')}>{src}</span>
                    </td>
                    <td style={td}>
                      {isActive && (
                        <button style={btnDanger} onClick={() => doAction('cancel_subscription', { userId: s.user_id })}>
                          {tx.cancelSub}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {(!data?.subscriptions || data.subscriptions.length === 0) && (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#666' }}>—</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Users Table */}
        {activeTab === 'users' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>{tx.email}</th>
                <th style={th}>{tx.created}</th>
                <th style={th}>{tx.lastLogin}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.users ?? []).map((u: any) => (
                <tr key={u.id}>
                  <td style={td}>{u.email}</td>
                  <td style={{ ...td, fontSize: '12px', color: '#888' }}>{shortDate(u.created_at)}</td>
                  <td style={{ ...td, fontSize: '12px', color: '#888' }}>{timeAgo(u.last_sign_in)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Timestamp */}
      <div style={{ textAlign: 'center', color: '#444', fontSize: '12px', marginTop: '16px' }}>
        Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '—'}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        table tr:hover { background: #1a1a2e !important; }
        button:hover { opacity: 0.85; transform: scale(1.02); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 3px; }
      `}</style>
    </div>
  )
}
