'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  getScalerStatus, setScalerMode, getServers, provisionServer, drainServer, setScalerBudget,
  type ScalerStatus, type Server
} from '@/lib/orchestrator'

type Lang = 'ar' | 'en' | 'ru' | 'zh'
const t: Record<string, Record<Lang, string>> = {
  title:       { ar: 'التحجيم التلقائي', en: 'Auto-Scaler', ru: 'Авто-масштабирование', zh: '自动扩缩' },
  subtitle:    { ar: 'إدارة السيرفرات والسعة والميزانية', en: 'Manage servers, capacity & budget', ru: 'Управление серверами', zh: '管理服务器和容量' },
  mode:        { ar: 'الوضع', en: 'Mode', ru: 'Режим', zh: '模式' },
  servers:     { ar: 'السيرفرات', en: 'Servers', ru: 'Серверы', zh: '服务器' },
  capacity:    { ar: 'السعة', en: 'Capacity', ru: 'Ёмкость', zh: '容量' },
  used:        { ar: 'مستخدم', en: 'Used', ru: 'Используется', zh: '已使用' },
  utilization: { ar: 'الاستخدام', en: 'Utilization', ru: 'Использование', zh: '使用率' },
  budget:      { ar: 'الميزانية', en: 'Budget', ru: 'Бюджет', zh: '预算' },
  cost:        { ar: 'التكلفة', en: 'Cost', ru: 'Стоимость', zh: '费用' },
  alerts:      { ar: 'التنبيهات', en: 'Alerts', ru: 'Оповещения', zh: '警报' },
  lastAction:  { ar: 'آخر إجراء', en: 'Last Action', ru: 'Последнее', zh: '最后操作' },
  server:      { ar: 'السيرفر', en: 'Server', ru: 'Сервер', zh: '服务器' },
  ip:          { ar: 'IP', en: 'IP', ru: 'IP', zh: 'IP' },
  type:        { ar: 'النوع', en: 'Type', ru: 'Тип', zh: '类型' },
  status:      { ar: 'الحالة', en: 'Status', ru: 'Статус', zh: '状态' },
  slots:       { ar: 'السلوتات', en: 'Slots', ru: 'Слоты', zh: '插槽' },
  cpu:         { ar: 'المعالج', en: 'CPU', ru: 'CPU', zh: 'CPU' },
  memory:      { ar: 'الذاكرة', en: 'Memory', ru: 'Память', zh: '内存' },
  monthlyCost: { ar: 'التكلفة/شهر', en: '$/Month', ru: '$/мес', zh: '$/月' },
  region:      { ar: 'المنطقة', en: 'Region', ru: 'Регион', zh: '区域' },
  actions:     { ar: 'الإجراءات', en: 'Actions', ru: 'Действия', zh: '操作' },
  drain:       { ar: 'تفريغ', en: 'Drain', ru: 'Слить', zh: '排空' },
  provision:   { ar: 'إنشاء سيرفر', en: 'Provision Server', ru: 'Создать сервер', zh: '创建服务器' },
  refresh:     { ar: 'تحديث', en: 'Refresh', ru: 'Обновить', zh: '刷新' },
  scaleUp:     { ar: 'حد التوسع', en: 'Scale Up At', ru: 'Масштабировать при', zh: '扩展阈值' },
  scaleDown:   { ar: 'حد التقليص', en: 'Scale Down At', ru: 'Уменьшить при', zh: '缩减阈值' },
  minServers:  { ar: 'أقل سيرفرات', en: 'Min Servers', ru: 'Мин серверов', zh: '最少服务器' },
  maxServers:  { ar: 'أقصى سيرفرات', en: 'Max Servers', ru: 'Макс серверов', zh: '最多服务器' },
  thresholds:  { ar: 'الحدود', en: 'Thresholds', ru: 'Пороги', zh: '阈值' },
  loading:     { ar: 'جاري التحميل...', en: 'Loading...', ru: 'Загрузка...', zh: '加载中...' },
  setBudget:   { ar: 'تعيين الميزانية', en: 'Set Budget', ru: 'Установить бюджет', zh: '设定预算' },
}

const s = {
  page: { padding: '24px', direction: 'rtl' as const, fontFamily: 'system-ui, sans-serif', color: '#cbd5e1' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' as const, gap: '12px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#14b8a6', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  actions: { display: 'flex', gap: '8px', alignItems: 'center' },
  btn: (bg: string) => ({ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff', background: bg }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' },
  stat: (c: string) => ({ background: '#1e293b', borderRadius: '12px', padding: '16px', textAlign: 'center' as const, borderTop: `3px solid ${c}` }),
  statVal: (c: string) => ({ fontSize: '28px', fontWeight: 700, color: c, margin: '4px 0' }),
  statLabel: { fontSize: '12px', color: '#64748b' },
  card: { background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: 600, color: '#e2e8f0', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: { padding: '10px 12px', textAlign: 'right' as const, borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 600, fontSize: '12px' },
  td: { padding: '10px 12px', textAlign: 'right' as const, borderBottom: '1px solid #1e293b' },
  badge: (c: string) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: '#fff', background: c }),
  modeBtn: (active: boolean, c: string) => ({ padding: '10px 24px', borderRadius: '10px', border: active ? `2px solid ${c}` : '2px solid #334155', cursor: 'pointer', fontWeight: 700, fontSize: '14px', background: active ? c + '22' : '#0f172a', color: active ? c : '#64748b' }),
  progressBar: (pct: number, color: string) => ({ position: 'relative' as const, height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' as const }),
  progressFill: (pct: number, color: string) => ({ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: '4px' }),
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155', fontSize: '14px' },
  input: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '13px', width: '120px' },
  langBtn: (a: boolean) => ({ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', background: a ? '#14b8a6' : '#334155', color: '#fff' }),
}

const statusColor: Record<string, string> = { active: '#22c55e', provisioning: '#3b82f6', draining: '#f59e0b', error: '#ef4444', offline: '#64748b' }
const modeColor: Record<string, string> = { AUTO: '#22c55e', NOTIFY: '#f59e0b', MANUAL: '#64748b' }

export default function ScalerPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [loading, setLoading] = useState(true)
  const [scaler, setScaler] = useState<ScalerStatus | null>(null)
  const [servers, setServers] = useState<Server[]>([])
  const [budgetInput, setBudgetInput] = useState('')

  const L = (k: string) => t[k]?.[lang] || t[k]?.['en'] || k

  const fetchData = useCallback(async () => {
    try {
      const [sc, sv] = await Promise.allSettled([getScalerStatus(), getServers()])
      if (sc.status === 'fulfilled') { setScaler(sc.value); setBudgetInput(String(sc.value.monthly_budget || 0)) }
      if (sv.status === 'fulfilled') setServers(sv.value.servers || [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 15000); return () => clearInterval(iv) }, [fetchData])

  const handleMode = async (mode: 'AUTO' | 'NOTIFY' | 'MANUAL') => { await setScalerMode(mode); fetchData() }
  const handleDrain = async (id: string) => { if (confirm('Drain this server?')) { await drainServer(id); fetchData() } }
  const handleBudget = async () => { await setScalerBudget(parseFloat(budgetInput)); fetchData() }
  const handleProvision = async () => {
    const type = prompt('Server type (ax41/ax42):', 'ax41')
    if (!type) return
    const region = prompt('Region:', 'fsn1')
    if (!region) return
    await provisionServer(type, region)
    fetchData()
  }

  if (loading) return <div style={{ ...s.card, textAlign: 'center', margin: '40px' }}>{L('loading')}</div>

  const utilizationColor = (scaler?.utilization_percent || 0) > 80 ? '#ef4444' : (scaler?.utilization_percent || 0) > 60 ? '#f59e0b' : '#22c55e'

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
          <button style={s.btn('#334155')} onClick={fetchData}>{L('refresh')} ↻</button>
          <button style={s.btn('#14b8a6')} onClick={handleProvision}>+ {L('provision')}</button>
        </div>
      </div>

      {/* Mode Selector */}
      <div style={{ ...s.card, display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, marginLeft: '16px' }}>{L('mode')}:</span>
        {(['AUTO', 'NOTIFY', 'MANUAL'] as const).map(m => (
          <button key={m} style={s.modeBtn(scaler?.mode === m, modeColor[m])} onClick={() => handleMode(m)}>{m}</button>
        ))}
      </div>

      {/* Stats */}
      <div style={s.grid}>
        {[
          { label: L('servers'), val: scaler?.total_servers || 0, color: '#6366f1' },
          { label: L('capacity'), val: scaler?.total_capacity || 0, color: '#818cf8' },
          { label: L('used'), val: scaler?.used_capacity || 0, color: '#22c55e' },
          { label: L('utilization'), val: `${scaler?.utilization_percent || 0}%`, color: utilizationColor },
          { label: L('budget'), val: `$${scaler?.monthly_budget || 0}`, color: '#f59e0b' },
          { label: L('cost'), val: `$${scaler?.monthly_cost || 0}`, color: '#ec4899' },
          { label: L('alerts'), val: scaler?.pending_alerts || 0, color: '#ef4444' },
        ].map((item, i) => (
          <div key={i} style={s.stat(item.color)}>
            <div style={s.statVal(item.color)}>{item.val}</div>
            <div style={s.statLabel}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Budget + Thresholds */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={s.card}>
          <div style={s.cardTitle}>💰 {L('setBudget')}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input style={{ ...s.input, flex: 1 }} type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} />
            <button style={s.btn('#f59e0b')} onClick={handleBudget}>✓</button>
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
            {L('cost')}: ${scaler?.monthly_cost || 0} / ${scaler?.monthly_budget || 0}
          </div>
          <div style={s.progressBar(0, '')}>
            <div style={s.progressFill(
              scaler?.monthly_budget ? (scaler.monthly_cost / scaler.monthly_budget) * 100 : 0,
              (scaler?.monthly_budget && scaler.monthly_cost > scaler.monthly_budget * 0.8) ? '#ef4444' : '#22c55e'
            )} />
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>⚙ {L('thresholds')}</div>
          {scaler?.thresholds && [
            [L('scaleUp'), `${scaler.thresholds.scale_up_percent}%`],
            [L('scaleDown'), `${scaler.thresholds.scale_down_percent}%`],
            [L('minServers'), scaler.thresholds.min_servers],
            [L('maxServers'), scaler.thresholds.max_servers],
          ].map(([label, val], i) => (
            <div key={i} style={s.infoRow}>
              <span style={{ color: '#94a3b8' }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Servers Table */}
      <div style={s.card}>
        <div style={s.cardTitle}>🖥 {L('servers')} ({servers.length})</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>{L('server')}</th>
                <th style={s.th}>{L('ip')}</th>
                <th style={s.th}>{L('type')}</th>
                <th style={s.th}>{L('status')}</th>
                <th style={s.th}>{L('slots')}</th>
                <th style={s.th}>{L('cpu')}</th>
                <th style={s.th}>{L('memory')}</th>
                <th style={s.th}>{L('monthlyCost')}</th>
                <th style={s.th}>{L('region')}</th>
                <th style={s.th}>{L('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((sv, i) => (
                <tr key={i}>
                  <td style={s.td}>{sv.name}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '12px' }}>{sv.ip}</td>
                  <td style={s.td}>{sv.type}</td>
                  <td style={s.td}><span style={s.badge(statusColor[sv.status] || '#64748b')}>{sv.status}</span></td>
                  <td style={s.td}>{sv.used_slots}/{sv.total_slots}</td>
                  <td style={s.td}>{sv.cpu_percent}%</td>
                  <td style={s.td}>{sv.memory_percent}%</td>
                  <td style={s.td}>${sv.monthly_cost}</td>
                  <td style={s.td}>{sv.region}</td>
                  <td style={s.td}>
                    {sv.status === 'active' && (
                      <button style={s.btn('#f59e0b')} onClick={() => handleDrain(sv.server_id)}>{L('drain')}</button>
                    )}
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
