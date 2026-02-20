export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/supabase/server'

// Ã˜Â£Ã™â€ Ã™Ë†Ã˜Â§Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã™â€¦Ã™Æ’Ã™â€ Ã˜Â©
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

// Ã˜Â°Ã˜Â§Ã™Æ’Ã˜Â±Ã˜Â© Ã™â€¦Ã˜Â¤Ã™â€šÃ˜ÂªÃ˜Â© Ã™â€žÃ˜ÂªÃ˜Â®Ã˜Â²Ã™Å Ã™â€  Ã˜Â¥Ã˜Â­Ã˜ÂµÃ˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª (Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Redis Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¬)
const actionStats = new Map<string, {
  count: number
  lastReset: number
  actions: Array<{ type: ActionType; timestamp: number }>
}>()

// Ã™â€šÃ˜Â§Ã˜Â¦Ã™â€¦Ã˜Â© Ã˜Â¨Ã˜Â§Ã™â€žÃ™â€¦Ã™â€¡Ã˜Â§Ã™â€¦ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã˜Â¸Ã™Ë†Ã˜Â±Ã˜Â© (Ã™â€žÃ™â€žÃ˜Â£Ã™â€ Ã™â€¦Ã˜Â§Ã˜Â· Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Æ’Ã˜Â±Ã˜Â±Ã˜Â©)
const forbiddenPatterns = [
  ['click', 'click', 'click'], // 3 Ã™â€ Ã™â€šÃ˜Â±Ã˜Â§Ã˜Âª Ã™â€¦Ã˜ÂªÃ˜ÂªÃ˜Â§Ã™â€žÃ™Å Ã˜Â©
  ['gather', 'gather', 'gather'], // 3 Ã˜Â¹Ã™â€¦Ã™â€žÃ™Å Ã˜Â§Ã˜Âª Ã˜Â¬Ã™â€¦Ã˜Â¹ Ã™â€¦Ã˜ÂªÃ˜ÂªÃ˜Â§Ã™â€žÃ™Å Ã˜Â©
  ['click', 'type', 'click', 'type'], // Ã™â€ Ã™â€¦Ã˜Â· Ã™â€¦Ã˜ÂªÃ™Æ’Ã˜Â±Ã˜Â±
]

export async function POST(request: NextRequest) {
  try {
    // 1. Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂµÃ˜Â§Ã˜Â¯Ã™â€šÃ˜Â©
    const supabase = createSupabaseServerClient()
    const { data: { user: sbUser } } = await supabase.auth.getUser()
    const session = sbUser ? { user: { email: sbUser.email, id: sbUser.id } } : null
    
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
    
    // 2. Ã™â€šÃ˜Â±Ã˜Â§Ã˜Â¡Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â·Ã™â€žÃ˜Â¨
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

    // 3. Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€š Anti-Detection Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™Æ’Ã˜Â§Ã™â€  Ã™â€¦Ã™ÂÃ˜Â¹Ã™â€žÃ˜Â§Ã™â€¹
    let securityApplied = false
    let appliedDelays: number[] = []
    let patternChecks: string[] = []

    if (security.antiDetection) {
      securityApplied = true
      
      // 3.1. Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â£Ã™â€šÃ˜ÂµÃ™â€° Ã™â€žÃ™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â§Ã˜Â¹Ã˜Â©
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

      // 3.2. Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€š Ã˜ÂªÃ˜Â£Ã˜Â®Ã™Å Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â¹Ã˜Â´Ã™Ë†Ã˜Â§Ã˜Â¦Ã™Å Ã˜Â©
      if (security.randomDelays) {
        const delay = applyRandomDelay(action)
        await sleep(delay)
        appliedDelays.push(delay)
      }

      // 3.3. Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â£Ã™â€ Ã™â€¦Ã˜Â§Ã˜Â· Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Æ’Ã˜Â±Ã˜Â±Ã˜Â©
      if (security.avoidPatterns) {
        const patternDetected = detectPattern(userId, action)
        if (patternDetected.detected) {
          patternChecks.push(`Pattern detected: ${patternDetected.pattern}`)
          
          // Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜ÂªÃ˜Â£Ã˜Â®Ã™Å Ã˜Â± Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ™Å  Ã˜Â¥Ã˜Â°Ã˜Â§ Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â´Ã™ÂÃ™â€ Ã˜Â§ Ã™â€ Ã™â€¦Ã˜Â·Ã˜Â§Ã™â€¹
          const extraDelay = Math.floor(Math.random() * 3000) + 2000 // 2-5 Ã˜Â«Ã™Ë†Ã˜Â§Ã™â€ Ã™Å  Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ™Å Ã˜Â©
          await sleep(extraDelay)
          appliedDelays.push(extraDelay)
        }
      }

      // 3.4. Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€š Ã˜ÂªÃ˜Â­Ã™Ë†Ã™Å Ã™â€žÃ˜Â§Ã˜Âª Ã˜Â¥Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Â«Ã™Å Ã˜Â§Ã˜Âª Ã™â€žÃ™â€žÃ™ÂÃ˜Â£Ã˜Â±Ã˜Â© (Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™Æ’Ã˜Â§Ã™â€ Ã˜Âª Ã™â€¦Ã™Ë†Ã˜Â¬Ã™Ë†Ã˜Â¯Ã˜Â©)
      let adjustedCoordinates = coordinates
      if (security.humanizeMouse && coordinates) {
        adjustedCoordinates = humanizeMouseMovement(coordinates)
      }

      // 3.5. Ã˜Â§Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã˜Â§Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Ë†Ã™Æ’Ã˜Â³Ã™Å  Ã˜Â¥Ã˜Â°Ã˜Â§ Ã™Æ’Ã˜Â§Ã™â€  Ã™â€¦Ã™ÂÃ˜Â¹Ã™â€žÃ˜Â§Ã™â€¹
      let proxyUsed = false
      if (security.useProxy && security.proxyAddress) {
        proxyUsed = true
        // Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¬Ã˜Å’ Ã™â€¡Ã™â€ Ã˜Â§ Ã˜Â³Ã˜ÂªÃ˜Â³Ã˜ÂªÃ˜Â®Ã˜Â¯Ã™â€¦ Ã™â€¦Ã™Æ’Ã˜ÂªÃ˜Â¨Ã˜Â© Ã™â€¦Ã˜Â«Ã™â€ž 'proxy-agent'
        console.log(`Using proxy: ${security.proxyAddress}`)
      }

      // Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡ Ã™â€¦Ã˜Â¹ Ã™â€¦Ã˜Â¹Ã™â€žÃ™Ë†Ã™â€¦Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â£Ã™â€¦Ã˜Â§Ã™â€ 
      logAction(userId, action, {
        securityApplied: true,
        delays: appliedDelays,
        patternChecks,
        proxyUsed,
        originalCoordinates: coordinates,
        adjustedCoordinates
      })
    } else {
      // Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡ Ã˜Â¨Ã˜Â¯Ã™Ë†Ã™â€  Ã˜Â£Ã™â€¦Ã˜Â§Ã™â€ 
      logAction(userId, action, { securityApplied: false })
    }

    // 4. Ã™â€¦Ã˜Â­Ã˜Â§Ã™Æ’Ã˜Â§Ã˜Â© Ã˜ÂªÃ™â€ Ã™ÂÃ™Å Ã˜Â° Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡ (Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¬Ã˜Å’ Ã™â€¡Ã™â€ Ã˜Â§ Ã˜Â³Ã˜ÂªÃ˜ÂªÃ˜ÂµÃ™â€ž Ã˜Â¨Ã™â€žÃ˜Â¹Ã˜Â¨Ã˜Â© Viking Rise)
    const result = await simulateActionExecution(action, farmId, data)

    // 5. Ã˜Â²Ã™Å Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª
    incrementActionCount(userId)

    // 6. Ã˜Â¥Ã˜Â±Ã˜Â¬Ã˜Â§Ã˜Â¹ Ã˜Â§Ã™â€žÃ™â€ Ã˜ÂªÃ™Å Ã˜Â¬Ã˜Â©
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

// ==================== Ã˜Â¯Ã™Ë†Ã˜Â§Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â¯Ã˜Â© ====================

/**
 * Ã˜ÂªÃ˜Â·Ã˜Â¨Ã™Å Ã™â€š Ã˜ÂªÃ˜Â£Ã˜Â®Ã™Å Ã˜Â± Ã˜Â¹Ã˜Â´Ã™Ë†Ã˜Â§Ã˜Â¦Ã™Å  Ã˜Â¨Ã™â€ Ã˜Â§Ã˜Â¡Ã™â€¹ Ã˜Â¹Ã™â€žÃ™â€° Ã™â€ Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡
 */
function applyRandomDelay(action: ActionType): number {
  const delayRanges: Record<ActionType, [number, number]> = {
    click: [200, 800],        // 0.2-0.8 Ã˜Â«Ã˜Â§Ã™â€ Ã™Å Ã˜Â© Ã™â€žÃ™â€žÃ™â€ Ã™â€šÃ˜Â±Ã˜Â§Ã˜Âª
    type: [50, 200],          // 0.05-0.2 Ã˜Â«Ã˜Â§Ã™â€ Ã™Å Ã˜Â© Ã™â€žÃ™â€žÃ™Æ’Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â©
    scroll: [300, 1500],      // 0.3-1.5 Ã˜Â«Ã˜Â§Ã™â€ Ã™Å Ã˜Â© Ã™â€žÃ™â€žÃ˜ÂªÃ™â€¦Ã˜Â±Ã™Å Ã˜Â±
    navigate: [1000, 3000],   // 1-3 Ã˜Â«Ã™Ë†Ã˜Â§Ã™â€ Ã™Å  Ã™â€žÃ™â€žÃ˜ÂªÃ™â€ Ã™â€šÃ™â€ž
    collect: [500, 2000],     // 0.5-2 Ã˜Â«Ã˜Â§Ã™â€ Ã™Å Ã˜Â© Ã™â€žÃ™â€žÃ˜Â¬Ã™â€¦Ã˜Â¹
    upgrade: [1000, 5000],    // 1-5 Ã˜Â«Ã™Ë†Ã˜Â§Ã™â€ Ã™Å  Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â±Ã™â€šÃ™Å Ã˜Â©
    train: [2000, 8000],      // 2-8 Ã˜Â«Ã™Ë†Ã˜Â§Ã™â€ Ã™Å  Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â¯Ã˜Â±Ã™Å Ã˜Â¨
    attack: [3000, 10000],    // 3-10 Ã˜Â«Ã™Ë†Ã˜Â§Ã™â€ Ã™Å  Ã™â€žÃ™â€žÃ™â€¡Ã˜Â¬Ã™Ë†Ã™â€¦
    gather: [1500, 4000],     // 1.5-4 Ã˜Â«Ã™Ë†Ã˜Â§Ã™â€ Ã™Å  Ã™â€žÃ˜Â¬Ã™â€¦Ã˜Â¹ Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã˜Â§Ã˜Â±Ã˜Â¯
    heal: [1000, 3000]        // 1-3 Ã˜Â«Ã™Ë†Ã˜Â§Ã™â€ Ã™Å  Ã™â€žÃ™â€žÃ˜Â´Ã™ÂÃ˜Â§Ã˜Â¡
  }

  const [min, max] = delayRanges[action] || [500, 2000]
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â£Ã™â€šÃ˜ÂµÃ™â€° Ã™â€žÃ™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â§Ã˜Â¹Ã˜Â©
 */
async function checkRateLimit(userId: string, maxPerHour: number): Promise<boolean> {
  const now = Date.now()
  const hourStart = Math.floor(now / 3600000) * 3600000 // Ã˜Â¨Ã˜Â¯Ã˜Â§Ã™Å Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â§Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â©
  
  const userStats = actionStats.get(userId) || {
    count: 0,
    lastReset: hourStart,
    actions: []
  }

  // Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€  Ã˜Â¥Ã˜Â°Ã˜Â§ Ã˜ÂªÃ˜ÂºÃ™Å Ã˜Â±Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â§Ã˜Â¹Ã˜Â©
  if (now - userStats.lastReset >= 3600000) {
    userStats.count = 0
    userStats.lastReset = hourStart
    userStats.actions = []
  }

  // Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â¯
  return userStats.count >= maxPerHour
}

/**
 * Ã˜Â§Ã™â€žÃ˜Â­Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å  Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â§Ã˜Â¹Ã˜Â©
 */
function getCurrentHourCount(userId: string): number {
  const userStats = actionStats.get(userId)
  return userStats?.count || 0
}

/**
 * Ã˜Â²Ã™Å Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜Â¹Ã˜Â¯Ã˜Â§Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª
 */
function incrementActionCount(userId: string): void {
  const now = Date.now()
  const hourStart = Math.floor(now / 3600000) * 3600000
  
  const userStats = actionStats.get(userId) || {
    count: 0,
    lastReset: hourStart,
    actions: []
  }

  // Ã˜Â¥Ã˜Â¹Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã™Å Ã™Å Ã™â€  Ã˜Â¥Ã˜Â°Ã˜Â§ Ã˜ÂªÃ˜ÂºÃ™Å Ã˜Â±Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â§Ã˜Â¹Ã˜Â©
  if (now - userStats.lastReset >= 3600000) {
    userStats.count = 0
    userStats.lastReset = hourStart
    userStats.actions = []
  }

  userStats.count++
  userStats.actions.push({ type: 'click' as ActionType, timestamp: now }) // Ã™â€ Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡ Ã˜Â³Ã™Å Ã˜ÂªÃ™â€¦ Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€žÃ™â€¡ Ã˜Â¨Ã˜Â´Ã™Æ’Ã™â€ž Ã˜ÂµÃ˜Â­Ã™Å Ã˜Â­
  actionStats.set(userId, userStats)
}

/**
 * Ã˜Â§Ã™Æ’Ã˜ÂªÃ˜Â´Ã˜Â§Ã™Â Ã˜Â§Ã™â€žÃ˜Â£Ã™â€ Ã™â€¦Ã˜Â§Ã˜Â· Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Æ’Ã˜Â±Ã˜Â±Ã˜Â©
 */
function detectPattern(userId: string, currentAction: ActionType): {
  detected: boolean
  pattern?: string
} {
  const userStats = actionStats.get(userId)
  if (!userStats || userStats.actions.length < 3) {
    return { detected: false }
  }

  // Ã˜Â§Ã™â€žÃ˜Â­Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â¢Ã˜Â®Ã˜Â± 10 Ã˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª
  const recentActions = userStats.actions.slice(-10).map(a => a.type)
  
  // Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã™Æ’Ã™â€ž Ã™â€ Ã™â€¦Ã˜Â· Ã™â€¦Ã˜Â­Ã˜Â¸Ã™Ë†Ã˜Â±
  for (const pattern of forbiddenPatterns) {
    if (pattern.length > recentActions.length) continue
    
    const lastActions = recentActions.slice(-pattern.length)
    
    if (arraysEqual(pattern, lastActions)) {
      return {
        detected: true,
        pattern: pattern.join(' Ã¢â€ â€™ ')
      }
    }
  }

  // Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜ÂªÃ™Æ’Ã˜Â±Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã™ÂÃ˜Â±Ã˜Â· Ã™â€žÃ™â€ Ã™ÂÃ˜Â³ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡
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
 * Ã™â€¦Ã˜Â­Ã˜Â§Ã™Æ’Ã˜Â§Ã˜Â© Ã˜Â­Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™ÂÃ˜Â£Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â´Ã˜Â±Ã™Å Ã˜Â©
 */
function humanizeMouseMovement(coordinates: { x: number; y: number }): { x: number; y: number } {
  // Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â§Ã˜Â®Ã˜ÂªÃ™â€žÃ˜Â§Ã™ÂÃ˜Â§Ã˜Âª Ã˜Â·Ã™ÂÃ™Å Ã™ÂÃ˜Â© Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Â«Ã™Å Ã˜Â§Ã˜Âª
  const jitterX = (Math.random() - 0.5) * 15 // Ã‚Â±7.5 Ã˜Â¨Ã™Æ’Ã˜Â³Ã™â€ž
  const jitterY = (Math.random() - 0.5) * 15 // Ã‚Â±7.5 Ã˜Â¨Ã™Æ’Ã˜Â³Ã™â€ž
  
  return {
    x: Math.round(coordinates.x + jitterX),
    y: Math.round(coordinates.y + jitterY)
  }
}

/**
 * Ã™â€¦Ã˜Â­Ã˜Â§Ã™Æ’Ã˜Â§Ã˜Â© Ã˜ÂªÃ™â€ Ã™ÂÃ™Å Ã˜Â° Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡
 */
async function simulateActionExecution(
  action: ActionType,
  farmId?: string,
  data?: any
): Promise<any> {
  // Ã˜ÂªÃ˜Â£Ã˜Â®Ã™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â§Ã™Æ’Ã˜Â§Ã˜Â© Ã™â€žÃ™Ë†Ã™â€šÃ˜Âª Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã™ÂÃ™Å Ã˜Â°
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
        success: Math.random() > 0.1 // 90% Ã™â€ Ã˜Â¬Ã˜Â§Ã˜Â­
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
        timeRequired: Math.floor(Math.random() * 3600000) + 1800000, // 30-90 Ã˜Â¯Ã™â€šÃ™Å Ã™â€šÃ˜Â©
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
 * Ã˜ÂªÃ™Ë†Ã™â€žÃ™Å Ã˜Â¯ Ã˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã˜Â§Ã˜Âª Ã˜Â¨Ã™â€ Ã˜Â§Ã˜Â¡Ã™â€¹ Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â€ Ã˜Â´Ã˜Â§Ã˜Â·
 */
function generateRecommendations(userId: string, action: ActionType): string[] {
  const recommendations: string[] = []
  const userStats = actionStats.get(userId)
  
  if (!userStats) return recommendations

  const hourCount = userStats.count
  
  // Ã˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã˜Â§Ã˜Âª Ã˜Â¨Ã™â€ Ã˜Â§Ã˜Â¡Ã™â€¹ Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª
  if (hourCount > 200) {
    recommendations.push('High action rate detected. Consider reducing max actions per hour to avoid detection.')
  }
  
  if (hourCount > 100 && hourCount % 20 === 0) {
    recommendations.push('Take a short break to mimic human behavior patterns.')
  }
  
  // Ã˜ÂªÃ™Ë†Ã˜ÂµÃ™Å Ã˜Â§Ã˜Âª Ã˜Â¨Ã™â€ Ã˜Â§Ã˜Â¡Ã™â€¹ Ã˜Â¹Ã™â€žÃ™â€° Ã™â€ Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡
  if (action === 'attack') {
    recommendations.push('After attacking monsters, remember to heal troops in hospital.')
  }
  
  if (action === 'gather') {
    recommendations.push('Rotate gathering locations to avoid pattern detection.')
  }
  
  return recommendations
}

/**
 * Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª Ã™â€žÃ™â€žÃ˜Â³Ã˜Â¬Ã™â€žÃ˜Â§Ã˜Âª
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
  
  // Ã™ÂÃ™Å  Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€ Ã˜ÂªÃ˜Â§Ã˜Â¬Ã˜Å’ Ã™â€¡Ã™â€ Ã˜Â§ Ã˜Â³Ã˜ÂªÃ˜Â®Ã˜Â²Ã™â€  Ã™ÂÃ™Å  Ã™â€šÃ˜Â§Ã˜Â¹Ã˜Â¯Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª
  // await prisma.actionLog.create({ data: logEntry })
}

/**
 * Ã˜Â¯Ã˜Â§Ã™â€žÃ˜Â© Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â¹Ã˜Â¯Ã˜Â© Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â£Ã˜Â®Ã™Å Ã˜Â±
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Ã™â€¦Ã™â€šÃ˜Â§Ã˜Â±Ã™â€ Ã˜Â© Ã™â€¦Ã˜ÂµÃ™ÂÃ™Ë†Ã™ÂÃ˜ÂªÃ™Å Ã™â€ 
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  return a.every((val, index) => val === b[index])
}

// ==================== Ã™â€ Ã™â€šÃ˜Â·Ã˜Â© Ã™â€ Ã™â€¡Ã˜Â§Ã™Å Ã˜Â© GET Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â© ====================

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user: sbUser } } = await supabase.auth.getUser()
    const session = sbUser ? { user: { email: sbUser.email, id: sbUser.id } } : null
    
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
        patterns: forbiddenPatterns.map(p => p.join(' Ã¢â€ â€™ ')),
        recommendations: generateRecommendations(userId, 'click') // Ã™â€ Ã™Ë†Ã˜Â¹ Ã˜Â¹Ã˜Â´Ã™Ë†Ã˜Â§Ã˜Â¦Ã™Å  Ã™â€žÃ™â€žÃ˜Â¹Ã˜Â±Ã˜Â¶
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