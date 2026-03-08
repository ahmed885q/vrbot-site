'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  getStatus, getFarms, getBatchStatus, startScheduler, stopScheduler,
  type SystemStatus, type Farm, type BatchStatus
} from '@/lib/orchestrator'

// ─── i18n ────────────────────────────────────────────────────────────
type Lang = 'ar' | 'en' | 'ru' | 'zh'
const t: Record<string, Record<Lang, string>> = {
  title:       { ar: 'جدولة الدُفعات', en: 'Batch Scheduler', ru: 'Планировщик', zh: '批次调度器' },
  subtitle:    { ar: 'إدارة دورات التشغيل والمزارع', en: 'Manage cycles & farms', ru: 'Управление циклами', zh: '管理周期和农场' },
  status:      { ar: 'حالة النظام', en: 'System Status', ru: 'Состояние', zh: '系统状态' },
  batch:       { ar: 'الدُفعة الحالية', en: 'Current Batch', ru: 'Текущий пакет', zh: '当前批次' },
  farms:       { ar: 'المزارع', en: 'Farms', ru: 'Фермы', zh: '农场' },
  running:     { ar: 'يعمل', en: 'Running', ru: 'Работает', zh: '运行中' },
  idle:        { ar: 'خامل', en: 'Idle', ru: 'Простаивает', zh: '空闲' },
  error:       { ar: 'خطأ', en: 'Error', ru: 'Ошибка', zh: '错误' },
  enabled:     { ar: 'مفعّل', en: 'Enabled', ru: 'Включено', zh: '已启用' },
  total:       { ar: 'الإجمالي', en: 'Total', ru: 'Всего', zh: '总计' },
  farmingDue:  { ar: 'مهام زراعة', en: 'Farming Due', ru: 'Фарминг', zh: '待耕作' },
  dailyDue:    { ar: 'مهام يومية', en: 'Daily Due', ru: 'Ежедневные', zh: '每日任务' },
  niflingQ:    { ar: 'Nifling بالانتظار', en: 'Nifling Queued', ru: 'Нифлинг', zh: 'Nifling排队' },
  tasksToday:  { ar: 'مهام اليوم', en: 'Tasks Today', ru: 'Задачи сегодня', zh: '今日任务' },
  customers:   { ar: 'العملاء', en: 'Customers', ru: 'Клиенты', zh: '客户' },
  start:       { ar: 'تشغيل', en: 'Start', ru: 'Запуск', zh: '启动' },
  stop:        { ar: 'إيقاف', en: 'Stop', ru: 'Стоп', zh: '停止' },
  refresh:     { ar: 'تحديث', en: 'Refresh', ru: 'Обновить', zh: '刷新' },
  scheduler:   { ar: 'المُجدوِل', en: 'Scheduler', ru: 'Планировщик', zh: '调度器' },
  on:          { ar: 'يعمل', en: 'ON', ru: 'ВКЛ', zh: '开启' },
  off:         { ar: 'متوقف', en: 'OFF', ru: 'ВЫКЛ', zh: '关闭' },
  progress:    { ar: 'التقدم', en: 'Progress', ru: 'Прогресс', zh: '进度' },
  cycle:       { ar: 'الدورة', en: 'Cycle', ru: 'Цикл', zh: '周期' },
  batchNum:    { ar: 'رقم الدُفعة', en: 'Batch #', ru: 'Пакет №', zh: '批次 #' },
  farmsInBatch:{ ar: 'مزارع بالدُفعة', en: 'Farms in Batch', ru: 'Ферм в пакете', zh: '批次中农场' },
  elapsed:     { ar: 'الوقت المنقضي', en: 'Elapsed', ru: 'Прошло', zh: '已用时间' },
  timeout:     { ar: 'المهلة', en: 'Timeout', ru: 'Таймаут', zh: '超时' },
  nextCycle:   { ar: 'الدورة التالية', en: 'Next Cycle', ru: 'Следующий', zh: '下一周期' },
  farmId:      { ar: 'معرف المزرعة', en: 'Farm ID', ru: 'ID фермы', zh: '农场ID' },
  customer:    { ar: 'العميل', en: 'Customer', ru: 'Клиент', zh: '客户' },
  offline:     { ar: 'غير متصل', en: 'Offline', ru: 'Оффлайн', zh: '离线' },
  loading:     { ar: 'جاري التحميل...', en: 'Loading...', ru: 'Загрузка...', zh: '加载中...' },
  fetchErr:    { ar: 'خطأ في الاتصال بالأوركستريشن', en: 'Failed to connect to orchestrator', ru: 'Ошибка подключения', zh: '连接失败' },
}

// ─── Styles ──────────────────────────────────────────────────────────
const s = {
  page: { padding: '24px', direction: 'rtl' as const, fontFamily: 'system-ui, sans-serif', color: '#cbd5e1', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' as const, gap: '12px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#818cf8', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  actions: { display: 'flex', gap: '8px', alignItems: 'center' },
  btn: (color: string) => ({ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff', background: color }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' },
  stat: (color: string) => ({ background: '#1e293b', borderRadius: '12px', padding: '16px', textAlign: 'center' as const, borderTop: `3px solid ${color}` }),
  statVal: (color: string) => ({ fontSize: '28px', fontWeight: 700, color, margin: '4px 0' }),
  statLabel: { fontSize: '12px', color: '#64748b' },
  card: { background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: 600, color: '#e2e8f0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  progressBar: { width: '100%', height: '20px', background: '#334155', borderRadius: '10px', overflow: 'hidden' as const, marginBottom: '12px' },
  progressFill: (pct: number) => ({ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #22c55e)', borderRadius: '10px', transition: 'width 0.5s' }),
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { padding: '10px 12px', textAlign: 'right' as const, borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 600, fontSize: '12px' },
  td: { padding: '10px 12px', textAlign: 'right' as const, borderBottom: '1px solid #1e293b' },
  badge: (color: string) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: '#fff', background: color }),
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155', fontSize: '14px' },
  infoLabel: { color: '#94a3b8' },
  infoVal: { color: '#e2e8f0', fontWeight: 600 },
  heatmap: { display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: '3px', marginTop: '12px' },
  heatCell: (status: string) => ({
    width: '100%', aspectRatio: '1', borderRadius: '4px', cursor: 'pointer', transition: 'transform 0.15s',
    background: status === 'running' ? '#22c55e' : status === 'idle' ? '#334155' : status === 'error' ? '#ef4444' : '#1e293b',
  }),
  dot: (on: boolean) => ({ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: on ? '#22c55e' : '#ef4444', marginLeft: '6px' }),
  langBtn: (active: boolean) => ({ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', background: active ? '#6366f1' : '#334155', color: '#fff' }),
  error: { background: '#1e293b', borderRadius: '12px', padding: '40px', textAlign: 'center' as const, color: '#f59e0b' },
}

// ─── Helpers ─────────────────────────────────────────────────────────
const statusColor: Record<string, string> = { running: '#22c55e', idle: '#64748b', error: '#ef4444', stopped: '#f59e0b', queued: '#3b82f6' }
function fmtTime(sec: number) { const m = Math.floor(sec / 60); const s2 = Math.floor(sec % 60); return `${m}m ${s2}s` }
function fmtDate(d: string | null) { if (!d) return '—'; try { return new Date(d).toLocaleString('ar-SA') } catch { return d } }

// ─── Component ───────────────────────────────────────────────────────
export default function OrchestratorPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null)
  const [batch, setBatch] = useState<BatchStatus | null>(null)
  const [farms, setFarms] = useState<Farm[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      setErr('')
      const [statusRes, farmsRes, batchRes] = await Promise.allSettled([
        getStatus(), getFarms(), getBatchStatus()
      ])
      if (statusRes.status === 'fulfilled') setSysStatus(statusRes.value)
      if (farmsRes.status === 'fulfilled') setFarms(farmsRes.value.farms || [])
      if (batchRes.status === 'fulfilled') setBatch(batchRes.value)
    } catch (e: any) {
      setErr(e.message || 'fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Auto-refresh every 10s
  useEffect(() => {
    const iv = setInterval(fetchAll, 10000)
    return () => clearInterval(iv)
  }, [fetchAll])

  const handleAction = async (action: 'start' | 'stop') => {
    setActionLoading(true)
    try {
      if (action === 'start') await startScheduler()
      else await stopScheduler()
      await fetchAll()
    } catch (e: any) { setErr(e.message) }
    setActionLoading(false)
  }

  const L = (key: string) => t[key]?.[lang] || t[key]?.['en'] || key

  if (loading) return <div style={s.error}><p style={{ fontSize: '18px' }}>{L('loading')}</p></div>

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>{L('title')}</h1>
          <p style={s.subtitle}>{L('subtitle')}</p>
        </div>
        <div style={s.actions}>
          {(['ar','en','ru','zh'] as Lang[]).map(l => (
            <button key={l} style={s.langBtn(lang === l)} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
          ))}
          <button style={s.btn('#334155')} onClick={fetchAll}>{L('refresh')} ↻</button>
          {sysStatus?.running ? (
            <button style={s.btn('#ef4444')} onClick={() => handleAction('stop')} disabled={actionLoading}>{L('stop')} ⏹</button>
          ) : (
            <button style={s.btn('#22c55e')} onClick={() => handleAction('start')} disabled={actionLoading}>{L('start')} ▶</button>
          )}
        </div>
      </div>

      {err && <div style={{ ...s.card, borderTop: '3px solid #f59e0b', color: '#f59e0b', textAlign: 'center' }}>{L('fetchErr')}: {err}</div>}

      {/* Scheduler Status */}
      <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 600 }}>{L('scheduler')}</span>
        <span style={s.dot(!!sysStatus?.running)} />
        <span style={{ color: sysStatus?.running ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '18px' }}>
          {sysStatus?.running ? L('on') : L('off')}
        </span>
      </div>

      {/* Stats Grid */}
      <div style={s.grid}>
        {[
          { label: L('total'), val: sysStatus?.total_farms || 0, color: '#6366f1' },
          { label: L('enabled'), val: sysStatus?.enabled_farms || 0, color: '#818cf8' },
          { label: L('running'), val: sysStatus?.running_farms || 0, color: '#22c55e' },
          { label: L('idle'), val: sysStatus?.idle_farms || 0, color: '#64748b' },
          { label: L('error'), val: sysStatus?.error_farms || 0, color: '#ef4444' },
          { label: L('farmingDue'), val: sysStatus?.farming_due || 0, color: '#f59e0b' },
          { label: L('dailyDue'), val: sysStatus?.daily_due || 0, color: '#3b82f6' },
          { label: L('niflingQ'), val: sysStatus?.nifling_queued || 0, color: '#a855f7' },
          { label: L('tasksToday'), val: sysStatus?.total_tasks_today || 0, color: '#14b8a6' },
          { label: L('customers'), val: sysStatus?.total_customers || 0, color: '#ec4899' },
        ].map((item, i) => (
          <div key={i} style={s.stat(item.color)}>
            <div style={s.statVal(item.color)}>{item.val}</div>
            <div style={s.statLabel}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Current Batch */}
      <div style={s.card}>
        <div style={s.cardTitle}>📦 {L('batch')}</div>
        {batch && batch.status !== 'idle' ? (
          <>
            <div style={s.progressBar}>
              <div style={s.progressFill(batch.progress_percent || 0)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                [L('batchNum'), `${batch.current_batch} / ${batch.total_batches}`],
                [L('farmsInBatch'), batch.farms_in_batch],
                [L('cycle'), batch.cycle_type?.toUpperCase()],
                [L('status'), batch.status],
                [L('elapsed'), fmtTime(batch.batch_elapsed_seconds || 0)],
                [L('timeout'), fmtTime(batch.batch_timeout_seconds || 0)],
                [L('progress'), `${batch.farms_completed || 0} ✓  ${batch.farms_failed || 0} ✗`],
                [L('nextCycle'), fmtDate(batch.next_cycle_at)],
              ].map(([label, val], i) => (
                <div key={i} style={s.infoRow}>
                  <span style={s.infoLabel}>{label}</span>
                  <span style={s.infoVal}>{val}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
            {L('idle')} — {L('off')}
          </div>
        )}
      </div>

      {/* Farm Heatmap */}
      <div style={s.card}>
        <div style={s.cardTitle}>🗺 {L('farms')} Heatmap ({farms.length})</div>
        <div style={s.heatmap}>
          {farms.map((farm, i) => (
            <div
              key={i}
              style={s.heatCell(farm.status)}
              title={`#${farm.farm_id} — ${farm.status} — ${farm.customer_id}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px' }}>
          <span>🟢 {L('running')}</span>
          <span>⬛ {L('idle')}</span>
          <span>🔴 {L('error')}</span>
        </div>
      </div>

      {/* Farms Table */}
      <div style={s.card}>
        <div style={s.cardTitle}>📋 {L('farms')} ({farms.length})</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>{L('farmId')}</th>
                <th style={s.th}>{L('customer')}</th>
                <th style={s.th}>{L('status')}</th>
              </tr>
            </thead>
            <tbody>
              {farms.slice(0, 50).map((farm, i) => (
                <tr key={i}>
                  <td style={s.td}>{farm.farm_id}</td>
                  <td style={s.td}>{farm.customer_id}</td>
                  <td style={s.td}>
                    <span style={s.badge(statusColor[farm.status] || '#64748b')}>{farm.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
