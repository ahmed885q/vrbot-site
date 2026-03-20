'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

// ══ Types ══════════════════════════════════════════════
interface Farm {
  farm_id: string
  device: string
  live_status: 'running' | 'idle' | 'error'
  last_error?: string
  game_pid?: number | null
}
interface Event {
  id: number
  type: 'success' | 'error' | 'warning' | 'info' | 'pr' | 'agent'
  msg: string
  time: string
}

const API  = 'https://cloud.vrbot.me'
const ORCH = 'https://cloud.vrbot.me'
const KEY  = 'vrbot_admin_2026'
const H    = { 'X-API-Key': KEY }

// ══ Live Monitor Page ══════════════════════════════════
export default function MonitorPage() {
  const [farms,     setFarms]     = useState<Farm[]>([])
  const [batch,     setBatch]     = useState<any>({})
  const [tasks,     setTasks]     = useState<any>({})
  const [events,    setEvents]    = useState<Event[]>([])
  const [agentStat, setAgentStat] = useState<any>({})
  const [loading,   setLoading]   = useState(true)
  const [lastUpdate,setLastUpdate]= useState('')
  const [running,   setRunning]   = useState(false)
  const [cmdResult, setCmdResult] = useState('')
  const eventsRef = useRef<HTMLDivElement>(null)
  const idRef     = useRef(0)

  // ── helpers ────────────────────────────────────────
  const addEvent = useCallback((type: Event['type'], msg: string) => {
    const now = new Date().toLocaleTimeString('ar-SA', { hour12: false })
    setEvents(prev => [{
      id: ++idRef.current, type, msg,
      time: now
    }, ...prev].slice(0, 60))
  }, [])

  // ── fetch all data ─────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [farmsRes, batchRes, tasksRes] = await Promise.allSettled([
        fetch(`${ORCH}/api/farms/status`,  { headers: H }),
        fetch(`${ORCH}/api/batch/status`,  { headers: H }),
        fetch(`${ORCH}/api/tasks/today`,   { headers: H }),
      ])

      if (farmsRes.status === 'fulfilled' && farmsRes.value.ok) {
        const d = await farmsRes.value.json()
        const newFarms: Farm[] = d.farms || []
        setFarms(prev => {
          // detect status changes
          prev.forEach(old => {
            const nw = newFarms.find(f => f.farm_id === old.farm_id)
            if (nw && nw.live_status !== old.live_status) {
              if (nw.live_status === 'error')
                addEvent('error', `farm_${nw.farm_id} خطأ: ${nw.last_error || 'unknown'}`)
              else if (nw.live_status === 'running')
                addEvent('success', `farm_${nw.farm_id} بدأت التشغيل`)
            }
          })
          return newFarms
        })
      }

      if (batchRes.status === 'fulfilled' && batchRes.value.ok) {
        const d = await batchRes.value.json()
        setBatch(d)
        setAgentStat({
          batch:      d.current_batch?.number ?? '?',
          progress:   d.current_batch?.progress ?? '?',
          error_rate: d.error_rate ?? '0%',
          interval:   d.config?.farming_interval ?? '5.5h',
          active:     d.active_tasks ?? 0,
        })
      }

      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        const d = await tasksRes.value.json()
        setTasks(d)
      }

      setLastUpdate(new Date().toLocaleTimeString('ar-SA', { hour12: false }))
      setLoading(false)
    } catch (e) {
      addEvent('error', 'فشل الاتصال بالـ Orchestrator')
    }
  }, [addEvent])

  // ── auto refresh every 15s ─────────────────────────
  useEffect(() => {
    fetchAll()
    addEvent('info', 'تم تشغيل لوحة المراقبة المباشرة')
    const interval = setInterval(fetchAll, 15000)
    return () => clearInterval(interval)
  }, [fetchAll])

  // ── send command to orchestrator ───────────────────
  const sendCommand = useCallback(async (cmd: string, params: any = {}) => {
    if (running) return
    setRunning(true)
    setCmdResult('')
    addEvent('info', `تنفيذ أمر: ${cmd}`)
    try {
      const res = await fetch(`${ORCH}/api/farms/command`, {
        method: 'POST',
        headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, ...params })
      })
      const d = await res.json()
      const msg = d.message || d.status || JSON.stringify(d).slice(0, 80)
      setCmdResult(msg)
      addEvent('success', `${cmd}: ${msg}`)
    } catch (e: any) {
      const msg = e.message || 'فشل'
      setCmdResult(msg)
      addEvent('error', `${cmd} فشل: ${msg}`)
    } finally {
      setRunning(false)
      await fetchAll()
    }
  }, [running, addEvent, fetchAll])

  // ── computed ───────────────────────────────────────
  const running_farms = farms.filter(f => f.live_status === 'running').length
  const idle_farms    = farms.filter(f => f.live_status === 'idle').length
  const error_farms   = farms.filter(f => f.live_status === 'error').length
  const total_farms   = farms.length || 20
  const success_rate  = tasks.total > 0
    ? Math.round((tasks.ok / tasks.total) * 100)
    : null

  // ══ Render ════════════════════════════════════════
  return (
    <div style={{
      minHeight:  '100vh',
      background: '#07090e',
      color:      '#c8d8e8',
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      padding:    '0',
      direction:  'rtl',
    }}>
      {/* ── Top Bar ── */}
      <div style={{
        background:   '#0d1117',
        borderBottom: '1px solid #1e2630',
        padding:      '14px 28px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        position:     'sticky',
        top:          0,
        zIndex:       100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: error_farms > 0 ? '#ff3b5c' : running_farms > 0 ? '#00d4aa' : '#ff9500',
            boxShadow: `0 0 8px ${error_farms > 0 ? '#ff3b5c' : running_farms > 0 ? '#00d4aa' : '#ff9500'}`,
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.05em' }}>
            VRBOT <span style={{ color: '#00d4aa' }}>MONITOR</span>
          </span>
          <span style={{ fontSize: '11px', color: '#4a5a6a' }}>vrbot.me/admin/monitor</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '11px', color: '#4a5a6a' }}>
            آخر تحديث: <span style={{ color: '#00d4aa' }}>{lastUpdate || '...'}</span>
          </span>
          <button
            onClick={() => { fetchAll(); addEvent('info', 'تحديث يدوي') }}
            style={{
              padding:      '6px 14px',
              background:   'transparent',
              border:       '1px solid #1e2630',
              borderRadius: '6px',
              color:        '#c8d8e8',
              cursor:       'pointer',
              fontSize:     '12px',
            }}
          >↻ تحديث</button>
        </div>
      </div>

      <div style={{ padding: '20px 28px' }}>

        {/* ── Stats Row ── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap:                 '12px',
          marginBottom:        '20px',
        }}>
          {[
            { label: 'إجمالي المزارع', value: total_farms,       color: '#c8d8e8', icon: '🖥️' },
            { label: 'تعمل الآن',      value: running_farms,     color: '#00d4aa', icon: '🟢' },
            { label: 'خاملة',          value: idle_farms,        color: '#4a5a6a', icon: '⚪' },
            { label: 'أخطاء',          value: error_farms,       color: '#ff3b5c', icon: '🔴' },
            { label: 'مهام اليوم',     value: tasks.total ?? 0,  color: '#0095ff', icon: '📋' },
            { label: 'معدل النجاح',    value: success_rate != null ? success_rate + '%' : 'N/A', color: '#22c55e', icon: '📊' },
            { label: 'Batch',          value: '#' + agentStat.batch, color: '#a855f7', icon: '⚙️' },
            { label: 'معدل الخطأ',     value: agentStat.error_rate ?? '0%', color: error_farms > 0 ? '#ff3b5c' : '#4a5a6a', icon: '⚠️' },
          ].map((s, i) => (
            <div key={i} style={{
              background:   '#0d1117',
              border:       `1px solid ${s.color}20`,
              borderRadius: '10px',
              padding:      '14px',
              textAlign:    'center',
              transition:   'border-color 0.3s',
            }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: '#4a5a6a', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: '1fr 320px',
          gap:                 '16px',
          marginBottom:        '16px',
        }}>

          {/* ── Farms Grid ── */}
          <div style={{
            background:   '#0d1117',
            border:       '1px solid #1e2630',
            borderRadius: '12px',
            overflow:     'hidden',
          }}>
            <div style={{
              padding:      '14px 18px',
              borderBottom: '1px solid #1e2630',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>
                🖥️ المزارع <span style={{ color: '#4a5a6a', fontSize: '11px' }}>({total_farms} مزرعة)</span>
              </span>
              <span style={{ fontSize: '10px', color: '#4a5a6a' }}>يتحدث كل 15 ثانية</span>
            </div>
            <div style={{
              padding:             '16px',
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap:                 '8px',
              maxHeight:           '320px',
              overflowY:           'auto',
            }}>
              {loading ? (
                Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} style={{
                    background:   '#1e2630',
                    borderRadius: '8px',
                    height:       '60px',
                    animation:    'shimmer 1.5s infinite',
                  }} />
                ))
              ) : (
                farms.map(f => {
                  const color =
                    f.live_status === 'running' ? '#00d4aa' :
                    f.live_status === 'error'   ? '#ff3b5c' : '#2a3a4a'
                  return (
                    <div
                      key={f.farm_id}
                      title={f.last_error || f.live_status}
                      style={{
                        background:   `${color}12`,
                        border:       `1px solid ${color}35`,
                        borderRadius: '8px',
                        padding:      '10px 6px',
                        textAlign:    'center',
                        cursor:       'default',
                        transition:   'all 0.3s',
                        position:     'relative',
                      }}
                    >
                      <div style={{
                        width:        '8px',
                        height:       '8px',
                        borderRadius: '50%',
                        background:   color,
                        margin:       '0 auto 6px',
                        boxShadow:    f.live_status === 'running' ? `0 0 8px ${color}` : 'none',
                        animation:    f.live_status === 'running' ? 'pulse 2s infinite' : 'none',
                      }} />
                      <div style={{ fontSize: '9px', color: color, fontWeight: 700 }}>
                        {f.farm_id.padStart(3, '0')}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Events Log ── */}
          <div style={{
            background:   '#0d1117',
            border:       '1px solid #1e2630',
            borderRadius: '12px',
            overflow:     'hidden',
            display:      'flex',
            flexDirection:'column',
          }}>
            <div style={{
              padding:      '14px 18px',
              borderBottom: '1px solid #1e2630',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>📡 سجل الأحداث</span>
              <button
                onClick={() => setEvents([])}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#4a5a6a', cursor: 'pointer', fontSize: '11px',
                }}
              >مسح</button>
            </div>
            <div ref={eventsRef} style={{
              flex:      1,
              overflowY: 'auto',
              padding:   '10px',
              maxHeight: '320px',
            }}>
              {events.length === 0 ? (
                <div style={{ color: '#2a3a4a', fontSize: '12px', textAlign: 'center', padding: '30px' }}>
                  لا توجد أحداث بعد...
                </div>
              ) : events.map(ev => {
                const colors: Record<string, string> = {
                  success: '#00d4aa', error: '#ff3b5c',
                  warning: '#ff9500', info: '#0095ff',
                  pr: '#a855f7', agent: '#ffd166',
                }
                const color = colors[ev.type] || '#4a5a6a'
                return (
                  <div key={ev.id} style={{
                    display:      'flex',
                    gap:          '8px',
                    padding:      '5px 6px',
                    borderRadius: '6px',
                    marginBottom: '3px',
                    animation:    'slideIn 0.2s ease',
                    background:   `${color}08`,
                    borderRight:  `2px solid ${color}`,
                  }}>
                    <span style={{ fontSize: '10px', color: '#4a5a6a', flexShrink: 0, minWidth: '45px' }}>
                      {ev.time}
                    </span>
                    <span style={{ fontSize: '11px', color, wordBreak: 'break-word' }}>{ev.msg}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Commands + Agent Info ── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 '16px',
        }}>

          {/* ── Commands ── */}
          <div style={{
            background:   '#0d1117',
            border:       '1px solid #1e2630',
            borderRadius: '12px',
            overflow:     'hidden',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2630' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>⚡ الأوامر السريعة</span>
            </div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: '▶ تشغيل دورة Agent',    cmd: 'run_agent_cycle', color: '#00d4aa', icon: '🤖' },
                { label: '📊 تقرير فوري',          cmd: 'get_report',      color: '#0095ff', icon: '📋' },
                { label: '🔄 إعادة تشغيل المزارع', cmd: 'restart_all',     color: '#ff9500', icon: '🔄' },
                { label: '⏹ إيقاف جميع المزارع',  cmd: 'stop_all',        color: '#ff3b5c', icon: '⏹' },
                { label: '🌱 بدء الزراعة',         cmd: 'start_farming',   color: '#22c55e', icon: '🌱' },
                { label: '🔍 فحص المزارع',         cmd: 'health_check',    color: '#a855f7', icon: '🔍' },
              ].map((c, i) => (
                <button
                  key={i}
                  onClick={() => sendCommand(c.cmd)}
                  disabled={running}
                  style={{
                    padding:      '12px',
                    background:   `${c.color}10`,
                    border:       `1px solid ${c.color}30`,
                    borderRadius: '8px',
                    color:        c.color,
                    cursor:       running ? 'not-allowed' : 'pointer',
                    fontSize:     '12px',
                    fontFamily:   'inherit',
                    fontWeight:   600,
                    transition:   'all 0.2s',
                    opacity:      running ? 0.5 : 1,
                    textAlign:    'center',
                  }}
                  onMouseEnter={e => { if (!running) (e.currentTarget as HTMLButtonElement).style.background = `${c.color}20` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${c.color}10` }}
                >
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{c.icon}</div>
                  {c.label}
                </button>
              ))}
            </div>
            {cmdResult && (
              <div style={{
                margin:       '0 16px 16px',
                padding:      '10px 14px',
                background:   '#00d4aa10',
                border:       '1px solid #00d4aa30',
                borderRadius: '8px',
                fontSize:     '12px',
                color:        '#00d4aa',
              }}>
                ✅ {cmdResult}
              </div>
            )}
          </div>

          {/* ── Agent Status ── */}
          <div style={{
            background:   '#0d1117',
            border:       '1px solid #1e2630',
            borderRadius: '12px',
            overflow:     'hidden',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2630' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>🤖 Ultra Agent</span>
            </div>
            <div style={{ padding: '16px' }}>
              {/* Progress Batch */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#4a5a6a' }}>Batch #{agentStat.batch}</span>
                  <span style={{ fontSize: '11px', color: '#00d4aa' }}>{agentStat.progress}</span>
                </div>
                <div style={{ height: '4px', background: '#1e2630', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height:     '100%',
                    width:      agentStat.progress || '0%',
                    background: 'linear-gradient(90deg, #00d4aa, #0095ff)',
                    borderRadius: '2px',
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>

              {/* Phases */}
              {[
                { phase: 'Phase 1', label: 'تحليل Logs + PR', color: '#00d4aa', active: true  },
                { phase: 'Phase 2', label: 'تقييم + استراتيجية', color: '#0095ff', active: true  },
                { phase: 'Phase 3', label: 'Multi-Agent + أهداف', color: '#a855f7', active: true  },
              ].map((p, i) => (
                <div key={i} style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '10px',
                  padding:      '8px 10px',
                  borderRadius: '8px',
                  marginBottom: '6px',
                  background:   `${p.color}08`,
                  border:       `1px solid ${p.color}20`,
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: p.active ? p.color : '#2a3a4a',
                    boxShadow:  p.active ? `0 0 6px ${p.color}` : 'none',
                  }} />
                  <span style={{ fontSize: '11px', color: p.color, fontWeight: 700, minWidth: '60px' }}>{p.phase}</span>
                  <span style={{ fontSize: '11px', color: '#4a5a6a' }}>{p.label}</span>
                  <span style={{ marginRight: 'auto', fontSize: '10px', color: p.color }}>✓ نشط</span>
                </div>
              ))}

              {/* Config */}
              <div style={{ marginTop: '12px', padding: '10px', background: '#07090e', borderRadius: '8px' }}>
                {[
                  ['دورة الزراعة', agentStat.interval ?? '5.5h'],
                  ['مهام نشطة',    agentStat.active ?? 0],
                  ['معدل الخطأ',   agentStat.error_rate ?? '0%'],
                ].map(([k, v], i) => (
                  <div key={i} style={{
                    display:       'flex',
                    justifyContent:'space-between',
                    padding:       '4px 0',
                    borderBottom:  i < 2 ? '1px solid #1e2630' : 'none',
                    fontSize:      '11px',
                  }}>
                    <span style={{ color: '#4a5a6a' }}>{k}</span>
                    <span style={{ color: '#c8d8e8', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; box-shadow: 0 0 0 0 currentColor; }
          50%      { opacity:.7; }
        }
        @keyframes shimmer {
          0%,100% { opacity:.4; }
          50%      { opacity:.8; }
        }
        @keyframes slideIn {
          from { opacity:0; transform: translateX(10px); }
          to   { opacity:1; transform: translateX(0); }
        }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2630; border-radius:2px; }
        button:active { transform: scale(0.97); }
      `}</style>
    </div>
  )
}
