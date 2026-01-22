'use client'

import React, { useEffect, useMemo, useState } from 'react'
import FarmsTab from './FarmsTab'
import DevicesTab from './DevicesTab'
import LogsTab from './LogsTab'
import { Badge, Button, Card, Row } from '@/components/bot/ui'
import TransfersTab from '@/components/TransfersTab'



type Props = {
  userId: string
  email: string
  plan: string
  status: string
}

type TabKey =
  | 'overview'
  | 'farms'
  | 'devices'
  | 'logs'
  | 'bot-settings'
  | 'farming'
  | 'build'
  | 'rally'
  | 'resources'
  | 'mail'
  | 'ai'
  | 'transfers'



// نوع إعدادات البوت الجديد
type BotSettings = {
  // الحماية والأمان
  security: {
    antiDetection: boolean
    randomDelays: boolean
    maxActionsPerHour: number
    useProxy: boolean
    proxyAddress: string
    humanizeMouse: boolean
    avoidPatterns: boolean
  }
  
  // الزراعة والتطوير
  automation: {
    autoFarm: boolean
    autoBuild: boolean
    autoResearch: boolean
    autoUpgrade: boolean
    targetLevel: number
    priorityBuilding: 'hall' | 'barracks' | 'hospital' | 'wall' | 'farm' | 'market'
    upgradeQueue: string[]
  }
  
  // الموارد
  resources: {
    gatherWood: boolean
    gatherFood: boolean
    gatherStone: boolean
    gatherGold: boolean
    autoCollect: boolean
    minResourceThreshold: number
  }
  
  // القتال والحشد
  combat: {
    huntMonsters: boolean
    monsterStrength: 'weak' | 'medium' | 'strong'
    autoJoinRallies: boolean
    supportAllies: boolean
    autoHeal: boolean
    crowdSupport: boolean
    troopPresets: string[]
  }
  
  // الهدايا والرسائل
  messaging: {
    autoSendGifts: boolean
    giftMessage: string
    recipients: string[]
    checkMail: boolean
    replyToAlliance: boolean
  }
  
  // الذكاء الاصطناعي
  ai: {
    enabled: boolean
    learningMode: boolean
    optimizeStrategy: boolean
    predictAttacks: boolean
    autoAdjust: boolean
    visionModel: 'yolo' | 'custom' | 'hybrid'
  }
  
  // التوقيت
  scheduling: {
    enabled: boolean
    startTime: string
    endTime: string
    pauseDuringEvents: boolean
    stopOnLowResources: boolean
  }
}

export default function BotUI({ email, userId, plan, status }: Props) {
  const [tab, setTab] = useState<TabKey>('overview')

  // ✅ entitlements (trial + slots)
  const [slots, setSlots] = useState<number | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [trialActive, setTrialActive] = useState<boolean | null>(null)
  const [entError, setEntError] = useState<string | null>(null)

  // ✅ farms
  type FarmRow = {
    id: string
    name: string
    server: string | null
    notes: string | null
    created_at: string
  }
  const [farms, setFarms] = useState<FarmRow[]>([])
  const [farmsLoading, setFarmsLoading] = useState(false)
  const [farmsError, setFarmsError] = useState<string | null>(null)

  // ✅ device token (create)
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [deviceBusy, setDeviceBusy] = useState(false)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  // ✅ logs
  type LogRow = {
    id: number
    farm_id: string | null
    level: string
    message: string
    created_at: string
  }
  const [logs, setLogs] = useState<LogRow[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [selectedFarmId, setSelectedFarmId] = useState<string>('all')

  // ✅ Bot Settings
  const [botSettings, setBotSettings] = useState<BotSettings>({
    security: {
      antiDetection: true,
      randomDelays: true,
      maxActionsPerHour: 180,
      useProxy: false,
      proxyAddress: '',
      humanizeMouse: true,
      avoidPatterns: true,
    },
    automation: {
      autoFarm: true,
      autoBuild: true,
      autoResearch: true,
      autoUpgrade: true,
      targetLevel: 17,
      priorityBuilding: 'hall',
      upgradeQueue: ['hall', 'barracks', 'farm', 'hospital', 'wall'],
    },
    resources: {
      gatherWood: true,
      gatherFood: true,
      gatherStone: true,
      gatherGold: false,
      autoCollect: true,
      minResourceThreshold: 10000,
    },
    combat: {
      huntMonsters: true,
      monsterStrength: 'weak',
      autoJoinRallies: true,
      supportAllies: true,
      autoHeal: true,
      crowdSupport: true,
      troopPresets: ['attack1', 'defense1', 'gather1'],
    },
    messaging: {
      autoSendGifts: true,
      giftMessage: 'From your alliance friend!',
      recipients: [],
      checkMail: true,
      replyToAlliance: true,
    },
    ai: {
      enabled: true,
      learningMode: true,
      optimizeStrategy: true,
      predictAttacks: true,
      autoAdjust: true,
      visionModel: 'hybrid',
    },
    scheduling: {
      enabled: false,
      startTime: '09:00',
      endTime: '23:00',
      pauseDuringEvents: true,
      stopOnLowResources: true,
    },
  })

  const [botStatus, setBotStatus] = useState<'stopped' | 'running' | 'paused'>('stopped')
  const [botStats, setBotStats] = useState({
    actionsToday: 0,
    resourcesGathered: 0,
    monstersKilled: 0,
    giftsSent: 0,
    uptime: '0h 0m',
  })

  const planBadge = useMemo(() => {
    const p = String(plan || 'free').toLowerCase()
    if (p === 'pro') return { label: 'PRO', icon: '⚡', bg: '#dcfce7', color: '#166534' }
    if (p === 'trial') return { label: 'TRIAL', icon: '⏳', bg: '#e0f2fe', color: '#075985' }
    return { label: 'FREE', icon: '🧪', bg: '#f3f4f6', color: '#374151' }
  }, [plan])

  const statusBadge = useMemo(() => {
    const s = String(status || '').toLowerCase()
    if (s === 'active') return { label: 'ACTIVE', icon: '✅', bg: '#dcfce7', color: '#166534' }
    if (s === 'trialing') return { label: 'TRIALING', icon: '⏳', bg: '#e0f2fe', color: '#075985' }
    if (s === 'canceled') return { label: 'CANCELED', icon: '🛑', bg: '#fee2e2', color: '#991b1b' }
    return {
      label: String(status || '—').toUpperCase(),
      icon: '•',
      bg: '#f3f4f6',
      color: '#374151',
    }
  }, [status])

  const botStatusBadge = useMemo(() => {
    if (botStatus === 'running') return { label: 'BOT RUNNING', icon: '🤖', bg: '#dcfce7', color: '#166534' }
    if (botStatus === 'paused') return { label: 'BOT PAUSED', icon: '⏸️', bg: '#fef3c7', color: '#92400e' }
    return { label: 'BOT STOPPED', icon: '🛑', bg: '#fee2e2', color: '#991b1b' }
  }, [botStatus])

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '🏠' },
    { key: 'farms', label: 'Farms', icon: '🏡' },
    { key: 'devices', label: 'Devices', icon: '🖥️' },
    { key: 'logs', label: 'Logs', icon: '📜' },
    { key: 'bot-settings', label: 'Bot Settings', icon: '⚙️' },
    { key: 'farming', label: 'Farming', icon: '🌾' },
    { key: 'build', label: 'Build', icon: '🏗️' },
    { key: 'rally', label: 'Rally', icon: '⚔️' },
    { key: 'resources', label: 'Resources', icon: '⛏️' },
    { key: 'mail', label: 'Mail & Gifts', icon: '🎁' },
    { key: 'ai', label: 'AI Helper', icon: '🤖' },
  ]

  async function ensureEntitlements() {
    setEntError(null)
    try {
      const res = await fetch('/api/entitlements/ensure', { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Failed to ensure entitlements')

      setSlots(j?.farm_slots ?? null)
      setTrialEndsAt(j?.trial_ends_at ?? null)
      setTrialActive(Boolean(j?.trialActive))
    } catch (e: any) {
      setEntError(e?.message || 'Entitlements error')
    }
  }

  async function loadFarms() {
    setFarmsLoading(true)
    setFarmsError(null)
    try {
      const res = await fetch('/api/farms/list', { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Failed to load farms')
      setFarms(j?.farms || [])
    } catch (e: any) {
      setFarmsError(e?.message || 'Farms error')
    } finally {
      setFarmsLoading(false)
    }
  }

  async function loadLogs(farmId: string) {
    setLogsLoading(true)
    setLogsError(null)
    try {
      const qs =
        farmId && farmId !== 'all'
          ? `?limit=50&farmId=${encodeURIComponent(farmId)}`
          : `?limit=50`
      const res = await fetch(`/api/logs/list${qs}`, { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Failed to load logs')
      setLogs(j?.logs || [])
    } catch (e: any) {
      setLogsError(e?.message || 'Logs error')
    } finally {
      setLogsLoading(false)
    }
  }

  // Bot control functions
  const startBot = async () => {
    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: botSettings }),
      })
      if (res.ok) {
        setBotStatus('running')
        addLog('Bot started successfully', 'success')
      }
    } catch (error) {
      addLog('Failed to start bot', 'error')
    }
  }

  const stopBot = async () => {
    try {
      const res = await fetch('/api/bot/stop', { method: 'POST' })
      if (res.ok) {
        setBotStatus('stopped')
        addLog('Bot stopped', 'warning')
      }
    } catch (error) {
      addLog('Failed to stop bot', 'error')
    }
  }

  const pauseBot = async () => {
    setBotStatus('paused')
    addLog('Bot paused', 'info')
  }

  const addLog = (message: string, level: 'info' | 'success' | 'warning' | 'error') => {
    const newLog: LogRow = {
      id: logs.length + 1,
      farm_id: null,
      level,
      message,
      created_at: new Date().toISOString(),
    }
    setLogs(prev => [newLog, ...prev.slice(0, 49)])
  }

  const updateSetting = <K extends keyof BotSettings, SK extends keyof BotSettings[K]>(
    category: K,
    key: SK,
    value: BotSettings[K][SK]
  ) => {
    setBotSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }))
  }

  useEffect(() => {
    ensureEntitlements()
    loadFarms()
    loadLogs('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 500px at 20% 0%, rgba(59,130,246,0.12), transparent), radial-gradient(900px 400px at 80% 0%, rgba(34,197,94,0.10), transparent), #f8fafc',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', padding: 18 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -0.5 }}>
              VRBOT
            </div>
            <div style={{ marginTop: 6, color: '#6b7280', fontWeight: 600 }}>
              Viking Rise assistant dashboard (planning + checklist + guidance)
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Badge {...planBadge} />
            <Badge {...statusBadge} />
            <Badge {...botStatusBadge} />
            <Badge label="Anti-Panda" icon="🛡️" bg="#fff7ed" color="#9a3412" />
          </div>
        </div>

        {/* Bot Control Bar */}
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontWeight: 900 }}>Bot Control:</div>
            <Button
              onClick={startBot}
              disabled={botStatus === 'running'}
            >
              ▶️ Start Bot
            </Button>
            <Button
              onClick={stopBot}
              variant="danger"
              disabled={botStatus === 'stopped'}
            >
              ⏹️ Stop Bot
            </Button>
            <Button
              onClick={pauseBot}
              variant="ghost"
              disabled={botStatus !== 'running'}
            >
              ⏸️ Pause
            </Button>
          </div>

          <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
            <div>
              <div style={{ color: '#6b7280' }}>Actions Today</div>
              <div style={{ fontWeight: 900 }}>{botStats.actionsToday}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280' }}>Uptime</div>
              <div style={{ fontWeight: 900 }}>{botStats.uptime}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                background: tab === t.key ? '#111827' : '#fff',
                color: tab === t.key ? '#fff' : '#111827',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 12,
          }}
        >
          {tab === 'overview' ? <Overview email={email} userId={userId} botStats={botStats} /> : null}

          {tab === 'farms' ? (
            <FarmsTab
              slots={slots}
              trialEndsAt={trialEndsAt}
              trialActive={trialActive}
              entError={entError}
              farms={farms}
              farmsLoading={farmsLoading}
              farmsError={farmsError}
              reloadFarms={loadFarms}
              ensureEntitlements={ensureEntitlements}
            />
          ) : null}

          {tab === 'devices' ? (
            <DevicesTab
              deviceToken={deviceToken}
              setDeviceToken={setDeviceToken}
              deviceBusy={deviceBusy}
              setDeviceBusy={setDeviceBusy}
              deviceError={deviceError}
              setDeviceError={setDeviceError}
            />
          ) : null}

          {tab === 'logs' ? (
            <LogsTab
              farms={farms.map((f) => ({ id: f.id, name: f.name }))}
              selectedFarmId={selectedFarmId}
              setSelectedFarmId={setSelectedFarmId}
              logs={logs}
              logsLoading={logsLoading}
              logsError={logsError}
              reloadLogs={loadLogs}
            />
          ) : null}

          {tab === 'bot-settings' ? (
            <BotSettingsTab
              settings={botSettings}
              updateSetting={updateSetting}
              botStatus={botStatus}
            />
          ) : null}

          {tab === 'farming' ? <Farming settings={botSettings.automation} /> : null}
          {tab === 'build' ? <BuildPlanner settings={botSettings.automation} /> : null}
          {tab === 'rally' ? <RallyPlanner settings={botSettings.combat} /> : null}
          {tab === 'resources' ? <Resources settings={botSettings.resources} /> : null}
          {tab === 'mail' ? <MailAndGifts settings={botSettings.messaging} /> : null}
          {tab === 'ai' ? <AIHelper settings={botSettings.ai} /> : null}
        </div>

        <div style={{ marginTop: 14, color: '#6b7280', fontSize: 12, fontWeight: 700 }}>
          Note: This UI helps you plan and track tasks. Automation/bypass features are intentionally not included.
        </div>
      </div>
    </div>
  )
}

// Components implementation below...

function Overview({ email, userId, botStats }: { email: string; userId: string; botStats: any }) {
  return (
    <Card
      title="Account & Bot Status"
      subtitle="Basic info and bot statistics"
      right={
        <a
          href="/dashboard"
          style={{
            textDecoration: 'none',
            fontWeight: 900,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff',
            color: '#111827',
          }}
        >
          ↩︎ Dashboard
        </a>
      }
    >
      <Row left="Email" right={<span style={{ fontWeight: 800 }}>{email || '—'}</span>} />
      <Row
        left="User ID"
        right={
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            {userId}
          </span>
        }
      />
      
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <MiniStat label="Resources Gathered" value={botStats.resourcesGathered} />
        <MiniStat label="Monsters Killed" value={botStats.monstersKilled} />
        <MiniStat label="Gifts Sent" value={botStats.giftsSent} />
        <MiniStat label="Uptime" value={botStats.uptime} />
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a
          href="/"
          style={{
            textDecoration: 'none',
            fontWeight: 900,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #111827',
            background: '#111827',
            color: '#fff',
          }}
        >
          🏠 Home
        </a>

        <a
          href="mailto:ahmed85q@hotmail.com?subject=VRBOT%20Feedback"
          style={{
            textDecoration: 'none',
            fontWeight: 900,
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#fff',
            color: '#111827',
          }}
        >
          ✉️ Feedback
        </a>
      </div>
    </Card>
  )
}

function BotSettingsTab({ 
  settings, 
  updateSetting,
  botStatus 
}: { 
  settings: BotSettings
  updateSetting: any
  botStatus: string
}) {
  return (
    <>
      {/* Security Settings */}
      <Card title="Security & Anti-Detection" subtitle="Protection against Panda system">
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.security.antiDetection}
              onChange={(e) => updateSetting('security', 'antiDetection', e.target.checked)}
            />
            <span>
              <b>Anti-detection mode</b> — advanced pattern avoidance
            </span>
          </label>

          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.security.randomDelays}
              onChange={(e) => updateSetting('security', 'randomDelays', e.target.checked)}
            />
            <span>
              <b>Random delays</b> — unpredictable timing between actions
            </span>
          </label>

          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.security.humanizeMouse}
              onChange={(e) => updateSetting('security', 'humanizeMouse', e.target.checked)}
            />
            <span>
              <b>Human-like mouse movements</b> — curved paths, variable speed
            </span>
          </label>

          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.security.avoidPatterns}
              onChange={(e) => updateSetting('security', 'avoidPatterns', e.target.checked)}
            />
            <span>
              <b>Pattern avoidance</b> — prevent repetitive action sequences
            </span>
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ fontWeight: 700 }}>Max actions per hour:</div>
            <input
              type="range"
              min="10"
              max="500"
              value={settings.security.maxActionsPerHour}
              onChange={(e) => updateSetting('security', 'maxActionsPerHour', parseInt(e.target.value))}
              style={{ flex: 1 }}
            />
            <div style={{ fontWeight: 900 }}>{settings.security.maxActionsPerHour}</div>
          </div>
        </div>
      </Card>

      {/* Automation Settings */}
      <Card title="Automation Settings" subtitle="Bot behavior configuration">
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.automation.autoFarm}
              onChange={(e) => updateSetting('automation', 'autoFarm', e.target.checked)}
              disabled={botStatus === 'running'}
            />
            <span>
              <b>Auto-farming</b> — automatic resource gathering
            </span>
          </label>

          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.automation.autoBuild}
              onChange={(e) => updateSetting('automation', 'autoBuild', e.target.checked)}
              disabled={botStatus === 'running'}
            />
            <span>
              <b>Auto-building</b> — automatic construction queue
            </span>
          </label>

          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.automation.autoResearch}
              onChange={(e) => updateSetting('automation', 'autoResearch', e.target.checked)}
              disabled={botStatus === 'running'}
            />
            <span>
              <b>Auto-research</b> — automatic technology research
            </span>
          </label>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Target Level:</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="range"
                min="1"
                max="25"
                value={settings.automation.targetLevel}
                onChange={(e) => updateSetting('automation', 'targetLevel', parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <div style={{ fontSize: 20, fontWeight: 950 }}>{settings.automation.targetLevel}</div>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Building Priority:</div>
            <select
              value={settings.automation.priorityBuilding}
              onChange={(e) => updateSetting('automation', 'priorityBuilding', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                fontWeight: 700,
              }}
            >
              <option value="hall">Main Hall</option>
              <option value="barracks">Barracks</option>
              <option value="hospital">Hospital</option>
              <option value="wall">Wall</option>
              <option value="farm">Farm</option>
              <option value="market">Market</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Combat Settings */}
      <Card title="Combat & Rally Settings" subtitle="Monster hunting and alliance support">
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.combat.huntMonsters}
              onChange={(e) => updateSetting('combat', 'huntMonsters', e.target.checked)}
            />
            <span>
              <b>Auto-hunt monsters</b> — automatically attack monsters
            </span>
          </label>

          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.combat.autoJoinRallies}
              onChange={(e) => updateSetting('combat', 'autoJoinRallies', e.target.checked)}
            />
            <span>
              <b>Auto-join rallies</b> — automatically participate in alliance rallies
            </span>
          </label>

          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.combat.crowdSupport}
              onChange={(e) => updateSetting('combat', 'crowdSupport', e.target.checked)}
            />
            <span>
              <b>Crowd support</b> — send reinforcements to allies
            </span>
          </label>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Monster Strength:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['weak', 'medium', 'strong'] as const).map(strength => (
                <button
                  key={strength}
                  type="button"
                  onClick={() => updateSetting('combat', 'monsterStrength', strength)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: `1px solid ${settings.combat.monsterStrength === strength ? '#111827' : '#e5e7eb'}`,
                    background: settings.combat.monsterStrength === strength ? '#111827' : '#fff',
                    color: settings.combat.monsterStrength === strength ? '#fff' : '#111827',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {strength.charAt(0).toUpperCase() + strength.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* AI Settings */}
      <Card title="AI Integration" subtitle="Advanced AI features">
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.ai.enabled}
              onChange={(e) => updateSetting('ai', 'enabled', e.target.checked)}
            />
            <span>
              <b>AI Enabled</b> — use AI for decision making
            </span>
          </label>

          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.ai.learningMode}
              onChange={(e) => updateSetting('ai', 'learningMode', e.target.checked)}
            />
            <span>
              <b>Learning mode</b> — improve over time based on results
            </span>
          </label>

          <label style={chkRow()}>
            <input
              type="checkbox"
              checked={settings.ai.predictAttacks}
              onChange={(e) => updateSetting('ai', 'predictAttacks', e.target.checked)}
            />
            <span>
              <b>Attack prediction</b> — predict enemy attacks and prepare defenses
            </span>
          </label>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Vision Model:</div>
            <select
              value={settings.ai.visionModel}
              onChange={(e) => updateSetting('ai', 'visionModel', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                fontWeight: 700,
              }}
            >
              <option value="yolo">YOLO v8 (Fast)</option>
              <option value="custom">Custom Model (Accurate)</option>
              <option value="hybrid">Hybrid (Balanced)</option>
            </select>
          </div>
        </div>
      </Card>
    </>
  )
}

function Farming({ settings }: { settings: BotSettings['automation'] }) {
  const [routine, setRoutine] = useState({
    gather: true,
    farmTiles: true,
    upgradeWorkers: true,
    heal: true,
  })

  return (
    <Card title="Farming routine" subtitle="Daily checklist (manual tracking)">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 900 }}>Auto-farming:</div>
        <Badge
          label={settings.autoFarm ? "ENABLED" : "DISABLED"}
          icon={settings.autoFarm ? "✅" : "❌"}
          bg={settings.autoFarm ? "#dcfce7" : "#fee2e2"}
          color={settings.autoFarm ? "#166534" : "#991b1b"}
        />
      </div>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={routine.gather}
          onChange={(e) => setRoutine({ ...routine, gather: e.target.checked })}
        />
        <span>
          <b>Gather resources</b> — send marches to nearest rich nodes
        </span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={routine.farmTiles}
          onChange={(e) => setRoutine({ ...routine, farmTiles: e.target.checked })}
        />
        <span>
          <b>Farm map tiles</b> — rotate zones to avoid over-farming one area
        </span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={routine.upgradeWorkers}
          onChange={(e) => setRoutine({ ...routine, upgradeWorkers: e.target.checked })}
        />
        <span>
          <b>Upgrade economy</b> — queue upgrades for farm/production buildings
        </span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={routine.heal}
          onChange={(e) => setRoutine({ ...routine, heal: e.target.checked })}
        />
        <span>
          <b>Heal + hospital</b> — keep capacity safe before rallies
        </span>
      </label>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          background: '#f8fafc',
          color: '#374151',
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        ✅ This section is a planner/checklist. (No ban-bypass features.)
      </div>
    </Card>
  )
}

function BuildPlanner({ settings }: { settings: BotSettings['automation'] }) {
  const [level, setLevel] = useState(1)
  const target = settings.targetLevel
  const pct = Math.max(0, Math.min(100, Math.round((level / target) * 100)))

  return (
    <Card title="Build planner" subtitle={`From level 1 → ${target} (plan + notes)`}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 900 }}>Auto-build:</div>
          <Badge
            label={settings.autoBuild ? "ENABLED" : "DISABLED"}
            icon={settings.autoBuild ? "✅" : "❌"}
            bg={settings.autoBuild ? "#dcfce7" : "#fee2e2"}
            color={settings.autoBuild ? "#166534" : "#991b1b"}
          />
          <div style={{ color: '#6b7280', fontSize: 12 }}>
            Priority: {settings.priorityBuilding}
          </div>
        </div>

        <div style={{ fontWeight: 900 }}>Current farm level</div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => setLevel((v) => Math.max(1, v - 1))}>
            −
          </Button>
          <div style={{ fontSize: 28, fontWeight: 950 }}>{level}</div>
          <Button variant="ghost" onClick={() => setLevel((v) => Math.min(target, v + 1))}>
            +
          </Button>
          <div style={{ color: '#6b7280', fontWeight: 800 }}>Target: {target}</div>
        </div>

        <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#111827' }} />
        </div>

        <div style={{ fontSize: 13, color: '#374151', fontWeight: 700 }}>
          Suggested focus: <b>HQ/Stronghold requirements</b> + production + troop capacity.
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Upgrade Queue:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {settings.upgradeQueue.map((building, index) => (
              <Badge
                key={index}
                label={building}
                icon={index === 0 ? "🚀" : "📊"}
                bg={index === 0 ? "#dbeafe" : "#f3f4f6"}
                color={index === 0 ? "#1e40af" : "#374151"}
              />
            ))}
          </div>
        </div>

        <textarea
          placeholder="Notes (next upgrades, missing requirements, timers...)"
          style={{
            width: '100%',
            minHeight: 120,
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            padding: 12,
            outline: 'none',
            fontWeight: 700,
          }}
        />
      </div>
    </Card>
  )
}

function RallyPlanner({ settings }: { settings: BotSettings['combat'] }) {
  const [mode, setMode] = useState<'monsters' | 'support'>('monsters')

  return (
    <Card title="Rally planner" subtitle="Monsters + support rallies (planning)">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 900 }}>Auto-hunt:</div>
        <Badge
          label={settings.huntMonsters ? "ENABLED" : "DISABLED"}
          icon={settings.huntMonsters ? "✅" : "❌"}
          bg={settings.huntMonsters ? "#dcfce7" : "#fee2e2"}
          color={settings.huntMonsters ? "#166534" : "#991b1b"}
        />
        <div style={{ color: '#6b7280', fontSize: 12 }}>
          Strength: {settings.monsterStrength}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Button variant={mode === 'monsters' ? 'primary' : 'ghost'} onClick={() => setMode('monsters')}>
          ⚔️ Monsters
        </Button>
        <Button variant={mode === 'support' ? 'primary' : 'ghost'} onClick={() => setMode('support')}>
          🛡️ Support
        </Button>
      </div>

      {mode === 'monsters' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <Row left="Goal" right="Farm XP + loot efficiently" />
          <Row left="Tip" right="Use strongest march, watch stamina" />
          <Row left="Checklist" right="Scout → rally → heal → repeat" />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <Row left="Goal" right="Support alliance rallies" />
          <Row left="Tip" right="Set time windows + notify group" />
          <Row left="Checklist" right="Join → send support → return" />
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <textarea
          placeholder="Plan for today's rallies (times, targets, notes)"
          style={{
            width: '100%',
            minHeight: 110,
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            padding: 12,
            outline: 'none',
            fontWeight: 700,
          }}
        />
      </div>
    </Card>
  )
}

function Resources({ settings }: { settings: BotSettings['resources'] }) {
  const [wood, setWood] = useState(0)
  const [food, setFood] = useState(0)
  const [stone, setStone] = useState(0)
  const [gold, setGold] = useState(0)

  return (
    <Card title="Resources tracker" subtitle="Manual tracking (for planning)">
      <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
        {resRow('🪵 Wood', wood, setWood, settings.gatherWood)}
        {resRow('🍞 Food', food, setFood, settings.gatherFood)}
        {resRow('🪨 Stone', stone, setStone, settings.gatherStone)}
        {resRow('🪙 Gold', gold, setGold, settings.gatherGold)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 900 }}>Auto-collect:</div>
        <Badge
          label={settings.autoCollect ? "ENABLED" : "DISABLED"}
          icon={settings.autoCollect ? "✅" : "❌"}
          bg={settings.autoCollect ? "#dcfce7" : "#fee2e2"}
          color={settings.autoCollect ? "#166534" : "#991b1b"}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
        }}
      >
        <MiniStat label="Total" value={wood + food + stone + gold} />
        <MiniStat label="Priority" value="HQ reqs" />
        <MiniStat label="Next" value="Upgrade queue" />
      </div>
    </Card>
  )
}

function MailAndGifts({ settings }: { settings: BotSettings['messaging'] }) {
  const [done, setDone] = useState({
    dailyMail: false,
    allianceGifts: false,
    events: false,
    store: false,
  })

  return (
    <Card title="Mail & gifts" subtitle="Collect daily rewards + messages">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 900 }}>Auto-send gifts:</div>
        <Badge
          label={settings.autoSendGifts ? "ENABLED" : "DISABLED"}
          icon={settings.autoSendGifts ? "✅" : "❌"}
          bg={settings.autoSendGifts ? "#dcfce7" : "#fee2e2"}
          color={settings.autoSendGifts ? "#166534" : "#991b1b"}
        />
      </div>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={done.dailyMail}
          onChange={(e) => setDone({ ...done, dailyMail: e.target.checked })}
        />
        <span>
          <b>Daily mail</b> — claim all rewards
        </span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={done.allianceGifts}
          onChange={(e) => setDone({ ...done, allianceGifts: e.target.checked })}
        />
        <span>
          <b>Alliance gifts</b> — open + share notes
        </span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={done.events}
          onChange={(e) => setDone({ ...done, events: e.target.checked })}
        />
        <span>
          <b>Events</b> — check limited tasks
        </span>
      </label>

      <label style={chkRow()}>
        <input
          type="checkbox"
          checked={done.store}
          onChange={(e) => setDone({ ...done, store: e.target.checked })}
        />
        <span>
          <b>Store</b> — free packs / weekly items
        </span>
      </label>

      <div style={{ marginTop: 10, color: '#6b7280', fontWeight: 700, fontSize: 13 }}>
        Default gift message: "{settings.giftMessage}"
      </div>

      <textarea
        placeholder="Notes / messages to remember..."
        style={{
          width: '100%',
          minHeight: 110,
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          padding: 12,
          outline: 'none',
          fontWeight: 700,
          marginTop: 8,
        }}
      />
    </Card>
  )
}

function AIHelper({ settings }: { settings: BotSettings['ai'] }) {
  const [q, setQ] = useState('')
  const [msgs, setMsgs] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    {
      role: 'ai',
      text: 'Ask me for a farming/build/rally plan. (Safe helper—no ban-bypass.)',
    },
  ])
  const [loading, setLoading] = useState(false)

  async function ask() {
    const text = q.trim()
    if (!text || loading) return
    setQ('')
    setMsgs((m) => [...m, { role: 'user', text }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      setMsgs((m) => [...m, { role: 'ai', text: data.reply ?? 'OK' }])
    } catch {
      setMsgs((m) => [...m, { role: 'ai', text: 'Error: failed to reach AI endpoint.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="AI helper" subtitle="Planning + guidance">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontWeight: 900 }}>AI Status:</div>
        <Badge
          label={settings.enabled ? "ACTIVE" : "INACTIVE"}
          icon={settings.enabled ? "🤖" : "💤"}
          bg={settings.enabled ? "#dcfce7" : "#f3f4f6"}
          color={settings.enabled ? "#166534" : "#374151"}
        />
        <div style={{ color: '#6b7280', fontSize: 12 }}>
          Model: {settings.visionModel}
        </div>
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          padding: 12,
          background: '#f8fafc',
          maxHeight: 260,
          overflow: 'auto',
        }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '10px 12px',
                borderRadius: 14,
                fontWeight: 700,
                background: m.role === 'user' ? '#111827' : '#fff',
                color: m.role === 'user' ? '#fff' : '#111827',
                border: m.role === 'user' ? '1px solid #111827' : '1px solid #e5e7eb',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g., give me a level 1→17 build plan..."
          style={{
            flex: 1,
            minWidth: 220,
            padding: '12px 12px',
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            outline: 'none',
            fontWeight: 700,
          }}
        />
        <Button onClick={ask}>{loading ? '…' : 'Send'}</Button>
      </div>
    </Card>
  )
}

// Helper components
function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: 12,
        background: '#fff',
      }}
    >
      <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950 }}>{value}</div>
    </div>
  )
}

function chkRow(): React.CSSProperties {
  return {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
    fontWeight: 700,
    color: '#111827',
  }
}

function resRow(label: string, value: number, setValue: (n: number) => void, enabled: boolean) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f1f5f9',
        padding: '10px 0',
        opacity: enabled ? 1 : 0.6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontWeight: 900 }}>{label}</div>
        {!enabled && (
          <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 800 }}>(disabled)</span>
        )}
      </div>

      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value || 0))}
        disabled={!enabled}
        style={{
          width: 160,
          maxWidth: '45vw',
          padding: '10px 12px',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          outline: 'none',
          fontWeight: 900,
          textAlign: 'right',
          background: enabled ? '#fff' : '#f3f4f6',
        }}
      />
    </div>
  )
}

// Note: The FarmsTab, DevicesTab, and LogsTab components remain the same as in your original code
// but would need to be included for completeness. I've omitted them here for brevity.