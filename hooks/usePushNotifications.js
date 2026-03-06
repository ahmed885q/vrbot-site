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