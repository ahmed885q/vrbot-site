'use client'

import React, { useState } from 'react'
import { Button, Card, Badge } from '@/components/bot/ui'

type FarmRow = {
  id: string
  name: string
  server: string | null
  notes: string | null
  created_at: string
  bot_enabled?: boolean // ✅ إضافة حالة البوت
  bot_settings?: any    // ✅ إضافة إعدادات البوت للمزرعة
  last_active?: string  // ✅ إضافة آخر نشاط
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
  // ✅ إضافة دالة لتشغيل/إيقاف البوت للمزرعة
  onToggleBot?: (farmId: string, enabled: boolean) => Promise<void>
  // ✅ إضافة دالة لفتح إعدادات البوت للمزرعة
  onOpenBotSettings?: (farmId: string) => void
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
  onToggleBot,
  onOpenBotSettings,
}: Props) {
  const [newFarmName, setNewFarmName] = useState('')
  const [newFarmServer, setNewFarmServer] = useState('')
  const [newFarmNotes, setNewFarmNotes] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)
  
  // ✅ حالة لتحميل البوت لكل مزرعة
  const [botLoading, setBotLoading] = useState<Record<string, boolean>>({})

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
          bot_settings: { // ✅ إضافة إعدادات افتراضية للبوت
            security: {
              antiDetection: true,
              randomDelays: true,
              maxActionsPerHour: 180,
              humanizeMouse: true,
              avoidPatterns: true
            },
            automation: {
              autoFarm: true,
              autoBuild: true,
              targetLevel: 17,
              priorityBuilding: 'hall'
            }
          }
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

  // ✅ دالة لتشغيل/إيقاف البوت لمزرعة محددة
  async function toggleBotForFarm(farmId: string, currentlyEnabled: boolean) {
    setBotLoading(prev => ({ ...prev, [farmId]: true }))
    
    try {
      if (onToggleBot) {
        await onToggleBot(farmId, !currentlyEnabled)
      } else {
        // التنفيذ الافتراضي إذا لم توفر الدالة
        const res = await fetch(`/api/farms/${farmId}/bot/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: !currentlyEnabled })
        })
        
        if (!res.ok) throw new Error('Failed to toggle bot')
      }
      
      await reloadFarms()
    } catch (error) {
      console.error('Failed to toggle bot:', error)
      alert('Failed to toggle bot. Please try again.')
    } finally {
      setBotLoading(prev => ({ ...prev, [farmId]: false }))
    }
  }

  // ✅ دالة لفتح إعدادات البوت
  function openBotSettings(farmId: string) {
    if (onOpenBotSettings) {
      onOpenBotSettings(farmId)
    } else {
      // التنفيذ الافتراضي
      window.location.href = `/farm/${farmId}/settings`
    }
  }

  return (
    <>
      {/* Entitlements Card */}
      <Card
        title="Plan & Limits"
        subtitle="Your current subscription allowances"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={ensureEntitlements}>
              🔄 Refresh
            </Button>
            {slots !== null && farms.length >= slots && (
              <Button 
                variant="primary"
                onClick={() => window.open('/pricing', '_blank')}
              >
                ⭐ Upgrade Plan
              </Button>
            )}
          </div>
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
              ) : (
                <Badge label="AVAILABLE" icon="✅" bg="#dcfce7" color="#166534" />
              )}
            </div>
          </div>

          {/* ✅ إضافة إحصائيات البوت */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 14,
              padding: '10px 0',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ color: '#111827', fontWeight: 700 }}>Active Bots</div>
            <div style={{ fontWeight: 900 }}>
              {farms.filter(f => f.bot_enabled).length} / {farms.length}
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

          {/* ✅ إضافة خيارات البوت عند الإنشاء */}
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" defaultChecked />
              <span style={{ fontWeight: 700 }}>Enable bot with default settings</span>
            </label>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Includes: Anti-Detection, Auto-Farming, Auto-Build to level 17
            </div>
          </div>

          {createError ? (
            <div style={{ color: '#ef4444', fontWeight: 700 }}>Error: {createError}</div>
          ) : null}

          {createSuccess ? (
            <div style={{ color: '#16a34a', fontWeight: 700 }}>✅ Farm created successfully!</div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button 
              onClick={createFarm} 
              disabled={createBusy || (slots !== null && farms.length >= slots)}
            >
              {createBusy ? 'Creating...' : '➕ Create Farm'}
            </Button>
            
            {slots !== null && farms.length >= slots ? (
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 13 }}>
                ⚠️ Upgrade plan to add more farms
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
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={reloadFarms}>
              🔄 Refresh
            </Button>
            {farms.length > 0 && (
              <Button variant="primary" onClick={() => console.log('Export farms')}>
                📤 Export
              </Button>
            )}
          </div>
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
            {farms.map((farm) => {
              const isBotEnabled = farm.bot_enabled || false
              const isLoading = botLoading[farm.id] || false
              
              return (
                <div
                  key={farm.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 14,
                    padding: 14,
                    background: '#f8fafc',
                    borderLeft: `4px solid ${isBotEnabled ? '#10b981' : '#6b7280'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ fontWeight: 900, fontSize: 16 }}>{farm.name}</div>
                        {isBotEnabled && (
                          <Badge label="BOT ACTIVE" icon="🤖" bg="#dcfce7" color="#166534" />
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 13, flexWrap: 'wrap' }}>
                        {farm.server ? (
                          <span style={{ color: '#6b7280', fontWeight: 700 }}>
                            🖥️ Server: {farm.server}
                          </span>
                        ) : null}
                        <span style={{ color: '#6b7280', fontWeight: 700 }}>
                          📅 Created: {new Date(farm.created_at).toLocaleDateString()}
                        </span>
                        {farm.last_active && (
                          <span style={{ color: '#6b7280', fontWeight: 700 }}>
                            ⏰ Last active: {new Date(farm.last_active).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      {farm.notes ? (
                        <div style={{ marginTop: 8, color: '#4b5563', fontWeight: 700, fontSize: 13 }}>
                          📝 {farm.notes}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {/* ✅ زر تشغيل/إيقاف البوت */}
                      <button
                        onClick={() => toggleBotForFarm(farm.id, isBotEnabled)}
                        disabled={isLoading}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: `1px solid ${isBotEnabled ? '#fca5a5' : '#a7f3d0'}`,
                          background: isBotEnabled ? '#fee2e2' : '#dcfce7',
                          color: isBotEnabled ? '#991b1b' : '#166534',
                          fontWeight: 900,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          minWidth: 100,
                          justifyContent: 'center',
                          opacity: isLoading ? 0.6 : 1,
                        }}
                      >
                        {isLoading ? '...' : (
                          <>
                            {isBotEnabled ? '⏹️ Stop Bot' : '🤖 Start Bot'}
                          </>
                        )}
                      </button>
                      
                      {/* ✅ زر إعدادات البوت */}
                      <button
                        onClick={() => openBotSettings(farm.id)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: '1px solid #93c5fd',
                          background: '#dbeafe',
                          color: '#1e40af',
                          fontWeight: 900,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        ⚙️ Settings
                      </button>
                      
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

                  {/* ✅ معلومات البوت الإضافية */}
                  {farm.bot_settings && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: 10, 
                      background: '#f0f9ff', 
                      borderRadius: 8,
                      border: '1px solid #e0f2fe'
                    }}>
                      <div style={{ fontWeight: 900, fontSize: 13, color: '#075985', marginBottom: 4 }}>
                        Bot Settings:
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {farm.bot_settings.security?.antiDetection && (
                          <Badge label="Anti-Detection" icon="🛡️" bg="#fff7ed" color="#9a3412" />
                        )}
                        {farm.bot_settings.automation?.autoFarm && (
                          <Badge label="Auto-Farm" icon="🌾" bg="#dcfce7" color="#166534" />
                        )}
                        {farm.bot_settings.automation?.autoBuild && (
                          <Badge label={`Build to L${farm.bot_settings.automation.targetLevel || 17}`} 
                                 icon="🏗️" bg="#dbeafe" color="#1e40af" />
                        )}
                        {farm.bot_settings.combat?.huntMonsters && (
                          <Badge label="Monster Hunt" icon="⚔️" bg="#fee2e2" color="#991b1b" />
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                    <Badge label="Viking Rise" icon="🎮" bg="#dbeafe" color="#1e40af" />
                    <Badge label={farm.bot_enabled ? "Auto Mode" : "Manual Mode"} 
                           icon={farm.bot_enabled ? "🤖" : "👨‍💻"} 
                           bg={farm.bot_enabled ? "#dcfce7" : "#f3f4f6"} 
                           color={farm.bot_enabled ? "#166534" : "#374151"} />
                    {farm.bot_settings?.ai?.enabled && (
                      <Badge label="AI Enabled" icon="🧠" bg="#f3e8ff" color="#7c3aed" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ 
          marginTop: 14, 
          padding: 12, 
          background: '#f0f9ff', 
          borderRadius: 12,
          border: '1px solid #e0f2fe'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 14 }}>Quick Actions</div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
                Manage all your farms at once
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" onClick={() => {
                const enabledFarms = farms.filter(f => f.bot_enabled)
                if (enabledFarms.length > 0) {
                  if (confirm(`Stop bot on ${enabledFarms.length} farms?`)) {
                    enabledFarms.forEach(farm => toggleBotForFarm(farm.id, true))
                  }
                }
              }}>
                ⏹️ Stop All Bots
              </Button>
              <Button variant="ghost" onClick={() => {
                const disabledFarms = farms.filter(f => !f.bot_enabled)
                if (disabledFarms.length > 0) {
                  if (confirm(`Start bot on ${disabledFarms.length} farms?`)) {
                    disabledFarms.forEach(farm => toggleBotForFarm(farm.id, false))
                  }
                }
              }}>
                🤖 Start All Bots
              </Button>
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: 14, fontSize: 12, color: '#6b7280', fontWeight: 700 }}>
          ✅ Total: {farms.length} farms • 🤖 Active bots: {farms.filter(f => f.bot_enabled).length} 
          • 🎮 Manual: {farms.filter(f => !f.bot_enabled).length}
        </div>
      </Card>
    </>
  )
}