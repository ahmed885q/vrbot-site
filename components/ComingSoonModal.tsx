'use client'

import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children?: React.ReactNode
}

export default function ComingSoonModal({
  open,
  onClose,
  title = 'Pro is coming soon 🚀',
  subtitle = 'We’re launching payments soon. Join the early access list to get notified.',
  children,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          borderRadius: 16,
          background: '#fff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#111827' }}>
              {title}
            </h2>
            <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 13 }}>
              {subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: '1px solid #e5e7eb',
              background: '#fff',
              borderRadius: 10,
              padding: '8px 10px',
              cursor: 'pointer',
              height: 40,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 14 }}>{children}</div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              border: '1px solid #e5e7eb',
              background: '#fff',
              borderRadius: 12,
              padding: '10px 14px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
