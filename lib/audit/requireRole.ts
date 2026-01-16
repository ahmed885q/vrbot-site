import { validateSession } from '@/lib/session'

export async function requireRole(requiredRole: 'admin' | 'user') {
  const session = await validateSession()

  if (session.role !== requiredRole) {
    throw new Error('Forbidden')
  }

  return session
}
