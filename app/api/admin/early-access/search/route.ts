import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase-server'
import { requireAdmin } from '../../../../../lib/admin-auth'
import { rateLimit } from '../../../../../lib/rate-limit'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'
    await rateLimit(ip)

    const { searchParams } = new URL(req.url)

    const q = searchParams.get('q') || ''
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabaseAdmin
      .from('early_access')
      .select('*')
      .order('created_at', { ascending: false })

    if (q) {
      query = query.ilike('email', `%${q}%`)
    }

    if (from) {
      query = query.gte('created_at', from)
    }

    if (to) {
      query = query.lte('created_at', to)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Search failed' },
      { status: 500 }
    )
  }
}
