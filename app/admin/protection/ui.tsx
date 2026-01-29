'use client'

import { useEffect, useMemo, useState } from 'react'

type Setting = {
  setting_key: string
  setting_value: string | null
  value_type: string
  category: string
  updated_at?: string
}

type Incident = {
  id: string
  created_at: string
  user_id?: string | null
  risk_score?: number | null
  reason?: string | null
  meta?: any
}

export default function ProtectionDashboard() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const systemEnabled = useMemo(() => {
    const row = settings.find((s) => s.setting_key === 'system_enabled')
    return row?.setting_value === 'true'
  }, [settings])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [sRes, iRes] = await Promise.all([
        fetch('/api/protection/settings', { cache: 'no-store' }),
        fetch('/api/protection/incidents', { cache: 'no-store' }),
      ])

      if (!sRes.ok) throw new Error((await sRes.json())?.error ?? 'Failed to load settings')
      if (!iRes.ok) throw new Error((await iRes.json())?.error ?? 'Failed to load incidents')

      const sJson = await sRes.json()
      const iJson = await iRes.json()

      setSettings(sJson.data ?? [])
      setIncidents(iJson.data ?? [])
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function toggleEnabled(next: boolean) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/protection/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to toggle')

      await loadAll()
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function saveSetting(s: Setting, nextValue: string) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/protection/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: s.setting_key,
          setting_value: nextValue,
          value_type: s.value_type,
          category: s.category,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Failed to save setting')

      await loadAll()
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading protection dashboard…</div>

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Protection Dashboard</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>Manage anti-detection settings and view detection incidents.</p>

      {error && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #f99', borderRadius: 12 }}>
          {error}
        </div>
      )}

      {/* System toggle */}
      <div style={{ marginTop: 18, padding: 16, border: '1px solid #ddd', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>System Enabled</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>Enable / disable the protection system.</div>
          </div>

          <button
            onClick={() => toggleEnabled(!systemEnabled)}
            disabled={saving}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #ccc',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            {systemEnabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
          Current: <b>{systemEnabled ? 'ON' : 'OFF'}</b>
        </div>
      </div>

      {/* Settings list */}
      <div style={{ marginTop: 18, padding: 16, border: '1px solid #ddd', borderRadius: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Settings</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 10, fontWeight: 700, opacity: 0.75 }}>
          <div>Key</div>
          <div>Value</div>
          <div>Action</div>
        </div>

        <div style={{ marginTop: 8, display: 'grid', gap: 10 }}>
          {settings
            .filter((s) => s.setting_key !== 'system_enabled')
            .map((s) => (
              <SettingRow key={s.setting_key} setting={s} onSave={saveSetting} saving={saving} />
            ))}
        </div>
      </div>

      {/* Incidents */}
      <div style={{ marginTop: 18, padding: 16, border: '1px solid #ddd', borderRadius: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Detection Incidents (latest 100)</div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', opacity: 0.8 }}>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Time</th>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>User</th>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Risk</th>
                <th style={{ padding: 8, borderBottom: '1px solid #eee' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((x) => (
                <tr key={x.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', whiteSpace: 'nowrap' }}>
                    {new Date(x.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{x.user_id ?? '-'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{x.risk_score ?? '-'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{x.reason ?? '-'}</td>
                </tr>
              ))}
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 10, opacity: 0.75 }}>
                    No incidents yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={loadAll}
          disabled={loading || saving}
          style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid #ccc',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 700,
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  )
}

function SettingRow({
  setting,
  onSave,
  saving,
}: {
  setting: Setting
  saving: boolean
  onSave: (s: Setting, nextValue: string) => Promise<void>
}) {
  const [value, setValue] = useState(setting.setting_value ?? '')

  useEffect(() => {
    setValue(setting.setting_value ?? '')
  }, [setting.setting_value])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 10, alignItems: 'center' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{setting.setting_key}</div>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid #ddd' }}
      />

      <button
        onClick={() => onSave(setting, value)}
        disabled={saving}
        style={{
          padding: '10px 12px',
          borderRadius: 12,
          border: '1px solid #ccc',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >
        Save
      </button>
    </div>
  )
}
