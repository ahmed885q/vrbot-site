'use client'

type Farm = {
  id: string
  farm_name: string
  status: string
  game_account?: string
  tasks_today?: number
  current_task?: string | null
  live_status?: string
}

type FarmCardProps = {
  farm: Farm
  isSelected: boolean
  isRunning: boolean
  streaming: boolean
  streamFarm: string | null
  onSelect: () => void
  onRun: () => void
  onStop: () => void
  onDelete: () => void
  onActivate: () => void
  onStream: () => void
  onTransfer: () => void
}

const sc = (s: string) =>
  s === 'running' ? '#10b981' : s === 'provisioning' ? '#f59e0b' : '#64748b'

export function FarmCard({
  farm, isSelected, isRunning, streaming, streamFarm,
  onSelect, onRun, onStop, onDelete, onActivate, onStream, onTransfer
}: FarmCardProps) {
  const showActivate = farm.status === 'provisioning' || farm.live_status === 'idle'

  return (
    <div
      onClick={onSelect}
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc(farm.status), display: 'inline-block', boxShadow: `0 0 6px ${sc(farm.status)}` }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{farm.farm_name}</span>
        </div>
        <span style={{ fontSize: 11, color: sc(farm.status), fontFamily: 'monospace', background: sc(farm.status) + '15', padding: '2px 8px', borderRadius: 4 }}>
          {farm.status}
        </span>
      </div>

      {/* Info */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 4, fontSize: 12, color: '#8b949e' }}>
        <span>📧 {farm.game_account || '—'}</span>
        <span>⚡ {farm.tasks_today || 0} مهمة</span>
      </div>
      {farm.current_task && (
        <div style={{ fontSize: 11, color: '#f0a500', marginBottom: 4 }}>⚡ {farm.current_task}</div>
      )}
      {farm.live_status === 'idle' && (
        <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>⏳ جاري التجهيز...</div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {showActivate ? (
          <button onClick={e => { e.stopPropagation(); onActivate() }}
            style={{ flex: 1, background: '#f0a50018', border: '1px solid #f0a50050', color: '#f0a500', padding: '6px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⚡ تفعيل</button>
        ) : (
          <button onClick={e => { e.stopPropagation(); onRun() }} disabled={isRunning}
            style={{ flex: 1, background: '#3fb95018', border: '1px solid #3fb95050', color: '#3fb950', padding: '6px', borderRadius: 6, cursor: isRunning ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700 }}
          >{isRunning ? '⏳...' : '▶ تشغيل'}</button>
        )}
        <button onClick={e => { e.stopPropagation(); onTransfer() }}
          style={{ background: '#58a6ff18', border: '1px solid #58a6ff50', color: '#58a6ff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>📦</button>
        <button onClick={e => { e.stopPropagation(); onStop() }} disabled={isRunning}
          style={{ background: '#f8514918', border: '1px solid #f8514950', color: '#f85149', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>■</button>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', color: '#f85149', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>🗑️</button>
        <button onClick={e => { e.stopPropagation(); onStream() }}
          style={{
            background: streaming && streamFarm === farm.farm_name ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)',
            border: streaming && streamFarm === farm.farm_name ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(59,130,246,0.3)',
            color: streaming && streamFarm === farm.farm_name ? '#f87171' : '#58a6ff',
            padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700
          }}
        >{streaming && streamFarm === farm.farm_name ? '⏹' : '📺'}</button>
      </div>
    </div>
  )
}
