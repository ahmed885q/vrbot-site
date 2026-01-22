'use client'

import React, { useState } from 'react'
import { Button, Card, Badge } from '@/components/bot/ui'

type FarmRow = {
  id: string
  name: string
  server: string | null
  notes: string | null
  created_at: string
}

type Props = {
  slots: number | null
  trialEndsAt: string | null
  trialActive: boolean | null
  entError: string | null
  farms: FarmRow[]
  farmsLoading: boolean
  farmsError: string | null
  reloadFarms: () => Promise<void>
  ensureEntitlements: () => Promise<void>
}

export default function FarmsTab({
  slots,
  trialEndsAt,
  trialActive,
  entError,
  farms,
  farmsLoading,
  farmsError,
  reloadFarms,
  ensureEntitlements,
}: Props) {
  const [newFarmName, setNewFarmName] = useState('')
  const [newFarmServer, setNewFarmServer] = useState('')
  const [newFarmNotes, setNewFarmNotes] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  async function createFarm() {
    const name = newFarmName.trim()
    if (!name) {
      setCreateError('Farm name is required')
      return
    }

    setCreateBusy(true)
    setCreateError(null)
    setCreateSuccess(false)

    try {
      const res = await fetch('/api/farms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          server: newFarmServer.trim() || null,
          notes: newFarmNotes.trim() || null,
        }),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Failed to create farm')

      setCreateSuccess(true)
      setNewFarmName('')
      setNewFarmServer('')
      setNewFarmNotes('')
      await reloadFarms()
    } catch (e: any) {
      setCreateError(e?.message || 'Farm creation error')
    } finally {
      setCreateBusy(false)
    }
  }

  async function deleteFarm(id: string) {
    if (!confirm('Delete this farm? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/farms/delete?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete farm')
      await reloadFarms()
    } catch (error) {
      alert('Failed to delete farm')
    }
  }

  return (
    <>
      {/* Entitlements Card */}
      <Card
        title="Plan & Limits"
        subtitle="Your current subscription allowances"
        right={
          <Button variant="ghost" onClick={ensureEntitlements}>
            🔄 Refresh
          </Button>
        }
      >
        {entError ? (
          <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 12 }}>
            Error: {entError}
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 14,
              padding: '10px 0',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ color: '#111827', fontWeight: 700 }}>Farm Slots</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 900 }}>
                {farms.length}
                {slots !== null ? ` / ${slots}` : ''}
              </span>
              {slots !== null && farms.length >= slots ? (
                <Badge label="FULL" icon="⚠️" bg="#fee2e2" color="#991b1b" />
              ) : null}
            </div>
          </div>

          {trialActive !== null ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                padding: '10px 0',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ color: '#111827', fontWeight: 700 }}>Trial Status</div>
              <div>
                {trialActive ? (
                  <Badge label="ACTIVE" icon="⏳" bg="#e0f2fe" color="#075985" />
                ) : (
                  <Badge label="ENDED" icon="⏹️" bg="#f3f4f6" color="#374151" />
                )}
              </div>
            </div>
          ) : null}

          {trialEndsAt ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                padding: '10px 0',
              }}
            >
              <div style={{ color: '#111827', fontWeight: 700 }}>Trial Ends</div>
              <div style={{ color: '#374151' }}>{trialEndsAt}</div>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Create New Farm */}
      <Card title="Create New Farm" subtitle="Add a new Viking Rise account">
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Farm Name *</div>
            <input
              value={newFarmName}
              onChange={(e) => setNewFarmName(e.target.value)}
              placeholder="e.g., My Main Account"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                outline: 'none',
                fontWeight: 700,
              }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Server (optional)</div>
            <input
              value={newFarmServer}
              onChange={(e) => setNewFarmServer(e.target.value)}
              placeholder="e.g., NA-123"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                outline: 'none',
                fontWeight: 700,
              }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Notes (optional)</div>
            <textarea
              value={newFarmNotes}
              onChange={(e) => setNewFarmNotes(e.target.value)}
              placeholder="Any notes for this farm..."
              style={{
                width: '100%',
                minHeight: 80,
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                outline: 'none',
                fontWeight: 700,
                resize: 'vertical',
              }}
            />
          </div>

          {createError ? (
            <div style={{ color: '#ef4444', fontWeight: 700 }}>Error: {createError}</div>
          ) : null}

          {createSuccess ? (
            <div style={{ color: '#16a34a', fontWeight: 700 }}>✅ Farm created successfully!</div>
          ) : null}

          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={createFarm} disabled={createBusy}>
              {createBusy ? 'Creating...' : '➕ Create Farm'}
            </Button>
            {slots !== null && farms.length >= slots ? (
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>
                Upgrade plan to add more farms
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Farms List */}
      <Card
        title="Your Farms"
        subtitle="All connected Viking Rise accounts"
        right={
          <Button variant="ghost" onClick={reloadFarms}>
            🔄 Refresh
          </Button>
        }
      >
        {farmsLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
            Loading farms...
          </div>
        ) : farmsError ? (
          <div style={{ color: '#ef4444', fontWeight: 700, textAlign: 'center', padding: 20 }}>
            Error: {farmsError}
          </div>
        ) : farms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
            No farms yet. Create your first farm above.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {farms.map((farm) => (
              <div
                key={farm.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 14,
                  padding: 14,
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{farm.name}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 13 }}>
                      {farm.server ? (
                        <span style={{ color: '#6b7280', fontWeight: 700 }}>
                          🖥️ Server: {farm.server}
                        </span>
                      ) : null}
                      <span style={{ color: '#6b7280', fontWeight: 700 }}>
                        📅 Created: {new Date(farm.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {farm.notes ? (
                      <div style={{ marginTop: 8, color: '#4b5563', fontWeight: 700, fontSize: 13 }}>
                        📝 {farm.notes}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={`/farm/${farm.id}`}
                      style={{
                        textDecoration: 'none',
                        fontWeight: 900,
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        color: '#111827',
                        fontSize: 13,
                      }}
                    >
                      Open
                    </a>
                    <button
                      onClick={() => deleteFarm(farm.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: '1px solid #fca5a5',
                        background: '#fee2e2',
                        color: '#991b1b',
                        fontWeight: 900,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <Badge label="Viking Rise" icon="🎮" bg="#dbeafe" color="#1e40af" />
                  <Badge label="Manual Mode" icon="👨‍💻" bg="#f3f4f6" color="#374151" />
                  <Badge label="No Bot" icon="🤖" bg="#fef3c7" color="#92400e" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
          Note: Farms are for manual tracking. No automation data is stored.
        </div>
      </Card>
    </>
  )
}