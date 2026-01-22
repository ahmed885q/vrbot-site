import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createSupabaseServerClient()

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('resource_transfers')
    .select('id,farm_id,recipient,recipient_type,wood,food,stone,gold,status,note,scheduled_at,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ transfers: data ?? [] })
}

