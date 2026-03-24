'use client'

type GameControlsProps = {
  streamFarm: string | null
  tapMode: boolean
  onTapModeToggle: () => void
  onAdb: (command: string) => void
}

export function GameControls({ streamFarm, tapMode, onTapModeToggle, onAdb }: GameControlsProps) {
  if (!streamFarm) return null

  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: 12, border: '1px solid #f0a50030' }}>
      <div style={{ fontSize: 11, color: '#f0a500', marginBottom: 10, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🕹️ تحكم مباشر</span>
        <span style={{ color: '#8b949e', fontSize: 10 }}>{streamFarm}</span>
      </div>

      {/* System Buttons */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 5 }}>نظام</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: '◀ رجوع',    cmd: 'key:BACK', color: '#58a6ff' },
            { label: '⌂ الرئيسية', cmd: 'key:HOME', color: '#3fb950' },
            { label: '☰ قائمة',   cmd: 'key:MENU', color: '#f59e0b' },
          ].map(btn => (
            <button key={btn.cmd}
              onClick={() => onAdb(btn.cmd)}
              style={{ flex: 1, padding: '7px 4px', background: btn.color + '15', border: `1px solid ${btn.color}40`, color: btn.color, borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
            >{btn.label}</button>
          ))}
        </div>
      </div>

      {/* Game Buttons */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 5 }}>Viking Rise</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
          {[
            { label: '🗺️ خريطة', cmd: 'tap:71,647' },
            { label: '🏰 قلعة',  cmd: 'tap:640,360' },
            { label: '✉️ بريد',  cmd: 'tap:1210,647' },
            { label: '🎁 مكافآت', cmd: 'tap:1140,647' },
            { label: '⚔️ هجوم', cmd: 'tap:949,467' },
            { label: '🛡️ دفاع', cmd: 'tap:850,467' },
            { label: '⚗️ بحث',  cmd: 'tap:640,467' },
            { label: '🏗️ بناء', cmd: 'tap:640,550' },
            { label: '👥 تحالف', cmd: 'tap:71,467' },
          ].map(btn => (
            <button key={btn.cmd}
              onClick={() => onAdb(btn.cmd)}
              style={{ padding: '7px 4px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}
            >{btn.label}</button>
          ))}
        </div>
      </div>

      {/* D-Pad */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 5 }}>تمرير</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, maxWidth: 120, margin: '0 auto' }}>
          <div />
          <button onClick={() => onAdb('swipe:640,500,640,200')}
            style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>↑</button>
          <div />
          <button onClick={() => onAdb('swipe:800,360,200,360')}
            style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>←</button>
          <button onClick={() => onAdb('tap:640,360')}
            style={{ padding: '8px', background: '#f0a50018', border: '1px solid #f0a50050', color: '#f0a500', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>OK</button>
          <button onClick={() => onAdb('swipe:200,360,800,360')}
            style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>→</button>
          <div />
          <button onClick={() => onAdb('swipe:640,200,640,500')}
            style={{ padding: '8px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>↓</button>
          <div />
        </div>
      </div>

      {/* Tap Mode Toggle */}
      <button onClick={onTapModeToggle}
        style={{ width: '100%', padding: '8px', background: tapMode ? 'rgba(245,158,11,0.2)' : '#21262d', border: `1px solid ${tapMode ? '#f59e0b' : '#30363d'}`, color: tapMode ? '#f59e0b' : '#8b949e', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
      >{tapMode ? '🎮 وضع النقر: شغّال' : '🎮 تفعيل النقر'}</button>
    </div>
  )
}
