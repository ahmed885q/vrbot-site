import { supabaseAdmin } from './supabase-server'

export type SessionData = {
  id: string
  user_id: string
  role: 'admin' | 'user'
  expires_at: string
}

/**
 * التحقق من صحة الجلسة
 */
export async function validateSession(token: string): Promise<SessionData | null> {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) return null

  if (new Date(data.expires_at) < new Date()) {
    return null
  }

  return data as SessionData
}

/**
 * 🔹 الدالة الناقصة (المشكلة كانت هنا)
 * جلب دور المستخدم
 */
export async function getUserRole(userId: string): Promise<'admin' | 'user'> {
  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  return data?.role === 'admin' ? 'admin' : 'user'
}
