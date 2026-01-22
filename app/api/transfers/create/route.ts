import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

function toInt(v: any) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient()

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)

  const farmId = body?.farmId as string | undefined
  const recipient = (body?.recipient as string | undefined)?.trim()
  const recipientType = body?.recipientType as 'name' | 'id' | undefined

  const wood = toInt(body?.wood)
  const food = toInt(body?.food)
  const stone = toInt(body?.stone)
  const gold = toInt(body?.gold)

  const note = (body?.note as string | undefined)?.trim() ?? null
  const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt).toISOString() : null

  if (!farmId) return NextResponse.json({ error: 'Missing farmId' }, { status: 400 })
  if (!recipient) return NextResponse.json({ error: 'Missing recipient' }, { status: 400 })
  if (!recipientType || !['name', 'id'].includes(recipientType)) {
    return NextResponse.json({ error: 'Invalid recipientType' }, { status: 400 })
  }
  if (wood + food + stone + gold <= 0) {
    return NextResponse.json({ error: 'Select at least one resource amount' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('resource_transfers')
    .insert({
      user_id: user.id,
      farm_id: farmId,
      recipient,
      recipient_type: recipientType,
      wood,
      food,
      stone,
      gold,
      status: 'pending',
      note,
      scheduled_at: scheduledAt,
    })
    .select('id,farm_id,recipient,recipient_type,wood,food,stone,gold,status,note,scheduled_at,created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, transfer: data })
}

