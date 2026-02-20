import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const { enabled } = await req.json()

  const { data, error } = await supabase
    .from('anti_detection_settings')
    .upsert(
      {
        setting_key: 'system_enabled',
        setting_value: String(Boolean(enabled)),
        value_type: 'boolean',
        category: 'general',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'setting_key' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
