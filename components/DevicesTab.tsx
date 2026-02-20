'use client'

import React, { useState } from 'react'
import { Button, Card } from '@/components/bot/ui'
type Props = {
  deviceToken: string | null
  setDeviceToken: (token: string | null) => void
  deviceBusy: boolean
  setDeviceBusy: (busy: boolean) => void
  deviceError: string | null
  setDeviceError: (error: string | null) => void
}

export default function DevicesTab({
  deviceToken,
  setDeviceToken,
  deviceBusy,
  setDeviceBusy,
  deviceError,
  setDeviceError,
}: Props) {
  const [copySuccess, setCopySuccess] = useState(false)

  async function createToken() {
    setDeviceBusy(true)
    setDeviceError(null)
    setCopySuccess(false)

    try {
      const res = await fetch('/api/devices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'Viking Rise Bot Access' }),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Failed to create device token')

      setDeviceToken(j?.token || null)
    } catch (e: any) {
      setDeviceError(e?.message || 'Device token creation error')
    } finally {
      setDeviceBusy(false)
    }
  }

  async function revokeToken() {
    if (!deviceToken || !confirm('Revoke this token? It will stop working immediately.')) return

    setDeviceBusy(true)
    try {
      const res = await fetch('/api/devices/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: deviceToken }),
      })

      if (!res.ok) throw new Error('Failed to revoke token')
      setDeviceToken(null)
      setCopySuccess(false)
    } catch (error) {
      alert('Failed to revoke token')
    } finally {
      setDeviceBusy(false)
    }
  }

  function copyToken() {
    if (!deviceToken) return

    navigator.clipboard.writeText(deviceToken)
      .then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      })
      .catch(() => {
        alert('Failed to copy token')
      })
  }

  return (
    <>
      <Card
        title="Device Token"
        subtitle="For bot authentication (one per device)"
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ color: '#374151', fontWeight: 700 }}>
            Use this token to authenticate your bot client. Keep it secret!
          </div>

          {deviceError ? (
            <div style={{ color: '#ef4444', fontWeight: 700 }}>Error: {deviceError}</div>
          ) : null}

          {deviceToken ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Your Token:</div>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    background: '#f8fafc',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 13,
                    wordBreak: 'break-all',
                    fontWeight: 700,
                  }}
                >
                  {deviceToken}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button onClick={copyToken}>
                  {copySuccess ? '✅ Copied!' : '📋 Copy Token'}
                </Button>
                <Button variant="danger" onClick={revokeToken} disabled={deviceBusy}>
                  🔒 Revoke Token
                </Button>
              </div>

              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
                ⚠️ This token will be shown only once. Save it securely.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ color: '#6b7280', fontWeight: 700 }}>
                No active token. Generate one to connect your bot.
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button onClick={createToken} disabled={deviceBusy}>
                  {deviceBusy ? 'Generating...' : '🔑 Generate New Token'}
                </Button>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 14,
              border: '1px solid #e5e7eb',
              background: '#f8fafc',
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Usage Instructions:</div>
            <ol style={{ marginLeft: 20, fontSize: 13, color: '#374151', fontWeight: 700 }}>
              <li>Generate a token above</li>
              <li>Copy it to your bot configuration</li>
              <li>Use in bot client: <code>Authorization: Bearer {'{token}'}</code></li>
              <li>Revoke if compromised or no longer needed</li>
            </ol>
          </div>
        </div>
      </Card>

      <Card title="Connected Devices" subtitle="Active bot sessions">
        <div style={{ textAlign: 'center', padding: 20, color: '#6b7280', fontWeight: 700 }}>
          No active bot connections detected.
          {deviceToken ? ' Generate and use a token above to connect.' : ' Generate a token first.'}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#fff',
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>Example Bot Client</div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
                Last seen: Never
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 12, padding: '4px 8px', background: '#f3f4f6', borderRadius: 6, fontWeight: 800 }}>
                OFFLINE
              </span>
              <button
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #fca5a5',
                  background: '#fee2e2',
                  color: '#991b1b',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
          Note: Device connections are for manual bot clients. No automation server included.
        </div>
      </Card>

      <Card title="Security Notes" subtitle="Best practices for token safety">
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔐</span>
            <div>
              <div style={{ fontWeight: 900 }}>Keep Tokens Secret</div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>
                Treat tokens like passwords. Never share in public code or chats.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔄</span>
            <div>
              <div style={{ fontWeight: 900 }}>Regular Rotation</div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>
                Revoke old tokens and generate new ones periodically.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 20 }}>📱</span>
            <div>
              <div style={{ fontWeight: 900 }}>One Token Per Device</div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>
                Use separate tokens for different bots or devices.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🚫</span>
            <div>
              <div style={{ fontWeight: 900 }}>Revoke When Compromised</div>
              <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>
                Immediately revoke any token you suspect is compromised.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}