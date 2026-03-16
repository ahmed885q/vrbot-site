'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

const TASKS_MAP = [
  { group: 'الموارد 🌾',    color: '#10b981', tasks: ['Gather Resources', 'Collect Farms', 'Open Chests', 'Collect Free Items'] },
  { group: 'القتال ⚔️',    color: '#ef4444', tasks: ['Kill Monster', 'Hunt Niflung', 'Rally Niflung'] },
  { group: 'التحالف 🏰',   color: '#8b5cf6', tasks: ['Tribe Tech', 'Tribe Gifts', 'Alliance Help', 'Send Gifts'] },
  { group: 'اليومية 📋',    color: '#f59e0b', tasks: ['Mail Rewards', 'Hall of Valor', 'Prosperity', 'Quest Rewards'] },
  { group: 'التطوير 🔨',    color: '#3b82f6', tasks: ['Building Upgrade', 'Train Troops', 'Research Tech', 'Heal Wounded'] },
]

type Farm = {
  id: string
  farm_name: string
  status: string
  game_account?: string
  tasks_today?: number
  live_status?: 'online' | 'idle' | 'offline'
}

export default function LivePage() {
  const [farms, setFarms]           = useState<Farm[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedFarm, setSelected] = useState<string | null>(null)
  const [selectedTasks, setTasks]   = useState<Set<string>>(new Set())
  const [running, setRunning]       = useState<Record<string, boolean>>({})
  const [msg, setMsg]               = useState('')
  const [cols, setCols]             = useState(2)

  const showMsg = (m: string, ms = 4000) => {
    setMsg(m)
    setTimeout(() => setMsg(''), ms)
  }

  const loadFarms = useCallback(async () => {
    try {
      const res = await fetch('/api/farms/list')
      const d   = await res.json()
      const list = (d.farms || []).map((f: any) => ({
        id:          f.farm_name || f.id,
        farm_name:   f.farm_name || f.id,
        status:      f.status,
        game_account: f.game_account || '',
        tasks_today: f.tasks_today || 0,
        live_status: f.status === 'running' ? 'online' : f.status === 'provisioning' ? 'idle' : 'offline',
      }))
      setFarms(list)
      if (list.length > 0 && !selectedFarm) setSelected(list[0].id)
    } catch {}
    setLoading(false)
  }, [selectedFarm])

  useEffect(() => {
    loadFarms()
    const t = setInterval(loadFarms, 30000)
    return () => clearInterval(t)
  }, [loadFarms])

  async function runTasks(farmId: string, taskList: string[], action?: string) {
    setRunning(p => ({ ...p, [farmId]: true }))
    showMsg(`⏳ جارٍ تشغيل ${taskList.length} مهمة على ${farmId}...`)
    try {
      const res = await fetch('/api/farms/run-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farm_id: farmId, tasks: taskList, action }),
      })
      const d = await res.json()
      if (d.ok) {
        showMsg(`✅ تم تشغيل ${taskList.length} مهمة على ${farmId}`)
        loadFarms()
      } else {
        showMsg(`❌ خطأ: ${d.error || 'فشل التشغيل'}`)
      }
    } catch {
      showMsg('❌ لا يمكن الاتصال بالسيرفر')
    }
    setRunning(p => ({ ...p, [farmId]: false }))
  }

  async function stopFarm(farmId: string) {
    setRunning(p => ({ ...p, [farmId]: true }))
    showMsg(`⏹ جارٍ إيقاف ${farmId}...`)
    await fetch('/api/farms/run-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farm_id: farmId, action: 'stop' }),
    })
    showMsg(`⏹ تم إيقاف ${farmId}`)
    setRunning(p => ({ ...p, [farmId]: false }))
    loadFarms()
  }

  function toggleTask(t: string) {
    setTasks(p => {
      const n = new Set(p)
      n.has(t) ? n.delete(t) : n.add(t)
      return n
    })
  }

  const sc = (s: string) =>
    s === 'running' ? '#10b981' : s === 'provisioning' ? '#f59e0b' : '#64748b'

  const activeFarm = farms.find(f => f.id === selectedFarm)

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', background: '#161b22', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ color: '#f0a500', fontSize: 18, fontWeight: 700, margin: 0 }}>⚔️ مزارعي — Live</h1>
          <p style={{ color: '#8b949e', fontSize: 12, margin: '2px 0 0', fontFamily: 'monospace' }}>
            <span style={{ color: '#3fb950' }}>● {farms.filter(f => f.status === 'running').length}</span> شغّالة ·{' '}
            <span style={{ color: '#58a6ff' }}>⚡ {farms.reduce((s, f) => s + (f.tasks_today || 0), 0)}</span> مهمة اليوم
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/dashboard" style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 12 }}>← الرئيسية</Link>
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => setCols(n)} style={{ background: cols === n ? '#f0a500' : '#21262d', color: cols === n ? '#0d1117' : '#8b949e', border: '1px solid #30363d', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>{n}</button>
          ))}
        </div>
      </div>

      {/* Message bar */}
      {msg && (
        <div style={{ background: '#58a6ff15', borderBottom: '1px solid #58a6ff30', color: '#58a6ff', padding: '8px 24px', fontSize: 13, fontFamily: 'monospace' }}>{msg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0, height: 'calc(100vh - 90px)' }}>

        {/* Left — Farms Grid */}
        <div style={{ padding: 20, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 40 }}>⚔️</div>
              <p style={{ color: '#8b949e', fontSize: 13 }}>جارٍ تحميل مزارعك...</p>
            </div>
          ) : farms.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 52 }}>🏰</div>
              <h2 style={{ color: '#e6edf3', margin: 0 }}>لا توجد مزارع بعد</h2>
              <Link href="/dashboard" style={{ background: 'linear-gradient(135deg,#f0a500,#e05c2a)', color: '#0d1117', padding: '10px 28px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>+ إضافة مزرعة</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
              {farms.map(farm => {
                const isSelected = farm.id === selectedFarm
                const isRunning  = running[farm.id]
                return (
                  <div
                    key={farm.id}
                    onClick={() => setSelected(farm.id)}
                    style={{
                      borderRadius: 10,
                      border: `2px solid ${isSelected ? '#f0a500' : '#21262d'}`,
                      background: isSelected ? '#f0a50010' : '#161b22',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      padding: 16,
                      boxShadow: isSelected ? '0 0 20px #f0a50025' : 'none',
                    }}
                  >
                    {/* Farm Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc(farm.status), display: 'inline-block', boxShadow: `0 0 6px ${sc(farm.status)}` }} />
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{farm.farm_name}</span>
                      </div>
                      <span style={{ fontSize: 11, color: sc(farm.status), fontFamily: 'monospace', background: sc(farm.status) + '15', padding: '2px 8px', borderRadius: 4 }}>
                        {farm.status}
                      </span>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: '#8b949e' }}>
                      <span>📧 {farm.game_account || '—'}</span>
                      <span>⚡ {farm.tasks_today || 0} مهمة</span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={e => { e.stopPropagation(); runTasks(farm.id, ['Gather Resources', 'Mail Rewards', 'Tribe Tech'], 'start') }}
                        disabled={isRunning}
                        style={{ flex: 1, background: '#3fb95018', border: '1px solid #3fb95050', color: '#3fb950', padding: '6px', borderRadius: 6, cursor: isRunning ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700 }}
                      >
                        {isRunning ? '⏳...' : '▶ تشغيل'}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); stopFarm(farm.id) }}
                        disabled={isRunning}
                        style={{ background: '#f8514918', border: '1px solid #f8514950', color: '#f85149', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                      >
                        ■
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — Control Panel */}
        <div style={{ background: '#161b22', borderLeft: '1px solid #21262d', padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Selected Farm */}
          <div>
            <h3 style={{ color: '#f0a500', margin: '0 0 12px', fontSize: 14 }}>🎮 لوحة التحكم</h3>
            {activeFarm ? (
              <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #f0a50030' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{activeFarm.farm_name}</div>
                <div style={{ fontSize: 12, color: '#8b949e' }}>📧 {activeFarm.game_account || '—'}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <span style={{ color: sc(activeFarm.status) }}>● {activeFarm.status}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: '#8b949e', fontSize: 12 }}>اختر مزرعة من اليسار</p>
            )}
          </div>

          {/* Tasks Selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ color: '#e6edf3', margin: 0, fontSize: 13 }}>📋 اختر المهام</h4>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setTasks(new Set(TASKS_MAP.flatMap(g => g.tasks)))} style={{ fontSize: 10, padding: '3px 8px', background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, cursor: 'pointer' }}>الكل</button>
                <button onClick={() => setTasks(new Set())} style={{ fontSize: 10, padding: '3px 8px', background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, cursor: 'pointer' }}>مسح</button>
              </div>
            </div>

            {TASKS_MAP.map(group => (
              <div key={group.group} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: group.color, fontWeight: 700, marginBottom: 6 }}>{group.group}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.tasks.map(task => {
                    const on = selectedTasks.has(task)
                    return (
                      <button
                        key={task}
                        onClick={() => toggleTask(task)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: `1px solid ${on ? group.color : '#30363d'}`,
                          background: on ? group.color + '20' : '#21262d',
                          color: on ? group.color : '#8b949e',
                          fontSize: 11,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {task}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Run Button */}
          {activeFarm && (
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8, textAlign: 'center' }}>
                {selectedTasks.size > 0 ? `${selectedTasks.size} مهمة محددة` : 'لم تُحدَّد مهام'}
              </div>
              <button
                onClick={() => {
                  if (selectedTasks.size === 0) {
                    showMsg('⚠️ اختر مهمة واحدة على الأقل')
                    return
                  }
                  runTasks(activeFarm.id, Array.from(selectedTasks))
                }}
                disabled={running[activeFarm.id]}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: selectedTasks.size > 0 ? 'linear-gradient(135deg,#10b981,#059669)' : '#21262d',
                  color: selectedTasks.size > 0 ? '#fff' : '#8b949e',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: selectedTasks.size > 0 ? 'pointer' : 'not-allowed',
                  marginBottom: 8,
                }}
              >
                {running[activeFarm.id] ? '⏳ جارٍ التشغيل...' : `▶ تشغيل ${selectedTasks.size} مهمة`}
              </button>
              <button
                onClick={() => stopFarm(activeFarm.id)}
                style={{ width: '100%', padding: '10px', background: '#f8514910', border: '1px solid #f8514930', color: '#f85149', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                ■ إيقاف المزرعة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
