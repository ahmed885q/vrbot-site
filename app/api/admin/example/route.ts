import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await validateSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    user: {
      id: session.userId,
      role: session.role,
    },
  })
}

