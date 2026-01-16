import { cookies } from 'next/headers'

export type Session = {
  userId: string
  role: 'admin' | 'user'
}

/**
 * إنشاء جلسة (تستخدم عند تسجيل الدخول)
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
 * التحقق من الجلسة (يُستخدم في middleware و API)
 */
export async function validateSession(token?: string): Promise<Session | null> {
  if (!token) return null

  // 🔹 مؤقتًا (DEV)
  // لاحقًا نربطه بقاعدة البيانات أو Supabase
  if (token === 'admin-token') {
    return {
      userId: 'admin',
      role: 'admin',
    }
  }

  return null
}
