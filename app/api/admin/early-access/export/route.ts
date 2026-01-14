import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase-server'
import { requireAdmin } from '../../../../../lib/admin-auth'
import { rateLimit } from '../../../../../lib/rate-limit'
import { audit } from '../../../../../lib/audit'

export async function GET(req: NextRequest) {
  try {
    // Admin check
    await requireAdmin(req)

    // Rate limit
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ??
      'unknown'
    await rateLimit(ip)

    // Fetch data
    const { data, error } = await supabaseAdmin
      .from('early_access')
      .select('email, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Convert to CSV
    const header = 'email,created_at\n'
    const rows =
      data
        ?.map(
          (row) =>
            `"${row.email}","${row.created_at}"`
        )
        .join('\n') ?? ''

    const csv = header + rows

    // Audit log
    await audit('EARLY_ACCESS_EXPORT_CSV', {
      count: data?.length ?? 0,
    })

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition':
          'attachment; filename="early-access.csv"',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Export failed' },
      { status: 500 }
    )
  }
}
