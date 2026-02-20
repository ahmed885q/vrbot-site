import { supabaseAdmin } from '@/lib/supabase/admin'

export type LogLevel = 'info' | 'error' | 'warn'

export async function appendLog(
  userId: string,
  level: LogLevel,
  message: string
) {
  await supabaseAdmin.from('bot_logs').insert({
    user_id: userId,
    level,
    message,
  })
}

export async function getLogs(userId: string) {
  const { data } = await supabaseAdmin
    .from('bot_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)

  return data ?? []
}
