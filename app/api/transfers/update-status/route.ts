import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient()

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const id = body?.id as string | undefined
  const status = body?.status as 'pending' | 'done' | 'canceled' | undefined

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (!status || !['pending', 'done', 'canceled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('resource_transfers')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
