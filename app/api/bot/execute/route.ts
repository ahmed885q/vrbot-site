export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// أنواع الإجراءات الممكنة
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

// ذاكرة مؤقتة لتخزين إحصاءات الإجراءات (استخدم Redis في الإنتاج)
const actionStats = new Map<string, {
  count: number
  lastReset: number
  actions: Array<{ type: ActionType; timestamp: number }>
}>()

// قائمة بالمهام المحظورة (للأنماط المتكررة)
const forbiddenPatterns = [
  ['click', 'click', 'click'], // 3 نقرات متتالية
  ['gather', 'gather', 'gather'], // 3 عمليات جمع متتالية
  ['click', 'type', 'click', 'type'], // نمط متكرر
]

export async function POST(request: NextRequest) {
  try {
    // 1. التحقق من المصادقة
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
    
    // 2. قراءة البيانات من الطلب
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

    // 3. تطبيق Anti-Detection إذا كان مفعلاً
    let securityApplied = false
    let appliedDelays: number[] = []
    let patternChecks: string[] = []

    if (security.antiDetection) {
      securityApplied = true
      
      // 3.1. التحقق من الحد الأقصى للإجراءات في الساعة
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

      // 3.2. تطبيق تأخيرات عشوائية
      if (security.randomDelays) {
        const delay = applyRandomDelay(action)
        await sleep(delay)
        appliedDelays.push(delay)
      }

      // 3.3. التحقق من الأنماط المتكررة
      if (security.avoidPatterns) {
        const patternDetected = detectPattern(userId, action)
        if (patternDetected.detected) {
          patternChecks.push(`Pattern detected: ${patternDetected.pattern}`)
          
          // إضافة تأخير إضافي إذا اكتشفنا نمطاً
          const extraDelay = Math.floor(Math.random() * 3000) + 2000 // 2-5 ثواني إضافية
          await sleep(extraDelay)
          appliedDelays.push(extraDelay)
        }
      }

      // 3.4. تطبيق تحويلات إحداثيات للفأرة (إذا كانت موجودة)
      let adjustedCoordinates = coordinates
      if (security.humanizeMouse && coordinates) {
        adjustedCoordinates = humanizeMouseMovement(coordinates)
      }

      // 3.5. استخدام البروكسي إذا كان مفعلاً
      let proxyUsed = false
      if (security.useProxy && security.proxyAddress) {
        proxyUsed = true
        // في الإنتاج، هنا ستستخدم مكتبة مثل 'proxy-agent'
        console.log(`Using proxy: ${security.proxyAddress}`)
      }

      // تسجيل الإجراء مع معلومات الأمان
      logAction(userId, action, {
        securityApplied: true,
        delays: appliedDelays,
        patternChecks,
        proxyUsed,
        originalCoordinates: coordinates,
        adjustedCoordinates
      })
    } else {
      // تسجيل الإجراء بدون أمان
      logAction(userId, action, { securityApplied: false })
    }

    // 4. محاكاة تنفيذ الإجراء (في الإنتاج، هنا ستتصل بلعبة Viking Rise)
    const result = await simulateActionExecution(action, farmId, data)

    // 5. زيادة عداد الإجراءات
    incrementActionCount(userId)

    // 6. إرجاع النتيجة
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

// ==================== دوال المساعدة ====================

/**
 * تطبيق تأخير عشوائي بناءً على نوع الإجراء
 */
function applyRandomDelay(action: ActionType): number {
  const delayRanges: Record<ActionType, [number, number]> = {
    click: [200, 800],        // 0.2-0.8 ثانية للنقرات
    type: [50, 200],          // 0.05-0.2 ثانية للكتابة
    scroll: [300, 1500],      // 0.3-1.5 ثانية للتمرير
    navigate: [1000, 3000],   // 1-3 ثواني للتنقل
    collect: [500, 2000],     // 0.5-2 ثانية للجمع
    upgrade: [1000, 5000],    // 1-5 ثواني للترقية
    train: [2000, 8000],      // 2-8 ثواني للتدريب
    attack: [3000, 10000],    // 3-10 ثواني للهجوم
    gather: [1500, 4000],     // 1.5-4 ثواني لجمع الموارد
    heal: [1000, 3000]        // 1-3 ثواني للشفاء
  }

  const [min, max] = delayRanges[action] || [500, 2000]
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * التحقق من الحد الأقصى للإجراءات في الساعة
 */
async function checkRateLimit(userId: string, maxPerHour: number): Promise<boolean> {
  const now = Date.now()
  const hourStart = Math.floor(now / 3600000) * 3600000 // بداية الساعة الحالية
  
  const userStats = actionStats.get(userId) || {
    count: 0,
    lastReset: hourStart,
    actions: []
  }

  // إعادة التعيين إذا تغيرت الساعة
  if (now - userStats.lastReset >= 3600000) {
    userStats.count = 0
    userStats.lastReset = hourStart
    userStats.actions = []
  }

  // التحقق من الحد
  return userStats.count >= maxPerHour
}

/**
 * الحصول على عدد الإجراءات الحالي في الساعة
 */
function getCurrentHourCount(userId: string): number {
  const userStats = actionStats.get(userId)
  return userStats?.count || 0
}

/**
 * زيادة عداد الإجراءات
 */
function incrementActionCount(userId: string): void {
  const now = Date.now()
  const hourStart = Math.floor(now / 3600000) * 3600000
  
  const userStats = actionStats.get(userId) || {
    count: 0,
    lastReset: hourStart,
    actions: []
  }

  // إعادة التعيين إذا تغيرت الساعة
  if (now - userStats.lastReset >= 3600000) {
    userStats.count = 0
    userStats.lastReset = hourStart
    userStats.actions = []
  }

  userStats.count++
  userStats.actions.push({ type: 'click' as ActionType, timestamp: now }) // نوع الإجراء سيتم تسجيله بشكل صحيح
  actionStats.set(userId, userStats)
}

/**
 * اكتشاف الأنماط المتكررة
 */
function detectPattern(userId: string, currentAction: ActionType): {
  detected: boolean
  pattern?: string
} {
  const userStats = actionStats.get(userId)
  if (!userStats || userStats.actions.length < 3) {
    return { detected: false }
  }

  // الحصول على آخر 10 إجراءات
  const recentActions = userStats.actions.slice(-10).map(a => a.type)
  
  // التحقق من كل نمط محظور
  for (const pattern of forbiddenPatterns) {
    if (pattern.length > recentActions.length) continue
    
    const lastActions = recentActions.slice(-pattern.length)
    
    if (arraysEqual(pattern, lastActions)) {
      return {
        detected: true,
        pattern: pattern.join(' → ')
      }
    }
  }

  // التحقق من التكرار المفرط لنفس الإجراء
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
 * محاكاة حركات الفأرة البشرية
 */
function humanizeMouseMovement(coordinates: { x: number; y: number }): { x: number; y: number } {
  // إضافة اختلافات طفيفة في الإحداثيات
  const jitterX = (Math.random() - 0.5) * 15 // ±7.5 بكسل
  const jitterY = (Math.random() - 0.5) * 15 // ±7.5 بكسل
  
  return {
    x: Math.round(coordinates.x + jitterX),
    y: Math.round(coordinates.y + jitterY)
  }
}

/**
 * محاكاة تنفيذ الإجراء
 */
async function simulateActionExecution(
  action: ActionType,
  farmId?: string,
  data?: any
): Promise<any> {
  // تأخير محاكاة لوقت التنفيذ
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
        success: Math.random() > 0.1 // 90% نجاح
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
        timeRequired: Math.floor(Math.random() * 3600000) + 1800000, // 30-90 دقيقة
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
 * توليد توصيات بناءً على النشاط
 */
function generateRecommendations(userId: string, action: ActionType): string[] {
  const recommendations: string[] = []
  const userStats = actionStats.get(userId)
  
  if (!userStats) return recommendations

  const hourCount = userStats.count
  
  // توصيات بناءً على عدد الإجراءات
  if (hourCount > 200) {
    recommendations.push('High action rate detected. Consider reducing max actions per hour to avoid detection.')
  }
  
  if (hourCount > 100 && hourCount % 20 === 0) {
    recommendations.push('Take a short break to mimic human behavior patterns.')
  }
  
  // توصيات بناءً على نوع الإجراء
  if (action === 'attack') {
    recommendations.push('After attacking monsters, remember to heal troops in hospital.')
  }
  
  if (action === 'gather') {
    recommendations.push('Rotate gathering locations to avoid pattern detection.')
  }
  
  return recommendations
}

/**
 * تسجيل الإجراءات للسجلات
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
  
  // في الإنتاج، هنا ستخزن في قاعدة البيانات
  // await prisma.actionLog.create({ data: logEntry })
}

/**
 * دالة مساعدة للتأخير
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * مقارنة مصفوفتين
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  return a.every((val, index) => val === b[index])
}

// ==================== نقطة نهاية GET للتحقق من الحالة ====================

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
        patterns: forbiddenPatterns.map(p => p.join(' → ')),
        recommendations: generateRecommendations(userId, 'click') // نوع عشوائي للعرض
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