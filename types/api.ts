import { BotAction, BotStatus, LogLevel } from './bot'

// أنواع طلبات API
export interface ApiRequest<T = any> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  data?: T
  headers?: Record<string, string>
  params?: Record<string, string>
}

// أنواع ردود API
export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    timestamp: string
    requestId: string
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
  }
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// أنواع نقاط النهاية المحددة
export interface BotStartRequest {
  farm_id: string
  settings: any
}

export interface BotStopRequest {
  farm_id: string
  reason?: string
}

export interface BotExecuteRequest {
  farm_id: string
  action: BotAction
  coordinates?: { x: number; y: number }
  data?: any
}

export interface LogCreateRequest {
  farm_id?: string
  level: LogLevel
  message: string
  details?: any
}

export interface FarmCreateRequest {
  name: string
  server?: string
  notes?: string
  bot_settings?: any
}