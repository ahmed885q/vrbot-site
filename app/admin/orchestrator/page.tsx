'use client'
import { useState, useEffect, useCallback } from 'react'

type Lang = 'ar' | 'en' | 'ru' | 'zh'

const tx: Record<Lang, Record<string, string>> = {
  ar: {
    title: 'Ø¬Ø¯ÙÙØ© Ø§ÙØ¯ÙÙØ¹Ø§Øª - ÙØ±Ø§ÙØ¨Ø© Ø§ÙØ³ÙØ±ÙØ±',
    status: 'Ø­Ø§ÙØ© Ø§ÙØ³ÙØ±ÙØ±',
    online: 'ÙØªØµÙ',
    offline: 'ØºÙØ± ÙØªØµÙ',
    running: 'ÙØ¹ÙÙ',
    stopped: 'ÙØªÙÙÙ',
    totalFarms: 'Ø¥Ø¬ÙØ§ÙÙ Ø§ÙÙØ²Ø§Ø±Ø¹',
    enabledFarms: 'Ø§ÙÙØ²Ø§Ø±Ø¹ Ø§ÙÙØ´Ø·Ø©',
    runningFarms: 'Ø§ÙÙØ²Ø§Ø±Ø¹ Ø§ÙØ¹Ø§ÙÙØ©',
    idleFarms: 'Ø§ÙÙØ²Ø§Ø±Ø¹ Ø§ÙØ®Ø§ÙÙØ©',
    errorFarms: 'Ø§ÙÙØ²Ø§Ø±Ø¹ Ø¨Ø£Ø®Ø·Ø§Ø¡',
    farmingDue: 'ÙØ²Ø§Ø±Ø¹ Ø¨Ø­Ø§Ø¬Ø© ÙÙØ¹ÙÙ',
    dailyDue: 'ÙÙØ§Ù ÙÙÙÙØ©',
    niflingQueued: 'Nifling ÙÙ Ø§ÙØ§ÙØªØ¸Ø§Ø±',
    tasksToday: 'Ø§ÙÙÙØ§Ù Ø§ÙÙÙÙ',
    customers: 'Ø§ÙØ¹ÙÙØ§Ø¡',
    activeCustomers: 'Ø¹ÙÙØ§Ø¡ ÙØ´Ø·ÙÙ',
    scheduler: 'Ø§ÙÙÙØ¬Ø¯ÙÙ',
    start: 'ØªØ´ØºÙÙ',
    stop: 'Ø¥ÙÙØ§Ù',
    refresh: 'ØªØ­Ø¯ÙØ«',
    autoRefresh: 'ØªØ­Ø¯ÙØ« ØªÙÙØ§Ø¦Ù',
    loading: 'Ø¬Ø§Ø±Ù Ø§ÙØªØ­ÙÙÙ...',
    error: 'Ø®Ø·Ø£',
    serverInfo: 'ÙØ¹ÙÙÙØ§Øª Ø§ÙØ³ÙØ±ÙØ±',
    farmsList: 'ÙØ§Ø¦ÙØ© Ø§ÙÙØ²Ø§Ø±Ø¹',
    farmId: 'Ø±ÙÙ Ø§ÙÙØ²Ø±Ø¹Ø©',
    customerId: 'Ø±ÙÙ Ø§ÙØ¹ÙÙÙ',
    farmStatus: 'Ø§ÙØ­Ø§ÙØ©',
    noData: 'ÙØ§ ØªÙØ¬Ø¯ Ø¨ÙØ§ÙØ§Øª',
    lastUpdated: 'Ø¢Ø®Ø± ØªØ­Ø¯ÙØ«',
    batchStatus: 'Ø­Ø§ÙØ© Ø§ÙØ¯ÙÙØ¹Ø© Ø§ÙØ­Ø§ÙÙØ©',
    cycleType: 'ÙÙØ¹ Ø§ÙØ¯ÙØ±Ø©',
    progress: 'Ø§ÙØªÙØ¯Ù',
    batchNum: 'Ø±ÙÙ Ø§ÙØ¯ÙØ¹Ø©',
    farmsInBatch: 'Ø§ÙÙØ²Ø§Ø±Ø¹ ÙÙ Ø§ÙØ¯ÙØ¹Ø©',
    completed: 'ÙÙØªÙÙ',
    failed: 'ÙØ´Ù',
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
    title: 'ÐÐ»Ð°Ð½Ð¸ÑÐ¾Ð²ÑÐ¸Ðº - ÐÐ¾Ð½Ð¸ÑÐ¾ÑÐ¸Ð½Ð³ ÑÐµÑÐ²ÐµÑÐ°',
    status: 'Ð¡ÑÐ°ÑÑÑ ÑÐµÑÐ²ÐµÑÐ°',
    online: 'ÐÐ½Ð»Ð°Ð¹Ð½',
    offline: 'ÐÑÐ»Ð°Ð¹Ð½',
    running: 'Ð Ð°Ð±Ð¾ÑÐ°ÐµÑ',
    stopped: 'ÐÑÑÐ°Ð½Ð¾Ð²Ð»ÐµÐ½',
    totalFarms: 'ÐÑÐµÐ³Ð¾ ÑÐµÑÐ¼',
    enabledFarms: 'ÐÐºÑÐ¸Ð²Ð½ÑÑ ÑÐµÑÐ¼',
    runningFarms: 'Ð Ð°Ð±Ð¾ÑÐ°ÑÑÐ¸Ñ',
    idleFarms: 'ÐÑÐ¾ÑÑÐ°Ð¸Ð²Ð°ÑÑÐ¸Ñ',
    errorFarms: 'Ð¡ Ð¾ÑÐ¸Ð±ÐºÐ°Ð¼Ð¸',
    farmingDue: 'ÐÐ¶Ð¸Ð´Ð°ÑÑ ÑÐ°ÑÐ¼Ð¸Ð½Ð³',
    dailyDue: 'ÐÐ¶ÐµÐ´Ð½ÐµÐ²Ð½ÑÐµ',
    niflingQueued: 'ÐÐ¸ÑÐ»Ð¸Ð½Ð³ Ð² Ð¾ÑÐµÑÐµÐ´Ð¸',
    tasksToday: 'ÐÐ°Ð´Ð°Ñ ÑÐµÐ³Ð¾Ð´Ð½Ñ',
    customers: 'ÐÐ»Ð¸ÐµÐ½ÑÑ',
    activeCustomers: 'ÐÐºÑÐ¸Ð²Ð½ÑÑ',
    scheduler: 'ÐÐ»Ð°Ð½Ð¸ÑÐ¾Ð²ÑÐ¸Ðº',
    start: 'ÐÐ°Ð¿ÑÑÐº',
    stop: 'Ð¡ÑÐ¾Ð¿',
    refresh: 'ÐÐ±Ð½Ð¾Ð²Ð¸ÑÑ',
    autoRefresh: 'ÐÐ²ÑÐ¾Ð¾Ð±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ðµ',
    loading: 'ÐÐ°Ð³ÑÑÐ·ÐºÐ°...',
    error: 'ÐÑÐ¸Ð±ÐºÐ°',
    serverInfo: 'ÐÐ½ÑÐ¾ÑÐ¼Ð°ÑÐ¸Ñ Ð¾ ÑÐµÑÐ²ÐµÑÐµ',
    farmsList: 'Ð¡Ð¿Ð¸ÑÐ¾Ðº ÑÐµÑÐ¼',
    farmId: '# Ð¤ÐµÑÐ¼Ñ',
    customerId: '# ÐÐ»Ð¸ÐµÐ½ÑÐ°',
    farmStatus: 'Ð¡ÑÐ°ÑÑÑ',
    noData: 'ÐÐµÑ Ð´Ð°Ð½Ð½ÑÑ',
    lastUpdated: 'ÐÐ±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¾',
    batchStatus: 'Ð¢ÐµÐºÑÑÐ¸Ð¹ Ð±Ð°ÑÑ',
    cycleType: 'Ð¢Ð¸Ð¿ ÑÐ¸ÐºÐ»Ð°',
    progress: 'ÐÑÐ¾Ð³ÑÐµÑÑ',
    batchNum: 'ÐÐ°ÑÑ #',
    farmsInBatch: 'Ð¤ÐµÑÐ¼ Ð² Ð±Ð°ÑÑÐµ',
    completed: 'ÐÐ°Ð²ÐµÑÑÐµÐ½Ð¾',
    failed: 'ÐÑÐ¸Ð±ÐºÐ¸',
  },
  zh: {
    title: 'æ¹æ¬¡è°åº¦ - æå¡å¨çæ§',
    status: 'æå¡å¨ç¶æ',
    online: 'å¨çº¿',
    offline: 'ç¦»çº¿',
    running: 'è¿è¡ä¸­',
    stopped: 'å·²åæ­¢',
    totalFarms: 'æ»ååº',
    enabledFarms: 'å·²å¯ç¨',
    runningFarms: 'è¿è¡ä¸­',
    idleFarms: 'ç©ºé²',
    errorFarms: 'éè¯¯',
    farmingDue: 'å¾æ§è¡',
    dailyDue: 'æ¯æ¥ä»»å¡',
    niflingQueued: 'æéä¸­',
    tasksToday: 'ä»æ¥ä»»å¡',
    customers: 'å®¢æ·',
    activeCustomers: 'æ´»è·å®¢æ·',
    scheduler: 'è°åº¦å¨',
    start: 'å¯å¨',
    stop: 'åæ­¢',
    refresh: 'å·æ°',
    autoRefresh: 'èªå¨å·æ°',
    loading: 'å è½½ä¸­...',
    error: 'éè¯¯',
    serverInfo: 'æå¡å¨ä¿¡æ¯',
    farmsList: 'ååºåè¡¨',
    farmId: 'ååºID',
    customerId: 'å®¢æ·ID',
    farmStatus: 'ç¶æ',
    noData: 'æ æ°æ®',
    lastUpdated: 'æåæ´æ°',
    batchStatus: 'å½åæ¹æ¬¡ç¶æ',
    cycleType: 'å¨æç±»å',
    progress: 'è¿åº¦',
    batchNum: 'æ¹æ¬¡ #',
    farmsInBatch: 'æ¹æ¬¡ä¸­çååº',
    completed: 'å·²å®æ',
    failed: 'å¤±è´¥',
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
      const res = await fetch(`/api/cloud/status`, { method: 'GET' })
      // For start/stop we need a dedicated endpoint - use the orchestrator directly via a new route
      // For now, just refresh the data
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
        <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite', display: 'inline-block' }}>â³</div>
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
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>ð¦ {s.title}</h1>
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
            ð {s.refresh}
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
              {isOnline && ` | cloud.vrbot.me â 65.109.214.187:8080`}
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
          {statBox(s.totalFarms, serverStatus.total_farms, '#06b6d4', 'ð¾')}
          {statBox(s.enabledFarms, serverStatus.enabled_farms, '#10b981', 'â')}
          {statBox(s.runningFarms, serverStatus.running_farms, '#3b82f6', 'ð')}
          {statBox(s.idleFarms, serverStatus.idle_farms, '#64748b', 'â¸ï¸')}
          {statBox(s.errorFarms, serverStatus.error_farms, '#ef4444', 'â')}
          {statBox(s.farmingDue, serverStatus.farming_due, '#f59e0b', 'ð')}
          {statBox(s.dailyDue, serverStatus.daily_due, '#a78bfa', 'ð')}
          {statBox(s.niflingQueued, serverStatus.nifling_queued, '#ec4899', 'â¡')}
          {statBox(s.tasksToday, serverStatus.total_tasks_today, '#06b6d4', 'ð')}
          {statBox(s.customers, serverStatus.total_customers, '#10b981', 'ð¥')}
          {statBox(s.activeCustomers, serverStatus.active_customers, '#3b82f6', 'ð¢')}
        </div>
      )}

      {/* FARMS TABLE */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#fff' }}>ð¾ {s.farmsList}</h2>
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
                          âï¸ Connected
                        </span>
                      ) : f.cloud_status === 'provisioning' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.15)' }}>
                          â³ Provisioning
                        </span>
                      ) : f.cloud_status === 'cloud_error' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: '#ef4444', background: 'rgba(239,68,68,0.15)' }}>
                          â ï¸ Error
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>ð» Local</span>
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
