import { supabaseAdmin } from '@/lib/supabase/admin'

const MAX_REQUESTS = 50
const WINDOW_MS = 60000

export async function rateLimit(ip: string) {
  const now = new Date()
  const { data } = await supabaseAdmin
    .from('rate_limits')
    .select('*')
    .eq('ip', ip)
    .single()

  if (!data) {
    await supabaseAdmin.from('rate_limits').insert({
      ip, count: 1, last_request: now.toISOString(),
    })
    return
  }

  const diff = now.getTime() - new Date(data.last_request).getTime()

  if (diff > WINDOW_MS) {
    await supabaseAdmin
      .from('rate_limits')
      .update({ count: 1, last_request: now.toISOString() })
      .eq('ip', ip)
    return
  }

  if (data.count >= MAX_REQUESTS) {
    throw new Error('RATE_LIMIT_EXCEEDED')
  }

  await supabaseAdmin
    .from('rate_limits')
    .update({ count: data.count + 1 })
    .eq('ip', ip)
}
