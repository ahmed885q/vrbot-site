import 'next-auth'
import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT } from 'next-auth/jwt'

// ==================== تمديد أنواع User ====================
declare module 'next-auth' {
  /**
   * تمديد واجهة User لتشمل الحقول الإضافية
   */
  interface User extends DefaultUser {
    id: string
    plan: 'free' | 'trial' | 'pro' | 'enterprise'
    status: 'active' | 'trialing' | 'canceled' | 'suspended'
    farm_slots?: number
    trial_ends_at?: string | null
    is_admin?: boolean
    bot_enabled?: boolean
    created_at?: string
    last_login?: string
  }

  /**
   * تمديد واجهة Session لتشمل الحقول الإضافية
   */
  interface Session {
    user: {
      id: string
      plan: string
      status: string
      farm_slots?: number
      trial_ends_at?: string | null
      is_admin?: boolean
      bot_enabled?: boolean
      created_at?: string
      last_login?: string
    } & DefaultSession['user']
  }

  /**
   * تمديد Profile إذا كنت تستخدم OAuth providers
   */
  interface Profile {
    id?: string
    name?: string
    email?: string
    image?: string
    plan?: string
    status?: string
  }
}

// ==================== تمديد أنواع JWT ====================
declare module 'next-auth/jwt' {
  /**
   * تمديد واجهة JWT لتشمل الحقول الإضافية
   */
  interface JWT {
    id: string
    plan: string
    status: string
    farm_slots?: number
    trial_ends_at?: string | null
    is_admin?: boolean
    bot_enabled?: boolean
    created_at?: string
    last_login?: string
    is_bot?: boolean
    bot_token?: string
    farms?: string[] // قائمة معرفات المزارع المرتبطة
  }
}

// ==================== أنواع خاصة بتطبيق Viking Rise Bot ====================

/**
 * نوع إعدادات البوت للمستخدم
 */
export interface UserBotSettings {
  security: {
    antiDetection: boolean
    randomDelays: boolean
    maxActionsPerHour: number
    useProxy: boolean
    proxyAddress: string
    humanizeMouse: boolean
    avoidPatterns: boolean
  }
  automation: {
    autoFarm: boolean
    autoBuild: boolean
    autoResearch: boolean
    autoUpgrade: boolean
    targetLevel: number
    priorityBuilding: 'hall' | 'barracks' | 'hospital' | 'wall' | 'farm' | 'market'
    upgradeQueue: string[]
  }
  resources: {
    gatherWood: boolean
    gatherFood: boolean
    gatherStone: boolean
    gatherGold: boolean
    autoCollect: boolean
    minResourceThreshold: number
  }
  combat: {
    huntMonsters: boolean
    monsterStrength: 'weak' | 'medium' | 'strong'
    autoJoinRallies: boolean
    supportAllies: boolean
    autoHeal: boolean
    crowdSupport: boolean
    troopPresets: string[]
  }
  messaging: {
    autoSendGifts: boolean
    giftMessage: string
    recipients: string[]
    checkMail: boolean
    replyToAlliance: boolean
  }
  ai: {
    enabled: boolean
    learningMode: boolean
    optimizeStrategy: boolean
    predictAttacks: boolean
    autoAdjust: boolean
    visionModel: 'yolo' | 'custom' | 'hybrid'
  }
  scheduling: {
    enabled: boolean
    startTime: string
    endTime: string
    pauseDuringEvents: boolean
    stopOnLowResources: boolean
  }
}

/**
 * نوع بيانات المزرعة (Farm)
 */
export interface Farm {
  id: string
  name: string
  server: string | null
  notes: string | null
  user_id: string
  bot_enabled: boolean
  bot_settings: UserBotSettings
  created_at: string
  updated_at: string
  last_active?: string
  level?: number
  resources?: {
    wood: number
    food: number
    stone: number
    gold: number
  }
}

/**
 * نوع إحصائيات المستخدم
 */
export interface UserStats {
  total_actions: number
  resources_gathered: number
  monsters_killed: number
  gifts_sent: number
  total_uptime: number // بالثواني
  farms_count: number
  active_bots: number
  last_action_time?: string
  average_actions_per_day: number
}

/**
 * نوع سجل النشاط
 */
export interface ActivityLog {
  id: string
  user_id: string
  farm_id?: string
  action_type: string
  details: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

/**
 * نوع التوكن للبوت
 */
export interface BotToken {
  id: string
  token: string
  user_id: string
  name: string
  last_used: string | null
  created_at: string
  expires_at: string
  is_active: boolean
}

/**
 * نوع الخطأ الموحد
 */
export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
}

/**
 * نوع الرد الموحد للـ API
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: {
    page?: number
    limit?: number
    total?: number
    has_more?: boolean
  }
}

// ==================== أنواع NextAuth المعززة ====================

/**
 * تمديد أنواع NextAuth للاستخدام في التطبيق
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // NextAuth
      NEXTAUTH_URL: string
      NEXTAUTH_SECRET: string
      
      // قاعدة البيانات
      DATABASE_URL: string
      
      // إعدادات البوت
      BOT_MAX_ACTIONS_PER_HOUR: string
      BOT_MIN_DELAY_MS: string
      BOT_MAX_DELAY_MS: string
      
      // OAuth Providers (اختياري)
      GOOGLE_CLIENT_ID?: string
      GOOGLE_CLIENT_SECRET?: string
      GITHUB_CLIENT_ID?: string
      GITHUB_CLIENT_SECRET?: string
      
      // Redis (للذاكرة المؤقتة)
      REDIS_URL?: string
      
      // إعدادات البريد الإلكتروني
      SMTP_HOST?: string
      SMTP_PORT?: string
      SMTP_USER?: string
      SMTP_PASS?: string
      EMAIL_FROM?: string
    }
  }
}

// ==================== أنواع Callbacks ====================

/**
 * أنواع Callbacks الخاصة بـ NextAuth
 */
export interface AuthCallbacks {
  signIn?: (params: {
    user: any
    account: any
    profile: any
    email: any
    credentials: any
  }) => Promise<boolean> | boolean
  
  redirect?: (params: {
    url: string
    baseUrl: string
  }) => Promise<string> | string
  
  session?: (params: {
    session: any
    token: any
    user: any
  }) => Promise<any> | any
  
  jwt?: (params: {
    token: any
    user: any
    account: any
    profile: any
    isNewUser: boolean
  }) => Promise<any> | any
}

// ==================== Export الأنواع الرئيسية ====================

export type {
  User as NextAuthUser,
  Session as NextAuthSession,
  JWT as NextAuthJWT,
  Account as NextAuthAccount,
  Profile as NextAuthProfile,
} from 'next-auth'

// ==================== Export للاستخدام في التطبيق ====================

/**
 * تصدير جميع الأنواع للاستخدام في جميع أنحاء التطبيق
 */
export type {
  Farm,
  UserBotSettings,
  UserStats,
  ActivityLog,
  BotToken,
  ApiError,
  ApiResponse,
  AuthCallbacks,
}