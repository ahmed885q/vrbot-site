export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '../../../../lib/admin-auth'

export async function GET(req: NextRequest) {
  await requireAdmin(req)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 1)
  const size = 20
  const from = (page - 1) * size
  const to = from + size - 1

  const { data, error } = await supabaseAdmin
    .from('audit_trail')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
