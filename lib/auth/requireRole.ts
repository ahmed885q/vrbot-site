import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../session'
import type { UserRole } from './roles'

export async function requireRole(
  req: NextRequest,
  role: UserRole
) {
  const token =
    req.cookies.get('session_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await validateSession(token)
  if (!session || session.role !== role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}
