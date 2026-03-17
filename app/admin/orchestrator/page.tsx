'use client'
import { useState, useEffect, useCallback } from 'react'

type Lang = 'ar' | 'en' | 'ru' | 'zh'

const tx: Record<Lang, Record<string, string>> = {
  ar: {
    title: 'جدولة الدُفعات - مراقبة السيرفر',
    status: 'حالة السيرفر',
    online: 'متصل',
    offline: 'غير متصل',
    running: 'يعمل',
    stopped: 'متوقف',
    totalFarms: 'إجمالي المزارع',
    enabledFarms: 'المزارع النشطة',
    runningFarms: 'المزارع العاملة',
    idleFarms: 'المزارع الخاملة',
    errorFarms: 'المزارع بأخطاء',
    farmingDue: 'مزارع بحاجة للعمل',
    dailyDue: 'مهام يومية',
    niflingQueued: 'Nifling في الانتظار',
    tasksToday: 'المهام اليوم',
    customers: 'العملاء',
    activeCustomers: 'عملاء نشطين',
    scheduler: 'المُجدول',
    start: 'تشغيل',
    stop: 'إيقاف',
    refresh: 'تحديث',
    autoRefresh: 'تحديث تلقائي',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    serverInfo: 'معلومات السيرفر',
    farmsList: 'قائمة المزارع',
    farmId: 'رقم المزرعة',
    customerId: 'رقم العميل',
    farmStatus: 'الحالة',
    noData: 'لا توجد بيانات',
    lastUpdated: 'آخر تحديث',
    batchStatus: 'حالة الدُفعة الحالية',
    cycleType: 'نوع الدورة',
    progress: 'التقدم',
    batchNum: 'رقم الدفعة',
    farmsInBatch: 'المزارع في الدفعة',
    completed: 'مكتمل',
    failed: 'فشل',
  },
  en: {
    title: 'Batch Scheduler - Server Monitor',
    status: 'Server Status',
    online: 'Online',
    offline: 'Offline',
    running: 'Running',
    stopped: 'Stopped',
    totalFarms: 'Total Farms',
    enabledFarms: 'Enabled Farms',
    runningFarms: 'Running Farms',
    idleFarms: 'Idle Farms',
    errorFarms: 'Error Farms',
    farmingDue: 'Farming Due',
    dailyDue: 'Daily Due',
    niflingQueued: 'Nifling Queued',
    tasksToday: 'Tasks Today',
    customers: 'Customers',
    activeCustomers: 'Active Customers',
    scheduler: 'Scheduler',
    start: 'Start',
    stop: 'Stop',
    refresh: 'Refresh',
    autoRefresh: 'Auto Refresh',
    loading: 'Loading...',
    error: 'Error',
    serverInfo: 'Server Info',
    farmsList: 'Farms List',
    farmId: 'Farm ID',
    customerId: 'Customer ID',
    farmStatus: 'Status',
    noData: 'No data',
    lastUpdated: 'Last Updated',
    batchStatus: 'Current Batch Status',
    cycleType: 'Cycle Type',
    progress: 'Progress',
    batchNum: 'Batch #',
    farmsInBatch: 'Farms in Batch',
    completed: 'Completed',
    failed: 'Failed',
  },
  ru: {
    title: 'Планировщик - Мониторинг сервера',
    status: 'Статус сервера',
    online: 'Онлайн',
    offline: 'Офлайн',
    running: 'Работает',
    stopped: 'Остановлен',
    totalFarms: 'Всего ферм',
    enabledFarms: 'Активных ферм',
    runningFarms: 'Работающих',
    idleFarms: 'Простаивающих',
    errorFarms: 'С ошибками',
    farmingDue: 'Ожидают фарминг',
    dailyDue: 'Ежедневные',
    niflingQueued: 'Нифлинг в очереди',
    tasksToday: 'Задач сегодня',
    customers: 'Клиенты',
    activeCustomers: 'Активных',
    scheduler: 'Планировщик',
    start: 'Запуск',
    stop: 'Стоп',
    refresh: 'Обновить',
    autoRefresh: 'Автообновление',
    loading: 'Загрузка...',
    error: 'Ошибка',
    serverInfo: 'Информация о сервере',
    farmsList: 'Список ферм',
    farmId: '# Фермы',
    customerId: '# Клиента',
    farmStatus: 'Статус',
    noData: 'Нет данных',
    lastUpdated: 'Обновлено',
    batchStatus: 'Текущий батч',
    cycleType: 'Тип цикла',
    progress: 'Прогресс',
    batchNum: 'Батч #',
    farmsInBatch: 'Ферм в батче',
    completed: 'Завершено',
    failed: 'Ошибки',
  },
  zh: {
    title: '批次调度 - 服务器监控',
    status: '服务器状态',
    online: '在线',
    offline: '离线',
    running: '运行中',
    stopped: '已停止',
    totalFarms: '总农场',
    enabledFarms: '已启用',
    runningFarms: '运行中',
    idleFarms: '空闲',
    errorFarms: '错误',
    farmingDue: '待执行',
    dailyDue: '每日任务',
    niflingQueued: '排队中',
    tasksToday: '今日任务',
    customers: '客户',
    activeCustomers: '活跃客户',
    scheduler: '调度器',
    start: '启动',
    stop: '停止',
    refresh: '刷新',
    autoRefresh: '自动刷新',
    loading: '加载中...',
    error: '错误',
    serverInfo: '服务器信息',
    farmsList: '农场列表',
    farmId: '农场ID',
    customerId: '客户ID',
    farmStatus: '状态',
    noData: '无数据',
    lastUpdated: '最后更新',
    batchStatus: '当前批次状态',
    cycleType: '周期类型',
    progress: '进度',
    batchNum: '批次 #',
    farmsInBatch: '批次中的农场',
    completed: '已完成',
    failed: '失败',
  },
}

export default function OrchestratorPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [loading, setLoading] = useState(true)
  const [serverStatus, setServerStatus] = useState<any>(null)
  const [farms, setFarms] = useState<any[]>([])
  const [batchStatus, setBatchStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const s = tx[lang]
  const isRtl = lang === 'ar'

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vrbot_lang') as Lang
      if (saved && tx[saved]) setLang(saved)
    } catch {}
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [statusRes, farmsRes] = await Promise.allSettled([
        fetch('/api/cloud/status'),
        fetch('/api/cloud/farms'),
      ])

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const data = await statusRes.value.json()
        setServerStatus(data)
      } else {
        setServerStatus(null)
        setError('Cloud server unreachable')
      }

      if (farmsRes.status === 'fulfilled' && farmsRes.value.ok) {
        const data = await farmsRes.value.json()
        setFarms(data.farms || [])
      }

      // Try batch status
      try {
        const batchRes = await fetch('/api/cloud/status')
        if (batchRes.ok) {
          const d = await batchRes.json()
          if (d.ok) setBatchStatus(d)
        }
      } catch {}

      setLastUpdated(new Date())
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
      setServerStatus(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  async function handleSchedulerAction(action: 'start' | 'stop') {
    setActionLoading(true)
    try {
      await fetch('/api/cloud/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      await fetchData()
    } catch {}
    setActionLoading(false)
  }

  const isOnline = serverStatus && serverStatus.ok
  const isRunning = isOnline && serverStatus.running

  function statBox(label: string, value: any, color: string, icon: string) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px 16px', border: `1px solid ${color}20`, minWidth: 120 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2 }}>{value ?? '-'}</div>
          </div>
          <span style={{ fontSize: 20, opacity: 0.4 }}>{icon}</span>
        </div>
      </div>
    )
  }

  function farmStatusColor(st: string) {
    if (st === 'running' || st === 'active') return '#10b981'
    if (st === 'error') return '#ef4444'
    if (st === 'idle') return '#64748b'
    if (st === 'provisioning') return '#f59e0b'
    return '#94a3b8'
  }

  if (loading) {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
        <div>{s.loading}</div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ color: '#cbd5e1', fontFamily: 'Segoe UI, sans-serif' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}button:hover{opacity:.85}`}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>📦 {s.title}</h1>
          {lastUpdated && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              {s.lastUpdated}: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Auto refresh toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={() => setAutoRefresh(!autoRefresh)} style={{ accentColor: '#6366f1' }} />
            {s.autoRefresh}
          </label>
          <button onClick={fetchData} style={{ padding: '8px 16px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🔄 {s.refresh}
          </button>
        </div>
      </div>

      {/* SERVER STATUS BANNER */}
      <div style={{
        background: isOnline ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
        borderRadius: 14,
        padding: '16px 20px',
        border: `1px solid ${isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: isOnline ? '#10b981' : '#ef4444',
            boxShadow: isOnline ? '0 0 12px rgba(16,185,129,0.5)' : '0 0 12px rgba(239,68,68,0.5)',
            animation: 'pulse 2s infinite',
          }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: isOnline ? '#10b981' : '#ef4444' }}>
              {s.status}: {isOnline ? s.online : s.offline}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {s.scheduler}: {isRunning ? s.running : s.stopped}
              {isOnline && ` | cloud.vrbot.me → 65.109.214.187:8080`}
            </div>
          </div>
        </div>
        {error && (
          <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '6px 12px', borderRadius: 6 }}>
            {s.error}: {error}
          </div>
        )}
      </div>

      {/* STATS GRID */}
      {isOnline && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24, animation: 'fadeIn 0.3s ease' }}>
          {statBox(s.totalFarms, serverStatus.total_farms, '#06b6d4', '🌾')}
          {statBox(s.enabledFarms, serverStatus.enabled_farms, '#10b981', '✅')}
          {statBox(s.runningFarms, serverStatus.running_farms, '#3b82f6', '🔄')}
          {statBox(s.idleFarms, serverStatus.idle_farms, '#64748b', '⏸️')}
          {statBox(s.errorFarms, serverStatus.error_farms, '#ef4444', '❌')}
          {statBox(s.farmingDue, serverStatus.farming_due, '#f59e0b', '📋')}
          {statBox(s.dailyDue, serverStatus.daily_due, '#a78bfa', '📅')}
          {statBox(s.niflingQueued, serverStatus.nifling_queued, '#ec4899', '⚡')}
          {statBox(s.tasksToday, serverStatus.total_tasks_today, '#06b6d4', '📊')}
          {statBox(s.customers, serverStatus.total_customers, '#10b981', '👥')}
          {statBox(s.activeCustomers, serverStatus.active_customers, '#3b82f6', '🟢')}
        </div>
      )}

      {/* FARMS TABLE */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#fff' }}>🌾 {s.farmsList}</h2>
        {farms.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '32px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>{s.noData}</div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', s.farmId, 'Name', 'Server', s.farmStatus, 'Cloud', 'Created'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {farms.map((f: any, i: number) => (
                  <tr key={f.id || i} style={{ animation: `fadeIn ${0.1 + i * 0.03}s ease` }}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{i + 1}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>{f.cloud_farm_id || f.id?.substring(0, 8)}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 13, color: '#fff', fontWeight: 600 }}>{f.name}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{f.server || '-'}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        color: farmStatusColor(f.cloud?.status || f.cloud_status || 'idle'),
                        background: farmStatusColor(f.cloud?.status || f.cloud_status || 'idle') + '15',
                      }}>
                        {f.cloud?.status || f.cloud_status || 'idle'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      {f.cloud?.online ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.15)' }}>
                          ☁️ Connected
                        </span>
                      ) : f.cloud_status === 'provisioning' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.15)' }}>
                          ⏳ Provisioning
                        </span>
                      ) : f.cloud_status === 'cloud_error' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.15)' }}>
                          ⚠️ Error
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>💻 Local</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                      {f.created_at ? new Date(f.created_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
