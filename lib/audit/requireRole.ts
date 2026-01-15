import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../session'
import { getUserRole } from './roles'

export async function requireRole(
  req: NextRequest,
  role: 'admin' | 'user'
) {
  const token =
    req.cookies.get('session_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const session = await validateSession(token)
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const userRole = await getUserRole(session.userId)
  if (userRole !== role) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { session }
}
