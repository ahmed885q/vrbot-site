'use client'

import { useState } from 'react'
import ComingSoonModal from '@/components/ComingSoonModal'

type Props = {
  userId?: string
  email?: string
}

export default function UpgradeButton({ userId, email }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onUpgradeClick = () => {
    setOpen(true)
    setDone(false)
    setErr(null)
  }

  const joinEarlyAccess = async () => {
    setLoading(true)
    setErr(null)
    try {
      // اختياري: لو ما سويت Route، تقدر تحذف fetch هذا وتخليها success مباشرة
      const res = await fetch('/api/upgrade-interest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: userId || null,
          email: email || null,
          source: 'dashboard_upgrade_modal',
        }),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Failed to submit')

      setDone(true)
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={onUpgradeClick}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          background: '#111827',
          color: '#fff',
          fontWeight: 900,
          cursor: 'pointer',
        }}
      >
        Upgrade to Pro
      </button>

      <ComingSoonModal
        open={open}
        onClose={() => setOpen(false)}
        title="Payments are coming soon 🚀"
        subtitle="We’re enabling PayPal payments after launch. Join early access and we’ll notify you first."
      >
        {done ? (
          <div
            style={{
              border: '1px solid #bbf7d0',
              background: '#ecfdf5',
              color: '#065f46',
              borderRadius: 12,
              padding: 12,
              fontWeight: 800,
            }}
          >
            ✅ You’re on the early access list!
          </div>
        ) : (
          <>
            <div
              style={{
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                color: '#111827',
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Pro includes:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Higher limits</li>
                <li>Priority features</li>
                <li>AI-assisted automation</li>
                <li>Early access to new tools</li>
              </ul>
            </div>

            {err ? <p style={{ color: 'red', marginTop: 10 }}>{err}</p> : null}

            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={joinEarlyAccess}
                disabled={loading}
                style={{
                  flex: '1 1 220px',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid #111827',
                  background: '#111827',
                  color: '#fff',
                  fontWeight: 900,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Submitting…' : 'Join Early Access'}
              </button>

              <button
                onClick={() => setOpen(false)}
                style={{
                  flex: '1 1 160px',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </ComingSoonModal>
    </>
  )
}
