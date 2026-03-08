'use client'
import { useState, useEffect, useCallback } from 'react'
import { getLogs, getLogSources, type LogEntry, type LogFilter } from '@/lib/orchestrator'

type Lang = 'ar' | 'en' | 'ru' | 'zh'
const t: Record<string, Record<Lang, string>> = {
  title:      { ar: 'سجلات النظام', en: 'System Logs', ru: 'Системные логи', zh: '系统日志' },
  subtitle:   { ar: 'مراقبة وتصفية سجلات الأوركستريشن', en: 'Monitor & filter orchestrator logs', ru: 'Мониторинг логов', zh: '监控和过滤日志' },
  level:      { ar: 'المستوى', en: 'Level', ru: 'Уровень', zh: '级别' },
  source:     { ar: 'المصدر', en: 'Source', ru: 'Источник', zh: '来源' },
  message:    { ar: 'الرسالة', en: 'Message', ru: 'Сообщение', zh: '消息' },
  timestamp:  { ar: 'الوقت', en: 'Time', ru: 'Время', zh: '时间' },
  farmId:     { ar: 'المزرعة', en: 'Farm', ru: 'Ферма', zh: '农场' },
  customer:   { ar: 'العميل', en: 'Customer', ru: 'Клиент', zh: '客户' },
  search:     { ar: 'بحث...', en: 'Search...', ru: 'Поиск...', zh: '搜索...' },
  all:        { ar: 'الكل', en: 'All', ru: 'Все', zh: '全部' },
  info:       { ar: 'معلومات', en: 'Info', ru: 'Инфо', zh: '信息' },
  warning:    { ar: 'تحذير', en: 'Warning', ru: 'Предупр.', zh: '警告' },
  error:      { ar: 'خطأ', en: 'Error', ru: 'Ошибка', zh: '错误' },
  critical:   { ar: 'حرج', en: 'Critical', ru: 'Критич.', zh: '严重' },
  refresh:    { ar: 'تحديث', en: 'Refresh', ru: 'Обновить', zh: '刷新' },
  autoRefresh:{ ar: 'تحديث تلقائي', en: 'Auto-refresh', ru: 'Авто-обновление', zh: '自动刷新' },
  loading:    { ar: 'جاري التحميل...', en: 'Loading...', ru: 'Загрузка...', zh: '加载中...' },
  noLogs:     { ar: 'لا توجد سجلات', en: 'No logs found', ru: 'Логов нет', zh: '没有日志' },
  page:       { ar: 'صفحة', en: 'Page', ru: 'Стр.', zh: '页' },
  of:         { ar: 'من', en: 'of', ru: 'из', zh: '/' },
  details:    { ar: 'التفاصيل', en: 'Details', ru: 'Детали', zh: '详情' },
  from:       { ar: 'من', en: 'From', ru: 'От', zh: '从' },
  to:         { ar: 'إلى', en: 'To', ru: 'До', zh: '到' },
  total:      { ar: 'الإجمالي', en: 'Total', ru: 'Всего', zh: '总计' },
}

const s = {
  page: { padding: '24px', direction: 'rtl' as const, fontFamily: 'system-ui, sans-serif', color: '#cbd5e1' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '12px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#f59e0b', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  card: { background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
  filterRow: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' as const, alignItems: 'center' },
  btn: (bg: string) => ({ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#fff', background: bg }),
  filterBtn: (a: boolean, c: string) => ({ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: a ? c : '#334155', color: '#fff' }),
  input: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '13px' },
  select: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '13px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px' },
  th: { padding: '10px 8px', textAlign: 'right' as const, borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' as const },
  td: { padding: '8px', textAlign: 'right' as const, borderBottom: '1px solid #1e293b', maxWidth: '400px', overflow: 'hidden' as const, textOverflow: 'ellipsis' as const },
  badge: (c: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, color: '#fff', background: c, whiteSpace: 'nowrap' as const }),
  pager: { display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', alignItems: 'center' },
  pagerBtn: (disabled: boolean) => ({ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: disabled ? 'default' : 'pointer', background: disabled ? '#1e293b' : '#334155', color: disabled ? '#475569' : '#e2e8f0', fontSize: '13px' }),
  toggle: (on: boolean) => ({ width: '40px', height: '22px', borderRadius: '11px', background: on ? '#22c55e' : '#334155', cursor: 'pointer', position: 'relative' as const, display: 'inline-block', transition: 'background 0.2s' }),
  toggleDot: (on: boolean) => ({ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute' as const, top: '2px', transition: 'left 0.2s', left: on ? '20px' : '2px' }),
  langBtn: (a: boolean) => ({ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', background: a ? '#f59e0b' : '#334155', color: '#fff' }),
}

const levelColor: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', error: '#ef4444', critical: '#dc2626' }

export default function LogsPage() {
  const [lang, setLang] = useState<Lang>('ar')
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [sources, setSources] = useState<string[]>([])
  const [filter, setFilter] = useState<LogFilter>({ page: 1, per_page: 50 })
  const [levelFilter, setLevelFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const L = (k: string) => t[k]?.[lang] || t[k]?.['en'] || k

  const fetchData = useCallback(async () => {
    try {
      const f: LogFilter = { ...filter }
      if (levelFilter) f.level = levelFilter
      if (sourceFilter) f.source = sourceFilter
      if (searchText) f.search = searchText
      const res = await getLogs(f)
      setLogs(res.logs || [])
      setTotal(res.total || 0)
    } catch { }
    setLoading(false)
  }, [filter, levelFilter, sourceFilter, searchText])

  const fetchSources = useCallback(async () => {
    try { const s = await getLogSources(); setSources(s || []) } catch { }
  }, [])

  useEffect(() => { fetchData(); fetchSources() }, [fetchData, fetchSources])

  useEffect(() => {
    if (!autoRefresh) return
    const iv = setInterval(fetchData, 5000)
    return () => clearInterval(iv)
  }, [autoRefresh, fetchData])

  const totalPages = Math.ceil(total / (filter.per_page || 50))

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>{L('title')}</h1>
          <p style={s.subtitle}>{L('subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(['ar','en','ru','zh'] as Lang[]).map(l => (
            <button key={l} style={s.langBtn(lang === l)} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
          ))}
          <button style={s.btn('#334155')} onClick={fetchData}>{L('refresh')} ↻</button>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{L('autoRefresh')}</span>
          <div style={s.toggle(autoRefresh)} onClick={() => setAutoRefresh(!autoRefresh)}>
            <div style={s.toggleDot(autoRefresh)} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={s.card}>
        <div style={s.filterRow}>
          {/* Level filters */}
          {['', 'info', 'warning', 'error', 'critical'].map(lv => (
            <button key={lv} style={s.filterBtn(levelFilter === lv, levelColor[lv] || '#6366f1')}
              onClick={() => { setLevelFilter(lv); setFilter(f => ({ ...f, page: 1 })) }}>
              {lv ? L(lv) : L('all')}
            </button>
          ))}
          <span style={{ width: '1px', height: '24px', background: '#334155' }} />
          {/* Source selector */}
          <select style={s.select} value={sourceFilter}
            onChange={e => { setSourceFilter(e.target.value); setFilter(f => ({ ...f, page: 1 })) }}>
            <option value="">{L('source')}: {L('all')}</option>
            {sources.map(src => <option key={src} value={src}>{src}</option>)}
          </select>
          {/* Search */}
          <input style={{ ...s.input, width: '200px' }} placeholder={L('search')} value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData()} />
        </div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>{L('total')}: {total}</div>
      </div>

      {/* Logs Table */}
      <div style={s.card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>{L('loading')}</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>{L('noLogs')}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>{L('timestamp')}</th>
                  <th style={s.th}>{L('level')}</th>
                  <th style={s.th}>{L('source')}</th>
                  <th style={s.th}>{L('message')}</th>
                  <th style={s.th}>{L('farmId')}</th>
                  <th style={s.th}>{L('customer')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <>
                    <tr key={i} style={{ cursor: log.details ? 'pointer' : 'default' }}
                      onClick={() => log.details && setExpandedId(expandedId === log.id ? null : log.id)}>
                      <td style={{ ...s.td, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '11px' }}>
                        {new Date(log.timestamp).toLocaleTimeString('ar-SA')}
                      </td>
                      <td style={s.td}><span style={s.badge(levelColor[log.level] || '#64748b')}>{log.level}</span></td>
                      <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '11px' }}>{log.source}</td>
                      <td style={s.td}>{log.message}</td>
                      <td style={s.td}>{log.farm_id || '—'}</td>
                      <td style={s.td}>{log.customer_id || '—'}</td>
                    </tr>
                    {expandedId === log.id && log.details && (
                      <tr key={`${i}-details`}>
                        <td colSpan={6} style={{ ...s.td, background: '#0f172a', padding: '12px' }}>
                          <pre style={{ margin: 0, fontSize: '11px', color: '#94a3b8', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={s.pager}>
            <button style={s.pagerBtn((filter.page || 1) <= 1)}
              onClick={() => setFilter(f => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))}
              disabled={(filter.page || 1) <= 1}>◄</button>
            <span style={{ fontSize: '13px' }}>{L('page')} {filter.page || 1} {L('of')} {totalPages}</span>
            <button style={s.pagerBtn((filter.page || 1) >= totalPages)}
              onClick={() => setFilter(f => ({ ...f, page: Math.min(totalPages, (f.page || 1) + 1) }))}
              disabled={(filter.page || 1) >= totalPages}>►</button>
          </div>
        )}
      </div>
    </div>
  )
}
