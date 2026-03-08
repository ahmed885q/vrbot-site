'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Lang = 'ar' | 'en' | 'ru' | 'zh'
const t: Record<string, Record<Lang, string>> = {
  title:      { ar: 'حسابي', en: 'My Account', ru: 'Мой аккаунт', zh: '我的账户' },
  subtitle:   { ar: 'إدارة حسابك واشتراكك', en: 'Manage your account & subscription', ru: 'Управление аккаунтом', zh: '管理账户和订阅' },
  profile:    { ar: 'الملف الشخصي', en: 'Profile', ru: 'Профиль', zh: '个人资料' },
  email:      { ar: 'البريد الإلكتروني', en: 'Email', ru: 'Почта', zh: '邮箱' },
  name:       { ar: 'الاسم', en: 'Name', ru: 'Имя', zh: '姓名' },
  joined:     { ar: 'تاريخ التسجيل', en: 'Joined', ru: 'Зарегистрирован', zh: '注册时间' },
  sub:        { ar: 'الاشتراك', en: 'Subscription', ru: 'Подписка', zh: '订阅' },
  plan:       { ar: 'الخطة', en: 'Plan', ru: 'Тариф', zh: '方案' },
  farms:      { ar: 'المزارع', en: 'Farms', ru: 'Фермы', zh: '农场' },
  maxFarms:   { ar: 'الحد الأقصى', en: 'Max Farms', ru: 'Макс ферм', zh: '最大农场数' },
  nifling:    { ar: 'Nifling', en: 'Nifling', ru: 'Нифлинг', zh: 'Nifling' },
  enabled:    { ar: 'مفعّل', en: 'Enabled', ru: 'Включено', zh: '已启用' },
  disabled:   { ar: 'معطّل', en: 'Disabled', ru: 'Выключено', zh: '已禁用' },
  status:     { ar: 'الحالة', en: 'Status', ru: 'Статус', zh: '状态' },
  active:     { ar: 'نشط', en: 'Active', ru: 'Активен', zh: '活跃' },
  inactive:   { ar: 'غير نشط', en: 'Inactive', ru: 'Неактивен', zh: '非活跃' },
  security:   { ar: 'الأمان', en: 'Security', ru: 'Безопасность', zh: '安全' },
  changePwd:  { ar: 'تغيير كلمة المرور', en: 'Change Password', ru: 'Сменить пароль', zh: '修改密码' },
  apiKey:     { ar: 'مفتاح API', en: 'API Key', ru: 'API ключ', zh: 'API密钥' },
  copy:       { ar: 'نسخ', en: 'Copy', ru: 'Копировать', zh: '复制' },
  copied:     { ar: 'تم النسخ!', en: 'Copied!', ru: 'Скопировано!', zh: '已复制!' },
  save:       { ar: 'حفظ', en: 'Save', ru: 'Сохранить', zh: '保存' },
  saved:      { ar: 'تم الحفظ!', en: 'Saved!', ru: 'Сохранено!', zh: '已保存!' },
  loading:    { ar: 'جاري التحميل...', en: 'Loading...', ru: 'Загрузка...', zh: '加载中...' },
  payments:   { ar: 'سجل الدفع', en: 'Payment History', ru: 'История платежей', zh: '付款记录' },
  amount:     { ar: 'المبلغ', en: 'Amount', ru: 'Сумма', zh: '金额' },
  date:       { ar: 'التاريخ', en: 'Date', ru: 'Дата', zh: '日期' },
  noPayments: { ar: 'لا توجد مدفوعات', en: 'No payments yet', ru: 'Нет платежей', zh: '暂无付款记录' },
  upgrade:    { ar: 'ترقية الخطة', en: 'Upgrade Plan', ru: 'Улучшить тариф', zh: '升级方案' },
}

const s = {
  page: { padding: '24px', direction: 'rtl' as const, fontFamily: 'system-ui, sans-serif', color: '#cbd5e1', maxWidth: '800px', margin: '0 auto' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#818cf8', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  card: { background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: 600, color: '#e2e8f0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #334155', alignItems: 'center' },
  label: { color: '#94a3b8', fontSize: '14px' },
  value: { color: '#e2e8f0', fontWeight: 600, fontSize: '14px' },
  input: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '14px', width: '100%' },
  btn: (bg: string) => ({ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff', background: bg }),
  badge: (c: string) => ({ display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: '#fff', background: c }),
  apiBox: { display: 'flex', gap: '8px', alignItems: 'center', background: '#0f172a', borderRadius: '8px', padding: '8px 12px' },
  apiText: { fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8', flex: 1, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const },
  langRow: { display: 'flex', gap: '6px', marginBottom: '16px' },
  langBtn: (a: boolean) => ({ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', background: a ? '#818cf8' : '#334155', color: '#fff' }),
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { padding: '10px 8px', textAlign: 'right' as const, borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 600 },
  td: { padding: '10px 8px', textAlign: 'right' as const, borderBottom: '1px solid #1e293b' },
}

const planColors: Record<string, string> = { free: '#64748b', ldplayer: '#3b82f6', cloud: '#a855f7' }

export default function AccountPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [editName, setEditName] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClientComponentClient()
  const L = (k: string) => t[k]?.[lang] || t[k]?.['en'] || k

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          // Fetch profile
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
          setProfile(prof)
          setEditName(prof?.name || prof?.full_name || '')
          // Fetch subscription
          const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
          setSubscription(sub)
          // Fetch payments
          const { data: pays } = await supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
          setPayments(pays || [])
        }
      } catch { }
      setLoading(false)
    }
    load()
  }, [supabase])

  const handleSave = async () => {
    if (!user) return
    await supabase.from('profiles').upsert({ id: user.id, name: editName })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div style={{ ...s.card, textAlign: 'center', margin: '40px' }}>{L('loading')}</div>

  return (
    <div style={s.page}>
      {/* Lang switcher */}
      <div style={s.langRow}>
        {(['ar','en','ru','zh'] as Lang[]).map(l => (
          <button key={l} style={s.langBtn(lang === l)} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
        ))}
      </div>

      <div style={s.header}>
        <h1 style={s.title}>👤 {L('title')}</h1>
        <p style={s.subtitle}>{L('subtitle')}</p>
      </div>

      {/* Profile */}
      <div style={s.card}>
        <div style={s.cardTitle}>📋 {L('profile')}</div>
        <div style={s.row}>
          <span style={s.label}>{L('email')}</span>
          <span style={s.value}>{user?.email || '—'}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>{L('name')}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input style={{ ...s.input, width: '200px' }} value={editName} onChange={e => setEditName(e.target.value)} />
            <button style={s.btn(saved ? '#22c55e' : '#6366f1')} onClick={handleSave}>
              {saved ? L('saved') : L('save')}
            </button>
          </div>
        </div>
        <div style={s.row}>
          <span style={s.label}>{L('joined')}</span>
          <span style={s.value}>{user?.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA') : '—'}</span>
        </div>
      </div>

      {/* Subscription */}
      <div style={s.card}>
        <div style={s.cardTitle}>💳 {L('sub')}</div>
        <div style={s.row}>
          <span style={s.label}>{L('plan')}</span>
          <span style={s.badge(planColors[subscription?.plan] || '#64748b')}>
            {subscription?.plan?.toUpperCase() || 'FREE'}
          </span>
        </div>
        <div style={s.row}>
          <span style={s.label}>{L('farms')}</span>
          <span style={s.value}>{subscription?.current_farms || 0}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>{L('maxFarms')}</span>
          <span style={s.value}>{subscription?.max_farms || 1}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>{L('nifling')}</span>
          <span style={s.badge(subscription?.nifling_enabled ? '#22c55e' : '#64748b')}>
            {subscription?.nifling_enabled ? L('enabled') : L('disabled')}
          </span>
        </div>
        <div style={s.row}>
          <span style={s.label}>{L('status')}</span>
          <span style={s.badge(subscription?.status === 'active' ? '#22c55e' : '#f59e0b')}>
            {subscription?.status === 'active' ? L('active') : L('inactive')}
          </span>
        </div>
        <div style={{ marginTop: '16px' }}>
          <a href="/billing" style={{ ...s.btn('#6366f1'), textDecoration: 'none', display: 'inline-block' }}>{L('upgrade')} →</a>
        </div>
      </div>

      {/* Security */}
      <div style={s.card}>
        <div style={s.cardTitle}>🔒 {L('security')}</div>
        {profile?.api_key && (
          <div style={s.row}>
            <span style={s.label}>{L('apiKey')}</span>
            <div style={s.apiBox}>
              <span style={s.apiText}>{profile.api_key}</span>
              <button style={s.btn(copied ? '#22c55e' : '#334155')} onClick={() => handleCopy(profile.api_key)}>
                {copied ? L('copied') : L('copy')}
              </button>
            </div>
          </div>
        )}
        <div style={{ marginTop: '12px' }}>
          <a href="/reset-password" style={{ ...s.btn('#334155'), textDecoration: 'none', display: 'inline-block' }}>
            🔑 {L('changePwd')}
          </a>
        </div>
      </div>

      {/* Payment History */}
      <div style={s.card}>
        <div style={s.cardTitle}>📜 {L('payments')}</div>
        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>{L('noPayments')}</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>{L('date')}</th>
                <th style={s.th}>{L('amount')}</th>
                <th style={s.th}>{L('plan')}</th>
                <th style={s.th}>{L('farms')}</th>
                <th style={s.th}>{L('status')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i}>
                  <td style={s.td}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</td>
                  <td style={s.td}>${p.amount}</td>
                  <td style={s.td}>{p.plan}</td>
                  <td style={s.td}>{p.farm_count}</td>
                  <td style={s.td}><span style={s.badge(p.status === 'completed' ? '#22c55e' : '#f59e0b')}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
