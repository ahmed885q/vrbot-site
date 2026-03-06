// lib/chat.js
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
const supabase = createSupabaseBrowserClient()
export async function getChannels() {
  const { data, error } = await supabase.from('chat_channels').select('*').order('created_at', { ascending: true })
  if (error) throw error; return data
}
export async function getMessages(channelId, limit = 50) {
  const { data, error } = await supabase.from('chat_messages_with_users').select('*')
    .eq('channel_id', channelId).order('created_at', { ascending: false }).limit(limit)
  if (error) throw error; return data.reverse()
}
export async function sendMessage(channelId, content) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase.from('chat_messages')
    .insert({ channel_id: channelId, user_id: user.id, content: content.trim() }).select().single()
  if (error) throw error; return data
}
export async function toggleReaction(messageId, emoji) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: ex } = await supabase.from('chat_reactions').select('id')
    .eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji).maybeSingle()
  if (ex) { await supabase.from('chat_reactions').delete().eq('id', ex.id) }
  else { await supabase.from('chat_reactions').insert({ message_id: messageId, user_id: user.id, emoji }) }
}
export async function setOnline()  { await supabase.rpc('update_presence', { p_online: true }) }
export async function setOffline() { await supabase.rpc('update_presence', { p_online: false }) }
export function subscribeToChannel(channelId, cb) {
  return supabase.channel('chat:' + channelId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'channel_id=eq.' + channelId }, cb)
    .subscribe()
}
export function subscribeToReactions(channelId, cb) {
  return supabase.channel('reactions:' + channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions' }, cb).subscribe()
}
export function unsubscribe(sub) { supabase.removeChannel(sub) }
export { supabase }