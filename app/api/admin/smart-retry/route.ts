
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getDB() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── GET: جلب كل الحلول + إحصائيات ──
export async function GET() {
  try {
    const { data: solutions, error } = await getDB()
      .from('learned_solutions')
      .select('*')
      .order('success_count', { ascending: false })

    if (error) throw error

    const total_solutions  = solutions?.length ?? 0
    const total_rescues    = solutions?.reduce((s, r) => s + (r.success_count || 0), 0) ?? 0
    // source column may not exist — safely check
    const cloud_solutions  = solutions?.filter(s => s.source && s.source === 'cloud').length ?? 0
    const avg_success_rate = total_solutions === 0 ? 0 :
      solutions!.reduce((sum, s) => {
        const successes = s.success_count || 0
        const failures  = s.fail_count || 0
        const total = successes + failures
        return sum + (total > 0 ? (successes / total) * 100 : 100)
      }, 0) / total_solutions

    return NextResponse.json({
      solutions,
      total_solutions,
      total_rescues,
      cloud_solutions,
      avg_success_rate: +avg_success_rate.toFixed(1),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── DELETE: حذف حل معين ──
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await getDB()
      .from('learned_solutions')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
