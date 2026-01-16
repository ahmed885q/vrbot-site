import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { startBot } from '../../../../lib/bot/engine'

export async function POST(req: NextRequest) {
  const token =
    req.cookies.get('session_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await startBot()
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
