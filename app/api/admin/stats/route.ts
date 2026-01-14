import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '../../../../lib/auth/requireRole'

export async function GET(req: NextRequest) {
  const guard = await requireRole(req, 'admin')
  if (guard) return guard

  return NextResponse.json({
    users: 10,
    botsRunning: 2,
  })
}
