import { cookies } from 'next/headers'

export type SessionUser = {
  userId: string
  role: 'admin' | 'user'
  email?: string
}

export async function createSession(token: string) {
  cookies().set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

/**
 * Validate session from cookies
 */
export async function validateSession(): Promise<SessionUser | null> {
  const token = cookies().get('session_token')?.value
  if (!token) return null

  // 🔴 مؤقتًا (Mock)
  // لاحقًا نربطه بقاعدة البيانات أو JWT
  return {
    userId: token,
    role: 'admin',
    email: 'admin@example.com',
  }
}

/**
 * Guards
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await validateSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession()
  if (session.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }
  return session
}
