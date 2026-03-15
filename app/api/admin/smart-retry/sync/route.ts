import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: Bulk upsert solutions from server
// Body: { solutions: [...], columns?: string[] }
// If columns is provided, only those columns will be sent to Supabase
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.VRBOT_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { solutions, columns } = body

    if (!solutions || !Array.isArray(solutions)) {
      return NextResponse.json({ error: 'solutions array required' }, { status: 400 })
    }

    const BATCH_SIZE = 100
    let upserted = 0
    let errors = 0
    let lastError = ''

    for (let i = 0; i < solutions.length; i += BATCH_SIZE) {
      const batch = solutions.slice(i, i + BATCH_SIZE).map((s: any) => {
        const row: any = {
          task_name: s.task_name,
          screen_hash: s.screen_hash,
          action_name: s.action_name,
        }
        const ok = (c: string) => !columns || columns.includes(c)
        if (ok('success_count')) row.success_count = s.success_count || 0
        if (ok('fail_count') && s.fail_count !== undefined) row.fail_count = s.fail_count
        if (ok('source') && s.source) row.source = s.source
        if (ok('action_params') && s.action_params) row.action_params = s.action_params
        if (ok('last_used') && s.last_used) row.last_used = s.last_used
        return row
      })

      const { error } = await supabase
        .from('learned_solutions')
        .upsert(batch, { onConflict: 'task_name,screen_hash', ignoreDuplicates: false })

      if (error) {
        lastError = error.message
        if (errors === 0) {
          return NextResponse.json({
            status: 'error',
            debug_error: error.message,
            debug_code: error.code,
            debug_hint: error.hint,
            batch_index: i,
            sample_row: batch[0],
          })
        }
        errors += batch.length
      } else {
        upserted += batch.length
      }
    }

    return NextResponse.json({ status: 'synced', total: solutions.length, upserted, errors, lastError })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
