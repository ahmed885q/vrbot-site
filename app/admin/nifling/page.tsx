'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  getNiflingQueue, requestNifling, cancelNifling, setNiflingPriority,
  type NiflingRequest, type NiflingStats
} from '@/lib/orchestrator'

type Lang = 'ar' | 'en' | 'ru' | 'zh'
const t: Record<string, Record<Lang, string>> = {
  title:       { ar: 'Ø·Ø§Ø¨ÙØ± Nifling', en: 'Nifling Queue', ru: 'ÐÑÐµÑÐµÐ´Ñ Nifling', zh: 'Niflingéå' },
  subtitle:    { ar: 'Ø¥Ø¯Ø§Ø±Ø© Ø·ÙØ¨Ø§Øª Nifling ÙØ§ÙØ£ÙÙÙÙØ§Øª', en: 'Manage Nifling requests & priorities', ru: 'Ð£Ð¿ÑÐ°Ð²Ð»ÐµÐ½Ð¸Ðµ Ð·Ð°Ð¿ÑÐ¾ÑÐ°Ð¼Ð¸', zh: 'ç®¡çè¯·æ±åä¼åçº§' },
  queued:      { ar: 'Ø¨Ø§ÙØ§ÙØªØ¸Ø§Ø±', en: 'Queued', ru: 'Ð Ð¾ÑÐµÑÐµÐ´Ð¸', zh: 'æéä¸­' },
  running:     { ar: 'ÙØ¹ÙÙ', en: 'Running', ru: 'Ð Ð°Ð±Ð¾ÑÐ°ÐµÑ', zh: 'è¿è¡ä¸­' },
  completed:   { ar: 'ÙÙØªÙÙ Ø§ÙÙÙÙ', en: 'Completed Today', ru: 'ÐÐ°Ð²ÐµÑÑÐµÐ½Ð¾', zh: 'ä»æ¥å®æ' },
  failed:      { ar: 'ÙØ´Ù Ø§ÙÙÙÙ', en: 'Failed Today', ru: 'ÐÑÐ¸Ð±ÐºÐ¸', zh: 'ä»æ¥å¤±è´¥' },
  avgWait:     { ar: 'ÙØªÙØ³Ø· Ø§ÙØ§ÙØªØ¸Ø§Ø±', en: 'Avg Wait', ru: 'Ð¡Ñ. Ð¾Ð¶Ð¸Ð´Ð°Ð½Ð¸Ðµ', zh: 'å¹³åç­å¾' },
  avgDuration: { ar: 'ÙØªÙØ³Ø· Ø§ÙÙØ¯Ø©', en: 'Avg Duration', ru: 'Ð¡Ñ. Ð´Ð»Ð¸ÑÐµÐ»ÑÐ½Ð¾ÑÑÑ', zh: 'å¹³åæ¶é¿' },
  reqId:       { ar: 'ÙØ¹Ø±Ù Ø§ÙØ·ÙØ¨', en: 'Request ID', ru: 'ID Ð·Ð°Ð¿ÑÐ¾ÑÐ°', zh: 'è¯·æ±ID' },
  farmId:      { ar: 'Ø§ÙÙØ²Ø±Ø¹Ø©', en: 'Farm', ru: 'Ð¤ÐµÑÐ¼Ð°', zh: 'ååº' },
  customer:    { ar: 'Ø§ÙØ¹ÙÙÙ', en: 'Customer', ru: 'ÐÐ»Ð¸ÐµÐ½Ñ', zh: 'å®¢æ·' },
  priority:    { ar: 'Ø§ÙØ£ÙÙÙÙØ©', en: 'Priority', ru: 'ÐÑÐ¸Ð¾ÑÐ¸ÑÐµÑ', zh: 'ä¼åçº§' },
  status:      { ar: 'Ø§ÙØ­Ø§ÙØ©', en: 'Status', ru: 'Ð¡ÑÐ°ÑÑÑ', zh: 'ç¶æ' },
  requested:   { ar: 'ÙÙØª Ø§ÙØ·ÙØ¨', en: 'Requested At', ru: 'ÐÑÐµÐ¼Ñ Ð·Ð°Ð¿ÑÐ¾ÑÐ°', zh: 'è¯·æ±æ¶é´' },
  started:     { ar: 'Ø¨Ø¯Ø£', en: 'Started', ru: 'ÐÐ°ÑÐ°Ð»Ð¾', zh: 'å¼å§' },
  completedAt: { ar: 'Ø§ÙØªÙÙ', en: 'Completed', ru: 'ÐÐ°Ð²ÐµÑÑÐµÐ½Ð¾', zh: 'å®æ' },
  actions:     { ar: 'Ø§ÙØ¥Ø¬Ø±Ø§Ø¡Ø§Øª', en: 'Actions', ru: 'ÐÐµÐ¹ÑÑÐ²Ð¸Ñ', zh: 'æä½' },
  cancel:      { ar: 'Ø¥ÙØºØ§Ø¡', en: 'Cancel', ru: 'ÐÑÐ¼ÐµÐ½Ð°', zh: 'åæ¶' },
  newReq:      { ar: 'Ø·ÙØ¨ Ø¬Ø¯ÙØ¯', en: 'New Request', ru: 'ÐÐ¾Ð²ÑÐ¹ Ð·Ð°Ð¿ÑÐ¾Ñ', zh: 'æ°è¯·æ±' },
  refresh:     { ar: 'ØªØ­Ø¯ÙØ«', en: 'Refresh', ru: 'ÐÐ±Ð½Ð¾Ð²Ð¸ÑÑ', zh: 'å·æ°' },
  farmIdInput: { ar: 'ÙØ¹Ø±Ù Ø§ÙÙØ²Ø±Ø¹Ø©', en: 'Farm ID', ru: 'ID ÑÐµÑÐ¼Ñ', zh: 'ååºID' },
  submit:      { ar: 'Ø¥Ø±Ø³Ø§Ù', en: 'Submit', ru: 'ÐÑÐ¿ÑÐ°Ð²Ð¸ÑÑ', zh: 'æäº¤' },
  loading:     { ar: 'Ø¬Ø§Ø±Ù Ø§ÙØªØ­ÙÙÙ...', en: 'Loading...', ru: 'ÐÐ°Ð³ÑÑÐ·ÐºÐ°...', zh: 'å è½½ä¸­...' },
  noData:      { ar: 'ÙØ§ ØªÙØ¬Ø¯ Ø·ÙØ¨Ø§Øª', en: 'No requests', ru: 'ÐÐµÑ Ð·Ð°Ð¿ÑÐ¾ÑÐ¾Ð²', zh: 'ææ è¯·æ±' },
  all:         { ar: 'Ø§ÙÙÙ', en: 'All', ru: 'ÐÑÐµ', zh: 'å¨é¨' },
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
    <div style={s.page}>
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
