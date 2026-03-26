'use client'

type LiveStreamProps = {
  screenshot: string | null
  streaming: boolean
  streamFarm: string | null
  tapMode: boolean
  tapFeedback: { x: number; y: number } | null
  adbFeedback: string
  onMouseDown: (e: React.MouseEvent<HTMLImageElement>) => void
  onMouseUp: (e: React.MouseEvent<HTMLImageElement>) => void
  onZoom: () => void
  onStart: () => void
  onStop: () => void
  onTapToggle: () => void
}

export function LiveStream({
  screenshot, streaming, streamFarm, tapMode, tapFeedback,
  adbFeedback, onMouseDown, onMouseUp, onZoom, onStart, onStop, onTapToggle
}: LiveStreamProps) {
  return (
    <div>
      <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 150, maxHeight: 220, border: streaming ? '2px solid rgba(239,68,68,0.5)' : '2px solid #21262d', transition: 'border-color 0.3s' }}>
        {screenshot ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img
              src={screenshot}
              alt="Live"
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUp}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: tapMode ? 'crosshair' : 'zoom-in', userSelect: 'none' }}
            />
            {tapFeedback && (
              <div style={{ position: 'absolute', left: tapFeedback.x - 15, top: tapFeedback.y - 15, width: 30, height: 30, borderRadius: '50%', border: '2px solid #f59e0b', background: 'rgba(245,158,11,0.2)', pointerEvents: 'none', animation: 'tapPulse 0.6s ease-out' }} />
            )}
            {adbFeedback && (
              <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: adbFeedback.startsWith('✅') ? '#3fb950' : '#f85149', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {adbFeedback}
              </div>
            )}
            {streaming && (
              <button onClick={e => { e.stopPropagation(); onTapToggle() }}
                style={{ position: 'absolute', bottom: 8, right: 8, background: tapMode ? 'rgba(245,158,11,0.9)' : 'rgba(0,0,0,0.7)', border: tapMode ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.2)', color: tapMode ? '#000' : '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                🎮
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); onZoom() }}
              style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>
              🔍
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#8b949e', padding: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📺</div>
            <div style={{ fontSize: 11 }}>{streaming ? '⏳ جارٍ التحميل...' : 'اضغط بث للمشاهدة'}</div>
          </div>
        )}
        {streaming && (
          <div style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>● LIVE</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {!streaming ? (
          <button onClick={onStart}
            style={{ flex: 1, padding: '7px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            📺 بث مباشر
          </button>
        ) : (
          <button onClick={onStop}
            style={{ flex: 1, padding: '7px', background: '#21262d', color: '#f85149', border: '1px solid #f8514930', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            ⏹ إيقاف البث
          </button>
        )}
      </div>
    </div>
  )
}
