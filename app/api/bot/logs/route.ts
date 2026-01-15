import { NextRequest, NextResponse } from 'next/server'
import { validateSession, getUserRole } from '@/lib/session'
import { supabaseAdmin } from '../../../../lib/supabase-server'

export async function GET(req: NextRequest) {
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

  const since = req.nextUrl.searchParams.get('since')

  let query = supabaseAdmin
    .from('bot_logs')
    .select('*')
    .eq('user_id', session.user_id)
    .order('created_at', { ascending: true })
    .limit(100)

  if (since) {
    query = query.gt('created_at', since)
  }

  const { data } = await query

  return NextResponse.json({
    logs: data ?? [],
    serverTime: new Date().toISOString(),
  })
}
