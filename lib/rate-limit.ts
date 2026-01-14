import { supabaseAdmin } from './supabase-server'

const LIMIT = 50
const WINDOW_MS = 60_000

export async function rateLimit(ip: string) {
  const now = Date.now()
  const windowStart = new Date(now - WINDOW_MS).toISOString()

  const { data } = await supabaseAdmin
    .from('rate_limits')
    .select('*')
    .eq('ip', ip)
    .gte('created_at', windowStart)

  if ((data?.length ?? 0) >= LIMIT) {
    throw new Error('Too many requests')
  }

  await supabaseAdmin.from('rate_limits').insert({ ip })
}
