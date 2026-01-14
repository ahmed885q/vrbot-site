import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '../../../../lib/session'
import { stopRunner } from '../../../../lib/bot/runner'

export async function POST(req: NextRequest) {
  const token =
    req.cookies.get('session_token')?.value ??
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await validateSession(token)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await stopRunner(session.user_id)

  return NextResponse.json({ success: true })
}
