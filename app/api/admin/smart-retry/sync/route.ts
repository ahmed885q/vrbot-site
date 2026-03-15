import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: Bulk upsert solutions from server
export async function POST(req: NextRequest) {
  // Verify admin API key
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.VRBOT_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { solutions } = await req.json()

    if (!solutions || !Array.isArray(solutions)) {
      return NextResponse.json({ error: 'solutions array required' }, { status: 400 })
    }

    // Process in batches of 100
    const BATCH_SIZE = 100
    let upserted = 0
    let errors = 0

    for (let i = 0; i < solutions.length; i += BATCH_SIZE) {
      const batch = solutions.slice(i, i + BATCH_SIZE).map((s: any) => ({
        task_name: s.task_name,
        screen_hash: s.screen_hash,
        action_name: s.action_name,
        action_params: s.action_params || {},
        success_count: s.success_count || 0,
        fail_count: s.fail_count || 0,
        source: s.source || 'server',
        last_used: s.last_used || new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('learned_solutions')
        .upsert(batch, {
          onConflict: 'task_name,screen_hash',
          ignoreDuplicates: false,
        })

      if (error) {
        console.error(`Batch ${i} error:`, error.message)
        // Return error details on first failure for debugging
        if (errors === 0) {
          return NextResponse.json({
            status: 'error',
            debug_error: error.message,
            debug_code: error.code,
            debug_details: error.details,
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

    return NextResponse.json({
      status: 'synced',
      total: solutions.length,
      upserted,
      errors,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
