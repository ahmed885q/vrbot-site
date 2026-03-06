# VRBOT Chat Setup Script
# Run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\setup-chat.ps1

param([string]$ProjectPath = (Get-Location).Path)
$ErrorActionPreference = "Stop"

function Write-Step { param($m) Write-Host "`n[*] $m" -ForegroundColor Yellow }
function Write-OK   { param($m) Write-Host "    OK  $m" -ForegroundColor Green }
function Write-Info { param($m) Write-Host "    >>  $m" -ForegroundColor Cyan }
function Write-Fail { param($m) Write-Host "    ERR $m" -ForegroundColor Red; exit 1 }
function WriteFile  { param($p, $c) [System.IO.File]::WriteAllText($p, $c, [System.Text.Encoding]::UTF8) }

Write-Host "`n=== VRBOT Chat Auto Installer ===" -ForegroundColor Yellow

Write-Step "Checking project..."
if (-not (Test-Path "$ProjectPath\package.json")) { Write-Fail "package.json not found!" }
Write-OK "Project: $ProjectPath"

Write-Step "Creating directories..."
@("lib","hooks","app\dashboard\chat","app\api\push\send","public","supabase\migrations") | ForEach-Object {
    New-Item -ItemType Directory -Path "$ProjectPath\$_" -Force | Out-Null
    Write-OK $_
}

Write-Step "Writing files..."

# ── 001_chat_schema.sql ───────────────────────────────────────
$f1 = @'
-- VRBOT CHAT - Supabase Migration
CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💬',
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  edited_at TIMESTAMPTZ,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chat_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
CREATE TABLE IF NOT EXISTS chat_presence (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  last_seen TIMESTAMPTZ DEFAULT now(),
  is_online BOOLEAN DEFAULT false
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_msg ON chat_reactions(message_id);
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_reactions REPLICA IDENTITY FULL;
ALTER TABLE chat_presence REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_presence;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels_read" ON chat_channels FOR SELECT USING (true);
CREATE POLICY "channels_admin" ON chat_channels FOR ALL USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
);
CREATE POLICY "messages_read" ON chat_messages FOR SELECT USING (auth.uid() IS NOT NULL AND deleted = false);
CREATE POLICY "messages_insert" ON chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "messages_update" ON chat_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reactions_read" ON chat_reactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "reactions_insert" ON chat_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON chat_reactions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "presence_read" ON chat_presence FOR SELECT USING (true);
CREATE POLICY "presence_write" ON chat_presence FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "push_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
INSERT INTO chat_channels (slug, name, icon, description) VALUES
  ('general','عام','⚔️','قناة النقاش العام'),
  ('strategies','استراتيجيات','🗺️','شارك استراتيجياتك'),
  ('support','مساعدة تقنية','🔧','مشاكل تقنية؟ نحن هنا'),
  ('farms','المزارع','🏰','مناقشة إدارة المزارع')
ON CONFLICT (slug) DO NOTHING;
CREATE OR REPLACE FUNCTION update_presence(p_online BOOLEAN) RETURNS void AS $$
BEGIN
  INSERT INTO chat_presence (user_id, is_online, last_seen) VALUES (auth.uid(), p_online, now())
  ON CONFLICT (user_id) DO UPDATE SET is_online = p_online, last_seen = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE VIEW chat_messages_with_users AS
SELECT m.id, m.channel_id, m.content, m.created_at, m.edited_at, m.user_id,
  u.raw_user_meta_data->>'username' AS username,
  u.raw_user_meta_data->>'role' AS role,
  u.email
FROM chat_messages m LEFT JOIN auth.users u ON m.user_id = u.id WHERE m.deleted = false;
'@
WriteFile "$ProjectPath\supabase\migrations\001_chat_schema.sql" $f1
Write-OK "supabase/migrations/001_chat_schema.sql"

# ── lib/chat.js ───────────────────────────────────────────────
$f2 = @'
// lib/chat.js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
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
'@
WriteFile "$ProjectPath\lib\chat.js" $f2
Write-OK "lib/chat.js"

# ── hooks/useChat.js ──────────────────────────────────────────
$f3 = @'
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
        new Notification('VRBOT Chat', { body: (full?.username || 'مستخدم') + ': ' + (full?.content || '').slice(0, 80), icon: '/vrbot-icon.png', tag: 'vrbot-chat' })
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
'@
WriteFile "$ProjectPath\hooks\useChat.js" $f3
Write-OK "hooks/useChat.js"

# ── hooks/usePushNotifications.js ────────────────────────────
$f4 = @'
// hooks/usePushNotifications.js
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/chat'
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
function urlBase64ToUint8Array(b64) {
  const padding = '='.repeat((4 - b64.length % 4) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64); const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i); return out
}
export function usePushNotifications() {
  const [permission, setPermission]     = useState('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading]           = useState(false)
  useEffect(() => {
    if (!('Notification' in window)) return
    setPermission(Notification.permission)
    navigator.serviceWorker?.ready.then(reg => reg.pushManager.getSubscription().then(sub => setIsSubscribed(!!sub)))
  }, [])
  const requestPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return false
    setLoading(true)
    try {
      const result = await Notification.requestPermission(); setPermission(result)
      if (result !== 'granted') return false
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { const j = sub.toJSON(); await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'user_id,endpoint' }) }
      setIsSubscribed(true); return true
    } catch (err) { console.error('Push error:', err); return false } finally { setLoading(false) }
  }
  const unsubscribePush = async () => {
    try {
      const reg = await navigator.serviceWorker?.ready
      const sub = await reg?.pushManager.getSubscription()
      if (sub) { await sub.unsubscribe(); const { data: { user } } = await supabase.auth.getUser(); if (user) await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', sub.endpoint); setIsSubscribed(false) }
    } catch (err) { console.error(err) }
  }
  return { permission, isSubscribed, loading, requestPermission, unsubscribePush }
}
'@
WriteFile "$ProjectPath\hooks\usePushNotifications.js" $f4
Write-OK "hooks/usePushNotifications.js"

# ── public/sw.js ──────────────────────────────────────────────
$f5 = @'
// public/sw.js
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', e  => e.waitUntil(clients.claim()))
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}; try { data = event.data.json() } catch { data = { body: event.data.text() } }
  event.waitUntil(self.registration.showNotification(data.title || 'VRBOT Chat', {
    body: data.body || 'رسالة جديدة', icon: '/vrbot-icon.png', badge: '/vrbot-badge.png',
    tag: data.tag || 'vrbot-chat', renotify: true, vibrate: [200, 100, 200],
    data: { url: data.url || '/dashboard/chat' },
    actions: [{ action: 'open', title: 'فتح الشات' }, { action: 'dismiss', title: 'تجاهل' }]
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = event.notification.data?.url || '/dashboard/chat'
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.includes('/dashboard') && 'focus' in c) { c.focus(); c.postMessage({ type: 'NAVIGATE', url }); return } }
    if (clients.openWindow) return clients.openWindow(url)
  }))
})
'@
WriteFile "$ProjectPath\public\sw.js" $f5
Write-OK "public/sw.js"

# ── app/api/push/send/route.js ────────────────────────────────
$f6 = @'
// app/api/push/send/route.js
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
webpush.setVapidDetails('mailto:admin@vrbot.me', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
export async function POST(request) {
  try {
    if (request.headers.get('x-webhook-secret') !== process.env.WEBHOOK_SECRET)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { channel_id, user_id, content, username } = await request.json()
    const { data: ch }   = await admin.from('chat_channels').select('name,slug').eq('id', channel_id).single()
    const { data: subs } = await admin.from('push_subscriptions').select('endpoint,p256dh,auth').neq('user_id', user_id)
    if (!subs?.length) return NextResponse.json({ sent: 0 })
    const payload = JSON.stringify({ title: 'VRBOT Chat — #' + (ch?.name || 'عام'), body: (username || 'مستخدم') + ': ' + content.slice(0, 100), icon: '/vrbot-icon.png', tag: 'ch-' + channel_id, url: '/dashboard/chat?channel=' + (ch?.slug || '') })
    const results = await Promise.allSettled(subs.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload).catch(async err => { if (err.statusCode === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint); throw err })))
    return NextResponse.json({ sent: results.filter(r => r.status === 'fulfilled').length })
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
'@
WriteFile "$ProjectPath\app\api\push\send\route.js" $f6
Write-OK "app/api/push/send/route.js"

# ── app/dashboard/chat/page.jsx ───────────────────────────────
$f7 = @'
'use client'
import { useState, useEffect, useRef } from 'react'
import { useChat } from '@/hooks/useChat'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { getChannels } from '@/lib/chat'
const EMOJIS = ['⚔️','🔥','👍','🎉','🏰','✅','🤔','😂']
export default function ChatPage() {
  const [channels, setChannels]           = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [input, setInput]                 = useState('')
  const [hoveredMsg, setHoveredMsg]       = useState(null)
  const endRef   = useRef(null)
  const inputRef = useRef(null)
  const { messages, reactions, loading, sending, currentUser, sendMessage, toggleReaction } = useChat(activeChannel?.id)
  const { isSubscribed, permission, requestPermission } = usePushNotifications()
  useEffect(() => { getChannels().then(d => { setChannels(d); setActiveChannel(d[0] || null) }) }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  const handleSend = async () => { if (!input.trim() || sending) return; const t = input; setInput(''); await sendMessage(t); inputRef.current?.focus() }
  const getName  = m => m.username || m.email?.split('@')[0] || 'مستخدم'
  const getInit  = m => (getName(m)[0] || 'U').toUpperCase()
  const getColor = id => ['#f59e0b','#60a5fa','#34d399','#a78bfa','#fb7185'][id?.charCodeAt(0) % 5 || 0]
  const isMe     = m => m.user_id === currentUser?.id
  return (
    <div style={{ fontFamily:"'Tajawal',sans-serif", background:'#0a0c10', color:'#e2d9c8', height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', direction:'rtl' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2d35;border-radius:2px}input{outline:none}button{font-family:'Tajawal',sans-serif}`}</style>
      <div style={{ height:52,background:'#0f1117',borderBottom:'1px solid #1e2130',display:'flex',alignItems:'center',padding:'0 20px',justifyContent:'space-between',flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:28,height:28,background:'linear-gradient(135deg,#f59e0b,#d97706)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#000',fontSize:14 }}>V</div>
          <span style={{ fontSize:15,fontWeight:700,letterSpacing:2,color:'#f59e0b' }}>VRBOT Chat</span>
        </div>
        {permission !== 'denied' && (
          <button onClick={requestPermission} style={{ background:isSubscribed?'rgba(52,211,153,0.1)':'rgba(245,158,11,0.1)',border:'1px solid '+(isSubscribed?'#34d39944':'#f59e0b44'),borderRadius:8,padding:'5px 12px',cursor:'pointer',color:isSubscribed?'#34d399':'#f59e0b',fontSize:12 }}>
            {isSubscribed ? '🔔 الإشعارات مفعلة' : '🔕 تفعيل الإشعارات'}
          </button>
        )}
      </div>
      <div style={{ display:'flex',flex:1,overflow:'hidden' }}>
        <div style={{ width:220,background:'#0d0f16',borderLeft:'1px solid #1a1d27',display:'flex',flexDirection:'column',flexShrink:0 }}>
          <div style={{ padding:'14px 14px 8px',fontSize:11,color:'#4b5263',letterSpacing:1 }}>القنوات</div>
          <div style={{ height:1,background:'linear-gradient(90deg,transparent,#f59e0b44,transparent)',margin:'0 14px 8px' }}/>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => setActiveChannel(ch)} style={{ background:activeChannel?.id===ch.id?'rgba(245,158,11,0.1)':'transparent',border:'none',borderRight:'2px solid '+(activeChannel?.id===ch.id?'#f59e0b':'transparent'),padding:'9px 14px',display:'flex',alignItems:'center',gap:9,cursor:'pointer',width:'100%',textAlign:'right' }}>
              <span style={{ fontSize:15 }}>{ch.icon}</span>
              <span style={{ fontSize:13,color:activeChannel?.id===ch.id?'#f0e6d3':'#6b7a90' }}># {ch.name}</span>
            </button>
          ))}
          {currentUser && (
            <div style={{ marginTop:'auto',padding:12,borderTop:'1px solid #1a1d27' }}>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ width:32,height:32,borderRadius:'50%',background:getColor(currentUser.id)+'22',border:'1.5px solid '+getColor(currentUser.id)+'66',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:getColor(currentUser.id) }}>
                  {(currentUser.user_metadata?.username || currentUser.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:12,color:'#c9d1e0' }}>{currentUser.user_metadata?.username || currentUser.email?.split('@')[0]}</div>
                  <div style={{ fontSize:10,color:'#34d399' }}>● متصل</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
          <div style={{ height:48,background:'#0f1117',borderBottom:'1px solid #1a1d27',display:'flex',alignItems:'center',padding:'0 20px',gap:10,flexShrink:0 }}>
            <span style={{ fontSize:18 }}>{activeChannel?.icon}</span>
            <span style={{ fontSize:15,color:'#e2d9c8',fontWeight:500 }}># {activeChannel?.name}</span>
            {activeChannel?.description && <><div style={{ width:1,height:16,background:'#2a2d35' }}/><span style={{ fontSize:12,color:'#4b5263' }}>{activeChannel.description}</span></>}
          </div>
          <div style={{ flex:1,overflowY:'auto',padding:'16px 20px',background:'#0a0c10',display:'flex',flexDirection:'column',gap:2 }}>
            {loading ? (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',flex:1,color:'#4b5263',gap:10 }}><span>⚔️</span><span style={{ fontSize:14 }}>جاري التحميل...</span></div>
            ) : messages.length === 0 ? (
              <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,gap:12,opacity:0.4 }}>
                <span style={{ fontSize:48 }}>⚔️</span><span style={{ color:'#6b7280',fontSize:14 }}>لا توجد رسائل. ابدأ المحادثة!</span>
              </div>
            ) : messages.map((msg, i) => {
              const me = isMe(msg); const sh = i === 0 || messages[i-1]?.user_id !== msg.user_id
              const color = getColor(msg.user_id); const rx = reactions[msg.id] || {}
              return (
                <div key={msg.id} style={{ display:'flex',flexDirection:me?'row-reverse':'row',alignItems:'flex-end',gap:8,marginTop:sh?12:2,position:'relative' }}
                  onMouseEnter={() => setHoveredMsg(msg.id)} onMouseLeave={() => setHoveredMsg(null)}>
                  <div style={{ width:32,flexShrink:0 }}>
                    {sh && <div style={{ width:32,height:32,borderRadius:'50%',background:color+'22',border:'1.5px solid '+color+'55',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color }}>{getInit(msg)}</div>}
                  </div>
                  <div style={{ maxWidth:'70%',display:'flex',flexDirection:'column',alignItems:me?'flex-end':'flex-start' }}>
                    {sh && <div style={{ display:'flex',alignItems:'baseline',gap:6,flexDirection:me?'row-reverse':'row',marginBottom:3 }}>
                      <span style={{ fontSize:13,fontWeight:600,color }}>{getName(msg)}</span>
                      <span style={{ fontSize:11,color:'#3d4259' }}>{new Date(msg.created_at).toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</span>
                    </div>}
                    <div style={{ padding:'9px 13px',borderRadius:me?'14px 4px 14px 14px':'4px 14px 14px 14px',background:me?'linear-gradient(135deg,#1a1200,#231800)':'rgba(255,255,255,0.04)',border:'1px solid '+(me?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.05)'),fontSize:14,lineHeight:1.6,color:'#d4cbbf',wordBreak:'break-word' }}>
                      {msg.content}
                    </div>
                    {Object.keys(rx).length > 0 && (
                      <div style={{ display:'flex',gap:4,marginTop:4,flexWrap:'wrap' }}>
                        {Object.entries(rx).map(([e,c]) => c > 0 && <button key={e} onClick={() => toggleReaction(msg.id,e)} style={{ background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:20,padding:'2px 8px',fontSize:12,cursor:'pointer',color:'#d4cbbf' }}>{e} {c}</button>)}
                      </div>
                    )}
                  </div>
                  {hoveredMsg === msg.id && (
                    <div style={{ position:'absolute',top:-36,[me?'left':'right']:42,background:'#1a1d27',border:'1px solid #2a2d3a',borderRadius:20,padding:'4px 8px',display:'flex',gap:4,boxShadow:'0 4px 20px rgba(0,0,0,0.5)',zIndex:10 }}>
                      {EMOJIS.map(e => <button key={e} onClick={() => toggleReaction(msg.id,e)} style={{ background:'transparent',border:'none',fontSize:16,cursor:'pointer',padding:'2px 3px' }}>{e}</button>)}
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={endRef}/>
          </div>
          <div style={{ padding:'12px 20px 16px',background:'#0f1117',borderTop:'1px solid #1a1d27',flexShrink:0 }}>
            <div style={{ display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.04)',border:'1px solid #1e2130',borderRadius:12,padding:'8px 8px 8px 14px' }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={'رسالة في #' + (activeChannel?.name || '...')} disabled={sending || !activeChannel}
                style={{ flex:1,background:'transparent',border:'none',fontSize:14,color:'#d4cbbf',direction:'rtl' }}/>
              <button onClick={handleSend} disabled={!input.trim() || sending}
                style={{ background:input.trim()?'#f59e0b':'#2a2d35',border:'none',borderRadius:8,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:input.trim()?'pointer':'not-allowed',fontSize:16,flexShrink:0,color:input.trim()?'#000':'#4b5263' }}>
                {sending ? '...' : '↵'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
'@
WriteFile "$ProjectPath\app\dashboard\chat\page.jsx" $f7
Write-OK "app/dashboard/chat/page.jsx"

# ── Install packages ──────────────────────────────────────────
Write-Step "Installing web-push..."
Push-Location $ProjectPath
& npm install web-push --save --silent 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { Write-OK "web-push installed" } else { Write-Info "Check npm manually" }

# ── VAPID keys ────────────────────────────────────────────────
Write-Step "Generating VAPID keys..."
$vapidRaw = (& npx web-push generate-vapid-keys --non-interactive 2>&1) -join "`n"
Pop-Location

$pubKey  = [regex]::Match($vapidRaw, "Public Key:\s*(\S+)").Groups[1].Value
$privKey = [regex]::Match($vapidRaw, "Private Key:\s*(\S+)").Groups[1].Value
$secret  = [System.Guid]::NewGuid().ToString("N").Substring(0, 32)

if ($pubKey -and $privKey) {
    $envPath = "$ProjectPath\.env.local"
    $newLines = "`n# VRBOT Chat`nNEXT_PUBLIC_VAPID_PUBLIC_KEY=$pubKey`nVAPID_PRIVATE_KEY=$privKey`nWEBHOOK_SECRET=$secret"
    if (Test-Path $envPath) {
        $existing = Get-Content $envPath -Raw
        if ($existing -notmatch "VAPID_PUBLIC_KEY") { Add-Content $envPath $newLines; Write-OK "Added to .env.local" }
        else { Write-Info "VAPID keys already exist in .env.local" }
    } else {
        [System.IO.File]::WriteAllText($envPath, $newLines.TrimStart(), [System.Text.Encoding]::UTF8)
        Write-OK "Created .env.local"
    }
    Write-Host "`n    VAPID Public Key: $pubKey" -ForegroundColor Cyan
    Write-Host "    Webhook Secret:   $secret"   -ForegroundColor Cyan
} else {
    Write-Info "Run manually: npx web-push generate-vapid-keys"
}

# ── Summary ───────────────────────────────────────────────────
Write-Host "`n===============================" -ForegroundColor Green
Write-Host "  VRBOT Chat Setup Complete!" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Supabase SQL Editor -> run supabase\migrations\001_chat_schema.sql"
Write-Host "  2. Supabase Webhooks -> Table: chat_messages, Event: INSERT"
Write-Host "     URL: https://vrbot.me/api/push/send"
Write-Host "     Header: x-webhook-secret = (value in .env.local)"
Write-Host "  3. npm run dev"
Write-Host "  4. http://localhost:3000/dashboard/chat" -ForegroundColor Cyan
Write-Host ""
