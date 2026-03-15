import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: Bulk upsert solutions from server
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.VRBOT_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { solutions } = body

    if (!solutions || !Array.isArray(solutions)) {
      return NextResponse.json({ error: 'solutions array required' }, { status: 400 })
    }

    // Step 1: Discover actual columns by trying a minimal insert
    let knownCols = ['task_name', 'screen_hash', 'action_name', 'success_count']
    const extraCols = ['fail_count', 'source', 'action_params', 'last_used']

    for (const col of extraCols) {
      const testRow: any = { task_name: '__col_test__', screen_hash: `__test_${col}__`, action_name: 'test' }
      testRow[col] = col === 'action_params' ? {} : col === 'last_used' ? new Date().toISOString() : col === 'source' ? 'test' : 0
      const { error } = await supabase.from('learned_solutions').upsert([testRow], { onConflict: 'task_name,screen_hash' })
      if (!error) {
        knownCols.push(col)
        // Clean up test row
        await supabase.from('learned_solutions').delete().eq('task_name', '__col_test__').eq('screen_hash', `__test_${col}__`)
      }
    }

    // Step 2: Bulk upsert with only known columns
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
        if (knownCols.includes('success_count')) row.success_count = s.success_count || 0
        if (knownCols.includes('fail_count')) row.fail_count = s.fail_count || 0
        if (knownCols.includes('source')) row.source = s.source || 'server'
        if (knownCols.includes('action_params') && s.action_params) row.action_params = s.action_params
        if (knownCols.includes('last_used') && s.last_used) row.last_used = s.last_used
        return row
      })

      const { error } = await supabase
        .from('learned_solutions')
        .upsert(batch, { onConflict: 'task_name,screen_hash', ignoreDuplicates: false })

      if (error) {
        lastError = error.message
        errors += batch.length
      } else {
        upserted += batch.length
      }
    }

    return NextResponse.json({
      status: errors === 0 ? 'synced' : 'partial',
      total: solutions.length,
      upserted,
      errors,
      lastError,
      detected_columns: knownCols,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
