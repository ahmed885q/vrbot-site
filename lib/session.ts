import { cookies } from 'next/headers'

/**
 * إنشاء Session
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
 * التحقق من وجود Session
 */
export async function validateSession(): Promise<{ userId: string } | null> {
  const token = cookies().get('session_token')?.value

  if (!token) return null

  // مؤقتًا: نعتبر التوكن هو userId
  // لاحقًا نربطه بقاعدة البيانات أو JWT
  return { userId: token }
}

/**
 * جلب دور المستخدم
 */
export async function getUserRole(): Promise<'admin' | 'user'> {
  const session = await validateSession()
  if (!session) return 'user'

  // مؤقتًا: كل من لديه session هو admin
  // لاحقًا نربطه بقاعدة البيانات
  return 'admin'
}

/**
 * حذف Session (Logout)
 */
export async function destroySession() {
  cookies().delete('session_token')
}
