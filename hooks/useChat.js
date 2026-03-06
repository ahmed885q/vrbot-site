// hooks/useChat.js
import { useState, useEffect, useCallback, useRef } from 'react'
import { getMessages, sendMessage as _send, subscribeToChannel, subscribeToReactions, toggleReaction as _toggle, unsubscribe, setOnline, setOffline, supabase } from '@/lib/chat'
export function useChat(channelId) {
  const [messages, setMessages]       = useState([])
  const [reactions, setReactions]     = useState({})
  const [loading, setLoading]         = useState(true)
  const [sending, setSending]         = useState(false)
  const [error, setError]             = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const msgRef = useRef(null); const rxRef = useRef(null)
  useEffect(() => { supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user)) }, [])
  useEffect(() => {
    if (!channelId) return
    setLoading(true)
    Promise.all([getMessages(channelId), setOnline()]).then(([msgs]) => setMessages(msgs))
      .catch(err => setError(err.message)).finally(() => setLoading(false))
    return () => { if (msgRef.current) unsubscribe(msgRef.current); if (rxRef.current) unsubscribe(rxRef.current) }
  }, [channelId])
  useEffect(() => {
    if (!channelId) return
    msgRef.current = subscribeToChannel(channelId, async (payload) => {
      const { data: full } = await supabase.from('chat_messages_with_users').select('*').eq('id', payload.new.id).single()
      setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, full || payload.new])
      if (full?.user_id !== currentUser?.id && typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        new Notification('VRBOT Chat', { body: (full?.username || 'Ù…Ø³ØªØ®Ø¯Ù…') + ': ' + (full?.content || '').slice(0, 80), icon: '/vrbot-icon.png', tag: 'vrbot-chat' })
      }
    })
    return () => { if (msgRef.current) unsubscribe(msgRef.current) }
  }, [channelId, currentUser])
  useEffect(() => {
    if (!channelId) return
    rxRef.current = subscribeToReactions(channelId, ({ eventType, new: n, old: o }) => {
      setReactions(prev => {
        const updated = { ...prev }; const msgId = (n || o).message_id; const emoji = (n || o).emoji
        if (!updated[msgId]) updated[msgId] = {}
        if (eventType === 'INSERT') updated[msgId][emoji] = (updated[msgId][emoji] || 0) + 1
        else if (eventType === 'DELETE') { updated[msgId][emoji] = Math.max((updated[msgId][emoji] || 1) - 1, 0); if (!updated[msgId][emoji]) delete updated[msgId][emoji] }
        return updated
      })
    })
    return () => { if (rxRef.current) unsubscribe(rxRef.current) }
  }, [channelId])
  useEffect(() => {
    window.addEventListener('beforeunload', setOffline)
    return () => { setOffline(); window.removeEventListener('beforeunload', setOffline) }
  }, [])
  const sendMessage    = useCallback(async (content) => { if (!content.trim() || sending) return; setSending(true); try { await _send(channelId, content) } catch (err) { setError(err.message) } finally { setSending(false) } }, [channelId, sending])
  const toggleReaction = useCallback(async (messageId, emoji) => { try { await _toggle(messageId, emoji) } catch (err) { console.error(err) } }, [])
  return { messages, reactions, loading, sending, error, currentUser, sendMessage, toggleReaction }
}