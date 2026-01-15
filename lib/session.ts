import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase-server'

export type SessionData = {
  userId: string
  role: 'admin' | 'user'
  email?: string
}

/**
 * إنشاء session (عند تسجيل الدخول)
 */
export async function createSession(token: string) {
  cookies().set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

/**
 * التحقق من الجلسة (بدون arguments)
 */
export async function validateSession(): Promise<SessionData> {
  const token = cookies().get('session_token')?.value

  if (!token) {
    throw new Error('No session token')
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    throw new Error('Invalid session')
  }

  const role =
    (data.user.app_metadata?.role as 'admin' | 'user') ?? 'user'

  return {
    userId: data.user.id,
    role,
    email: data.user.email ?? undefined,
  }
}
