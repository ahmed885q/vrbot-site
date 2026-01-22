'use client'
import React from 'react'

export function Badge({
  label,
  icon,
  bg,
  color,
}: {
  label: string
  icon?: string
  bg: string
  color: string
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: bg,
        color,
        border: '1px solid rgba(17,24,39,0.10)',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{icon ?? '•'}</span>
      {label}
    </span>
  )
}

export function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 6px 18px rgba(17,24,39,0.06)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: 14,
          borderBottom: '1px solid #eef2f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 900 }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 2, fontSize: 12, color: '#6b7280' }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right}
      </div>

      <div style={{ padding: 14 }}>{children}</div>
    </div>
  )
}

export function Row({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 14,
        padding: '10px 0',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div style={{ color: '#111827', fontWeight: 700 }}>{left}</div>
      <div style={{ color: '#374151' }}>{right}</div>
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
 variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 12,
    fontWeight: 800,
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    opacity: disabled ? 0.6 : 1,
  }

  const styles =
  variant === 'primary'
    ? { ...base, background: '#111827', color: '#fff' }
    : variant === 'danger'
      ? { ...base, background: '#dc2626', color: '#fff' }
      : { ...base, background: '#fff', color: '#111827', borderColor: '#e5e7eb' }
  return (
    <button type="button" style={styles} onClick={disabled ? undefined : onClick} disabled={disabled}>
      {children}
    </button>
  )
}
