'use client'

import { useEffect, useState } from 'react'

type Settings = {
  enabled: boolean
  sensitivity: number
  max_requests: number
  block_duration_minutes: number
  setting_key?: string
}

export default function AdminProtectionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    sensitivity: 3,
    max_requests: 100,
    block_duration_minutes: 60,
  })

  async function load() {
    setLoading(true)
    setError(null)
    setOkMsg(null)

    const res = await fetch('/api/protection/settings', { cache: 'no-store' })
    const json = await res.json()

    if (!res.ok) {
      setError(json?.error ?? 'Failed to load settings')
      setLoading(false)
      return
    }

    const s = json.data
    setSettings({
      enabled: !!s.enabled,
      sensitivity: Number(s.sensitivity ?? 3),
      max_requests: Number(s.max_requests ?? 100),
      block_duration_minutes: Number(s.block_duration_minutes ?? 60),
      setting_key: s.setting_key,
    })
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    setOkMsg(null)

    const res = await fetch('/api/protection/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json?.error ?? 'Failed to save')
      setSaving(false)
      return
    }

    setOkMsg('Saved ✅')
    setSaving(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Protection Settings</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Control anti-detection behavior from here.
      </p>

      {loading ? (
        <div style={{ marginTop: 20 }}>Loading...</div>
      ) : (
        <div style={{ marginTop: 20, display: 'grid', gap: 14 }}>
          {error && (
            <div style={{ padding: 12, border: '1px solid #f99', borderRadius: 10 }}>
              ❌ {error}
            </div>
          )}
          {okMsg && (
            <div style={{ padding: 12, border: '1px solid #9f9', borderRadius: 10 }}>
              {okMsg}
            </div>
          )}

          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings((p) => ({ ...p, enabled: e.target.checked }))}
            />
            <b>Enabled</b>
          </label>

          <div>
            <b>Sensitivity (1–5)</b>
            <input
              type="number"
              min={1}
              max={5}
              value={settings.sensitivity}
              onChange={(e) =>
                setSettings((p) => ({ ...p, sensitivity: Number(e.target.value) }))
              }
              style={{ width: '100%', padding: 10, marginTop: 6 }}
            />
          </div>

          <div>
            <b>Max Requests</b>
            <input
              type="number"
              min={1}
              value={settings.max_requests}
              onChange={(e) =>
                setSettings((p) => ({ ...p, max_requests: Number(e.target.value) }))
              }
              style={{ width: '100%', padding: 10, marginTop: 6 }}
            />
          </div>

          <div>
            <b>Block Duration (minutes)</b>
            <input
              type="number"
              min={1}
              value={settings.block_duration_minutes}
              onChange={(e) =>
                setSettings((p) => ({
                  ...p,
                  block_duration_minutes: Number(e.target.value),
                }))
              }
              style={{ width: '100%', padding: 10, marginTop: 6 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{ padding: '10px 14px', fontWeight: 700 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={load} style={{ padding: '10px 14px' }}>
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
