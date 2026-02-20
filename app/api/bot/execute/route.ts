export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/supabase/server'

// Ø£Ù†ÙˆØ§Ø¹ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ù…Ù…ÙƒÙ†Ø©
type ActionType = 
  | 'click' 
  | 'type' 
  | 'scroll' 
  | 'navigate' 
  | 'collect' 
  | 'upgrade' 
  | 'train' 
  | 'attack' 
  | 'gather' 
  | 'heal'

interface ActionRequest {
  action: ActionType
  farmId?: string
  coordinates?: { x: number; y: number }
  data?: any
  settings: {
    security: {
      antiDetection: boolean
      randomDelays: boolean
      maxActionsPerHour: number
      useProxy: boolean
      proxyAddress: string
      humanizeMouse: boolean
      avoidPatterns: boolean
    }
    [key: string]: any
  }
}

// Ø°Ø§ÙƒØ±Ø© Ù…Ø¤Ù‚ØªØ© Ù„ØªØ®Ø²ÙŠÙ† Ø¥Ø­ØµØ§Ø¡Ø§Øª Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª (Ø§Ø³ØªØ®Ø¯Ù… Redis ÙÙŠ Ø§Ù„Ø¥Ù†ØªØ§Ø¬)
const actionStats = new Map<string, {
  count: number
  lastReset: number
  actions: Array<{ type: ActionType; timestamp: number }>
}>()

// Ù‚Ø§Ø¦Ù…Ø© Ø¨Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ù…Ø­Ø¸ÙˆØ±Ø© (Ù„Ù„Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ù…ØªÙƒØ±Ø±Ø©)
const forbiddenPatterns = [
  ['click', 'click', 'click'], // 3 Ù†Ù‚Ø±Ø§Øª Ù…ØªØªØ§Ù„ÙŠØ©
  ['gather', 'gather', 'gather'], // 3 Ø¹Ù…Ù„ÙŠØ§Øª Ø¬Ù…Ø¹ Ù…ØªØªØ§Ù„ÙŠØ©
  ['click', 'type', 'click', 'type'], // Ù†Ù…Ø· Ù…ØªÙƒØ±Ø±
]

export async function POST(request: NextRequest) {
  try {
    // 1. Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù…ØµØ§Ø¯Ù‚Ø©
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'You must be logged in to execute bot actions'
        },
        { status: 401 }
      )
    }

    const userId = session.user.id
    
    // 2. Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ù† Ø§Ù„Ø·Ù„Ø¨
    const body: ActionRequest = await request.json()
    
    if (!body.action || !body.settings) {
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: 'Action and settings are required'
        },
        { status: 400 }
      )
    }

    const { action, farmId, coordinates, data, settings } = body
    const { security } = settings

    // 3. ØªØ·Ø¨ÙŠÙ‚ Anti-Detection Ø¥Ø°Ø§ ÙƒØ§Ù† Ù…ÙØ¹Ù„Ø§Ù‹
    let securityApplied = false
    let appliedDelays: number[] = []
    let patternChecks: string[] = []

    if (security.antiDetection) {
      securityApplied = true
      
      // 3.1. Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ Ù„Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª ÙÙŠ Ø§Ù„Ø³Ø§Ø¹Ø©
      const isRateLimited = await checkRateLimit(userId, security.maxActionsPerHour)
      if (isRateLimited) {
        return NextResponse.json(
          {
            error: 'Rate Limit Exceeded',
            message: `Maximum ${security.maxActionsPerHour} actions per hour reached`,
            waitTime: '1 hour',
            actionsCount: getCurrentHourCount(userId)
          },
          { status: 429 }
        )
      }

      // 3.2. ØªØ·Ø¨ÙŠÙ‚ ØªØ£Ø®ÙŠØ±Ø§Øª Ø¹Ø´ÙˆØ§Ø¦ÙŠØ©
      if (security.randomDelays) {
        const delay = applyRandomDelay(action)
        await sleep(delay)
        appliedDelays.push(delay)
      }

      // 3.3. Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ù…ØªÙƒØ±Ø±Ø©
      if (security.avoidPatterns) {
        const patternDetected = detectPattern(userId, action)
        if (patternDetected.detected) {
          patternChecks.push(`Pattern detected: ${patternDetected.pattern}`)
          
          // Ø¥Ø¶Ø§ÙØ© ØªØ£Ø®ÙŠØ± Ø¥Ø¶Ø§ÙÙŠ Ø¥Ø°Ø§ Ø§ÙƒØªØ´ÙÙ†Ø§ Ù†Ù…Ø·Ø§Ù‹
          const extraDelay = Math.floor(Math.random() * 3000) + 2000 // 2-5 Ø«ÙˆØ§Ù†ÙŠ Ø¥Ø¶Ø§ÙÙŠØ©
          await sleep(extraDelay)
          appliedDelays.push(extraDelay)
        }
      }

      // 3.4. ØªØ·Ø¨ÙŠÙ‚ ØªØ­ÙˆÙŠÙ„Ø§Øª Ø¥Ø­Ø¯Ø§Ø«ÙŠØ§Øª Ù„Ù„ÙØ£Ø±Ø© (Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ù…ÙˆØ¬ÙˆØ¯Ø©)
      let adjustedCoordinates = coordinates
      if (security.humanizeMouse && coordinates) {
        adjustedCoordinates = humanizeMouseMovement(coordinates)
      }

      // 3.5. Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø¨Ø±ÙˆÙƒØ³ÙŠ Ø¥Ø°Ø§ ÙƒØ§Ù† Ù…ÙØ¹Ù„Ø§Ù‹
      let proxyUsed = false
      if (security.useProxy && security.proxyAddress) {
        proxyUsed = true
        // ÙÙŠ Ø§Ù„Ø¥Ù†ØªØ§Ø¬ØŒ Ù‡Ù†Ø§ Ø³ØªØ³ØªØ®Ø¯Ù… Ù…ÙƒØªØ¨Ø© Ù…Ø«Ù„ 'proxy-agent'
        console.log(`Using proxy: ${security.proxyAddress}`)
      }

      // ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ù…Ø¹ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ø£Ù…Ø§Ù†
      logAction(userId, action, {
        securityApplied: true,
        delays: appliedDelays,
        patternChecks,
        proxyUsed,
        originalCoordinates: coordinates,
        adjustedCoordinates
      })
    } else {
      // ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø¨Ø¯ÙˆÙ† Ø£Ù…Ø§Ù†
      logAction(userId, action, { securityApplied: false })
    }

    // 4. Ù…Ø­Ø§ÙƒØ§Ø© ØªÙ†ÙÙŠØ° Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ (ÙÙŠ Ø§Ù„Ø¥Ù†ØªØ§Ø¬ØŒ Ù‡Ù†Ø§ Ø³ØªØªØµÙ„ Ø¨Ù„Ø¹Ø¨Ø© Viking Rise)
    const result = await simulateActionExecution(action, farmId, data)

    // 5. Ø²ÙŠØ§Ø¯Ø© Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª
    incrementActionCount(userId)

    // 6. Ø¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ù†ØªÙŠØ¬Ø©
    return NextResponse.json({
      success: true,
      message: 'Action executed successfully',
      timestamp: new Date().toISOString(),
      actionId: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      details: {
        action,
        farmId: farmId || 'unknown',
        security: {
          applied: securityApplied,
          delays: appliedDelays,
          totalDelay: appliedDelays.reduce((a, b) => a + b, 0),
          patternChecks,
          rateLimit: {
            current: getCurrentHourCount(userId),
            max: security.maxActionsPerHour
          }
        },
        execution: result,
        recommendations: generateRecommendations(userId, action)
      }
    })

  } catch (error) {
    console.error('Bot execute error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// ==================== Ø¯ÙˆØ§Ù„ Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯Ø© ====================

/**
 * ØªØ·Ø¨ÙŠÙ‚ ØªØ£Ø®ÙŠØ± Ø¹Ø´ÙˆØ§Ø¦ÙŠ Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ù†ÙˆØ¹ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡
 */
function applyRandomDelay(action: ActionType): number {
  const delayRanges: Record<ActionType, [number, number]> = {
    click: [200, 800],        // 0.2-0.8 Ø«Ø§Ù†ÙŠØ© Ù„Ù„Ù†Ù‚Ø±Ø§Øª
    type: [50, 200],          // 0.05-0.2 Ø«Ø§Ù†ÙŠØ© Ù„Ù„ÙƒØªØ§Ø¨Ø©
    scroll: [300, 1500],      // 0.3-1.5 Ø«Ø§Ù†ÙŠØ© Ù„Ù„ØªÙ…Ø±ÙŠØ±
    navigate: [1000, 3000],   // 1-3 Ø«ÙˆØ§Ù†ÙŠ Ù„Ù„ØªÙ†Ù‚Ù„
    collect: [500, 2000],     // 0.5-2 Ø«Ø§Ù†ÙŠØ© Ù„Ù„Ø¬Ù…Ø¹
    upgrade: [1000, 5000],    // 1-5 Ø«ÙˆØ§Ù†ÙŠ Ù„Ù„ØªØ±Ù‚ÙŠØ©
    train: [2000, 8000],      // 2-8 Ø«ÙˆØ§Ù†ÙŠ Ù„Ù„ØªØ¯Ø±ÙŠØ¨
    attack: [3000, 10000],    // 3-10 Ø«ÙˆØ§Ù†ÙŠ Ù„Ù„Ù‡Ø¬ÙˆÙ…
    gather: [1500, 4000],     // 1.5-4 Ø«ÙˆØ§Ù†ÙŠ Ù„Ø¬Ù…Ø¹ Ø§Ù„Ù…ÙˆØ§Ø±Ø¯
    heal: [1000, 3000]        // 1-3 Ø«ÙˆØ§Ù†ÙŠ Ù„Ù„Ø´ÙØ§Ø¡
  }

  const [min, max] = delayRanges[action] || [500, 2000]
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ Ù„Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª ÙÙŠ Ø§Ù„Ø³Ø§Ø¹Ø©
 */
async function checkRateLimit(userId: string, maxPerHour: number): Promise<boolean> {
  const now = Date.now()
  const hourStart = Math.floor(now / 3600000) * 3600000 // Ø¨Ø¯Ø§ÙŠØ© Ø§Ù„Ø³Ø§Ø¹Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©
  
  const userStats = actionStats.get(userId) || {
    count: 0,
    lastReset: hourStart,
    actions: []
  }

  // Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ¹ÙŠÙŠÙ† Ø¥Ø°Ø§ ØªØºÙŠØ±Øª Ø§Ù„Ø³Ø§Ø¹Ø©
  if (now - userStats.lastReset >= 3600000) {
    userStats.count = 0
    userStats.lastReset = hourStart
    userStats.actions = []
  }

  // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø­Ø¯
  return userStats.count >= maxPerHour
}

/**
 * Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø¹Ø¯Ø¯ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ø­Ø§Ù„ÙŠ ÙÙŠ Ø§Ù„Ø³Ø§Ø¹Ø©
 */
function getCurrentHourCount(userId: string): number {
  const userStats = actionStats.get(userId)
  return userStats?.count || 0
}

/**
 * Ø²ÙŠØ§Ø¯Ø© Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª
 */
function incrementActionCount(userId: string): void {
  const now = Date.now()
  const hourStart = Math.floor(now / 3600000) * 3600000
  
  const userStats = actionStats.get(userId) || {
    count: 0,
    lastReset: hourStart,
    actions: []
  }

  // Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªØ¹ÙŠÙŠÙ† Ø¥Ø°Ø§ ØªØºÙŠØ±Øª Ø§Ù„Ø³Ø§Ø¹Ø©
  if (now - userStats.lastReset >= 3600000) {
    userStats.count = 0
    userStats.lastReset = hourStart
    userStats.actions = []
  }

  userStats.count++
  userStats.actions.push({ type: 'click' as ActionType, timestamp: now }) // Ù†ÙˆØ¹ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø³ÙŠØªÙ… ØªØ³Ø¬ÙŠÙ„Ù‡ Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­
  actionStats.set(userId, userStats)
}

/**
 * Ø§ÙƒØªØ´Ø§Ù Ø§Ù„Ø£Ù†Ù…Ø§Ø· Ø§Ù„Ù…ØªÙƒØ±Ø±Ø©
 */
function detectPattern(userId: string, currentAction: ActionType): {
  detected: boolean
  pattern?: string
} {
  const userStats = actionStats.get(userId)
  if (!userStats || userStats.actions.length < 3) {
    return { detected: false }
  }

  // Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø¢Ø®Ø± 10 Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª
  const recentActions = userStats.actions.slice(-10).map(a => a.type)
  
  // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙƒÙ„ Ù†Ù…Ø· Ù…Ø­Ø¸ÙˆØ±
  for (const pattern of forbiddenPatterns) {
    if (pattern.length > recentActions.length) continue
    
    const lastActions = recentActions.slice(-pattern.length)
    
    if (arraysEqual(pattern, lastActions)) {
      return {
        detected: true,
        pattern: pattern.join(' â†’ ')
      }
    }
  }

  // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„ØªÙƒØ±Ø§Ø± Ø§Ù„Ù…ÙØ±Ø· Ù„Ù†ÙØ³ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡
  const lastThree = recentActions.slice(-3)
  if (lastThree.length === 3 && lastThree.every(a => a === currentAction)) {
    return {
      detected: true,
      pattern: `${currentAction} repeated 3 times`
    }
  }

  return { detected: false }
}

/**
 * Ù…Ø­Ø§ÙƒØ§Ø© Ø­Ø±ÙƒØ§Øª Ø§Ù„ÙØ£Ø±Ø© Ø§Ù„Ø¨Ø´Ø±ÙŠØ©
 */
function humanizeMouseMovement(coordinates: { x: number; y: number }): { x: number; y: number } {
  // Ø¥Ø¶Ø§ÙØ© Ø§Ø®ØªÙ„Ø§ÙØ§Øª Ø·ÙÙŠÙØ© ÙÙŠ Ø§Ù„Ø¥Ø­Ø¯Ø§Ø«ÙŠØ§Øª
  const jitterX = (Math.random() - 0.5) * 15 // Â±7.5 Ø¨ÙƒØ³Ù„
  const jitterY = (Math.random() - 0.5) * 15 // Â±7.5 Ø¨ÙƒØ³Ù„
  
  return {
    x: Math.round(coordinates.x + jitterX),
    y: Math.round(coordinates.y + jitterY)
  }
}

/**
 * Ù…Ø­Ø§ÙƒØ§Ø© ØªÙ†ÙÙŠØ° Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡
 */
async function simulateActionExecution(
  action: ActionType,
  farmId?: string,
  data?: any
): Promise<any> {
  // ØªØ£Ø®ÙŠØ± Ù…Ø­Ø§ÙƒØ§Ø© Ù„ÙˆÙ‚Øª Ø§Ù„ØªÙ†ÙÙŠØ°
  const executionTime = Math.floor(Math.random() * 1000) + 500
  
  await sleep(executionTime)

  const baseResult = {
    executedAt: new Date().toISOString(),
    executionTime,
    farmId: farmId || 'unknown'
  }

  switch (action) {
    case 'click':
      return {
        ...baseResult,
        type: 'click',
        element: data?.element || 'button',
        success: Math.random() > 0.1 // 90% Ù†Ø¬Ø§Ø­
      }
    
    case 'gather':
      return {
        ...baseResult,
        type: 'resource_gathering',
        resources: {
          wood: Math.floor(Math.random() * 5000) + 1000,
          food: Math.floor(Math.random() * 5000) + 1000,
          stone: Math.floor(Math.random() * 3000) + 500,
          gold: Math.floor(Math.random() * 1000) + 100
        },
        troops: data?.troops || 'Tier 1 Gatherers'
      }
    
    case 'attack':
      return {
        ...baseResult,
        type: 'monster_attack',
        monster: data?.monster || 'Goblin',
        power: Math.floor(Math.random() * 100000) + 50000,
        loot: {
          xp: Math.floor(Math.random() * 10000) + 5000,
          resources: {
            wood: Math.floor(Math.random() * 2000),
            food: Math.floor(Math.random() * 2000),
            stone: Math.floor(Math.random() * 1000),
            gold: Math.floor(Math.random() * 500)
          }
        },
        casualties: Math.floor(Math.random() * 50)
      }
    
    case 'upgrade':
      return {
        ...baseResult,
        type: 'building_upgrade',
        building: data?.building || 'Farm',
        level: data?.level || 1,
        timeRequired: Math.floor(Math.random() * 3600000) + 1800000, // 30-90 Ø¯Ù‚ÙŠÙ‚Ø©
        resourcesRequired: {
          wood: Math.floor(Math.random() * 10000) + 5000,
          food: Math.floor(Math.random() * 10000) + 5000,
          stone: Math.floor(Math.random() * 5000) + 2500,
          gold: Math.floor(Math.random() * 2000) + 1000
        }
      }
    
    default:
      return {
        ...baseResult,
        type: action,
        data,
        success: true
      }
  }
}

/**
 * ØªÙˆÙ„ÙŠØ¯ ØªÙˆØµÙŠØ§Øª Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ù†Ø´Ø§Ø·
 */
function generateRecommendations(userId: string, action: ActionType): string[] {
  const recommendations: string[] = []
  const userStats = actionStats.get(userId)
  
  if (!userStats) return recommendations

  const hourCount = userStats.count
  
  // ØªÙˆØµÙŠØ§Øª Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø¹Ø¯Ø¯ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª
  if (hourCount > 200) {
    recommendations.push('High action rate detected. Consider reducing max actions per hour to avoid detection.')
  }
  
  if (hourCount > 100 && hourCount % 20 === 0) {
    recommendations.push('Take a short break to mimic human behavior patterns.')
  }
  
  // ØªÙˆØµÙŠØ§Øª Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ù†ÙˆØ¹ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡
  if (action === 'attack') {
    recommendations.push('After attacking monsters, remember to heal troops in hospital.')
  }
  
  if (action === 'gather') {
    recommendations.push('Rotate gathering locations to avoid pattern detection.')
  }
  
  return recommendations
}

/**
 * ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ù„Ù„Ø³Ø¬Ù„Ø§Øª
 */
function logAction(
  userId: string,
  action: ActionType,
  meta: {
    securityApplied: boolean
    delays?: number[]
    patternChecks?: string[]
    proxyUsed?: boolean
    originalCoordinates?: { x: number; y: number }
    adjustedCoordinates?: { x: number; y: number }
  }
): void {
  const logEntry = {
    userId,
    action,
    timestamp: new Date().toISOString(),
    ...meta
  }
  
  console.log('[Bot Action]', JSON.stringify(logEntry, null, 2))
  
  // ÙÙŠ Ø§Ù„Ø¥Ù†ØªØ§Ø¬ØŒ Ù‡Ù†Ø§ Ø³ØªØ®Ø²Ù† ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª
  // await prisma.actionLog.create({ data: logEntry })
}

/**
 * Ø¯Ø§Ù„Ø© Ù…Ø³Ø§Ø¹Ø¯Ø© Ù„Ù„ØªØ£Ø®ÙŠØ±
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Ù…Ù‚Ø§Ø±Ù†Ø© Ù…ØµÙÙˆÙØªÙŠÙ†
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  return a.every((val, index) => val === b[index])
}

// ==================== Ù†Ù‚Ø·Ø© Ù†Ù‡Ø§ÙŠØ© GET Ù„Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø­Ø§Ù„Ø© ====================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userStats = actionStats.get(userId)
    
    const { searchParams } = new URL(request.url)
    const includeDetails = searchParams.get('details') === 'true'

    const response: any = {
      status: 'operational',
      userId,
      currentHour: {
        start: new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString(),
        actions: userStats?.count || 0,
        lastReset: userStats?.lastReset ? new Date(userStats.lastReset).toISOString() : null
      },
      system: {
        version: '2.5.1',
        antiDetection: 'active',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    }

    if (includeDetails && userStats) {
      response.details = {
        recentActions: userStats.actions.slice(-20),
        patterns: forbiddenPatterns.map(p => p.join(' â†’ ')),
        recommendations: generateRecommendations(userId, 'click') // Ù†ÙˆØ¹ Ø¹Ø´ÙˆØ§Ø¦ÙŠ Ù„Ù„Ø¹Ø±Ø¶
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}