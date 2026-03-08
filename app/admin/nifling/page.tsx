'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  getNiflingQueue, requestNifling, cancelNifling, setNiflingPriority,
  type NiflingRequest, type NiflingStats
} from '@/lib/orchestrator'

type Lang = 'ar' | 'en' | 'ru' | 'zh'
const t: Record<string, Record<Lang, string>> = {
  title:       { ar: 'طابور Nifling', en: 'Nifling Queue', ru: 'Очередь Nifling', zh: 'Nifling 队列' },
  subtitle:    { ar: 'إدارة طلبات Nifling والأولويات', en: 'Manage Nifling requests & priorities', ru: 'Управление запросами и приоритетами Nifling', zh: '管理 Nifling 请求和优先级' },
  queued:      { ar: 'بالانتظار', en: 'Queued', ru: 'В очереди', zh: '排队中' },
  running:     { ar: 'يعمل', en: 'Running', ru: 'Работает', zh: '运行中' },
  completed:   { ar: 'مكتمل اليوم', en: 'Completed Today', ru: 'Завершено сегодня', zh: '今日完成' },
  failed:      { ar: 'فشل اليوم', en: 'Failed Today', ru: 'Ошибки сегодня', zh: '今日失败' },
  avgWait:     { ar: 'متوسط الانتظار', en: 'Avg Wait', ru: 'Ср. ожидание', zh: '平均等待' },
  avgDuration: { ar: 'متوسط المدة', en: 'Avg Duration', ru: 'Ср. длительность', zh: '平均时长' },
  reqId:       { ar: 'معرف الطلب', en: 'Request ID', ru: 'ID запроса', zh: '请求ID' },
  farmId:      { ar: 'المزرعة', en: 'Farm', ru: 'Ферма', zh: '农场' },
  customer:    { ar: 'العميل', en: 'Customer', ru: 'Клиент', zh: '客户' },
  priority:    { ar: 'الأولوية', en: 'Priority', ru: 'Приоритет', zh: '优先级' },
  status:      { ar: 'الحالة', en: 'Status', ru: 'Статус', zh: '状态' },
  requested:   { ar: 'وقت الطلب', en: 'Requested At', ru: 'Время запроса', zh: '请求时间' },
  started:     { ar: 'بدأ', en: 'Started', ru: 'Начало', zh: '开始' },
  completedAt: { ar: 'انتهى', en: 'Completed', ru: 'Завершено', zh: '完成' },
  actions:     { ar: 'الإجراءات', en: 'Actions', ru: 'Действия', zh: '操作' },
  cancel:      { ar: 'إلغاء', en: 'Cancel', ru: 'Отмена', zh: '取消' },
  newReq:      { ar: 'طلب جديد', en: 'New Request', ru: 'Новый запрос', zh: '新请求' },
  refresh:     { ar: 'تحديث', en: 'Refresh', ru: 'Обновить', zh: '刷新' },
  farmIdInput: { ar: 'معرف المزرعة', en: 'Farm ID', ru: 'ID фермы', zh: '农场ID' },
  submit:      { ar: 'إرسال', en: 'Submit', ru: 'Отправить', zh: '提交' },
  loading:     { ar: 'جاري التحميل...', en: 'Loading...', ru: 'Загрузка...', zh: '加载中...' },
  noData:      { ar: 'لا توجد طلبات', en: 'No requests', ru: 'Нет запросов', zh: '暂无请求' },
  all:         { ar: 'الكل', en: 'All', ru: 'Все', zh: '全部' },
}
const s = {
  page: { padding: '24px', direction: 'rtl' as const, fontFamily: 'system-ui, sans-serif', color: '#cbd5e1' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' as const, gap: '12px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#a855f7', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  actions: { display: 'flex', gap: '8px', alignItems: 'center' },
  btn: (bg: string) => ({ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff', background: bg }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' },
  stat: (c: string) => ({ background: '#1e293b', borderRadius: '12px', padding: '16px', textAlign: 'center' as const, borderTop: `3px solid ${c}` }),
  statVal: (c: string) => ({ fontSize: '28px', fontWeight: 700, color: c, margin: '4px 0' }),
  statLabel: { fontSize: '12px', color: '#64748b' },
  card: { background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: 600, color: '#e2e8f0', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { padding: '10px 12px', textAlign: 'right' as const, borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 600, fontSize: '12px' },
  td: { padding: '10px 12px', textAlign: 'right' as const, borderBottom: '1px solid #1e293b' },
  badge: (c: string) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: '#fff', background: c }),
  filterRow: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' as const },
  filterBtn: (active: boolean) => ({ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: active ? '#a855f7' : '#334155', color: '#fff' }),
  input: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '13px', width: '120px' },
  modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#1e293b', borderRadius: '16px', padding: '24px', width: '400px', maxWidth: '90vw' },
  langBtn: (a: boolean) => ({ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', background: a ? '#a855f7' : '#334155', color: '#fff' }),
}

const statusColor: Record<string, string> = { queued: '#3b82f6', running: '#22c55e', completed: '#10b981', failed: '#ef4444', cancelled: '#64748b' }
const priorityColor = (p: number) => p <= 2 ? '#ef4444' : p <= 4 ? '#f59e0b' : p <= 6 ? '#3b82f6' : '#64748b'
function fmtTime(sec: number) { const m = Math.floor(sec / 60); return m > 0 ? `${m}m` : `${sec}s` }
function fmtDate(d: string | null) { if (!d) return 'â'; try { return new Date(d).toLocaleTimeString('ar-SA') } catch { return d } }

export default function NiflingPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<NiflingRequest[]>([])
  const [stats, setStats] = useState<NiflingStats | null>(null)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [newFarmId, setNewFarmId] = useState('')
  const [newPriority, setNewPriority] = useState('5')

  const L = (k: string) => t[k]?.[lang] || t[k]?.['en'] || k

  const fetchData = useCallback(async () => {
    try {
      const res = await getNiflingQueue()
      setRequests(res.requests || [])
      setStats(res.stats || null)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 8000); return () => clearInterval(iv) }, [fetchData])

  const handleNewRequest = async () => {
    if (!newFarmId) return
    await requestNifling(parseInt(newFarmId), parseInt(newPriority))
    setShowModal(false); setNewFarmId(''); setNewPriority('5')
    fetchData()
  }

  const handleCancel = async (id: string) => { await cancelNifling(id); fetchData() }

  const handlePriority = async (id: string, p: number) => { await setNiflingPriority(id, p); fetchData() }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  if (loading) return <div style={{ ...s.card, textAlign: 'center', margin: '40px' }}>{L('loading')}</div>

  return (
    <div style={{...s.page, direction: lang === 'ar' ? 'rtl' : 'ltr'}}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>{L('title')}</h1>
          <p style={s.subtitle}>{L('subtitle')}</p>
        </div>
        <div style={s.actions}>
          {(['ar','en','ru','zh'] as Lang[]).map(l => (
            <button key={l} style={s.langBtn(lang === l)} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
          ))}
          <button style={s.btn('#334155')} onClick={fetchData}>{L('refresh')} â»</button>
          <button style={s.btn('#a855f7')} onClick={() => setShowModal(true)}>+ {L('newReq')}</button>
        </div>
      </div>

      {/* Stats */}
      <div style={s.grid}>
        {[
          { label: L('queued'), val: stats?.queued || 0, color: '#3b82f6' },
          { label: L('running'), val: stats?.running || 0, color: '#22c55e' },
          { label: L('completed'), val: stats?.completed_today || 0, color: '#10b981' },
          { label: L('failed'), val: stats?.failed_today || 0, color: '#ef4444' },
          { label: L('avgWait'), val: fmtTime(stats?.avg_wait_seconds || 0), color: '#f59e0b' },
          { label: L('avgDuration'), val: fmtTime(stats?.avg_duration_seconds || 0), color: '#818cf8' },
        ].map((item, i) => (
          <div key={i} style={s.stat(item.color)}>
            <div style={s.statVal(item.color)}>{item.val}</div>
            <div style={s.statLabel}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Table */}
      <div style={s.card}>
        <div style={s.filterRow}>
          {['all', 'queued', 'running', 'completed', 'failed', 'cancelled'].map(f => (
            <button key={f} style={s.filterBtn(filter === f)} onClick={() => setFilter(f)}>
              {L(f === 'all' ? 'all' : f)} {f !== 'all' ? `(${requests.filter(r => r.status === f).length})` : `(${requests.length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>{L('noData')}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>{L('farmId')}</th>
                  <th style={s.th}>{L('customer')}</th>
                  <th style={s.th}>{L('priority')}</th>
                  <th style={s.th}>{L('status')}</th>
                  <th style={s.th}>{L('requested')}</th>
                  <th style={s.th}>{L('started')}</th>
                  <th style={s.th}>{L('completedAt')}</th>
                  <th style={s.th}>{L('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i}>
                    <td style={s.td}>{r.farm_id}</td>
                    <td style={s.td}>{r.customer_email || r.customer_id}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge(priorityColor(r.priority)), cursor: 'pointer' }}
                        onClick={() => { const p = prompt('Priority (1-10):', String(r.priority)); if (p) handlePriority(r.request_id, parseInt(p)) }}>
                        P{r.priority}
                      </span>
                    </td>
                    <td style={s.td}><span style={s.badge(statusColor[r.status] || '#64748b')}>{r.status}</span></td>
                    <td style={s.td}>{fmtDate(r.requested_at)}</td>
                    <td style={s.td}>{fmtDate(r.started_at)}</td>
                    <td style={s.td}>{fmtDate(r.completed_at)}</td>
                    <td style={s.td}>
                      {r.status === 'queued' && (
                        <button style={s.btn('#ef4444')} onClick={() => handleCancel(r.request_id)}>{L('cancel')}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div style={s.modal} onClick={() => setShowModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#a855f7', marginBottom: '16px' }}>+ {L('newReq')}</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>{L('farmIdInput')}</label>
              <input style={{ ...s.input, width: '100%' }} type="number" value={newFarmId} onChange={e => setNewFarmId(e.target.value)} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>{L('priority')} (1-10)</label>
              <input style={{ ...s.input, width: '100%' }} type="number" min="1" max="10" value={newPriority} onChange={e => setNewPriority(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button style={s.btn('#334155')} onClick={() => setShowModal(false)}>{L('cancel')}</button>
              <button style={s.btn('#a855f7')} onClick={handleNewRequest}>{L('submit')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
