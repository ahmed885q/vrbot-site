import { cookies } from 'next/headers'

export type Session = {
  userId: string
  role: 'admin' | 'user'
  email?: string
}

/**
 * Validate current user session from cookies
 * Throws error if session is invalid
 */
export async function validateSession(): Promise<Session> {
  const cookieStore = cookies()
  const token = cookieStore.get('session_token')?.value

  if (!token) {
    throw new Error('Unauthorized')
  }

  // ⚠️ مؤقتًا (إلى أن نربط DB أو Supabase)
  // يمكن لاحقًا فك التوكن أو قراءته من DB
  return {
    userId: token,
    role: token === 'admin' ? 'admin' : 'user',
    email: undefined,
  }
}
