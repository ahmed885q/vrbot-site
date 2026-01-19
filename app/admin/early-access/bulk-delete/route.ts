import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '../../../../lib/admin-auth'
import { rateLimit } from '../../../../lib/rate-limit'
import { audit } from '../../../../lib/audit'

export async function POST(req: NextRequest) {
  try {
    // Admin auth
    await requireAdmin(req)

    // Rate limit
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'
    await rateLimit(ip)

    // Read body
    const { ids } = await req.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No IDs provided' },
        { status: 400 }
      )
    }

    // Delete
    const { error } = await supabaseAdmin
      .from('early_access')
      .delete()
      .in('id', ids)

    if (error) {
      throw error
    }

    // Audit log
    await audit('EARLY_ACCESS_BULK_DELETE', {
      count: ids.length,
      ids,
    })

    return NextResponse.json({
      success: true,
      deleted: ids.length,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    )
  }
}
