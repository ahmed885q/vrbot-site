import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../../../../lib/session'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  const session = await validateSession(token || '')

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // ✅ المستخدم مصرح
  return NextResponse.json({
    success: true,
    user: session.user,
  })
}
